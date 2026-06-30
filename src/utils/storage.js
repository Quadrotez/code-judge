// src/utils/storage.js - Firestore version
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore'
import { db, auth } from './firebaseConfig'

const PROBLEMS_COLLECTION = 'problems'
const TAGS_COLLECTION = 'tags'

export const getProblems = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PROBLEMS_COLLECTION))
    const problems = []
    querySnapshot.forEach((doc) => {
      problems.push({
        id: doc.id,
        ...doc.data()
      })
    })
    return problems
  } catch (error) {
    console.error('Error fetching problems:', error)
    return []
  }
}

export const getProblemById = async (id) => {
  try {
    const docRef = doc(db, PROBLEMS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    }
    return null
  } catch (error) {
    console.error('Error fetching problem:', error)
    return null
  }
}

export const saveProblem = async (problem) => {
  try {
    // Проверяем авторизацию через Firebase Auth
    if (!auth.currentUser) {
      throw new Error('Unauthorized - admin session required')
    }
    
    // Используем существующий ID или генерируем новый
    const problemId = problem.id || `problem_${Date.now()}`
    
    // Создаем копию объекта и удаляем id из тела документа, если хотим чтобы он был только в имени документа
    // Или оставляем, но следим чтобы он не был undefined
    const dataToSave = {
      ...problem,
      id: problemId,
      updatedAt: new Date().toISOString()
    }
    
    const docRef = doc(db, PROBLEMS_COLLECTION, problemId)
    await setDoc(docRef, dataToSave)
    
    return {
      id: problemId,
      ...problem,
      updatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error saving problem:', error)
    throw error
  }
}

export const deleteProblem = async (id) => {
  try {
    // Проверяем авторизацию через Firebase Auth
    if (!auth.currentUser) {
      throw new Error('Unauthorized - admin session required')
    }
    
    const docRef = doc(db, PROBLEMS_COLLECTION, id)
    await deleteDoc(docRef)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting problem:', error)
    throw error
  }
}

export const exportProblems = async () => {
  try {
    // Проверяем авторизацию через Firebase Auth
    if (!auth.currentUser) {
      throw new Error('Unauthorized - admin session required')
    }
    
    const problems = await getProblems()
    return JSON.stringify(problems, null, 2)
  } catch (error) {
    console.error('Error exporting problems:', error)
    throw error
  }
}

export const importProblems = async (jsonString) => {
  try {
    // Проверяем авторизацию через Firebase Auth
    if (!auth.currentUser) {
      throw new Error('Unauthorized - admin session required')
    }
    
    const problems = JSON.parse(jsonString)
    if (!Array.isArray(problems)) {
      throw new Error('Invalid format: must be an array')
    }
    
    // Удаляем все старые проблемы
    const existingProblems = await getProblems()
    for (const problem of existingProblems) {
      const docRef = doc(db, PROBLEMS_COLLECTION, problem.id)
      await deleteDoc(docRef)
    }
    
    // Добавляем новые
    for (const problem of problems) {
      const problemId = problem.id || `problem_${Date.now()}`
      const docRef = doc(db, PROBLEMS_COLLECTION, problemId)
      await setDoc(docRef, {
        ...problem,
        importedAt: new Date().toISOString()
      })
    }
    
    return true
  } catch (error) {
    console.error('Import error:', error)
    throw error
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

// --- TAGS ---
export const getTags = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, TAGS_COLLECTION))
    const tags = []
    querySnapshot.forEach((doc) => {
      tags.push({
        id: doc.id,
        ...doc.data()
      })
    })
    return tags
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

export const saveTag = async (tag) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const tagId = tag.id || `tag_${Date.now()}`
    const docRef = doc(db, TAGS_COLLECTION, tagId)
    await setDoc(docRef, tag)
    return { id: tagId, ...tag }
  } catch (error) {
    console.error('Error saving tag:', error)
    throw error
  }
}

export const deleteTag = async (id) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const docRef = doc(db, TAGS_COLLECTION, id)
    await deleteDoc(docRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}