import React, { useEffect, useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import '../styles/CodeEditor.css'

const toSuggestions = (items, detail, type = 'keyword') => items.map((label) => ({ label, detail, type }))

const PYTHON_KEYWORDS = toSuggestions([
  'def', 'class', 'import', 'from', 'as', 'return', 'if', 'else', 'elif', 'for', 'while',
  'try', 'except', 'finally', 'with', 'pass', 'break', 'continue', 'yield', 'lambda',
  'global', 'nonlocal', 'assert', 'raise', 'del', 'in', 'is', 'and', 'or', 'not',
  'True', 'False', 'None', 'async', 'await', 'match', 'case',
], 'ключевое слово')

const PYTHON_BUILTINS = toSuggestions([
  'print', 'input', 'range', 'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
  'tuple', 'open', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'sum', 'min', 'max',
  'abs', 'round', 'all', 'any', 'isinstance', 'type', 'dir', 'help', 'super', 'self',
], 'встроенная функция')

const PYTHON_MODULES = toSuggestions([
  'math', 'random', 'statistics', 'decimal', 'fractions', 'cmath', 'numpy', 'pandas',
  're', 'json', 'sys', 'os', 'pathlib', 'datetime', 'time', 'collections', 'itertools',
  'functools', 'heapq', 'bisect', 'typing', 'string', 'array', 'copy', ' functools',
].map((item) => item.trim()), 'модуль')

const PYTHON_IMPORT_MEMBERS = {
  math: toSuggestions(['ceil', 'comb', 'factorial', 'floor', 'gcd', 'log', 'pi', 'pow', 'sqrt', 'sin', 'cos', 'tan'], 'из math'),
  random: toSuggestions(['choice', 'randint', 'random', 'randrange', 'sample', 'shuffle'], 'из random'),
  itertools: toSuggestions(['chain', 'combinations', 'permutations', 'product', 'repeat'], 'из itertools'),
  collections: toSuggestions(['Counter', 'defaultdict', 'deque', 'namedtuple'], 'из collections'),
  heapq: toSuggestions(['heapify', 'heappop', 'heappush', 'nlargest', 'nsmallest'], 'из heapq'),
  re: toSuggestions(['compile', 'findall', 'match', 'search', 'split', 'sub'], 'из re'),
}

const PYTHON_MEMBERS = {
  str: toSuggestions([
    'capitalize', 'casefold', 'center', 'count', 'encode', 'endswith', 'find', 'format',
    'index', 'isalnum', 'isalpha', 'isascii', 'isdigit', 'islower', 'isspace', 'istitle',
    'isupper', 'join', 'lower', 'lstrip', 'partition', 'removeprefix', 'removesuffix',
    'replace', 'rfind', 'rindex', 'rstrip', 'split', 'splitlines', 'startswith', 'strip',
    'swapcase', 'title', 'upper', 'zfill',
  ], 'метод строки', 'method'),
  list: toSuggestions(['append', 'clear', 'copy', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort'], 'метод списка', 'method'),
  dict: toSuggestions(['clear', 'copy', 'fromkeys', 'get', 'items', 'keys', 'pop', 'popitem', 'setdefault', 'update', 'values'], 'метод словаря', 'method'),
  set: toSuggestions(['add', 'clear', 'copy', 'difference', 'discard', 'intersection', 'pop', 'remove', 'union', 'update'], 'метод множества', 'method'),
  tuple: toSuggestions(['count', 'index'], 'метод кортежа', 'method'),
}

const CPP_KEYWORDS = toSuggestions([
  'int', 'float', 'double', 'char', 'bool', 'void', 'long', 'short', 'signed', 'unsigned',
  'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
  'continue', 'try', 'catch', 'throw', 'auto', 'const', 'static', 'extern', 'inline',
  'template', 'typename', 'class', 'struct', 'union', 'enum', 'public', 'protected',
  'private', 'virtual', 'override', 'final', 'friend', 'operator', 'this', 'new', 'delete',
  'sizeof', 'typeid', 'namespace', 'using', 'nullptr', 'true', 'false',
], 'ключевое слово')

const CPP_HEADERS = toSuggestions([
  'iostream', 'vector', 'string', 'algorithm', 'cmath', 'iomanip', 'map', 'set', 'queue',
  'deque', 'stack', 'utility', 'numeric', 'array', 'unordered_map', 'unordered_set',
  'limits', 'climits', 'cstring', 'sstream', 'fstream', 'bitset', 'functional',
], 'заголовочный файл', 'header')

const CPP_MEMBERS = {
  std: toSuggestions(['array', 'cin', 'clog', 'cout', 'deque', 'endl', 'fixed', 'getline', 'map', 'max', 'min', 'move', 'pair', 'queue', 'set', 'setw', 'sort', 'stack', 'string', 'to_string', 'unordered_map', 'unordered_set', 'vector'], 'пространство std', 'member'),
  vector: toSuggestions(['assign', 'at', 'back', 'begin', 'clear', 'data', 'empty', 'end', 'front', 'insert', 'pop_back', 'push_back', 'reserve', 'resize', 'size'], 'метод vector', 'method'),
  string: toSuggestions(['append', 'at', 'back', 'begin', 'c_str', 'clear', 'empty', 'ends_with', 'find', 'front', 'insert', 'length', 'pop_back', 'push_back', 'replace', 'size', 'substr'], 'метод string', 'method'),
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const inferPythonType = (code, target) => {
  if (PYTHON_MEMBERS[target]) return target

  const safeTarget = escapeRegExp(target)
  const assignment = new RegExp(`(?:^|\\n)\\s*${safeTarget}\\s*=\\s*([^\\n]+)`)
  const match = code.match(assignment)
  if (!match) return null

  const expression = match[1].trim()
  if (/^(?:[rubf]{0,2})["'`]/i.test(expression)) return 'str'
  if (expression.startsWith('[')) return 'list'
  if (expression.startsWith('{')) return expression.includes(':') ? 'dict' : 'set'
  if (expression.startsWith('(')) return 'tuple'
  return null
}

const filterSuggestions = (items, prefix) => {
  const normalizedPrefix = String(prefix || '').toLowerCase()
  const unique = items.filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index)
  return unique
    .filter((item) => !normalizedPrefix || item.label.toLowerCase().startsWith(normalizedPrefix))
    .slice(0, 10)
}

const getAutocompleteContext = (value, cursor, language) => {
  const beforeCursor = value.slice(0, cursor)
  const lineStart = beforeCursor.lastIndexOf('\n') + 1
  const line = beforeCursor.slice(lineStart)
  const normalizedLanguage = language.toLowerCase()

  if (normalizedLanguage === 'python') {
    const fromImportMatch = line.match(/^\s*from\s+([\w.]*)\s+import\s*([A-Za-z_]\w*)?$/)
    if (fromImportMatch) {
      const moduleName = fromImportMatch[1].split('.').pop()
      const prefix = fromImportMatch[2] || ''
      const members = PYTHON_IMPORT_MEMBERS[moduleName] || PYTHON_BUILTINS
      return {
        prefix,
        start: cursor - prefix.length,
        end: cursor,
        suggestions: filterSuggestions(members, prefix),
        allowEmpty: true,
      }
    }

    const importMatch = line.match(/^\s*import\s+([\w.]*)$/)
    if (importMatch) {
      const prefix = importMatch[1]
      return {
        prefix,
        start: cursor - prefix.length,
        end: cursor,
        suggestions: filterSuggestions(PYTHON_MODULES, prefix.split('.').pop()),
        allowEmpty: true,
      }
    }

    const memberMatch = line.match(/([A-Za-z_]\w*)\.\s*([A-Za-z_]\w*)?$/)
    if (memberMatch) {
      const target = memberMatch[1]
      const prefix = memberMatch[2] || ''
      const targetType = inferPythonType(value, target)
      const members = PYTHON_MEMBERS[targetType] || PYTHON_IMPORT_MEMBERS[target] || []
      if (members.length > 0) {
        return {
          prefix,
          start: cursor - prefix.length,
          end: cursor,
          suggestions: filterSuggestions(members, prefix),
          allowEmpty: true,
        }
      }
    }

    const identifierMatch = line.match(/([A-Za-z_]\w*)$/)
    if (!identifierMatch) return null
    const prefix = identifierMatch[1]
    return {
      prefix,
      start: cursor - prefix.length,
      end: cursor,
      suggestions: filterSuggestions([...PYTHON_KEYWORDS, ...PYTHON_BUILTINS], prefix),
      allowEmpty: false,
    }
  }

  const includeMatch = line.match(/^\s*#include\s*<([A-Za-z_]\w*)?$/)
  if (includeMatch) {
    const prefix = includeMatch[1] || ''
    return {
      prefix,
      start: cursor - prefix.length,
      end: cursor,
      suggestions: filterSuggestions(CPP_HEADERS, prefix),
      allowEmpty: true,
    }
  }

  const namespaceMatch = line.match(/([A-Za-z_]\w*)::([A-Za-z_]\w*)?$/)
  if (namespaceMatch) {
    const target = namespaceMatch[1]
    const prefix = namespaceMatch[2] || ''
    const members = CPP_MEMBERS[target] || []
    if (members.length > 0) {
      return {
        prefix,
        start: cursor - prefix.length,
        end: cursor,
        suggestions: filterSuggestions(members, prefix),
        allowEmpty: true,
      }
    }
  }

  const memberMatch = line.match(/([A-Za-z_]\w*)\.([A-Za-z_]\w*)?$/)
  if (memberMatch) {
    const target = memberMatch[1]
    const prefix = memberMatch[2] || ''
    const members = CPP_MEMBERS[target] || []
    if (members.length > 0) {
      return {
        prefix,
        start: cursor - prefix.length,
        end: cursor,
        suggestions: filterSuggestions(members, prefix),
        allowEmpty: true,
      }
    }
  }

  const identifierMatch = line.match(/([A-Za-z_]\w*)$/)
  if (!identifierMatch) return null
  const prefix = identifierMatch[1]
  return {
    prefix,
    start: cursor - prefix.length,
    end: cursor,
    suggestions: filterSuggestions(CPP_KEYWORDS, prefix),
    allowEmpty: false,
  }
}

const getMenuPosition = (textarea, cursor) => {
  if (!textarea || !textarea.parentElement) return { top: 14, left: 56 }

  const style = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(style.lineHeight) || 21
  const fontSize = Number.parseFloat(style.fontSize) || 14
  const charWidth = fontSize * 0.6
  const beforeCursor = textarea.value.slice(0, cursor)
  const lineNumber = beforeCursor.split('\n').length - 1
  const currentLine = beforeCursor.slice(beforeCursor.lastIndexOf('\n') + 1)
  const wrapper = textarea.parentElement
  const menuWidth = 245
  const leftPadding = 40 + 15
  const left = Math.max(leftPadding, Math.min(leftPadding + currentLine.length * charWidth, wrapper.clientWidth - menuWidth - 8))
  const top = Math.max(10, Math.min(15 + (lineNumber + 1) * lineHeight - textarea.scrollTop, wrapper.clientHeight - 220))

  return { top, left }
}

export const CodeEditor = ({ language, onChange, value = '', readOnly = false }) => {
  const textareaRef = useRef(null)
  const highlightedRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const lastEditedValueRef = useRef(value)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [autocompleteContext, setAutocompleteContext] = useState(null)
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 14, left: 56 })

  const lineNumbers = useMemo(() => {
    const lines = (value || '').split('\n').length
    return Array.from({ length: lines }, (_, index) => index + 1)
  }, [value])

  const splitHtmlIntoLines = (html) => {
    const lines = []
    const tagStack = []
    let currentLine = ''
    const parts = html.split(/(<[^>]+>)/g)

    for (const part of parts) {
      if (!part) continue
      if (part.startsWith('<')) {
        if (part.startsWith('</')) {
          tagStack.pop()
        } else if (!part.endsWith('/>')) {
          tagStack.push(part)
        }
        currentLine += part
      } else {
        const textParts = part.split(/\r?\n/)
        for (let index = 0; index < textParts.length; index += 1) {
          currentLine += textParts[index]
          if (index < textParts.length - 1) {
            for (let stackIndex = tagStack.length - 1; stackIndex >= 0; stackIndex -= 1) {
              const match = tagStack[stackIndex].match(/<([a-z0-9-]+)/i)
              if (match) currentLine += `</${match[1]}>`
            }
            lines.push(currentLine)
            currentLine = tagStack.join('')
          }
        }
      }
    }

    lines.push(currentLine)
    return lines
  }

  const updateAutocomplete = (nextValue = value, cursor = textareaRef.current?.selectionStart ?? nextValue.length, force = false) => {
    if (readOnly) return
    const context = getAutocompleteContext(nextValue, cursor, language)
    if (!context || (!force && !context.allowEmpty && context.prefix.length < 1) || context.suggestions.length === 0) {
      setShowAutocomplete(false)
      setAutocompleteContext(null)
      return
    }

    setSuggestions(context.suggestions)
    setSelectedSuggestion(0)
    setAutocompleteContext(context)
    setAutocompletePosition(getMenuPosition(textareaRef.current, cursor))
    setShowAutocomplete(true)
  }

  useEffect(() => {
    if (lastEditedValueRef.current !== value) {
      setShowAutocomplete(false)
      setAutocompleteContext(null)
      lastEditedValueRef.current = value
    }

    if (highlightedRef.current && value) {
      const highlighted = hljs.highlight(value, {
        language: language.toLowerCase(),
        ignoreIllegals: true,
      }).value
      const lines = splitHtmlIntoLines(highlighted)
      highlightedRef.current.innerHTML = lines
        .map((line, index) => `<div class="code-line" data-line="${index + 1}">${line || ' '}</div>`)
        .join('')
    } else if (highlightedRef.current) {
      highlightedRef.current.innerHTML = ''
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value, language])

  const handleScroll = (event) => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollTop = event.target.scrollTop
      highlightedRef.current.scrollLeft = event.target.scrollLeft
    }
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.target.scrollTop
    if (showAutocomplete) setAutocompletePosition(getMenuPosition(event.target, event.target.selectionStart))
  }

  const insertAutocomplete = (suggestion) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursor = textarea.selectionStart
    const context = autocompleteContext || getAutocompleteContext(value, cursor, language)
    const start = context?.start ?? cursor
    const end = context?.end ?? cursor
    const insertText = suggestion.type === 'header' ? `${suggestion.label}>` : suggestion.label
    const newValue = value.slice(0, start) + insertText + value.slice(end)
    const nextCursor = start + insertText.length

    lastEditedValueRef.current = newValue
    onChange(newValue)
    setShowAutocomplete(false)
    setAutocompleteContext(null)

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = nextCursor
      textarea.selectionEnd = nextCursor
    })
  }

  const handleKeyDown = (event) => {
    const textarea = textareaRef.current
    if (!textarea) return

    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
      event.preventDefault()
      updateAutocomplete(value, textarea.selectionStart, true)
      return
    }

    if (showAutocomplete && suggestions.length > 0) {
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault()
        insertAutocomplete(suggestions[selectedSuggestion])
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedSuggestion((current) => (current + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedSuggestion((current) => (current - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowAutocomplete(false)
        return
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const { selectionStart: start, selectionEnd: end } = textarea

      if (event.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        const lineText = value.slice(lineStart, start)
        if (lineText.startsWith('\t')) {
          const newValue = value.slice(0, lineStart) + value.slice(lineStart + 1)
          lastEditedValueRef.current = newValue
          onChange(newValue)
          window.requestAnimationFrame(() => { textarea.selectionStart = textarea.selectionEnd = start - 1 })
        } else if (lineText.startsWith('  ')) {
          const newValue = value.slice(0, lineStart) + value.slice(lineStart + 2)
          lastEditedValueRef.current = newValue
          onChange(newValue)
          window.requestAnimationFrame(() => { textarea.selectionStart = textarea.selectionEnd = start - 2 })
        }
      } else {
        const newValue = value.slice(0, start) + '\t' + value.slice(end)
        lastEditedValueRef.current = newValue
        onChange(newValue)
        window.requestAnimationFrame(() => { textarea.selectionStart = textarea.selectionEnd = start + 1 })
      }
    }
  }

  const handleChange = (event) => {
    const newValue = event.target.value
    const cursor = event.target.selectionStart
    lastEditedValueRef.current = newValue
    onChange(newValue)

    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    updateAutocomplete(newValue, cursor)
  }

  const refreshFromCursor = () => {
    if (textareaRef.current) updateAutocomplete(value, textareaRef.current.selectionStart)
  }

  useEffect(() => {
    const syncHeights = () => {
      if (!highlightedRef.current || !lineNumbersRef.current) return
      const codeLines = highlightedRef.current.querySelectorAll('.code-line')
      const numberContainers = lineNumbersRef.current.querySelectorAll('.line-number-wrapper')
      codeLines.forEach((line, index) => {
        if (numberContainers[index]) numberContainers[index].style.height = `${line.getBoundingClientRect().height}px`
      })
    }

    const timeoutId = window.setTimeout(syncHeights, 0)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncHeights)
    if (textareaRef.current) resizeObserver?.observe(textareaRef.current)
    window.addEventListener('resize', syncHeights)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', syncHeights)
      resizeObserver?.disconnect()
    }
  }, [value, language])

  return (
    <div className="code-editor">
      <div className="editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers.map((number) => (
            <div key={number} className="line-number-wrapper">
              <div className="line-number">{number}</div>
            </div>
          ))}
        </div>
        <div className="editor-highlight" ref={highlightedRef} />
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(event.key)) refreshFromCursor()
          }}
          onClick={refreshFromCursor}
          onFocus={refreshFromCursor}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck="false"
          wrap="soft"
          aria-label={`Редактор кода: ${language}`}
        />
        {showAutocomplete && suggestions.length > 0 && (
          <div
            className="autocomplete-menu"
            style={{ top: `${autocompletePosition.top}px`, left: `${autocompletePosition.left}px` }}
            role="listbox"
            aria-label="Подсказки кода"
          >
            <div className="autocomplete-hint">{language.toLowerCase() === 'python' ? 'Python' : 'C++'} · выберите вариант</div>
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.type}-${suggestion.label}`}
                className={`autocomplete-item ${index === selectedSuggestion ? 'selected' : ''}`}
                role="option"
                aria-selected={index === selectedSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertAutocomplete(suggestion)}
              >
                <span className="autocomplete-label">{suggestion.label}</span>
                {suggestion.detail && <span className="autocomplete-detail">{suggestion.detail}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeEditor
