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

## Lekcja 02 — Nawigacja klawiaturą i zarządzanie fokusem

- **Data:** 2026-10-15
- **Status:** Zaliczona
- **Pull Request:** [PR #2](https://github.com/borys94/Accessible-Task-Manager/pull/2)
- **Code review:** Approved
- **Test wiedzy:** 8,5/10 (85%) — zaliczony, próg 80%

### Poznane kryteria WCAG 2.2

- 2.1.1 Keyboard (A)
- 2.1.2 No Keyboard Trap (A)
- 2.4.1 Bypass Blocks (A)
- 2.4.3 Focus Order (A)
- 2.4.7 Focus Visible (AA)
- 2.4.11 Focus Not Obscured (Minimum) (AA)

### Zaimplementowane funkcjonalności

- Nawigacja klawiaturą po elementach interaktywnych.
- Skip link umożliwiający pominięcie powtarzalnej nawigacji.
- Widoczny wskaźnik fokusu.
- Natywne przyciski obsługiwane klawiszami Enter i Space.
- Dostępne nazwy przycisków akcji na zadaniach.

### Testowanie

- Playwright: kolejność fokusu, Tab i Shift+Tab, skip link, widoczność fokusu, aktywacja przycisków.
- @axe-core/playwright: automatyczna kontrola dostępności.
- Testy manualne: klawiatura i czytnik ekranu.
- Zgłoszone wyniki testów: pozytywne.

### Code review

- Zidentyfikowane wcześniej problemy zostały poprawione.
- Pozostała nieblokująca sugestia dotycząca stabilności testowania widoczności fokusu za pomocą porównywania screenshotów.
- Werdykt: Approved.

### Zagadnienia do powtórki

- Weryfikacja skip linków i rzeczywistego punktu nawigacji.
- Dynamiczne zmiany accessible name a live regions.
- Kiedy stosować aria-live="polite" i aria-live="assertive".

## Lekcja 03 — Formularze i dostępna walidacja

- **Data ukończenia:** 16.10.2026
- **Status:** Zaliczone
- **WCAG:** 1.3.1 (A), 2.5.3 (A), 3.3.1 (A), 3.3.2 (A), 4.1.2 (A), 4.1.3 (AA)
- **Implementacja:** Formularz z etykietami, dostępnymi nazwami i opisami oraz obsługą walidacji.
- **Testowanie:** Playwright, axe-core, asercje dostępnych nazw i opisów, analiza zachowania fokusu.
- **Code review:** Approved (przegląd statyczny; bez uruchamiania testów).
- **Test wiedzy:** 7/10 (70%) — niezaliczony.
- **Test poprawkowy:** 4/5 (80%) — zaliczony.
- **Zagadnienia do powtórki:** WCAG 2.5.3 Label in Name, `fieldset`/`legend`, ogłaszanie błędów przez czytniki ekranu.
- **Kolejny krok:** Lekcja 04 — temat do ustalenia na podstawie planu nauki i aktualnego stanu repozytorium.