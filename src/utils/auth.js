// utils/auth.js
const API_BASE = '/api'

export const initPassword = async (password) => {
  try {
    const response = await fetch(`${API_BASE}/admin/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    })
    
    if (!response.ok) {
      let errorMsg = 'Failed to set password'
      try {
        const error = await response.json()
        errorMsg = error.error || errorMsg
      } catch (e) {
        errorMsg = `Server error: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMsg)
    }
    
    // Auto-login after password setup
    const loginResponse = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    })
    
    if (loginResponse.ok) {
      const data = await loginResponse.json()
      sessionStorage.setItem('admin_session_token', data.sessionToken)
    }
    
    return true
  } catch (error) {
    console.error('Error setting password:', error)
    throw error
  }
}

export const checkPassword = async (password) => {
  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    })
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    // Store session token in sessionStorage
    sessionStorage.setItem('admin_session_token', data.sessionToken)
    return true
  } catch (error) {
    console.error('Error checking password:', error)
    return false
  }
}

export const hasPassword = async () => {
  try {
    const response = await fetch(`${API_BASE}/admin/has-password`)
    if (!response.ok) throw new Error('Failed to check password')
    const data = await response.json()
    return data.hasPassword
  } catch (error) {
    console.error('Error checking if password exists:', error)
    return false
  }
}

export const isAdminLoggedIn = () => {
  return sessionStorage.getItem('admin_session_token') !== null
}

export const setAdminLoggedIn = (value) => {
  if (value) {
    // Session token is set by login
    return
  } else {
    sessionStorage.removeItem('admin_session_token')
  }
}

export const logoutAdmin = async () => {
  try {
    const sessionToken = sessionStorage.getItem('admin_session_token')
    if (sessionToken) {
      await fetch(`${API_BASE}/admin/logout`, {
        method: 'POST',
        headers: {
          'x-admin-session': sessionToken
        }
      })
    }
  } catch (error) {
    console.error('Error logging out:', error)
  } finally {
    sessionStorage.removeItem('admin_session_token')
  }
}

