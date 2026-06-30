import express from 'express'
import cors from 'cors'
import crypto from 'crypto'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// ===== IN-MEMORY STORAGE =====
let problems = []
let adminPassword = null // null = not set yet
let adminApiKey = null // Будет сгенерирован из пароля
let adminSessions = new Map() // Map<sessionToken, {expiresAt, apiKey}>

// ===== SECURITY CONSTANTS =====
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 часа
const SALT_LENGTH = 16
const ITERATIONS = 100000
const KEY_LENGTH = 64

// ===== HELPER FUNCTIONS =====

// Генерация API ключа из пароля
const generateApiKeyFromPassword = (password) => {
  const hash = crypto
    .createHash('sha256')
    .update(password + 'admin-key-salt')
    .digest('hex')
  return hash.substring(0, 64)
}

// PBKDF2 хеширование пароля
const hashPassword = (password, salt = null) => {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH)
  const hash = crypto.pbkdf2Sync(password, useSalt, ITERATIONS, KEY_LENGTH, 'sha256')
  return useSalt.toString('hex') + ':' + hash.toString('hex')
}

// Проверка пароля
const verifyPassword = (password, storedHash) => {
  const parts = storedHash.split(':')
  if (parts.length !== 2) return false
  
  const salt = Buffer.from(parts[0], 'hex')
  const storedHashValue = parts[1]
  
  const newHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256')
  return newHash.toString('hex') === storedHashValue
}

// Генерация session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// ===== MIDDLEWARE =====

// Проверка admin session или API ключа
const authenticateAdmin = (req, res, next) => {
  const sessionToken = req.headers['x-admin-session']
  const apiKey = req.headers['x-admin-api-key']
  
  // Проверка API ключа
  if (apiKey && apiKey === adminApiKey) {
    req.isAdmin = true
    return next()
  }
  
  // Проверка session token
  if (sessionToken && adminSessions.has(sessionToken)) {
    const session = adminSessions.get(sessionToken)
    
    // Проверка срока действия session
    if (session.expiresAt > Date.now()) {
      req.isAdmin = true
      return next()
    } else {
      adminSessions.delete(sessionToken)
    }
  }
  
  return res.status(401).json({ error: 'Unauthorized - invalid or missing credentials' })
}

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
app.post('/api/problems', authenticateAdmin, (req, res) => {
  try {
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
app.delete('/api/problems/:id', authenticateAdmin, (req, res) => {
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
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password required and must be at least 8 characters' })
  }
  
  // Хешируем пароль с PBKDF2
  adminPassword = hashPassword(password)
  
  // Генерируем API ключ из пароля
  adminApiKey = generateApiKeyFromPassword(password)
  
  console.log('✅ Admin password set, API key generated')
  res.json({ 
    success: true,
    message: 'Password set successfully',
    apiKey: adminApiKey // Показываем API ключ только при первой установке
  })
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
  
  // Проверяем пароль с PBKDF2
  if (!verifyPassword(password, adminPassword)) {
    console.warn('❌ Failed login attempt with wrong password')
    return res.status(401).json({ error: 'Invalid password' })
  }
  
  const sessionToken = generateSessionToken()
  const expiresAt = Date.now() + SESSION_TIMEOUT
  
  adminSessions.set(sessionToken, { 
    expiresAt,
    apiKey: adminApiKey
  })
  
  console.log('✅ Admin login successful, session created')
  res.json({ 
    sessionToken,
    expiresIn: SESSION_TIMEOUT,
    apiKey: adminApiKey // Также возвращаем API ключ для использования в запросах
  })
})

// Logout
app.post('/api/admin/logout', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  if (sessionToken) {
    adminSessions.delete(sessionToken)
  }
  res.json({ success: true })
})

// Verify session
app.get('/api/admin/verify', (req, res) => {
  const sessionToken = req.headers['x-admin-session']
  const apiKey = req.headers['x-admin-api-key']
  
  // Проверка API ключа
  if (apiKey && apiKey === adminApiKey) {
    return res.json({ valid: true, method: 'api-key' })
  }
  
  // Проверка session token
  if (sessionToken && adminSessions.has(sessionToken)) {
    const session = adminSessions.get(sessionToken)
    if (session.expiresAt > Date.now()) {
      return res.json({ valid: true, method: 'session' })
    } else {
      adminSessions.delete(sessionToken)
    }
  }
  
  res.status(401).json({ valid: false })
})

// Export problems
app.get('/api/admin/export', authenticateAdmin, (req, res) => {
  res.json(problems)
})

// Import problems
app.post('/api/admin/import', authenticateAdmin, (req, res) => {
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
