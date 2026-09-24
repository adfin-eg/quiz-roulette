```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  ─────────── T E A M   H A W K E Y E ' S ────────────  ║
║                                                        ║
║     888888       88      88   88888888     8888888888  ║
║   88      88     88      88      88                88  ║
║  88        88    88      88      88              88    ║
║  88        88    88      88      88             88     ║
║  88   88   88    88      88      88           88       ║
║  88     88 88    88      88      88          88        ║
║   88      88      88    88       88        88          ║
║     888888  88     888888     88888888     8888888888  ║
║                                                        ║
║      ____  ____  __  ____    ________________________  ║
║     / __ \/ __ \/ / / / /   / ____/_  __/_  __/ ____/  ║
║    / /_/ / / / / / / / /   / __/   / /   / / / __/     ║
║   / _, _/ /_/ / /_/ / /___/ /___  / /   / / / /___     ║
║  /_/ |_|\____/\____/_____/_____/ /_/   /_/ /_____/     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

A Jeopardy-style team quiz game built with React, Vite, and Tailwind CSS. Originally prototyped in [Figma Make](https://www.figma.com/design/Uq7I1WumrMczmUpTrlReiJ/Quiz-Roulette).

## How it works

1. **Setup** — enter player/team names and load a question set, either by uploading an Excel file (a template can be downloaded from the setup screen) or pasting in JSON.
2. **Game board** — a grid of categories and point values (200–1000). Teams take turns picking a tile; picking a tile reveals its question.
3. **Wildcard tiles** — after 5 answered questions a random unrevealed tile becomes a **Lucky Strike** (bonus), and after 10 answered questions another becomes a **Bandit** (penalty: resets the active team's score to 0 if it was positive). Both are revealed via a modal the moment their tile is picked.
4. **Winner screen** — shown automatically once every question has been answered.
5. **Christmas mode** — a toggle on the splash screen that switches to a festive theme (snow effect, seasonal colors).

Press **R** at any time to reset the game and return to the splash screen.

## Running the code

```
npm install
npm run dev
```

Build for production:

```
npm run build
```

## Tech stack

- React 18 + TypeScript
- Vite 6, Tailwind CSS 4
- `@radix-ui/react-select` / `react-switch` for form controls
- `xlsx` / `exceljs` for Excel import/export (lazy-loaded)
- `canvas-confetti`, `motion` for animations
