import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import ProblemPage from './pages/ProblemPage'
import AdminPage from './pages/AdminPage'
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
        </Routes>
      </div>
    </Router>
  )
}
