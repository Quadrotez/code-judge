import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import ProblemPage from './pages/ProblemPage'
import AdminPage from './pages/AdminPage'
import EducationPage from './pages/EducationPage'
import CoursePage from './pages/CoursePage'
import ParagraphPage from './pages/ParagraphPage'
import ChapterPage from './pages/ChapterPage'
import CourseAccessPage from './pages/CourseAccessPage'
import SandboxPage from './pages/SandboxPage'
import './styles/App.css'

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', isDarkMode)
  }, [isDarkMode])

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/problem/:id" element={<ProblemPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/education/access/:courseId/:accessKey" element={<CourseAccessPage />} />
          <Route path="/education/:courseId" element={<CoursePage />} />
          <Route path="/education/:courseId/paragraph/:paragraphId" element={<ParagraphPage />} />
          <Route path="/education/:courseId/paragraph/:paragraphId/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
        </Routes>
      </div>
    </Router>
  )
}
