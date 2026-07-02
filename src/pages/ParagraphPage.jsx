import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourseById, getParagraphs, getChapters } from '../utils/storage'
import MarkdownRenderer from '../components/MarkdownRenderer'
import Icon from '../components/Icon'

const hasAccess = (course) => {
  if (!course?.isPrivate) return true
  const keys = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
  return !!keys[course.id]
}

function ParagraphPage() {
  const { courseId, paragraphId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [paragraph, setParagraph] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [c, paras] = await Promise.all([
        getCourseById(courseId),
        getParagraphs(courseId),
      ])
      setCourse(c)

      if (c && !hasAccess(c)) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      const para = paras.find((p) => p.id === paragraphId)
      setParagraph(para)
      if (para) {
        const chaps = await getChapters(courseId, paragraphId)
        setChapters(chaps)
      }
      setLoading(false)
    }
    load()
  }, [courseId, paragraphId])

  if (loading) return <div className="container">Загрузка...</div>

  if (accessDenied) {
    return (
      <div className="container">
        <div className="edu-access-gate">
          <Icon name="lock" size={40} />
          <h2>Доступ закрыт</h2>
          <p>Этот курс является приватным. Для доступа необходим ключ.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/education/${courseId}`)}>
            Перейти к курсу
          </button>
        </div>
      </div>
    )
  }

  if (!paragraph) return <div className="container">Параграф не найден</div>

  return (
    <div className="container edu-paragraph-page">
      <div className="edu-breadcrumb">
        <Link to="/education">Учебник</Link>
        <Icon name="chevronRight" size={14} />
        <Link to={`/education/${courseId}`}>{course?.title}</Link>
        <Icon name="chevronRight" size={14} />
        <span>{paragraph.title}</span>
      </div>

      <div className="edu-paragraph-header">
        <h1>{paragraph.title}</h1>
        {paragraph.description && <p className="edu-paragraph-desc">{paragraph.description}</p>}
      </div>

      {paragraph.content && (
        <div className="edu-paragraph-content">
          <MarkdownRenderer text={paragraph.content} />
        </div>
      )}

      {chapters.length > 0 && (
        <div className="paragraph-chapters-section">
          <h2>Главы</h2>
          <div className="chapters-list-full">
            {chapters.map((chap) => (
              <Link
                key={chap.id}
                to={`/education/${courseId}/paragraph/${paragraphId}/chapter/${chap.id}`}
                className="chapter-card"
              >
                <div className="chapter-card-icon">
                  <Icon name="documentText" size={20} />
                </div>
                <div>
                  <h3>{chap.title}</h3>
                  {chap.description && <p>{chap.description}</p>}
                </div>
                <Icon name="arrowRight" size={18} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ParagraphPage
