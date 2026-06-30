// workers/pythonExecutor.worker.js
// Этот Web Worker выполняет Python код и может быть прерван по timeout

let pyodide = null
let pyodideReady = false
let initStartTime = null

// Инициализация Pyodide
async function initPyodide() {
  if (pyodideReady) return
  
  try {
    initStartTime = performance.now()
    
    // Загружаем Pyodide в worker
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js')
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
    })
    
    // Выполняем пустой скрипт для разминки
    pyodide.runPython('')
    
    pyodideReady = true
    
    const initEndTime = performance.now()
    const initTime = initEndTime - initStartTime
    
    self.postMessage({
      type: 'initialized',
      initTime: Math.round(initTime)
    })
    
  } catch (error) {
    self.postMessage({ 
      type: 'error',
      message: `Ошибка инициализации Pyodide: ${error.message}`
    })
  }
}

// Обработка сообщений из главного потока
self.onmessage = async (event) => {
  const { type, code, testInput, timeLimit } = event.data
  
  // Если это команда инициализации
  if (type === 'init') {
    await initPyodide()
    return
  }
  
  // Если это команда выполнения кода
  if (type === 'execute') {
    if (!pyodideReady) {
      self.postMessage({
        type: 'error',
        message: 'Pyodide не инициализирован'
      })
      return
    }
    
    try {
      // ВАЖНО: Таймер запускается ДО выполнения кода
      const startTime = performance.now()
      
      const inputLines = testInput === '' ? [] : testInput.split('\n')
      const escapedInput = inputLines.map(line => line.replace(/"/g, '\\"')).join('\\n')
      
      const wrappedCode = `
import sys
from io import StringIO

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

import builtins
builtins.input = mock_input

_output_lines = []
def mock_print(*args, **kwargs):
    _output_lines.append(' '.join(str(arg) for arg in args))

builtins.print = mock_print

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
      
      // Проверяем, не превышен ли лимит времени
      if (timeLimit > 0 && executionTime > timeLimit) {
        self.postMessage({
          type: 'timeout',
          timeLimit,
          actualTime: Math.round(executionTime)
        })
      } else {
        self.postMessage({
          type: 'success',
          output: String(output),
          executionTime: Math.round(executionTime)
        })
      }
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: `${error.message}`
      })
    }
  }
}
