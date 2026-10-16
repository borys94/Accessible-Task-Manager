# Accessible-Task-Manager

React + TypeScript (Vite) z testami jednostkowymi w Vitest i React Testing Library oraz testami dostępności w Playwright + axe-core.

## Wymagania

- Node.js 20+
- Yarn 1 (classic) — projekt używa wyłącznie `yarn.lock`

## Skrypty

```bash
yarn install         # instalacja zależności
yarn dev             # serwer deweloperski (Vite)
yarn build           # typecheck + build produkcyjny
yarn typecheck       # sprawdzenie typów
yarn test            # testy jednostkowe (Vitest)
yarn test:watch      # testy w trybie watch
yarn test:coverage   # raport pokrycia
yarn test:e2e        # testy Playwright
yarn test:a11y       # testy dostępności (axe-core)
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
