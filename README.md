# Kitsune Donations v1.2
- `/obs` без SSR-помилок (жодних звернень до `window` під час рендеру).
- SSE з heartbeat кожні 15с, щоб не засинав конекшн.
- Для реального вебхука потрібен публічний HTTPS. За бажанням встановіть `MONOBANK_WEBHOOK_SECRET` і перевіряйте підпис `X-Sign`.
- Якщо встановлено `MONOBANK_TOKEN`, ендпоінт `/api/monobank/status` автоматично реєструє вебхук на `/api/monobank/webhook`.

Запуск: `pnpm i && cp .env.example .env.local && pnpm dev`
