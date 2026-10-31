---
title: Gridfin Product Canon
status: v1 (2026-08-07) — internal source of truth about the product
maintained: yes — Library, not Blog: этот файл либо актуален, либо удаляется
sources: стратегическая сессия 2026-08-06 (SEO), landing-copy-v2 draft §1/§13/§14, репозиторий (механизмы проверены по коду)
---

# Gridfin Product Canon

Внутренний источник истины о продукте. Маркетинговые тексты, документация и
гайды сверяются с этим файлом; он не копируется в них дословно.

## What Gridfin Is

Два уровня определения — оба канонические:

**Plain-language definition** (для копирайтинга):

> Gridfin — это готовый скелет приложения и управляемый процесс разработки
> с AI, в которые встроены архитектура, правила, спецификации, тесты и гейты
> качества.

**Strategic definition** (для продуктовых решений):

> Gridfin встраивает инженерный опыт в процесс разработки с AI.

Терминологические границы:

- Gridfin **не называется фреймворком**.
- `starter`, `starter kit`, `boilerplate` — язык рынка и поискового спроса
  (используется в title/H1/описаниях для обнаружимости), **не** внутреннее
  определение продукта.
- «Application Skeleton» — наш термин для физического воплощения
  инженерных решений (см. Lifecycle).

## Target User

Основной сегмент:

> Gridfin предназначен для людей без достаточного опыта в full-stack и
> software engineering. Пользователю не нужно самостоятельно проектировать
> архитектуру, тестовую стратегию и процесс качества, но он должен быть
> готов работать с терминалом, Git и Claude Code по пошаговым инструкциям.

Это может быть: новичок в разработке или вайбкодер (базовая
самостоятельность с терминалом — обязательна) · дизайнер · продуктовый
специалист · QA, DevOps или backend-разработчик без full-stack опыта ·
соло-фаундер.

«Ни разу не открывал терминал» — НЕ наша аудитория (лендинг честно
отправляет таких к Lovable/Bolt); это согласовано с блоком «не для кого»
и FAQ про требования.

Голос текстов к этому сегменту — см. правила в
`2026-08-05-landing-copy-v2-ru-draft.md` §1 (боли голосом пользователя,
«ты»-обращение, «вайбкодер» — редко).

## Core Insight

> Когда у тебя нет инженерного опыта, ты не знаешь, какие ошибки совершаешь,
> пока они не становятся дорогими.

Это **маркетинговый insight** (вход в осознание проблемы), а не центральная
сущность продуктовой онтологии. Онтологию продукта задаёт Lifecycle ниже.

## Product Lifecycle

Idea Refinement → Specification → Architecture → Application Skeleton →
Playbooks and Skills → Implementation → Testing → Quality Gates →
Deployment → Production-ready Application

Определения сущностей (стабильная модель, без чисел — числа в snapshot):

- **Architecture** — набор инженерных решений (стек, слои, направление
  импортов, миграции; записан в `docs/rules/architecture.md` и ADR).
- **Application Skeleton** — физическое воплощение этих решений:
  преднастроенный репозиторий с тестовой пирамидой и CI.
- **Skill** — запускаемый агентный workflow для конкретной задачи
  (онбординг, фича, ревью, деплой…). Skills are invoked through slash
  commands — «команда» это интерфейс вызова скилла, **не** отдельная
  сущность продуктовой онтологии.
- **Playbook** — пошаговый инженерный сценарий, который агент исполняет
  с чекпоинтами.
- **Runbook** — термин в текущем Gridfin **не используется**.

Пресеты: **Landing** (статический сайт, без БД/auth) и **App** (полный
скелет с persistence). Модули ставятся через `/add-module`.

## Current implementation snapshot — verified 2026-08-07

Изменяемые числа и составы живут здесь, НЕ в определениях выше; при
расхождении с репозиторием обновляется этот раздел.

- **Skills: 10** — gridfin (онбординг), feature, design, review, verify,
  deploy, add-module, update, doubt, learn.
- **Playbooks: 7** — deploy, billing, pricing, landing, analytics,
  compliance, ai-integration.
- **Engineering rules: 10 файлов** в `docs/rules/`.
- **Жёсткие инварианты CLAUDE.md: 6** (hook: deny #1/#2/#5, ask #4/#6;
  #3 — за скиллами feature/review).
- **Модули: 2** — persistence, observability.
- **Уровни тестов: 3** — юнит/компонентные, интеграционные (App-пресет),
  e2e.
- Стек скелета: Next.js + TypeScript, Tailwind + shadcn/ui, Drizzle +
  Postgres (App-пресет).

Редакционное правило (решение 2026-08-07): в основной копии лендинга
точные числа не используются — категории и примеры; точный состав — в
документации (в идеале автогенерируемой).

Идея на будущее (ревью 2026-08-08): когда появится автогенерация публичной
документации из репозитория, этот snapshot генерировать автоматически
(механизм — по образцу `skills:gen`), а не обновлять руками.

## Product Principles

Каждый принцип подтверждён существующим механизмом (проверено по коду
2026-08-07):

1. **Engineering decisions are made once and reused.**
   Механизм: сам скелет (стек зафиксирован), ADR в `docs/decisions/`,
   модули как переиспользуемые решения, «купил один раз — много проектов».
2. **Specifications precede implementation.**
   Механизм: `/gridfin` пишет PRD и спеки до кода; цикл `feature` —
   спека → код → тесты → ревью; шаблоны в `docs/templates/`.
3. **Every change passes quality gates.**
   Механизм: `pnpm gates` (lint → secrets → test → e2e → build → skills,
   `--full` добавляет Lighthouse), `definition-of-done.md`, CI на каждый push.
4. **AI follows engineering rules — enforced by hooks, not by trust.**
   Механизм: PreToolUse-хук (`scripts/hooks/invariants.ts`) — жёсткие
   инварианты CLAUDE.md (deny/ask до записи кода, состав — в snapshot);
   lefthook pre-commit; CI как backstop.
5. **Opinionated defaults reduce engineering mistakes.**
   Механизм: фиксированный стек, преднастроенная трёхуровневая тестовая
   пирамида, пресеты, даже порт (3210) выбран решением.
6. **Evidence over assertions.**
   Механизм: гейты рендерят PASS/FAIL из exit-кодов, evidence — цитата
   вывода команды, не пересказ; правило «тест не засчитан, пока не показан
   падающим» (`testing.md`); леджер прогонов `.gridfin/runs/`.
7. **The system communicates its limits explicitly.**
   Механизм: fit-check в `/gridfin` (честный отказ для mobile/ML/realtime),
   deploy-gate шаг 8 с обязательным варнингом о том, что нельзя
   гарантировать (branch protection на Free-плане), N.A.-строки гейтов
   с причиной.
8. **Progress survives the session.**
   Механизм: каждый шаг онбординга закоммичен, ADR/спеки/`docs/learnings.jsonl`
   как межсессионная память, леджер гейтов, `.gridfin-version` + `/update`.
