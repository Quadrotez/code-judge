@echo off
echo 🚀 Олимпиадный судья - быстрый старт

if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    call npm install
) else (
    echo ✅ Зависимости уже установлены
)

echo.
echo 🌐 Запуск backend сервера на http://localhost:3001
echo 🌐 Запуск frontend сервера на http://localhost:5173
echo 💡 Для админ-панели перейди на http://localhost:5173/admin
echo 🛑 Для выхода нажми Ctrl+C
echo.

echo ⚙️  Запуск backend сервера...
start cmd /k npm run server

echo 📱 Запуск frontend сервера...
call npm run dev

