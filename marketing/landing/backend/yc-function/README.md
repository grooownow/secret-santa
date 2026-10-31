# Приёмник заявок на Yandex Cloud Functions

Зачем: 152-ФЗ требует первичной записи персональных данных на территории РФ.
Функция крутится на серверах Яндекса (РФ): фиксирует заявку в Cloud Logging и
отправляет письмо на российский почтовый ящик. Бесплатного лимита
(1 млн вызовов/мес) хватает навсегда.

## Установка (консоль console.yandex.cloud)

1. Создать биллинг-аккаунт (привязка карты; в пределах free tier списаний нет).
2. Каталог по умолчанию → «Cloud Functions» → «Создать функцию», имя
   `gridfin-lead`.
3. Редактор: среда выполнения **Node.js 18**, способ — «Редактор кода».
   Создать файлы `index.js` и `package.json` с содержимым из этой папки.
   Точка входа: `index.handler`.
4. Параметры версии → «Переменные окружения»:
   - `SMTP_HOST` — `smtp.yandex.ru` (ящик на Яндексе) или `smtp.mail.ru`
   - `SMTP_USER` — адрес ящика-отправителя
   - `SMTP_PASS` — **пароль приложения** ящика (создаётся в настройках почты:
     Яндекс ID → Безопасность → Пароли приложений; для Mail.ru аналогично).
     Вводит владелец ящика лично, секрет.
   - `MAIL_TO` — куда доставлять заявки
5. Включить флажок **«Публичная функция»** (unauthenticated invoke), нажать
   «Создать версию».
6. Скопировать «Ссылку для вызова» (`https://functions.yandexcloud.net/<id>`)
   — это значение `FORM_ENDPOINT` для сборки лендинга.

## Подключение лендинга

```bash
FORM_ENDPOINT=https://functions.yandexcloud.net/<id> pnpm landing:build
```

(значение по умолчанию зашивается в `landing/scripts/build.ts` →
`FORM_ENDPOINT`; фронт шлёт JSON POST, функция отвечает CORS-заголовками для
ludvik4.ru/ludvik4.dev).

## Проверка

```bash
curl -s -X POST https://functions.yandexcloud.net/<id> \
  -H "Content-Type: application/json" \
  -H "Origin: https://ludvik4.ru" \
  -d '{"github":"test","email":"a@b.cc","usage":"Проверка","page":"manual"}'
# → {"ok":true,"mailed":true} и письмо в ящике MAIL_TO
```
