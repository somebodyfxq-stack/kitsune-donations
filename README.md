# Kitsune Donations v1.2
- `/obs` без SSR-помилок (жодних звернень до `window` під час рендеру).
- SSE з heartbeat кожні 15с, щоб не засинав конекшн.
- Для реального вебхука потрібен публічний HTTPS. Встановіть `MONOBANK_WEBHOOK_URL` і за бажанням `MONOBANK_WEBHOOK_SECRET` для перевірки підпису `X-Sign`.
- Якщо встановлено `MONOBANK_TOKEN`, ендпоінт `/api/monobank/status` автоматично реєструє вебхук на адресу з `MONOBANK_WEBHOOK_URL`.

Запуск: `pnpm i && cp .env.example .env.local && pnpm dev`
