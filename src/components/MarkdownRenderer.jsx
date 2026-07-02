// components/MarkdownRenderer.jsx
import React from 'react'
import { marked } from 'marked'
import Katex from 'katex'
import hljs from 'highlight.js'
import 'katex/dist/katex.min.css'

const LANG_ALIASES = {
  py: 'python',
  'c++': 'cpp',
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  rb: 'ruby',
  rs: 'rust',
}

const renderer = new marked.Renderer()

renderer.code = (code, lang) => {
  let normalizedLang = lang ? lang.toLowerCase().trim() : null
  normalizedLang = LANG_ALIASES[normalizedLang] || normalizedLang

  let highlighted = code
  if (normalizedLang && hljs.getLanguage(normalizedLang)) {
    try {
      highlighted = hljs.highlight(code, { language: normalizedLang, ignoreIllegals: true }).value
    } catch (_) {
      highlighted = hljs.highlightAuto(code).value
    }
  } else {
    highlighted = hljs.highlightAuto(code).value
  }

  const langClass = normalizedLang ? ` language-${normalizedLang}` : ''
  return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`
}

marked.setOptions({ breaks: true, renderer })

export const MarkdownRenderer = ({ text = '' }) => {
  const renderContent = (content) => {
    const safeContent = String(content || '')
    if (!safeContent) return ''

    // 1. Block LaTeX $$...$$
    let processed = safeContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        return Katex.renderToString(formula, { displayMode: true, throwOnError: false })
      } catch (_) {
        return match
      }
    })

    // 2. Inline LaTeX $...$
    processed = processed.replace(/\$([^\n$]+?)\$/g, (match, formula) => {
      try {
        return Katex.renderToString(formula, { displayMode: false, throwOnError: false })
      } catch (_) {
        return match
      }
    })

    // 3. Render Markdown
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
