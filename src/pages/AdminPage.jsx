import React, { useState, useEffect, useRef } from 'react'
import {
  getProblems, saveProblem, deleteProblem, getTags,
  exportProblems, exportSingleProblem, importProblemsResolved,
} from '../utils/storage'
import { loginAdmin, logoutAdmin, isAdminLoggedIn, changeAdminPassword, onAuthUpdate } from '../utils/auth'
import Icon from '../components/Icon'
import Modal from '../components/common/Modal'
import { TagManager } from '../components/TagManager'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ImportConflictModal from '../components/admin/ImportConflictModal'
import EduAdminPage from './EduAdminPage'

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [passwordInput, setPasswordInput] = useState('')

  const handleLogin = async () => {
    try {
      await loginAdmin('admin@quadrotez.com', passwordInput)
    } catch (e) {
      alert('Ошибка входа: ' + e.message)
    }
  }

  return (
    <div className="container admin-login">
      <div className="login-card">
        <h2>Вход в панель управления</h2>
        <input
          type="password"
          placeholder="Пароль"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="form-input"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button className="btn btn-primary" onClick={handleLogin}>Войти</button>
      </div>
    </div>
  )
}

// ─── Problem Form ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  description: '',
  inputFormat: '',
  outputFormat: '',
  initialCode: '',
  solutions: {},
  tags: [],
  tests: [],
  hidden: false,
}

function ProblemForm({ editingId, initialData, availableTags, onSave, onCancel, onExport }) {
  const [formData, setFormData] = useState(initialData || EMPTY_FORM)
  const [newTestInput, setNewTestInput] = useState('')
  const [newTestOutput, setNewTestOutput] = useState('')
  const [isNewTestHidden, setIsNewTestHidden] = useState(false)
  const [editingTestId, setEditingTestId] = useState(null)
  const [selectedSolutionLanguage, setSelectedSolutionLanguage] = useState('python')
  const availableSolutionLanguages = ['python', 'cpp']
  const fileInputRef = useRef(null)

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }))

  const toggleTag = (tagName) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName],
    }))
  }

  const addTest = () => {
    if (!newTestInput.trim()) return
    if (editingTestId) {
      setFormData((prev) => ({
        ...prev,
        tests: prev.tests.map((t) =>
          t.id === editingTestId
            ? { ...t, input: newTestInput, output: newTestOutput, isHidden: isNewTestHidden }
            : t
        ),
      }))
      setEditingTestId(null)
    } else {
      const newTest = {
        id: `test_${Date.now()}`,
        input: newTestInput,
        output: newTestOutput,
        isHidden: isNewTestHidden,
      }
      setFormData((prev) => ({ ...prev, tests: [...prev.tests, newTest] }))
    }
    setNewTestInput('')
    setNewTestOutput('')
    setIsNewTestHidden(false)
  }

  const editTest = (test) => {
    setEditingTestId(test.id)
    setNewTestInput(test.input)
    setNewTestOutput(test.output)
    setIsNewTestHidden(test.isHidden)
  }

  const removeTest = (id) => {
    setFormData((prev) => ({ ...prev, tests: prev.tests.filter((t) => t.id !== id) }))
  }

  const handleImportFromFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const imported = Array.isArray(parsed) ? parsed[0] : parsed
        if (!imported || !imported.title) throw new Error('Неверный формат')
        setFormData({
          title: imported.title || '',
          description: imported.description || '',
          inputFormat: imported.inputFormat || '',
          outputFormat: imported.outputFormat || '',
          initialCode: imported.initialCode || '',
          solutions: imported.solutions || {},
          tags: imported.tags || [],
          tests: imported.tests || [],
          hidden: imported.hidden || false,
        })
      } catch {
        alert('Ошибка: неверный формат файла задачи')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    try {
      const problemToSave = { ...formData }
      if (editingId) problemToSave.id = editingId
      const filteredSolutions = {}
      for (const [lang, code] of Object.entries(problemToSave.solutions || {})) {
        if (code && code.trim()) filteredSolutions[lang] = code
      }
      problemToSave.solutions = filteredSolutions
      await saveProblem(problemToSave)
      onSave()
    } catch {
      alert('Ошибка при сохранении')
    }
  }

  return (
    <div className="problem-form">
      {/* Title row with import/export */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <label>Заголовок</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFromFile}
            />
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }}
              onClick={() => fileInputRef.current?.click()}
              title="Импортировать задачу из JSON"
            >
              <Icon name="upload" size={14} /> Импортировать
            </button>
            {editingId && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minWidth: 'auto' }}
                onClick={() => onExport(formData)}
                title="Экспортировать задачу в JSON"
              >
                <Icon name="download" size={14} /> Экспортировать
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => set('title', e.target.value)}
          className="form-input"
        />
      </div>

      {/* Hidden flag */}
      <div className="form-group">
        <label className="checkbox-label" style={{ fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={formData.hidden || false}
            onChange={(e) => set('hidden', e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="eyeSlash" size={16} />
            Скрытая задача (не отображается в списке, доступна только по ссылке)
          </span>
        </label>
      </div>

      {/* Tags */}
      <div className="form-group">
        <label>Теги</label>
        <div className="tags-selector">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${formData.tags.includes(tag.name) ? 'active' : ''}`}
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Описание</label>
        <div className="form-grid">
          <textarea
            value={formData.description}
            onChange={(e) => set('description', e.target.value)}
            className="form-input"
            rows={12}
          />
          <div className="preview-box">
            <label className="preview-label">Предпросмотр</label>
            <MarkdownRenderer text={formData.description} />
          </div>
        </div>
      </div>

      {/* Input Format */}
      <div className="form-group">
        <label>Формат ввода</label>
        <div className="form-grid">
          <textarea
            value={formData.inputFormat || ''}
            onChange={(e) => set('inputFormat', e.target.value)}
            className="form-input"
            rows={6}
          />
          <div className="preview-box">
            <label className="preview-label">Предпросмотр</label>
            <MarkdownRenderer text={formData.inputFormat || ''} />
          </div>
        </div>
      </div>

      {/* Output Format */}
      <div className="form-group">
        <label>Формат вывода</label>
        <div className="form-grid">
          <textarea
            value={formData.outputFormat || ''}
            onChange={(e) => set('outputFormat', e.target.value)}
            className="form-input"
            rows={6}
          />
          <div className="preview-box">
            <label className="preview-label">Предпросмотр</label>
            <MarkdownRenderer text={formData.outputFormat || ''} />
          </div>
        </div>
      </div>

      {/* Solutions */}
      <div className="form-group">
        <label>Решения (опционально)</label>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {availableSolutionLanguages.map((lang) => (
              <button
                key={lang}
                className={`tag-chip ${selectedSolutionLanguage === lang ? 'active' : ''}`}
                onClick={() => setSelectedSolutionLanguage(lang)}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
                {formData.solutions?.[lang] && ' ✓'}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <textarea
              value={formData.solutions?.[selectedSolutionLanguage] || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  solutions: { ...prev.solutions, [selectedSolutionLanguage]: e.target.value },
                }))
              }
              className="form-input"
              rows={12}
            />
            <div className="preview-box">
              <label className="preview-label">Предпросмотр</label>
              <MarkdownRenderer text={formData.solutions?.[selectedSolutionLanguage] || ''} />
            </div>
          </div>
        </div>
      </div>

      {/* Tests */}
      <div className="form-group">
        <label>Тесты</label>
        <div className="tests-list" style={{ marginBottom: '1rem' }}>
          {formData.tests.map((t, idx) => (
            <div
              key={t.id}
              className={`test-item ${t.isHidden ? 'hidden' : ''} ${editingTestId === t.id ? 'editing' : ''}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Тест #{idx + 1}
                  {t.isHidden && <Icon name="eyeSlash" size={14} />}
                </span>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                  In: {t.input.substring(0, 30)}... | Out: {t.output.substring(0, 30)}...
                </div>
              </div>
              <div className="p-actions">
                <button onClick={() => editTest(t)} className="btn-icon" title="Редактировать">
                  <Icon name="pencil" size={14} />
                </button>
                <button onClick={() => removeTest(t.id)} className="btn-icon text-red" title="Удалить">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="add-test-form">
          <div style={{ gridColumn: 'span 2', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {editingTestId ? 'Редактирование теста' : 'Добавить новый тест'}
          </div>
          <textarea
            placeholder="Ввод"
            value={newTestInput}
            onChange={(e) => setNewTestInput(e.target.value)}
            className="form-input"
          />
          <textarea
            placeholder="Ожидаемый вывод"
            value={newTestOutput}
            onChange={(e) => setNewTestOutput(e.target.value)}
            className="form-input"
          />
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isNewTestHidden}
                onChange={(e) => setIsNewTestHidden(e.target.checked)}
              />
              Скрытый тест
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {editingTestId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setEditingTestId(null); setNewTestInput(''); setNewTestOutput(''); setIsNewTestHidden(false) }}
                >
                  Отмена
                </button>
              )}
              <button className="btn btn-primary" onClick={addTest}>
                {editingTestId ? 'Обновить тест' : 'Добавить тест'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onCancel}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
      </div>
    </div>
  )
}

// ─── Problems Admin Tab ───────────────────────────────────────────────────────

function ProblemsAdminTab({ onLogout }) {
  const [problems, setProblems] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // Import/Export state
  const [showImportTab, setShowImportTab] = useState(false)
  const [importText, setImportText] = useState('')
  const [importConflicts, setImportConflicts] = useState([])
  const [pendingImport, setPendingImport] = useState([])
  const [showConflictModal, setShowConflictModal] = useState(false)
  const importFileRef = useRef(null)

  const loadData = async () => {
    const [probs, tags] = await Promise.all([getProblems(), getTags()])
    setProblems(probs)
    setAvailableTags(tags)
  }

  useEffect(() => { loadData() }, [])

  const handleDeleteProblem = async (id) => {
    if (confirm('Удалить задачу?')) {
      await deleteProblem(id)
      await loadData()
    }
  }

  const handleExportAll = async () => {
    try {
      const json = await exportProblems()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `problems_export_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Ошибка экспорта: ' + e.message)
    }
  }

  const handleExportSingle = (problem) => {
    const json = exportSingleProblem(problem)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `problem_${problem.id || 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportText(ev.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleStartImport = async () => {
    try {
      const parsed = JSON.parse(importText)
      const incoming = Array.isArray(parsed) ? parsed : [parsed]
      if (!incoming.length) throw new Error('Пустой массив задач')

      const conflicts = incoming.filter((p) =>
        problems.some((e) => e.title?.toLowerCase() === p.title?.toLowerCase())
      )

      if (conflicts.length > 0) {
        setImportConflicts(conflicts)
        setPendingImport(incoming)
        setShowConflictModal(true)
      } else {
        await importProblemsResolved(incoming, problems, {})
        await loadData()
        setImportText('')
        setShowImportTab(false)
        alert('Импорт завершён успешно')
      }
    } catch (e) {
      alert('Ошибка импорта: ' + e.message)
    }
  }

  const handleConflictResolve = async (resolutions) => {
    try {
      const { imported, skipped } = await importProblemsResolved(pendingImport, problems, resolutions)
      setShowConflictModal(false)
      setPendingImport([])
      setImportConflicts([])
      await loadData()
      setImportText('')
      setShowImportTab(false)
      alert(`Импорт завершён: добавлено ${imported}, пропущено ${skipped}`)
    } catch (e) {
      alert('Ошибка при импорте: ' + e.message)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword) return
    try {
      await changeAdminPassword(newPassword)
      alert('Пароль успешно изменён')
      setNewPassword('')
    } catch (e) {
      alert('Ошибка: ' + e.message)
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Управление задачами</h1>
        <div className="admin-actions-group">
          <div className="admin-actions-main">
            <button className="btn btn-secondary" onClick={() => setShowTagManager(true)}>
              <Icon name="tag" size={16} /> Теги
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(true)}>
              <Icon name="pencil" size={16} /> Сменить пароль
            </button>
            <button className="btn btn-secondary" onClick={() => setShowImportTab(!showImportTab)}>
              <Icon name="upload" size={16} /> Импорт / Экспорт
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingId(null); setEditingData(EMPTY_FORM); setShowForm(true) }}
            >
              <Icon name="plus" size={16} /> Новая задача
            </button>
          </div>
          <button className="btn-icon logout-btn-icon" onClick={onLogout} title="Выйти">
            <Icon name="logout" />
          </button>
        </div>
      </div>

      {/* Import/Export Panel */}
      {showImportTab && (
        <div className="import-export-panel">
          <div className="import-export-header">
            <h3>Импорт / Экспорт задач</h3>
          </div>
          <div className="import-export-body">
            <div className="import-section">
              <h4>Импорт</h4>
              <p className="hint-text">Вставьте JSON или загрузите файл. Поддерживается массив задач или одна задача.</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input ref={importFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFileSelect} />
                <button className="btn btn-secondary" onClick={() => importFileRef.current?.click()}>
                  <Icon name="upload" size={16} /> Загрузить файл
                </button>
              </div>
              <textarea
                className="form-input"
                rows={8}
                placeholder='[{"title": "...", "description": "...", ...}]'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleStartImport} disabled={!importText.trim()}>
                  <Icon name="upload" size={16} /> Начать импорт
                </button>
              </div>
            </div>
            <div className="export-section">
              <h4>Экспорт</h4>
              <p className="hint-text">Скачать все задачи в формате JSON.</p>
              <button className="btn btn-secondary" onClick={handleExportAll}>
                <Icon name="download" size={16} /> Экспортировать все задачи
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Смена пароля администратора">
        <div className="password-form-modal">
          <div className="form-group">
            <label>Новый пароль</label>
            <input
              type="password"
              placeholder="Введите новый пароль"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={async () => { await handleChangePassword(); setShowPasswordModal(false) }}>
              Обновить пароль
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showTagManager} onClose={() => { setShowTagManager(false); loadData() }} title="Управление тегами" size="large">
        <TagManager onUpdate={loadData} />
      </Modal>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Редактировать задачу' : 'Новая задача'}
        size="large"
      >
        <ProblemForm
          editingId={editingId}
          initialData={editingData}
          availableTags={availableTags}
          onSave={async () => { await loadData(); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
          onExport={handleExportSingle}
        />
      </Modal>

      {showConflictModal && (
        <ImportConflictModal
          isOpen={showConflictModal}
          conflicts={importConflicts}
          onResolve={handleConflictResolve}
          onCancel={() => { setShowConflictModal(false); setPendingImport([]); setImportConflicts([]) }}
        />
      )}

      {/* Problems List */}
      <div className="admin-problems-list">
        {problems.map((p) => (
          <div key={p.id} className="admin-problem-item">
            <div className="p-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {p.title}
                {p.hidden && (
                  <span className="hidden-badge" title="Скрытая задача">
                    <Icon name="eyeSlash" size={14} />
                  </span>
                )}
              </h3>
              <div className="p-tags">
                {p.tags?.map((t) => <span key={t} className="mini-tag" style={{ marginRight: '5px' }}>{t}</span>)}
              </div>
            </div>
            <div className="p-actions">
              <button
                onClick={() => { setEditingId(p.id); setEditingData({ ...p, tags: p.tags || [], solutions: p.solutions || {} }); setShowForm(true) }}
                className="btn-icon"
                title="Редактировать"
              >
                <Icon name="pencil" />
              </button>
              <button onClick={() => handleExportSingle(p)} className="btn-icon" title="Экспортировать">
                <Icon name="download" />
              </button>
              <button onClick={() => handleDeleteProblem(p.id)} className="btn-icon text-red" title="Удалить">
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Page Root ──────────────────────────────────────────────────────────

function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn())
  const [activeSection, setActiveSection] = useState('problems')

  useEffect(() => {
    const unsubscribe = onAuthUpdate((user) => setIsLoggedIn(!!user))
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await logoutAdmin()
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) return <LoginScreen />

  return (
    <div className="container admin-page">
      <div className="admin-section-tabs">
        <button
          className={`admin-section-tab ${activeSection === 'problems' ? 'active' : ''}`}
          onClick={() => setActiveSection('problems')}
        >
          <Icon name="document" size={16} /> Задачи
        </button>
        <button
          className={`admin-section-tab ${activeSection === 'edu' ? 'active' : ''}`}
          onClick={() => setActiveSection('edu')}
        >
          <Icon name="book" size={16} /> Учебник
        </button>
      </div>

      {activeSection === 'problems' && <ProblemsAdminTab onLogout={handleLogout} />}
      {activeSection === 'edu' && <EduAdminPage onLogout={handleLogout} />}
    </div>
  )
}

export default AdminPage
