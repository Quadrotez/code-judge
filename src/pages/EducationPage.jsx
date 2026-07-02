import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../utils/storage'
import Icon from '../components/Icon'

function EducationPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      const all = await getCourses()
      // Show public courses + private courses the user has access to
      const privateKeys = JSON.parse(localStorage.getItem('edu_access_keys') || '{}')
      const visible = all.filter(
        (c) => !c.isPrivate || privateKeys[c.id]
      )
      setCourses(visible)
      setLoading(false)
    }
    loadCourses()
  }, [])

  if (loading) return <div className="container">Загрузка...</div>

  return (
    <div className="container edu-page">
      <div className="edu-header">
        <h1>
          <Icon name="academicCap" size={28} />
          Учебник
        </h1>
        <p className="edu-subtitle">Изучайте языки программирования, технологии и инструменты</p>
      </div>

      {courses.length === 0 ? (
        <div className="edu-empty">
          <Icon name="book" size={48} />
          <p>Курсы пока не добавлены</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <Link to={`/education/${course.id}`} key={course.id} className="course-card">
              <div className="course-card-header">
                <h3>{course.title}</h3>
                <span className={`course-badge ${course.isPrivate ? 'private' : 'public'}`}>
                  <Icon name={course.isPrivate ? 'lock' : 'globe'} size={12} />
                  {course.isPrivate ? 'Приватный' : 'Публичный'}
                </span>
              </div>
              {course.description && (
                <p className="course-description">{course.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default EducationPage
