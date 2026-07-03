import React, { useState, useMemo } from 'react'
import Modal from '../common/Modal'
import Icon from '../Icon'

// ─── Diff generator ───────────────────────────────────────────────────────────

const COURSE_FIELDS = [
  { key: 'title', label: 'Название' },
  { key: 'description', label: 'Описание' },
  { key: 'content', label: 'Вводный текст' },
  { key: 'isPrivate', label: 'Приватность' },
]

const PARAGRAPH_FIELDS = [
  { key: 'title', label: 'Заголовок' },
  { key: 'description', label: 'Описание' },
  { key: 'content', label: 'Содержимое' },
]

const CHAPTER_FIELDS = [
  { key: 'title', label: 'Заголовок' },
  { key: 'description', label: 'Описание' },
  { key: 'pages', label: 'Страницы' },
  { key: 'attachedProblems', label: 'Задачи' },
]

function formatValue(val) {
  if (val === undefined || val === null) return '—'
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет'
  if (Array.isArray(val)) return `[${val.length} элем.]`
  const s = String(val)
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

function pagesChanged(a, b) {
  try { return JSON.stringify(a) !== JSON.stringify(b) } catch { return true }
}

export function generateCourseChanges(currentCourse, currentParagraphs, importedData) {
  const changes = []
  let seq = 0
  const nextId = () => `change_${seq++}`

  const imp = importedData

  // ── Course-level field changes ──
  for (const { key, label } of COURSE_FIELDS) {
    const oldVal = currentCourse[key]
    const newVal = imp.course[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        id: nextId(),
        type: 'course-field',
        field: key,
        label: `Поле курса: ${label}`,
        oldVal,
        newVal,
      })
    }
  }

  // ── Paragraphs ──
  const impParas = imp.paragraphs || []

  // Match by title (case-insensitive)
  const matchParagraph = (impPara) =>
    currentParagraphs.find((p) => p.title?.toLowerCase() === impPara.title?.toLowerCase())

  for (const impPara of impParas) {
    const matched = matchParagraph(impPara)

    if (!matched) {
      // New paragraph
      changes.push({
        id: nextId(),
        type: 'paragraph-add',
        label: `Новый параграф: «${impPara.title}»`,
        paragraphData: impPara,
        chaptersData: impPara.chapters || [],
      })
    } else {
      // Possibly modified paragraph fields
      const paraFieldChanges = []
      for (const { key, label } of PARAGRAPH_FIELDS) {
        if (JSON.stringify(matched[key]) !== JSON.stringify(impPara[key])) {
          paraFieldChanges.push({ field: key, label, oldVal: matched[key], newVal: impPara[key] })
        }
      }
      if (paraFieldChanges.length > 0) {
        changes.push({
          id: nextId(),
          type: 'paragraph-modify',
          label: `Параграф изменён: «${impPara.title}»`,
          paragraphId: matched.id,
          paragraphData: { ...matched, ...impPara, id: matched.id },
          fieldChanges: paraFieldChanges,
        })
      }

      // ── Chapters within matched paragraph ──
      const currentChapters = matched._chapters || []
      const impChapters = impPara.chapters || []

      const matchChapter = (impChap) =>
        currentChapters.find((c) => c.title?.toLowerCase() === impChap.title?.toLowerCase())

      for (const impChap of impChapters) {
        const matchedChap = matchChapter(impChap)

        if (!matchedChap) {
          changes.push({
            id: nextId(),
            type: 'chapter-add',
            label: `Новая глава: «${impChap.title}» (в «${impPara.title}»)`,
            paragraphId: matched.id,
            chapterData: impChap,
          })
        } else {
          const chapFieldChanges = []
          for (const { key, label } of CHAPTER_FIELDS) {
            const a = matchedChap[key]
            const b = impChap[key]
            const changed = key === 'pages' || key === 'attachedProblems'
              ? pagesChanged(a, b)
              : JSON.stringify(a) !== JSON.stringify(b)
            if (changed) {
              chapFieldChanges.push({ field: key, label, oldVal: a, newVal: b })
            }
          }
          if (chapFieldChanges.length > 0) {
            changes.push({
              id: nextId(),
              type: 'chapter-modify',
              label: `Глава изменена: «${impChap.title}» (в «${impPara.title}»)`,
              paragraphId: matched.id,
              chapterId: matchedChap.id,
              chapterData: { ...matchedChap, ...impChap, id: matchedChap.id },
              fieldChanges: chapFieldChanges,
            })
          }
        }
      }
    }
  }

  return changes
}

// ─── Change item component ─────────────────────────────────────────────────────

function ChangeItem({ change, accepted, onToggle }) {
  const [expanded, setExpanded] = useState(false)

  const typeColors = {
    'course-field': '#3b82f6',
    'paragraph-add': '#22c55e',
    'paragraph-modify': '#f59e0b',
    'chapter-add': '#22c55e',
    'chapter-modify': '#f59e0b',
  }

  const typeLabels = {
    'course-field': 'Поле',
    'paragraph-add': '+ Параграф',
    'paragraph-modify': '~ Параграф',
    'chapter-add': '+ Глава',
    'chapter-modify': '~ Глава',
  }

  const color = typeColors[change.type] || '#64748b'
  const hasDetails = change.fieldChanges || change.type === 'course-field'

  return (
    <div className={`course-import-change-item ${accepted ? 'accepted' : 'rejected'}`}>
      <div className="course-import-change-header">
        <span className="course-import-type-badge" style={{ background: color + '22', color }}>
          {typeLabels[change.type]}
        </span>
        <span className="course-import-change-label">{change.label}</span>
        <div className="course-import-change-actions">
          {hasDetails && (
            <button
              className="btn-icon"
              title={expanded ? 'Свернуть' : 'Подробнее'}
              onClick={() => setExpanded(!expanded)}
              style={{ fontSize: '0.75rem' }}
            >
              <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
            </button>
          )}
          <button
            className={`tag-chip ${accepted ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', minWidth: 90 }}
            onClick={() => onToggle(change.id, true)}
          >
            ✓ Принять
          </button>
          <button
            className={`tag-chip ${!accepted ? 'active' : ''}`}
            style={{
              fontSize: '0.8rem',
              padding: '0.25rem 0.75rem',
              minWidth: 90,
              ...((!accepted) ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : {}),
            }}
            onClick={() => onToggle(change.id, false)}
          >
            ✗ Отклонить
          </button>
        </div>
      </div>

      {expanded && (
        <div className="course-import-change-detail">
          {change.type === 'course-field' && (
            <div className="course-import-diff-row">
              <div className="diff-old">
                <span className="diff-label">Было</span>
                <span className="diff-value">{formatValue(change.oldVal)}</span>
              </div>
              <div className="diff-arrow">→</div>
              <div className="diff-new">
                <span className="diff-label">Станет</span>
                <span className="diff-value">{formatValue(change.newVal)}</span>
              </div>
            </div>
          )}
          {change.fieldChanges && change.fieldChanges.map((fc) => (
            <div key={fc.field} className="course-import-diff-row">
              <span className="diff-field-label">{fc.label}:</span>
              <div className="diff-old">
                <span className="diff-label">Было</span>
                <span className="diff-value">{formatValue(fc.oldVal)}</span>
              </div>
              <div className="diff-arrow">→</div>
              <div className="diff-new">
                <span className="diff-label">Станет</span>
                <span className="diff-value">{formatValue(fc.newVal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main modal component ──────────────────────────────────────────────────────

const CourseImportModal = ({ isOpen, changes, onApply, onCancel }) => {
  const [accepted, setAccepted] = useState(() => {
    const init = {}
    changes.forEach((c) => { init[c.id] = true })
    return init
  })

  const handleToggle = (id, val) => {
    setAccepted((prev) => ({ ...prev, [id]: val }))
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length
  const totalCount = changes.length

  const handleAcceptAll = () => {
    const all = {}
    changes.forEach((c) => { all[c.id] = true })
    setAccepted(all)
  }

  const handleRejectAll = () => {
    const all = {}
    changes.forEach((c) => { all[c.id] = false })
    setAccepted(all)
  }

  const handleApply = () => {
    const acceptedChanges = changes.filter((c) => accepted[c.id])
    onApply(acceptedChanges)
  }

  if (changes.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onCancel} title="Импорт курса" size="large">
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <p>Изменений не обнаружено — импортированный курс идентичен текущему.</p>
          <div className="form-actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn" onClick={onCancel}>Закрыть</button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Просмотр изменений при импорте" size="large">
      <div className="course-import-modal">
        <p className="import-conflict-desc">
          Найдено изменений: <strong>{totalCount}</strong>. Принято: <strong>{acceptedCount}</strong>.
          Проверьте каждое изменение и нажмите «Применить».
        </p>

        <div className="import-apply-all">
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Применить для всех:</span>
          <div className="import-action-group">
            <button className="tag-chip active" onClick={handleAcceptAll}>
              ✓ Принять все
            </button>
            <button className="tag-chip" onClick={handleRejectAll}>
              ✗ Отклонить все
            </button>
          </div>
        </div>

        <div className="course-import-changes-list">
          {changes.map((change) => (
            <ChangeItem
              key={change.id}
              change={change}
              accepted={accepted[change.id]}
              onToggle={handleToggle}
            />
          ))}
        </div>

        <div className="form-actions">
          <button className="btn" onClick={onCancel}>Отмена</button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={acceptedCount === 0}
          >
            Применить ({acceptedCount})
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CourseImportModal
