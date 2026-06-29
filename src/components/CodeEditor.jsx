// components/CodeEditor.jsx
import React, { useState, useRef, useEffect } from 'react'
import '../styles/CodeEditor.css'

// Simple syntax highlighting for Python and C++
const highlightCode = (code, language) => {
  let highlighted = code
  
  if (language === 'Python') {
    // Python keywords
    const pythonKeywords = /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|pass|break|continue|lambda|yield|global|nonlocal|assert|del|raise|print|input|len|range|str|int|float|list|dict|set|tuple)\b/g
    const pythonBuiltins = /\b(True|False|None|self)\b/g
    
    highlighted = highlighted.replace(pythonKeywords, '<span class="keyword">$1</span>')
    highlighted = highlighted.replace(pythonBuiltins, '<span class="builtin">$1</span>')
  } else if (language === 'C++') {
    // C++ keywords
    const cppKeywords = /\b(int|float|double|string|void|bool|char|auto|const|static|return|if|else|for|while|do|switch|case|break|continue|class|struct|namespace|template|try|catch|throw|new|delete|nullptr|true|false)\b/g
    
    highlighted = highlighted.replace(cppKeywords, '<span class="keyword">$1</span>')
  }
  
  // Comments
  highlighted = highlighted.replace(/(#.*?$)/gm, '<span class="comment">$1</span>')
  highlighted = highlighted.replace(/\/\/.*?$/gm, '<span class="comment">$&</span>')
  highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
  
  // Strings
  highlighted = highlighted.replace(/"[^"]*"/g, '<span class="string">$&</span>')
  highlighted = highlighted.replace(/'[^']*'/g, '<span class="string">$&</span>')
  
  // Numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
  
  return highlighted
}

// Autocomplete suggestions
const getAutocompleteSuggestions = (word, language) => {
  const pythonSuggestions = ['def', 'class', 'import', 'return', 'if', 'else', 'for', 'while', 'try', 'except', 'print', 'input', 'range', 'len', 'str', 'int', 'float', 'list', 'dict']
  const cppSuggestions = ['int', 'float', 'void', 'return', 'if', 'else', 'for', 'while', 'std', 'cout', 'cin', 'endl', 'vector', 'string', 'auto', 'const', 'static']
  
  const suggestions = language === 'Python' ? pythonSuggestions : cppSuggestions
  return suggestions.filter(s => s.startsWith(word.toLowerCase())).slice(0, 5)
}

export const CodeEditor = ({ language, onChange, value, readOnly = false }) => {
  const textareaRef = useRef(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  
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
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={`// Напиши код на ${language}...`}
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

