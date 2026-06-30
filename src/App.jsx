// App.jsx
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { CodeEditor } from './components/CodeEditor'
import { LaTeXRenderer } from './components/LaTeXRenderer'
import { getProblems, getProblemById, saveProblem, deleteProblem, exportProblems, importProblems, saveSubmission } from './utils/storage'
import { initPassword, checkPassword, hasPassword, isAdminLoggedIn, setAdminLoggedIn, logoutAdmin } from './utils/auth'
import { executePython, runTests } from './utils/executor'
import './styles/App.css'

// Theme context
const ThemeContext = React.createContext()

// ========== HOME PAGE ==========
const HomePage = () => {
  const [problems, setProblems] = useState(null)
  
  useEffect(() => {
    const loadProblems = async () => {
      const data = await getProblems()
      setProblems(data)
    }
    loadProblems()
  }, [])
  
  return (
    <div className="container">
      <h1>📋 Задачи</h1>
      {problems === null ? (
        <div className="empty-state">
          <p>Загрузка...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="empty-state">
          <p>Нет задач</p>
        </div>
      ) : (
        <div className="problems-grid">
          {problems.map(problem => (
            <Link key={problem.id} to={`/problem/${problem.id}`} className="problem-card">
              <h3>{problem.title}</h3>
              <p className="problem-description">{problem.description.substring(0, 100)}...</p>
              <div className="problem-meta">
                <span className="time-badge">{problem.timeLimit}ms</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== PROBLEM VIEW PAGE ==========
const ProblemPage = () => {
  const { id } = useParams()
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pythonCode, setPythonCode] = useState('')
  const [cppCode, setCppCode] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [testResults, setTestResults] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  
  useEffect(() => {
    const loadProblem = async () => {
      setLoading(true)
      const p = await getProblemById(id)
      setProblem(p)
      setLoading(false)
    }
    loadProblem()
  }, [id])
  
  const handleSubmit = async () => {
    if (!problem) return
    
    setSubmitting(true)
    const code = selectedLanguage === 'python' ? pythonCode : cppCode
    
    try {
      // Подготовка тестов
      const tests = problem.tests.map((test, idx) => ({
        ...test,
        id: `test_${idx + 1}`
      }))
      
      const results = await runTests(code, tests, problem.timeLimit, selectedLanguage)
      setTestResults(results)
      
      // Сохраняем попытку
      const allPassed = results.every(r => r.passed)
      saveSubmission(problem.id, selectedLanguage, code, {
        allPassed,
        passedCount: results.filter(r => r.passed).length,
        totalCount: results.length
      })
    } catch (error) {
      setTestResults([{
        testId: 'error',
        passed: false,
        error: error.message
      }])
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) return <div className="container"><div className="empty-state"><p>Загрузка задачи...</p></div></div>
  if (!problem) return <div className="container"><div className="empty-state"><p>Нет задачи</p></div></div>
  
  return (
    <div className="container problem-container">
      <h1>{problem.title}</h1>
      
      <div className="problem-content">
        <div className="problem-statement">
          <section className="problem-section">
            <h3>📝 Условие</h3>
            <div className="problem-description-content">
              <LaTeXRenderer text={problem.description} />
            </div>
          </section>
          
          <section className="problem-section">
            <h3>📥 Формат ввода</h3>
            <div className="format-description">
              <LaTeXRenderer text={problem.inputFormat} />
            </div>
          </section>
          
          <section className="problem-section">
            <h3>📤 Формат вывода</h3>
            <div className="format-description">
              <LaTeXRenderer text={problem.outputFormat} />
            </div>
          </section>
          
          {problem.examples && problem.examples.length > 0 && (
            <section className="problem-section">
              <h3>📌 Примеры</h3>
              {problem.examples.map((example, idx) => (
                <div key={idx} className="example-block">
                  <div className="example-input">
                    <strong>Ввод:</strong>
                    <pre>{example.input}</pre>
                  </div>
                  <div className="example-output">
                    <strong>Вывод:</strong>
                    <pre>{example.output}</pre>
                  </div>
                  {example.explanation && (
                    <div className="example-explanation">
                      <strong>Пояснение:</strong> 
                      <LaTeXRenderer text={example.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
          
          {problem.solution && (
            <section className="problem-section">
              <button
                className="toggle-solution-btn"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? '🔒 Скрыть решение' : '🔓 Показать решение'}
              </button>
              {showSolution && (
                <div className="solution-block">
                  <CodeEditor
                    language="python"
                    value={problem.solution}
                    readOnly={true}
                  />
                </div>
              )}
            </section>
          )}
        </div>
        
        <div className="editor-section">
          <div className="language-tabs">
            <button
              className={`tab ${selectedLanguage === 'python' ? 'active' : ''}`}
              onClick={() => setSelectedLanguage('python')}
            >
              Python
            </button>
            <button
              className={`tab ${selectedLanguage === 'cpp' ? 'active' : ''}`}
              onClick={() => setSelectedLanguage('cpp')}
            >
              C++
            </button>
          </div>
          
          {selectedLanguage === 'python' ? (
            <CodeEditor
              language="Python"
              value={pythonCode}
              onChange={setPythonCode}
            />
          ) : (
            <CodeEditor
              language="C++"
              value={cppCode}
              onChange={setCppCode}
            />
          )}
          
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '⏳ Проверяю...' : '✅ Отправить'}
          </button>
          
          {testResults && (
            <div className="results-section">
              <h3>Результаты тестирования</h3>
              <div className="results-summary">
                {testResults.filter(r => r.passed).length}/{testResults.length} тестов пройдено
              </div>
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`test-result ${result.passed ? 'passed' : 'failed'}`}
                >
                  <span className="test-id">{result.testId}</span>
                  <span className="test-status">
                    {result.passed ? '✅ Passed' : '❌ Failed'}
                  </span>
                  {result.error && <div className="error-msg">{result.error}</div>}
                  {result.expected && !result.passed && (
                    <div className="expected-actual">
                      <div>Expected: <pre>{result.expected}</pre></div>
                      <div>Got: <pre>{result.actual}</pre></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ========== ADMIN PAGE ==========
const AdminPage = () => {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn())
  const [passwordInput, setPasswordInput] = useState('')
  const [firstPassword, setFirstPassword] = useState('')
  const [needsSetup, setNeedsSetup] = useState(true)
  const [setupLoading, setSetupLoading] = useState(true)
  
  const [problems, setProblems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    solution: '',
    timeLimit: 1000,
    memoryLimit: 256,
    examples: [],
    tests: []
  })
  
  // Для добавления тестов через GUI
  const [newTestInput, setNewTestInput] = useState('')
  const [newTestOutput, setNewTestOutput] = useState('')
  
  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        const hasPass = await hasPassword()
        setNeedsSetup(!hasPass)
        if (isLoggedIn) {
          const problemsList = await getProblems()
          setProblems(problemsList)
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
        alert(`⚠️ Ошибка подключения к серверу:\n\nУбедись что:\n1. Запущен backend сервер (npm run server)\n2. Сервер запущен на localhost:3001\n\nОшибка: ${error.message}`)
      } finally {
        setSetupLoading(false)
      }
    }
    init()
  }, [])
  
  const handleLogin = async () => {
    try {
      const success = await checkPassword(passwordInput)
      if (success) {
        setIsLoggedIn(true)
        setPasswordInput('')
        const problemsList = await getProblems()
        setProblems(problemsList)
      } else {
        alert('Неправильный пароль!')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Ошибка при входе!')
    }
  }
  
  const handleSetupPassword = async () => {
    if (!firstPassword) {
      alert('Введи пароль!')
      return
    }
    try {
      await initPassword(firstPassword)
      setNeedsSetup(false)
      setIsLoggedIn(true)
      setFirstPassword('')
      const problemsList = await getProblems()
      setProblems(problemsList)
    } catch (error) {
      console.error('Setup error:', error)
      alert(`Ошибка при установке пароля: ${error.message}`)
    }
  }
  
  const handleLogout = async () => {
    try {
      await logoutAdmin()
      setIsLoggedIn(false)
      setProblems([])
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  
  const handleAddProblem = () => {
    setEditingId(null)
    setFormData({
      id: `task_${Date.now()}`,
      title: '',
      description: '',
      inputFormat: '',
      outputFormat: '',
      solution: '',
      timeLimit: 1000,
      memoryLimit: 256,
      examples: [],
      tests: []
    })
    setNewTestInput('')
    setNewTestOutput('')
    setShowForm(true)
  }
  
  const handleEditProblem = (problem) => {
    setEditingId(problem.id)
    setFormData(problem)
    setNewTestInput('')
    setNewTestOutput('')
    setShowForm(true)
  }
  
  const handleCancelForm = () => {
    setShowForm(false)
    setEditingId(null)
  }
  
  const handleAddTest = () => {
    if (!newTestInput.trim() || !newTestOutput.trim()) {
      alert('Заполни ввод и вывод!')
      return
    }
    const newTest = {
      input: newTestInput,
      output: newTestOutput
    }
    setFormData({
      ...formData,
      tests: [...formData.tests, newTest]
    })
    setNewTestInput('')
    setNewTestOutput('')
  }
  
  const handleRemoveTest = (index) => {
    setFormData({
      ...formData,
      tests: formData.tests.filter((_, i) => i !== index)
    })
  }
  
  const handleSaveProblem = async () => {
    if (!formData.title || !formData.description) {
      alert('Заполни название и описание!')
      return
    }
    if (formData.tests.length === 0) {
      alert('Добавь хотя бы один тест!')
      return
    }
    try {
      await saveProblem(formData)
      const problemsList = await getProblems()
      setProblems(problemsList)
      setShowForm(false)
      setEditingId(null)
      alert('Задача сохранена!')
    } catch (error) {
      console.error('Save error:', error)
      alert('Ошибка при сохранении задачи!')
    }
  }
  
  const handleDeleteProblem = async (id) => {
    if (confirm('Уверен?')) {
      try {
        await deleteProblem(id)
        const problemsList = await getProblems()
        setProblems(problemsList)
      } catch (error) {
        console.error('Delete error:', error)
        alert('Ошибка при удалении задачи!')
      }
    }
  }
  
  const handleExport = async () => {
    try {
      const data = await exportProblems()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'problems.json'
      a.click()
    } catch (error) {
      console.error('Export error:', error)
      alert('Ошибка при экспорте!')
    }
  }
  
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const success = await importProblems(event.target.result)
        if (success) {
          const problemsList = await getProblems()
          setProblems(problemsList)
          alert('Задачи импортированы!')
        } else {
          alert('Ошибка импорта!')
        }
      } catch (error) {
        console.error('Import error:', error)
        alert('Ошибка при импорте!')
      }
    }
    reader.readAsText(file)
  }
  
  if (setupLoading) {
    return <div className="container"><p>Загрузка...</p></div>
  }
  
  if (needsSetup) {
    return (
      <div className="container admin-auth">
        <h1>🔐 Первая настройка</h1>
        <p>Первый раз на этом сайте? Установи пароль для админ-панели</p>
        <input
          type="password"
          value={firstPassword}
          onChange={(e) => setFirstPassword(e.target.value)}
          placeholder="Введи пароль"
          className="auth-input"
        />
        <button onClick={handleSetupPassword} className="auth-btn">
          Установить пароль
        </button>
      </div>
    )
  }
  
  if (!isLoggedIn) {
    return (
      <div className="container admin-auth">
        <h1>🔐 Админ-панель</h1>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Пароль"
          className="auth-input"
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="auth-btn">
          Войти
        </button>
      </div>
    )
  }
  
  return (
    <div className="container admin-page">
      <div className="admin-header">
        <h1>⚙️ Админ-панель</h1>
        <button onClick={handleLogout} className="logout-btn">Выход</button>
      </div>
      
      <div className="admin-actions">
        <button onClick={handleAddProblem} className="btn btn-primary">
          ➕ Новая задача
        </button>
        <button onClick={handleExport} className="btn btn-secondary">
          📥 Экспорт
        </button>
        <label className="btn btn-secondary">
          📤 Импорт
          <input type="file" onChange={handleImport} accept=".json" style={{ display: 'none' }} />
        </label>
      </div>
      
      {showForm && (
        <div className="problem-form">
          <h2>{editingId ? 'Редактирование задачи' : 'Новая задача'}</h2>
          
          <input
            type="text"
            placeholder="Название"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input"
          />
          
          <textarea
            placeholder="Описание задачи"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-textarea"
          />
          
          <input
            type="text"
            placeholder="Формат входных данных"
            value={formData.inputFormat}
            onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
            className="form-input"
          />
          
          <input
            type="text"
            placeholder="Формат выходных данных"
            value={formData.outputFormat}
            onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
            className="form-input"
          />
          
          <textarea
            placeholder="Решение (опционально)"
            value={formData.solution}
            onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
            className="form-textarea"
          />
          
          <div className="form-row">
            <input
              type="number"
              placeholder="Время (ms)"
              value={formData.timeLimit}
              onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
              className="form-input"
            />
            <input
              type="number"
              placeholder="Память (MB)"
              value={formData.memoryLimit}
              onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
              className="form-input"
            />
          </div>
          
          {/* НОВОЕ: GUI для тестов */}
          <div className="form-section">
            <h4>📝 Добавить тесты</h4>
            <div className="test-input-group">
              <textarea
                placeholder="Ввод (используй Enter для новой строки)"
                value={newTestInput}
                onChange={(e) => setNewTestInput(e.target.value)}
                className="test-textarea"
              />
              <textarea
                placeholder="Ожидаемый вывод"
                value={newTestOutput}
                onChange={(e) => setNewTestOutput(e.target.value)}
                className="test-textarea"
              />
              <button onClick={handleAddTest} className="btn btn-secondary">
                ➕ Добавить тест
              </button>
            </div>
          </div>
          
          {/* Список добавленных тестов */}
          {formData.tests.length > 0 && (
            <div className="form-section">
              <h4>✅ Добавленные тесты ({formData.tests.length})</h4>
              <div className="tests-list">
                {formData.tests.map((test, idx) => (
                  <div key={idx} className="test-item">
                    <div className="test-number">Тест #{idx + 1}</div>
                    <div className="test-content">
                      <div className="test-io">
                        <strong>Ввод:</strong>
                        <pre>{test.input}</pre>
                      </div>
                      <div className="test-io">
                        <strong>Вывод:</strong>
                        <pre>{test.output}</pre>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTest(idx)}
                      className="btn-delete-test"
                      title="Удалить тест"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="form-actions">
            <button onClick={handleSaveProblem} className="btn btn-success">
              ✅ Сохранить
            </button>
            <button onClick={handleCancelForm} className="btn btn-cancel">
              ❌ Отменить
            </button>
          </div>
        </div>
      )}
      
      <div className="problems-list">
        <h2>Все задачи ({problems.length})</h2>
        {problems.map(problem => (
          <div key={problem.id} className="problem-item">
            <div>
              <h4>{problem.title}</h4>
              <p>{problem.tests?.length || 0} тестов</p>
            </div>
            <div className="problem-actions">
              <button onClick={() => handleEditProblem(problem)} className="btn btn-edit">
                ✏️
              </button>
              <button onClick={() => handleDeleteProblem(problem.id)} className="btn btn-delete">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== MAIN APP ==========
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => setIsDarkMode(!isDarkMode)

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <Router basename="/">
        <div className="app" data-theme={isDarkMode ? 'dark' : 'light'}>
          <nav className="navbar">
            <Link to="/" className="logo">
              CodeJudge
            </Link>
            <div className="nav-links">
              <Link to="/">Задачи</Link>
              <button className="theme-toggle" onClick={toggleTheme} title="Переключить тему">
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </nav>
          
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/problem/:id" element={<ProblemPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </div>
      </Router>
    </ThemeContext.Provider>
  )
}
