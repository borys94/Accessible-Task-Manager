# Testy manualne dostępności

Testy automatyczne sprawdzają drzewo dostępności (role, nazwy, stany, opisy) i kolejność aktualizacji DOM względem fokusu.
Nie sprawdzają, **co faktycznie mówi czytnik ekranu** — to wymaga testu manualnego.

Konfiguracje:

| Czytnik | Przeglądarka | System |
|---|---|---|
| NVDA (aktualna wersja) | Chrome, Firefox | Windows |
| VoiceOver | Safari | macOS |

Przed testem: `yarn dev`, otwórz `http://localhost:5173/tasks`. Wszystkie kroki wykonuj **wyłącznie klawiaturą**.

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

**Oczekiwane:** czytnik od razu ogłasza „Error: Task title must be at least 3 characters.”, bez opuszczania pola.
Komunikat jest odczytany **raz** (ewentualnie razem ze zmianą stanu na „nieprawidłowe”), a nie dwa razy.

> Fokus jest już w polu, więc `focus()` nie wywołuje nowego zdarzenia focus i czytnik nie odczytuje pola ponownie.
> W tym przypadku (i tylko w nim) błąd jest ogłaszany przez ukryty region `role="alert"`. Przy submicie przyciskiem (M1)
> region pozostaje pusty, bo błąd ogłasza przeniesienie fokusu.

### M2a. Ten sam błąd ponownie

1. Po M2, nadal w polu z wartością `ab`, naciśnij Enter jeszcze raz.

**Oczekiwane:** komunikat zostaje ogłoszony ponownie, mimo że jego treść się nie zmieniła.

### M2b. Brak powielenia przy wpisywaniu

1. Po M2 dopisz jeden znak.

**Oczekiwane:** czytnik nie ogłasza nic poza echem klawiatury (zmiany błędu podczas pisania nie są ogłaszane).
W trybie przeglądania (NVDA: Insert+Spacja, potem strzałki) komunikat błędu występuje w formularzu tylko raz.

### M3. Poprawienie wartości

1. Po M1 lub M2, będąc w polu tytułu, dopisz znaki tak, aby tytuł miał co najmniej 3 znaki.
2. Odczytaj bieżące pole (NVDA: Insert+Tab, VoiceOver: VO+F3 lub Tab i Shift+Tab).

**Oczekiwane:** komunikat błędu zniknął z ekranu; czytnik nie odczytuje już „nieprawidłowe” ani treści błędu, tylko podpowiedź.

### M4. Ponowny submit poprawnej wartości

1. Po M3 naciśnij Enter.

**Oczekiwane:** czytnik ogłasza „Task "…" added.” (region `role="status"`), zadanie pojawia się na liście, formularz jest wyczyszczony.

## Lista zadań — przyciski akcji (WCAG 1.1.1, 2.4.6, 2.5.3, 4.1.2)

Cel: nazwa każdego przycisku mówi, **co** zrobi i **z którym** zadaniem — tego axe-core nie sprawdza.

### M5. Lista przycisków

1. Otwórz listę przycisków czytnika (NVDA: Insert+F7 → Przyciski, VoiceOver: VO+U → Przyciski).

**Oczekiwane:** każde zadanie ma cztery przyciski, np. „Details – Check colour contrast”, „Important – Check colour contrast”, „Mark as completed – Check colour contrast” i „Delete task: Check colour contrast”; żadna nazwa się nie powtarza, ikona kosza nie jest odczytywana jako obraz.

### M6. Zmiana stanu zadania

1. Tab do „Mark as completed – Check colour contrast”, naciśnij Spację.

**Oczekiwane:** fokus zostaje na przycisku. Sprawdź, czy czytnik sam ogłasza nową nazwę „Mark as to do – …”; jeśli nie, odczytaj bieżący element (NVDA: Insert+Tab) — nazwa musi być już nowa.

### M7. Usuwanie klawiaturą

1. Tab do „Delete task: Add a skip link”, naciśnij Enter.

**Oczekiwane:** czytnik ogłasza „Task "Add a skip link" deleted.” oraz nowy przycisk z fokusem: „Delete task: Check colour contrast”. Fokus nie przeskakuje na początek strony.
Po usunięciu ostatniego zadania fokus trafia na nagłówek „Tasks”, a pod nim jest „No tasks yet.”.

## Lista zadań — toggle i disclosure (WCAG 1.4.1, 2.1.1, 4.1.2)

Cel: zmiana stanu jest **zrozumiała** dla użytkownika czytnika i widoczna nie tylko kolorem.
axe-core sprawdza tylko poprawność atrybutów ARIA — nie to, czy wzorzec pasuje ani czy komunikat ma sens.

### M8. Przycisk „Important” (aria-pressed)

1. Tab do „Important – Add a skip link”.
2. Naciśnij Spację, potem Enter.

**Oczekiwane:** przy fokusie czytnik odczytuje nazwę, rolę przycisku przełączającego i stan (NVDA: *toggle button, not pressed*; VoiceOver: *toggle button* / *selected*).
Po każdym naciśnięciu fokus zostaje na przycisku, czytnik ogłasza nowy stan, a **nazwa się nie zmienia**.
Wizualnie: wypełniona gwiazdka i ciemne tło gdy włączony, kontur gwiazdki gdy wyłączony. W trybie wysokiego kontrastu (Windows: Contrast themes) stan nadal jest rozpoznawalny po kształcie gwiazdki.

### M9. Przycisk „Details” (aria-expanded)

1. Tab do „Details – Check colour contrast”, naciśnij Enter.
2. Przejdź strzałką w dół (tryb przeglądania).
3. Wróć do przycisku i naciśnij Spację.

**Oczekiwane:** przy fokusie czytnik odczytuje „collapsed / zwinięte”, po Enter „expanded / rozwinięte”; fokus zostaje na przycisku.
Strzałka w dół od razu odczytuje opis zadania (panel jest bezpośrednio po przycisku). Po zwinięciu opis nie jest dostępny w trybie przeglądania.
Strzałka (chevron) obraca się zgodnie ze stanem.

## Powiadomienia o operacjach na zadaniach (WCAG 1.4.1, 3.3.1, 4.1.3)

Cel: sprawdzić, że czytnik **faktycznie wypowiada** komunikat. Testy Playwright potwierdzają tylko,
że tekst trafił do regionu `role="status"` / `role="alert"`, który istniał wcześniej — nie to, że NVDA czy VoiceOver go odczytał.

### M10. Ukończenie i cofnięcie ukończenia

1. Tab do „Mark as completed – Check colour contrast”, naciśnij Enter, potem jeszcze raz Enter.

**Oczekiwane:** po pierwszym naciśnięciu czytnik odczytuje nową nazwę przycisku i (uprzejmie, po niej) „Task completed: Check colour contrast”; po drugim „Task marked as incomplete: Check colour contrast”.
Fokus zostaje na przycisku. Komunikat jest widoczny przy dolnej krawędzi okna.

### M11. Usuwanie kilku zadań z rzędu

1. Tab do „Delete task: Add a skip link”, naciśnij Enter, potem znowu Enter.

**Oczekiwane:** po każdym usunięciu czytnik ogłasza „Task deleted: …” z właściwym tytułem oraz nazwę przycisku, który dostał fokus. Sprawdź, czy jedno ogłoszenie nie ucina drugiego — zanotuj kolejność w rejestrze.

### M12. Błąd zapisu

Przygotowanie: w DevTools → Console wykonaj
`Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError') }`.

1. Tab do „Mark as completed – Check colour contrast”, naciśnij Enter.

**Oczekiwane:** czytnik **od razu** (asertywnie, przerywając) ogłasza „Error: Could not save the change. …”. Stan zadania się nie zmienia, fokus zostaje na przycisku.
Komunikat błędu różni się od sukcesu bez koloru: prefiks „Error:”, ikona trójkąta zamiast „ptaszka”, gruba belka po lewej. Sprawdź też w trybie wysokiego kontrastu (Windows: Contrast themes).

## Fokus klawiatury (WCAG 2.4.7, 2.4.11, 1.4.11)

Uzupełnienie testów w `e2e/accessibility.spec.ts`, które sprawdzają styl i widoczność fokusu tylko heurystycznie.

- **Kontrast wskaźnika fokusu:** obrys fokusu (`#1a73e8`) ma kontrast co najmniej 3:1 względem sąsiadujących kolorów na każdym elemencie (np. sprawdź w narzędziu do kontrastu na białym tle i na niebieskim przycisku „Add task”).
- **Fokus niezasłonięty:** przy powiększeniu 200% i 400% przejdź Tab i Shift+Tab przez całą stronę; żaden element z fokusem nie jest całkowicie zasłonięty przez inną treść.

## Rejestr wyników

| Data | Tester | Czytnik + przeglądarka | Scenariusze | Wynik | Uwagi |
|---|---|---|---|---|---|
| | | | M1–M7 (z M2a, M2b) | | |
