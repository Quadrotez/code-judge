/**
 * src/utils/storage.js
 *
 * Единая точка доступа к хранилищу данных.
 *
 * Если переменная окружения VITE_CODEJUDGE_TESTMODE === '1',
 * все операции перенаправляются в одноразовую in-memory БД (memoryDb.js),
 * которая не требует Firebase и сбрасывается при перезагрузке страницы.
 *
 * В противном случае используется Firestore (поведение без изменений).
 */

// ─── Определяем режим работы ──────────────────────────────────────────────────

export const IS_TEST_MODE = 
  import.meta.env.VITE_CODEJUDGE_TESTMODE === '1' || 
  import.meta.env.CODEJUDGE_TESTMODE === '1'

if (IS_TEST_MODE) {
  console.warn(
    '[CodeJudge] ТЕСТОВЫЙ РЕЖИМ АКТИВЕН (CODEJUDGE_TESTMODE=1). ' +
    'Данные хранятся только в памяти и будут потеряны при перезагрузке страницы.'
  )
}

// ─── Firestore imports (только в production-режиме) ───────────────────────────

import {
  memGetProblems, memGetProblemById, memSaveProblem, memDeleteProblem,
  memGetTags, memSaveTag, memDeleteTag,
  memExportProblems, memImportProblemsResolved,
  memGetCourses, memGetCourseById, memSaveCourse, memDeleteCourse,
  memGetParagraphs, memSaveParagraph, memDeleteParagraph,
  memGetChapters, memSaveChapter, memDeleteChapter,
} from './memoryDb'

// Firestore и auth импортируются статически, но используются только при IS_TEST_MODE === false.
// Это безопасно: Vite/ESM всегда загружает статические импорты, но Firebase SDK
// инициализируется лениво при первом обращении к firebaseConfig.js.
import { db, auth } from './firebaseConfig'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROBLEMS_COLLECTION = 'problems'
const TAGS_COLLECTION = 'tags'
const COURSES_COLLECTION = 'courses'

const requireFirestoreAuth = () => {
  if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
}

// ─── PROBLEMS ────────────────────────────────────────────────────────────────

export const getProblems = async () => {
  if (IS_TEST_MODE) return memGetProblems()
  try {
    const querySnapshot = await getDocs(collection(db, PROBLEMS_COLLECTION))
    const problems = []
    querySnapshot.forEach((d) => { problems.push({ id: d.id, ...d.data() }) })
    return problems
  } catch (error) {
    console.error('Error fetching problems:', error)
    return []
  }
}

export const getProblemById = async (id) => {
  if (IS_TEST_MODE) return memGetProblemById(id)
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
  if (IS_TEST_MODE) return memSaveProblem(problem)
  try {
    requireFirestoreAuth()
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
  if (IS_TEST_MODE) return memDeleteProblem(id)
  try {
    requireFirestoreAuth()
    await deleteDoc(doc(db, PROBLEMS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting problem:', error)
    throw error
  }
}

// ─── IMPORT / EXPORT ─────────────────────────────────────────────────────────

export const exportProblems = async () => {
  if (IS_TEST_MODE) return memExportProblems()
  if (!auth.currentUser) throw new Error('Unauthorized - admin session required')
  const problems = await getProblems()
  return JSON.stringify(problems, null, 2)
}

export const exportSingleProblem = (problem) => {
  return JSON.stringify(problem, null, 2)
}

export const importProblemsResolved = async (incoming, existing, resolutions) => {
  if (IS_TEST_MODE) return memImportProblemsResolved(incoming, existing, resolutions)
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
// Submissions всегда хранятся в localStorage (не в Firestore), режим не влияет.

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
  if (IS_TEST_MODE) return memGetTags()
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
  if (IS_TEST_MODE) return memSaveTag(tag)
  try {
    requireFirestoreAuth()
    const tagId = tag.id || `tag_${Date.now()}`
    await setDoc(doc(db, TAGS_COLLECTION, tagId), tag)
    return { id: tagId, ...tag }
  } catch (error) {
    console.error('Error saving tag:', error)
    throw error
  }
}

export const deleteTag = async (id) => {
  if (IS_TEST_MODE) return memDeleteTag(id)
  try {
    requireFirestoreAuth()
    await deleteDoc(doc(db, TAGS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
}

// ─── EDU: COURSES ─────────────────────────────────────────────────────────────

export const getCourses = async () => {
  if (IS_TEST_MODE) return memGetCourses()
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
  if (IS_TEST_MODE) return memGetCourseById(id)
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
  if (IS_TEST_MODE) return memSaveCourse(course)
  try {
    requireFirestoreAuth()
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
  if (IS_TEST_MODE) return memDeleteCourse(id)
  try {
    requireFirestoreAuth()
    await deleteDoc(doc(db, COURSES_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

// ─── EDU: PARAGRAPHS ──────────────────────────────────────────────────────────

export const getParagraphs = async (courseId) => {
  if (IS_TEST_MODE) return memGetParagraphs(courseId)
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
  if (IS_TEST_MODE) return memSaveParagraph(courseId, paragraph)
  try {
    requireFirestoreAuth()
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
  if (IS_TEST_MODE) return memDeleteParagraph(courseId, paragraphId)
  try {
    requireFirestoreAuth()
    await deleteDoc(doc(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId))
    return { success: true }
  } catch (error) {
    console.error('Error deleting paragraph:', error)
    throw error
  }
}

// ─── EDU: CHAPTERS ────────────────────────────────────────────────────────────

export const getChapters = async (courseId, paragraphId) => {
  if (IS_TEST_MODE) return memGetChapters(courseId, paragraphId)
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
  if (IS_TEST_MODE) return memSaveChapter(courseId, paragraphId, chapter)
  try {
    requireFirestoreAuth()
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
  if (IS_TEST_MODE) return memDeleteChapter(courseId, paragraphId, chapterId)
  try {
    requireFirestoreAuth()
    await deleteDoc(
      doc(db, COURSES_COLLECTION, courseId, 'paragraphs', paragraphId, 'chapters', chapterId)
    )
    return { success: true }
  } catch (error) {
    console.error('Error deleting chapter:', error)
    throw error
  }
}
