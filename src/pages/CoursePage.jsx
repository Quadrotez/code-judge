import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourseById, getParagraphs, getChapters } from '../utils/storage'
import MarkdownRenderer from '../components/MarkdownRenderer'
import Icon from '../components/Icon'

function CoursePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [paragraphs, setParagraphs] = useState([])
  const [chaptersMap, setChaptersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [accessKey, setAccessKey] = useState('')
  const [accessError, setAccessError] = useState('')

  const hasAccess = (c) => {
    if (!c?.isPrivate) return true
    const keys = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
    return !!keys[c.id]
  }

  useEffect(() => {
    const load = async () => {
      const c = await getCourseById(courseId)
      setCourse(c)
      if (c && hasAccess(c)) {
        const paras = await getParagraphs(courseId)
        setParagraphs(paras)
        const chapMap = {}
        for (const para of paras) {
          const chaps = await getChapters(courseId, para.id)
          chapMap[para.id] = chaps
        }
        setChaptersMap(chapMap)
      }
      setLoading(false)
    }
    load()
  }, [courseId])

  const handleAccessKey = () => {
    if (!course) return
    const stored = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
    // Check if the key matches any of the course's valid keys
    const validKeys = course.accessKeys || []
    if (validKeys.includes(accessKey.trim())) {
      stored[course.id] = accessKey.trim()
      localStorage.setItem('edu_access_keys', JSON.stringify(stored))
      window.location.reload()
    } else {
      setAccessError('Неверный ключ доступа')
    }
  }

  if (loading) return <div className="container">Загрузка...</div>
  if (!course) return <div className="container">Курс не найден</div>

  if (course.isPrivate && !hasAccess(course)) {
    return (
      <div className="container">
        <div className="edu-access-gate">
          <Icon name="lock" size={40} />
          <h2>Приватный курс</h2>
          <p>Для доступа к курсу <strong>{course.title}</strong> введите ключ доступа:</p>
          <div className="access-key-form">
            <input
              type="text"
              className="form-input"
              placeholder="Ключ доступа"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAccessKey()}
            />
            {accessError && <p className="access-error">{accessError}</p>}
            <button className="btn btn-primary" onClick={handleAccessKey}>
              Получить доступ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container edu-course-page">
      <div className="edu-breadcrumb">
        <Link to="/education">Учебник</Link>
        <Icon name="chevronRight" size={14} />
        <span>{course.title}</span>
      </div>

      <div className="edu-course-header">
        <h1>{course.title}</h1>
        {course.description && <p className="edu-course-desc">{course.description}</p>}
      </div>

      {course.content && (
        <div className="edu-course-intro">
          <MarkdownRenderer text={course.content} />
        </div>
      )}

      <div className="paragraphs-list">
        {paragraphs.length === 0 ? (
          <div className="edu-empty">
            <p>В этом курсе пока нет параграфов</p>
          </div>
        ) : (
          paragraphs.map((para) => (
            <div key={para.id} className="paragraph-block">
              <Link to={`/education/${courseId}/paragraph/${para.id}`} className="paragraph-header">
                <div className="paragraph-title-row">
                  <Icon name="documentText" size={18} />
                  <h2>{para.title}</h2>
                </div>
                {para.description && (
                  <p className="paragraph-desc">{para.description}</p>
                )}
              </Link>

              {chaptersMap[para.id] && chaptersMap[para.id].length > 0 && (
                <div className="chapters-list">
                  {chaptersMap[para.id].map((chap) => (
                    <Link
                      key={chap.id}
                      to={`/education/${courseId}/paragraph/${para.id}/chapter/${chap.id}`}
                      className="chapter-item"
                    >
                      <Icon name="chevronRight" size={14} />
                      <span>{chap.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CoursePage
