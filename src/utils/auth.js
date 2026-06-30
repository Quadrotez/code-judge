// src/utils/auth.js - Firestore version
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebaseConfig'

const ADMIN_CONFIG_DOC = 'admin'
const ADMIN_CONFIG_COLLECTION = '_config'

export const initPassword = async (password) => {
  try {
    // Проверяем не установлен ли уже пароль
    const hasPass = await hasPassword()
    if (hasPass) {
      throw new Error('Пароль уже установлен')
    }
    
    if (!password) {
      throw new Error('Пароль не может быть пустым')
    }
    
    // Сохраняем пароль в Firestore
    const adminDocRef = doc(db, ADMIN_CONFIG_COLLECTION, ADMIN_CONFIG_DOC)
    await setDoc(adminDocRef, {
      passwordHash: btoa(password), // base64 encoding (same as server)
      createdAt: new Date().toISOString()
    })
    
    // Автоматический вход после установки пароля
    const sessionToken = generateSessionToken()
    sessionStorage.setItem('admin_session_token', sessionToken)
    
    return true
  } catch (error) {
    console.error('Error setting password:', error)
    throw error
  }
}

export const checkPassword = async (password) => {
  try {
    if (!password) {
      return false
    }
    
    const adminDocRef = doc(db, ADMIN_CONFIG_COLLECTION, ADMIN_CONFIG_DOC)
    const docSnap = await getDoc(adminDocRef)
    
    if (!docSnap.exists()) {
      return false // Пароль не установлен
    }
    
    const storedHash = docSnap.data().passwordHash
    const inputHash = btoa(password)
    
    if (inputHash !== storedHash) {
      return false // Неправильный пароль
    }
    
    // Пароль верный - создаем сессию
    const sessionToken = generateSessionToken()
    sessionStorage.setItem('admin_session_token', sessionToken)
    
    return true
  } catch (error) {
    console.error('Error checking password:', error)
    return false
  }
}

export const hasPassword = async () => {
  try {
    const adminDocRef = doc(db, ADMIN_CONFIG_COLLECTION, ADMIN_CONFIG_DOC)
    const docSnap = await getDoc(adminDocRef)
    return docSnap.exists()
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
    // Ничего не делаем - сессия уже установлена при логине
    return
  } else {
    sessionStorage.removeItem('admin_session_token')
  }
}

export const logoutAdmin = async () => {
  try {
    sessionStorage.removeItem('admin_session_token')
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

export const getAdminSessionToken = () => {
  return sessionStorage.getItem('admin_session_token')
}

// Helper
const generateSessionToken = () => {
  return Math.random().toString(36).substring(2, 15)
}