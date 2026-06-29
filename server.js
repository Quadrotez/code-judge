import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// ===== IN-MEMORY STORAGE =====
let problems = []
let adminPassword = null // null = not set yet
let adminSessions = new Set() // Set of session tokens

// ===== HELPER FUNCTIONS =====
const generateSessionToken = () => Math.random().toString(36).substring(2, 15)

// ===== PROBLEMS ENDPOINTS =====

// GET all problems
app.get('/api/problems', (req, res) => {
  res.json(problems)
})

// GET problem by id
app.get('/api/problems/:id', (req, res) => {
  const problem = problems.find(p => p.id === req.params.id)
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' })
  }
  res.json(problem)
})

// POST create/update problem (admin only)
app.post('/api/problems', (req, res) => {
  try {
    const sessionToken = req.headers['x-admin-session']
    
    if (!sessionToken || !adminSessions.has(sessionToken)) {
      console.log('Unauthorized: token=', sessionToken, 'valid tokens:', adminSessions.size)
      return res.status(401).json({ error: 'Unauthorized - invalid or missing session' })
    }
    
    const problem = req.body
    
    if (!problem.id) {
      problem.id = Date.now().toString()
    }
    
    const index = problems.findIndex(p => p.id === problem.id)
    if (index >= 0) {
      problems[index] = problem
    } else {
      problems.push(problem)
    }
    
    console.log('Problem saved:', problem.id)
    res.json(problem)
  } catch (error) {
    console.error('Error saving problem:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE problem (admin only)
app.delete('/api/problems/:id', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  
  if (!adminSessions.has(sessionToken)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  problems = problems.filter(p => p.id !== req.params.id)
  res.json({ success: true })
})

// ===== ADMIN PASSWORD ENDPOINTS =====

// Check if password is set
app.get('/api/admin/has-password', (req, res) => {
  res.json({ hasPassword: adminPassword !== null })
})

// Set admin password (only if not set yet)
app.post('/api/admin/set-password', (req, res) => {
  if (adminPassword !== null) {
    return res.status(400).json({ error: 'Password already set' })
  }
  
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }
  
  adminPassword = btoa(password) // base64 encoding
  res.json({ success: true })
})

// Login with password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }
  
  if (adminPassword === null) {
    return res.status(400).json({ error: 'Admin password not set' })
  }
  
  const passwordHash = btoa(password)
  if (passwordHash !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  
  const sessionToken = generateSessionToken()
  adminSessions.add(sessionToken)
  
  res.json({ sessionToken })
})

// Logout
app.post('/api/admin/logout', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  adminSessions.delete(sessionToken)
  res.json({ success: true })
})

// Verify session
app.get('/api/admin/verify', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  
  if (adminSessions.has(sessionToken)) {
    res.json({ valid: true })
  } else {
    res.status(401).json({ valid: false })
  }
})

// Export problems
app.get('/api/admin/export', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  
  if (!adminSessions.has(sessionToken)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  res.json(problems)
})

// Import problems
app.post('/api/admin/import', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  
  if (!adminSessions.has(sessionToken)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const importedProblems = req.body
  
  if (!Array.isArray(importedProblems)) {
    return res.status(400).json({ error: 'Must be an array' })
  }
  
  problems = importedProblems
  res.json({ success: true })
})

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Judge Server running on http://localhost:${PORT}`)
  console.log(`📝 API base: http://localhost:${PORT}/api`)
})
