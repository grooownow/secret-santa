# Что сделать заказчице для запуска Тайного Санты

Здесь только шаги, для которых нужен твой вход в аккаунты. Базу Neon, хранилище фото, остальные переменные, миграции и деплой делаю я.

Секреты в чат и в git не отправляем. Ты вставляешь их прямо в Vercel. Исключение одно: Client ID из шага 2 не секрет, его можно прислать.

## Как добавлять переменную в Vercel

Vercel → проект → **Settings → Environment Variables** → **Add Environment Variable**:

1. **Type**: **Secret** или **Config**, по таблице ниже. Secret после сохранения не показывается, его можно только перезаписать. Config остаётся читаемым.
2. **Key**: имя переменной ровно как в таблице.
3. **Value**: значение.
4. **Note** можно оставить пустым.
5. **Environments**: только **Production**. Не добавляй их в Preview: иначе тестовые сборки будут слать настоящие письма и работать с боевой базой.
6. **Save**.

| Переменная           | Type                           |
| -------------------- | ------------------------------ |
| `GMAIL_USER`         | Config: это просто адрес ящика |
| `GMAIL_APP_PASSWORD` | **Secret**                     |
| `AUTH_GOOGLE_ID`     | Config: Client ID не секрет    |
| `AUTH_GOOGLE_SECRET` | **Secret**                     |
| `GROQ_API_KEY`       | **Secret**                     |

## 1. Gmail для рассылки писем

1. Заведи новый Gmail для игры, например `bialto.santa@gmail.com`.
2. Включи двухэтапную проверку: myaccount.google.com → **Безопасность** → **Двухэтапная аутентификация**.
3. Открой myaccount.google.com/apppasswords → введи название, например `santa-site` → **Создать**. Google покажет пароль из 16 букв.
4. Добавь в Vercel две переменные:
   - `GMAIL_USER` = адрес нового Gmail, Type **Config**;
   - `GMAIL_APP_PASSWORD` = 16 букв без пробелов, Type **Secret**.

После 10 января этот ящик нужно удалить вручную: в нём остаются копии отправленных писем.

## 2. Вход через Google

Нужен адрес сайта вида `https://имя-проекта.vercel.app`. Он есть в Vercel → проект → **Settings → Domains**.

Баннер Google Cloud про Free Trial на $300 игнорируй: для входа через Google оплата не нужна.

1. console.cloud.google.com → выбери или создай проект (например `secret-santa`) → открой **Google Auth Platform**.
2. **Branding**: App name `Тайный Санта Bialto`, User support email и Developer contact email — твоя почта. Логотип и ссылки не нужны. **Save**.
3. **Audience**: User type **External**. В блоке Publishing status нажми **Publish app** → подтверди. Статус должен стать **In production**: в режиме Testing войти смогут только вручную добавленные люди. Для почты и имени проверка Google не нужна.
4. **Data Access**: ничего не добавляй, почта и имя есть по умолчанию.
5. **Clients → Create client**:
   - Application type: **Web application**, имя `santa-site`;
   - Authorized JavaScript origins: `https://имя-проекта.vercel.app` и `http://localhost:3210`;
   - Authorized redirect URIs: `https://имя-проекта.vercel.app/api/auth/callback/google` и `http://localhost:3210/api/auth/callback/google`;
   - **Create**.
6. Google покажет **Client ID** и **Client secret**. Сразу скопируй секрет или скачай JSON: позже его может быть не видно, тогда придётся создавать новый.
7. Добавь в Vercel:
   - `AUTH_GOOGLE_ID` = Client ID, вида `…apps.googleusercontent.com`, Type **Config**;
   - `AUTH_GOOGLE_SECRET` = Client secret, Type **Secret**.

## 3. Ключ автоперевода Groq

1. console.groq.com → войди, карта не нужна.
2. **API Keys → Create API Key** → имя `santa-site` → скопируй ключ, он показывается один раз.
3. Добавь в Vercel: `GROQ_API_KEY` = ключ, Type **Secret**.

## 4. Войти в Vercel CLI

В чате с Claude набери:

```
! vercel login
```

и войди в браузере тем же аккаунтом, где создан проект. После этого Claude сам подключит базу, хранилище фото и остальные переменные.

## 5. Сказать Claude почту организатора

Напиши в чат почту, с которой будешь регистрироваться на сайте. Ей откроется админка.

## 6. После ревью: репозиторий на GitHub

На github.com → **New repository** → владелец `grooownow`, имя `secret-santa`, **Private**, без README и .gitignore → **Create**. Дальше Claude отправит туда код по SSH и подключит к Vercel.

## Не делать

- Не запускай деплой в Vercel, даже если он предложит.
- Не подключай базу или хранилище сама: это сделает Claude, чтобы не задвоить переменные.
