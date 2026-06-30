// src/utils/auth.js - Firebase Authentication version
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword
} from 'firebase/auth'
import { auth } from './firebaseConfig'

const ADMIN_EMAIL = 'admin@quadrotez.com'

/**
 * Вход в админку по паролю (email фиксированный)
 */
export const checkPassword = async (password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password)
    return !!userCredential.user
  } catch (error) {
    // Подробный вывод ошибки в консоль браузера для отладки
    console.error('Firebase Auth Error:', error.code, error.message)
    
    // Пробрасываем человекочитаемую ошибку
    if (error.code === 'auth/user-not-found') {
      throw new Error('Пользователь admin@quadrotez.com не найден в Firebase Auth')
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Неверный пароль')
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Слишком много попыток. Попробуйте позже.')
    }
    
    throw error
  }
}

/**
 * Выход из системы
 */
export const logoutAdmin = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

/**
 * Проверка: авторизован ли админ (синхронная проверка текущего состояния)
 */
export const isAdminLoggedIn = () => {
  return auth.currentUser !== null
}

/**
 * Подписка на изменение состояния авторизации (для React)
 */
export const onAuthUpdate = (callback) => {
  return onAuthStateChanged(auth, callback)
}

/**
 * Смена пароля для текущего авторизованного пользователя
 */
export const changeAdminPassword = async (newPassword) => {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Пользователь не авторизован')
  }
  
  try {
    await updatePassword(user, newPassword)
    return true
  } catch (error) {
    console.error('Change password error:', error.code, error.message)
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Для смены пароля нужно перезайти в аккаунт (безопасность)')
    }
    throw error
  }
}

/**
 * Заглушка для совместимости со старым кодом, так как теперь 
 * создание первого пользователя происходит в консоли Firebase
 */
export const hasPassword = async () => {
  return true // Считаем что админ всегда существует в Firebase Auth
}

export const initPassword = async () => {
  throw new Error('Используйте консоль Firebase для создания первого пользователя')
}
