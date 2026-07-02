import React, { useState, useEffect } from 'react'
import {
  getCourses, saveCourse, deleteCourse,
  getParagraphs, saveParagraph, deleteParagraph,
  getChapters, saveChapter, deleteChapter,
  getProblems,
} from '../utils/storage'
import Icon from '../components/Icon'
import Modal from '../components/common/Modal'
import MarkdownRenderer from '../components/MarkdownRenderer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateAccessKey = () =>
  Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10)

// ─── Chapter Editor ───────────────────────────────────────────────────────────

function ChapterEditor({ courseId, paragraphId, chapter, allProblems, onClose, onSaved }) {
  const [title, setTitle] = useState(chapter?.title || '')
  const [description, setDescription] = useState(chapter?.description || '')
  const [pages, setPages] = useState(chapter?.pages || [])
  const [attachedProblems, setAttachedProblems] = useState(chapter?.attachedProblems || [])
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [editingPage, setEditingPage] = useState(pages[0] || null)

  const syncPage = (idx, content) => {
    const updated = [...pages]
    updated[idx] = { ...updated[idx], content }
    setPages(updated)
    setEditingPage(updated[idx])
  }

  const addPage = () => {
    const newPage = { id: `page_${Date.now()}`, content: '' }
    const updated = [...pages, newPage]
    setPages(updated)
    setCurrentPageIdx(updated.length - 1)
    setEditingPage(newPage)
  }

  const removePage = (idx) => {
    const updated = pages.filter((_, i) => i !== idx)
    setPages(updated)
    const newIdx = Math.min(currentPageIdx, updated.length - 1)
    setCurrentPageIdx(newIdx < 0 ? 0 : newIdx)
    setEditingPage(updated[newIdx < 0 ? 0 : newIdx] || null)
  }

  const selectPage = (idx) => {
    setCurrentPageIdx(idx)
    setEditingPage(pages[idx])
  }

  const toggleProblem = (id) => {
    setAttachedProblems((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { alert('Введите заголовок главы'); return }
    await saveChapter(courseId, paragraphId, {
      ...(chapter || {}),
      title,
      description,
      pages,
      attachedProblems,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="chapter-editor">
      <div className="form-group">
        <label>Заголовок главы</label>
        <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Описание (кратко)</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* Pages */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <label>Страницы</label>
          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }} onClick={addPage}>
            <Icon name="plus" size={14} /> Добавить страницу
          </button>
        </div>

        {pages.length > 0 && (
          <div className="chapter-pages-tabs">
            {pages.map((p, idx) => (
              <div key={p.id} className={`chapter-page-tab ${currentPageIdx === idx ? 'active' : ''}`}>
                <button onClick={() => selectPage(idx)}>{idx + 1}</button>
                {pages.length > 1 && (
                  <button className="page-tab-remove" onClick={() => removePage(idx)}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {editingPage ? (
          <div className="form-grid" style={{ marginTop: '0.75rem' }}>
            <textarea
              className="form-input"
              rows={16}
              value={editingPage.content || ''}
              onChange={(e) => syncPage(currentPageIdx, e.target.value)}
            />
            <div className="preview-box">
              <label className="preview-label">Предпросмотр</label>
              <MarkdownRenderer text={editingPage.content || ''} />
            </div>
          </div>
        ) : (
          <p className="hint-text">Добавьте хотя бы одну страницу</p>
        )}
      </div>

      {/* Attached problems */}
      <div className="form-group">
        <label>Задачи для закрепления (отображаются на последней странице)</label>
        <div className="tags-selector" style={{ marginTop: '0.5rem' }}>
          {allProblems.map((p) => (
            <button
              key={p.id}
              className={`tag-chip ${attachedProblems.includes(p.id) ? 'active' : ''}`}
              onClick={() => toggleProblem(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
      </div>
    </div>
  )
}

// ─── Paragraph Editor ─────────────────────────────────────────────────────────

function ParagraphEditor({ courseId, paragraph, allProblems, onClose, onSaved }) {
  const [title, setTitle] = useState(paragraph?.title || '')
  const [description, setDescription] = useState(paragraph?.description || '')
  const [content, setContent] = useState(paragraph?.content || '')
  const [chapters, setChapters] = useState([])
  const [showChapterForm, setShowChapterForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)

  useEffect(() => {
    if (paragraph?.id) {
      getChapters(courseId, paragraph.id).then(setChapters)
    }
  }, [courseId, paragraph])

  const loadChapters = async () => {
    if (paragraph?.id) {
      const chaps = await getChapters(courseId, paragraph.id)
      setChapters(chaps)
    }
  }

  const handleSaveParagraph = async () => {
    if (!title.trim()) { alert('Введите заголовок параграфа'); return }
    await saveParagraph(courseId, { ...(paragraph || {}), title, description, content, order: paragraph?.order ?? Date.now() })
    onSaved()
    onClose()
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!paragraph?.id) return
    if (confirm('Удалить главу?')) {
      await deleteChapter(courseId, paragraph.id, chapterId)
      await loadChapters()
    }
  }

  return (
    <div className="paragraph-editor">
      <div className="form-group">
        <label>Заголовок параграфа</label>
        <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Краткое описание</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Содержимое страницы параграфа</label>
        <div className="form-grid">
          <textarea
            className="form-input"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="preview-box">
            <label className="preview-label">Предпросмотр</label>
            <MarkdownRenderer text={content} />
          </div>
        </div>
      </div>

      {paragraph?.id && (
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label>Главы</label>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }}
              onClick={() => { setEditingChapter(null); setShowChapterForm(true) }}
            >
              <Icon name="plus" size={14} /> Добавить главу
            </button>
          </div>
          <div className="edu-items-list">
            {chapters.map((chap) => (
              <div key={chap.id} className="edu-item">
                <span>{chap.title}</span>
                <div className="p-actions">
                  <button className="btn-icon" onClick={() => { setEditingChapter(chap); setShowChapterForm(true) }}>
                    <Icon name="pencil" size={14} />
                  </button>
                  <button className="btn-icon text-red" onClick={() => handleDeleteChapter(chap.id)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSaveParagraph}>Сохранить параграф</button>
      </div>

      <Modal
        isOpen={showChapterForm}
        onClose={() => setShowChapterForm(false)}
        title={editingChapter ? 'Редактировать главу' : 'Новая глава'}
        size="large"
      >
        <ChapterEditor
          courseId={courseId}
          paragraphId={paragraph?.id}
          chapter={editingChapter}
          allProblems={allProblems}
          onClose={() => setShowChapterForm(false)}
          onSaved={loadChapters}
        />
      </Modal>
    </div>
  )
}

// ─── Course Editor ────────────────────────────────────────────────────────────

function CourseEditor({ course, allProblems, onClose, onSaved }) {
  const [title, setTitle] = useState(course?.title || '')
  const [description, setDescription] = useState(course?.description || '')
  const [content, setContent] = useState(course?.content || '')
  const [isPrivate, setIsPrivate] = useState(course?.isPrivate || false)
  const [accessKeys, setAccessKeys] = useState(course?.accessKeys || [])
  const [paragraphs, setParagraphs] = useState([])
  const [showParagraphForm, setShowParagraphForm] = useState(false)
  const [editingParagraph, setEditingParagraph] = useState(null)

  useEffect(() => {
    if (course?.id) {
      getParagraphs(course.id).then(setParagraphs)
    }
  }, [course])

  const loadParagraphs = async () => {
    if (course?.id) {
      const paras = await getParagraphs(course.id)
      setParagraphs(paras)
    }
  }

  const handleSaveCourse = async () => {
    if (!title.trim()) { alert('Введите название курса'); return }
    await saveCourse({ ...(course || {}), title, description, content, isPrivate, accessKeys })
    onSaved()
    onClose()
  }

  const addAccessKey = () => {
    setAccessKeys((prev) => [...prev, generateAccessKey()])
  }

  const removeAccessKey = (key) => {
    setAccessKeys((prev) => prev.filter((k) => k !== key))
  }

  const copyKey = (key) => {
    const url = `${window.location.origin}/education/access/${course?.id}/${key}`
    navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!'))
  }

  const handleDeleteParagraph = async (paraId) => {
    if (!course?.id) return
    if (confirm('Удалить параграф?')) {
      await deleteParagraph(course.id, paraId)
      await loadParagraphs()
    }
  }

  return (
    <div className="course-editor">
      <div className="form-group">
        <label>Название курса</label>
        <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Краткое описание</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Вводный текст курса</label>
        <div className="form-grid">
          <textarea
            className="form-input"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="preview-box">
            <label className="preview-label">Предпросмотр</label>
            <MarkdownRenderer text={content} />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-label" style={{ fontWeight: 600 }}>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="lock" size={16} />
            Приватный курс
          </span>
        </label>
      </div>

      {isPrivate && course?.id && (
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label>Ключи доступа</label>
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }} onClick={addAccessKey}>
              <Icon name="plus" size={14} /> Новый ключ
            </button>
          </div>
          <div className="access-keys-list">
            {accessKeys.map((key) => (
              <div key={key} className="access-key-item">
                <code className="access-key-code">{key}</code>
                <div className="p-actions">
                  <button className="btn-icon" title="Скопировать ссылку" onClick={() => copyKey(key)}>
                    <Icon name="link" size={14} />
                  </button>
                  <button className="btn-icon text-red" title="Удалить ключ" onClick={() => removeAccessKey(key)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
            {accessKeys.length === 0 && (
              <p className="hint-text">Нет ключей доступа. Добавьте хотя бы один.</p>
            )}
          </div>
        </div>
      )}

      {course?.id && (
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label>Параграфы</label>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }}
              onClick={() => { setEditingParagraph(null); setShowParagraphForm(true) }}
            >
              <Icon name="plus" size={14} /> Добавить параграф
            </button>
          </div>
          <div className="edu-items-list">
            {paragraphs.map((para) => (
              <div key={para.id} className="edu-item">
                <span>{para.title}</span>
                <div className="p-actions">
                  <button className="btn-icon" onClick={() => { setEditingParagraph(para); setShowParagraphForm(true) }}>
                    <Icon name="pencil" size={14} />
                  </button>
                  <button className="btn-icon text-red" onClick={() => handleDeleteParagraph(para.id)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSaveCourse}>Сохранить курс</button>
      </div>

      {course?.id && (
        <Modal
          isOpen={showParagraphForm}
          onClose={() => setShowParagraphForm(false)}
          title={editingParagraph ? 'Редактировать параграф' : 'Новый параграф'}
          size="large"
        >
          <ParagraphEditor
            courseId={course.id}
            paragraph={editingParagraph}
            allProblems={allProblems}
            onClose={() => setShowParagraphForm(false)}
            onSaved={loadParagraphs}
          />
        </Modal>
      )}
    </div>
  )
}

// ─── EduAdminPage ─────────────────────────────────────────────────────────────

function EduAdminPage({ onLogout }) {
  const [courses, setCourses] = useState([])
  const [allProblems, setAllProblems] = useState([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  const loadData = async () => {
    const [c, p] = await Promise.all([getCourses(), getProblems()])
    setCourses(c)
    setAllProblems(p)
  }

  useEffect(() => { loadData() }, [])

  const handleDeleteCourse = async (id) => {
    if (confirm('Удалить курс?')) {
      await deleteCourse(id)
      await loadData()
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Управление учебником</h1>
        <div className="admin-actions-group">
          <div className="admin-actions-main">
            <button
              className="btn btn-primary"
              onClick={() => { setEditingCourse(null); setShowCourseForm(true) }}
            >
              <Icon name="plus" size={16} /> Новый курс
            </button>
          </div>
          <button className="btn-icon logout-btn-icon" onClick={onLogout} title="Выйти">
            <Icon name="logout" />
          </button>
        </div>
      </div>

      <div className="admin-problems-list">
        {courses.length === 0 && (
          <div className="edu-empty" style={{ padding: '2rem', textAlign: 'center' }}>
            <Icon name="book" size={40} />
            <p>Курсы не созданы</p>
          </div>
        )}
        {courses.map((c) => (
          <div key={c.id} className="admin-problem-item">
            <div className="p-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.title}
                <span className={`course-badge ${c.isPrivate ? 'private' : 'public'}`}>
                  <Icon name={c.isPrivate ? 'lock' : 'globe'} size={12} />
                  {c.isPrivate ? 'Приватный' : 'Публичный'}
                </span>
              </h3>
              {c.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>{c.description}</p>}
            </div>
            <div className="p-actions">
              <button
                className="btn-icon"
                title="Редактировать"
                onClick={() => { setEditingCourse(c); setShowCourseForm(true) }}
              >
                <Icon name="pencil" />
              </button>
              <button className="btn-icon text-red" title="Удалить" onClick={() => handleDeleteCourse(c.id)}>
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        title={editingCourse ? 'Редактировать курс' : 'Новый курс'}
        size="large"
      >
        <CourseEditor
          course={editingCourse}
          allProblems={allProblems}
          onClose={() => setShowCourseForm(false)}
          onSaved={async () => { await loadData(); setShowCourseForm(false) }}
        />
      </Modal>
    </div>
  )
}

export default EduAdminPage
