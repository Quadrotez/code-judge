import React, { useMemo, useState } from 'react'
import { executePython, executeCpp, runTests } from '../utils/executor'
import CodeEditor from '../components/CodeEditor'
import MarkdownRenderer from '../components/MarkdownRenderer'
import Icon from '../components/Icon'
import { createTaskPrompt, normalizeImportedTask } from '../utils/taskImport'

const INITIAL_CODE = '# Напишите ваш код здесь\nprint("Hello, World!")'

function TaskPreview({ task, onClear }) {
  const openTests = task.tests.filter((test) => !test.isHidden)

  return (
    <section className="sandbox-task-preview">
      <div className="sandbox-panel-heading">
        <div>
          <span className="sandbox-eyebrow">Текущая задача</span>
          <h2>{task.title}</h2>
        </div>
        <button className="btn-icon" onClick={onClear} title="Удалить импортированную задачу" aria-label="Удалить задачу">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="sandbox-task-tags">
        {task.tags.map((tag) => <span className="mini-tag" key={tag}>{tag}</span>)}
        <span className="sandbox-task-source">Импортирована локально</span>
      </div>

      <div className="sandbox-task-markdown markdown-body">
        <MarkdownRenderer text={task.description} />
      </div>

      {task.inputFormat && (
        <div className="sandbox-task-format markdown-body">
          <h3>Формат ввода</h3>
          <MarkdownRenderer text={task.inputFormat} />
        </div>
      )}

      {task.outputFormat && (
        <div className="sandbox-task-format markdown-body">
          <h3>Формат вывода</h3>
          <MarkdownRenderer text={task.outputFormat} />
        </div>
      )}

      {openTests.length > 0 && (
        <div className="sandbox-task-examples">
          <h3>Открытые примеры</h3>
          {openTests.map((test, index) => (
            <div className="sandbox-example" key={test.id || index}>
              <div>
                <span>Ввод</span>
                <pre>{test.input}</pre>
              </div>
              <div>
                <span>Вывод</span>
                <pre>{test.output}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TestResults({ results }) {
  if (!results) return null

  return (
    <div className="results-section">
      <h3>Результаты проверки</h3>
      <div className="stats">
        Пройдено: {results.passed} / {results.total}
      </div>
      <div className="test-cases">
        {results.details.map((result, index) => (
          <div key={result.testId || index} className={`test-case ${result.passed ? 'passed' : 'failed'}`}>
            <div className="test-header">
              <span>
                Тест {index + 1}: {result.passed ? 'Успешно' : 'Ошибка'} {result.isHidden ? '(Скрытый)' : ''}
              </span>
              {result.executionTime > 0 && <span className="time">{Math.round(result.executionTime)}ms</span>}
            </div>
            {!result.passed && !result.isHidden && (
              <div className="test-diff">
                {result.error ? (
                  <div className="error-msg"><pre>{result.error}</pre></div>
                ) : (
                  <>
                    <div>Ожидалось: <pre>{result.expected}</pre></div>
                    <div>Получено: <pre>{result.actual}</pre></div>
                  </>
                )}
              </div>
            )}
            {!result.passed && result.isHidden && (
              <div className="test-diff">
                <div className="error-msg">Скрытый тест не пройден</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskImportPanel({ task, onTaskImport, onTaskClear }) {
  const [showPromptForm, setShowPromptForm] = useState(false)
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [prompt, setPrompt] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [message, setMessage] = useState(null)
  const [isCopying, setIsCopying] = useState(false)

  const promptReady = topic.trim() && description.trim()

  const handleCreatePrompt = async () => {
    if (!promptReady) {
      setMessage({ type: 'error', text: 'Укажите тему и краткое описание идеи задачи.' })
      return
    }

    const nextPrompt = createTaskPrompt({ topic, description, difficulty })
    setPrompt(nextPrompt)
    setMessage(null)
    setIsCopying(true)

    try {
      await navigator.clipboard.writeText(nextPrompt)
      setMessage({ type: 'success', text: 'Промпт скопирован. Вставьте его в удобную нейросеть.' })
    } catch {
      setMessage({ type: 'warning', text: 'Промпт сформирован, но браузер не дал доступ к буферу. Скопируйте его из поля ниже.' })
    } finally {
      setIsCopying(false)
    }
  }

  const handleCopyPrompt = async () => {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      setMessage({ type: 'success', text: 'Промпт снова скопирован в буфер обмена.' })
    } catch {
      setMessage({ type: 'warning', text: 'Не удалось обратиться к буферу обмена. Выделите промпт вручную.' })
    }
  }

  const handleImport = () => {
    try {
      const importedTask = normalizeImportedTask(jsonText)
      onTaskImport(importedTask)
      setMessage({ type: 'success', text: 'Задача импортирована и готова к проверке.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <aside className="sandbox-import-panel">
      <div className="sandbox-panel-heading">
        <div>
          <span className="sandbox-eyebrow">Инструмент</span>
          <h2>Импортировать задачу</h2>
        </div>
        <Icon name="academicCap" size={22} />
      </div>

      {!task && (
        <>
          <p className="sandbox-panel-description">
            Опишите, что хотите потренировать, получите JSON у любой нейросети и вставьте его сюда.
          </p>
          <button
            className="btn btn-primary sandbox-full-button"
            onClick={() => {
              setShowPromptForm((value) => !value)
              setMessage(null)
            }}
          >
            <Icon name="academicCap" size={16} />
            {showPromptForm ? 'Скрыть параметры' : 'Сформировать промпт'}
          </button>

          {showPromptForm && (
            <div className="sandbox-prompt-form">
              <label className="sandbox-field">
                <span>Тема задачи</span>
                <input
                  className="form-input"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Например, графы"
                  maxLength={120}
                />
              </label>
              <label className="sandbox-field">
                <span>Описание идеи</span>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Что должна тренировать задача? Какие ограничения или сюжеты важны?"
                  rows={5}
                  maxLength={1000}
                />
              </label>
              <label className="sandbox-field">
                <span>Сложность</span>
                <select className="form-input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="easy">Начальная</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                  <option value="olympiad">Олимпиадная</option>
                </select>
              </label>
              <button className="btn btn-secondary sandbox-full-button" onClick={handleCreatePrompt} disabled={isCopying}>
                <Icon name="document" size={16} />
                {isCopying ? 'Копирование...' : 'Подтвердить и скопировать'}
              </button>
            </div>
          )}

          {prompt && (
            <div className="sandbox-prompt-output">
              <div className="sandbox-subheading">
                <span>Промпт</span>
                <button className="btn-icon" onClick={handleCopyPrompt} title="Скопировать промпт" aria-label="Скопировать промпт">
                  <Icon name="document" size={16} />
                </button>
              </div>
              <textarea className="sandbox-prompt-textarea" value={prompt} readOnly rows={10} />
            </div>
          )}

          <div className="sandbox-json-import">
            <div className="sandbox-subheading">
              <span>JSON от нейросети</span>
              <span className="sandbox-muted">только одна задача</span>
            </div>
            <textarea
              className="sandbox-prompt-textarea sandbox-json-textarea"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              placeholder={'{\n  "title": "...",\n  "description": "...",\n  "tests": []\n}'}
              rows={9}
              spellCheck="false"
            />
            <button className="btn btn-primary sandbox-full-button" onClick={handleImport} disabled={!jsonText.trim()}>
              <Icon name="upload" size={16} />
              Импортировать JSON
            </button>
          </div>
        </>
      )}

      {task && <TaskPreview task={task} onClear={onTaskClear} />}

      {message && <div className={`sandbox-message ${message.type}`}>{message.text}</div>}
    </aside>
  )
}

function SandboxPage() {
  const [code, setCode] = useState(INITIAL_CODE)
  const [lang, setLang] = useState('python')
  const [stdin, setStdin] = useState('')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [executionTime, setExecutionTime] = useState(0)
  const [importedTask, setImportedTask] = useState(null)
  const [results, setResults] = useState(null)
  const [status, setStatus] = useState('')

  const openTestInput = useMemo(
    () => importedTask?.tests.find((test) => !test.isHidden)?.input || '',
    [importedTask],
  )

  const handleTaskImport = (task) => {
    setImportedTask(task)
    setCode(task.initialCode || '')
    setStdin(task.tests.find((test) => !test.isHidden)?.input || '')
    setStdout('')
    setStderr('')
    setResults(null)
    setExecutionTime(0)
  }

  const handleTaskClear = () => {
    setImportedTask(null)
    setResults(null)
    setCode(INITIAL_CODE)
    setStdin('')
    setStdout('')
    setStderr('')
    setExecutionTime(0)
    setStatus('')
  }

  const handleRun = async () => {
    setIsRunning(true)
    setStdout('')
    setStderr('')
    setExecutionTime(0)
    setResults(null)

    try {
      if (importedTask) {
        const taskResults = await runTests(code, importedTask.tests, 5000, lang, (message) => setStatus(message))
        const passedCount = taskResults.filter((result) => result.passed).length
        setResults({ total: taskResults.length, passed: passedCount, details: taskResults })
        return
      }

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
    } finally {
      setIsRunning(false)
      setStatus('')
    }
  }

  const handleClearAll = () => {
    setCode('')
    setStdin('')
    setStdout('')
    setStderr('')
    setResults(null)
    setExecutionTime(0)
  }

  return (
    <div className="container sandbox-page">
      <div className="sandbox-header">
        <h1>Песочница</h1>
        <p>Напишите и запустите код на Python или C++ прямо в браузере</p>
      </div>

      <div className="sandbox-layout">
        <TaskImportPanel task={importedTask} onTaskImport={handleTaskImport} onTaskClear={handleTaskClear} />

        <div className="sandbox-editor-section">
          <div className="editor-header">
            <h3>{importedTask ? 'Решение задачи' : 'Код'}</h3>
            <select value={lang} onChange={(event) => setLang(event.target.value)} className="lang-select">
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
            </select>
          </div>
          {importedTask && <div className="sandbox-active-task">Проверка по {importedTask.tests.length} тестам</div>}
          <CodeEditor value={code} onChange={setCode} language={lang} />
        </div>

        <div className="sandbox-io-section">
          {!importedTask && (
            <div className="io-block">
              <div className="io-header">
                <h3>Ввод (stdin)</h3>
              </div>
              <textarea
                className="io-textarea"
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Введите данные для программы (опционально)"
              />
            </div>
          )}

          {importedTask && (
            <div className="io-block sandbox-run-info">
              <div className="io-header">
                <h3>Режим задачи</h3>
              </div>
              <p>При запуске код последовательно проверится на открытых и скрытых тестах.</p>
              <label className="sandbox-field">
                <span>Тест для ручного запуска</span>
                <select className="form-input" value={stdin} onChange={(event) => setStdin(event.target.value)}>
                  {importedTask.tests.filter((test) => !test.isHidden).map((test, index) => (
                    <option value={test.input} key={test.id || index}>Открытый тест #{index + 1}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-secondary" onClick={() => setStdin(openTestInput)}>
                Подставить первый пример
              </button>
            </div>
          )}

          <div className="sandbox-controls">
            <button className="btn btn-primary" onClick={handleRun} disabled={isRunning}>
              {isRunning ? status || 'Выполнение...' : importedTask ? '▶ Проверить решение' : '▶ Запустить'}
            </button>
            <button className="btn btn-secondary" onClick={handleClearAll} disabled={isRunning}>
              Очистить всё
            </button>
          </div>

          {!importedTask && (
            <div className="io-block">
              <div className="io-header">
                <h3>Вывод (stdout)</h3>
                {executionTime > 0 && <span className="execution-time">{Math.round(executionTime)}ms</span>}
              </div>
              <div className="io-output">
                {stdout ? <pre>{stdout}</pre> : <pre className="placeholder">Результат выполнения появится здесь</pre>}
              </div>
            </div>
          )}

          {stderr && (
            <div className="io-block error-block">
              <div className="io-header"><h3>Ошибка</h3></div>
              <div className="io-output error-output"><pre>{stderr}</pre></div>
            </div>
          )}

          {importedTask && <TestResults results={results} />}
        </div>
      </div>
    </div>
  )
}

export default SandboxPage
