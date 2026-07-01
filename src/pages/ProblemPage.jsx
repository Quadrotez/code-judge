import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getProblems } from '../utils/storage'
import { runTests } from '../utils/executor'
import CodeEditor from '../components/CodeEditor'
import MarkdownRenderer from '../components/MarkdownRenderer'

function ProblemPage() {
  const { id } = useParams()
  const [problem, setProblem] = useState(null)
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('python')
  const [results, setResults] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('description')
  const [selectedSolutionLang, setSelectedSolutionLang] = useState(null)

  useEffect(() => {
    getProblems().then(list => {
      const found = list.find(p => p.id === id)
      setProblem(found)
      if (found) {
        setCode(found.initialCode || '')
        // Set first available solution language
        if (found.solutions && Object.keys(found.solutions).length > 0) {
          setSelectedSolutionLang(Object.keys(found.solutions)[0])
        }
      }
    })
  }, [id])

  const handleRun = async () => {
    setIsRunning(true)
    setResults(null)
    setStatus('Подготовка...')
    try {
      const res = await runTests(code, problem.tests, 5000, lang, (msg) => setStatus(msg))
      
      // Calculate passed count
      const passedCount = res.filter(r => r.passed).length
      setResults({
        total: res.length,
        passed: passedCount,
        details: res
      })
    } catch (e) {
      alert('Ошибка выполнения: ' + e.message)
    }
    setIsRunning(false)
    setStatus('')
  }

  if (!problem) return <div className="container">Загрузка...</div>

  const hasSolutions = problem.solutions && Object.keys(problem.solutions).length > 0
  const solutionLanguages = hasSolutions ? Object.keys(problem.solutions) : []

  return (
    <div className="container problem-page">
      <div className="problem-info">
        <h1>{problem.title}</h1>
        <div className="p-tags">
          {problem.tags?.map(t => <span key={t} className="mini-tag" style={{marginRight: '5px'}}>{t}</span>)}
        </div>
        
        <div className="problem-tabs" style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <button 
            className={`tab ${activeTab === 'description' ? 'active' : ''}`} 
            onClick={() => setActiveTab('description')}
            style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'description' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'description' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold' }}
          >
            Описание
          </button>
          {hasSolutions && (
            <button 
              className={`tab ${activeTab === 'solution' ? 'active' : ''}`} 
              onClick={() => setActiveTab('solution')}
              style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'solution' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'solution' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold' }}
            >
              Решение
            </button>
          )}
        </div>

        <div className="tab-content" style={{ marginTop: '1.5rem' }}>
          {activeTab === 'description' ? (
            <>
              <div className="problem-description">
                <MarkdownRenderer text={problem.description} />
              </div>

              {problem.tests && problem.tests.some(t => !t.isHidden) && (
                <div className="problem-examples" style={{ marginTop: '2rem' }}>
                  <h2>Примеры тестов</h2>
                  {problem.tests.filter(t => !t.isHidden).map((test, index) => (
                    <div key={test.id || index} className="example-item" style={{ marginBottom: '1rem' }}>
                      <div className="example-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="example-box">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ввод:</label>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', margin: '0.2rem 0' }}>{test.input}</pre>
                        </div>
                        <div className="example-box">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Вывод:</label>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', margin: '0.2rem 0' }}>{test.output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="problem-solution">
              {solutionLanguages.length > 1 && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {solutionLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSelectedSolutionLang(lang)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: selectedSolutionLang === lang ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: selectedSolutionLang === lang ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: selectedSolutionLang === lang ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                        fontWeight: selectedSolutionLang === lang ? 'bold' : 'normal'
                      }}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {selectedSolutionLang && (
                <>
                  {(selectedSolutionLang === 'markdown' || selectedSolutionLang === 'latex') ? (
                    <MarkdownRenderer text={problem.solutions[selectedSolutionLang]} />
                  ) : (
                    <CodeEditor 
                      value={problem.solutions[selectedSolutionLang]} 
                      readOnly={true} 
                      language={selectedSolutionLang} 
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-header">
          <select value={lang} onChange={e => setLang(e.target.value)} className="lang-select">
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
          </select>
          <button className="btn btn-primary" onClick={handleRun} disabled={isRunning}>
            {isRunning ? status || 'Выполнение...' : 'Запустить тесты'}
          </button>
        </div>
        <CodeEditor value={code} onChange={setCode} language={lang} />
        
        {results && (
          <div className="results-section">
            <h3>Результаты:</h3>
            <div className="stats">
              Пройдено: {results.passed} / {results.total}
            </div>
            <div className="test-cases">
              {results.details.map((r, i) => (
                <div key={i} className={`test-case ${r.passed ? 'passed' : 'failed'}`}>
                  <div className="test-header">
                    <span>Тест {i + 1}: {r.passed ? 'Успешно' : 'Ошибка'} {r.isHidden ? '(Скрытый)' : ''}</span>
                    {r.executionTime > 0 && <span className="time">{r.executionTime}ms</span>}
                  </div>
                  {!r.passed && !r.isHidden && (
                    <div className="test-diff">
                      {r.error ? (
                        <div className="error-msg"><pre>{r.error}</pre></div>
                      ) : (
                        <>
                          <div>Ожидалось: <pre>{r.expected}</pre></div>
                          <div>Получено: <pre>{r.actual}</pre></div>
                        </>
                      )}
                    </div>
                  )}
                  {!r.passed && r.isHidden && (
                    <div className="test-diff">
                      <div className="error-msg">Скрытый тест не пройден</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProblemPage
