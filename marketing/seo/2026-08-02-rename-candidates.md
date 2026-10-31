# Проверка кандидатов на ребрендинг Liftkit

Дата: 2026-07-31. Критерии: понятная коннотация (запуск/стапель/процесс), чистая SERP в dev/AI-нише (блокер), свободный GitHub org и .dev/.sh домен (желательно).

Статус: в работе, кандидаты добавляются по мере проверки.

## Сводка доменов/реестров (curl/rdap/whois, 2026-08-02)

| Имя | github.com/<name> | npm | .dev | .sh |
|---|---|---|---|---|
| launchrail | занят (200, проверить кем) | СВОБОДЕН | СВОБОДЕН (rdap 404) | СВОБОДЕН ("Domain not found") |
| slipway | занят | занят | занят | занят |
| groundcrew | занят | занят | занят | СВОБОДЕН |
| gantry | занят | занят | занят | занят |
| preflight | занят | занят | занят | занят |
| drydock | занят | занят | занят | занят |
| strut | занят | занят | занят | занят |
| flightdeck | занят | занят | занят | занят |

## 1. Launchrail — USABLE-WITH-CAVEAT (лучший из восьми)

- SERP пуст: поиск ""launchrail" software OR app OR startup" — "I did not find a product or company specifically called 'LaunchRail'"; поиск "Launchrail dev tool github" — "I didn't find a specific GitHub repository or tool called 'Launchrail'". Голое слово "launch rail" — ракетомодельная фурнитура (не dev-ниша, не мешает).
- github.com/launchrail — ЗАНЯТ, но слабо: свежая организация, 5 репо, "Installable AWS platform blueprint: EKS + Argo CD + GitOps contract + guardrails", "Zero stars, forks, and issues across repositories", последняя активность 2026-02-11. Каveat: имя org придётся брать вариантом (launchrail-hq / uselaunchrail), и есть зачаточный devops-проект с тем же именем.
- npm `launchrail` — СВОБОДЕН; launchrail.dev — СВОБОДЕН; launchrail.sh — СВОБОДЕН.
- Трейдмарк-рисков не видно.
- Вердикт: **USABLE-WITH-CAVEAT** — чистая SERP, свободные домены и npm; единственный минус — занятый (но мёртво-тихий) GitHub org.

## 2. Slipway — BURNED

SERP в dev-нише плотно занята несколькими живыми OSS-проектами:
- slipwayhq/slipway + slipway.co — активный фреймворк дашбордов: "Slipway is an open source framework for displaying useful information on your devices… write Components in Javascript or any language that compiles to WASM"
- sailscastshq/slipway — "The Sails-native deployment platform" (деплой-платформа! прямое пересечение по коннотации)
- factorhouse/slipway — "a Clojure Companion to Jetty"
- getnelson/slipway — "Compact binary for integrating Nelson with your CI"
Все реестры заняты. Вердикт: **BURNED** — минимум четыре dev-инструмента с этим именем, включая деплой-платформу.

## 3. Groundcrew — BURNED

Прямая коллизия в нише AI-агентов для кодинга:
- ClipboardHealth/groundcrew — "Dispatch your task backlog to local, interactive AI coding agents. One git worktree per task, sandboxed by default." — та же аудитория (Claude Code / агентные воркфлоу)
- prolego-team/groundcrew — "An Open Source LLM RAG for Your Code"
- Groundcrew MCP server (glama.ai) — "lets Claude and other MCP-compatible agents record and query action receipts"
Вердикт: **BURNED** — имя уже трижды использовано именно в AI-agent-dev нише.

## 4. Gantry — BURNED

- Gantry 5 (RocketTheme) жив: RocketTheme закрылся 30.06.2025, но "the Gantry framework itself… now in the hands of Tiger12, its official steward, and still actively maintained", gantry.org активен — SERP по "gantry framework" навсегда про темизацию WP/Joomla/Grav.
- Плюс известен Gantry (gantry.io) — ML observability стартап.
- gantry.dev/.sh/npm/github заняты.
Вердикт: **BURNED** — живой одноимённый веб-фреймворк с 10+ летней историей.

## 5. Preflight — BURNED

- Applitools Preflight — коммерческий продукт: "Applitools Acquires Preflight to Further Apply AI to App Testing"; "AI-Powered Codeless Testing" (applitools.com/platform/preflight) — большой бренд в тестировании, трейдмарк-риск
- Preflight — компания YC (ycombinator.com/companies/preflight)
- Aurigma Preflight Tool, Enhance preflight pattern, плюс вечный CORS preflight — термин перегружен
- Все реестры заняты. Вердикт: **BURNED** — коммерческий одноимённый продукт в AI-testing + generic-термин.

## 6. Drydock — BURNED

- DryDock CLI — "Local-first CLI Coding Agent… TUI coding assistant designed to work with local LLMs" (drydock-cli.com) — прямая коллизия в нише кодинг-агентов
- sandstorm/drydock — Docker debugging tools; zuBux/drydock — Docker security audit; Airship Drydock (OpenStack) — REST orchestrator; Nekroze/drydock — Docker cluster utility
- Все реестры заняты. Вердикт: **BURNED** — имя плотно занято docker-тулингом и живым coding-агентом.

## 7. Strut — BURNED

- Фатальное соседство с Apache Struts: "Apache Struts is a free, open-source, MVC framework for creating elegant, modern Java web applications" — SERP по strut/struts в dev-контексте навсегда про Java (и про CVE Струтса)
- Strut (tantaman/Strut + десятки форков) — "An ImpressJS GUI / Authoring Tool" (редактор презентаций)
- Все реестры заняты. Вердикт: **BURNED** — поисковая тень Apache Struts + одноимённый OSS-редактор.

## 8. Flightdeck — BURNED

- flightdeckhq/flightdeck — "Observability and control plane for AI agents. Every LLM call, MCP event, and tool call agents make streams to the dashboard" — прямая коллизия в AI-agent нише, включая org flightdeckhq
- Arctir Flightdeck — "API-first developer platform built on top of the open-source Backstage project" (Internal Developer Platform)
- justinchuby/flightdeck — "Your AI software engineering team"
- Signiant Flight Deck, Flightdeck CRM (Capterra) — коммерческие продукты
- Все реестры заняты. Вердикт: **BURNED** — минимум два живых продукта в AI/dev-platform нише.

# Дополнительные кандидаты (свои)

## 9. Strongback — USABLE-WITH-CAVEAT

Метафора: strongback — ферма, которая держит ракету на стартовом столе до запуска ("the structure that holds the rocket upright until launch"). Идеально ложится на нарратив "каркас, который держит агента".
- SERP: strongback/strongback-java — "A library for FIRST Robotics Competition robots" (неактивна с ~2017); Strongback Consulting (strongback.us) — "Mainframe DevOps Experts" (консалтинг, не продукт); лёгкое соседство со strongloop/loopback. В нише SaaS-стартеров и AI-агентов — пусто.
- github.com/strongback — занят (та самая мёртвая FRC-библиотека); npm `strongback` — СВОБОДЕН; strongback.dev — СВОБОДЕН; strongback.sh — СВОБОДЕН.
- Вердикт: **USABLE-WITH-CAVEAT** — коллизии только с мёртвой robotics-библиотекой и mainframe-консалтингом; домены и npm свободны, org придётся вариантом.

## 10. Tarmac — BURNED

- Tarmac.io — "global custom software development company… founded in Minneapolis in 2012", активная компания-аутсорсер в софтверной нише (трейдмарк-риск), плюс madflojo/tarmac (serverless framework).
- Все реестры заняты (github, npm, tarmac.dev, tarmac.sh). Вердикт: **BURNED**.

## 11. Launchway — BURNED

- Фатально: "Launchway is a comprehensive Remix starter kit… user authentication, payment processing, subscription management… save developers between 40 to 65+ hours" (launchway.pages.dev + Crunchbase) — ТОТ ЖЕ продуктовый класс (SaaS starter kit), что и у нас. Хуже коллизии, чем у Liftkit сейчас.
- Вердикт: **BURNED** — одноимённый конкурирующий starter kit.

## 12. Gridfin — USABLE-WITH-CAVEAT

Метафора: решётчатые рули Falcon 9 — управляющие поверхности, которые ведут ракету (коннотация "управляемость/наведение", чуть слабее про "запуск").
- SERP: продукта "Gridfin" в dev-нише нет; выдача — Gridfinity (3D-печатные органайзеры) и icl-rocketry/Ricardo-Gridfins ("gridfin controller", студенческая ракетная команда). github.com/GridFin существует (мелкий аккаунт).
- npm `gridfin` — СВОБОДЕН; gridfin.dev — СВОБОДЕН; gridfin.sh — СВОБОДЕН.
- Каveat: поисковики тянут "gridfin" к "Gridfinity"; метафора менее самообъясняющая, чем launchrail.
- Вердикт: **USABLE-WITH-CAVEAT** — чисто в dev-нише, но SERP-bleed в Gridfinity и не «запусковая» коннотация.

# Итоговый рейтинг

1. **Launchrail** — чистейшая SERP, npm + .dev + .sh свободны; минус только тихий одноимённый GitHub org (zero stars). Лучшая связка с нарративом "агенту нужны рельсы".
2. **Strongback** — npm + .dev + .sh свободны, коллизии мёртвые/нерелевантные; метафора "ферма, держащая ракету" сильная, но требует одной строки объяснения.
3. **Gridfin** — npm + .dev + .sh свободны, dev-ниша чистая; но Gridfinity-шум и коннотация "наведение", а не "запуск".
4. Все остальные восемь из исходного списка — BURNED (см. выше).
