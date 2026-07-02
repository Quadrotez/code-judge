// src/utils/storage.js - Firestore version
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db, auth } from './firebaseConfig'

const PROBLEMS_COLLECTION = 'problems'
const TAGS_COLLECTION = 'tags'
const COURSES_COLLECTION = 'courses'

// ─── PROBLEMS ────────────────────────────────────────────────────────────────

export const getProblems = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PROBLEMS_COLLECTION))
    const problems = []
    querySnapshot.forEach((d) => {
      problems.push({ id: d.id, ...d.data() })
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
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() }
    return null
  } catch (error) {
    console.error('Error fetching problem:', error)
    return null
  }
}

export const saveProblem = async (problem) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const problemId = problem.id || `problem_${Date.now()}`
    const dataToSave = { ...problem, id: problemId, updatedAt: new Date().toISOString() }
    await setDoc(doc(db, PROBLEMS_COLLECTION, problemId), dataToSave)
    return { id: problemId, ...problem, updatedAt: new Date().toISOString() }
  } catch (error) {
    console.error('Error saving problem:', error)
    throw error
  }
}

export const deleteProblem = async (id) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    await deleteDoc(doc(db, PROBLEMS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting problem:', error)
    throw error
  }
}

// ─── IMPORT / EXPORT ─────────────────────────────────────────────────────────

export const exportProblems = async () => {
  if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
  const problems = await getProblems()
  return JSON.stringify(problems, null, 2)
}

export const exportSingleProblem = (problem) => {
  return JSON.stringify(problem, null, 2)
}

/**
 * Import problems with conflict resolution.
 * @param {Array} incoming - array of problem objects to import
 * @param {Array} existing - current problems in DB
 * @param {Object} resolutions - map of problem title -> 'overwrite' | 'skip' | 'create'
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
export const importProblemsResolved = async (incoming, existing, resolutions) => {
  if (!auth.currentUser) throw new Error('Unauthorized - admin session required')

  let imported = 0
  let skipped = 0

  for (const problem of incoming) {
    const conflict = existing.find(
      (e) => e.title?.toLowerCase() === problem.title?.toLowerCase()
    )

    if (conflict) {
      const action = resolutions[problem.title] || 'skip'
      if (action === 'skip') {
        skipped++
        continue
      } else if (action === 'overwrite') {
        const dataToSave = { ...problem, id: conflict.id, updatedAt: new Date().toISOString() }
        await setDoc(doc(db, PROBLEMS_COLLECTION, conflict.id), dataToSave)
        imported++
      } else if (action === 'create') {
        const newId = `problem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const dataToSave = { ...problem, id: newId, updatedAt: new Date().toISOString() }
        await setDoc(doc(db, PROBLEMS_COLLECTION, newId), dataToSave)
        imported++
      }
    } else {
      const problemId = problem.id || `problem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const dataToSave = { ...problem, id: problemId, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, PROBLEMS_COLLECTION, problemId), dataToSave)
      imported++
    }
  }

  return { imported, skipped }
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────

export const saveSubmission = (problemId, language, code, result) => {
  const submissions = JSON.parse(localStorage.getItem('submissions') || '[]')
  submissions.push({ problemId, language, code, result, timestamp: new Date().toISOString() })
  localStorage.setItem('submissions', JSON.stringify(submissions))
}

export const getSubmissions = (problemId) => {
  const submissions = JSON.parse(localStorage.getItem('submissions') || '[]')
  return submissions.filter((s) => s.problemId === problemId)
}

// ─── TAGS ─────────────────────────────────────────────────────────────────────

export const getTags = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, TAGS_COLLECTION))
    const tags = []
    querySnapshot.forEach((d) => { tags.push({ id: d.id, ...d.data() }) })
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
    await setDoc(doc(db, TAGS_COLLECTION, tagId), tag)
    return { id: tagId, ...tag }
  } catch (error) {
    console.error('Error saving tag:', error)
    throw error
  }
}

export const deleteTag = async (id) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    await deleteDoc(doc(db, TAGS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}

// ─── EDU: COURSES ─────────────────────────────────────────────────────────────

export const getCourses = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COURSES_COLLECTION))
    const courses = []
    querySnapshot.forEach((d) => { courses.push({ id: d.id, ...d.data() }) })
    return courses
  } catch (error) {
    console.error('Error fetching courses:', error)
    return []
  }
}

export const getCourseById = async (id) => {
  try {
    const docSnap = await getDoc(doc(db, COURSES_COLLECTION, id))
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() }
    return null
  } catch (error) {
    console.error('Error fetching course:', error)
    return null
  }
}

export const saveCourse = async (course) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const courseId = course.id || `course_${Date.now()}`
    const dataToSave = { ...course, id: courseId, updatedAt: new Date().toISOString() }
    await setDoc(doc(db, COURSES_COLLECTION, courseId), dataToSave)
    return { id: courseId, ...course }
  } catch (error) {
    console.error('Error saving course:', error)
    throw error
  }
}

export const deleteCourse = async (id) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    await deleteDoc(doc(db, COURSES_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

// ─── EDU: PARAGRAPHS ──────────────────────────────────────────────────────────

export const getParagraphs = async (courseId) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, COURSES_COLLECTION, courseId, 'paragraphs')
    )
    const items = []
    querySnapshot.forEach((d) => { items.push({ id: d.id, ...d.data() }) })
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return items
  } catch (error) {
    console.error('Error fetching paragraphs:', error)
    return []
  }
}

export const saveParagraph = async (courseId, paragraph) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const pId = paragraph.id || `para_${Date.now()}`
    const dataToSave = { ...paragraph, id: pId, updatedAt: new Date().toISOString() }
    await setDoc(
      doc(db, COURSES_COLLECTION, courseId, 'paragraphs', pId),
      dataToSave
    )
    return { id: pId, ...paragraph }
  } catch (error) {
    console.error('Error saving paragraph:', error)
    throw error
  }
}

export const deleteParagraph = async (courseId, paragraphId) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    await deleteDoc(doc(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId))
    return { success: true }
  } catch (error) {
    console.error('Error deleting paragraph:', error)
    throw error
  }
}

// ─── EDU: CHAPTERS ────────────────────────────────────────────────────────────

export const getChapters = async (courseId, paragraphId) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId, 'chapters')
    )
    const items = []
    querySnapshot.forEach((d) => { items.push({ id: d.id, ...d.data() }) })
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return items
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return []
  }
}

export const saveChapter = async (courseId, paragraphId, chapter) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    const cId = chapter.id || `chap_${Date.now()}`
    const dataToSave = { ...chapter, id: cId, updatedAt: new Date().toISOString() }
    await setDoc(
      doc(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId, 'chapters', cId),
      dataToSave
    )
    return { id: cId, ...chapter }
  } catch (error) {
    console.error('Error saving chapter:', error)
    throw error
  }
}

export const deleteChapter = async (courseId, paragraphId, chapterId) => {
  try {
    if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
    await deleteDoc(
      doc(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId, 'chapters', chapterId)
    )
    return { success: true }
  } catch (error) {
    console.error('Error deleting chapter:', error)
    throw error
  }
}
