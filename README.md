# Kitsune Donations v1.2
- `/obs` без SSR-помилок (жодних звернень до `window` під час рендеру).
- SSE з heartbeat кожні 15с, щоб не засинав конекшн.
- Для реального вебхука потрібен публічний HTTPS. Не залишайте `ADMIN_TOKEN`, якщо не додаєте заголовок на проксі.

Запуск: `pnpm i && cp .env.example .env.local && pnpm dev`
