// utils/executor.js
let pyodideReady = false
let pyodide = null

// Инициализация Pyodide
export const initPyodide = async () => {
  if (pyodideReady) return pyodide
  
  try {
    // Используем глобальный объект window для loadPyodide
    if (!window.loadPyodide) {
      throw new Error('Pyodide не загружен. Проверь интернет.')
    }
    
    pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
    })
    
    pyodideReady = true
    return pyodide
  } catch (error) {
    console.error('Pyodide init error:', error)
    throw error
  }
}

// Выполнить Python код с заданным вводом
export const executePython = async (code, testInput, timeLimit = 5000) => {
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
      
      // Обработка пустого ввода
      const inputLines = testInput === '' ? [] : testInput.split('\n')
      const escapedInput = inputLines.map(line => line.replace(/"/g, '\\"')).join('\\n')
      
      // Создаем код, который перехватывает входные данные и вывод
      const wrappedCode = `
import sys
from io import StringIO

# Перехватываем stdin и stdout
_input_data = """${escapedInput}"""
_input_lines = _input_data.split('\\n') if _input_data else []
_input_index = 0

def mock_input(prompt=""):
    global _input_index
    if _input_index < len(_input_lines):
        line = _input_lines[_input_index]
        _input_index += 1
        return line
    raise EOFError("No more input")

# Заменяем встроенные функции
import builtins
builtins.input = mock_input

# Перехватываем print
_output_lines = []
def mock_print(*args, **kwargs):
    _output_lines.append(' '.join(str(arg) for arg in args))

builtins.print = mock_print

# Выполняем пользовательский код
try:
    exec("""${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""")
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
    // Если оба пусты, они равны
    if (str === null || str === undefined) return ''
    
    const trimmed = String(str).trim()
    
    // Если строка пуста после trim, возвращаем пустую строку
    if (trimmed === '') return ''
    
    // Иначе нормализуем как раньше
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
export const runTests = async (code, tests, timeLimit = 5000) => {
  // Проверяем что Pyodide готов
  try {
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
    
    try {
      const execution = await executePython(code, test.input, timeLimit)
      
      if (execution.success) {
        const passed = compareOutput(execution.output, test.output)
        results.push({
          testId: test.id || `test_${i + 1}`,
          passed,
          expected: test.output,
          actual: execution.output,
          executionTime: execution.executionTime
        })
      } else {
        results.push({
          testId: test.id || `test_${i + 1}`,
          passed: false,
          error: execution.error,
          executionTime: execution.executionTime
        })
      }
    } catch (error) {
      results.push({
        testId: test.id || `test_${i + 1}`,
        passed: false,
        error: `⚠️ ${error.message}`
      })
    }
  }
  
  return results
}
