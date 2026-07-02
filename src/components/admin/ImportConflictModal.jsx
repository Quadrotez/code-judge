// components/admin/ImportConflictModal.jsx
import React, { useState } from 'react'
import Modal from '../common/Modal'

const ACTIONS = [
  { value: 'overwrite', label: 'Перезаписать' },
  { value: 'skip', label: 'Пропустить' },
  { value: 'create', label: 'Создать новое' },
]

const ImportConflictModal = ({ isOpen, conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState(() => {
    const init = {}
    conflicts.forEach((c) => { init[c.title] = 'skip' })
    return init
  })
  const [applyAll, setApplyAll] = useState(false)
  const [applyAllAction, setApplyAllAction] = useState('skip')

  const setAction = (title, action) => {
    if (applyAll) return
    setResolutions((prev) => ({ ...prev, [title]: action }))
  }

  const handleApplyAllChange = (checked) => {
    setApplyAll(checked)
    if (checked) {
      const all = {}
      conflicts.forEach((c) => { all[c.title] = applyAllAction })
      setResolutions(all)
    }
  }

  const handleApplyAllActionChange = (action) => {
    setApplyAllAction(action)
    if (applyAll) {
      const all = {}
      conflicts.forEach((c) => { all[c.title] = action })
      setResolutions(all)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Конфликты при импорте" size="large">
      <div className="import-conflict-modal">
        <p className="import-conflict-desc">
          Следующие задачи уже существуют. Выберите действие для каждой:
        </p>

        <div className="import-apply-all">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(e) => handleApplyAllChange(e.target.checked)}
            />
            Применить для всех:
          </label>
          <div className="import-action-group">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                className={`tag-chip ${applyAllAction === a.value ? 'active' : ''}`}
                onClick={() => handleApplyAllActionChange(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="import-conflicts-list">
          {conflicts.map((c) => (
            <div key={c.title} className="import-conflict-item">
              <span className="import-conflict-title">{c.title}</span>
              <div className="import-action-group">
                {ACTIONS.map((a) => (
                  <button
                    key={a.value}
                    className={`tag-chip ${resolutions[c.title] === a.value ? 'active' : ''}`}
                    onClick={() => setAction(c.title, a.value)}
                    disabled={applyAll}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Отмена</button>
          <button className="btn btn-primary" onClick={() => onResolve(resolutions)}>
            Импортировать
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ImportConflictModal
