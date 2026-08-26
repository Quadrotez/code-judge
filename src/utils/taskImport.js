const DIFFICULTY_LABELS = {
  easy: 'начальная',
  medium: 'средняя',
  hard: 'сложная',
  olympiad: 'олимпиадная',
}

const stripJsonCodeFence = (value) => {
  const text = String(value || '').trim()
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : text
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
- Не добавляй решение, объяснение алгоритма или подсказки.
- Верни только валидный JSON без Markdown-обёртки, комментариев и дополнительного текста.

Точная схема ответа:
{
  "title": "Короткое название задачи",
  "description": "Полное условие задачи в Markdown",
  "inputFormat": "Формат входных данных в Markdown",
  "outputFormat": "Формат выходных данных в Markdown",
  "initialCode": "Необязательный стартовый шаблон без готового решения; обычно пустая строка",
  "tags": ["${inputTopic}"],
  "tests": [
    {
      "input": "Строка входных данных для одного теста",
      "output": "Точный ожидаемый вывод",
      "isHidden": false
    }
  ]
}

Сгенерируй не менее пяти тестов. Минимум два теста должны быть открытыми (isHidden: false), остальные можно сделать скрытыми (isHidden: true). Поля id, hidden, updatedAt, solutions, options и type добавлять нельзя. Поле isHidden разрешено только внутри объектов tests.`
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
    try {
      parsed = JSON.parse(stripJsonCodeFence(value))
    } catch {
      throw new Error('Не удалось разобрать JSON. Вставьте объект задачи без лишнего текста.')
    }
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
    tags,
    tests: normalizedTests,
  }
}

export const getDifficultyLabel = (difficulty) => DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium
