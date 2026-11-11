# Ki Fist: Limitless Saga — INSTRUCTIONS.md

Current implementation: **v7.0**

## Project rules
1. Read this file before changing game logic.
2. `game.js` is the single source of truth for game data and behavior. `index.html` must load `style.css` and `game.js`; do not embed a second copy of the game logic.
3. After every change, run `node --check game.js`, then play through at least one regular fight, one boss fight, one campaign switch, and one save/reload test.
4. Update the changelog in `news()` and this file whenever mechanics or data change.
5. Do not invent canonical power levels. The game uses relative gameplay balancing, not a verified official tier list.
6. Do not claim full playtesting if only static checks were performed.

## Project structure
- `index.html`: menu, HUD, canvas, keyboard hints, touch controls, overlay.
- `style.css`: Dragon Ball-inspired orange/blue/gold theme, responsive layout and UI effects.
- `game.js`: all game data, combat, progression, save/load, menus, canvas drawing, audio and controls.

## Core stats
`P.st` contains:
- `str`: physical damage.
- `spd`: perception, blitz threshold and dodge responsiveness.
- `dur`: maximum HP and resistance to stuns.
- `sta`: stamina efficiency.
- `kic`: ki damage and ki-cost efficiency.
- `ma`: dodge window and counter strength.

Battle Power is the sum of the six base stats (`bp(P.st)`). Large values use `fmt()` suffixes instead of scientific notation.

## Combat systems retained
- Punch, heavy attack, ki blast and two equipped techniques.
- Hold block, timed dodge, hold-to-charge ki.
- Stamina costs, fatigue, repeated-move fatigue penalties and exhaustion.
- Enemy telegraphs, forms, stun, injuries and status effects.
- Effort-based between-fight stat growth, action-based style/form mastery and race/genetic passives.
- Browser `localStorage` save key: `kfl1`.

## Races
Existing races remain: Saiyan, Namekian, Human, Frost Demon and Alien. Bio-Android is a new race.
- Saiyan: Zenkai and Battle Lust; race growth bonus remains.
- Namekian: regeneration and wider dodge window.
- Human: survival/counter passive and Kaioken path. Human Hulk has the Kaioken series plus Gamma Rage; no Mystic or Pseudo Ultra Instinct branch while the Hulk gene is selected.
- Frost Demon: efficient ki/form drain and form progression.
- Alien: body traits and trait evolution.
- Bio-Android: cellular evolution path; no standard transformations.

### Bio-Android evolution
Stages in `BIO_STAGES`:
1. Imperfect Cell — 0 campaign wins, ×1.0 default.
2. Semi-Perfect Cell — 3 wins, ×1.65 default.
3. Perfect Cell — 7 wins, ×3.2 default.
4. Super Perfect Cell — 12 wins, ×6.5 default.
5. Ultimate Bio-Android — 18 wins, ×12 default.

Evolution is triggered with the same in-fight action button used for transformations, but it does not use `F.form`. It requires 25% ki and permanently advances `P.bioStage`. `cfg.bio` stores editable multipliers. The stage multiplier is applied to battle stats through `pf()`. Bio-Android regenerates HP and ki after avoiding damage for two seconds and absorbs a small amount of ki on successful hits.

## Campaigns and continuity separation
`CAMPAIGNS` maps campaign-local encounter indexes to master enemy indexes in `ED`. `campaignIds` and `EN` are rebuilt by `setCampaign()`.
- DBZ: Saiyan, Namek/Frieza, Android/Cell and Buu saga opponents.
- Super: Beerus through the Tournament of Power and later manga-era opponents already in this project's roster. Zeno is retained in the source roster as a non-standard encounter entry; do not present the gameplay matchup as a canonical fight.
- Movies: movie-only villains, including Garlic Jr., Turles, Cooler, Android 13, Slug, Bojack, Broly and Janemba.
- Daima: King Gomah, the Tamagami and Majin Kuu.
- GT: General Rilldo, Baby, Super 17, Syn Shenron and Eis Shenron.

Campaign progress is stored in `P.progress[campaignName]`. Enemy baseline caches are keyed by `campaignName + ':' + localFightIndex`. `P.fights` mirrors the currently selected campaign's win count for existing unlock systems. Keep this compatibility behavior when changing campaign flow.

`startFight(localIndex)` translates the campaign-local index into the master enemy index. `F.i` remains the campaign-local index for menu progression; `F.eid` is the master enemy index. Use `F.eid` when reading `ED`, `EA` or master-index boss data. Saitama remains a secret fight at `SEC`, not part of any campaign roster.

Campaign multipliers in `startFight()`:
- DBZ ×1.0
- Movies ×1.25
- Daima ×1.6
- GT ×2.6
- Super ×4.0

These are deliberately gameplay-facing starting difficulty modifiers. They are not canonical power levels. Enemy power also depends on player BP, campaign-local progression, unlocked form strength, boss status and `cfg.enemyScale`.

## v7 combat loop and sandbox
- `F.px` and `F.ex` are horizontal fighter positions. `movePlayer(-1|1)` is bound to A/D, arrow keys and touch buttons. Physical attacks require close range; ki attacks can connect farther away.
- Enemy telegraphs create a timing window. Pressing Block during the final 0.24 seconds arms `F.perfectGuard`; a successful perfect guard negates the hit, stuns the enemy and grants a counter/punish window. Holding block early still reduces damage but is not a parry.
- `F.momentum` rises from successful attacks, parries and charging; it boosts attack damage up to 35% and decays after disengaging.
- Knockback moves the opponent across the arena. Repeated impacts at the arena edge damage the nearby building and spawn debris (`F.buildingDamage`, `F.debris`, `drawArenaDamage()`). Burn status now deals damage over time; bleeding remains a separate damage-over-time effect.
- Legendary Saiyan's Legendary Super Saiyan and Human Hulk's Gamma Rage use `F.ramp`, which increases only while that form is active and resets with the next fight. Human Hulk's standard form list is limited to Kaioken forms plus Gamma Rage.
- `sandbox()` captures a character snapshot; `launchSandbox()` applies test race/gene/stats/form and starts a no-reward fight. `exitSandbox()` restores the original snapshot. Sandbox must not award progress, evolution, unlocks or permanent stat growth.
- `recoverGame()` returns safely to the menu. Escape also exits a fight; the main menu includes a recovery control. The frame loop validates the active enemy and catches fight-state runtime errors.

## Character art and animation
`fighter()` draws procedural vector-style fighters on canvas. `EA` holds enemy-specific colors and traits; `EFL` and `LK()` add form-specific appearance cues. The current update adds extra silhouette/costume cues for selected named characters and Bio-Android stages.
- Keep drawing code procedural and lightweight.
- When adding an enemy, add a matching `EA` entry and a recognizable cue in `fighter()` where practical.
- This is not a licensed sprite atlas or frame-by-frame anime animation set. Do not describe it as official artwork or exact anime frames.

## Audio and visual effects
`SFX` uses Web Audio oscillators for local synthesized cues. `fx()` creates particles; `drawFx()` renders screen flashes and warning borders. External Myinstants audio has not been copied or embedded. If real audio files are added later, use user-provided or properly licensed assets and keep volume configurable through `cfg.vol`.

## Main extension points
- Config defaults: `DEF`; config labels: `LBL`.
- Standard race forms: `FORMS`, `FC`, `DEF.fm`.
- Bio-Android stages: `BIO_STAGES`, `DEF.bio`.
- Passives: `PAS`; race/type/genetic multipliers: `applyGene()`, combat functions.
- Enemies: `ED`, `EA`, `EFL`, `BOSS`, `SEC`, `CAMPAIGNS`.
- Styles/mastery: `STY`, `sb()`, `lv()`.
- Techniques: `TECH`, `T()`.
- Combat flow: `startFight()` → `upd()` → `atk()` / `hurt()` / `estrike()` → `end()`.
- Drawing: `bg()`, `fighter()`, `draw()`, `drawFx()`.
- Menus: `menu()`, `stats()`, `config()`, `styles()`, `techs()`, `news()`.
- Controls: `KEYMAP`, `HOLDKEYS`, `tap()`, `hold()`.

## Changelog
### v7.0
- Fixed the softlock path with fight-state validation, a recovery control and Escape-to-menu.
- Replaced per-action permanent stat multiplication with measured effort-based rewards; replayed cleared missions grant 12% growth and skip repeat balancing/evolution.
- Made Zenkai a temporary fight surge to prevent permanent replay farming.
- Added left/right movement, physical/ki range checks, momentum, timed perfect guards and punish windows.
- Increased baseline physical/ki damage slightly and strengthened heavy attacks; added directional knockback, building damage on either arena edge, debris and burn damage over time.
- Added in-fight Legendary Super Saiyan and Gamma Rage ramping; base multipliers reset each fight. Human Hulk is limited to Kaioken plus Gamma Rage.
- Added Training Sandbox with enemy, race, gene, form and stat selection; it restores the saved character and awards no progression.

### v6.0
- Split story progression into DBZ, Super, Movies, Daima and GT campaigns.
- Added Bio-Android race with five persistent evolution stages, ki absorption, regeneration and configurable multipliers.
- Added Daima and GT enemies to the roster.
- Added procedural character-specific silhouettes and costume cues.
- Improved arena backdrop, UI polish and layered synthesized audio cues.
- Removed duplicate embedded JS/CSS from `index.html`; external files are now authoritative.

### Known limitations / not yet verified
- JavaScript syntax was checked with Node. Automated fake-DOM smoke tests cover fight start/restart, movement, parry timing and sandbox restoration; a full real-browser playthrough and mobile-device test are still required.
- Procedural character art is still stylized canvas geometry, not detailed official character sprites.
- Sound is synthesized; the referenced Myinstants page was not scraped or embedded.
- Canonical numerical power levels are not supplied. Campaign factors are game balance, not lore facts.
- Claude/Anthropic live tuning requires the artifact-host integration or a separately configured API key; it is not guaranteed to work in a static local export.
