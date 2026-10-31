---
title: Выбор языка чата на онбординге + персист на весь проект — дизайн-док
status: утверждён (брейншторм 2026-07-09)
date: 2026-07-09
scope: /liftoff Step 0, docs/manifest.md, CLAUDE.md/AGENTS.md, skills, docs/rules/docs.md
---

# Выбор языка чата: шаг 0 + персист

## 1. Задача

Дать пользователю **явно выбрать язык общения** на старте онбординга (Step 0
скилла `/liftoff`) и **запомнить выбор на уровне проекта** так, чтобы все
последующие сессии — со скиллами и без — вели диалог на этом языке.

Сейчас каждый скилл (`liftoff`, `feature`, `review`, `verify`, `deploy`) и
`docs/rules/docs.md` говорят «chat in the user's language» — язык _угадывается_
из сообщений, нигде явно не выбирается и не сохраняется.

Не в scope: перевод артефактов. Код, доки, коммиты остаются **английскими** —
это правило не меняется.

## 2. Источник правды: поле в манифесте

Новое поле в `docs/manifest.md`:

```markdown
## Chat language

The language the agent speaks with you in chat (artifacts stay English).
To change it later, edit the value below (or just ask the agent to switch).

<!-- liftoff:fill -->
```

- Значение — человекочитаемое имя языка (`Russian`, `English`, `Español`, …).
- Шаблон уезжает покупателю **пустым**, с маркером `<!-- liftoff:fill -->`, как
  и остальные поля манифеста; `/liftoff` вписывает значение и снимает маркер на
  той же строке (правило манифеста).
- Позиция: после `## Current phase`, перед `## Key URLs` — это конфиг-поле
  идентити-карты, рядом с прочими per-project настройками.

## 3. Загрузка во все сессии: директива в CLAUDE.md/AGENTS.md

Одна директива, добавляется в **оба** always-loaded файла (баннер сверху требует
держать `CLAUDE.md` и `AGENTS.md` в синхроне):

> **Chat language.** Chat with the user in the language recorded in
> `docs/manifest.md` → _Chat language_. If that field is still unset, fall back
> to the language of the user's messages.

Поскольку `CLAUDE.md`/`AGENTS.md` грузятся каждой сессией, язык подхватывается и
внутри скиллов, и в обычном чате без скиллов. До онбординга (поле пустое)
поведение прежнее — угадывание из сообщений, так что новые покупатели ничего не
теряют.

Размещение: короткая секция `## Chat language` в entry-map, сразу после
`## Hard invariants` (директива про поведение, а не про навигацию по докам).

## 4. Step 0 в /liftoff

Выбор языка — **первое действие** шага 0, до `./scripts/bootstrap`, чтобы вся
дальнейшая переписка онбординга уже шла на выбранном языке.

Логика:

1. **Проверка «уже выбрано»** (resume / повторный запуск): если поле
   `Chat language` в манифесте заполнено (маркер снят) — не спрашивать, просто
   использовать это значение.
2. Иначе задать вопрос. **Промпт — только на английском** (варианты — в родном
   написании), одним сообщением:

   > Which language should I chat with you in?
   > 1. English 2. Русский 3. Español 4. Deutsch 5. Français 6. 中文
   > … or name any other language.

3. Записать выбор в `docs/manifest.md` (снять маркер), дальше говорить уже на
   выбранном языке.
4. Продолжить обычный Step 0: `bootstrap`, `pnpm lint && pnpm test`.

Коммит: поскольку теперь `manifest.md` на шаге 0 всегда меняется, шаг 0 **всегда
коммитится** (правится текущая заметка «commit only if tracked files changed —
usually nothing does»). Коммит-сообщение прежнее: `liftoff: step 0 — environment
verified`.

Resume-протокол уже опирается на этот коммит; отдельный маркер под язык не
вводим — выбор языка живёт внутри шага 0 и переживает дроп сессии вместе с
коммитом шага 0. Если сессия оборвалась _после_ вопроса, но _до_ коммита, поле в
манифесте уже заполнено → шаг (1) пропустит повторный вопрос.

## 5. Согласование формулировок в скиллах и правилах

Единая отсылка на источник правды заменяет разрозненные «chat in the user's
language»:

> chat in the project's chat language (`docs/manifest.md` → _Chat language_;
> see `CLAUDE.md`)

Правки в:

- `.claude/skills/liftoff/SKILL.md` — строка Ground rules «Language»
- `.claude/skills/feature/SKILL.md` — строка «Language»
- `.claude/skills/review/SKILL.md` — строка «Language»
- `.claude/skills/verify/SKILL.md` — строка «Language»
- `.claude/skills/deploy/SKILL.md` — строка «Language»
- `docs/rules/docs.md` § Language

Внутри `liftoff` формулировка учитывает, что до Step 0 поле ещё пустое (fallback
на язык сообщений — та же семантика, что и в директиве CLAUDE.md).

## 6. Смена языка позже

Отдельной команды (`/language` и т.п.) не вводим — YAGNI. Сменить = отредактировать
поле в `docs/manifest.md` или попросить агента переключиться (подсказка про это
уже в описании поля манифеста, см. §2).

## 7. Затрагиваемые файлы

- `docs/manifest.md` — новое поле `## Chat language` с маркером
- `CLAUDE.md`, `AGENTS.md` — секция-директива `## Chat language`
- `.claude/skills/liftoff/SKILL.md` — Step 0: вопрос + запись; Ground-rules и
  done-when правки
- `.claude/skills/{feature,review,verify,deploy}/SKILL.md` — строка Language
- `docs/rules/docs.md` — § Language

## 8. Проверка

Рантайм-кода нет — правило «фича не едет без падающего теста» относится к фичам
приложения, здесь его нет. Проверка:

- `scripts/export-template.sh --verify` проходит встроенные ассершены:
  - маркер `liftoff:fill` в манифесте ожидаем (шаблон уезжает пустым);
  - новые строки не содержат запрещённого жаргона (`Plan N` / `superpowers` /
    `kro-glo`) — формулировки подобраны нейтральными;
  - все required-файлы на месте.
- Ручная вычитка: flow Step 0 читается связно; директива CLAUDE.md/AGENTS.md
  идентична в обоих файлах.
