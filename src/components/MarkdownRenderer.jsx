// components/MarkdownRenderer.jsx
import React from 'react'
import { marked } from 'marked'
import Katex from 'katex'
import hljs from 'highlight.js'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/atom-one-dark.css'

export const MarkdownRenderer = ({ text = '' }) => {
  // Настройка marked для поддержки LaTeX и подсветки синтаксиса
  const renderContent = (content) => {
    if (!content) return ''

    // Настройка marked для подсветки синтаксиса
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          } catch (e) {
            return code
          }
        }
        return code
      }
    })

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
