// components/MarkdownRenderer.jsx
import React from 'react'
import { marked } from 'marked'
import Katex from 'katex'
import hljs from 'highlight.js'
import 'katex/dist/katex.min.css'

export const MarkdownRenderer = ({ text = '' }) => {
  // Настройка marked для поддержки LaTeX и подсветки синтаксиса
  const renderContent = (content) => {
    // Ensure content is a string
    const safeContent = String(content || '');
    if (!safeContent) return ''

    // Настройка marked для подсветки синтаксиса
    marked.setOptions({
      async: false,
      breaks: true,
      highlight: (code, lang) => {
        // Нормализуем название языка
        let normalizedLang = lang ? lang.toLowerCase().trim() : null
        if (normalizedLang === 'py') normalizedLang = 'python'
        if (normalizedLang === 'c++' || normalizedLang === 'cpp') normalizedLang = 'cpp'
        if (normalizedLang === 'js' || normalizedLang === 'javascript') normalizedLang = 'javascript'
        
        if (normalizedLang && hljs.getLanguage(normalizedLang)) {
          try {
            return hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true }).value
          } catch (e) {
            return code
          }
        }
        // Если язык не указан или не поддерживается, возвращаем код как есть
        return code
      }
    })

    // 1. Обработка блочного LaTeX $$...$$
    let processed = safeContent.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
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
