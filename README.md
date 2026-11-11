# Ki Fist: Limitless Saga — v7.0

A portable Dragon Ball-inspired browser fighting game built with plain HTML, CSS and JavaScript.

## Run locally
- Keep `index.html`, `style.css` and `game.js` in the same folder.
- Open `index.html` in a modern desktop or mobile browser.
- For local development, use VS Code Live Server.
- No build step or external dependency is required.

## Controls
| Desktop | Action |
|---|---|
| Left click | Punch |
| Right click | Heavy attack |
| Q | Ki blast |
| 1 / 2 | Equipped techniques |
| A / D or ← / → | Move left / right |
| E | Dodge |
| Shift / Space (hold) | Block; tap just before impact for a perfect parry |
| Esc | Return to menu / recover from a stuck fight |
| C (hold) | Charge ki |
| R | Transform / Bio-Android evolution |

Mobile browsers use the on-screen controls, including left/right movement. Physical attacks require close range; ki attacks have longer range. Watch enemy telegraphs and tap Block at the last moment to parry, stun the opponent and create a punish window. Build momentum by attacking, defending and charging; momentum boosts the next hit and fades if you disengage. Attacks have slightly higher baseline damage, and momentum can add up to 35% more. Heavy hits and energy attacks cause directional knockback, with repeated impacts damaging buildings at either edge of the arena.

## Training Sandbox
Open **Training Sandbox** from the menu to choose an enemy, race, bloodline, starting form and test stats. Sandbox fights do not award campaign progress or permanent stat growth. Exit the sandbox to restore your saved character.

## Effort-based growth
Permanent stat growth is earned from active combat: attacks, defense, counters, dodges and engaged fight time. A one-hit win gives very little growth. Replaying an already-cleared encounter awards only 12% of normal growth and does not repeat stat balancing or evolution unlocks. Zenkai is now a temporary battle surge rather than a permanent stat multiplier.

## Campaigns
The main menu has five separate progress tracks:
- DBZ
- Super
- Movies
- Daima
- GT

Progress and enemy scaling caches are stored separately per campaign. Campaign difficulty multipliers are gameplay tuning values, not official canonical power levels.

## Bio-Android
Bio-Android is a playable race with five evolutionary stages. It evolves instead of transforming. Stage unlocks require campaign wins, and evolution during a fight costs 25% ki. Multipliers are editable in Config.

## Saves
Progress is stored in browser `localStorage`. Clearing browser site data clears the save. The game does not sync saves between devices.

## Files
- `index.html` — page structure
- `style.css` — Dragon Ball-inspired theme and responsive layout
- `game.js` — game logic, data, drawing, UI and controls
- `README.md` — quick start
- `INSTRUCTIONS.md` — detailed implementation notes, formulas, continuity roster and changelog

## Testing status
The JavaScript passes Node's syntax check. Automated smoke tests cover fight initialization/restart, movement, parry timing, sandbox launch and restoration, and sandbox progression suppression. This is not a substitute for full browser playtesting. In particular, verify touch controls, campaign switching, saving/loading, every boss transition and Bio-Android evolution in a browser.
