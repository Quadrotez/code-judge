#!/bin/bash
echo "🚀 Олимпиадный судья - быстрый старт"

if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
else
    echo "✅ Зависимости уже установлены"
fi

echo ""
echo "🌐 Запуск сервера на http://localhost:3001"
echo "🌐 Запуск фронтенда на http://localhost:5173"
echo "💡 Для админ-панели перейди на http://localhost:5173/admin"
echo "🛑 Для выхода нажми Ctrl+C"
echo ""

# Start backend server in background
echo "⚙️  Запуск backend сервера..."
npm run server &
BACKEND_PID=$!

# Start frontend dev server
echo "📱 Запуск frontend сервера..."
npm run dev

# Kill backend when frontend stops
kill $BACKEND_PID 2>/dev/null

