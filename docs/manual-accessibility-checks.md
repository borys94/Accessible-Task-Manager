# Testy manualne dostępności

Testy automatyczne sprawdzają drzewo dostępności (role, nazwy, stany, opisy) i kolejność aktualizacji DOM względem fokusu.
Nie sprawdzają, **co faktycznie mówi czytnik ekranu** — to wymaga testu manualnego.

Konfiguracje:

| Czytnik | Przeglądarka | System |
|---|---|---|
| NVDA (aktualna wersja) | Chrome, Firefox | Windows |
| VoiceOver | Safari | macOS |

Przed testem: `npm run dev`, otwórz `http://localhost:5173/tasks`. Wszystkie kroki wykonuj **wyłącznie klawiaturą**.

## Formularz „Add a task” — walidacja tytułu (WCAG 3.3.1, 3.3.3, 4.1.2)

Cel: po nieudanym submit błąd zostaje ogłoszony **od razu**, bez dodatkowego naciskania Tab ani przeglądania strony.

### M1. Pusty tytuł, submit przyciskiem

1. Tab do przycisku „Add task” (pole tytułu puste).
2. Naciśnij Enter.

**Oczekiwane:** fokus przechodzi do pola tytułu i czytnik od razu odczytuje: nazwę pola, „wymagane”, „nieprawidłowe” (NVDA: *invalid entry*, VoiceOver: *invalid data*) oraz treść „Error: Enter a task title.” i podpowiedź „Between 3 and 100 characters.”.
Zadanie nie zostaje dodane.

**Błąd testu:** czytnik odczytuje tylko nazwę pola bez stanu „nieprawidłowe” lub bez treści błędu.

### M2. Za krótki tytuł, submit Enterem w polu

1. Tab do pola tytułu, wpisz `ab`.
2. Naciśnij Enter, nie opuszczając pola.

**Oczekiwane:** czytnik ogłasza stan „nieprawidłowe” i treść „Error: Task title must be at least 3 characters.”.

> Ryzyko do potwierdzenia: fokus **już jest** w polu, więc `focus()` nie wywołuje nowego zdarzenia focus,
> a czytnik nie musi ponownie odczytać pola. Jeśli w tym scenariuszu błąd nie zostaje ogłoszony,
> zgłoś to — wymaga to dodatkowego mechanizmu (np. podsumowania błędów otrzymującego fokus albo live region).

### M3. Poprawienie wartości

1. Po M1 lub M2, będąc w polu tytułu, dopisz znaki tak, aby tytuł miał co najmniej 3 znaki.
2. Odczytaj bieżące pole (NVDA: Insert+Tab, VoiceOver: VO+F3 lub Tab i Shift+Tab).

**Oczekiwane:** komunikat błędu zniknął z ekranu; czytnik nie odczytuje już „nieprawidłowe” ani treści błędu, tylko podpowiedź.

### M4. Ponowny submit poprawnej wartości

1. Po M3 naciśnij Enter.

**Oczekiwane:** czytnik ogłasza „Task "…" added.” (region `role="status"`), zadanie pojawia się na liście, formularz jest wyczyszczony.

## Fokus klawiatury (WCAG 2.4.7, 2.4.11, 1.4.11)

Uzupełnienie testów w `e2e/accessibility.spec.ts`, które sprawdzają styl i widoczność fokusu tylko heurystycznie.

- **Kontrast wskaźnika fokusu:** obrys fokusu (`#1a73e8`) ma kontrast co najmniej 3:1 względem sąsiadujących kolorów na każdym elemencie (np. sprawdź w narzędziu do kontrastu na białym tle i na niebieskim przycisku „Add task”).
- **Fokus niezasłonięty:** przy powiększeniu 200% i 400% przejdź Tab i Shift+Tab przez całą stronę; żaden element z fokusem nie jest całkowicie zasłonięty przez inną treść.

## Rejestr wyników

| Data | Tester | Czytnik + przeglądarka | Scenariusze | Wynik | Uwagi |
|---|---|---|---|---|---|
| | | | M1–M4 | | |
