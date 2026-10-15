## Lekcja 01 — Semantic HTML, landmarks i struktura nagłówków

**Data zakończenia:** 2026-10-15  
**Status:** ZALICZONA  
**Pull Request:** https://github.com/borys94/Accessible-Task-Manager/pull/1

### Poznane kryteria WCAG 2.2

- **1.3.1 Info and Relationships (A)** — semantyczny HTML, nagłówki, listy i relacje między treściami.
- **2.4.1 Bypass Blocks (A)** — skip link umożliwiający pominięcie powtarzalnej nawigacji.
- **2.4.6 Headings and Labels (AA)** — opisowe nagłówki.
- **2.4.7 Focus Visible (AA)** — widoczność fokusu klawiatury.

### Zaimplementowane funkcjonalności

- Semantyczna struktura strony z wykorzystaniem landmarks.
- Hierarchia nagłówków i listy zadań.
- Nazwy dostępne obszarów nawigacyjnych.
- Skip link prowadzący do głównej treści.
- Poprawiony atrybut `lang="en"` dokumentu.

### Testy automatyczne

- Playwright — weryfikacja landmarks i accessible names za pomocą `getByRole()`.
- Playwright — nawigacja klawiaturą i działanie skip linku.
- `@axe-core/playwright` — automatyczna analiza dostępności, uwzględniająca WCAG 2.2.

### Testy manualne

- Nawigacja klawiaturą.
- Widoczność fokusu.
- Aktywacja skip linku i pominięcie nawigacji.

Testy manualne zostały potwierdzone przez autora.

### Code review

**Werdykt:** Approved — z zastrzeżeniem braku niezależnej weryfikacji ostatecznego stanu wszystkich plików.

Omówione i poprawione problemy:
- Niezgodność języka dokumentu z językiem interfejsu.
- Testowanie atrybutów zamiast dostępnej semantyki.
- Brak pełnego testu klawiaturowego skip linku.
- Niepełna konfiguracja testów axe-core.
- Usuwanie widocznego obrysu fokusu — poprawa zgłoszona przez autora.

### Test wiedzy

| Próba | Wynik | Status |
|---|---|---|
| Pierwszy quiz (10 pytań) | 7,5/10 — 75% | Niezaliczony |
| Test poprawkowy (5 pytań) | 5/5 — 100% | Zaliczone |

**Próg zaliczenia:** 80%  
**Wynik końcowy:** ZALICZONA

### Zagadnienia do utrwalenia

- Hierarchia nagłówków: wymagania WCAG a dobre praktyki.
- `getByRole()` a selektory DOM w Playwright.
- Ograniczenia axe-core i konieczność testów manualnych.
- Testowanie fokusu oraz dynamicznych stanów interfejsu.

### Kolejna lekcja

**Lekcja 02 — Nawigacja klawiaturą i kolejność fokusu.**

Status: nierozpoczęta.