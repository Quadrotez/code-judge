import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourseById } from '../utils/storage'
import Icon from '../components/Icon'

function CourseAccessPage() {
  const { courseId, accessKey } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const check = async () => {
      const course = await getCourseById(courseId)
      if (!course) {
        setStatus('not_found')
        return
      }
      if (!course.isPrivate) {
        navigate(`/education/${courseId}`, { replace: true })
        return
      }
      const validKeys = course.accessKeys || []
      if (validKeys.includes(accessKey)) {
        const stored = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
        stored[courseId] = accessKey
        localStorage.setItem('edu_access_keys', JSON.stringify(stored))
        setStatus('granted')
        setTimeout(() => navigate(`/education/${courseId}`, { replace: true }), 1500)
      } else {
        setStatus('denied')
      }
    }
    check()
  }, [courseId, accessKey, navigate])

  return (
    <div className="container">
      <div className="edu-access-gate">
        {status === 'checking' && (
          <>
            <Icon name="clock" size={40} />
            <p>Проверка доступа...</p>
          </>
        )}
        {status === 'granted' && (
          <>
            <Icon name="check" size={40} />
            <h2>Доступ получен!</h2>
            <p>Перенаправление на курс...</p>
          </>
        )}
        {status === 'denied' && (
          <>
            <Icon name="x" size={40} />
            <h2>Неверный ключ доступа</h2>
            <Link to="/education" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Вернуться к учебнику
            </Link>
          </>
        )}
        {status === 'not_found' && (
          <>
            <Icon name="x" size={40} />
            <h2>Курс не найден</h2>
            <Link to="/education" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Вернуться к учебнику
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default CourseAccessPage
