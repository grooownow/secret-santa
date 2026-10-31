---
title: Liftkit — SEO-исследование для многоязычного лендинга (фаза 1)
status: готово к ревью (2026-07-31; 2026-08-01 добавлены реальные частотности Wordstat для RU; 2026-08-02 принято решение о ребренде — см. раздел 2)
brief: 2026-07-31-landing-i18n-brief.md
phase-0: 7 локалей (EN+RU люди; DE/ES/PT-BR/FR/JA — MT), SEO-поля всех локалей — из этого рисёрча; домен — решение по итогам раздела 2; оффер — бета (фаза A); тон — поблочный микс
---

# SEO-исследование: ключевые слова, конкуренты, коллизия бренда

## 0. Метод и честное ограничение

Платных Ahrefs/Semrush нет. Оценки частотности для **EN и MT-локалей** —
**качественные** (high / medium / low / near-zero), выведенные из автокомплита
Google/Yandex (в т.ч. Google Suggest API с локальными `hl`), состава выдачи,
People Also Ask и плотности контента. Это не данные об объёмах — это ранжирующие
сигналы «запрос живой / следовой / мёртвый». Снято 2026-07-31 пятью
параллельными рисёрч-проходами (бренд, конкуренты, EN, RU, MT-локали).

**Для RU 2026-08-01 сняты реальные частотности** через Яндекс Вордстат
(браузер, аккаунт Кати; регион «Россия», период 30.06–29.07.2026, все
устройства) — таблица в разделе 5. Качественные RU-оценки от 31.07 цифрами
подтвердились. Для EN аналога нет: появится выгрузка Ahrefs/Semrush — 
пересверить раздел 4.

**Главная поправка к стратегии:** ставка «первые в пустой нише» (раздел 8
маркетинг-стратегии) устарела — ниша «Claude Code + SaaS starter» к середине
2026 уже обитаема (supastarter завёл выделенную страницу, есть листиклы «Best
Claude Code Templates 2026», бесплатные GitHub-стартеры, gumroad-товары).
Новая ставка: **единственный agent-native / test-first продукт в оживлённой
нише**. Окно ещё открыто, но закрывается — скорость запуска важна.

---

## 1. Портрет покупателя и карта интентов

### EN-рынок

Разработчик (или QA/DevOps), уже пользуется Claude Code ежедневно. Хочет
запустить side-project SaaS быстро, но не доверяет vibe-coding без тестов.
Платёжеспособен: $10 — импульсная покупка. Живёт в X/Twitter, Reddit
(r/ClaudeAI, r/SaaS, r/nextjs), Hacker News, YouTube.

| Стадия | Что печатает (verbatim из автокомплита/SERP) |
|---|---|
| Problem-aware | "claude code build saas", "how to build a saas with claude code", "claude code best practices", "vibe coding tests" |
| Solution-aware | "claude code starter kit", "claude code saas starter", "claude code boilerplate github", "next.js saas starter kit", "spec-driven development with claude code" |
| Product-aware | "shipfast alternative", "best claude code templates 2026", "supastarter vs shipfast" |
| Purchase | "\<brand> review", "\<brand> worth it", "claude code saas reddit" — решает присутствие в Reddit/IH-тредах, не SEO |

### RU-рынок

Разработчик/QA/DevOps 25–40, уже платит (или пытается платить из РФ) за Claude
Code. Читает Habr, сидит в Telegram-каналах про вайб-кодинг (экосистема вида
@vibecoding_tg), смотрит RU-YouTube. Боль — «агент без процесса генерит хаос».

Ключевая особенность: **покупательский шаг («стартер/boilerplate») RU-аудитория
проходит по-английски** и попадает в глобальную выдачу. Путь: «клод код что
это» (Yandex) → «claude code как оплатить в россии» (DTF/Skillbox) → «claude
code как пользоваться / с чего начать» (Google+Habr) → «cursor или claude code»
→ **"claude code starter kit" по-английски** → валидация в TG-чатах и на vc.ru.

---

## 2. Коллизия бренда «Liftkit» — отдельный вывод

**Вердикт: (b) управляемо с квалификатором, но на грани (a) «переименоваться»,
и главная угроза — не та, что ожидалась.**

Счёт коллизий (все проверены в SERP/whois 31.07.2026):

| # | Кто | Ниша | Опасность |
|---|---|---|---|
| 1 | **liftkitstudio.com** — «Liftkit», AI-фреймворк «идея→продукт», Tier 2 $99 = **Claude Code project template** | ТА ЖЕ: Claude Code + соло-фаундеры | **Высокая.** По «"liftkit" claude code» ранжируется он. Прямая путаница покупателей + вопрос приоритета коммерческого имени |
| 2 | Chainlift LiftKit — OSS UI-фреймворк (golden ratio UI) | Дев, соседняя | Низкая: 3.3k звёзд, но 629 npm-скачиваний/нед, README запрещает прод (rewrite ~50%), доменов liftkit.* не занимает |
| 3 | getliftkit.com — «LiftKit: The AI Marketing Playbook» (промпты) | AI + соло-мейкеры | Средняя: домен занят, ниша соседняя |
| 4 | liftkit.io — SaaS инвентаря для автодилеров | Другая | Домен занят |
| 5 | Schaeffler/Ewellix LIFTKIT — промышленные подъёмники | Другая | Шум в SERP |
| 6 | «lift kit» (два слова) — гигантский авто-рынок подвески | Другая | Google частично трактует "liftkit" как «lift kit»: **брендовый трафик по голому слову недостижим навсегда** |

Что смягчает: словом «liftkit» в SERP не владеет никто (выдача размазана);
точная фраза **"liftkit for claude code" — 0 результатов**, её можно занять
мгновенно; **liftkit.sh и liftkit.tools свободны**; useliftkit.com пустой и
**истекает 14.08.2026** (кандидат на дроп-кетч); liftkit.dev припаркован с 2023
(возможен выкуп). GitHub-орги `liftkit` и `liftkitapp` заняты.

Прецеденты «домен-как-бренд» при занятом имени (фоновые знания, не из SERP):
bolt.new (имя «Bolt» занято такси), polar.sh (делит имя с пульсометрами),
linear.app — в дев-аудитории схема работает, `.sh` терминальной аудитории
читается нативно.

**Рекомендация к решению по домену (открытый вопрос фазы 0):**
1. Дорогой домен не покупать до решения по имени.
2. Если имя остаётся: **liftkit.sh** + брендовая фраза «Liftkit for Claude
   Code» во всех title/H1/og:title + schema.org SoftwareApplication (name,
   alternateName, applicationCategory) + попытка перехватить useliftkit.com
   после 14.08.2026. Мониторить liftkitstudio.
3. **До первых продаж всерьёз взвесить лёгкий ребренд**: сейчас цена смены
   имени нулевая, а liftkitstudio.com иначе останется постоянной тенью в
   целевых запросах («liftkit claude code» придётся отвоёвывать, не занимать).
   Осторожно: паттерн «\<X>Kit for Claude Code» уже шумный (клоны ClaudeKit:
   getclaudekit.com, theclaudekit.com и др.).

### РЕШЕНИЕ (Катя, 2026-08-02): ребренд → **Gridfin**

Проверено 11 кандидатов (лог: 2026-08-02-rename-candidates.md); чистыми
вышли Launchrail, Strongback, Gridfin — выбран **Gridfin** (решётчатые рули
ракеты: управление полётом). Факты на дату проверки: в дев-нише выдача по
имени пустая; npm `gridfin`, домены gridfin.dev и gridfin.sh свободны;
GitHub-орг занят малым неактивным аккаунтом → брать вариант (`gridfin-hq` /
`usegridfin`). Известный нюанс: голая выдача подтекает в «Gridfinity»
(3D-печатные органайзеры) — не ниша, квалифицированные запросы чистые.
Брендовая фраза: **«Gridfin for Claude Code»**.

Хостинг лендинга: **поддомен `gridfin.ludvik4.dev`** (Vercel), собственный
домен покупается позже по сигналу продаж. Дроп-кетч useliftkit.com и вся
liftkit-митигция снимаются за ненадобностью. Весь дальнейший копирайт
(фазы 2–5) пишется под имя Gridfin; переименование самого продукта
(репо/README/манифест) — отдельная задача вне лендинга.

---

## 3. Конкуренты: title / H1 / позиционирование

| Продукт | Цена | Title | H1 | Agent-угол |
|---|---|---|---|---|
| ShipFast (shipfa.st) | $199–299 | "Launch Your Startup in Days, Not Weeks \| ShipFast" | "Ship your startup in days, not weeks" | Один FAQ-пункт про AI-редакторы. Слабейший |
| MakerKit (makerkit.dev) | Free / $279–519 | "Next.js SaaS Starter Kit & Boilerplate \| MakerKit" | **"The Next.js SaaS Starter Kit your AI agent builds on."** | Глубокий: rules для Claude Code/Cursor/Codex, MCP-сервер, секции "AI Agents", "Optimized for LLMs" |
| Supastarter (supastarter.dev) | €349–1499 | "Next.js SaaS Boilerplate & Starter Kit \| supastarter" | **"The Next.js SaaS boilerplate your AI agent deserves"** | Максимальный: отдельная страница **/claude-code-boilerplate** (AGENTS.md-воркфлоу), бейджи агентов |
| next-forge (Vercel) | Free OSS | "Production-grade Turborepo template for Next.js apps" | то же | Ноль на сайте. Бесплатный якорь категории |
| GStack (gstacks.org, Garry Tan/YC) | Free MIT | "GStack — Turn Claude Code into a Virtual Software Development Team" | то же | Продаёт ПРОЦЕСС без кода; 9 скиллов; органика на имени Garry Tan |
| Archon (archon.diy) | Free OSS | "Archon — The command layer for your AI coding agents" | то же | Оркестрация/harness для power-users, не стартер |
| **Build This Now Code Kit** | **$29** | "Claude Code Starter Kit: The Fastest Way to a Production SaaS (2026)" | то же | **Структурно ближайший конкурент**: harness-слой (агенты, команды, скиллы, «quality gates») + production-слой (auth, Stripe, RLS). Но «гейты» = линт/типы/билд, без обязательных тестов и spec-first |
| **Kitstarter (kitstarter.dev)** | **$10** | "kitstarter" (SEO-слабый) | то же | Конкурент по цене и идее «ask before it builds»: 17 скиллов поведения, анти-slop. Без SaaS-кода, без тестов |
| HashBuilds | Free + апселл | "Claude Code Starter Templates - Build Apps with AI…" | "Claude Code Starter" | Библиотека промптов, конкурент только в SERP |
| Sinter | ? | не индексирован | — | По описаниям в статьях — почти клон идеи Liftkit (skills, hooks, "verification protocol"). **Держать на радаре** |

### Выводы по конкурентам

1. **Лакуна «процесс + код в одном»** почти не занята как SEO-позиция:
   инкумбенты продают код с agent-readiness-фичами, процесс-инструменты — 
   процесс без кода. Двухслойные (Build This Now, Sinter) молоды и SEO-слабы.
2. **«Обязательные тесты» не заявляет никто.** Ближайшее — "quality gates"
   (линт/типы/билд) и "guardrails". Клейм «no feature ships without a test
   proven able to fail» — уникален и защищаем. Это дифференциатор Liftkit №1.
3. **Onboarding-агент, который интервьюирует и пишет PRD/спеки** — свободно
   (Kitstarter's ask-first — поведение агента, не онбординг продукта).
4. **H1-штамп 2026: "…your AI agent {builds on|deserves}"** — уже у двоих.
   Третий такой H1 не делать.
5. Анти-vibe-coding нарратив застолблён MakerKit/Supastarter. Наш угол другой:
   «boilerplate без процесса всё равно даёт хаос — агенту нужны рельсы: спеки,
   гейты, тесты».
6. Цена $10 ложится в конвенцию категории (у всех якорные скидки/срочность);
   отстраиваться надо от «дёшево = только скиллы» (Kitstarter).
7. Аутрич-цели (листиклы, уже ранжируются): ayautomate.com, iwoszapar.com,
   buildthisnow.com, clskillshub.com, heyclau.de, buildmvpfast.com.

---

## 4. Кластеры EN

| # | Кластер | Примеры (verbatim) | Частотность (кач.) | Кто ранжируется | Реалистичность |
|---|---|---|---|---|---|
| 1 | Claude Code ecosystem | "claude code starter kit", "claude code saas starter", "claude code saas boilerplate", "claude code build saas" | medium, растёт | GitHub-репо, листиклы, supastarter /claude-code-boilerplate | **Главная цель.** SERP разнороден, доминации нет; достижимы хвосты. Осторожно: "claude code templates" = чужой бренд (aitmpl/davila) — не таргетить |
| 2 | SaaS boilerplate category | "next.js saas starter" (+kit/template/free/github/shadcn), "saas boilerplate", "ai saas boilerplate" | high | ShipFast, MakerKit, supastarter, листиклы, next-forge | **Красный океан — головные не брать.** Тактика: попадать в листиклы + закрывать хвосты ("next.js saas starter for claude code", "…with tests") |
| 3 | Workflow / spec-driven / agent-native | "spec-driven development with claude code" (автокомплит!), "claude code workflow", "agent-native architecture", "claude code hooks quality gates" | medium, растёт | Только образовательный контент (DataCamp, Augment, dev.to) — ни одного продукта | Язык покупателя: слова должны быть НА странице (H2/FAQ), H1-битву не выиграть. "agent-native" для Next.js+Claude Code свободен (saas-js.com говорит похожее, но про TanStack) |
| 4 | Testing / quality | "saas boilerplate with tests", "vibe coding tests" (автокомплит, растёт), "claude code starter tests quality gates" | near-zero | Никто не строит позиционирование на тестах — у всех «фича в списке» | **Дифференциатор, не трафик.** Несём в H2 + FAQ ("How do you stop Claude Code from shipping untested code?") |
| 5 | Сравнения | "shipfast alternative" (+reddit/open source), "supastarter vs shipfast", "shipfast alternative for claude code" | medium / near-zero | У всех игроков выделенные /alternative-страницы, PH, G2, IH-треды | Головной — плотный. Свободный угол: **"ShipFast alternative for Claude Code users"** — отдельная страница позже, не лендинг |

---

## 5. Кластеры RU и честный вывод

### Реальные частотности (Яндекс Вордстат, Россия, 30.06–29.07.2026)

| Запрос (синтаксис Вордстата) | Показов/мес | Показательный хвост |
|---|---|---|
| `claude code` | **72 668** | скачать 2 210 · api 2 189 · подписка 1 938 · бесплатно 1 443 · **в россии 1 441** · купить 1 128 · как использовать 1 078 · mcp 1 402 · skills 1 282 · аналоги 542 |
| `клод код` (кириллицей) | **10 659** | нейросеть 454 · скачать 427 · подписка 408 · купить 304 |
| `вайб кодинг` | **12 055** | курсы 580 · бесплатно 337 · обучение 262 · claude вайб кодинг 96 · вайб кодингу на claude code 63 |
| `claude code (шаблон\|стартер\|boilerplate\|темплейт\|starter)` | **35** | «Нет подходящих запросов» — хвоста не существует |
| `saas (шаблон\|стартер\|бойлерплейт\|boilerplate\|starter)` | **58** | хвоста нет |
| `(сделать\|создать) saas` | **102** | «как создать saas продукт пошагово» 5 |
| `пет проект` | 7 655* | *загрязнён омонимом «поёт проект» (лемматизация); дев-хвост мал: «идеи для пет проектов» 127, «на python» 69 |
| Сравнения из хвоста `claude code` | — | codex vs claude code 350 · claude code или codex 327 · vs cursor 170 · или cursor 155 |

Что цифры добавляют к качественным выводам:

- **Интерес к Claude Code в RU большой** (72k+11k/мес) — аудитория есть, и
  латиница бьёт кириллицу в 7 раз (подтверждает: «Claude Code» в текстах — 
  латиницей; «клод код» — один раз для Яндекса).
- **Коммерческого кластера нет ни у Claude Code, ни у SaaS вообще**: все
  «стартер/шаблон/boilerplate»-формулировки вместе — 35 и 58 показов/мес,
  «сделать saas» — 102. Это не «мало» — это отсутствие спроса.
- Хвост `claude code` — на 100% «доступ/установка/оплата из РФ» и инструменты
  (mcp, skills, агенты): подтверждение карты интентов раздела 1.
- «вайб кодинг» (12k) — курсы и обучение, ed-tech ЦА; наш вход там только
  контентный.

**RU-поискового спроса на «Claude Code + SaaS-стартер» как коммерческий запрос
НЕТ — теперь это подтверждено Вордстатом, не только автокомплитом.**
Покупательский шаг RU-аудитория проходит по-английски → глобальная выдача,
куда RU-страница не встанет.

**Следствие: RU-лендинг работает на конверсию трафика из Telegram/Habr/vc.ru,
а не на SEO.** Его SEO-задача минимальна: брендовые («liftkit», «liftkit
стартер») и следовые запросы («saas стартер для claude code» — 0 конкуренции,
~0 объёма) закрываются самим фактом существования страницы.

Живые RU-кластеры (для контент-маркетинга, не лендинга):

| Кластер | Примеры | Частотность (кач.) | Кто ранжируется | Ход |
|---|---|---|---|---|
| A. «Claude Code по-русски» | «claude code как пользоваться/установить/**оплатить в россии**», «с чего начать», «клод код что это» | средняя, растёт | Habr (5+ гайдов 2025–26), vc.ru, Skillbox, DTF; малые сайты пробиваются | Статья-гайд с CTA на лендинг; хвосты «claude code готовый проект/скелет» свободны |
| C. Вайб-кодинг | «вайб кодинг что это / как начать / для начинающих», «как сделать свой saas» (слабый, Google-only) | высокая, но смешанная ЦА | Ed-tech медиа (Skillbox, Netology, thecode.media) | Лендингу — нет. Щель: статья «Как сделать свой SaaS с Claude Code за выходные» |
| D. Пет-проекты | «пет проект для devops/фронтендера», идеи по языкам | средняя, интент карьерный | Habr, tproger | Щель на стыке D×A: «Пет-проект с Claude Code: от идеи до деплоя» |
| Бонус | «cursor или claude code» — RU-подсказки есть | средняя | Сравнительные статьи | Точный вход ЦА; статья, не лендинг |

Формат RU-контента: статьи на Habr/vc.ru (свой блог на RU ранжируется хуже и
дольше) с CTA на лендинг.

---

## 6. MT-локали: язык поиска и стратегия SEO-полей

Все 5 локалей → стратегия **гибрид**: Liftkit / Claude Code / Next.js / SaaS /
starter kit не переводятся, вокруг — локальная глагольная рамка. Глубина
локализации по убыванию: **JA > PT-BR ≈ FR > ES > DE**.

| Локаль | Язык поиска | Ключевые живые запросы (verbatim) | Gotchas |
|---|---|---|---|
| DE | Максимально англизирован: автокомплит "saas boilerplate" даёт только англ. хвосты | "Claude Code Tutorial Deutsch", "Claude Code Anleitung", "app mit ki erstellen", "claude code preis" | Description ≤150 зн. (немецкий длиннее на ~25%); обращение **du** (весь DE-контент про Claude Code на du); композиты через дефис («Agent-natives») |
| ES | Смешанный | "Claude Code desde cero", "crear app con ia" (10 хвостов), "claude code gratis/precio/descargar", "crear saas con ia" | Обращение **tú**; нейтральный испанский без иберийских/LatAm-маркеров; "plantilla" слабее англ. "starter kit" |
| PT-BR | Самый локализованный из европейских | "criar saas com ia", **"criar micro saas com ia"** (тренд Micro-SaaS!), "Claude Code do Zero", "claude code preço" | Строго PT-BR («aplicativo», **você**), не PT-PT; цена "US$ 10"; hreflang `pt-BR`; упомянуть Micro-SaaS в контенте |
| FR | Смешанный; **автокомплит «créer un saas» даёт «créer un saas avec claude code» второй подсказкой** — прямой intent-match | "créer un saas avec claude code", "créer un saas ia", "comment créer un saas", "claude code gratuit" | Инди-ниша на **tu**, для meta безопасен vous; франц. типографика (пробел перед «:», "10 $"); «IA», не «AI» |
| JA | Микс: латиница для инструментов + японские хвосты | "Claude Code テンプレート" (автокомплит, ветвится: プロンプト/skills/サブエージェント), "個人開発" (ключевой термин инди-ниши), "claude code インストール" | Title ~28–32 **полноширинных** зн., разделитель «｜»; description ~80–120 зн. (не 155); крючок **«買い切り»** (единоразовая покупка); нейтральный стиль без ですます в title |

---

## 7. Итог: карта «кластер → блок лендинга»

| Блок лендинга | Кластер / запросы | Что вписать |
|---|---|---|
| **Hero H1 + подзаголовок** | EN-1 + дифференциатор EN-4 | «Claude Code SaaS starter (kit)» + tests/specs/gates. НЕ делать третий H1 «…your AI agent deserves». Пример направления: "The agent-native SaaS starter kit for Claude Code" + подстрока "Next.js starter with specs, tests and quality gates built in" |
| **Проблема → решение** | EN-3 (язык боли) | «boilerplate без процесса → хаос», "vibe coding" упомянуть; наш нарратив-рельсы |
| **Как работает (/liftoff)** | EN-3 | Точная фраза "spec-driven development" + "onboarding agent that writes your PRD" (свободный клейм) |
| **Что внутри** | EN-2 (хвосты) | "Next.js SaaS starter" вхождение, TypeScript, shadcn, Vercel; "CLAUDE.md", "skills", "subagents" (маркеры экосистемы) |
| **Качество как фича** | EN-4 | "Tests your agent can't skip", "quality gates", "hooks", Vitest + Playwright. Главный уникальный клейм: тест обязан уметь падать |
| **FAQ** | EN-5 + EN-3 + EN-4 | "How is this different from ShipFast or supastarter?", "Does it include tests and CI gates?", "What is spec-driven development with Claude Code?", "Is there a free version on GitHub?" |
| **Отдельные страницы позже** | EN-5, RU A/C/D | "/shipfast-alternative-for-claude-code"; блог "Spec-driven development with Claude Code"; Habr-статьи (RU) |

### Кандидаты seo.title / seo.description по локалям

**EN** (основной + A/B):

1. Title (52): `Gridfin — Agent-Native SaaS Starter Kit for Claude Code`
   Desc (156): `A Next.js SaaS starter built for Claude Code: spec-driven workflow, enforced tests and quality gates. Ship your side project fast — without vibe-code chaos. $10.`
2. Title (51): `Claude Code SaaS Starter with Tests & Quality Gates`
   Desc (154): `Stop babysitting your AI. Gridfin is a Next.js starter kit where Claude Code follows specs, writes tests and passes gates before anything ships. Just $10.`
3. Title (54): `Ship a SaaS with Claude Code — Spec-Driven Starter Kit`
   Desc (158): `Gridfin gives Claude Code the structure it needs: specs, hooks, test gates and a Next.js SaaS skeleton. From idea to deployed side project in days, not weekends.`

Рекомендация: №1 основной (бренд + точное вхождение "SaaS starter kit for
Claude Code"), №2 — для A/B на боль тестов.
Примечание для фазы A (бета): в description "$10" заменить на
"Free while in beta" — цена вернётся при переключении фазы.

**RU**:

1. Title (49): `Стартер для Claude Code: запусти SaaS за выходные`
2. Title (38): `Gridfin — SaaS-стартер для Claude Code`
   Desc (155): `Gridfin — готовый Next.js-стартер, заточенный под Claude Code: скиллы, тесты, гейты качества и деплой. Запустите свой SaaS или пет-проект за выходные. $10.`
   Desc-альт (154): `Агентный стартер для Claude Code: спеки, тесты, ревью и гейты уже настроены. Опишите идею — агент соберёт ваш SaaS по процессу, а не на вайбе. Цена — $10.`

**MT-локали** (по одному черновику; ревью — фаза 5):

| Локаль | title | description |
|---|---|---|
| DE | `Gridfin – SaaS Starter Kit für Claude Code & Next.js` | `Agent-natives SaaS Starter Kit für Claude Code: Next.js, Auth, Tests und Deploy in einem Template. Starte dein SaaS in Stunden statt Wochen – für 10 $.` |
| ES | `Gridfin – starter kit SaaS para Claude Code y Next.js` | `Starter kit SaaS agent-native para Claude Code: Next.js, auth, tests y deploy listos. Crea tu SaaS con agentes de IA en horas, no semanas. Solo 10 $.` |
| PT-BR | `Gridfin – starter kit SaaS para Claude Code e Next.js` | `Starter kit SaaS agent-native para Claude Code: Next.js, auth, testes e deploy prontos. Crie seu SaaS ou micro-SaaS com IA em horas, não semanas. Por US$ 10.` |
| FR | `Gridfin – starter kit SaaS pour Claude Code et Next.js` | `Starter kit SaaS agent-native pour Claude Code : Next.js, auth, tests et deploy prêts. Créez votre SaaS avec l'IA en quelques heures, pas des semaines. 10 $.` |
| JA | `Gridfin｜Claude Code対応 SaaSスターターキット（Next.js）` | `Claude Codeネイティブ設計のSaaSテンプレート。Next.js・認証・テスト・デプロイまで一式。個人開発のSaaSを数時間で立ち上げ。10ドル買い切り。` |

(Для фазы A во всех локалях цену в description заменить на локальный аналог
«free in beta» — фиксируется в JSON обоими вариантами по решению фазы 0.)

### Слова, обязанные быть в тексте

**EN:** Claude Code (в H1/H2, многократно) · SaaS starter kit · boilerplate ·
Next.js · TypeScript · agent-native · spec-driven development (полная фраза) ·
tests / Vitest / Playwright · quality gates · hooks · ship fast · ShipFast
alternative (FAQ) · supastarter (FAQ-сравнение) · side project · indie hacker ·
CLAUDE.md · skills · subagents · $10 / one-time.

**RU:** Claude Code (латиницей — так ищут даже в Яндексе) · стартер · шаблон ·
SaaS · Next.js · запустить · пет-проект · вайб-кодинг · за выходные · тесты ·
спеки · ревью · гейты качества · деплой · агентный · скиллы · хуки · CLAUDE.md ·
процесс; по одному разу: boilerplate · starter kit · «клод код» (кириллицей,
для Яндекса, напр. в FAQ) · соло-разработчик. **Не строить заголовки** на
«бойлерплейт»/«стартер кит» (первый не ищут, второй занят нерелевантной
выдачей).

**Глоссарий непереводимого** (для всех локалей, идёт в фазу 4): Gridfin,
Claude Code, Next.js, TypeScript, Vercel, PGlite, shadcn/ui, Vitest,
Playwright, CLAUDE.md, AGENTS.md, имена скиллов (`/liftoff`, `/feature`,
`/review`, `/verify`, `/deploy`), SaaS, starter kit.

---

## 8. Что дальше (входы следующих фаз)

- ~~Решение по домену/имени~~ — **принято 2026-08-02**: ребренд в Gridfin,
  лендинг на `gridfin.ludvik4.dev` (см. раздел 2). GitHub-организацию решили
  не заводить (2026-08-02): репозитории остаются под аккаунтом `grooownow`.
  Оргзадача вне лендинга: переименовать продукт в репо/README/манифесте.
- **Фаза 2 (RU-копия):** ключевые слова из раздела 7; помнить, что RU-страница
  оптимизируется под конверсию, не под трафик.
- **Фаза 3 (EN-копия):** кластеры раздела 4, карта блоков и must-have из
  раздела 7; H1 не по штампу «your AI agent…».
- **Фаза 4 (схема/JSON):** seo.title/seo.description на локаль — кандидаты
  готовы; глоссарий — выше.
- **Контент-план после лендинга** (этап 3 стратегии): /shipfast-alternative
  страница, статьи EN (spec-driven development) и RU (Habr: «SaaS за выходные»,
  «Пет-проект с Claude Code», «Cursor или Claude Code»).
