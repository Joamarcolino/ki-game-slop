# Ki Fist: Limitless Saga (portable)

Plain HTML + CSS + JavaScript. No build step, no dependencies, no internet needed.
The look is inspired by shadcn/ui (zinc dark theme, cards, badges, kbd keys) but written in plain CSS, so it works anywhere.

## Run
- VS Code: open the folder, install the "Live Server" extension, right-click `index.html` > Open with Live Server.
- Or just double-click `index.html`. Deploys as-is on Vercel/Netlify/GitHub Pages (static site).

## Controls
| PC (mouse + keyboard) | Phone / tablet |
|---|---|
| Click = attack, Right-click = heavy | on-screen buttons |
| Q = ki blast, 1 / 2 = your techniques | |
| E = dodge, Shift (or Space) = block (hold) | |
| C = charge ki (hold), R = transform | |

On PC the touch buttons are hidden and a key-hint bar is shown (keys light up when pressed).

## Files
- `index.html` - page structure (fight screen, key hints, touch buttons)
- `style.css` - theme; edit the tokens at the top (`:root`) to re-theme
- `game.js` - all game logic, with a "QUICK MAP" at the top and section banners
- `INSTRUCTIONS.md` - system notes + changelog (read before editing, update after)

## Where to change things
- Balance numbers: `DEF` in `game.js` (or the in-game Config menu)
- New enemy: add to `ED` (+ looks in `EA`), then update the fight counts (`BOSS`, `SEC`, "36"/"35")
- New form: `FORMS` + `FC` + `DEF.fm` (same length) + look in `LK`
- New bloodline: `GENE` + `applyGene()` + pool in `newGame()` + `GENELOOK`
- New technique type: `TT`
- Controls: bottom of `game.js` (`KEYMAP`, `HOLDKEYS`) and `index.html` (`#keys` hints)

Progress saves in your browser (localStorage). "Ask Claude" in Config needs an Anthropic API key when run standalone.