# Тайный Санта Bialto: план сборки

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать и задеплоить многоязычный сайт игры «Тайный Санта» для 20–70 жителей ЖК Bialto, с жеребьёвкой, подарками, раскрытием и автоудалением данных.

**Architecture:** Next.js из шаблона gridfin-template с модулем `persistence`. Вся логика лежит в срезах `src/features/*`, маршруты в `src/app` тонкие. Этап игры вычисляется чистой функцией из дат в базе, поэтому фоновая задача нужна только для рассылок и удаления данных.

**Tech Stack:** Next.js 16, TypeScript strict, Drizzle, PGlite локально, Neon Postgres в продакшене, Auth.js credentials, next-intl без префиксов в URL, nodemailer через Gmail, Vercel Blob, Vercel Cron, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-secret-santa-design.md`. Читать целиком перед стартом, тексты главной в разделе 10.

## Global Constraints

- Язык чата с заказчицей: русский. Код, коммиты и комментарии: английский.
- Работать локально в одной ветке `feat/secret-santa`, без git worktree и без удалённого репозитория. Коммит после каждой задачи. `gh` CLI не используем, GitHub только по SSH. Репозиторий создаётся в задаче 14 после одобрения заказчицы.
- Правила шаблона обязательны: `CLAUDE.md`, `docs/rules/*`. Навигация только через `<Link>`, в `src/middleware.ts` нет обращений к базе, каждое действие проверяет ввод через `zod`, у каждой фичи есть тест, способный упасть, Conventional Commits, цвета только из токенов `src/app/globals.css`.
- Перед завершением каждой задачи: `pnpm lint` и `pnpm test` зелёные. Перед деплоем `pnpm gates` и `pnpm test:e2e`.
- Всё бесплатно: Vercel Hobby, Neon free, Vercel Blob, Gmail. Платных сервисов и домена нет.
- Языки: `ru`, `uk`, `en`, `es`, `de`. Подпись языка в интерфейсе: `RU · UA · EN · ES · DE`.
- Часовой пояс игры: `Europe/Madrid`.
- Даты по умолчанию: заявки до `2026-12-06`, жеребьёвка `2026-12-07`, подарки `2026-12-25` – `2026-12-31`, раскрытие `2027-01-01`, закрытие `2027-01-10`.
- Сумма подарка: 10–15 €.
- Организатор: Kate, контакт `https://t.me/ludvik4`. Подпись: `Сделано ludvik4.dev · Threads`, ссылки `https://ludvik4.dev` и `https://www.threads.com/@ludvik.coffee`. Строка внизу есть на публичных страницах и в админке. В кабинете внизу только меню, блок об авторе только в «Настройках» (`dyqXx`), «Заказать сайт или приложение» ведёт на `https://ludvik4.dev`.
- Внешние ссылки (ludvik4.dev, Threads, Telegram, Google Переводчик) открываются в новой вкладке: `target="_blank" rel="noopener noreferrer"`. Это единственное исключение из правила «навигация только через `<Link>`».
- Каждая задача сразу пишет свои тексты на всех пяти языках в `messages/{ru,uk,en,es,de}.json`: русский из спеки, остальные переводит исполнитель. Тест одинаковых ключей зелёный на каждом шаге, русского текста в других языках нет.
- Пользовательские тексты (пожелания, запреты, записи стены) показываются на языке интерфейса через автоперевод из задачи 6, рядом «Показать оригинал».
- Тексты только из спеки и `messages/*.json`, из макетов тексты не копировать. Формулировки без рода.
- Сайт закрыт от поисковиков.
- Нигде нет интеграций с мессенджером MAX и Яндекс Браузером.
- Дизайн: фреймы из `secret-santa.pen`, открывать через Pencil MCP. Из макетов берём только визуал, источник правды по текстам и поведению — спека. Токены и компоненты: `xgJof` «Система · Санта по соседству». Если экрана нет, собрать его из тех же компонентов и сказать об этом. Новых паттернов не вводить. Не делаем: «Изменить почту» (02, 16), смену пароля `AbP3i`, модерацию стены `RZXW3`.

| Задача | Фреймы |
|---|---|
| 2 Каркас | `xgJof`, `C93kXY` 52 язык, `X7FpT` 50 сервер недоступен |
| 4 Аккаунт | `d3uzk` 01, `c7I5VY` 02, `MtVTg` 03, `rWhSc` 04, `wUKDC` 05, `hYldk` 06, `eql41` 07, `i2KLY` 08, `fCfVC` 51. Согласие после Google собрать по `d3uzk` |
| 5 Анкеты | `CN5pF` 54, `KjReh` 18, `Bidji` 19, `pTuBR` 53, `w3KeS` 15, `m0fBq` 16, `eIsHY` 17 |
| 6 Автоперевод | без своих экранов: «Показать оригинал» в стиле ссылок `Ygz4u` и `z6Qz5` |
| 7 Жеребьёвка | `ThhEp` 39, `dPnGE` 41, `BEoW3` 42 |
| 8 Дом и подарок | `MAQfu` 11, `mUkK6` 12, `dmFIt` 13, `Ygz4u` 20, `b4x7S` 21, `OGFSm` 22, `Y5rWl` 23, `pgbnS` 24, `eRs69` 25, `LViLt` 26, `WgvFY` 48, `roA55` 49 |
| 9 Раскрытие | `zY7JF` 27, `YMQby` 28, `gNnhD` 14, `N23iS` 29, `UIhvH` 30. «Не угадал» и «догадки не было» собрать по `N23iS` |
| 10 Стена | `z6Qz5` 31, `uuByn` 32, `V4kc7x` 33, `L7mxJF` 34 |
| 11 Админка, настройки | `a8tVB` 40, `ksxL7` 46, `w6MjaY` 43, `wESwL` 44, `zhi59` 45, `dyqXx` 35, `r30NS` 37, `XqGGn` 38. Обзор «Ожидание» и «Раскрытие» собрать по `zhi59` |
| 12 Закрытие | `D51rAQ` 10 |
| 13 Главная, правила | `nFiq7`, `eNR4M` 09 |
- Перед деплоем показать работу заказчице на localhost и получить явное «да».
- Проект заодно тестирует шаблон Gridfin (локально `~/Documents/Pet-projects/gridfin`, это тот же шаблон, что на GitHub). Каждую находку по шаблону сразу дописывать в `docs/gridfin-template-gaps.md`: пробелы, неудобства, ошибки, лишнее для нашего проекта, рекомендации. В конце каждой задачи проверить, нечего ли добавить.

## Review Focus

- Номер квартиры записан по-разному: `2b`, `2 B`, `2-B` у соседей по одной квартире. Ожидание: это одна квартира, они не дарят друг другу. Тест в задаче 5.
- Чужой id участника в адресной строке, включая бывшего Санту после выбытия. Ожидание: 404, адрес и фото не видны. Тесты в задачах 8 и 11.
- Двойной запуск жеребьёвки: два клика или две вкладки. Ожидание: одна цепочка и одна рассылка. Тест в задаче 7.
- Gmail отказал посреди рассылки. Ожидание: пары сохранены, никто не получает письмо дважды, в админке видно «отправлено N из M» и кнопка «Дослать». Тест в задаче 3.
- Фото с iPhone: 12 МБ или HEIC, которое браузер не открывает сам. Ожидание: фото сжимается и сохраняется, ограничения размера на входе нет. Если не удалось даже через конвертер HEIC, показываем понятную ошибку, а введённый текст анкеты остаётся. Тест в задаче 5.
- Вход через Google после срока заявок с новой почтой. Ожидание: аккаунт не создаётся. Тест в задаче 4.

---

### Task 1: Репозиторий, шаблон и фундамент данных

**Перед стартом:** удалённого репозитория нет и пока не нужно. Шаблон берётся из локальной копии `~/Documents/Pet-projects/gridfin`. Текущая папка `~/Documents/Pet-projects/secret-santa` содержит `docs`, `secret-santa.pen`, `images`, `.superpowers` и не является git-репозиторием. Существующие файлы шаблон не перезаписывает.

**Files:**
- Create: `src/lib/game-time.ts`, `src/lib/game-time.test.ts`
- Create: `src/features/game/index.ts`, `phase.ts`, `phase.test.ts`, `settings.ts`
- Modify: `src/db/schema.ts`, `src/db/factories.ts`, `src/lib/env.ts`, `.env.example`, `src/middleware.ts`, `src/lib/auth.config.ts`, `src/features/auth/require-user.ts`, `.gitignore`

**Interfaces:**
- Produces: схема ниже, `todayInMadrid(now: Date): string`, `getPhase(now, settings): Phase`, `getSettings(): Promise<Settings>`, `requireAccount(): Promise<Account>`, `requireVerifiedAccount()`, `requireOrganizer()`.

- [ ] **Step 1: Подключить шаблон к папке**

```bash
cd ~/Documents/Pet-projects/secret-santa
git -C ../gridfin status --short   # должно быть пусто, иначе спросить
git -C ../gridfin archive HEAD | tar -x -k -C .
git init -b main
git add -A && git commit -m "chore: start from gridfin template"
git checkout -b feat/secret-santa
```

Expected: файлы шаблона появились, `docs/superpowers/specs`, `plans` и `.pen` на месте. Добавить `.superpowers/` в `.gitignore`.

- [ ] **Step 2: Запустить `./scripts/bootstrap`, затем `/add-module persistence`**

Expected: модуль применён, `pnpm db:reset && pnpm lint && pnpm test` зелёные. Онбординг `/gridfin` не запускать, спека уже есть. В `docs/manifest.md` указать русский язык чата.

- [ ] **Step 3: Написать падающие тесты времени и этапов**

```ts
test("Madrid midnight switches the day before UTC", () => {
  expect(todayInMadrid(new Date("2026-12-24T23:30:00Z"))).toBe("2026-12-25");
});
test("phases", () => {
  const s = defaults({ drawnAt: new Date("2026-12-07T10:00:00Z") });
  expect(getPhase(at("2026-12-20"), s)).toBe("waiting");
  expect(getPhase(at("2026-12-25"), s)).toBe("gifts");
  expect(getPhase(at("2027-01-01"), s)).toBe("reveal");
  expect(getPhase(at("2027-01-10"), s)).toBe("closed");
});
test("no draw yet stays in collect until closed", () => {
  expect(getPhase(at("2026-12-26"), defaults())).toBe("collect");
  expect(getPhase(at("2027-01-10"), defaults())).toBe("closed");
});
test("registration closes after the deadline or the draw", () => {
  expect(registrationOpen(at("2026-12-06"), defaults())).toBe(true);
  expect(registrationOpen(at("2026-12-07"), defaults())).toBe(false);
});
```

- [ ] **Step 4: Запустить тесты**

Run: `pnpm vitest run src/lib/game-time.test.ts src/features/game/phase.test.ts`
Expected: FAIL, функций нет.

- [ ] **Step 5: Реализовать время, этапы и схему**

`type Phase = "collect" | "waiting" | "gifts" | "reveal" | "closed"`. Даты хранятся строками `YYYY-MM-DD` и сравниваются как строки. Также экспортировать `canMarkGift`, `canGuess`, `canExit`, `wallOpen`, `registrationOpen`, все `(now, settings) => boolean`: подарок и догадка в пределах до `giftsEndOn` включительно, выбытие только на этапе `waiting`, стена с `giftsStartOn` по день перед `closeOn`.

Добавить к `users`: `locale text not null default 'en'`, `building text`, `apartment text`, `consentVersion text`, `consentAt timestamptz`. Новые таблицы:

| Таблица | Поля |
|---|---|
| `participants` | `id`, `userId` (cascade), `kind` `adult`/`child`, `name`, `age int null`, `photoUrl null`, `wishes`, `avoid`, `childConsentAt null`, `createdAt`. Уникально: один `adult` на `userId` |
| `assignments` | `receiverId` pk (cascade), `giverId` unique null (set null), `giftPlace` `locker`/`mailbox` null, `giftCode null`, `giftNote null`, `giftLeftAt null`, `notFoundAt null`, `backupOrganizedAt null`, `reassignedAt null` |
| `guesses` | `participantId` pk (cascade), `guessedId` (cascade) |
| `wallPosts` | `id`, `participantId` (cascade), `text`, `photoUrl null`, `createdAt` |
| `authTokens` | `tokenHash` pk, `userId` (cascade), `purpose` `verify`/`reset`, `expiresAt`, `usedAt null` |
| `sentEmails` | `key` pk, `sentAt` |
| `settings` | `id` pk всегда 1, `applicationsCloseOn`, `drawOn`, `giftsStartOn`, `giftsEndOn`, `revealOn`, `closeOn`, `drawnAt null`, `purgedAt null` |

`getSettings()` создаёт строку с датами по умолчанию, если её нет. Env: `ADMIN_EMAIL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, все необязательны в dev. Сгенерировать миграцию `pnpm db:generate` и прочитать SQL.

В `auth.config.ts` защитить `/home` и `/admin`, в `middleware.ts` matcher `["/home/:path*", "/admin/:path*"]`. `requireAccount` читает строку пользователя и уходит на `/signin`, если её нет. `requireOrganizer` сравнивает почту с `ADMIN_EMAIL` без учёта регистра и требует `emailVerified`, иначе `notFound()`. Удалить `/dashboard` и `features/profile`.

- [ ] **Step 6: Запустить `pnpm db:reset && pnpm lint && pnpm test`**

Expected: всё зелёное.

- [ ] **Step 7: Commit**

`git add -A && git commit -m "feat(game): add schema, phases and account guards"`

### Task 2: Языки, каркас страниц и закрытие от поисковиков

**Files:**
- Create: `src/i18n/request.ts`, `src/i18n/locale.ts`, `src/i18n/locale.test.ts`, `messages/{ru,uk,en,es,de}.json`
- Create: `src/features/game/site-footer.tsx`, `src/features/game/language-switcher.tsx`, `set-locale-action.ts`, `src/features/game/translate-link.tsx`, `translate-url.ts`, `translate-url.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/robots.ts`, `next.config.ts`, тесты шаблона, сверяющие главную
- Delete: `src/app/sitemap.ts`
- Create: `tests/integration/closed-redirect.test.ts`

**Interfaces:**
- Consumes: `getPhase`, `getSettings`.
- Produces: `LOCALES`, `Locale`, `pickLocale(cookie, acceptLanguage): Locale`, `translateUrl(text: string, target: Locale): string`, `<SiteFooter />`, `<TranslateLink text />`.

- [ ] **Step 1: Написать падающие тесты**

```ts
expect(pickLocale("de", "ru")).toBe("de");
expect(pickLocale(undefined, "es-ES,es;q=0.9")).toBe("es");
expect(pickLocale("xx", "fr")).toBe("en");
expect(translateUrl("чай & кошки", "de")).toBe(
  "https://translate.google.com/?sl=auto&tl=de&text=%D1%87%D0%B0%D0%B9%20%26%20%D0%BA%D0%BE%D1%88%D0%BA%D0%B8&op=translate",
);
```

Добавить в `locale.test.ts` проверку, что все пять файлов `messages` имеют одинаковый набор ключей.

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run src/i18n src/features/game/translate-url.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

next-intl без маршрутизации по языку: `getRequestConfig` читает cookie `locale` и всегда возвращает язык, иначе next-intl вызовет `notFound()`. После входа cookie ставится из `users.locale`. Смена языка пишет cookie и, если пользователь вошёл, `users.locale`.

`translateUrl` обрезает текст до 1500 символов. `SiteFooter` показывает ссылку на правила и подпись разработчика, его подключают публичные страницы и админка, но не кабинет.

Импортировать токены и шрифты Bricolage Grotesque и Outfit из фрейма `xgJof` в `globals.css` и `layout.tsx`. `robots.ts` запрещает всё, в metadata `robots: { index: false, follow: false }`. `html lang` берётся из языка.

Группа маршрутов `src/app/(site)/layout.tsx`: если этап `closed`, редирект на `/closed`. Все страницы, кроме `/closed`, лежат внутри неё. В `next.config.ts` разрешить изображения Vercel Blob.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные, тест `closed-redirect` подтверждает редирект при дате закрытия.

- [ ] **Step 5: Commit**

`git commit -am "feat(i18n): add five locales, shell and noindex"`

### Task 3: Письма и надёжная рассылка

**Files:**
- Create: `src/features/mail/index.ts`, `sender.ts`, `sender.test.ts`, `templates.ts`, `templates.test.ts`, `broadcast.ts`
- Create: `tests/integration/broadcast.test.ts`

**Interfaces:**
- Produces:

```ts
type MailMessage = { to: string; subject: string; text: string; html: string };
sendMail(message: MailMessage): Promise<void>;
setMailTransportForTests(fn: (m: MailMessage) => Promise<void>): void;
renderEmail(type: EmailType, locale: Locale, data: EmailData): MailMessage parts;
sendOnce(key: string, message: MailMessage): Promise<boolean>;
runBroadcast(event: BroadcastEvent): Promise<{ total: number; sent: number; failed: number }>;
broadcastStatus(event: BroadcastEvent): Promise<{ total: number; sent: number }>;
```

`EmailType` покрывает письма 1–9 из спеки. `BroadcastEvent`: `"draw" | "gifts-open" | "reminder" | "reveal"`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("draw and reveal emails never contain recipient or santa names", ...);
test("only the reveal email has the developer line", ...);
test("broadcast sends one email per account, listing its participants", ...);
test("after a transport failure, a rerun sends only the unsent", async () => {
  failOnCall(2);
  expect(await runBroadcast("draw")).toMatchObject({ sent: 2, failed: 1 });
  restoreTransport();
  expect(await runBroadcast("draw")).toMatchObject({ sent: 1, failed: 0 });
  expect(sentTo(duplicates)).toEqual([]);
});
test("reminder goes only to accounts with an unmarked gift", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run src/features/mail tests/integration/broadcast.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`sender.ts`: nodemailer, `service: "gmail"`, без `pool` (в serverless он бесполезен), авторизация через `GMAIL_USER` и `GMAIL_APP_PASSWORD`. Если они не заданы и не production, письмо пишется в лог. `sendOnce` сначала проверяет `sentEmails`, после успешной отправки пишет ключ `event:userId`. Рассылка идёт последовательно, ошибка одного письма не останавливает остальные. Писем на язык `users.locale`, тексты в `messages/*.json` под `emails.*`.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(mail): add Gmail sender and resumable broadcasts"`

### Task 4: Регистрация, почта и пароль

**Files:**
- Create: `src/features/account/index.ts`, `register-action.ts`, `verify-email-action.ts`, `resend-action.ts`, `forgot-password-action.ts`, `reset-password-action.ts`, `accept-consent-action.ts`, `tokens.ts`, `google-sign-in.ts`, формы `*-form.tsx`, `google-button.tsx`
- Create: `src/app/(site)/register/page.tsx`, `check-email/page.tsx`, `verify-email/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `welcome/page.tsx`
- Modify: страница и действие входа шаблона, `src/lib/auth.ts`, `src/lib/auth.config.ts`
- Test: `tests/integration/account.test.ts`

**Interfaces:**
- Consumes: `sendMail`, `renderEmail`, `registrationOpen`.
- Produces: `issueToken(userId, purpose): Promise<string>`, `consumeToken(token, purpose): Promise<userId | null>`, константа `CONSENT_VERSION = "2026-10-31"`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("register stores lowercase email, consent version and sends verify mail", ...);
test("register without consent is rejected", ...);
test("registering an existing email looks identical to a new one", ...);
test("registration after the deadline is rejected", ...);
test("verify token works once and expires after 7 days", ...);
test("reset token expires after 1 hour and changes the password", ...);
test("forgot password answers the same for an unknown email", ...);
test("register requires the 14+ confirmation", ...);
test("google sign-in of a new email after the deadline is refused", ...);
test("google sign-in with an email registered by password opens the same account", ...);
test("a google account without consent is sent to /welcome, not to /home", ...);
test("a google account is treated as verified", ...);
test("sign-in and register pages show the Google button above the email form", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/account.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

В базе хранится только SHA-256 токена. Пароль минимум 8 символов. Повторная отправка письма не чаще раза в 60 секунд, регистрация и забытый пароль 5 в минуту по почте. Лимитер в памяти, для этого проекта достаточно. После входа редирект на `/home`. Смены пароля в настройках нет.

Google — основной способ: на регистрации и входе кнопка Google первая, сверху, ниже разделитель «или» и форма почты и пароля. Провайдер шаблона, включается `AUTH_GOOGLE_ID` и `AUTH_GOOGLE_SECRET`, кнопка показывается, только если они заданы. `allowDangerousEmailAccountLinking: true`, потому что Google подтверждает почту. Колбэк `signIn` отказывает, если почты нет в `users` и `registrationOpen` ложно. Событие `createUser` для Google ставит `emailVerified`. `requireAccount` уводит на `/welcome`, если нет `consentAt`. На `/welcome` язык, согласие и подтверждение 14+. Показать заказчице, как создать OAuth-клиент Google, в задаче 14.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(account): add registration, verification and password reset"`

### Task 5: Анкеты и фото

**Files:**
- Create: `src/features/profile/index.ts`, `apartment.ts`, `apartment.test.ts`, `save-adult-action.ts`, `save-child-action.ts`, `delete-participant-action.ts`, `queries.ts`, `adult-form.tsx`, `child-form.tsx`, `photo-input.tsx`, `compress-photo.ts`
- Create: `src/lib/photo-storage.ts`
- Create: `src/app/(site)/home/layout.tsx`, `home/participants/new/page.tsx`, `home/participants/[id]/page.tsx`
- Test: `tests/integration/profile.test.ts`, `src/features/profile/photo-input.test.tsx`

**Interfaces:**
- Consumes: `requireVerifiedAccount`, `getPhase`, `sendOnce`.
- Produces: `flatKey(building: string, apartment: string): string`, `listParticipants(userId)`, `getOwnParticipant(userId, id)`, `storePhoto(file: File): Promise<string>`, `deletePhotos(urls: string[]): Promise<void>`.

- [ ] **Step 1: Написать падающие тесты**

```ts
expect(flatKey("B", " 2-b ")).toBe(flatKey("B", "2B"));
expect(flatKey("B", "2 B")).not.toBe(flatKey("K", "2B"));
test("child without guardian confirmation is rejected", ...);
test("child form has no photo field and an action ignores a photo", ...);
test("age must be 0–17", ...);
test("second adult on one account is rejected", ...);
test("editing is rejected after collect", ...);
test("cannot edit another account's participant", ...);
test("first saved adult sends the application email once", ...);
test("a large photo is compressed below 500 KB, with no input size limit", ...);
test("a HEIC photo goes through the converter and is saved", ...);
test("a photo that fails even the converter shows an error and keeps typed text", ...);
test("server rejects a payload over 900 KB as a guard", ...);
test("children cannot be added before the owner's profile", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/profile.test.ts src/features/profile`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`flatKey`: верхний регистр, убрать пробелы и дефисы, склеить как `B:2B`. Дом и квартира хранятся в `users`, ребёнок их наследует. Ограничения размера на входе нет. Сжатие через `canvas` до 1024 px и JPEG, цель до 500 KB, при необходимости снижаем качество. Если браузер не декодирует файл (HEIC в Chrome), лениво подгружаем бесплатную библиотеку `heic2any`, конвертируем и сжимаем. Ошибка показывается, только если не помог и конвертер. Сервер принимает не больше 900 KB только как страховку: без неё упираемся в лимит тела server action в 1 МБ. `storePhoto` использует `@vercel/blob` со случайным суффиксом, а без `BLOB_READ_WRITE_TOKEN` вне production пишет `data:`-адрес. У ребёнка отдельная галочка: младше 14 лет согласие родителя или опекуна, 14–17 лет подтверждение согласия подростка. Текст подписи зависит от возраста.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(profile): add adult and child profiles with photos"`

### Task 6: Автоперевод пользовательских текстов

**Files:**
- Create: `src/features/translation/index.ts`, `translator.ts`, `groq-translator.ts`, `fake-translator.ts`, `translate-fields.ts`, `translate-fields.test.ts`, `localized-text.tsx`, `localized-text.test.tsx`
- Modify: `src/db/schema.ts` (таблица `translations`), `src/lib/env.ts`, `.env.example`, действия сохранения анкет из задачи 5
- Test: `tests/integration/translation.test.ts`

**Interfaces:**
- Consumes: `LOCALES`, `Locale`, `translateUrl`, `<TranslateLink />`, `saveAdult`, `saveChild`.
- Produces:

```ts
interface Translator { translate(text: string, from: Locale | "auto", to: Locale[]): Promise<Partial<Record<Locale, string>>> }
getTranslator(): Translator; // Groq if GROQ_API_KEY, else fake in dev/test
setTranslatorForTests(t: Translator): void;
translateAndStore(sourceKey: string, text: string, authorLocale: Locale): Promise<void>;
getLocalized(sourceKeys: string[], locale: Locale): Promise<Map<string, string | null>>;
retryMissingTranslations(): Promise<{ done: number; failed: number }>;
<LocalizedText original={text} translated={t | null} sourceLocale={l} /> // shows translation + «Показать оригинал», falls back to original + TranslateLink
```

- [ ] **Step 1: Написать падающие тесты**

```ts
test("saving wishes stores translations for the 4 other locales", ...);
test("text in the viewer's own locale is shown as is, without a toggle", ...);
test("editing the text replaces old translations", ...);
test("a translator failure saves the profile anyway and leaves the translation missing", ...);
test("retryMissingTranslations fills the gaps and is idempotent", ...);
test("the text sent to the translator has no name, building or apartment", ...);
test("LocalizedText shows translation and toggles to the original", ...);
test("LocalizedText without translation shows the original and the Google Translate link", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run src/features/translation tests/integration/translation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Таблица `translations`: `sourceKey text`, `locale text`, `text`, `sourceHash text`, pk (`sourceKey`, `locale`). `sourceKey` вида `participant:<id>:wishes`, `participant:<id>:avoid`, `post:<id>`. `sourceHash` это SHA-256 исходника, перевод с другим хешем считается устаревшим. Строки удаляются вместе с исходником: при удалении участника и записи, а также при очистке 10 января.

`groq-translator.ts`: `fetch` на `https://api.groq.com/openai/v1/chat/completions`, модель `llama-3.3-70b-versatile`, `temperature: 0`, ответ в JSON-режиме с ключами языков. Системная инструкция: перевести бытовой текст соседа, сохранить смысл и тон, ничего не добавлять, вернуть JSON. Таймаут 15 секунд. Ключ `GROQ_API_KEY`, необязателен. Без ключа вне production работает `fake-translator`: возвращает `[de] текст`. В production без ключа перевод отключён, показываем оригинал и ссылку.

Перевод запускается после сохранения через `after()` из `next/server`, сохранение анкеты его не ждёт. Язык автора берётся из `users.locale`. Сохранение анкеты из задачи 5 вызывает `translateAndStore` для `wishes` и `avoid`. Задача 10 вызывает его для записей стены, задача 12 вызывает `retryMissingTranslations` в ежедневной задаче. Карточка подопечного, догадки и стена показывают тексты через `<LocalizedText>`.

В согласии на пяти языках упомянуть Groq как сервис перевода.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(translation): auto-translate user texts on save"`

### Task 7: Жеребьёвка и обзор админки

**Files:**
- Create: `src/features/draw/index.ts`, `build-chain.ts`, `build-chain.test.ts`, `run-draw-action.ts`, `resend-action.ts`
- Create: `src/features/admin/index.ts`, `queries.ts`, `overview.tsx`
- Create: `src/app/(site)/admin/layout.tsx`, `admin/page.tsx`
- Test: `tests/integration/draw.test.ts`

**Interfaces:**
- Consumes: `flatKey`, `runBroadcast`, `broadcastStatus`, `requireOrganizer`.
- Produces:

```ts
type DrawEntry = { id: string; flat: string };
type ChainResult = { ok: true; links: { giverId: string; receiverId: string }[] }
  | { ok: false; reason: "too_few" | "household_too_large"; flat?: string };
buildChain(entries: DrawEntry[]): ChainResult;
runDraw(): Promise<ActionResult>;
getOverview(): Promise<{ phase; participants: number; excluded: number; giftsMarked: number; broadcast }>;
```

- [ ] **Step 1: Написать падающие тесты**

```ts
test("500 random neighbourhoods form one cycle with no same-flat link", () => {
  for (const entries of randomNeighbourhoods(500)) {
    const r = buildChain(entries);
    assert(r.ok);
    expectSingleCycle(r.links, entries);
    expectNoSameFlat(r.links, entries);
  }
});
test("fewer than 3 participants fails with too_few", ...);
test("a flat with more than half of everyone fails and names the flat", ...);
test("exactly half from one flat still works", ...);
test("double click runs one draw and one broadcast", async () => {
  await Promise.all([runDraw(), runDraw()]);
  expect(await countAssignments()).toBe(participantCount);
  expect(mailsSent()).toBe(accountCount);
});
test("failed draw saves nothing", ...);
test("unverified accounts stay out and are counted as excluded", ...);
test("overview payload has no giver or receiver", ...);
test("non-organizer gets not found", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run src/features/draw tests/integration/draw.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать `buildChain`**

Минимум 3 участника, размер квартиры не больше `floor(n / 2)`. Случайный перебор с откатом: начать со случайного участника, на каждом шаге брать случайного из другой квартиры, отсекать ветку, если у какой-то квартиры осталось людей больше, чем `ceil(оставшихся / 2)`, а последний не должен совпасть по квартире с первым. Случайность через `crypto.randomInt`.

- [ ] **Step 4: Реализовать `runDraw`**

В транзакции взять блокировку строки `settings` (`for update`), проверить `drawnAt is null`, вставить связи и поставить `drawnAt`. Рассылка идёт после фиксации транзакции через `after()` из `next/server`: организатор получает ответ сразу. У страницы админки `maxDuration = 300`. Если рассылка не закончена, обзор показывает «отправлено N из M» и кнопку «Дослать». В обзоре диалог подтверждения и причина ошибки на языке организатора. В логах только число связей.

- [ ] **Step 5: Запустить `pnpm lint && pnpm test`**

Expected: зелёные, при запуске 500 случаев не дольше нескольких секунд.

- [ ] **Step 6: Commit**

`git commit -am "feat(draw): add single-cycle draw and admin overview"`

### Task 8: Дом, подопечный и подарок

**Files:**
- Create: `src/features/gift/index.ts`, `queries.ts`, `mark-gift-action.ts`, `not-found-action.ts`, `recipient-card.tsx`, `gift-form.tsx`, `my-gift-card.tsx`
- Create: `src/features/game/home-view.tsx`, `participant-switcher.tsx`
- Create: `src/app/(site)/home/page.tsx`, `home/recipient/[participantId]/page.tsx`, `home/gift/[participantId]/page.tsx`, `home/my-gift/[participantId]/page.tsx`
- Test: `tests/integration/gift.test.ts`, `src/features/game/home-view.test.tsx`

**Interfaces:**
- Consumes: `getOwnParticipant`, `canMarkGift`, `sendOnce`, `getLocalized`, `<LocalizedText />`.
- Produces: `getRecipient(userId, participantId)`, `getMyGift(userId, participantId)`, `markGift(input)`, `reportNotFound(participantId)`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("recipient card shows address and photo to the giver", ...);
test("another account's participantId gives 404", ...);
test("getMyGift never returns the giver id or name", ...);
test("marking before Dec 25 and after Dec 31 is rejected", ...);
test("marking emails the receiver with place, code and note", ...);
test("editing the place resends the email", ...);
test("not found is stored and only available after the gift is marked", ...);
test("note and code are limited to 200 and 50 chars", ...);
test("home shows the right blocks per phase", ...);
test("gift tab before the draw and wall tab before Dec 25 show placeholders", ...);
test("a giver with no recipient sees the nothing-to-give state", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/gift.test.ts src/features/game/home-view.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Дом показывает блоки по таблице раздела 5 спеки. Отметка письма использует ключ `gift:<receiverId>:<версия>`, версия растёт при правке. Текст письма упоминает только получателя. «Не нашёл подарок» виден до дня закрытия. После `reassignedAt` на карточке подопечного показывается пометка, что он изменился.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(gift): add home, recipient and gift flows"`

### Task 9: Догадка и раскрытие

**Files:**
- Create: `src/features/reveal/index.ts`, `queries.ts`, `guess-action.ts`, `guess-form.tsx`, `reveal-card.tsx`
- Create: `src/app/(site)/home/guess/[participantId]/page.tsx`, `home/reveal/[participantId]/page.tsx`
- Test: `tests/integration/reveal.test.ts`

**Interfaces:**
- Consumes: `canGuess`, `getPhase`, `getOwnParticipant`.
- Produces: `listGuessOptions(participantId)`, `saveGuess(input)`, `getReveal(userId, participantId)`, возвращает `{ santa: { name } | "backup"; guessCorrect: boolean | null }`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("guess options contain only name and building, without own account", ...);
test("guess can change until Dec 31 and is rejected on Jan 1", ...);
test("reveal before Jan 1 returns 404", ...);
test("reveal shows the santa and whether the guess was right", ...);
test("wrong guess shows the santa and the guessed name", ...);
test("no guess shows only the santa", ...);
test("no giver or organized backup shows backup without a name", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/reveal.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Условие «Запасной Санта»: `giverId is null` или заполнен `backupOrganizedAt`. Поиск в списке на клиенте по уже отданным именам.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(reveal): add santa guess and reveal"`

### Task 10: Стена благодарностей

**Files:**
- Create: `src/features/wall/index.ts`, `queries.ts`, `add-post-action.ts`, `delete-post-action.ts`, `wall-feed.tsx`, `post-form.tsx`
- Create: `src/app/(site)/home/wall/page.tsx`
- Test: `tests/integration/wall.test.ts`

**Interfaces:**
- Consumes: `wallOpen`, `storePhoto`, `translateAndStore`, `getLocalized`, `<LocalizedText />`.
- Produces: `listPosts()`, `addPost(input)`, `deletePost(id)`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("posting works only while the wall is open", ...);
test("author deletes own post, others cannot, organizer can", ...);
test("post text is 1–1000 chars", ...);
test("feed exposes author name but no apartment or email", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/wall.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать ленту по фреймам макета, новые записи сверху, пустое состояние из спеки**

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(wall): add thank-you wall"`

### Task 11: Выбытие, запасной Санта, настройки

**Files:**
- Create: `src/features/admin/withdraw.ts`, `withdraw-action.ts`, `backup-list.tsx`, `organize-backup-action.ts`, `participants-table.tsx`, `update-settings-action.ts`, `settings-form.tsx`, `invite-qr.tsx`
- Create: `src/features/account/delete-account-action.ts`
- Create: `src/app/(site)/admin/participants/page.tsx`, `admin/backup/page.tsx`, `admin/settings/page.tsx`, `home/settings/page.tsx`
- Test: `tests/integration/withdraw.test.ts`, `tests/integration/admin.test.ts`

**Interfaces:**
- Consumes: `flatKey`, `canExit`, `requireOrganizer`, `sendOnce`, `deletePhotos`.
- Produces: `withdrawParticipant(id)`, `listBackupNeeded(now)`, возвращает `{ participantId, name, building, apartment, reason }[]`, без Санты.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("A→D→R after withdrawing D becomes A→R and A gets an email", ...);
test("old giver of D gets 404 on D's card", ...);
test("if A and R share a flat, R needs a backup and A has nothing to give", ...);
test("withdrawal fails from Dec 25", ...);
test("a chain of two consecutive withdrawals stays consistent", ...);
test("withdrawing an account removes all its participants", ...);
test("backup list adds unmarked receivers from Jan 1", ...);
test("backup list payload has no giver", ...);
test("settings reject dates out of order", ...);
test("account deletes itself in collect, later it is refused", ...);
test("participants table offers delete in collect and withdraw from the draw to Dec 24", ...);
test("overview shows the blocks of each phase from the spec", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/withdraw.test.ts tests/integration/admin.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать выбытие в транзакции**

Найти `A`, дарителя выбывшего `D`, и `R`, его получателя. Удалить `D`: строка `receiverId = D` исчезает каскадом. Если `A` и `R` есть и у них разные квартиры, поставить `R.giverId = A`, `reassignedAt = now`, письмо `reassigned`. Иначе `R.giverId = null`, и если `A` есть, письмо `nothing-to-give`. Учитывать, что у `D` может не быть дарителя или получателя. С 25 декабря удаление аккаунта запрещено, по спеке оно выполняется 10 января вместе со всеми данными.

QR: библиотека `qrcode`, ссылка `NEXT_PUBLIC_APP_URL`, скачивание PNG и версия для печати. Таблица участников показывает имя, дом, квартиру и статус почты. В настройках аккаунта на этапах после сбора вместо удаления показывается ссылка на Telegram организатора. В настройках почта, язык, удаление и блок об авторе, смены пароля нет. Обзор админки по этапам из таблицы спеки.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(admin): add withdrawal, backup list and settings"`

### Task 12: Ежедневная задача и удаление данных

**Files:**
- Create: `src/features/game/daily.ts`, `purge.ts`
- Create: `src/app/api/cron/daily/route.ts`, `vercel.json`
- Create: `src/app/closed/page.tsx`
- Test: `tests/integration/daily.test.ts`

**Interfaces:**
- Consumes: `runBroadcast`, `deletePhotos`, `getSettings`, `retryMissingTranslations`.
- Produces: `runDaily(now: Date): Promise<DailyReport>`, `purgeAll(): Promise<void>`.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("cron without the secret gets 401", ...);
test("Dec 25 sends gifts-open, Dec 29 reminder, Jan 1 reveal", ...);
test("a repeated run the same day sends nothing new", ...);
test("nothing is sent before the draw", ...);
test("Jan 10 deletes users, participants, assignments, posts and photos", ...);
test("purge keeps settings and sets purgedAt", ...);
test("a failed blob delete leaves purgedAt empty so the next day retries", ...);
test("purge does nothing if the close date was moved later", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run tests/integration/daily.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 8 * * *" }] }
```

На бесплатном тарифе задача срабатывает раз в сутки в течение указанного часа, этого достаточно. Маршрут проверяет `Authorization: Bearer ${CRON_SECRET}`, `maxDuration = 300` (бесплатно на Hobby с Fluid Compute, проверить при деплое). Перед рассылкой смотрит дату в Мадриде. Если даты изменены, задача берёт новые. Если рассылка не успела или Gmail отказал, организатор досылает кнопкой из задачи 7, для событий `gifts-open`, `reminder`, `reveal` обзор показывает такой же счётчик. Страница `/closed` лежит вне группы `(site)`, экран `D51rAQ`.

- [ ] **Step 4: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 5: Commit**

`git commit -am "feat(game): add daily job and data purge"`

### Task 13: Главная, правила и переводы

**Files:**
- Modify: `src/app/(site)/page.tsx`, `messages/*.json`
- Create: `src/features/landing/index.ts`, `landing-page.tsx`, `src/app/(site)/rules/page.tsx`, `src/features/landing/rules-content.tsx`, `src/app/opengraph-image.tsx`
- Test: `src/features/landing/landing-page.test.tsx`

**Interfaces:**
- Consumes: `getSettings`, `registrationOpen`, `<SiteFooter />`.

- [ ] **Step 1: Написать падающий тест**

```ts
test("hero names Secret Santa and Bialto", ...);
test("copy has no invite code and no 10–20 €", ...);
test("after the deadline the CTA leads to sign-in", ...);
test("dates come from settings", ...);
```

- [ ] **Step 2: Запустить**

Run: `pnpm vitest run src/features/landing`
Expected: FAIL.

- [ ] **Step 3: Собрать главную по фрейму `nFiq7`, тексты дословно из раздела 10 спеки**

Включая блок «Игра держится на нас». Если макет расходится со спекой по тексту, побеждает спека. Иллюстрацию взять из макета и `images/`.

- [ ] **Step 4: Написать страницу правил по фрейму `eNR4M`**

Условия игры и обработка данных: ответственная Kate, контакт Telegram, цель, адрес, фото, аллергии как данные о здоровье, дети и правила 14 лет, Vercel, Neon, Gmail, Google Переводчик, срок хранения до 10 января 2027, право на удаление. Показать текст заказчице перед завершением задачи.

- [ ] **Step 5: Вычитать переводы всех сообщений на `uk`, `en`, `es`, `de`**

Тексты задач 1–12 уже переведены по ходу. Здесь пройтись по всем файлам целиком, выровнять термины и тон. Expected: тест одинаковых ключей зелёный, в переводах нет русского текста.

- [ ] **Step 6: Запустить `pnpm lint && pnpm test`**

Expected: зелёные.

- [ ] **Step 7: Commit**

`git commit -am "feat(landing): add homepage, rules and translations"`

### Task 14: Сквозная проверка и деплой

**Files:**
- Create: `tests/e2e/game.spec.ts`
- Modify: `src/db/client.ts`, `docs/gridfin-template-gaps.md`, `README.md`

- [ ] **Step 1: Написать e2e-сценарий на мобильной и десктопной конфигурации**

Регистрация трёх аккаунтов с ребёнком, подтверждение почты через токен из тестовой базы, анкеты, жеребьёвка организатором, карточка подопечного, отметка подарка, письмо, догадка, раскрытие. Даты сдвигаются записью в `settings`. Проверить смену языка на `es`.

- [ ] **Step 2: Запустить**

Run: `pnpm gates && pnpm test:e2e`
Expected: всё зелёное.

- [ ] **Step 3: Показать сайт заказчице на localhost**

Через `pnpm dev`, скриншоты главной и основных экранов на 375 px. Дальше идти только после её явного «да».

- [ ] **Step 4: Подготовить подключение к Neon**

Для пула Neon в `src/db/client.ts`: `postgres(url, { prepare: false, max: 1 })`. Проверить миграции на удалённой базе из инструкции `docs/playbooks/deploy.md`.

- [ ] **Step 5: Репозиторий и деплой через `/deploy`**

Заказчица создаёт пустой приватный репозиторий `grooownow/secret-santa` на github.com. Подключение по SSH: `git remote add origin git@github.com-grooownow:grooownow/secret-santa.git`, затем пуш `main` и `feat/secret-santa`. `gh` не используем.

Аккаунты заводит заказчица: новый Gmail с двухэтапной проверкой и паролем приложения, Vercel, Neon, OAuth-клиент Google (тип Web, redirect `https://<app>.vercel.app/api/auth/callback/google`, экран согласия опубликован в Production). Пароли и ключи она вводит сама в настройках Vercel, не в чат. Env: `GRIDFIN_DB=remote`, `DATABASE_URL`, `AUTH_SECRET`, `GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. Проверить, что Fluid Compute включён и `maxDuration = 300` принимается. После подключения Blob проверить бесплатные лимиты Blob и Neon. Если фото стены не проходят по лимитам, отключить фото на стене.

- [ ] **Step 6: Проверить прод**

Реальная регистрация на почту заказчицы и вход через Google, письмо дошло, ссылка подтверждения работает, вызов cron вручную с секретом отвечает 200.

- [ ] **Step 7: Итог**

Обновить `docs/gridfin-template-gaps.md`, в `README.md` записать, как запустить и что удалить 10 января: Gmail-ящик вручную. Commit: `git commit -am "chore: finish launch"`. Открыть PR в `main`, слияние только после согласия заказчицы.
