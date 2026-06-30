// App.jsx
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { CodeEditor } from './components/CodeEditor'
import { LaTeXRenderer } from './components/LaTeXRenderer'
import { getProblems, getProblemById, saveProblem, deleteProblem, exportProblems, importProblems, saveSubmission } from './utils/storage'
import { checkPassword, isAdminLoggedIn, logoutAdmin, onAuthUpdate, changeAdminPassword } from './utils/auth'
import { runTests } from './utils/executor'
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
      const tests = problem.tests.map((test, idx) => ({
        ...test,
        id: `test_${idx + 1}`
      }))
      
      const results = await runTests(code, tests, problem.timeLimit, selectedLanguage)
      setTestResults(results)
      
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
                </div>
              ))}
            </section>
          )}
          
          {problem.solution && (
            <section className="problem-section">
              <button className="toggle-solution-btn" onClick={() => setShowSolution(!showSolution)}>
                {showSolution ? '🔒 Скрыть решение' : '🔓 Показать решение'}
              </button>
              {showSolution && (
                <div className="solution-block">
                  <CodeEditor language="python" value={problem.solution} readOnly={true} />
                </div>
              )}
            </section>
          )}
        </div>
        
        <div className="editor-section">
          <div className="language-tabs">
            <button className={`tab ${selectedLanguage === 'python' ? 'active' : ''}`} onClick={() => setSelectedLanguage('python')}>Python</button>
            <button className={`tab ${selectedLanguage === 'cpp' ? 'active' : ''}`} onClick={() => setSelectedLanguage('cpp')}>C++</button>
          </div>
          
          {selectedLanguage === 'python' ? (
            <CodeEditor language="Python" value={pythonCode} onChange={setPythonCode} />
          ) : (
            <CodeEditor language="C++" value={cppCode} onChange={setCppCode} />
          )}
          
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '⏳ Проверяю...' : '✅ Отправить'}
          </button>
          
          {testResults && (
            <div className="results-section">
              <h3>Результаты тестирования</h3>
              <div className="results-summary">
                {testResults.filter(r => r.passed).length}/{testResults.length} тестов пройдено
              </div>
              {testResults.map((result, idx) => (
                <div key={idx} className={`test-result ${result.passed ? 'passed' : 'failed'}`}>
                  <span className="test-id">{result.testId}</span>
                  <span className="test-status">{result.passed ? '✅ Passed' : '❌ Failed'}</span>
                  {result.error && <div className="error-msg">{result.error}</div>}
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
const LOGIN_ATTEMPTS_KEY = 'admin_login_attempts'
const LOGIN_LOCKOUT_KEY = 'admin_login_lockout'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

const getLoginAttempts = () => parseInt(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10)
const getLockoutUntil = () => parseInt(sessionStorage.getItem(LOGIN_LOCKOUT_KEY) || '0', 10)
const isLockedOut = () => getLockoutUntil() > Date.now()
const recordFailedAttempt = () => {
  const attempts = getLoginAttempts() + 1
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, String(attempts))
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    sessionStorage.setItem(LOGIN_LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION_MS))
  }
}
const resetLoginAttempts = () => {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY)
  sessionStorage.removeItem(LOGIN_LOCKOUT_KEY)
}

const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn())
  const [passwordInput, setPasswordInput] = useState('')
  const [problems, setProblems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showChangePass, setShowChangePass] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    id: '', title: '', description: '', inputFormat: '', outputFormat: '', solution: '',
    timeLimit: 1000, memoryLimit: 256, examples: [], tests: []
  })
  
  const [newTestInput, setNewTestInput] = useState('')
  const [newTestOutput, setNewTestOutput] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthUpdate((user) => {
      setIsLoggedIn(!!user)
      if (user) {
        getProblems().then(setProblems)
      } else {
        setProblems([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    if (isLockedOut()) {
      const remaining = Math.ceil((getLockoutUntil() - Date.now()) / 60000)
      alert(`Слишком много попыток. Повторите через ${remaining} мин.`)
      return
    }
    try {
      await checkPassword(passwordInput)
      resetLoginAttempts()
      setPasswordInput('')
    } catch (error) {
      recordFailedAttempt()
      // Выводим конкретное сообщение об ошибке (например, "Неверный пароль" или "Пользователь не найден")
      alert(error.message || 'Ошибка входа! Проверьте пароль.')
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Пароль должен быть не менее 6 символов')
      return
    }
    try {
      await changeAdminPassword(newPassword)
      alert('Пароль успешно изменен!')
      setNewPassword('')
      setShowChangePass(false)
    } catch (error) {
      alert(`Ошибка: ${error.message}`)
    }
  }

  const handleSaveProblem = async () => {
    try {
      await saveProblem(formData)
      const list = await getProblems()
      setProblems(list)
      setShowForm(false)
      alert('Сохранено!')
    } catch (error) {
      alert('Ошибка сохранения')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container admin-auth">
        <h1>🔐 Админ-панель</h1>
        <p style={{fontSize: '0.8em', color: '#666', marginBottom: '10px'}}>Вход для admin@codejudge_quadrotez.com</p>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Введите пароль"
          className="auth-input"
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="auth-btn">Войти</button>
      </div>
    )
  }

  return (
    <div className="container admin-page">
      <div className="admin-header">
        <h1>⚙️ Админ-панель</h1>
        <div className="header-buttons">
          <button onClick={() => setShowChangePass(!showChangePass)} className="btn-secondary">🔑 Сменить пароль</button>
          <button onClick={() => logoutAdmin()} className="logout-btn">Выход</button>
        </div>
      </div>

      {showChangePass && (
        <div className="change-pass-section" style={{background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd'}}>
          <h3>Смена пароля</h3>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Новый пароль"
            className="form-input"
          />
          <div style={{marginTop: '10px'}}>
            <button onClick={handleChangePassword} className="btn btn-primary">Обновить пароль</button>
            <button onClick={() => setShowChangePass(false)} className="btn btn-cancel">Отмена</button>
          </div>
        </div>
      )}

      <div className="admin-actions">
        <button onClick={() => { setEditingId(null); setFormData({ id: `task_${Date.now()}`, title: '', description: '', inputFormat: '', outputFormat: '', solution: '', timeLimit: 1000, memoryLimit: 256, examples: [], tests: [] }); setShowForm(true); }} className="btn btn-primary">➕ Новая задача</button>
        <button onClick={async () => { const data = await exportProblems(); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'problems.json'; a.click(); }} className="btn btn-secondary">📥 Экспорт</button>
      </div>

      {showForm && (
        <div className="problem-form">
          <h2>{editingId ? 'Редактирование' : 'Новая задача'}</h2>
          <input type="text" placeholder="Название" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="form-input" />
          <textarea placeholder="Описание" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-textarea" />
          <textarea placeholder="Решение" value={formData.solution} onChange={(e) => setFormData({ ...formData, solution: e.target.value })} className="form-textarea" />
          <div className="form-actions">
            <button onClick={handleSaveProblem} className="btn btn-primary">✅ Сохранить</button>
            <button onClick={() => setShowForm(false)} className="btn btn-cancel">❌ Отмена</button>
          </div>
        </div>
      )}

      <div className="problems-list">
        <h2>Задачи ({problems.length})</h2>
        {problems.map(p => (
          <div key={p.id} className="problem-item">
            <span>{p.title}</span>
            <div className="problem-actions">
              <button onClick={() => { setEditingId(p.id); setFormData(p); setShowForm(true); }} className="btn btn-edit">✏️</button>
              <button onClick={async () => { if (confirm('Удалить?')) { await deleteProblem(p.id); setProblems(await getProblems()); } }} className="btn btn-delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', isDarkMode)
  }, [isDarkMode])

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode) }}>
      <Router basename="/">
        <div className="app" data-theme={isDarkMode ? 'dark' : 'light'}>
          <nav className="navbar">
            <Link to="/" className="logo">CodeJudge</Link>
            <div className="nav-links">
              <Link to="/">Задачи</Link>
              <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? '☀️' : '🌙'}</button>
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
