// components/CodeEditor.jsx
import React, { useState, useRef, useEffect } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import '../styles/CodeEditor.css'

// Autocomplete suggestions
const getAutocompleteSuggestions = (word, language) => {
  const pythonSuggestions = ['def', 'class', 'import', 'return', 'if', 'else', 'for', 'while', 'try', 'except', 'print', 'input', 'range', 'len', 'str', 'int', 'float', 'list', 'dict']
  const cppSuggestions = ['int', 'float', 'void', 'return', 'if', 'else', 'for', 'while', 'std', 'cout', 'cin', 'endl', 'vector', 'string', 'auto', 'const', 'static']
  
  const suggestions = language === 'Python' ? pythonSuggestions : cppSuggestions
  return suggestions.filter(s => s.startsWith(word.toLowerCase())).slice(0, 5)
}

export const CodeEditor = ({ language, onChange, value, readOnly = false }) => {
  const textareaRef = useRef(null)
  const highlightedRef = useRef(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  
  // Синхронизация прокрутки между textarea и highlight блоком
  const handleScroll = (e) => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollTop = e.target.scrollTop
      highlightedRef.current.scrollLeft = e.target.scrollLeft
    }
  }
  
  // Обновление подсветки кода
  useEffect(() => {
    if (highlightedRef.current && value) {
      const highlighted = hljs.highlight(value, {
        language: language.toLowerCase(),
        ignoreIllegals: true
      }).value
      highlightedRef.current.innerHTML = `<pre><code class="hljs language-${language.toLowerCase()}">${highlighted}</code></pre>`
    } else if (highlightedRef.current) {
      highlightedRef.current.innerHTML = ''
    }
  }, [value, language])
  
  const handleKeyDown = (e) => {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      const newValue = value.substring(0, start) + '\t' + value.substring(end)
      onChange(newValue)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    }
    
    // Autocomplete
    if (e.key === 'ArrowDown' && showAutocomplete) {
      e.preventDefault()
      setSelectedSuggestion(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp' && showAutocomplete) {
      e.preventDefault()
      setSelectedSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && showAutocomplete && suggestions.length > 0) {
      e.preventDefault()
      insertAutocomplete(suggestions[selectedSuggestion])
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
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
  
  return (
    <div className="code-editor">
      <div className="editor-header">
        <span className="language-badge">{language}</span>
      </div>
      <div className="editor-wrapper">
        <pre className="editor-highlight" ref={highlightedRef}></pre>
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

