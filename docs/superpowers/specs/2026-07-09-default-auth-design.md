---
title: Авторизация по умолчанию — credentials, dev-байпас, шаг 4f — дизайн-док
status: утверждён (брейншторм 2026-07-09)
date: 2026-07-09
scope: schema+migration, auth.ts, sign-in, seed, env, e2e, /liftoff step 4f, security/deploy docs
depends-on: 2026-07-09-preview-step-and-port-design.md (общий playwright.config.ts и Step 5)
---

# Авторизация по умолчанию

> **Поправка по итогам реализации (2026-07-10).** §2 и §5 говорят, что
> `AUTH_DEV_BYPASS` по умолчанию `true`. Это оказалось нерабочим: `next build`
> запускается с `NODE_ENV=production` и вычисляет `src/lib/env.ts`, поэтому
> прод-гард отвергал обычный `pnpm build` (ломая первый билд у покупателя,
> `export --verify` и CI). В коде дефолт схемы — `false`, а байпас включается
> файлом `.env.development`, который Next читает только при
> `NODE_ENV=development`. Поведение для разработчика прежнее: `pnpm dev`
> логинит как засеянного админа.

## 1. Задача

Свежий проект **невозможно открыть**. Ни один OAuth-провайдер не настроен по
умолчанию, поэтому `/signin` рендерит карточку «No auth providers configured»
(`src/features/auth/sign-in-page.tsx:42-48`), а `/dashboard` редиректит
обратно. Провайдера всего два (GitHub, Google — `.env.example:18-24`), оба
закомментированы. Сид создаёт демо-юзера (`scripts/seed.ts:14`) **без пароля**
— войти под ним нечем. Liftoff это даже не считает багом и пишет в handover
«expected, not a bug».

Дополнительно: внешние OAuth-провайдеры недоступны в ряде юрисдикций (РФ), и
агент никогда не спрашивал пользователя, подходит ли ему Google-вход.

Цель: из коробки работающий вход по логину/паролю, тривиальный старт на
dev/test, явный выбор режима с апрувом пользователя.

## 2. Что едет в шаблоне по умолчанию

| Тумблер          | Дефолт | Где переключается     |
| ---------------- | ------ | --------------------- |
| credentials-вход | вкл    | всегда включён        |
| dev-байпас       | вкл    | `AUTH_DEV_BYPASS` env |
| OAuth            | выкл   | `AUTH_*` env          |

Ролей **нет**: `users` не получает колонку `role`, `requireAdmin()` не
вводится. Засеянный пользователь — просто рабочий аккаунт, под которым можно
войти. RBAC — продуктовая фича конкретного SaaS, её строит `/feature`, когда
появится второй тип пользователя (YAGNI).

## 3. Схема и хеширование

`src/db/schema.ts` → `users.passwordHash: text` (**nullable**: у
OAuth-пользователей пароля нет). Миграция генерируется и применяется в
шаблоне (`pnpm db:generate` → прочитать SQL → `pnpm db:migrate`), по правилу
`docs/rules/architecture.md`: применённую миграцию не редактируют.

Хеширование — **`bcryptjs`** (чистый JS, без postinstall-сборки).
`@node-rs/argon2` тянет prebuilt-бинарники и ломает установку на неожиданных
платформах — для шаблона, который клонируют покупатели, это неприемлемый
риск.

## 4. Где живёт credentials-провайдер (жёсткое ограничение)

Только в `src/lib/auth.ts` (Node-only). В `src/lib/auth.config.ts` его класть
**нельзя**: тот файл edge-safe и импортируется из `src/middleware.ts`, а
`authorize()` обязан обратиться к БД и посчитать хеш. Это инвариант 2
`CLAUDE.md` и раздел Auth в `docs/rules/security.md`.

- `auth.config.ts` — без изменений по составу: только OAuth-провайдеры,
  чистый `authorized()`, `jwt`/`session` колбэки.
- `auth.ts` — спредит `authConfig` и добавляет `adapter` (как сейчас) плюс
  `Credentials({ authorize })`, который валидирует ввод `zod`-схемой, ищет
  пользователя, сверяет `bcryptjs.compare`.

Middleware продолжает только декодировать JWT — состав провайдеров ему
безразличен.

## 5. Dev-байпас

Env-флаг `AUTH_DEV_BYPASS` (boolean, дефолт `true` в `.env.example`).

- `requireUser()` (`src/features/auth/require-user.ts`) при взведённом флаге
  возвращает засеянного пользователя вместо редиректа.
- `authorized()` в `auth.config.ts` при взведённом флаге пропускает
  `/dashboard`. Флаг читается из env — это чистое чтение, не сеть и не БД,
  инвариант middleware не нарушается.

**Защита от прода — в коде, не в документации.** `src/lib/env.ts` бросает на
старте, если `AUTH_DEV_BYPASS` взведён при `NODE_ENV=production` (тот же
паттерн, что уже применён для `LIFTKIT_DB=remote` → требует `DATABASE_URL`).

Известный минус выбранного дефолта: при включённом байпасе форма входа не
проверяется человеком. Он закрывается §7 — гейты гоняют e2e с выключенным
байпасом, поэтому реальный логин проверяется на каждом прогоне.

## 6. Креды засеянного пользователя

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — записи в zod-схеме
`src/lib/env.ts` с dev-дефолтами, документированные строки в `.env.example`,
кейсы в `src/lib/env.test.ts` (все три — требование `security.md`).

`scripts/seed.ts` хеширует пароль и вставляет пользователя. Скрипт
**отказывается работать при `NODE_ENV=production`** — бросает с внятным
сообщением. Захардкоженного пароля в git шаблона нет: секрет живёт только в
env, как требует «Secrets hygiene».

Агент показывает креды пользователю в чате на шаге 4f и повторяет на превью
(Step 5). Форма входа их **не** предзаполняет — незачем светить пароль в UI.

## 7. Форма входа проверяется на каждом прогоне гейтов

`playwright.config.ts` поднимает свой сервер с `AUTH_DEV_BYPASS=false`, чтобы
e2e проверял настоящий вход.

- Новый e2e: открыть `/signin`, ввести креды из env, оказаться на
  `/dashboard`.
- Существующий `tests/e2e/smoke.spec.ts:28` утверждает наличие текста «No auth
  providers configured» — он фиксирует ровно ту беспомощность, которую этот
  спек чинит. Тест переписывается: `/signin` рендерит форму логина;
  неаутентифицированный `/dashboard` по-прежнему редиректит на `/signin`.

## 8. Rate limiting на вход

`/signin` — публичная точка, принимающая неаутентифицированный ввод. По
`docs/rules/security.md` («Headers and rate limiting») такие точки идут через
`src/lib/rate-limit.ts`. Без этого credentials-логин — открытая дверь для
перебора паролей. Server action входа вызывает `rateLimit()` до сверки хеша.

## 9. Шаг 4f в /liftoff

Новый подшаг после 4e (буквенная нумерация уже расширяема — resume-протокол
не ломается; новый шаг посередине сдвинул бы номера).

Агент:

1. объясняет режим: вход по логину/паролю включён; dev-байпас включён и что
   это значит; OAuth опционален и как его включить;
2. показывает креды засеянного пользователя;
3. спрашивает апрув одним вопросом: оставить как есть / выключить байпас /
   добавить OAuth;
4. применяет выбор правкой `.env` (не кода).

**Done when:** выбор записан в `.env`, `pnpm lint && pnpm test` зелёные.
Коммит: `liftoff: step 4f — auth mode <mode>`.

Step 4's done-when чек-лист получает шестой пункт.

## 10. Тесты (каждый обязан уметь падать)

- `env.test.ts`: `AUTH_DEV_BYPASS=true` + `NODE_ENV=production` → бросает.
- `env.test.ts`: дефолты `SEED_ADMIN_*` присутствуют.
- `auth.ts`: `authorize()` отвергает неверный пароль, принимает верный,
  отвергает несуществующий email.
- `require-user.test.ts`: при взведённом байпасе возвращает засеянного
  пользователя; при выключенном — редиректит.
- Server action входа: rate-limit срабатывает после N попыток.
- E2E: реальный вход по кредам с `AUTH_DEV_BYPASS=false`.

## 11. Затрагиваемые файлы

`src/db/schema.ts` + новая миграция, `scripts/seed.ts`, `src/lib/auth.ts`,
`src/lib/auth.config.ts`, `src/features/auth/sign-in-page.tsx` + новый server
action, `src/features/auth/require-user.ts` (+ тест), `src/lib/env.ts` (+
тест), `.env.example`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts` +
новый e2e-спек, `.claude/skills/liftoff/SKILL.md` (4f + done-when),
`docs/rules/security.md` (раздел Auth), `docs/playbooks/deploy.md`
(прод-чеклист: байпас выключен, seed не запускается, первый пользователь
создаётся вручную).

## 12. Порядок относительно спека A

Спеки пересекаются в `playwright.config.ts` и в Step 5 `/liftoff`.
Реализуются **последовательно: сначала A, потом D**. Параллельная работа в
одном рабочем дереве даст молчаливую потерю правок, а не merge-конфликт.

## 13. Проверка

- `pnpm lint && pnpm test && pnpm test:e2e && pnpm build` — зелёные.
- `pnpm audit --audit-level high` — зелёный после добавления `bcryptjs`.
- Ручной прогон: `AUTH_DEV_BYPASS=true` → `/dashboard` открыт сразу;
  `false` → `/signin` пускает по кредам из `.env`.
- Ручной прогон: `NODE_ENV=production AUTH_DEV_BYPASS=true pnpm build` →
  падает на старте с внятным сообщением.
- `NODE_ENV=production pnpm db:seed` → отказывается работать.
- `scripts/export-template.sh` — ассершены чистоты экспорта проходят.
