# Railway Deployment Guide

## Необхідні змінні середовища

Встановіть ці змінні в Railway Dashboard:

### Обов'язкові змінні:
- `DATABASE_URL` - файл SQLite бази даних: `file:./data/production.db`
- `NEXTAUTH_SECRET` - секретний ключ для NextAuth (згенеруйте випадковий рядок)
- `NEXTAUTH_URL` - URL вашого деплою: `https://your-app-name.railway.app`
- `TWITCH_CLIENT_ID` - ID вашого Twitch додатку
- `TWITCH_CLIENT_SECRET` - секрет вашого Twitch додатку
- `ADMIN_LOGIN` - логін адміністратора
- `ADMIN_PASSWORD` - пароль адміністратора
- `MONOBANK_USER_ID` - ID користувача для Monobank
- `ENCRYPTION_KEY` - 32-символьний ключ шифрування

### Опціональні змінні для TTS:
- `GOOGLE_CLOUD_PROJECT_ID` - ID проекту Google Cloud
- `GOOGLE_CLOUD_CLIENT_EMAIL` - email сервісного акаунту
- `GOOGLE_CLOUD_PRIVATE_KEY` - приватний ключ сервісного акаунту

## Кроки деплойменту:

1. **Створіть новий проект на Railway**
   - Зайдіть на railway.app
   - Натисніть "New Project"
   - Виберіть "Deploy from GitHub repo"

2. **Підключіть GitHub репозиторій**
   - Виберіть ваш репозиторій
   - Railway автоматично виявить Next.js проект

3. **Встановіть змінні середовища**
   - Перейдіть в розділ "Variables"
   - Додайте всі необхідні змінні з списку вище

4. **Налаштуйте домен**
   - В розділі "Settings" -> "Domains"
   - Згенеруйте Railway домен або підключіть власний

5. **Деплой відбудеться автоматично**
   - Railway використає nixpacks.toml для збірки
   - База даних SQLite буде ініціалізована автоматично

## Важливі примітки:

- SQLite файл зберігається в контейнері і може бути втрачений при рестарті
- Для продакшену рекомендується використовувати Railway PostgreSQL
- Переконайтесь, що всі змінні середовища встановлені правильно
- При зміні схеми БД виконайте `npm run db:push` в Railway console

## Команди для управління БД в Railway:

```bash
# Згенерувати Prisma клієнт
npm run db:generate

# Примінити міграції
npm run db:migrate

# Синхронізувати схему з БД
npm run db:push
```
