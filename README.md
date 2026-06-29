# 🏆 Олимпиадный судья

Веб-приложение для проверки решений учеников по программированию. Поддерживает Python (через Pyodide) и готово для C++ (требует доп. конфигурации).

## 🚀 Быстрый старт

### 1. Установка

```bash
# Клонируем репо
git clone <ссылка на репо>
cd judge-site

# Устанавливаем зависимости
npm install

# Запускаем локально
npm run dev
```

Откроешь [http://localhost:5173](http://localhost:5173)

### 2. Первый запуск

1. Перейди на `/admin`
2. Система попросит установить пароль (первый visitor создает пароль)
3. Введи пароль
4. Теперь ты в админ-панели!

### 3. Добавление задачи

В админ-панели:
- Нажми **➕ Новая задача**
- Заполни форму:
  - **Название** - название задачи
  - **Описание** - условие задачи (поддерживает текст)
  - **Формат ввода** - описание входных данных
  - **Формат вывода** - описание выходных данных
  - **Решение** (опционально) - эталонное решение (показывается по кнопке)
  - **Время** - лимит времени выполнения (ms)
  - **Память** - лимит памяти (MB) (сейчас не используется)
  - **Тесты** - JSON массив с тестами

### 4. Формат тестов

```json
[
  {
    "input": "1\n2",
    "output": "3"
  },
  {
    "input": "10\n20",
    "output": "30"
  }
]
```

**input** - входные данные (строки разделяются `\n`)  
**output** - ожидаемый вывод

## 📝 Примеры

### Пример 1: Сумма двух чисел

```
Название: Сумма двух чисел
Описание: Прочитай два целых числа и выведи их сумму
Формат ввода: Два целых числа на отдельных строках
Формат вывода: Одно целое число - сумма

Тесты:
[
  {"input": "1\n2", "output": "3"},
  {"input": "-5\n10", "output": "5"},
  {"input": "0\n0", "output": "0"}
]
```

**Python решение:**
```python
a = int(input())
b = int(input())
print(a + b)
```

### Пример 2: Четные числа

```
Название: Четные числа
Описание: Дан массив чисел. Выведи все четные числа.
Формат ввода: Первая строка - N (количество чисел), затем N чисел
Формат вывода: Четные числа по одному на строке

Тесты:
[
  {"input": "4\n1\n2\n3\n4", "output": "2\n4"},
  {"input": "5\n1\n1\n1\n1\n1", "output": ""}
]
```

**Python решение:**
```python
n = int(input())
for _ in range(n):
    num = int(input())
    if num % 2 == 0:
        print(num)
```

## 📤 Экспорт и импорт задач

### Экспорт
- В админ-панели нажми **📥 Экспорт**
- Скачается файл `problems.json` со всеми задачами

### Импорт
- В админ-панели нажми **📤 Импорт**
- Выбери файл `problems.json`
- Задачи добавятся в хранилище

## 🌐 Размещение на GitHub Pages

### 1. Создай репозиторий

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/judge-site.git
git push -u origin main
```

### 2. Сборка

```bash
npm run build
```

Сайт соберется в папку `dist/`

### 3. Деплой на GitHub Pages

**Способ 1: Автоматический (GitHub Actions)**

Создай файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist
      
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Способ 2: Ручной деплой**

```bash
npm run build
npx gh-pages -d dist
```

Потом в настройках GitHub Pages выбери ветку `gh-pages` как source.

### 4. Настройка base в vite.config.js

Если твой репо называется `judge-site`:

```javascript
export default defineConfig({
  base: '/judge-site/',  // ← добавь это
  // ...
})
```

Если используешь корневой домен:

```javascript
export default defineConfig({
  base: './',
  // ...
})
```

## 🔐 Безопасность

⚠️ **Важно!** Этот сайт использует:
- **localStorage** - для хранения паролей и задач (локально в браузере)
- **Base64** - для шифрования пароля (не криптографически стойкий!)

Для production используй настоящее шифрование и сервер!

## 🐍 Поддержка Python

Реализовано через [Pyodide](https://pyodide.org/) - Python в браузере.

**Работает:**
- Стандартная библиотека Python (большинство модулей)
- `input()` / `print()`
- Лимиты времени

**Не работает:**
- Системные вызовы
- Некоторые нативные модули
- Асинхронный код

## 🔧 C++ поддержка

Для C++ нужна предварительная компиляция через Emscripten:

```bash
# На локальной машине (требует Emscripten)
emcc solution.cpp -o solution.js -s WASM=1

# Потом загрузи решение в админ-панель как бинарник
```

На данный момент C++ в админ-панели - placeholder. Можешь просить пользователей загружать Python.

## 📊 Структура данных

### Задача (Task)
```json
{
  "id": "task_1234567890",
  "title": "Название",
  "description": "Условие...",
  "inputFormat": "Формат входных данных",
  "outputFormat": "Формат выходных данных",
  "solution": "# Python код",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "examples": [
    {
      "input": "1\n2",
      "output": "3",
      "explanation": "1 + 2 = 3"
    }
  ],
  "tests": [
    {"input": "1\n2", "output": "3"},
    {"input": "5\n6", "output": "11"}
  ]
}
```

### Результат тестирования
```json
{
  "problemId": "task_123",
  "language": "python",
  "code": "# код пользователя",
  "result": {
    "allPassed": true,
    "passedCount": 5,
    "totalCount": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🛠️ Разработка

```bash
# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Превью production версии
npm run preview
```

## 📚 Технологии

- **React 18** - UI фреймворк
- **Vite** - быстрая сборка
- **React Router** - навигация
- **Pyodide** - Python в браузере
- **Vanilla CSS** - стили

## 🤝 Контрибьютинг

Идеи для улучшения:
- [ ] Поддержка C++
- [ ] Таймауты для тестов
- [ ] История тестирования
- [ ] Темный режим
- [ ] Поддержка JavaScript
- [ ] Система рейтинга

## 📝 Лицензия

MIT

## 💬 Вопросы?

Если что-то не работает:
1. Проверь консоль браузера (F12)
2. Убедись что Pyodide загрузился
3. Проверь format тестов (JSON)
4. Перезагрузи страницу
