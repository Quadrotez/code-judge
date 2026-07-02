import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { isAdminLoggedIn, onAuthUpdate } from '../../utils/auth'
import Icon from '../Icon'

const Navbar = ({ isDarkMode, setIsDarkMode }) => {
  const [isLogged, setIsLogged] = useState(isAdminLoggedIn())

  useEffect(() => {
    const unsubscribe = onAuthUpdate((user) => {
      setIsLogged(!!user)
    })
    return () => unsubscribe()
  }, [])

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <Icon name="document" size={24} />
        <span>CodeJudge</span>
      </Link>
      <div className="nav-links">
        <Link to="/">Задачи</Link>
        <Link to="/education">Учебник</Link>
        {isLogged && <Link to="/admin">Админ</Link>}
        <button
          className="theme-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
        >
          <Icon name={isDarkMode ? 'sun' : 'moon'} />
        </button>
      </div>
    </nav>
  )
}

export default Navbar
