// utils/executor.js
let pyodideReady = false
let pyodide = null
let pythonWorker = null

// Инициализация Pyodide (для запуска в основном потоке, если Worker не поддерживается)
export const initPyodide = async () => {
  if (pyodideReady) return pyodide
  
  try {
    if (!window.loadPyodide) {
      throw new Error('Pyodide не загружен. Проверь интернет.')
    }
    
    pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
    })
    
    // Выполняем пустой скрипт для разминки
    pyodide.runPython('')
    
    pyodideReady = true
    return pyodide
  } catch (error) {
    console.error('Pyodide init error:', error)
    throw error
  }
}

// Создание нового Web Worker для Python (свежий для каждого запроса)
const createPythonWorker = () => {
  try {
    const worker = new Worker(new URL('../workers/pythonExecutor.worker.js', import.meta.url))
    return worker
  } catch (error) {
    console.warn('⚠️ Web Worker не поддерживается, используем fallback в основном потоке', error)
    return null
  }
}

// Выполнить C++ код через Wandbox API
export const executeCpp = async (code, testInput, timeLimit = 5000) => {
  try {
    // Используем актуальную версию GCC, доступную на Wandbox
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: code,
        compiler: 'gcc-head',
        options: 'warning,gnu++1y',
        stdin: testInput,
        compiler_option_raw: '-O2'
      })
    })
    
    if (!response.ok) {
      throw new Error(`Wandbox API error: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.status !== 0) {
      if (result.compiler_error) {
        return {
          success: false,
          output: '',
          error: `❌ Ошибка компиляции:\n${result.compiler_error}`,
          executionTime: 0
        }
      }
      
      if (result.program_error) {
        return {
          success: false,
          output: result.program_output || '',
          error: `❌ Ошибка выполнения (Runtime Error):\n${result.program_error}`,
          executionTime: 0
        }
      }
    }
    
    return {
      success: true,
      output: result.program_output || '',
      error: null,
      executionTime: 0
    }
    
  } catch (error) {
    console.error('C++ execution error:', error)
    return {
      success: false,
      output: '',
      error: `❌ Ошибка: ${error.message}`,
      executionTime: 0
    }
  }
}

// Выполнить Python код с Web Worker (с надежным timeout)
export const executePython = async (code, testInput, timeLimit = 5000) => {
  // Создаем НОВЫЙ worker для каждого запроса (избегаем конфликтов состояния)
  const worker = createPythonWorker()
  
  if (worker) {
    return new Promise((resolve) => {
      let messageHandler = null
      let timeoutTimer = null
      let executionTimer = null
      let resolved = false  // Флаг чтобы не resolve дважды
      
      // Функция для финализации (удаление listener и очистка)
      const cleanup = () => {
        if (messageHandler && worker) {
          try {
            worker.removeEventListener('message', messageHandler)
          } catch (e) {
            // Ignore
          }
        }
        if (timeoutTimer) clearTimeout(timeoutTimer)
        if (executionTimer) clearTimeout(executionTimer)
        try {
          worker.terminate()
        } catch (e) {
          // Ignore
        }
      }
      
      messageHandler = (event) => {
        if (resolved) return  // Уже resolve'ли, игнорируем все остальные сообщения
        
        const { type, output, executionTime, message, timeLimit: msgTimeLimit, actualTime } = event.data
        
        if (type === 'initialized') {
          // После инициализации отправляем код для выполнения
          worker.postMessage({ 
            type: 'execute',
            code, 
            testInput, 
            timeLimit 
          })
          
          // Запускаем таймер ТОЛЬКО для выполнения кода
          if (timeLimit > 0) {
            executionTimer = setTimeout(() => {
              if (!resolved) {
                resolved = true
                cleanup()
                resolve({
                  success: false,
                  output: '',
                  error: `⏱️ Превышен лимит времени (${timeLimit}ms)`,
                  executionTime: timeLimit
                })
              }
            }, timeLimit + 2000)  // Даем запас 2 секунды
          }
          return
        }
        
        if (type === 'success') {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve({
              success: true,
              output: output,
              error: null,
              executionTime: executionTime
            })
          }
        } else if (type === 'timeout') {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve({
              success: false,
              output: '',
              error: `⏱️ Превышен лимит времени (${msgTimeLimit}ms, выполнялось ${actualTime}ms)`,
              executionTime: actualTime
            })
          }
        } else if (type === 'error') {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve({
              success: false,
              output: '',
              error: `❌ ${message}`,
              executionTime: 0
            })
          }
        }
      }
      
      worker.addEventListener('message', messageHandler)
      
      // Запускаем инициализацию worker'а
      worker.postMessage({ type: 'init' })
      
      // Страховка: если worker совсем зависнет на инициализации
      timeoutTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve({
            success: false,
            output: '',
            error: '❌ Worker инициализация заняла слишком много времени',
            executionTime: 0
          })
        }
      }, 30000)  // 30 сек максимум на инициализацию
    })
  }
  
  // Fallback: выполнить в основном потоке
  console.warn('⚠️ Используется fallback выполнение Python в основном потоке')
  
  if (!pyodideReady) {
    await initPyodide()
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        output: '',
        error: `⏱️ Превышен лимит времени (${timeLimit}ms)`,
        executionTime: timeLimit
      })
    }, timeLimit + 500)
    
    try {
      const startTime = performance.now()
      
      // Передаём данные через globals, а не через строковую интерполяцию,
      // чтобы исключить возможность инъекции через спецсимволы в testInput/code.
      pyodide.globals.set('_safe_input_data', testInput || '')
      pyodide.globals.set('_safe_user_code', code || '')

      const wrappedCode = `
import sys
import builtins

_input_lines = _safe_input_data.split('\\n') if _safe_input_data else []
_input_index = 0

def mock_input(prompt=""):
    global _input_index
    if _input_index < len(_input_lines):
        line = _input_lines[_input_index]
        _input_index += 1
        return line
    raise EOFError("No more input")

builtins.input = mock_input

_output_lines = []
def mock_print(*args, **kwargs):
    _output_lines.append(' '.join(str(arg) for arg in args))

builtins.print = mock_print

try:
    exec(_safe_user_code)
    _final_output = '\\n'.join(_output_lines) if _output_lines else ''
except Exception as e:
    _final_output = f"Error: {type(e).__name__}: {e}"
`

      pyodide.runPython(wrappedCode)
      const output = pyodide.runPython('_final_output')
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      clearTimeout(timeout)
      
      resolve({
        success: true,
        output: String(output),
        error: null,
        executionTime: Math.round(executionTime)
      })
    } catch (error) {
      clearTimeout(timeout)
      resolve({
        success: false,
        output: '',
        error: `❌ ${error.message}`,
        executionTime: 0
      })
    }
  })
}

// Сравнить выходные данные
export const compareOutput = (actual, expected) => {
  const normalizeOutput = (str) => {
    if (str === null || str === undefined) return ''
    const trimmed = String(str).trim()
    if (trimmed === '') return ''
    
    return trimmed
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n')
  }
  
  const normalizedActual = normalizeOutput(actual)
  const normalizedExpected = normalizeOutput(expected)
  
  return normalizedActual === normalizedExpected
}

// Запустить тесты
export const runTests = async (code, tests, timeLimit = 5000, language = 'python', onStatusUpdate = null) => {
  if (language === 'cpp') {
    const results = []
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      if (onStatusUpdate) onStatusUpdate(`Запуск теста ${i + 1}...`)
      
      try {
        const execution = await executeCpp(code, test.input, timeLimit)
        
        if (execution.success) {
          const passed = compareOutput(execution.output, test.output)
          results.push({
            testId: test.id || `test_${i + 1}`,
            passed,
            expected: test.output,
            actual: execution.output,
            executionTime: execution.executionTime,
            isHidden: !!test.isHidden
          })
        } else {
          results.push({
            testId: test.id || `test_${i + 1}`,
            passed: false,
            error: execution.error,
            executionTime: execution.executionTime,
            isHidden: !!test.isHidden
          })
        }
      } catch (error) {
        results.push({
          testId: test.id || `test_${i + 1}`,
          passed: false,
          error: `⚠️ ${error.message}`,
          isHidden: !!test.isHidden
        })
      }
    }
    
    return results
  }
  
  try {
    if (onStatusUpdate) onStatusUpdate('Загрузка интерпретатора Python...')
    await initPyodide()
  } catch (error) {
    return [{
      testId: 'error',
      passed: false,
      error: `Ошибка инициализации Pyodide: ${error.message}`
    }]
  }
  
  const results = []
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    if (onStatusUpdate) onStatusUpdate(`Запуск теста ${i + 1}...`)
    
    try {
      const execution = await executePython(code, test.input, timeLimit)
      
      if (execution.success) {
        const passed = compareOutput(execution.output, test.output)
        results.push({
          testId: test.id || `test_${i + 1}`,
          passed,
          expected: test.output,
          actual: execution.output,
          executionTime: execution.executionTime,
          isHidden: !!test.isHidden
        })
      } else {
        results.push({
          testId: test.id || `test_${i + 1}`,
          passed: false,
          error: execution.error,
          executionTime: execution.executionTime,
          isHidden: !!test.isHidden
        })
      }
    } catch (error) {
      results.push({
        testId: test.id || `test_${i + 1}`,
        passed: false,
        error: `⚠️ ${error.message}`,
        isHidden: !!test.isHidden
      })
    }
  }
  
  return results
}