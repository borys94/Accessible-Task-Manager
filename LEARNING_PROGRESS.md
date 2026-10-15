# Learning Progress — Accessible Task Manager

Dziennik nauki: co zostało zrobione, czego dotyczyło i jakie wnioski z tego płyną.

_Ostatnia aktualizacja: 2026-10-15_

## Postęp

- [x] Szablon projektu: React 19 + TypeScript + Vite
- [x] Testy jednostkowe — najpierw Jest, potem migracja na Vitest (`passWithNoTests`, testy `*.test.tsx` usunięte)
- [x] Testy dostępności e2e: Playwright + `@axe-core/playwright`
- [x] Komponenty `Header`, `Main`, `Footer` jako landmarki (`banner`, `main`, `contentinfo`)
- [x] Style komponentów w plikach `*.module.scss`
- [x] Nawigacja z dwoma odnośnikami (`<nav aria-label="Main">`)
- [x] Hierarchia nagłówków: `h1` (aplikacja) → `h2` (strona) → `h3` (zadanie)
- [x] Lista trzech zadań jako `<ul>` / `<li>`, status zadania podany tekstem
- [x] Routing (react-router): `/tasks`, `/about`, aktywny link z `aria-current="page"`, tytuł karty per strona
- [x] Testy początkowego widoku: jeden `main`, `h1`, nazwana nawigacja, lista 3 zadań, brak naruszeń axe
- [x] Test skip linku z klawiatury
- [x] Poprawki po code review (CR-01 – CR-04) i reguły WCAG 2.2 w testach axe
- [ ] Ogłaszanie zmiany strony dla czytników ekranu po nawigacji (patrz „Otwarte kwestie”)

## Najważniejsze lekcje

### Struktura i semantyka
- **Landmarki** pozwalają czytnikom ekranu skakać między obszarami strony. `<header>` i `<footer>` są landmarkami `banner` / `contentinfo` tylko wtedy, gdy nie są zagnieżdżone w `<section>`, `<article>` itp.
- **Jeden `main` na stronę.** Wiele landmarków tego samego typu (np. kilka `<nav>`) wymaga unikalnych nazw dostępnych.
- **Hierarchia nagłówków** bez przeskakiwania poziomów (`h1` → `h2` → `h3`). Użytkownicy czytników nawigują po nagłówkach (np. klawisz `H`).
- **Listy** (`<ul>`, `<li>`) — czytnik ogłasza liczbę elementów, co ułatwia orientację.
- **Informacja nie tylko kolorem** — status zadania jest tekstem („Completed” / „To do”), kolor jest dodatkiem (WCAG 1.4.1).

### Język dokumentu
- `lang` na `<html>` musi odpowiadać faktycznemu językowi treści (WCAG 3.1.1). Zły `lang` = zła wymowa w czytniku ekranu.
- Przy wielojęzyczności: `lang` na `<html>` ustawiany dynamicznie, a fragmenty w innym języku oznaczane własnym atrybutem `lang` (WCAG 3.1.2).

### Fokus i klawiatura
- **Skip link** jako pierwszy element w kolejności Tab, widoczny po otrzymaniu fokusu (WCAG 2.4.1 Bypass Blocks).
- **`tabIndex`:**
  - `0` na elementach nieinteraktywnych (np. nagłówkach) — błąd, dodaje zbędny przystanek Tab.
  - `-1` — tylko dla celów fokusu ustawianego programowo; nie trafia do kolejności Tab, ale łapie fokus po kliknięciu myszą.
  - Bez `tabIndex` element docelowy skip linku nie dostaje fokusu — przeglądarka przesuwa jedynie punkt startowy nawigacji sekwencyjnej.
- **`outline: none`** samo w sobie nie łamie WCAG 2.4.7, ale ukrywanie fokusu na elemencie, na który przenosimy fokus, odbiera użytkownikowi orientację. Lepiej polegać na `:focus-visible`.
- **SPA a zmiana strony:** przeglądarka nie ogłasza zmiany trasy. Typowe rozwiązania: przeniesienie fokusu na nagłówek nowej strony, region `aria-live` z komunikatem, aktualizacja `document.title`.

## Przydatne komendy

```bash
yarn dev          # aplikacja
yarn test:e2e     # wszystkie testy Playwright
yarn test:a11y    # testy dostępności
yarn playwright test --ui   # tryb interaktywny
```

## Źródła

- [WCAG 2.2 — Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core — reguły i tagi](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Playwright — testy dostępności](https://playwright.dev/docs/accessibility-testing)
- [MDN — `tabindex`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex)
