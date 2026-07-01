import React, { useState, useEffect } from 'react'
import { getProblems, saveProblem, deleteProblem, getTags } from '../utils/storage'
import { loginAdmin, logoutAdmin, isAdminLoggedIn, changeAdminPassword, onAuthUpdate } from '../utils/auth'
import Icon from '../components/Icon'
import Modal from '../components/common/Modal'
import { TagManager } from '../components/TagManager'
import CodeEditor from '../components/CodeEditor'
import MarkdownRenderer from '../components/MarkdownRenderer'

function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn())

  useEffect(() => {
    const unsubscribe = onAuthUpdate((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])
  const [passwordInput, setPasswordInput] = useState('')
  const [problems, setProblems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [availableTags, setAvailableTags] = useState([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    initialCode: '',
    solutions: {},
    tags: [],
    tests: []
  })

  const [newTestInput, setNewTestInput] = useState('')
  const [newTestOutput, setNewTestOutput] = useState('')
  const [isNewTestHidden, setIsNewTestHidden] = useState(false)
  const [editingTestId, setEditingTestId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [selectedSolutionLanguage, setSelectedSolutionLanguage] = useState('python')
  const availableSolutionLanguages = ['python', 'cpp']

  useEffect(() => {
    if (isLoggedIn) {
      loadData()
    }
  }, [isLoggedIn])

  const loadData = async () => {
    const [probs, tags] = await Promise.all([getProblems(), getTags()])
    setProblems(probs)
    setAvailableTags(tags)
  }

  const handleLogin = async () => {
    try {
      await loginAdmin('admin@quadrotez.com', passwordInput)
      // Состояние обновится через onAuthUpdate
    } catch (e) {
      alert('Ошибка входа: ' + e.message)
    }
  }

  const handleSaveProblem = async () => {
    try {
      const problemToSave = { ...formData };
      if (editingId) {
        problemToSave.id = editingId;
      }
      
      // Filter out empty solutions
      const filteredSolutions = {};
      for (const [lang, code] of Object.entries(problemToSave.solutions || {})) {
        if (code && code.trim()) {
          filteredSolutions[lang] = code;
        }
      }
      problemToSave.solutions = filteredSolutions;
      
      await saveProblem(problemToSave)
      await loadData()
      setShowForm(false)
    } catch (error) {
      alert('Ошибка при сохранении')
    }
  }

  const handleDeleteProblem = async (id) => {
    if (confirm('Удалить задачу?')) {
      await deleteProblem(id)
      await loadData()
    }
  }

  const addTest = () => {
    if (!newTestInput.trim()) return
    
    if (editingTestId) {
      setFormData({
        ...formData,
        tests: formData.tests.map(t => t.id === editingTestId ? {
          ...t,
          input: newTestInput,
          output: newTestOutput,
          isHidden: isNewTestHidden
        } : t)
      })
      setEditingTestId(null)
    } else {
      const newTest = {
        id: `test_${Date.now()}`,
        input: newTestInput,
        output: newTestOutput,
        isHidden: isNewTestHidden
      }
      setFormData({ ...formData, tests: [...formData.tests, newTest] })
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
    setFormData({ ...formData, tests: formData.tests.filter(t => t.id !== id) })
  }

  const toggleFormTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName) 
        ? prev.tags.filter(t => t !== tagName) 
        : [...prev.tags, tagName]
    }))
  }

  const handleChangePassword = async () => {
    if (!newPassword) return
    try {
      await changeAdminPassword(newPassword)
      alert('Пароль успешно изменен')
      setNewPassword('')
    } catch (e) {
      alert('Ошибка: ' + e.message)
    }
  }

  const handleLogout = async () => {
    await logoutAdmin()
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return (
      <div className="container admin-login">
        <div className="login-card">
          <h2>Вход в панель управления</h2>
          <input 
            type="password" 
            placeholder="Пароль" 
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)} 
            className="form-input"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn btn-primary" onClick={handleLogin}>Войти</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container admin-page">
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
            <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({ title: '', description: '', initialCode: '', solutions: {}, tags: [], tests: [] }); setShowForm(true); }}>
              <Icon name="plus" size={16} /> Новая задача
            </button>
          </div>
          <button className="btn-icon logout-btn-icon" onClick={handleLogout} title="Выйти">
            <Icon name="logout" />
          </button>
        </div>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Смена пароля администратора">
        <div className="password-form-modal">
          <div className="form-group">
            <label>Новый пароль</label>
            <input 
              type="password" 
              placeholder="Введите новый пароль" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="form-input"
            />
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={async () => { await handleChangePassword(); setShowPasswordModal(false); }}>Обновить пароль</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showTagManager} onClose={() => { setShowTagManager(false); loadData(); }} title="Управление тегами" size="large">
        <TagManager onUpdate={loadData} />
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Редактировать задачу' : 'Новая задача'} size="large">
        <div className="problem-form">
          <div className="form-group">
            <label>Заголовок</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="form-input" />
          </div>
          
          <div className="form-group">
            <label>Теги</label>
            <div className="tags-selector">
              {availableTags.map(tag => (
                <button 
                  key={tag.id} 
                  className={`tag-chip ${formData.tags.includes(tag.name) ? 'active' : ''}`}
                  onClick={() => toggleFormTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Описание (Markdown + LaTeX)</label>
            <div className="form-grid">
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                className="form-input" 
                rows={12} 
              />
              <div className="preview-box">
                <label className="preview-label">Предпросмотр</label>
                <MarkdownRenderer text={formData.description} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Решения (опционально, Markdown + LaTeX)</label>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {availableSolutionLanguages.map(lang => (
                  <button
                    key={lang}
                    className={`tag-chip ${selectedSolutionLanguage === lang ? 'active' : ''}`}
                    onClick={() => setSelectedSolutionLanguage(lang)}
                    style={{ cursor: 'pointer' }}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    {formData.solutions?.[lang] && ' ✓'}
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <textarea
                  value={formData.solutions?.[selectedSolutionLanguage] || ''}
                  onChange={e => setFormData({ ...formData, solutions: { ...formData.solutions, [selectedSolutionLanguage]: e.target.value } })}
                  className="form-input"
                  rows={12}
                  placeholder=""
                />
                <div className="preview-box">
                  <label className="preview-label">Предпросмотр</label>
                  <MarkdownRenderer text={formData.solutions?.[selectedSolutionLanguage] || ''} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Тесты</label>
            <div className="tests-list" style={{ marginBottom: '1rem' }}>
              {formData.tests.map((t, idx) => (
                <div key={t.id} className={`test-item ${editingTestId === t.id ? 'editing' : ''}`} style={{ padding: '0.8rem', border: editingTestId === t.id ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Тест #{idx + 1} {t.isHidden && <Icon name="eyeSlash" size={14} />}</span>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                      In: {t.input.substring(0, 30)}... | Out: {t.output.substring(0, 30)}...
                    </div>
                  </div>
                  <div className="p-actions">
                    <button onClick={() => editTest(t)} className="btn-icon" title="Редактировать"><Icon name="pencil" size={14} /></button>
                    <button onClick={() => removeTest(t.id)} className="btn-icon text-red" title="Удалить"><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="add-test-form">
              <div style={{ gridColumn: 'span 2', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {editingTestId ? 'Редактирование теста' : 'Добавить новый тест'}
              </div>
              <textarea placeholder="Ввод" value={newTestInput} onChange={e => setNewTestInput(e.target.value)} className="form-input" />
              <textarea placeholder="Ожидаемый вывод" value={newTestOutput} onChange={e => setNewTestOutput(e.target.value)} className="form-input" />
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={isNewTestHidden} onChange={e => setIsNewTestHidden(e.target.checked)} /> Скрытый тест
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingTestId && (
                    <button className="btn btn-secondary" onClick={() => { setEditingTestId(null); setNewTestInput(''); setNewTestOutput(''); setIsNewTestHidden(false); }}>Отмена</button>
                  )}
                  <button className="btn btn-primary" onClick={addTest}>
                    {editingTestId ? 'Обновить тест' : 'Добавить тест'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleSaveProblem}>Сохранить</button>
          </div>
        </div>
      </Modal>

      <div className="admin-problems-list">
        {problems.map(p => (
          <div key={p.id} className="admin-problem-item">
            <div className="p-info">
              <h3>{p.title}</h3>
              <div className="p-tags">
                {p.tags?.map(t => <span key={t} className="mini-tag" style={{marginRight:'5px'}}>{t}</span>)}
              </div>
            </div>
            <div className="p-actions">
              <button onClick={() => { setEditingId(p.id); setFormData({ ...p, tags: p.tags || [], solutions: p.solutions || {} }); setShowForm(true); }} className="btn-icon"><Icon name="pencil" /></button>
              <button onClick={() => handleDeleteProblem(p.id)} className="btn-icon text-red"><Icon name="trash" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPage
