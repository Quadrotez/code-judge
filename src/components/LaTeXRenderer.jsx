// components/LaTeXRenderer.jsx
import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Компонент для рендеринга текста с LaTeX формулами
 * 
 * Использует формат Obsidian: текст между $$ - это LaTeX
 * Примеры:
 * - $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$ - формула в отдельной строке (display mode)
 * - Уравнение: $$E = mc^2$$ здесь - инлайн формула (не реализовано, для инлайна используй $$...$$ в отдельной строке)
 */
export const LaTeXRenderer = ({ text, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!text) return null
    
    const parts = []
    const regex = /\$\$([\s\S]*?)\$\$/g
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
      
      // Добавляем LaTeX формулу
      const formula = match[1].trim()
      parts.push({
        type: 'latex',
        content: formula,
        key: `latex-${match.index}`
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
            <div key={part.key} className="latex-formula">
              <LaTeXFormula formula={part.content} />
            </div>
          )
        }
      })}
    </div>
  )
}

/**
 * Компонент для рендеринга одной LaTeX формулы
 */
const LaTeXFormula = ({ formula }) => {
  const elementRef = React.useRef(null)
  
  React.useEffect(() => {
    if (elementRef.current && formula) {
      try {
        const html = katex.renderToString(formula, {
          throwOnError: false,
          displayMode: true
        })
        elementRef.current.innerHTML = html
      } catch (error) {
        console.error('LaTeX rendering error:', error)
        elementRef.current.textContent = `[LaTeX Error: ${error.message}]`
      }
    }
  }, [formula])
  
  return <div ref={elementRef} className="katex-container" />
}

export default LaTeXRenderer
