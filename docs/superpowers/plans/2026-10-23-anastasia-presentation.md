# Anastasia HTML Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Самодостаточная HTML-презентация (12 слайдов) о мультфильме «Анастасия» с героями и альтернативным финалом для институтского доклада.

**Architecture:** Один `index.html` со встроенными CSS/JS; слайды — секции `.slide`; навигация клавиатурой/кликом; картинки из локальной папки `images/` с плейсхолдерами при отсутствии файла.

**Tech Stack:** HTML5, CSS3, vanilla JS (без CDN и сборки)

## Global Constraints

- Русский язык, академический тон
- Макет героев: текст слева ~45% / картинка справа ~55%
- Финал: Аня и Дмитрий выбирают друг друга
- Герои: Анастасия, Дмитрий, Владик, Распутин, Мария, Софи, Барток
- Открывается через `file://` без сервера
- Без внешних зависимостей

---

## File structure

- Create: `anastasia-presentation/index.html` — вся презентация
- Create: `anastasia-presentation/images/README.md` — список имён файлов картинок
- Reference: `docs/superpowers/specs/2026-10-23-anastasia-presentation-design.md`

---

### Task 1: Каркас HTML + навигация + стили

**Files:**
- Create: `anastasia-presentation/index.html`

**Interfaces:**
- Produces: `.slide` (одна видима через `.active`), `goTo(index)`, `next()`, `prev()`, индикатор `#slide-num`

- [ ] **Step 1: Создать `index.html` с оболочкой, CSS и JS навигации**

Включить:
- CSS-переменные: тёмно-синий фон, золотой акцент, светлый текст
- `.deck` на весь viewport; `.slide` скрыты, `.slide.active` flex
- Layout `.split`: две колонки; на ширине <720px — колонка
- `.media` / `.media-placeholder` для картинок
- JS: ArrowLeft/Right, Space, клик по правой/левой половине или кнопки; `keydown` preventDefault для Space
- Счётчик «N / 12»

- [ ] **Step 2: Проверка навигации**

Открыть файл в браузере. Ожидание: один слайд виден; ← → и пробел переключают.

---

### Task 2: Контент 12 слайдов + папка images

**Files:**
- Modify: `anastasia-presentation/index.html`
- Create: `anastasia-presentation/images/README.md`

**Interfaces:**
- Consumes: каркас `.slide` / `.split` / `.media` из Task 1
- Image paths: `images/poster.jpg`, `anastasia.jpg`, `dimitri.jpg`, `vlad.jpg`, `rasputin.jpg`, `marie.jpg`, `sophie.jpg`, `bartok.jpg`, `ending.jpg`
- `onerror` на `<img>` показывает соседний `.media-placeholder`

- [ ] **Step 1: Добавить 12 слайдов с текстом**

1. Титул + поля ФИО / группа  
2. О мультфильме (1997, Fox Animation / Don Bluth) + `poster.jpg`  
3–9. Герои с кратким академическим описанием  
10. Наш финал  
11. Почему такой финал (3 аргумента)  
12. Заключение / спасибо  

- [ ] **Step 2: Создать `images/README.md` со списком файлов**

- [ ] **Step 3: Визуальная проверка**

Открыть `index.html`: все 12 слайдов, плейсхолдеры без картинок, читаемый текст на проекторном масштабе (~100–125%).

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| 12 слайдов | 2 |
| split layout | 1–2 |
| полный состав героев | 2 |
| финал Аня+Дима | 2 |
| плейсхолдеры images | 1–2 |
| file:// без CDN | 1 |
| институтский тон | 2 |
