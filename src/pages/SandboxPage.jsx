import React, { useState } from 'react'
import { executePython, executeCpp } from '../utils/executor'
import CodeEditor from '../components/CodeEditor'

function SandboxPage() {
  const [code, setCode] = useState('# Напишите ваш код здесь\nprint("Hello, World!")')
  const [lang, setLang] = useState('python')
  const [stdin, setStdin] = useState('')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [executionTime, setExecutionTime] = useState(0)

  const handleRun = async () => {
    setIsRunning(true)
    setStdout('')
    setStderr('')
    setExecutionTime(0)

    try {
      let result
      if (lang === 'python') {
        result = await executePython(code, stdin, 5000)
      } else if (lang === 'cpp') {
        result = await executeCpp(code, stdin, 5000)
      }

      if (result.success) {
        setStdout(result.output)
        setStderr('')
      } else {
        setStdout('')
        setStderr(result.error || 'Неизвестная ошибка')
      }
      setExecutionTime(result.executionTime || 0)
    } catch (error) {
      setStderr(`Ошибка: ${error.message}`)
    }

    setIsRunning(false)
  }

  const handleClearAll = () => {
    setCode('')
    setStdin('')
    setStdout('')
    setStderr('')
  }

  return (
    <div className="container sandbox-page">
      <div className="sandbox-header">
        <h1>Песочница</h1>
        <p>Напишите и запустите код на Python или C++ прямо в браузере</p>
      </div>

      <div className="sandbox-layout">
        {/* Левая колонка: редактор кода */}
        <div className="sandbox-editor-section">
          <div className="editor-header">
            <h3>Код</h3>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)} 
              className="lang-select"
            >
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
            </select>
          </div>
          <CodeEditor 
            value={code} 
            onChange={setCode} 
            language={lang} 
          />
        </div>

        {/* Правая колонка: ввод и вывод */}
        <div className="sandbox-io-section">
          {/* Ввод (stdin) */}
          <div className="io-block">
            <div className="io-header">
              <h3>Ввод (stdin)</h3>
            </div>
            <textarea
              className="io-textarea"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Введите данные для программы (опционально)"
            />
          </div>

          {/* Кнопки управления */}
          <div className="sandbox-controls">
            <button 
              className="btn btn-primary" 
              onClick={handleRun} 
              disabled={isRunning}
            >
              {isRunning ? 'Выполнение...' : '▶ Запустить'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleClearAll}
              disabled={isRunning}
            >
              🗑 Очистить всё
            </button>
          </div>

          {/* Вывод (stdout) */}
          <div className="io-block">
            <div className="io-header">
              <h3>Вывод (stdout)</h3>
              {executionTime > 0 && (
                <span className="execution-time">⏱ {executionTime}ms</span>
              )}
            </div>
            <div className="io-output">
              {stdout ? (
                <pre>{stdout}</pre>
              ) : (
                <pre className="placeholder">Результат выполнения появится здесь</pre>
              )}
            </div>
          </div>

          {/* Ошибки (stderr) */}
          {stderr && (
            <div className="io-block error-block">
              <div className="io-header">
                <h3>Ошибка</h3>
              </div>
              <div className="io-output error-output">
                <pre>{stderr}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SandboxPage
