// components/LaTeXRenderer.jsx
import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Компонент для рендеринга текста с LaTeX формулами
 * 
 * Использует формат Obsidian: 
 * - $$ ... $$ - формула в отдельной строке (display mode)
 * - $ ... $ - формула на одном уровне с текстом (inline mode)
 */
export const LaTeXRenderer = ({ text, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!text) return null
    
    const parts = []
    // Сначала ищем $$ (display mode) затем $ (inline mode)
    const regex = /(\$\$[\s\S]*?\$\$)|(\$(?!\$)[\s\S]*?(?<!\$)\$)/g
    let lastIndex = 0
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // Добавляем обычный текст перед формулой
      if (match.index > lastIndex) {
        const plainText = text.substring(lastIndex, match.index)
        parts.push({
          type: 'text',
          content: plainText,
          key: `text-${lastIndex}`
        })
      }
      
      // Определяем режим отображения
      const fullMatch = match[0]
      const isDisplay = fullMatch.startsWith('$$')
      const formula = isDisplay 
        ? fullMatch.slice(2, -2).trim()  // Удаляем $$ с обеих сторон
        : fullMatch.slice(1, -1).trim()  // Удаляем $ с обеих сторон
      
      parts.push({
        type: 'latex',
        content: formula,
        key: `latex-${match.index}`,
        displayMode: isDisplay
      })
      
      lastIndex = regex.lastIndex
    }
    
    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
        key: `text-${lastIndex}`
      })
    }
    
    return parts
  }, [text])
  
  if (!renderedContent || renderedContent.length === 0) {
    return <div className={`latex-renderer ${className}`}>{text}</div>
  }
  
  return (
    <div className={`latex-renderer ${className}`}>
      {renderedContent.map(part => {
        if (part.type === 'text') {
          // Преобразуем переносы строк в <br/>
          return (
            <span key={part.key} style={{ whiteSpace: 'pre-wrap' }}>
              {part.content.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < part.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          )
        } else if (part.type === 'latex') {
          return (
            <LaTeXFormula 
              key={part.key} 
              formula={part.content} 
              displayMode={part.displayMode}
            />
          )
        }
      })}
    </div>
  )
}

/**
 * Компонент для рендеринга одной LaTeX формулы
 */
const LaTeXFormula = ({ formula, displayMode = true }) => {
  const elementRef = React.useRef(null)
  
  React.useEffect(() => {
    if (elementRef.current && formula) {
      try {
        const html = katex.renderToString(formula, {
          throwOnError: false,
          displayMode: displayMode
        })
        elementRef.current.innerHTML = html
      } catch (error) {
        console.error('LaTeX rendering error:', error)
        elementRef.current.textContent = `[LaTeX Error: ${error.message}]`
      }
    }
  }, [formula, displayMode])
  
  return displayMode 
    ? <div ref={elementRef} className="katex-container" />
    : <span ref={elementRef} className="katex-inline" />
}

export default LaTeXRenderer
