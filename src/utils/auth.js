/**
 * src/utils/auth.js
 *
 * Слой авторизации администратора.
 *
 * Если VITE_CODEJUDGE_TESTMODE === '1', используется упрощённая
 * in-memory авторизация из memoryDb.js (Firebase не используется для auth).
 * В противном случае — Firebase Authentication (поведение без изменений).
 */

import { IS_TEST_MODE } from './storage'
import {
  memLoginAdmin,
  memLogoutAdmin,
  memIsLoggedIn,
  memOnAuthUpdate,
} from './memoryDb'

// Firebase auth импортируется статически, но используется только при IS_TEST_MODE === false
import { auth } from './firebaseConfig'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from 'firebase/auth'

// ─── Публичный API ────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@quadrotez.com'

/**
 * Вход в систему.
 * В тестовом режиме принимает любой пароль.
 */
export const loginAdmin = async (email, password) => {
  if (IS_TEST_MODE) {
    return memLoginAdmin(password)
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return !!userCredential.user
  } catch (error) {
    console.error('Firebase Auth Error:', error.code, error.message)
    if (error.code === 'auth/user-not-found') {
      throw new Error('Пользователь ' + email + ' не найден в Firebase Auth')
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Неверный пароль')
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Слишком много попыток. Попробуйте позже.')
    }
    throw error
  }
}

/**
 * Вход по паролю (совместимость со старым кодом).
 */
export const checkPassword = async (password) => {
  return loginAdmin(ADMIN_EMAIL, password)
}

/**
 * Выход из системы.
 */
export const logoutAdmin = async () => {
  if (IS_TEST_MODE) return memLogoutAdmin()
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

/**
 * Синхронная проверка: авторизован ли администратор.
 */
export const isAdminLoggedIn = () => {
  if (IS_TEST_MODE) return memIsLoggedIn()
  return auth.currentUser !== null
}

/**
 * Подписка на изменение состояния авторизации (для React).
 * Возвращает функцию отписки.
 */
export const onAuthUpdate = (callback) => {
  if (IS_TEST_MODE) return memOnAuthUpdate(callback)
  return onAuthStateChanged(auth, callback)
}

/**
 * Смена пароля для текущего авторизованного пользователя.
 * В тестовом режиме всегда успешна.
 */
export const changeAdminPassword = async (newPassword) => {
  if (IS_TEST_MODE) {
    console.log('[TestMode] changeAdminPassword — пароль не меняется в тестовом режиме')
    return true
  }
  const user = auth.currentUser
  if (!user) throw new Error('Пользователь не авторизован')
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
 * Заглушки для совместимости со старым кодом.
 */
export const hasPassword = async () => true

export const initPassword = async () => {
  throw new Error('Используйте консоль Firebase для создания первого пользователя')
}
