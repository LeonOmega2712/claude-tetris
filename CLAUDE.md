# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page Tetris implementation in vanilla JavaScript (ES6+), HTML5 Canvas, and CSS. No dependencies, no build step, no `package.json`. README is in Spanish.

## Running the game

There is no build/lint/test tooling. To run it, just serve the static files:

```bash
# open directly
start index.html       # Windows
open index.html        # macOS

# or serve locally (recommended, avoids file:// canvas quirks)
python3 -m http.server 8000
npx serve .
```

Then visit `http://localhost:8000`. There are no automated tests, linters, or build commands in this repo — verify changes by loading the page and playing.

## Architecture

Three files, all logic lives in `game.js` (~300 lines):

- `index.html` — DOM structure: main `<canvas id="board">` (300×600, i.e. `COLS×BLOCK` by `ROWS×BLOCK`), a `<canvas id="next-canvas">` preview, HUD spans (`#score`, `#lines`, `#level`), and a shared `#overlay` used for both Pause and Game Over states.
- `style.css` — dark/retro arcade visual theme only.
- `game.js` — all game state and logic, structured as top-level mutable globals + functions (no classes/modules).

### Core model

- Board: `ROWS × COLS` matrix (`board[y][x]`), each cell is `0` (empty) or a piece color index `1–7`.
- Pieces: `PIECES` array of square matrices; `COLORS` maps color index → hex. A piece object is `{ type, shape, x, y }`.
- Rotation: `rotateCW` transposes + reverses rows; `tryRotate` applies this then attempts wall kicks via a fixed offset list `[0, -1, 1, -2, 2]`, taking the first offset that doesn't collide.
- Collision (`collide`): checks board bounds and existing fixed blocks for a given shape/offset.

### Game loop

`init()` sets up state and starts `requestAnimationFrame(loop)`. `loop(ts)` accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the current piece drops a row (or locks if blocked). `lockPiece()` → `merge()` (bakes piece into board) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates a new `next`; if the new piece immediately collides, calls `endGame()`).

Scoring/leveling: `LINE_SCORES = [0, 100, 300, 500, 800]` × `level`; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)`. Hard drop awards 2 pts/cell dropped, soft drop 1 pt/row.

Input is a single `keydown` listener switching on `e.code` (arrows + `KeyX` for rotate, `Space` for hard drop, `KeyP` for pause), gated by `paused`/`gameOver` flags.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell px size), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).
