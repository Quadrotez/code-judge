// utils/storage.js
const API_BASE = '/api'

// Get current session token from sessionStorage
const getSessionToken = () => sessionStorage.getItem('admin_session_token')

export const getProblems = async () => {
  try {
    const response = await fetch(`${API_BASE}/problems`)
    if (!response.ok) throw new Error('Failed to fetch problems')
    return await response.json()
  } catch (error) {
    console.error('Error fetching problems:', error)
    return []
  }
}

export const getProblemById = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/problems/${id}`)
    if (!response.ok) throw new Error('Problem not found')
    return await response.json()
  } catch (error) {
    console.error('Error fetching problem:', error)
    return null
  }
}

export const saveProblem = async (problem) => {
  try {
    const sessionToken = getSessionToken()
    const response = await fetch(`${API_BASE}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-session': sessionToken || ''
      },
      body: JSON.stringify(problem)
    })
    
    if (!response.ok) throw new Error('Failed to save problem')
    return await response.json()
  } catch (error) {
    console.error('Error saving problem:', error)
    throw error
  }
}

export const deleteProblem = async (id) => {
  try {
    const sessionToken = getSessionToken()
    const response = await fetch(`${API_BASE}/problems/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-session': sessionToken || ''
      }
    })
    
    if (!response.ok) throw new Error('Failed to delete problem')
    return await response.json()
  } catch (error) {
    console.error('Error deleting problem:', error)
    throw error
  }
}

export const exportProblems = async () => {
  try {
    const sessionToken = getSessionToken()
    const response = await fetch(`${API_BASE}/admin/export`, {
      headers: {
        'x-admin-session': sessionToken || ''
      }
    })
    
    if (!response.ok) throw new Error('Failed to export problems')
    const problems = await response.json()
    return JSON.stringify(problems, null, 2)
  } catch (error) {
    console.error('Error exporting problems:', error)
    throw error
  }
}

export const importProblems = async (jsonString) => {
  try {
    const problems = JSON.parse(jsonString)
    if (!Array.isArray(problems)) {
      throw new Error('Invalid format: must be an array')
    }
    
    const sessionToken = getSessionToken()
    const response = await fetch(`${API_BASE}/admin/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-session': sessionToken || ''
      },
      body: JSON.stringify(problems)
    })
    
    if (!response.ok) throw new Error('Failed to import problems')
    return true
  } catch (error) {
    console.error('Import error:', error)
    return false
  }
}

export const saveSubmission = (problemId, language, code, result) => {
  // Submissions are stored locally in browser (not shared across browsers)
  const submissions = JSON.parse(localStorage.getItem('submissions') || '[]')
  submissions.push({
    problemId,
    language,
    code,
    result,
    timestamp: new Date().toISOString()
  })
  localStorage.setItem('submissions', JSON.stringify(submissions))
}

export const getSubmissions = (problemId) => {
  // Submissions are stored locally in browser
  const submissions = JSON.parse(localStorage.getItem('submissions') || '[]')
  return submissions.filter(s => s.problemId === problemId)
}

