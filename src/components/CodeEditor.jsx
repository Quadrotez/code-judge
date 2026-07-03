// components/CodeEditor.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import '../styles/CodeEditor.css'

// Autocomplete suggestions
const getAutocompleteSuggestions = (word, language) => {
  const pythonSuggestions = [
    'def', 'class', 'import', 'from', 'as', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'pass', 'break', 'continue', 'yield', 'lambda', 'global', 'nonlocal', 'assert', 'raise', 'del', 'in', 'is', 'and', 'or', 'not', 'True', 'False', 'None',
    'print', 'input', 'range', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'open', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'sum', 'min', 'max', 'abs', 'round', 'all', 'any', 'isinstance', 'type', 'dir', 'help'
  ]
  const cppSuggestions = [
    'int', 'float', 'double', 'char', 'bool', 'void', 'long', 'short', 'signed', 'unsigned', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'goto', 'try', 'catch', 'throw', 'std', 'cout', 'cin', 'endl', 'vector', 'string', 'auto', 'const', 'static', 'extern', 'inline', 'template', 'typename', 'class', 'struct', 'union', 'enum', 'public', 'protected', 'private', 'virtual', 'override', 'final', 'friend', 'operator', 'this', 'new', 'delete', 'sizeof', 'typeid', 'namespace', 'using'
  ]
  
  const suggestions = language.toLowerCase() === 'python' ? pythonSuggestions : cppSuggestions
  return suggestions.filter(s => s.toLowerCase().startsWith(word.toLowerCase())).slice(0, 10)
}

export const CodeEditor = ({ language, onChange, value, readOnly = false }) => {
  const textareaRef = useRef(null)
  const highlightedRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  
  // Генерируем номера строк
  const lineNumbers = useMemo(() => {
    const lines = (value || '').split('\n').length
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [value])

  // Синхронизация прокрутки
  const handleScroll = (e) => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollTop = e.target.scrollTop
      highlightedRef.current.scrollLeft = e.target.scrollLeft
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop
    }
  }
  
  // Функция для разделения HTML на строки с сохранением тегов
  const splitHtmlIntoLines = (html) => {
    const lines = []
    const tagStack = []
    let currentLine = ""
    
    const parts = html.split(/(<[^>]+>)/g)
    for (const part of parts) {
      if (!part) continue
      if (part.startsWith("<")) {
        if (part.startsWith("</")) {
          tagStack.pop()
        } else if (!part.endsWith("/>")) {
          tagStack.push(part)
        }
        currentLine += part
      } else {
        const textParts = part.split(/\r?\n/)
        for (let i = 0; i < textParts.length; i++) {
          currentLine += textParts[i]
          if (i < textParts.length - 1) {
            // Закрываем все открытые теги
            for (let j = tagStack.length - 1; j >= 0; j--) {
              const match = tagStack[j].match(/<([a-z0-9-]+)/i)
              if (match) currentLine += `</${match[1]}>`
            }
            lines.push(currentLine)
            // Открываем их снова для следующей строки
            currentLine = tagStack.join("")
          }
        }
      }
    }
    lines.push(currentLine)
    return lines
  }

  // Обновление подсветки кода
  useEffect(() => {
    if (highlightedRef.current && value) {
      const highlighted = hljs.highlight(value, {
        language: language.toLowerCase(),
        ignoreIllegals: true
      }).value
      
      const lines = splitHtmlIntoLines(highlighted)
      highlightedRef.current.innerHTML = lines
        .map((line, i) => `<div class="code-line" data-line="${i + 1}">${line || ' '}</div>`)
        .join('')
    } else if (highlightedRef.current) {
      highlightedRef.current.innerHTML = ''
    }
  }, [value, language])
  
  const handleKeyDown = (e) => {
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Autocomplete
    if (showAutocomplete && suggestions.length > 0) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        insertAutocomplete(suggestions[selectedSuggestion])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion(prev => (prev + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Escape') {
        setShowAutocomplete(false)
        return
      }
    }

    // Tab and Shift+Tab support
    if (e.key === 'Tab') {
      e.preventDefault()
      
      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const lastNewline = value.lastIndexOf('\n', start - 1)
        const lineStart = lastNewline + 1
        const lineText = value.substring(lineStart, start)
        
        if (lineText.startsWith('\t')) {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 1)
          onChange(newValue)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 1
          }, 0)
        } else if (lineText.startsWith('  ')) {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2)
          onChange(newValue)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 2
          }, 0)
        }
      } else {
        // Tab: Indent
        const newValue = value.substring(0, start) + '\t' + value.substring(end)
        onChange(newValue)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
      }
    }
  }
  
  const handleChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Get current word for autocomplete
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const lastNewline = newValue.lastIndexOf('\n', start - 1)
    const lineStart = lastNewline + 1
    const lineText = newValue.substring(lineStart, start)
    const words = lineText.split(/\W+/)
    const currentWord = words[words.length - 1]
    
    if (currentWord && currentWord.length > 1) {
      const sugg = getAutocompleteSuggestions(currentWord, language)
      if (sugg.length > 0) {
        setSuggestions(sugg)
        setCurrentWord(currentWord)
        setShowAutocomplete(true)
        setSelectedSuggestion(0)
      } else {
        setShowAutocomplete(false)
      }
    } else {
      setShowAutocomplete(false)
    }
  }
  
  const insertAutocomplete = (suggestion) => {
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineText = value.substring(lineStart, start)
    const words = lineText.split(/\W+/)
    const wordToReplace = words[words.length - 1]
    
    const beforeWord = value.substring(0, start - wordToReplace.length)
    const afterCursor = value.substring(start)
    
    const newValue = beforeWord + suggestion + afterCursor
    onChange(newValue)
    
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = beforeWord.length + suggestion.length
    }, 0)
    
    setShowAutocomplete(false)
  }
  
  // Эффект для синхронизации высоты номеров строк
  useEffect(() => {
    const syncHeights = () => {
      if (!highlightedRef.current || !lineNumbersRef.current) return
      
      const codeLines = highlightedRef.current.querySelectorAll('.code-line')
      const numberContainers = lineNumbersRef.current.querySelectorAll('.line-number-wrapper')
      
      codeLines.forEach((line, index) => {
        if (numberContainers[index]) {
          const height = line.getBoundingClientRect().height
          numberContainers[index].style.height = `${height}px`
        }
      })
    }

    // Запускаем синхронизацию после рендеринга и при изменении размера окна
    const timeoutId = setTimeout(syncHeights, 0)
    window.addEventListener('resize', syncHeights)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', syncHeights)
    }
  }, [value, language])

  return (
    <div className="code-editor">
      <div className="editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers.map(num => (
            <div key={num} className="line-number-wrapper">
              <div className="line-number">{num}</div>
            </div>
          ))}
        </div>
        <div className="editor-highlight" ref={highlightedRef}></div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          placeholder=""
          spellCheck="false"
          wrap="soft"
        />
        {showAutocomplete && suggestions.length > 0 && (
          <div className="autocomplete-menu">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`autocomplete-item ${index === selectedSuggestion ? 'selected' : ''}`}
                onClick={() => insertAutocomplete(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeEditor

