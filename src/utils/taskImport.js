const DIFFICULTY_LABELS = {
  easy: 'начальная',
  medium: 'средняя',
  hard: 'сложная',
  olympiad: 'олимпиадная',
}

const JSON_ESCAPE_CHARS = '"\\/bfnrt'

const extractJsonCandidate = (value) => {
  const text = String(value || '').replace(/^\uFEFF/, '').trim()
  if (!text) return text

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) return fenced[1].trim()

  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  const starts = [objectStart, arrayStart].filter((index) => index >= 0)
  if (starts.length === 0) return text

  const start = Math.min(...starts)
  const objectEnd = text.lastIndexOf('}')
  const arrayEnd = text.lastIndexOf(']')
  const end = Math.max(objectEnd, arrayEnd)

  return end > start ? text.slice(start, end + 1).trim() : text
}

// Нейросети часто вставляют LaTeX-команды прямо в JSON-строки: например, "\\le".
// В JSON обратный слэш перед неизвестной последовательностью нужно экранировать.
const repairJsonStrings = (value) => {
  let repaired = ''
  let inString = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]

    if (!inString) {
      repaired += char
      if (char === '"') inString = true
      continue
    }

    if (char === '"') {
      repaired += char
      inString = false
      continue
    }

    if (char === '\\') {
      const next = value[index + 1]
      const unicodeDigits = value.slice(index + 2, index + 6)

      if (JSON_ESCAPE_CHARS.includes(next)) {
        repaired += char + next
        index += 1
        continue
      }

      if (next === 'u' && /^[0-9a-f]{4}$/i.test(unicodeDigits)) {
        repaired += value.slice(index, index + 6)
        index += 5
        continue
      }

      repaired += '\\\\'
      continue
    }

    if (char === '\n') {
      repaired += '\\n'
      continue
    }

    if (char === '\r') {
      if (value[index + 1] === '\n') index += 1
      repaired += '\\n'
      continue
    }

    repaired += char
  }

  return repaired
}

const parseImportedJson = (value) => {
  const candidate = extractJsonCandidate(value)

  try {
    return JSON.parse(candidate)
  } catch (initialError) {
    try {
      return JSON.parse(repairJsonStrings(candidate))
    } catch {
      const position = initialError.message.match(/position (\d+)/i)?.[1]
      const suffix = position ? ` Ошибка обнаружена около символа ${position}.` : ''
      throw new Error(`Не удалось разобрать JSON.${suffix} Убедитесь, что ответ содержит один объект задачи.`)
    }
  }
}

const asText = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new Error(`Поле «${fieldName}» обязательно`)
    return ''
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Поле «${fieldName}» должно быть строкой`)
  }

  const text = String(value).trim()
  if (required && !text) throw new Error(`Поле «${fieldName}» не может быть пустым`)
  return text
}

const normalizeSolutions = (value) => {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Поле «solutions» должно быть объектом вида {"python": "...", "cpp": "..."}')
  }

  const solutions = {}
  for (const [language, code] of Object.entries(value)) {
    const normalizedLanguage = String(language || '').trim().toLowerCase()
    if (!normalizedLanguage) continue
    const normalizedCode = asText(code, `solutions.${normalizedLanguage}`)
    if (normalizedCode) solutions[normalizedLanguage] = normalizedCode
  }
  return solutions
}

export const createTaskPrompt = ({ topic, description, difficulty }) => {
  const selectedDifficulty = DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium
  const inputTopic = String(topic || '').trim()
  const inputDescription = String(description || '').trim()

  return `Ты — автор задач для тренировок по олимпиадному программированию. Составь одну новую, оригинальную задачу на тему «${inputTopic}».

Требования пользователя:
- Желаемая сложность: ${selectedDifficulty}.
- Дополнительное описание идеи или ограничений: ${inputDescription}.
- Задача должна иметь однозначное решение, реалистичные ограничения и тесты, проверяющие граничные случаи.
- Условие, формат ввода и формат вывода пиши на русском языке в Markdown. Формулы можно записывать в LaTeX.
- Ответ должен быть синтаксически валидным JSON: используй только двойные кавычки вокруг ключей и строковых значений.
- Каждый перенос строки внутри значения кодируй как последовательность \\n из двух символов — обратного слэша и буквы n. Не вставляй настоящий перенос строки внутрь JSON-строки.
- Каждый обратный слэш в LaTeX экранируй двойным слэшем: например, \\\\le, \\\\dots и \\\\alpha.
- Не добавляй лишние обратные слэши перед обычными буквами вне LaTeX.
- Решение необязательно. Если добавляешь его, положи разбор в объект solutions с ключами python и/или cpp; не добавляй готовое решение в initialCode.
- Верни только валидный JSON без Markdown-обёртки, комментариев и дополнительного текста.

Точная схема ответа:
{
  "title": "Короткое название задачи",
  "description": "Полное условие задачи в Markdown",
  "inputFormat": "Формат входных данных в Markdown",
  "outputFormat": "Формат выходных данных в Markdown",
  "initialCode": "Необязательный стартовый шаблон без готового решения; обычно пустая строка",
  "solutions": {
    "python": "Необязательный разбор и код на Python",
    "cpp": "Необязательный разбор и код на C++17"
  },
  "tags": ["${inputTopic}"],
  "tests": [
    {
      "input": "Строка входных данных для одного теста",
      "output": "Точный ожидаемый вывод",
      "isHidden": false
    }
  ]
}

Сгенерируй не менее пяти тестов. Минимум два теста должны быть открытыми (isHidden: false), остальные можно сделать скрытыми (isHidden: true). Поля id, hidden, updatedAt, options и type добавлять нельзя. Поле isHidden разрешено только внутри объектов tests.`
}

const normalizeTest = (test, index) => {
  if (!test || typeof test !== 'object' || Array.isArray(test)) {
    throw new Error(`Тест #${index + 1} должен быть объектом`)
  }

  if (!Object.prototype.hasOwnProperty.call(test, 'input')) {
    throw new Error(`У теста #${index + 1} отсутствует поле «input»`)
  }
  if (!Object.prototype.hasOwnProperty.call(test, 'output')) {
    throw new Error(`У теста #${index + 1} отсутствует поле «output»`)
  }

  return {
    id: `sandbox_test_${index + 1}`,
    input: asText(test.input, `tests[${index}].input`),
    output: asText(test.output, `tests[${index}].output`),
    isHidden: test.isHidden === true,
  }
}

export const normalizeImportedTask = (value) => {
  let parsed = value

  if (typeof value === 'string') {
    parsed = parseImportedJson(value)
  }

  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error('Импортировать можно ровно одну задачу')
    }
    parsed = parsed[0]
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON должен содержать объект одной задачи')
  }

  if (parsed.type && parsed.type !== 'code') {
    throw new Error('В песочнице поддерживаются только задачи с программным решением')
  }

  const tests = Array.isArray(parsed.tests) ? parsed.tests : []
  if (tests.length === 0) {
    throw new Error('В задаче должен быть хотя бы один тест в поле «tests»')
  }

  const normalizedTests = tests.map(normalizeTest)
  const openTests = normalizedTests.filter((test) => !test.isHidden)
  if (openTests.length === 0) {
    throw new Error('Оставьте хотя бы один открытый тест с «isHidden»: false')
  }

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8)
    : []

  return {
    id: `sandbox_task_${Date.now()}`,
    title: asText(parsed.title, 'title', { required: true }),
    description: asText(parsed.description, 'description', { required: true }),
    inputFormat: asText(parsed.inputFormat, 'inputFormat'),
    outputFormat: asText(parsed.outputFormat, 'outputFormat'),
    initialCode: asText(parsed.initialCode, 'initialCode'),
    solutions: normalizeSolutions(parsed.solutions),
    tags,
    tests: normalizedTests,
  }
}

export const getDifficultyLabel = (difficulty) => DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium
