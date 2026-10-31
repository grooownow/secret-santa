---
title: Уровни сложности — мини-ядро + добавляемые модули (пресеты Landing/App/App+Billing) — дизайн-док
status: утверждён (брейншторм 2026-07-15)
date: 2026-07-15
scope: инверсия шаблона в мини-ядро, каталог modules/, формат module.md/apply-plan, выбор пресета в /liftoff, preset-aware verify/deploy/manifest, извлечение эталонного модуля persistence (db+auth)
depends-on: 2026-07-09-default-auth-design.md (стек auth, который уезжает в модуль persistence)
---

# Уровни сложности проекта

## 1. Задача

Шаблон Liftkit сегодня «полный»: свежий клон несёт БД (Drizzle + PGlite +
миграции + фабрики + сид), auth (next-auth + middleware + signin + dashboard +
profile), Sentry-инструментацию, e2e — всё сразу. Для простой цели (например,
лендинг фрилансера — «что я умею») это ощущается избыточным: пользователь тащит
и поддерживает код, который ему не нужен.

При этом планка качества снижаться не должна: даже лендинг обязан быть
поддерживаемым — с тестами, гейтами, инвариантами, хуками. То есть уровни
меняют **поверхность кода** (сколько машинерии в репозитории), а не
**строгость** (гейты и инварианты остаются те же — часть из них просто
становится неприменимой).

Цель: дать пользователю на этапе обсуждения идеи выбрать уровень сложности и в
зависимости от него идти лёгким или тяжёлым путём — так, чтобы при лёгком пути
репозиторий физически не содержал лишнего кода.

## 2. Ключевые решения (из брейншторма)

1. **Модель — 2–3 именованных пресета**, не свободные тумблеры (проще
   объяснять, проще тестировать).
2. **Механизм — мини-ядро + добавляемые модули.** Дефолт шаблона инвертируется:
   канонический скелет становится минимальным (Landing), тяжёлая машинерия
   уезжает в каталог устанавливаемых модулей.
3. **Установка модуля — агентом по apply-plan**, переиспользуя идиому скилла
   `update` (который применяет «apply plan» релиза из чейнджлога). Не отдельный
   хрупкий CLI-скрипт.
4. **Объём v1 — доказать механизм на одном эталонном модуле:** каркас + реальное
   извлечение `persistence` (db+auth). Остальные модули (billing, тонкая
   нарезка Sentry/e2e) — последующими слайсами.

## 3. Гранулярность: модули режутся по границам пресетов

Зависимости в текущем коде идут **цепочкой, а не россыпью** (подтверждено
сканом импортов):

- `db` — фундамент (`src/db/**`).
- `auth` стоит на `db`: `src/lib/auth.ts` тянет `DrizzleAdapter`, таблицы
  `users`/`accounts`; импортеры `@/db` — `src/lib/auth.ts`,
  `src/features/auth/require-user.ts`, `src/features/profile/update-name-action.ts`.
- На `auth` стоят: `src/middleware.ts`, `src/app/api/auth/[...nextauth]`,
  `src/app/signin`, `src/app/dashboard`, `src/features/auth/**`,
  `src/features/profile/**`.

Вывод: db/auth/middleware **нельзя разделить** — они двигаются одним куском.
Поэтому модули крупные, по границам пресетов, а не по отдельным библиотекам.

| Пресет | Состав | Что внутри |
| --- | --- | --- |
| **Landing** | ядро | Next + Tailwind + дизайн-система (`components/ui`, shadcn) + тема + logger + env-lite + гейты/хуки/тесты + одна страница |
| **App** | ядро + `persistence` | + db (schema/factories/seed/миграции) + auth (next-auth/middleware/signin/dashboard/profile) |
| **App + Billing** | ядро + `persistence` + `billing` | billing поверх auth+db (будущий модуль) |

Лендинг-страница уже почти «ядро-чистая»: `src/app/page.tsx` зависит только от
`@/components/ui`, `next/link` и темы. Единственная ниточка в тяжёлое — ссылка
на `/signin` (её возвращает модуль `persistence` при установке, см. §5 Wiring).

## 4. Ядро (Landing) — что остаётся в каноническом скелете

Остаётся всё, что не зависит от db/auth:

- `src/app/{layout,page,error,global-error,not-found,robots,opengraph-image}.tsx`,
  `globals.css` — с лендинг-страницей без ссылки на `/signin`.
- `src/components/**` (ui, theme-provider, theme-toggle, analytics-provider).
- `src/lib/{logger,env}.ts` — **env.ts сокращается** до переменных ядра; auth-
  переменные добавляет модуль (см. §5 Env).
- Инструментация (`instrumentation*.ts`, Sentry-конфиги) — в ядре в v1; тонкое
  извлечение Sentry как отдельного модуля отложено.
- Инфраструктура: гейты (`pnpm lint/test/test:e2e/build`), lefthook, хуки
  (`scripts/hooks/pretooluse.ts`), skills-харнесс, конфиги.
- e2e ядра — смоук `/` (страница рендерит имя продукта).

Из ядра **уезжает в модуль `persistence`**: `src/db/**`, `src/lib/auth*.ts`,
`src/features/auth/**`, `src/features/profile/**`, `src/middleware.ts`,
`src/app/api/auth/**`, `src/app/signin/**`, `src/app/dashboard/**`,
`scripts/seed.ts`, `drizzle.config.ts`, соответствующие тесты, e2e-сценарии
auth, db-скрипты и deps.

## 5. Формат модуля и apply-plan

Модуль живёт в шаблоне под `modules/<name>/`, структура повторяет «apply plan»
из чейнджлога:

```
modules/persistence/
  module.md          # метаданные + apply-plan (единый документ)
  files/             # готовые файлы модуля — копируются в проект как есть
    src/db/**
    src/lib/auth.ts · src/lib/auth.config.ts · src/lib/password.ts (+ тесты)
    src/features/auth/** · src/features/profile/**
    src/middleware.ts
    src/app/api/auth/[...nextauth]/route.ts · src/app/signin/** · src/app/dashboard/**
    scripts/seed.ts · drizzle.config.ts
    tests/e2e/<auth-сценарии>
  fragments/         # что вмёржить в общие файлы ядра
    env.schema.ts.md · package.deps.md · env.example.md · landing-signin-link.md
```

`module.md` — единый документ со следующими разделами:

- **frontmatter:** `name`, `description`, `depends-on` (список модулей),
  `presets` (в какие пресеты входит).
- **Deps** — пакеты в `dependencies`/`devDependencies` с версиями (next-auth,
  @auth/core, @auth/drizzle-adapter, drizzle-orm, drizzle-kit,
  @electric-sql/pglite, postgres, bcryptjs, @types/bcryptjs).
- **Env** — переменные в `.env.example`/`.env(.development)` + фрагмент zod-
  схемы, вставляемый в `src/lib/env.ts`.
- **Files** — какие файлы из `files/` скопировать и куда.
- **Schema & migrations** — фрагмент схемы для `src/db/schema.ts` →
  `pnpm db:generate` → чтение SQL → `pnpm db:migrate`.
- **Scripts** — `db:generate`, `db:migrate`, `db:seed`, `db:reset` в
  package.json.
- **Wiring** (шаги, требующие суждения агента) — вернуть ссылку `/signin` на
  лендинг; расширить `src/lib/env.ts` фрагментом схемы; подтвердить matcher
  middleware; подключить провайдеров.
- **Verify** — какие гейты прогнать после установки
  (`pnpm lint && pnpm test`, при наличии e2e — smoke auth).

Агент (в `/liftoff` или новом скилле `add-module`) читает `module.md` и
применяет план в порядке `depends-on`, коммитя по модулю. Механически это
близко к тому, как `update` применяет релизы: `files/` копируются как есть,
`fragments/` и Schema/Wiring — точечно вмёрживаются с адаптацией под уже
изменённый код проекта.

## 6. Изменения в /liftoff

- **Step 1 (Idea):** после fit-check (он по-прежнему отсекает не-веб-идеи —
  native mobile, ML-пайплайн, тяжёлый realtime, железо) добавляется **выбор
  пресета** одним вопросом: Landing / App / App+Billing. Выбор записывается в
  манифест.
- **Step 4 (Adaptation):** новый под-шаг «применить модули пресета» — агент
  применяет apply-plan каждого модуля пресета в порядке зависимостей, коммит
  `liftoff: step 4x — module <name> applied`.
- **Условные под-шаги:** 4c (domain schema), 4d (factories/seed), 4f (auth
  mode) выполняются только если пресет включает `persistence`. Для Landing они
  пропускаются (домен-сущности в манифесте могут быть пустыми/маркетинговыми).
- Резюме-протокол liftoff расширяется на новый под-шаг (маркер-коммит остаётся
  монотонным).

## 7. Preset-aware гейты, скиллы, манифест

- **Манифест** получает поля `## Preset` (Landing/App/App+Billing) и
  `## Installed modules`. Это источник правды для последующих сессий и скиллов.
- **verify:** пропускает db-проверки (`db:reset`, db-смоук) при отсутствии
  `persistence`; `lint`/`test`/`build`/e2e ядра работают всегда.
- **deploy-плейбук:** ветвится — Landing деплоится без Postgres; App требует
  managed-Postgres как сейчас.
- **CLAUDE.md / hard invariants:** хук `pretooluse.ts` **не меняем** — инвариант
  #2 (нет db в middleware) просто не срабатывает без middleware, #4 (zod) — без
  server actions. Добавляем в `CLAUDE.md` строку: инвариант #2 применим только
  при установленном модуле `persistence`.

## 8. Доказательство round-trip (тест, способный упасть)

Инвариант «ни одна фича не едет без падающего теста» покрывается так:

1. **Страж ядра:** тест/линт-правило, что в ядре (Landing) нет импортов `@/db`,
   `@/lib/auth`, `next-auth` — падает, если тяжёлый код просочился обратно в
   ядро.
2. **Round-trip App:** применение `persistence` к чистому ядру воспроизводит
   сегодняшний App и проходит `pnpm lint && pnpm test` (+ e2e auth). Падает,
   если apply-plan неполон.
3. **Landing green:** чистое ядро проходит `pnpm lint && pnpm test && pnpm build`
   и e2e-смоук `/`.

Дополнительно — skills-eval, что `/liftoff` корректно роутит выбор пресета
(харнесс `skills:validate`/`skills:evals` уже существует).

## 9. Объём v1 (что делаем в первой итерации)

1. Каркас модулей: каталог `modules/`, формат `module.md`, документация
   (новый `docs/rules/modules.md` или раздел в `docs/rules/architecture.md`).
2. Извлечь `persistence`: перенести db+auth-стек из ядра в
   `modules/persistence/{files,fragments}` + написать `module.md` apply-plan.
3. Свести ядро к Landing: скелет компилируется и зелён по гейтам только с
   лендингом; `env.ts` и `page.tsx` сокращены.
4. Wiring в `/liftoff`: выбор пресета (Step 1) + шаг применения модулей
   (Step 4) + условные под-шаги 4c/4d/4f.
5. Preset-aware: `verify`, `deploy`-плейбук, поля `## Preset`/`## Installed
   modules` в манифесте и его шаблоне.
6. Round-trip доказан (§8): Landing зелёный, применение `persistence`
   воспроизводит App зелёным, страж ядра на месте.

**Вне объёма v1:** модуль `billing`; тонкая нарезка Sentry/e2e в отдельные
модули; скилл `add-module` для добавления модуля в уже запущенный проект (в v1
достаточно применения через `/liftoff`; отдельный скилл — следующий слайс).

## 10. Открытые вопросы (в план реализации)

- Где именно живёт документация формата модуля: новый `docs/rules/modules.md`
  vs раздел в `architecture.md`. Уточнить при написании плана.
- Нужен ли `add-module`-скилл уже в v1 для проектов, стартовавших как Landing и
  захотевших App позже (сейчас отложено; путь — применить `modules/persistence`
  тем же apply-plan-механизмом вне онбординга).
- Взаимодействие с `update`-скиллом: как обновление шаблона доносит изменения
  модулей до проекта, который часть модулей не устанавливал.

**Резолюция (Phase 2, 2026-07-16):** документация формата модуля осела в
`docs/rules/modules.md` (первый вопрос закрыт). `add-module`-скилл по-прежнему
отложен — Phase 2 применяет модули только через `/liftoff`; отдельный скилл
для уже запущенного Landing-проекта — Phase 3. `docs/qa/project-profile.md`
получил замечание про пресет (db/testing-db секции применимы только к
App/App+Billing) в рамках Phase 2. Третий вопрос (взаимодействие с
`update`-скиллом) остаётся открытым.

**Резолюция (Phase 3, 2026-07-16):** второй вопрос закрыт — скилл
`add-module` построен: устанавливает `persistence` или `observability` в уже
запущенный (после `/liftoff`) проект по apply-plan модуля, с разрешением
`depends-on` и записью в манифест. Тонкая нарезка Sentry/e2e из §9 «вне
объёма v1» тоже закрыта: Sentry извлечён в `modules/observability/`
(Landing больше не несёт `@sentry/nextjs`; App/App+Billing ставят его через
пресет), а auth e2e-сценарии уже едут вместе с `modules/persistence/` с
Phase A — отдельно резать e2e не потребовалось. Решение по billing
зафиксировано: `modules/billing/` не создаётся, App+Billing — это ядро +
`persistence` + billing-роадмап-намерение, реализуемое per-project через
`/feature billing-checkout` и `docs/playbooks/billing.md` (billing остаётся
знанием, не кодом).
