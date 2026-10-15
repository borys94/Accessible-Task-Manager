# Accessible-Task-Manager

React + TypeScript (Vite) z testami jednostkowymi w Vitest i React Testing Library oraz testami dostępności w Playwright + axe-core.

## Wymagania

- Node.js 20+

## Skrypty

```bash
npm install          # instalacja zależności
npm run dev          # serwer deweloperski (Vite)
npm run build        # typecheck + build produkcyjny
npm test             # testy jednostkowe (Vitest)
npm run test:watch   # testy w trybie watch
npm run test:coverage # raport pokrycia
npm run test:e2e     # testy Playwright
npm run test:a11y    # testy dostępności (axe-core)
```

## Struktura

```
src/
  components/<Nazwa>/   # Nazwa.tsx + Nazwa.module.scss + Nazwa.test.tsx
  data/                 # przykładowe zadania
  App.tsx               # routing (react-router): /tasks, /about
  types/                # typy (Task)
  main.tsx              # punkt wejścia
  setupTests.ts         # matchery @testing-library/jest-dom
e2e/                    # testy Playwright + axe
vite.config.ts          # konfiguracja Vite i Vitest
```
