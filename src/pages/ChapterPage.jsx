import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourseById, getParagraphs, getChapters, getProblems } from '../utils/storage'
import MarkdownRenderer from '../components/MarkdownRenderer'
import Icon from '../components/Icon'

const hasAccess = (course) => {
  if (!course?.isPrivate) return true
  const keys = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
  return !!keys[course.id]
}

function ChapterPage() {
  const { courseId, paragraphId, chapterId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [paragraph, setParagraph] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [problems, setProblems] = useState([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [c, paras, allProblems] = await Promise.all([
        getCourseById(courseId),
        getParagraphs(courseId),
        getProblems(),
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
        const chap = chaps.find((ch) => ch.id === chapterId)
        setChapter(chap)
        if (chap?.attachedProblems?.length) {
          const attached = allProblems.filter((p) => chap.attachedProblems.includes(p.id))
          setProblems(attached)
        }
      }
      setLoading(false)
    }
    load()
  }, [courseId, paragraphId, chapterId])

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

  if (!chapter) return <div className="container">Глава не найдена</div>

  const pages = chapter.pages || []
  const currentPage = pages[currentPageIndex]

  return (
    <div className="chapter-fullscreen">
      {/* Top navigation */}
      <div className="chapter-topbar">
        <div className="chapter-breadcrumb">
          <Link to="/education">Учебник</Link>
          <Icon name="chevronRight" size={14} />
          <Link to={`/education/${courseId}`}>{course?.title}</Link>
          <Icon name="chevronRight" size={14} />
          <Link to={`/education/${courseId}/paragraph/${paragraphId}`}>{paragraph?.title}</Link>
          <Icon name="chevronRight" size={14} />
          <span>{chapter.title}</span>
        </div>

        {pages.length > 1 && (
          <div className="chapter-page-nav">
            {pages.map((_, idx) => (
              <button
                key={idx}
                className={`page-nav-btn ${currentPageIndex === idx ? 'active' : ''}`}
                onClick={() => setCurrentPageIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="chapter-content-area">
        {pages.length === 0 ? (
          <div className="edu-empty">
            <p>В этой главе пока нет страниц</p>
          </div>
        ) : (
          <div className="chapter-page-content">
            <MarkdownRenderer text={currentPage?.content || ''} />
          </div>
        )}

        {/* Attached problems — shown on the last page */}
        {problems.length > 0 && currentPageIndex === pages.length - 1 && (
          <div className="chapter-problems">
            <h2>Задачи для закрепления</h2>
            <div className="chapter-problems-list">
              {problems.map((p) => (
                <Link key={p.id} to={`/problem/${p.id}`} className="chapter-problem-item">
                  <Icon name="document" size={16} />
                  <span>{p.title}</span>
                  <Icon name="arrowRight" size={14} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Prev/Next navigation */}
        {pages.length > 1 && (
          <div className="chapter-page-arrows">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
              disabled={currentPageIndex === 0}
            >
              ← Назад
            </button>
            <span className="page-indicator">{currentPageIndex + 1} / {pages.length}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={currentPageIndex === pages.length - 1}
            >
              Вперёд →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChapterPage
