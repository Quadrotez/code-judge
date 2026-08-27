import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeImportedTask } from '../src/utils/taskImport.js'

const baseTask = {
  title: 'Суммы',
  description: 'Условие',
  inputFormat: 'Ввод',
  outputFormat: 'Вывод',
  initialCode: '',
  tags: ['массивы'],
  tests: [
    { input: '1', output: '1', isHidden: false },
    { input: '2', output: '2', isHidden: true },
  ],
}

test('legacy task without solutions remains compatible', () => {
  const normalized = normalizeImportedTask(JSON.stringify(baseTask))
  assert.deepEqual(normalized.solutions, {})
  assert.equal(normalized.title, 'Суммы')
  assert.equal(normalized.tests.length, 2)
  assert.equal(normalized.tests[0].isHidden, false)
})

test('JSON import preserves Python and C++ solutions', () => {
  const normalized = normalizeImportedTask({
    ...baseTask,
    solutions: {
      python: 'print(1)',
      cpp: '#include <iostream>\nint main() {}',
    },
  })
  assert.deepEqual(normalized.solutions, {
    python: 'print(1)',
    cpp: '#include <iostream>\nint main() {}',
  })
})

test('fenced JSON with a numeric solution is normalized as text', () => {
  const normalized = normalizeImportedTask(`\n\`\`\`json\n${JSON.stringify({ ...baseTask, solutions: { python: 42 } })}\n\`\`\`\n`)
  assert.deepEqual(normalized.solutions, { python: '42' })
})

test('empty solution entries are ignored', () => {
  const normalized = normalizeImportedTask({ ...baseTask, solutions: { python: '  ', cpp: 'ok' } })
  assert.deepEqual(normalized.solutions, { cpp: 'ok' })
})

test('malformed solutions object is rejected', () => {
  assert.throws(
    () => normalizeImportedTask({ ...baseTask, solutions: ['print(1)'] }),
    /solutions.*объект/i,
  )
})

test('a task still needs one open test', () => {
  assert.throws(
    () => normalizeImportedTask({
      ...baseTask,
      tests: [{ input: '1', output: '1', isHidden: true }],
    }),
    /хотя бы один открытый тест/i,
  )
})
