/**
 * src/utils/memoryDb.js
 *
 * Одноразовая in-memory база данных, которая используется вместо Firestore
 * когда переменная окружения VITE_CODEJUDGE_TESTMODE === '1'.
 *
 * Данные живут только в памяти текущей вкладки браузера и сбрасываются
 * при перезагрузке страницы — идеально для тестирования без Firebase.
 *
 * API намеренно повторяет сигнатуры Firestore-функций из storage.js,
 * поэтому storage.js просто переключается между двумя реализациями.
 */

// ─── Хранилище ────────────────────────────────────────────────────────────────

const store = {
  problems: new Map(),
  tags: new Map(),
  courses: new Map(),
  // Параграфы и главы хранятся вложенно: courseId -> paragraphId -> chapter
  paragraphs: new Map(), // key: courseId, value: Map<paraId, para>
  chapters: new Map(),   // key: `${courseId}/${paraId}`, value: Map<chapId, chap>
}

// Флаг авторизации (в тестовом режиме всегда считаем, что авторизованы)
let _isLoggedIn = false

// ─── Вспомогательные функции ──────────────────────────────────────────────────

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const requireAuth = () => {
  if (!_isLoggedIn) throw new Error('[TestMode] Unauthorized — call memLoginAdmin() first')
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const memLoginAdmin = (password) => {
  // В тестовом режиме принимаем любой пароль
  _isLoggedIn = true
  _notifyAuth()
  return Promise.resolve(true)
}

export const memLogoutAdmin = () => {
  _isLoggedIn = false
  _notifyAuth()
  return Promise.resolve()
}

export const memIsLoggedIn = () => _isLoggedIn

/** Подписка на изменение авторизации (упрощённая, без Firebase) */
const _authListeners = new Set()
export const memOnAuthUpdate = (callback) => {
  _authListeners.add(callback)
  // Сразу вызываем с текущим состоянием
  callback(_isLoggedIn ? { uid: 'test-admin' } : null)
  return () => _authListeners.delete(callback)
}

const _notifyAuth = () => {
  const user = _isLoggedIn ? { uid: 'test-admin' } : null
  _authListeners.forEach((cb) => cb(user))
}

// ─── Problems ─────────────────────────────────────────────────────────────────

export const memGetProblems = async () => {
  return Array.from(store.problems.values())
}

export const memGetProblemById = async (id) => {
  return store.problems.get(id) || null
}

export const memSaveProblem = async (problem) => {
  requireAuth()
  const id = problem.id || genId('problem')
  const data = { ...problem, id, updatedAt: new Date().toISOString() }
  store.problems.set(id, data)
  return data
}

export const memDeleteProblem = async (id) => {
  requireAuth()
  store.problems.delete(id)
  return { success: true }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const memGetTags = async () => {
  return Array.from(store.tags.values())
}

export const memSaveTag = async (tag) => {
  requireAuth()
  const id = tag.id || genId('tag')
  const data = { ...tag, id }
  store.tags.set(id, data)
  return data
}

export const memDeleteTag = async (id) => {
  requireAuth()
  store.tags.delete(id)
  return { success: true }
}

// ─── Import / Export ──────────────────────────────────────────────────────────

export const memExportProblems = async () => {
  requireAuth()
  return JSON.stringify(Array.from(store.problems.values()), null, 2)
}

export const memImportProblemsResolved = async (incoming, existing, resolutions) => {
  requireAuth()
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
        const data = { ...problem, id: conflict.id, updatedAt: new Date().toISOString() }
        store.problems.set(conflict.id, data)
        imported++
      } else if (action === 'create') {
        const newId = genId('problem')
        const data = { ...problem, id: newId, updatedAt: new Date().toISOString() }
        store.problems.set(newId, data)
        imported++
      }
    } else {
      const id = problem.id || genId('problem')
      const data = { ...problem, id, updatedAt: new Date().toISOString() }
      store.problems.set(id, data)
      imported++
    }
  }

  return { imported, skipped }
}

// ─── Course Export / Import ───────────────────────────────────────────────────

export const memExportCourse = async (courseId) => {
  requireAuth()
  const course = store.courses.get(courseId)
  if (!course) throw new Error('Course not found')

  const parasMap = store.paragraphs.get(courseId) || new Map()
  const paragraphs = Array.from(parasMap.values())
  paragraphs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  for (const para of paragraphs) {
    const key = `${courseId}/${para.id}`
    const chapsMap = store.chapters.get(key) || new Map()
    const chapters = Array.from(chapsMap.values())
    chapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    para.chapters = chapters
  }

  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), course, paragraphs }, null, 2)
}

export const memApplyCourseImportChanges = async (courseId, acceptedChanges) => {
  requireAuth()

  for (const change of acceptedChanges) {
    if (change.type === 'course-field') {
      const current = store.courses.get(courseId) || {}
      store.courses.set(courseId, { ...current, [change.field]: change.newVal, updatedAt: new Date().toISOString() })
    } else if (change.type === 'paragraph-add') {
      if (!store.paragraphs.has(courseId)) store.paragraphs.set(courseId, new Map())
      const pId = genId('para')
      const { chapters, ...paraFields } = change.paragraphData
      store.paragraphs.get(courseId).set(pId, { ...paraFields, id: pId, updatedAt: new Date().toISOString() })
      if (chapters?.length) {
        const key = `${courseId}/${pId}`
        store.chapters.set(key, new Map())
        for (const chap of chapters) {
          const cId = genId('chap')
          store.chapters.get(key).set(cId, { ...chap, id: cId, updatedAt: new Date().toISOString() })
        }
      }
    } else if (change.type === 'paragraph-modify') {
      if (!store.paragraphs.has(courseId)) store.paragraphs.set(courseId, new Map())
      store.paragraphs.get(courseId).set(
        change.paragraphId,
        { ...change.paragraphData, updatedAt: new Date().toISOString() }
      )
    } else if (change.type === 'chapter-add') {
      const key = `${courseId}/${change.paragraphId}`
      if (!store.chapters.has(key)) store.chapters.set(key, new Map())
      const cId = genId('chap')
      store.chapters.get(key).set(cId, { ...change.chapterData, id: cId, updatedAt: new Date().toISOString() })
    } else if (change.type === 'chapter-modify') {
      const key = `${courseId}/${change.paragraphId}`
      if (!store.chapters.has(key)) store.chapters.set(key, new Map())
      store.chapters.get(key).set(
        change.chapterId,
        { ...change.chapterData, updatedAt: new Date().toISOString() }
      )
    }
  }
  return { success: true }
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export const memGetCourses = async () => {
  return Array.from(store.courses.values())
}

export const memGetCourseById = async (id) => {
  return store.courses.get(id) || null
}

export const memSaveCourse = async (course) => {
  requireAuth()
  const id = course.id || genId('course')
  const data = { ...course, id, updatedAt: new Date().toISOString() }
  store.courses.set(id, data)
  return data
}

export const memDeleteCourse = async (id) => {
  requireAuth()
  store.courses.delete(id)
  // Каскадно удаляем параграфы и главы
  store.paragraphs.delete(id)
  for (const key of store.chapters.keys()) {
    if (key.startsWith(id + '/')) store.chapters.delete(key)
  }
  return { success: true }
}

// ─── Paragraphs ───────────────────────────────────────────────────────────────

export const memGetParagraphs = async (courseId) => {
  const map = store.paragraphs.get(courseId) || new Map()
  const items = Array.from(map.values())
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return items
}

export const memSaveParagraph = async (courseId, paragraph) => {
  requireAuth()
  if (!store.paragraphs.has(courseId)) store.paragraphs.set(courseId, new Map())
  const id = paragraph.id || genId('para')
  const data = { ...paragraph, id, updatedAt: new Date().toISOString() }
  store.paragraphs.get(courseId).set(id, data)
  return data
}

export const memDeleteParagraph = async (courseId, paragraphId) => {
  requireAuth()
  store.paragraphs.get(courseId)?.delete(paragraphId)
  store.chapters.delete(`${courseId}/${paragraphId}`)
  return { success: true }
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export const memGetChapters = async (courseId, paragraphId) => {
  const key = `${courseId}/${paragraphId}`
  const map = store.chapters.get(key) || new Map()
  const items = Array.from(map.values())
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return items
}

export const memSaveChapter = async (courseId, paragraphId, chapter) => {
  requireAuth()
  const key = `${courseId}/${paragraphId}`
  if (!store.chapters.has(key)) store.chapters.set(key, new Map())
  const id = chapter.id || genId('chap')
  const data = { ...chapter, id, updatedAt: new Date().toISOString() }
  store.chapters.get(key).set(id, data)
  return data
}

export const memDeleteChapter = async (courseId, paragraphId, chapterId) => {
  requireAuth()
  const key = `${courseId}/${paragraphId}`
  store.chapters.get(key)?.delete(chapterId)
  return { success: true }
}
