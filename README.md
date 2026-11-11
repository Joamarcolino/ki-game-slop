# Ki Fist: Limitless Saga (portable)

Plain HTML + CSS + JavaScript. No build step, no dependencies, no internet needed.

## Run in VS Code
1. Open this folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension, right-click `index.html` > "Open with Live Server".
   (Or just double-click `index.html` to open it in a browser.)
3. Best on a phone-size window: press F12 in the browser and use the device toolbar.

## Files
- `index.html` - page layout and buttons
- `style.css` - DBZ-style theme
- `game.js` - all game logic (data tables at the top: `FORMS`, `ED` enemies, `STY` styles, `GENE` bloodlines, `TT` techniques)
- `INSTRUCTIONS.md` - system notes and changelog: read it before editing, update it after every change

## Notes
- Progress is saved in the browser's localStorage (clear site data to reset).
- The Config "Ask Claude" tuning works in standalone mode if you paste an Anthropic API key in Config (stored only in your browser; it is sent straight to api.anthropic.com).
- Sound uses the browser's WebAudio (no files).
