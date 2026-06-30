// components/MarkdownRenderer.jsx
import React from 'react'
import { marked } from 'marked'
import Katex from 'katex'
import 'katex/dist/katex.min.css'

export const MarkdownRenderer = ({ text = '' }) => {
  // Настройка marked для поддержки LaTeX
  // Мы ищем $...$ и $$...$$ и заменяем их на отрендеренный KaTeX
  const renderContent = (content) => {
    if (!content) return ''

    // 1. Обработка блочного LaTeX $$...$$
    let processed = content.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
      try {
        return Katex.renderToString(formula, { displayMode: true, throwOnError: false })
      } catch (e) {
        return match
      }
    })

    // 2. Обработка инлайнового LaTeX $...$
    processed = processed.replace(/\$(.*?)\$/g, (match, formula) => {
      try {
        return Katex.renderToString(formula, { displayMode: false, throwOnError: false })
      } catch (e) {
        return match
      }
    })

    // 3. Рендерим Markdown
    return marked.parse(processed)
  }

  return (
    <div 
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: renderContent(text) }}
    />
  )
}

export default MarkdownRenderer
