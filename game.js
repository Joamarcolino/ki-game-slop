/*
 * Ki Fist: Limitless Saga - game logic (plain JavaScript, no libraries)
 *
 * QUICK MAP - search for these names:
 *   Config numbers ........ DEF (defaults), LBL (labels in the Config menu)
 *   Forms ................. FORMS (races), GENE (bloodline forms), FC (colors), LK (how a form looks)
 *   Races / types / genes . PAS, TYPES, GENE, applyGene()
 *   Enemies ............... ED (name, color, forms), EA (appearance), EFL (form looks), BOSS, SEC
 *   Styles & mastery ...... STY, sb(), lv()
 *   Techniques ............ TT (types), T() builds the move
 *   Fight flow ............ startFight -> upd (every frame) -> atk / hurt / estrike -> end
 *   Drawing ............... fighter(), draw(), bg()
 *   Menus ................. menu(), stats(), config(), styles(), techs(), news()
 *   Controls .............. bottom of file (keyboard/mouse) + tap()/hold() (touch buttons)
 *
 * Tip: after any edit play a few fights, and update INSTRUCTIONS.md.
 */

const $ = (i) => document.getElementById(i),
  rnd = (a) => a[(Math.random() * a.length) | 0],
  L10 = Math.log10,
  clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// ============================================================
// NUMBER FORMATTING: fmt() turns 1500000 into "1.50 Mil", "Bil", "Tri", ... then aa, ab, ...
// ============================================================
const SUF = ["", "K", "Mil", "Bil", "Tri", "Quad", "Quin", "Sext", "Sept", "Oct", "Non", "Dec"];
function fmt(n) {
  if (!isFinite(n)) return "MAX";
  if (n < 1e3) return n < 10 ? n.toFixed(2) : n.toFixed(0);
  const e = Math.floor(L10(n) / 3),
    v = n / Math.pow(10, e * 3);
  if (e < SUF.length) return v.toFixed(2) + " " + SUF[e];
  const k = e - SUF.length;
  return (
    v.toFixed(2) +
    " " +
    String.fromCharCode(97 + (Math.floor(k / 26) % 26)) +
    String.fromCharCode(97 + (k % 26))
  );
}
// ============================================================
// CONFIG: default values. Players can change them in-game (Config menu); saved in localStorage
// ============================================================
const DEF = {
  growth: 5.5,
  inFight: 0.02,
  enemyScale: 1.1,
  enemyGrow: 0.012,
  dmgP: 1,
  dmgE: 1,
  fatigue: 1,
  drain: 1,
  tele: 0.8,
  zenkai: 0.08,
  vol: 0.6,
  v: 5,
  floor: 0.2,
  fm: {
    Saiyan: [10, 50, 100, 400, 800, 1500, 3000],
    Namekian: [3, 12, 120, 500],
    Human: [2, 3, 4, 10, 20, 150, 500],
    "Frost Demon": [3, 10, 50, 400, 1500],
  },
};
const LBL = {
  growth: "Post-fight growth ×",
  inFight: "In-fight growth/action",
  enemyScale: "Enemy power ×",
  enemyGrow: "Enemy growth/action",
  dmgP: "Your damage ×",
  dmgE: "Enemy damage ×",
  fatigue: "Fatigue strength ×",
  drain: "Form drain ×",
  tele: "Enemy telegraph (s)",
  zenkai: "Zenkai boost",
  vol: "Sound volume (0-1)",
  floor: "Weak-stat catch-up (fraction of top stat)",
};
// [name, unlock after N fights won, optional speed mult]
// ============================================================
// FORMS per race: [name, fights won to unlock, optional speed multiplier]. Multipliers live in DEF.fm
// ============================================================
const FORMS = {
  Saiyan: [
    ["Great Ape", 1, 0.6],
    ["Super Saiyan", 3],
    ["Super Saiyan 2", 5],
    ["Super Saiyan 3", 7],
    ["Super Saiyan God", 13],
    ["Super Saiyan Blue", 18],
    ["Ultra Instinct Sign", 26],
  ],
  Namekian: [
    ["Giant Form", 1, 0.6],
    ["Super Namekian", 4],
    ["Potential Unleashed", 10],
    ["Orange Piccolo", 18],
  ],
  Human: [
    ["Kaioken x2", 0],
    ["Kaioken x3", 2],
    ["Kaioken x4", 4],
    ["Kaioken x10", 6],
    ["Kaioken x20", 8],
    ["Mystic", 12],
    ["Pseudo Ultra Instinct", 22],
  ],
  "Frost Demon": [
    ["2nd Form", 1],
    ["3rd Form", 3],
    ["Final Form", 6],
    ["Golden Form", 14],
    ["Black Form", 24],
  ],
};
const FC = {
  Saiyan: ["#8a5a2b", "#ffd84a", "#ffe680", "#ffc400", "#ff4040", "#3ab5ff", "#e8f0ff"],
  Namekian: ["#35b04f", "#9be89b", "#ffe34a", "#ff9a3c"],
  Human: ["#ff2d2d", "#ff2d2d", "#ff2d2d", "#ff2d2d", "#ff2d2d", "#9fd8ff", "#d8d8ff"],
  "Frost Demon": ["#c9a0ff", "#b080e0", "#e8e0ff", "#ffd84a", "#ff2d2d"],
};
// ============================================================
// TEXT: race passives (the real effects are coded in atk / hurt / upd)
// ============================================================
const PAS = {
  "Frost Demon":
    "Cold Royalty: ki costs -15%, forms drain 30% less (you hold power back), +25% damage to bleeding/burning/injured foes. Forms: 2nd, 3rd, Final, Golden, Black (last two have custom colors in Config).",
  Alien:
    "Genetic Wildcard: 2 random body traits (arms, claws, wings...) and ONE customizable form (name and colors in Config). Every 3 wins your build (your highest stat) evolves a new trait. Alien bloodlines: the Ginyu Force members (Captain Ginyu, Guldo, Recoome, Burter, Jeice), Hit, Zarbon, Dodoria.",
  Saiyan:
    "Zenkai: first time under 25% HP each fight you heal 20% and gain a small permanent stat boost (+8%). Battle Lust: damage rises up to +50% as HP falls. Grows 20% faster after fights.",
  Namekian:
    "Regeneration: heal 1.5% HP/s after 3s unhit. Keen Sense: +25% dodge window. Ki techs cost 15% less. Giant Form unlocks early.",
  Human:
    "Never Give Up: once per fight survive a lethal blow at 1 HP, refill ki and deal x2 damage 10s. Z-Wits: martial arts grow 25% faster, counters hit x2.5. Kaioken Mastery: less HP drain.",
};
const TECH = {
  Kamehameha: { ki: 22, m: 4.5, fat: 14, lock: 1 },
  "Galick Gun": { ki: 24, m: 5, fat: 14, lock: 1 },
  Masenko: { ki: 18, m: 3.6, fat: 11, lock: 0.8 },
  "Destructo Disc": { ki: 26, m: 6, fat: 15, lock: 1.1, p: 1 },
  "Special Beam Cannon": { ki: 30, m: 8.5, fat: 18, lock: 1.5, p: 1 },
  "Solar Flare": { ki: 14, m: 0.3, fat: 10, lock: 0.7, s: 3, p: 1 },
  "Final Flash": { ki: 45, m: 14, fat: 24, lock: 1.8 },
  "Tri-Beam": { ki: 30, m: 9, fat: 20, lock: 1.3, hp: 0.12 },
};
// ============================================================
// BASIC MOVES: punch, heavy, ki blast
// ============================================================
const MV = {
  punch: { id: "punch", sta: 6, fat: 4, m: 1, k: "phys", lock: 0.35 },
  heavy: { id: "heavy", sta: 16, fat: 10, m: 3.2, k: "phys", lock: 0.8 },
  blast: { id: "blast", ki: 7, fat: 5, m: 1.8, k: "ki", lock: 0.45 },
};
// ============================================================
// ENEMIES: [name, color, forms]. Forms trigger as their HP drops: [hp fraction, power multiplier, name]
// ============================================================
const ED = [
  ["Raditz", "#e8b98a", [[0.5, 2.5, "Full Power"]]],
  ["Nappa", "#e8b98a", [[0.5, 2.5, "Full Power"]]],
  [
    "Vegeta",
    "#e8b98a",
    [
      [0.7, 2, "Full Power"],
      [0.35, 5, "Great Ape"],
    ],
  ],
  ["Dodoria", "#ff9ac1", [[0.5, 2.5, "Full Power"]]],
  ["Zarbon", "#5fd1c0", [[0.5, 3, "Monstrous Zarbon"]]],
  ["Recoome", "#f0883a", [[0.5, 2.5, "Full Power"]]],
  ["Captain Ginyu", "#8e5bd0", [[0.5, 2.5, "Full Power"]]],
  [
    "Frieza",
    "#f0e8ff",
    [
      [0.8, 2, "2nd Form"],
      [0.6, 3.5, "3rd Form"],
      [0.4, 6, "Final Form"],
      [0.2, 12, "100% Full Power"],
    ],
  ],
  ["King Cold", "#e8e0f2", [[0.5, 2.5, "Full Power"]]],
  ["Garlic Jr.", "#d8c8a0", [[0.5, 5, "Majin Garlic Jr."]]],
  ["Turles", "#d9a060", [[0.5, 2.5, "Full Power"]]],
  [
    "Cooler",
    "#e0e0f0",
    [
      [0.6, 2.5, "Full Power"],
      [0.35, 5, "Final Form Cooler"],
    ],
  ],
  ["Android 19", "#f2e6dc", [[0.5, 2, "Max Output"]]],
  ["Dr. Gero", "#d9c8b0", [[0.5, 2, "Max Output"]]],
  ["Android 17", "#f1c27d", [[0.5, 2.5, "Max Output"]]],
  ["Android 18", "#f5d0a9", [[0.5, 2.5, "Max Output"]]],
  ["Android 13", "#6aa0d9", [[0.6, 4, "Super Android 13"]]],
  [
    "Cell",
    "#6ab04c",
    [
      [0.7, 2.5, "Semi-Perfect"],
      [0.45, 5, "Perfect"],
      [0.2, 14, "Super Perfect"],
    ],
  ],
  ["Dabura", "#c0392b", [[0.5, 2.5, "Full Power"]]],
  ["Majin Buu", "#ff9ff3", [[0.5, 2.5, "Angry Buu"]]],
  [
    "Super Buu",
    "#ff9ff3",
    [
      [0.6, 3, "Absorbed Gotenks"],
      [0.3, 7, "Absorbed Gohan"],
    ],
  ],
  ["Kid Buu", "#ff9a9a", [[0.5, 4, "Enraged Buu"]]],
  ["Slug", "#6fa04f", [[0.5, 4, "Giant Slug"]]],
  ["Bojack", "#4aa050", [[0.5, 4, "Full Power Bojack"]]],
  [
    "Broly",
    "#e8b98a",
    [
      [0.7, 3, "Full Power"],
      [0.35, 10, "Legendary Super Saiyan"],
    ],
  ],
  ["Janemba", "#d63a3a", [[0.6, 5, "Super Janemba"]]],
  ["Beerus", "#b79ad8", [[0.6, 5, "Destruction Aura"]]],
  ["Hit", "#9fa8c0", [[0.5, 6, "Full Power"]]],
  ["Goku Black", "#c68642", [[0.6, 4, "Super Saiyan Rosé"]]],
  [
    "Fused Zamasu",
    "#c68642",
    [
      [0.6, 5, "Merged Zamasu"],
      [0.3, 12, "Immortal Half-Corrupted"],
    ],
  ],
  ["Jiren", "#9a9aa5", [[0.5, 8, "Full Power"]]],
  ["Moro", "#b0a090", [[0.5, 5, "Power Absorbed"]]],
  ["Granolah", "#1abc9c", [[0.5, 6, "Wish-Empowered"]]],
  ["Gas", "#a8b0a0", [[0.5, 8, "Powered-up Gas"]]],
  ["Cell Max", "#7dcea0", [[0.5, 3, "Full Power"]]],
  [
    "Omni-King Zeno",
    "#e8c0e8",
    [
      [0.8, 3, "Playful"],
      [0.5, 10, "Annoyed"],
      [0.2, 40, "Erase"],
    ],
  ],
  ["Saitama (SECRET)", "#f5d0a9"],
];
const EA = {
  Raditz: { sk: "#e8b98a", out: "#3a3a4a", h: "#111", sp: 1, lg: 1 },
  Nappa: { sk: "#e8b98a", out: "#5a4a3a", s: 1.35, bald: 1 },
  Vegeta: { sk: "#e8b98a", out: "#2c3e90", h: "#111", sp: 1 },
  Dodoria: { sk: "#ff9ac1", out: "#6a1b9a", s: 1.3, spk: 1, fat: 1.2, bald: 1 },
  Zarbon: { sk: "#5fd1c0", out: "#e8e8e8", h: "#2ecc71", lg: 1 },
  Recoome: { sk: "#f0883a", out: "#2b6cb0", s: 1.4, h: "#ff8c00", spk: 1, bald: 1 },
  "Captain Ginyu": { sk: "#8e5bd0", out: "#c0392b", hor: 1, bald: 1 },
  Frieza: { frost: 1, sk: "#f0e8ff" },
  "King Cold": { frost: 1, s: 1.2, sk: "#e8e0f2" },
  "Garlic Jr.": { sk: "#d8c8a0", out: "#2c6a8a", h: "#fff", s: 0.9 },
  Turles: { sk: "#d9a060", out: "#7a1a1a", h: "#111", sp: 1 },
  Cooler: { frost: 1, sk: "#e0e0f0" },
  "Android 19": { sk: "#f2e6dc", out: "#3a4a8a", s: 0.9, fat: 1.2, bald: 1 },
  "Dr. Gero": { sk: "#d9c8b0", out: "#6a5acd", s: 0.85, bald: 1 },
  "Android 17": { sk: "#f1c27d", out: "#d9822b", h: "#111", lg: 1 },
  "Android 18": { sk: "#f5d0a9", out: "#2c3e90", h: "#f7e36a" },
  "Android 13": { sk: "#6aa0d9", out: "#2a4d8f", h: "#ddd", s: 1.15 },
  Cell: { sk: "#6ab04c", out: "#6ab04c", cell: 1, s: 1.15, bald: 1 },
  Dabura: { sk: "#c0392b", out: "#3a1a5a", hor: 1, s: 1.2, bald: 1 },
  "Majin Buu": { sk: "#ff9ff3", out: "#fff", bald: 1, ant: 1, fat: 1.35, s: 1.1 },
  "Super Buu": { sk: "#ff9ff3", out: "#c0392b", bald: 1, ant: 1 },
  "Kid Buu": { sk: "#ff9a9a", out: "#222", bald: 1, ant: 1, s: 0.8 },
  Slug: { sk: "#6fa04f", out: "#6a1b9a", ant: 1, bald: 1, s: 1.2 },
  Bojack: { sk: "#4aa050", out: "#c0392b", h: "#fff", lg: 1, s: 1.2 },
  Broly: { sk: "#e8b98a", out: "#3a3a2a", h: "#111", sp: 1, s: 1.4 },
  Janemba: { sk: "#d63a3a", out: "#d63a3a", hor: 1, s: 1.3, bald: 1 },
  Beerus: { sk: "#b79ad8", out: "#d9a520", bald: 1 },
  Hit: { sk: "#9fa8c0", out: "#3b2f5c", h: "#1a1a2e", lg: 1 },
  "Goku Black": { sk: "#c68642", out: "#222", h: "#111", sp: 1 },
  "Fused Zamasu": { sk: "#c68642", out: "#6a1b9a", h: "#fff", sp: 1 },
  Jiren: { sk: "#9a9aa5", out: "#c0392b", bald: 1, s: 1.2 },
  Moro: { sk: "#b0a090", out: "#6e2c00", h: "#ddd", lg: 1 },
  Granolah: { sk: "#1abc9c", out: "#2a3a2a", h: "#c0a060" },
  Gas: { sk: "#a8b0a0", out: "#444", h: "#fff", sp: 1, s: 1.3 },
  "Cell Max": { sk: "#7dcea0", out: "#7dcea0", cell: 1, s: 2.2, bald: 1 },
  "Omni-King Zeno": { sk: "#e8c0e8", out: "#e8d070", h: "#fff", s: 0.7, bald: 1 },
  "Saitama (SECRET)": { sk: "#f5d0a9", out: "#f1c40f", bald: 1 },
};
const EFL = {
    "Great Ape": { ape: 1, s: 2.3, sk: "#7a4a22" },
    "Legendary Super Saiyan": { h: "#9dff6a", s: 1.7, bolt: 1, a: "#7dff4a", sp: 1 },
    "Super Saiyan Rosé": { h: "#ff9ac1", a: "#ff9ac1" },
    "Monstrous Zarbon": { sk: "#3a8a4a", s: 1.5, a: "#3ecf8e" },
    "Giant Slug": { s: 2.2 },
    "Majin Garlic Jr.": { sk: "#7a4a9a", s: 1.6 },
    "Super Android 13": { sk: "#4a6fb0", s: 1.4, hor: 1 },
    "Final Form Cooler": { s: 1.15, a: "#c8a0ff" },
    "100% Full Power": { s: 1.2, a: "#c8a0ff" },
    "Absorbed Gotenks": { h: "#ffd84a", sp: 1, a: "#ffd84a" },
    "Absorbed Gohan": { a: "#9fd8ff" },
    "Super Janemba": { s: 1.4, a: "#ff3030" },
    "Full Power": { a: "#fff3b0" },
    "Max Output": { a: "#bfe3ff" },
  },
  FK = { "2nd Form": 0, "3rd Form": 1, "Final Form": 2, "100% Full Power": 5, "Final Form Cooler": 2 };
const EN = ED.map((e) => e[0]),
  BOSS = [2, 7, 17, 21, 26, 30, 35],
  SEC = 36;
const NM = {
  str: "Strength",
  spd: "Speed",
  dur: "Durability",
  sta: "Stamina",
  kic: "Ki Control",
  ma: "Martial Arts",
};
const DS = {
  str: "Physical damage = Str x 0.5 x move power. Your Str vs their Durability sets how often your hits STUN them.",
  spd: "Perception: 2x the enemy's Speed = Blitz (x1.5 damage, unblockable). Much slower = smaller dodge window, faster enemy strikes.",
  dur: "Max HP = Durability x 10. Also resists enemy stuns (their Str vs your Dur).",
  sta: "Cuts stamina and fatigue costs of attacks and blocks.",
  kic: "Ki damage = Ki Control x 0.6 x technique power; also lowers ki costs.",
  ma: "Widens your dodge window (log scale) and sharpens counters.",
};
const MASH =
  "<b>Mastery</b>: each hit, block or dodge gives your equipped style XP. Every level (0-10) adds 15% of the style bonus (up to 2.5x). Forms gain XP while active; each level cuts that form's ki drain 5% (max -50%).<br><b>Stun</b>: a hit may stun based on attacker Str vs defender Dur (short immunity after a stun).<br><b>Injuries/status</b>: big hits can sever an arm (half attack speed), sever a leg (slower, smaller dodge) or crack ribs (less stamina); you will see the wounds and the severed limbs. Bleed, burn, weaken and dizzy last a few seconds. Namekians regrow limbs.<br><b>Balance</b>: after each fight, stats below a fraction of your top stat catch up (set in Config).<br><b>Dodge</b> costs almost nothing and adds no fatigue.";
const COL = ["#3aa0ff", "#ff4fa3", "#9b59ff", "#2ee6a6", "#ff8c1a", "#ffffff", "#ff3b3b"];
let P, cfg, F;
// ============================================================
// TYPES (Warrior...) and BLOODLINES (GENE). Add new ones here + applyGene() + the pool in newGame()
// ============================================================
const TYPES = {
  Warrior: {
    b: { str: 1.35, dur: 1.35 },
    d: "Type Warrior (melee+durability): phys dmg +15%, +35% start Str/Dur.",
  },
  Spiritual: {
    b: { kic: 1.35, ma: 1.35 },
    d: "Type Spiritual (Ki Control+Martial Arts): ki costs -15%, dodge window +15%.",
  },
  Speedster: {
    b: { spd: 1.35, sta: 1.35 },
    d: "Type Speedster (Speed+Stamina): blitz at 1.6x speed instead of 2x.",
  },
};
const GENE = {
  None: { d: "No special bloodline." },
  "Evil Saiyan": {
    d: "Gene Evil Saiyan (Cumber): +30% Str, +25% dmg in forms, dodge -15%, Berserk form x150 after 4 wins.",
    f: ["Berserk", 4, 0.8, 150, "#b04bff"],
  },
  Mutant: {
    d: "Gene Mutant (Tien): Third Eye +20% dodge window, Tri-Beam technique (x9 ki, costs 12% HP).",
    f: 0,
  },
  Hulk: {
    d: "Gene Human Hulk: x1.5 Str/Dur, damage rises as HP falls, Gamma Rage form x30 after 4 wins. Beat the boss for a secret challenger...",
    f: ["Gamma Rage", 4, 0.8, 30, "#6bff3a"],
  },
  Hanma: {
    d: "Gene Hanma bloodline: +40% Str, +20% Dur, pain tolerance (half the chance of injuries and bleeding), Ogre Back form x120 after 5 wins.",
    f: ["Ogre Back", 5, 0.9, 120, "#ffb347"],
  },
  "Captain Ginyu": {
    d: "Gene Captain Ginyu: Body Change once per fight under 25% HP (heal 35%, refill ki, close wounds); striking Ginyu Poses while charging ki clears fatigue twice as fast. +10% Stamina/Martial Arts.",
  },
  Guldo: {
    d: "Gene Guldo: Time Freeze every 15s (costs 10% ki) stuns the enemy as it strikes. Frail body (-25% Str/Dur) but +30% Ki Control.",
  },
  Recoome: {
    d: "Gene Recoome: +40% Str, +30% Dur, -10% Speed. Eraser Gun every 12s: your next ki blast hits 3x harder and pierces block. Heavy hits stun more often.",
  },
  Burter: {
    d: "Gene Burter: +40% Speed, +20% dodge window. Blue Hurricane: after a successful dodge you move at double speed for 4s (+60% damage).",
  },
  Jeice: {
    d: "Gene Jeice: +20% Ki Control, +15% Str. Crusher Ball every 10s: your next ki attack does double damage and weakens the enemy.",
  },
  "Hit Clan": {
    d: "Gene Hit bloodline: Hit's look, +30% Speed, +25% Martial Arts, a free Time-Skip dodge every 6s, hits may daze the enemy.",
  },
  "Zarbon Line": {
    d: "Gene Zarbon: elegant fighter, +20% Speed, +15% dodge window, Monstrous Zarbon form x60 after 3 wins (slow).",
    f: ["Monstrous Zarbon", 3, 0.8, 60, "#3ecf8e"],
  },
  "Dodoria Line": {
    d: "Gene Dodoria: +35% Str/Dur, -15% Speed, ki blasts +30%, Rampage form x25 after 2 wins.",
    f: ["Rampage", 2, 0.7, 25, "#ff6bd6"],
  },
  "Dragon Clan": { d: "Gene Dragon Clan: regeneration doubled." },
  "Legendary Saiyan": {
    d: "Gene Legendary Saiyan (Broly): +15% all stats, +15% growth after fights, fatigue +25%, Legendary Super Saiyan x600 after 6 wins.",
    f: ["Legendary Super Saiyan", 6, 0.8, 600, "#7dff4a"],
  },
};
const FL = () =>
    (P.race === "Alien" ? P.alien.f : FORMS[P.race]).concat(
      GENE[P.gene] && GENE[P.gene].f ? [GENE[P.gene].f] : [],
    ),
  fmOf = (i) => {
    const f = FL()[i];
    return f[3] || cfg.fm[P.race][i];
  },
  FCc = (i) =>
    FL()[i][4] ||
    (P.race === "Frost Demon" && i >= 3 ? P.fc[i === 3 ? "g" : "b"][i === 3 ? 0 : 1] : FC[P.race][i]);
function applyGene() {
  const s = P.st,
    b = TYPES[P.type].b;
  for (const k in b) s[k] *= b[k];
  if (P.gene === "Evil Saiyan") s.str *= 1.3;
  if (P.gene === "Hanma") {
    s.str *= 1.4;
    s.dur *= 1.2;
  }
  if (P.gene === "Captain Ginyu") {
    s.sta *= 1.1;
    s.ma *= 1.1;
  }
  if (P.gene === "Guldo") {
    s.str *= 0.75;
    s.dur *= 0.75;
    s.kic *= 1.3;
  }
  if (P.gene === "Recoome") {
    s.str *= 1.4;
    s.dur *= 1.3;
    s.spd *= 0.9;
  }
  if (P.gene === "Burter") {
    s.spd *= 1.4;
  }
  if (P.gene === "Jeice") {
    s.kic *= 1.2;
    s.str *= 1.15;
  }
  if (P.gene === "Hit Clan") {
    s.spd *= 1.3;
    s.ma *= 1.25;
  }
  if (P.gene === "Zarbon Line") s.spd *= 1.2;
  if (P.gene === "Dodoria Line") {
    s.str *= 1.35;
    s.dur *= 1.35;
    s.spd *= 0.85;
  }
  if (P.race === "Alien") {
    const t = P.alien.tr;
    if (t.includes("Carapace")) {
      s.dur *= 1.25;
      s.spd *= 0.9;
    }
    if (t.includes("Wings")) s.spd *= 1.2;
  }
  if (P.gene === "Legendary Saiyan") for (const k in s) s[k] *= 1.15;
  if (P.gene === "Hulk") {
    s.str *= 1.5;
    s.dur *= 1.5;
  }
  if (P.gene === "Mutant") {
    s.ma *= 1.2;
    P.techs[1] = "Tri-Beam";
  }
}
function setGene(g) {
  P.gene = g;
  if (g === "Mutant") P.techs[1] = "Tri-Beam";
  save();
}
let AC;
const snd = (f, d, ty, sl, v) => {
  if (!cfg.vol) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    AC.state === "suspended" && AC.resume();
    const t = AC.currentTime,
      o = AC.createOscillator(),
      g = AC.createGain();
    o.type = ty;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(sl, t + d);
    g.gain.setValueAtTime((v || 0.2) * cfg.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(AC.destination);
    o.start();
    o.stop(t + d);
  } catch (e) {}
};
const SFX = {
  hit: () => snd(180, 0.12, "square", 40),
  blk: () => snd(350, 0.08, "triangle", 180),
  dodge: () => snd(500, 0.18, "sine", 1800),
  ki: () => snd(900, 0.3, "sawtooth", 150),
  warn: () => snd(260, 0.1, "square", 200, 0.12),
  form: () => {
    snd(80, 1, "sawtooth", 1000, 0.25);
    setTimeout(() => snd(200, 0.5, "square", 60, 0.2), 500);
  },
  win: () =>
    [0, 1, 2].forEach((i) => setTimeout(() => snd(400 + i * 150, 0.2, "square", 420 + i * 150), i * 150)),
  lose: () => snd(300, 0.8, "sawtooth", 40),
};
function fx(x, y, col, n, up) {
  for (let i = 0; i < n; i++)
    F.pt.push({
      x,
      y,
      vx: rand(-120, 120),
      vy: up ? rand(-90, -30) : rand(-120, 120),
      l: rand(0.3, 0.7),
      c: col,
    });
}
function bg() {
  const g = c.createLinearGradient(0, 0, 0, 185),
    s = F.i >= 26 ? ["#2a0a4a", "#c04a8a"] : F.i >= 12 ? ["#6a1b1b", "#ff9a3c"] : ["#1e5fd0", "#ffc070"];
  g.addColorStop(0, s[0]);
  g.addColorStop(1, s[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, 360, 200);
  c.fillStyle = "#0004";
  [
    [0, 50, 120, 95],
    [80, 160, 250, 75],
    [200, 280, 360, 90],
  ].forEach((m) => {
    c.beginPath();
    c.moveTo(m[0], 185);
    c.lineTo(m[1], m[3]);
    c.lineTo(m[2], 185);
    c.fill();
  });
  c.fillStyle = "#6b4120";
  c.fillRect(0, 185, 360, 15);
  c.fillStyle = "#4a2c14";
  c.fillRect(0, 185, 360, 3);
}
function drawFx() {
  F.pt.forEach((p) => {
    c.globalAlpha = clamp(p.l * 2, 0, 1);
    c.fillStyle = p.c;
    c.fillRect(p.x, p.y, 4, 4);
  });
  c.globalAlpha = 1;
  if (F.hp < 0.25) {
    c.strokeStyle = `rgba(255,0,0,${0.3 + 0.2 * Math.sin(F.t * 8)})`;
    c.lineWidth = 8;
    c.strokeRect(0, 0, 360, 200);
  }
  if (F.e.state === "tele" && F.e.stun <= 0 && F.e.t < 0.3) {
    c.strokeStyle = "#ffe34d";
    c.lineWidth = 5;
    c.strokeRect(0, 0, 360, 200);
  }
  if (F.fl > 0) {
    c.globalAlpha = F.fl * 0.8;
    c.fillStyle = "#fff";
    c.fillRect(0, 0, 360, 200);
    c.globalAlpha = 1;
  }
  c.restore();
}
// ============================================================
// FIGHTING STYLES and MASTERY
// ============================================================
const STY = {
  "Turtle School": {
    u: 0,
    b: { kc: 0.85, ki: 1.1 },
    d: "Ki efficiency and ki damage (Kamehameha tradition).",
  },
  "Crane School": { u: 3, b: { dw: 1.2, sta: 0.9 }, d: "Wider dodge window, cheaper stamina." },
  "Saiyan Pride": { u: 6, b: { ph: 1.2, fat: 0.9 }, d: "Brawler: more physical damage, less fatigue." },
  "King Kai Training": { u: 10, b: { dr: 0.8, ph: 1.05, ki: 1.05 }, d: "Form drain -20%, balanced damage." },
  "Time-Skip Assassin": { u: 16, b: { cnt: 1.5, ph: 1.1 }, d: "Counters hit 50% harder (Hit's style)." },
  "Angel Training": {
    u: 24,
    b: { dw: 1.15, fat: 0.8, ki: 1.1 },
    d: "Ultra Instinct path: dodge, low fatigue, ki.",
  },
};
const lv = (x, d) => Math.min(10, Math.floor(Math.sqrt((x || 0) / d))),
  sb = (k) => {
    const S = STY[P.style];
    return S && S.b[k] ? 1 + (S.b[k] - 1) * (1 + 0.15 * lv(P.mas[P.style], 10)) : 1;
  };
function styles() {
  ov(
    `<h2>Fighting Styles</h2><div class="mu">Equip one. Fighting with it raises its Mastery (Lv 0-10), strengthening its bonuses up to 2.5x. New styles are learned by winning fights.</div>` +
      Object.keys(STY)
        .map((k) => {
          const S = STY[k],
            h = P.styles.includes(k);
          return `<div class="${h ? "" : "lock"}" style="margin:9px 0"><b>${k}</b> ${P.style === k ? "(equipped)" : ""} · Mastery Lv ${lv(P.mas[k], 10)}<br><span class="mu">${S.d} ${h ? "" : "Learn: win " + S.u + " fights."}</span>${h && P.style !== k ? `<button onclick="setStyle('${k}')" style="margin-left:6px;padding:4px 10px">Equip</button>` : ""}</div>`;
        })
        .join(""),
  );
}
function setStyle(k) {
  P.style = k;
  save();
  styles();
}
function ngc(b) {
  if (b.dataset.s) {
    newGame();
    menu();
  } else {
    b.dataset.s = 1;
    b.textContent = "Tap again to confirm";
    setTimeout(() => {
      b.dataset.s = "";
      b.textContent = "New Random Fighter";
    }, 3000);
  }
}
function news() {
  ov(
    `<h2>Changelog</h2><div class="mu"><b>v5.2</b>: FIXED the freeze after beating Vegeta (and every 3rd fight): the Alien build-evolution code ran for every race and crashed before saving. Story characters now look like themselves (Raditz long spiky hair, Nappa bald brute, Vegeta flame hair, Dodoria pink spikes, Zarbon green hair, Frieza/Cooler/King Cold horned frost bodies with real forms, Cell with spots, crest and wings, Buu with antenna, Hit, Jiren, Zeno, etc.). Enemy forms now make sense: characters who do not transform just release "Full Power" (white aura, no hair change); Vegeta becomes a Great Ape, Frieza goes 2nd/3rd/Final/100%, Cell Semi-Perfect/Perfect/Super Perfect, Super Buu absorbs Gotenks then Gohan, Broly goes Legendary Super Saiyan.<br><b>v5</b>: Injuries are now visible: severed arms and legs fly off and stay on the ground in a pool of blood, stumps and cracked ribs show on the body, bleeding drips blood (works for you and enemies; Namekians regrow limbs). Aliens now have ONE customizable form (name, body and form colors in Config) whose power grows with your wins, and every 3 wins your build (highest stat) evolves a new trait (Strength: claws/arms, Speed: wings/tail, Durability: carapace/regen, Ki: third eye/stinger...). New alien bloodlines: one per Ginyu Force member: Captain Ginyu (Body Change, fast pose recovery), Guldo (Time Freeze), Recoome (Eraser Gun), Burter (Blue Hurricane speed burst), Jeice (Crusher Ball); plus Hit (look, free time-skip dodges, dazing hits), Zarbon (speed, Monstrous Zarbon form) and Dodoria (brute, strong ki blasts, Rampage form). Namekian forms are now Giant, Super Namekian, Potential Unleashed (yellow) and Orange.<br><b>v4</b>: show-accurate forms, Frost Demon and Alien races, Hanma bloodline, Pseudo Ultra Instinct, statuses, stun, Technique Creator, stat balancing, style mechanics, animated hands, Saitama phases.<br><b>v3</b>: 36 foes + Saitama, styles and mastery. <b>v2</b>: DBZ look, sound, genetics. <b>v1</b>: first build.</div><h2>Dragon Ball news (Jan 2026)</h2><div class="mu">• At the 40th-anniversary Genkidamatsuri event (Jan 25, 2026), Toei announced Dragon Ball Super: The Galactic Patrol, adapting the Galactic Patrol Prisoner arc.<br>• Dragon Ball Super: Beerus, an enhanced redo of the Super anime, is set for Japanese TV in fall 2026.<br>• A new game, AGE1000, and more Sparking! ZERO DLC were announced.<br>• Dragon Ball Daima finished in 2025; the latest film is Super Hero (2022).<br>• Multipliers are approximate; edit them in Config.</div>`,
  );
}
const bp = (s) => Object.values(s).reduce((a, b) => a + b, 0);
// ============================================================
// SAVE / LOAD / NEW CHARACTER (localStorage)
// ============================================================
function save() {
  try {
    localStorage.setItem("kfl1", JSON.stringify({ P, cfg }));
  } catch (e) {}
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem("kfl1"));
    if (s && s.P && s.P.type) {
      P = s.P;
      cfg = Object.assign(structuredClone(DEF), s.cfg);
      if (cfg.v !== 5) {
        cfg.v = 5;
        cfg.fm = structuredClone(DEF.fm);
        cfg.floor = DEF.floor;
        cfg.inFight = DEF.inFight;
        cfg.zenkai = DEF.zenkai;
        cfg.enemyGrow = DEF.enemyGrow;
      }
      for (const r in DEF.fm) cfg.fm[r] = DEF.fm[r].map((v, i) => (cfg.fm[r] || [])[i] || v);
      if (P.v !== 4) {
        P.v = 4;
        P.eb = [];
        P.mas = P.mas || {};
        P.fmas = P.fmas || {};
        P.style = P.style || "Turtle School";
        P.styles = P.styles || [P.style];
        P.fights = Math.min(P.fights, 36);
        P.techs = (P.techs || []).map((t) => (t === "Tri-Beam" ? t : null));
        while (P.techs.length < 2) P.techs.push(null);
        P.fc = { g: ["#ffd84a", "#ff8a00"], b: ["#15151c", "#ff2d2d"] };
      }
      if (P.gene === "Ginyu Force") P.gene = "Captain Ginyu";
      if (P.v === 4) {
        P.v = 5;
        if (P.race === "Alien") {
          const a = P.alien,
            pal = ["#ff4fa3", "#2ee6a6", "#9b59ff", "#ffb020", "#ff3b3b", "#3aa0ff"];
          a.skin = pal[0 | (Math.random() * 6)];
          a.fc = pal[0 | (Math.random() * 6)];
          a.f = [["Ascended Form", 1, 0.9, 8, a.fc]];
        }
      }
      return;
    }
  } catch (e) {}
  cfg = structuredClone(DEF);
  newGame();
}
function newGame() {
  const r = rnd(["Saiyan", "Namekian", "Human", "Frost Demon", "Alien"]),
    B =
      {
        Saiyan: [32, 25, 22, 24, 22, 20],
        Namekian: [24, 22, 30, 26, 28, 22],
        Human: [22, 26, 20, 24, 24, 34],
        "Frost Demon": [26, 28, 20, 24, 34, 22],
      }[r] || Array.from({ length: 6 }, () => 20 + Math.random() * 14),
    k = Object.keys(NM);
  const st = {};
  k.forEach((x, i) => (st[x] = B[i] * (0.9 + Math.random() * 0.2)));
  P = {
    race: r,
    st,
    color: rnd(COL),
    hair: rnd(["#111", "#5a3a1a", "#c0392b", "#e8e8e8", "#2c3e90"]),
    outfit: rnd(["#e67e22", "#2c6fe0", "#8e44ad", "#27ae60", "#c0392b"]),
    skin: rnd(["#f1c27d", "#c68642", "#ffdbac"]),
    techs: [null, null],
    fights: 0,
    eb: [],
    v: 5,
    mas: {},
    fmas: {},
    fc: { g: ["#ffd84a", "#ff8a00"], b: ["#15151c", "#ff2d2d"] },
    type: rnd(Object.keys(TYPES)),
    gene:
      Math.random() < 0.5
        ? "None"
        : rnd(
            {
              Saiyan: ["Evil Saiyan", "Legendary Saiyan"],
              Human: ["Mutant", "Hulk", "Hanma"],
              Namekian: ["Dragon Clan"],
              Alien: [
                "Captain Ginyu",
                "Guldo",
                "Recoome",
                "Burter",
                "Jeice",
                "Hit Clan",
                "Zarbon Line",
                "Dodoria Line",
              ],
            }[r] || ["None"],
          ),
  };
  if (r === "Alien") P.alien = genAlien();
  P.style = rnd(["Turtle School", "Crane School", "Saiyan Pride"]);
  P.styles = [P.style];
  applyGene();
  save();
}
// ---------- UI ----------
// ============================================================
// MENUS: screens are built as HTML strings and styled by style.css
// ============================================================
function menu() {
  $("game").hidden = true;
  $("ov").hidden = true;
  const m = $("menu");
  m.hidden = false;
  const n = Math.min(P.fights, 35);
  m.innerHTML = `<h1>Ki Fist: Limitless Saga</h1><div class="card"><span class="badge pri">${P.race}</span><span class="badge">${P.type}</span>${P.gene !== "None" ? `<span class="badge">${P.gene}</span>` : ""}<div style="font-size:24px;font-weight:600">${fmt(bp(P.st))} <span class="mu">power</span></div><br><span class="mu">Techniques: ${P.techs.map((t) => (t ? (t === "Tri-Beam" ? t : t.n) : "empty")).join(", ")}${P.race === "Alien" ? " · Traits: " + P.alien.tr.join(", ") : ""}</span><p class="mu">${PAS[P.race]}</p><p class="mu">${TYPES[P.type].d}</p><p class="mu">${GENE[P.gene].d}</p><div class="mu">Progress: ${Math.min(P.fights, 36)}/36 fights won</div></div>
<button class="big" onclick="startFight(${n})">Fight ${n + 1}: ${EN[n]}</button>${
    P.fights > 1
      ? `<label>Replay fight <select id="rp" onchange="startFight(+this.value)"><option>choose…</option>${EN.slice(
          0,
          Math.min(P.fights, 36),
        )
          .map((x, i) => `<option value=${i}>${i + 1}. ${x}</option>`)
          .join("")}</select></label>`
      : ""
  }
${P.gene === "Hulk" && P.fights >= 36 ? `<button class="big alt" onclick="startFight(36)">??? Secret Challenger</button>` : ""}<button class="big alt" onclick="techs()">Technique Creator</button><button class="big alt" onclick="styles()">Style: ${P.style}</button><button class="big alt" onclick="news()">News & Changelog</button><button class="big alt" onclick="stats()">Stats & Forms</button><button class="big alt" onclick="config()">Config & Claude</button><button class="big alt" onclick="ngc(this)">New Random Fighter</button>`;
}
function ov(h, x) {
  const o = $("ov");
  o.hidden = false;
  o.innerHTML = `<div class="card">${h}${x || '<button class="big" onclick="closeOv()">Close</button>'}</div>`;
  o.scrollTop = 0;
}
function closeOv() {
  $("ov").hidden = true;
  if ($("game").hidden) menu();
}
// ============================================================
// COMBAT HELPERS (dodge window, stats with forms/injuries)
// ============================================================
function dodgeWin(A, E) {
  return Math.min(
    0.75,
    (0.22 + 0.05 * L10(1 + A.ma)) *
      (P.race === "Namekian" ? 1.25 : 1) *
      (P.type === "Spiritual" ? 1.15 : 1) *
      (P.gene === "Mutant" ? 1.2 : 1) *
      (P.gene === "Zarbon Line" ? 1.15 : 1) *
      (P.gene === "Burter" ? 1.2 : 1) *
      (P.gene === "Evil Saiyan" ? 0.85 : 1) *
      (has("Third Eye") ? 1.25 : 1) *
      (has("Wings") ? 1.1 : 1) *
      sb("dw") *
      (inUI() ? 1.4 : 1) *
      (F && F.inj && F.inj.leg ? 0.7 : 1) *
      (F && F.sx && F.sx.dizzy > 0 ? 0.7 : 1) *
      clamp(A.spd / E.spd, 0.35, 1.6),
  );
}
function stats() {
  const fs = FL();
  ov(
    `<h2 style="color:${P.color}">${P.race} · Battle Power ${fmt(bp(P.st))}</h2>` +
      Object.keys(NM)
        .map(
          (k) =>
            `<div class="r"><b>${NM[k]}</b><span>${fmt(P.st[k])}</span><div class="bar" style="grid-column:1/3"><i style="width:${clamp((L10(P.st[k]) / 12) * 100, 3, 100)}%"></i></div><small style="grid-column:1/3">${DS[k]}</small></div>`,
        )
        .join("") +
      `<div class="mu">Dodge window: ${(dodgeWin({ ma: P.st.ma, spd: 1 }, { spd: 1 }) * 1000) | 0} ms (at equal speed)</div><h2>Forms</h2>` +
      fs
        .map(
          (f, i) =>
            `<div class="${P.fights >= f[1] ? "" : "lock"}">${f[0]} — ×${fmOf(i)} · Mastery Lv${lv(P.fmas[f[0]], 20)} ${P.fights >= f[1] ? "✔" : "(unlock: win " + f[1] + " fights)"}</div>`,
        )
        .join("") +
      `<p class="mu">${PAS[P.race]}</p><p class="mu">${TYPES[P.type].d}</p><p class="mu">${GENE[P.gene].d}</p>${P.race === "Alien" ? `<p class="mu">Alien traits: ${P.alien.tr.map((t) => t + " (" + ALN[t] + ")").join("; ")}${P.alien.tr.includes("Extra Arms") ? " - " + P.alien.arms + " arms" : ""}</p>` : ""}<h2>How it works</h2><div class="mu">${MASH}</div>`,
  );
}
function config() {
  let h =
    `<h2>Config</h2>` +
    Object.keys(LBL)
      .map((k) => `<label>${LBL[k]}<input type=number step=any data-k="${k}" value="${cfg[k]}"></label>`)
      .join("") +
    `<h2>Form multipliers</h2>`;
  for (const r in FORMS)
    FORMS[r].forEach(
      (f, i) =>
        (h += `<label>${r}: ${f[0]}<input type=number step=any data-r="${r}" data-i="${i}" value="${cfg.fm[r][i]}"></label>`),
    );
  h += `<label>Genetic<select id="gs">${Object.keys(GENE)
    .map((g) => `<option ${g === P.gene ? "selected" : ""}>${g}</option>`)
    .join(
      "",
    )}</select></label>${P.race === "Frost Demon" ? `<label>Golden Form body/accent<span><input type=color data-fc="g0" value="${P.fc.g[0]}" style="width:50px;padding:0"><input type=color data-fc="g1" value="${P.fc.g[1]}" style="width:50px;padding:0"></span></label><label>Black Form body/accent<span><input type=color data-fc="b0" value="${P.fc.b[0]}" style="width:50px;padding:0"><input type=color data-fc="b1" value="${P.fc.b[1]}" style="width:50px;padding:0"></span></label>` : ""}${P.race === "Alien" ? `<label>Form name<input data-an="n" value="${P.alien.f[0][0]}" style="width:150px"></label><label>Body color<input type=color data-an="s" value="${P.alien.skin}" style="width:60px;padding:0"></label><label>Form color<input type=color data-an="f" value="${P.alien.fc}" style="width:60px;padding:0"></label><button class="big alt" onclick="P.alien=genAlien();save();config()">Reroll alien (resets traits)</button>` : ""}<label>Ki color<input type=color id="kc" value="${P.color}" style="width:60px;padding:0"></label><h2>Claude live tuning</h2>${
    window.claude
      ? ""
      : `<label>API key (standalone only)<input id="ak" type="password" value="${(() => {
          try {
            return localStorage.getItem("kfl_key") || "";
          } catch (e) {
            return "";
          }
        })()}" style="width:150px"></label>`
  }<textarea id="cq" placeholder="e.g. make enemies weaker, fatigue harsher, Super Saiyan x60"></textarea><button class="big" onclick="askClaude()">Ask Claude</button><div class="mu" id="cm"></div><button class="big alt" onclick="cfg=structuredClone(DEF);save();config()">Reset config</button>`;
  ov(h);
}
$("ov").addEventListener("change", (e) => {
  const t = e.target,
    v = parseFloat(t.value);
  if (t.id === "ak") {
    try {
      localStorage.setItem("kfl_key", t.value);
    } catch (e) {}
    return;
  }
  if (t.dataset.an) {
    const a = P.alien;
    if (t.dataset.an === "n") a.f[0][0] = t.value.slice(0, 16) || "Ascended Form";
    else if (t.dataset.an === "s") a.skin = t.value;
    else {
      a.fc = t.value;
      a.f[0][4] = t.value;
    }
    save();
    return;
  }
  if (t.dataset.fc) {
    P.fc[t.dataset.fc[0]][+t.dataset.fc[1]] = t.value;
    save();
    return;
  }
  if (t.id === "gs") setGene(t.value);
  else if (t.id === "kc") {
    P.color = t.value;
  } else if (t.dataset.k && v >= 0) cfg[t.dataset.k] = v;
  else if (t.dataset.r && v > 0) cfg.fm[t.dataset.r][t.dataset.i] = v;
  save();
});
async function askAI(sm, p, o) {
  if (sm) return sm(p, o);
  let k = "";
  try {
    k = localStorage.getItem("kfl_key") || "";
  } catch (e) {}
  if (!k)
    throw { message: "No Claude access here. Paste an Anthropic API key in Config (standalone use only)." };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": k,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: p }],
      }),
    }),
    j = await res.json();
  if (!res.ok) throw { message: (j.error && j.error.message) || "API error" };
  return { text: j.content.map((x) => x.text || "").join("") };
}
async function askClaude() {
  const q = $("cq").value.trim(),
    m = $("cm");
  if (!q) {
    m.textContent = "Type a request first.";
    return;
  }
  m.textContent = "Thinking... (allow the Claude prompt if it appears)";
  let sm = null;
  try {
    sm = window.claude && (await claude.use("sample"));
  } catch (e) {}
  try {
    const r = await askAI(
      sm,
      `You tune a fighting game config. Current JSON: ${JSON.stringify(cfg)}. Request: "${q}". Reply with ONLY a JSON object of the keys to change (same key names; "fm" is {Saiyan:[..],Namekian:[..],Human:[..]} with the same array lengths; optional "color" as #rrggbb). Positive numbers only. No prose, no code fences.`,
      { modelTier: "quick", cache: false },
    );
    const j = JSON.parse((r.text.match(/\{[\s\S]*\}/) || ["{}"])[0]);
    let n = 0;
    for (const k in j) {
      if (k === "color" && /^#[0-9a-f]{6}$/i.test(j[k])) {
        P.color = j[k];
        n++;
      } else if (k === "fm") {
        for (const x in j.fm)
          if (cfg.fm[x] && Array.isArray(j.fm[x]))
            j.fm[x].forEach((v, i) => {
              if (v > 0 && i < cfg.fm[x].length) {
                cfg.fm[x][i] = +v;
                n++;
              }
            });
      } else if (k in LBL && j[k] >= 0) {
        cfg[k] = +j[k];
        n++;
      }
    }
    save();
    config();
    $("cm").textContent = `Applied ${n} change(s): ${JSON.stringify(j)}`;
  } catch (e) {
    m.textContent = "Claude error: " + (e.code || "") + " " + (e.message || e);
  }
}
// ---------- Combat ----------
// ============================================================
// TECHNIQUE CREATOR: technique types, T() builds a move from the player's choice
// ============================================================
const TT = {
  Beam: { ki: 20, m: 4, fat: 12, lock: 0.9, p: 1, d: "Pierces block." },
  "Big Ball": { ki: 40, m: 11, fat: 20, lock: 1.6, d: "Huge ki cost, huge damage." },
  Barrage: { ki: 16, m: 3, fat: 16, lock: 0.5, d: "Very fast, low damage, builds fatigue quickly." },
  Disc: { ki: 24, m: 5, fat: 14, lock: 1, p: 1, bl: 1, d: "Slicing: pierces block and causes bleeding." },
  Flare: { ki: 14, m: 0.3, fat: 10, lock: 0.7, s: 3, p: 1, d: "Blinding flash: stuns the enemy." },
  Wave: { ki: 26, m: 6, fat: 15, lock: 1.1, bn: 1, d: "Burns the target (drains its power)." },
};
function T(i) {
  const t = P.techs[i];
  if (!t) return null;
  if (t === "Tri-Beam")
    return { id: "tri", n: "Tri-Beam", ki: 30, m: 9, fat: 20, lock: 1.3, hp: 0.12, p: 1, k: "ki", tech: 1 };
  const b = TT[t.t];
  if (!b) return null;
  const u = { Quick: [0.7, 0.65, 0.7], Balanced: [1, 1, 1], Heavy: [1.4, 1.7, 1.4] }[t.u] || [1, 1, 1];
  return { ...b, id: t.n, n: t.n, ki: b.ki * u[0], m: b.m * u[1], lock: b.lock * u[2], k: "ki", tech: 1 };
}
function techs() {
  const op = (a, v) => a.map((k) => `<option ${k === v ? "selected" : ""}>${k}</option>`).join("");
  ov(
    `<h2>Technique Creator</h2><div class="mu">Design up to 2 techniques. Type sets the effect; Tuning trades cost, power and speed (Quick = cheap/weak/fast, Heavy = costly/strong/slow).</div>` +
      [0, 1]
        .map((i) => {
          const t = P.techs[i];
          return `<div class="card" style="margin:8px 0;background:#0005"><b>Slot ${i + 1}</b>: ${t ? (t === "Tri-Beam" ? "Tri-Beam (Mutant gene)" : t.n + " · " + t.t + " · " + t.u) : "empty"}${t === "Tri-Beam" ? "" : `<br><input id="tn${i}" placeholder="Name" value="${(t && t.n) || ""}" style="width:100%;margin:4px 0"><select id="tt${i}">${op(Object.keys(TT), t && t.t)}</select> <select id="tu${i}">${op(["Quick", "Balanced", "Heavy"], (t && t.u) || "Balanced")}</select> <button onclick="mk(${i})" style="padding:7px 12px">Save</button>`}</div>`;
        })
        .join("") +
      `<div class="mu">${Object.keys(TT)
        .map((k) => `<b>${k}</b>: ${TT[k].d}`)
        .join("<br>")}</div>`,
  );
}
function mk(i) {
  const n = ($("tn" + i).value.trim() || "Technique " + (i + 1)).slice(0, 16);
  P.techs[i] = { n, t: $("tt" + i).value, u: $("tu" + i).value };
  save();
  techs();
}
function genAlien() {
  const pal = ["#ff4fa3", "#2ee6a6", "#9b59ff", "#ffb020", "#ff3b3b", "#3aa0ff", "#8bc34a"],
    fc = rnd(pal);
  return {
    tr: ["Extra Arms", "Claws", "Carapace", "Wings", "Third Eye", "Stinger", "Regen Gland", "Tail"]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2),
    arms: rnd([4, 4, 6]),
    skin: rnd(pal),
    fc,
    f: [["Ascended Form", 1, 0.9, 8, fc]],
  };
}
function evolve() {
  if (P.race !== "Alien" || !P.alien) return "";
  const k = Object.entries(P.st).sort((a, b) => b[1] - a[1])[0][0],
    pool = {
      str: ["Claws", "Extra Arms"],
      spd: ["Wings", "Tail"],
      dur: ["Carapace", "Regen Gland"],
      sta: ["Regen Gland", "Carapace"],
      kic: ["Third Eye", "Stinger"],
      ma: ["Third Eye", "Tail"],
    }[k],
    n = pool.find((t) => !P.alien.tr.includes(t));
  if (!n) {
    if (P.alien.arms < 8 && P.alien.tr.includes("Extra Arms")) {
      P.alien.arms += 2;
      return "+2 arms";
    }
    return "";
  }
  P.alien.tr.push(n);
  if (n === "Carapace") {
    P.st.dur *= 1.25;
    P.st.spd *= 0.9;
  }
  if (n === "Wings") P.st.spd *= 1.2;
  return n + " (" + NM[k] + " build)";
}
const GENELOOK = {
  "Hit Clan": { sk: "#9fa8c0", out: "#3b2f5c", h: "#1a1a2e", lg: 1 },
  "Zarbon Line": { sk: "#5fd1c0", out: "#e8e8e8", h: "#2ecc71", lg: 1 },
  "Dodoria Line": { sk: "#ff9ac1", out: "#6a1b9a", spk: 1 },
  "Captain Ginyu": { sk: "#8e5bd0", out: "#c0392b", hor: 1 },
  Guldo: { sk: "#6fbf5a", out: "#e8863a" },
  Recoome: { sk: "#f0883a", out: "#2b6cb0", spk: 1 },
  Burter: { sk: "#3a8fd8", out: "#7a2a6a" },
  Jeice: { sk: "#e8d0b0", out: "#5a2a8a", h: "#f5f5f5" },
};
function drawGore() {
  F.gore.forEach((g) => {
    c.save();
    c.translate(g.x, 186);
    c.fillStyle = "#5a0707";
    c.beginPath();
    c.ellipse(0, 0, 18, 3, 0, 0, 7);
    c.fill();
    c.rotate(g.r);
    c.fillStyle = g.sk;
    c.fillRect(-12, -6, 24, 6);
    c.beginPath();
    c.arc(g.k === "arm" ? 14 : -14, -3, 4, 0, 7);
    c.fill();
    c.fillStyle = "#b00";
    c.fillRect(g.k === "arm" ? -13 : 10, -6, 4, 6);
    c.restore();
  });
}
const drip = (x) => F.pt.push({ x: x + rand(-6, 6), y: rand(110, 130), vx: 0, vy: 50, l: 0.7, c: "#b00" });
const ALN = {
  "Extra Arms": "more arms = faster attacks",
  Claws: "phys hits ignore block, may cause bleeding",
  Carapace: "+25% Durability, -10% Speed",
  Wings: "+20% Speed, wider dodge",
  "Third Eye": "+25% dodge window",
  Stinger: "hits may weaken the enemy",
  "Regen Gland": "regenerates HP",
  Tail: "counters hit 30% harder",
};
const has = (t) => P.race === "Alien" && P.alien.tr.includes(t),
  inUI = () => F && !$("game").hidden && F.form >= 0 && /Ultra Instinct/.test(FL()[F.form][0]);
function balance() {
  const mx = Math.max(...Object.values(P.st)),
    fl = mx * cfg.floor;
  let ch = 0;
  for (const k in P.st)
    if (P.st[k] < fl) {
      P.st[k] += (fl - P.st[k]) * 0.4;
      ch = 1;
    }
  return ch;
}
const LK = (n) =>
  /Great Ape/.test(n)
    ? { ape: 1, s: 2.3, sk: "#7a4a22" }
    : /Super Saiyan 3/.test(n)
      ? { h: "#ffcf20", a: "#ffc400", lg: 1 }
      : /Super Saiyan 2/.test(n)
        ? { h: "#ffe680", a: "#ffe680", bolt: 1 }
        : /Saiyan God/.test(n)
          ? { h: "#ff3b3b", a: "#ff4040" }
          : /Blue/.test(n)
            ? { h: "#3ab5ff", a: "#3ab5ff" }
            : /Ultra Instinct/.test(n)
              ? { h: "#dfe8f5", a: "#c8d8ff" }
              : /Legendary/.test(n)
                ? { h: "#9dff6a", a: "#7dff4a", s: 1.5, bolt: 1 }
                : /Super Saiyan/.test(n)
                  ? { h: "#ffd84a", a: "#ffd84a" }
                  : /Giant/.test(n)
                    ? { s: 2 }
                    : /Orange/.test(n)
                      ? { sk: "#ff9a3c", a: "#ff9a3c" }
                      : /Potential/.test(n)
                        ? { sk: "#e6d84a", a: "#ffe34a" }
                        : /Super Namekian/.test(n)
                          ? { a: "#9be89b" }
                          : /Monstrous/.test(n)
                            ? { sk: "#3a8a4a", s: 1.5, a: "#3ecf8e" }
                            : /Rampage/.test(n)
                              ? { s: 1.3, a: "#ff6bd6" }
                              : /Kaioken/.test(n)
                                ? { a: "#ff2d2d" }
                                : /Mystic/.test(n)
                                  ? { a: "#bfe3ff" }
                                  : /Gamma/.test(n)
                                    ? { sk: "#4aa83a", s: 1.4, a: "#6bff3a" }
                                    : /Ogre/.test(n)
                                      ? { s: 1.3, a: "#ffb347" }
                                      : /Berserk/.test(n)
                                        ? { a: "#b04bff", h: "#c07bff" }
                                        : {};
const pf = () => {
  if (F.form < 0) return { fm: 1, sm: 1 };
  const d = FL()[F.form],
    fm = fmOf(F.form);
  return { fm, sm: d[2] || Math.pow(fm, 0.6) };
};
const pe = () => {
  const { fm, sm } = pf(),
    s = P.st;
  return {
    str: s.str * fm * (F.sx.weak > 0 ? 0.8 : 1),
    dur: s.dur * fm,
    spd: s.spd * sm * (F.inj.leg ? 0.75 : 1),
    sta: s.sta,
    kic: s.kic * fm,
    ma: s.ma * fm,
    fm,
  };
};
const ee = () => {
  const e = F.e,
    fm = e.fm;
  return {
    str: e.st.str * fm * (e.sx.weak > 0 ? 0.75 : 1),
    dur: e.st.dur * fm,
    spd: e.st.spd * Math.sqrt(fm) * (e.inj.leg ? 0.7 : 1),
    kic: e.st.kic * fm,
    ma: e.st.ma * fm,
    fm,
  };
};
const sfac = () => (1 / (1 + 0.35 * L10(1 + P.st.sta / 25))) * sb("sta"),
  kfac = () =>
    (1 / (1 + 0.35 * L10(1 + P.st.kic / 25))) *
    (P.race === "Namekian" ? 0.85 : 1) *
    (P.race === "Frost Demon" ? 0.85 : 1) *
    (P.type === "Spiritual" ? 0.85 : 1) *
    sb("kc");
const rand = (a, b) => a + Math.random() * (b - a);
// ============================================================
// FIGHT SETUP: builds the enemy and the fight state object F
// ============================================================
function startFight(i) {
  i = +i;
  if (isNaN(i)) return;
  const boss = BOSS.includes(i);
  let bf = 1;
  FL().forEach((f, j) => {
    if (P.fights >= f[1]) bf = Math.max(bf, fmOf(j));
  });
  if (!P.eb[i])
    P.eb[i] =
      bp(P.st) * cfg.enemyScale * (1 + 0.3 * i) * Math.pow(bf, 0.8) * (boss ? 1.5 : 1) * (i === SEC ? 2 : 1);
  const eb = P.eb[i],
    sh = { str: 0.2, dur: 0.2, spd: 0.15, sta: 0.18, kic: 0.14, ma: 0.13 },
    st = {};
  for (const k in sh) st[k] = eb * sh[k] * (0.85 + Math.random() * 0.3);
  const cf = ED[i][2],
    forms =
      i === SEC
        ? [{ at: 0.5, m: 8, n: "SERIOUS MODE" }]
        : cf
          ? cf.map((x) => ({ at: x[0], m: x[1], n: x[2] }))
          : boss
            ? [
                { at: 0.75, m: 2.5, n: "God Ki" },
                { at: 0.5, m: 6, n: "Destruction Aura" },
                { at: 0.25, m: 15, n: "Ultimate Ki" },
              ]
            : [{ at: 0.5, m: 2.5, n: "Full Power" }];
  F = {
    i,
    t: 0,
    over: false,
    e: {
      n: EN[i],
      st,
      fm: 1,
      fi: -1,
      forms,
      hp: 1,
      state: "idle",
      t: 1.2,
      tt: 1,
      stun: 0,
      si: 0,
      type: "melee",
      lunge: 0,
      flash: 0,
      ng: i === SEC,
      hold: i === SEC,
      sx: { bleed: 0, burn: 0, weak: 0, dizzy: 0 },
      inj: {},
      injT: 0,
      col: (EA[ED[i][0]] || {}).sk || ED[i][1],
    },
    hp: 1,
    ki: 100,
    sta: 100,
    fat: 0,
    form: -1,
    act: 0,
    stun: 0,
    si: 0,
    dodge: 0,
    dcd: 0,
    counter: 0,
    rage: 0,
    exh: 0,
    injCd: 0,
    bflash: 0,
    sx: { bleed: 0, burn: 0, weak: 0, dizzy: 0 },
    inj: {},
    injT: 0,
    skip: 0,
    tsk: 0,
    tf: 8,
    eg: 6,
    cb: 6,
    hur: 0,
    bc: 0,
    gore: [],
    combo: 0,
    pm: "punch",
    pl: 0,
    alt: 0,
    hist: [],
    blk: false,
    chg: false,
    zen: false,
    ngu: false,
    lastAct: 0,
    lastHit: 0,
    u: { str: 0, spd: 0, dur: 0, sta: 0, kic: 0, ma: 0 },
    txt: [],
    pt: [],
    shake: 0,
    fl: 0,
    slow: 0,
    lunge: 0,
    flash: 0,
    ob: bp(P.st),
  };
  $("menu").hidden = true;
  $("ov").hidden = true;
  $("game").hidden = false;
  [0, 1].forEach((n) => {
    const nm = T(n) ? T(n).n : "(Create)";
    $("t" + (n + 1)).textContent = nm;
    $("k" + (n + 1)).textContent = nm;
  });
  say("FIGHT! " + EN[i], "#fff");
  if (i === SEC) say("He is holding back...", "#ccc", 1);
}
function say(s, c, side) {
  F.txt.push({ s, c: c || "#fff", x: side ? 270 : 90, y: 60, t: 1.2 });
}
function gain(s, w) {
  P.mas[P.style] = (P.mas[P.style] || 0) + 1;
  P.st[s] *= 1 + cfg.inFight * (w || 1) * (P.race === "Human" && s === "ma" ? 1.25 : 1);
  F.u[s]++;
}
function egrow() {
  if (F.e.ng) return;
  for (const k in F.e.st) F.e.st[k] *= 1 + cfg.enemyGrow / 3;
}
function addSx(o, n, t) {
  o.sx[n] = Math.max(o.sx[n] || 0, t);
  say(n.toUpperCase() + "!", "#ffb347", o === F.e ? 1 : 0);
}
function injure(o, fr, pl) {
  if (fr < 0.12 || (pl && F.injCd > 0)) return;
  if (Math.random() > Math.min(0.4, fr * 2.5) * (pl && P.gene === "Hanma" ? 0.5 : 1)) return;
  const k = rnd(["arm", "leg", "ribs"]);
  if (o.inj[k]) return;
  o.inj[k] = 1;
  o.injT = F.t;
  if (pl) F.injCd = 6;
  const px = pl ? 90 : 270;
  fx(px, 115, "#c00", 20);
  F.shake = Math.max(F.shake, 12);
  if (k !== "ribs")
    F.gore.push({
      x: px + (pl ? 1 : -1) * rand(20, 50),
      r: rand(-0.4, 0.4),
      k,
      sk: pl ? F.skP || "#e8b98a" : o.col,
    });
  say({ arm: "ARM SEVERED", leg: "LEG SEVERED", ribs: "RIBS CRACKED" }[k] + "!", "#ff3333", pl ? 0 : 1);
}
// ============================================================
// PLAYER ATTACK: costs, fatigue, damage, statuses, stun
// ============================================================
function atk(m) {
  if (!m || !F || F.over || F.act > 0 || F.stun > 0 || F.exh > 0) return;
  const A = pe(),
    E = ee(),
    e = F.e,
    sf = sfac(),
    kf = kfac() * (m.tech && P.race === "Human" ? 0.9 : 1),
    sc = (m.sta || 0) * sf * (F.inj.ribs ? 1.3 : 1),
    kc = (m.ki || 0) * kf;
  if (F.sta < sc || F.ki < kc) {
    say(F.sta < sc ? "No stamina" : "No ki", "#ccc");
    return;
  }
  F.sta -= sc;
  F.ki -= kc;
  if (m.hp) F.hp = Math.max(0.03, F.hp - m.hp);
  if (sc) gain("sta", 0.6);
  F.hist = F.hist.filter((h) => F.t - h.t < 3);
  const rep = F.hist.filter((h) => h.id === m.id).length;
  F.hist.push({ id: m.id, t: F.t });
  F.fat +=
    m.fat *
    (1 + 0.6 * rep) *
    cfg.fatigue *
    sb("fat") *
    (P.gene === "Legendary Saiyan" ? 1.25 : 1) *
    (0.5 + 0.5 * sf * 1.1);
  F.combo = F.t - F.lastAct < 2 ? F.combo + 1 : 1;
  F.lastAct = F.t;
  F.act =
    m.lock *
    (1 + F.fat / 200) *
    (F.inj.arm ? 2 : 1) *
    (has("Extra Arms") ? 1 - 0.1 * (P.alien.arms - 2) : 1) *
    (P.style === "Time-Skip Assassin" ? 0.9 : 1) *
    (F.hur > 0 ? 0.5 : 1);
  F.pl = F.act;
  F.lunge = 1;
  F.pm = m.k === "ki" ? "ki" : m.id === "heavy" ? "heavy" : "punch";
  F.alt ^= 1;
  if (F.fat >= 100) {
    F.exh = 2;
    F.fat = 60;
    say("EXHAUSTED!", "#e67e22");
  } else if (rep >= 2) say("Spam: fatigue!", "#e67e22");
  const r = A.spd / E.spd,
    blitz = r >= (P.type === "Speedster" ? 1.6 : 2),
    cl = has("Claws") && m.k === "phys";
  let d =
      (m.k === "ki" ? A.kic * 0.6 : A.str * 0.5) *
      m.m *
      cfg.dmgP *
      (0.9 + Math.random() * 0.2) *
      (1 - F.fat / 150),
    tag = "";
  if (P.race === "Saiyan") d *= 1 + 0.5 * (1 - F.hp);
  if (F.rage > 0) d *= 2;
  if (P.type === "Warrior" && m.k === "phys") d *= 1.15;
  if (P.gene === "Hulk") d *= 1 + 0.6 * (1 - F.hp);
  if (P.gene === "Evil Saiyan" && F.form >= 0) d *= 1.25;
  d *= m.k === "ki" ? sb("ki") : sb("ph");
  if (P.style === "Saiyan Pride") d *= 1 + Math.min(0.5, 0.1 * (F.combo - 1));
  if (F.inj.arm && m.k === "phys") d *= 0.8;
  if (P.gene === "Dodoria Line" && m.id === "blast") d *= 1.3;
  if (P.gene === "Recoome" && m.id === "blast" && F.eg <= 0) {
    d *= 3;
    F.eg = 12;
    tag += "ERASER GUN ";
    m = Object.assign({}, m, { p: 1 });
  }
  if (P.gene === "Jeice" && m.k === "ki" && F.cb <= 0) {
    d *= 2;
    F.cb = 10;
    tag += "CRUSHER BALL ";
    m = Object.assign({}, m, { wk: 1 });
  }
  if (F.hur > 0) {
    d *= 1.6;
    tag += "HURRICANE ";
  }
  if (P.race === "Frost Demon" && (e.sx.bleed > 0 || e.sx.burn > 0 || e.inj.arm || e.inj.leg)) d *= 1.25;
  if (F.counter > 0) {
    d *= (P.race === "Human" ? 2.5 : 1.8) * sb("cnt") * (has("Tail") ? 1.3 : 1);
    F.counter = 0;
    tag = "COUNTER ";
    gain("ma", 2);
  }
  if (blitz) {
    d *= 1.5;
    tag += "BLITZ ";
    gain("spd", 2);
  } else if (!m.p && !cl && e.state === "idle" && e.stun <= 0 && !e.hold && Math.random() < 0.22) {
    d *= 0.3;
    tag += "blocked ";
  }
  if (m.s) {
    e.stun = m.s;
    e.state = "idle";
    e.t = 1;
    e.si = m.s + 2;
  }
  const fr = d / (E.dur * 10);
  e.hp -= fr;
  e.flash = 1;
  fx(270, 120, m.k === "ki" ? P.color : "#fff", m.k === "ki" ? 14 : 8);
  F.shake = m.k === "ki" ? 10 : 5;
  SFX[m.k === "ki" ? "ki" : "hit"]();
  gain(m.k === "ki" ? "kic" : "str");
  egrow();
  say(tag + fmt(d), m.k === "ki" ? P.color : "#fff", 1);
  if (m.bl && Math.random() < 0.6) addSx(e, "bleed", 6);
  if (m.bn) addSx(e, "burn", 5);
  if (cl && Math.random() < 0.3) addSx(e, "bleed", 5);
  if (has("Stinger") && Math.random() < 0.25) addSx(e, "weak", 5);
  injure(e, fr, false);
  if (m.wk) addSx(e, "weak", 6);
  if (P.gene === "Hit Clan" && Math.random() < 0.15) addSx(e, "dizzy", 4);
  const rt = A.str / E.dur,
    sp = clamp(
      0.05 * rt * m.m * (m.k === "phys" ? 1 : 0.6) * (P.gene === "Recoome" && m.id === "heavy" ? 1.5 : 1),
      0,
      0.6,
    );
  if (!m.s && !e.ng && e.si <= 0 && Math.random() < sp) {
    const du = clamp(0.5 * Math.sqrt(rt), 0.4, 2.2);
    e.stun = Math.max(e.stun, du);
    e.state = "idle";
    e.t = 0.8;
    e.si = du + 2.5;
    say("STUNNED!", "#ffe34d", 1);
  }
  const th = e.forms[e.fi + 1];
  if (th && e.hp < th.at && e.hp > 0) {
    e.fi++;
    e.fm = th.m;
    if (e.ng) e.hold = false;
    say(e.n + ": " + th.n + "!", "#ff5555", 1);
    F.fl = 1;
    F.shake = 14;
    SFX.form();
  }
  if (e.hp <= 0) end(true);
}
// ============================================================
// ENEMY HITS PLAYER: block, injuries, bleed, stun
// ============================================================
function hurt(kind, mul) {
  const E = ee(),
    A = pe(),
    e = F.e;
  let d =
      (kind === "ki" ? E.kic * 0.5 : E.str * 0.5 * (1 + Math.random() * 0.6)) *
      mul *
      cfg.dmgE *
      (e.hold ? 0.15 : 1) *
      (e.inj.arm && kind !== "ki" ? 0.6 : 1),
    t = "",
    bl = false;
  if (F.blk && F.sta > 8) {
    d *= kind === "ki" ? 0.6 : 0.3;
    F.sta -= 14 * sfac() * (F.inj.ribs ? 1.5 : 1);
    gain("ma", 0.8);
    gain("dur", 0.6);
    t = "BLOCK ";
    bl = true;
    F.bflash = 1;
  } else if (F.blk) {
    F.stun = 0.9;
    t = "GUARD BREAK ";
  } else gain("dur", 1.2);
  const fr = d / (A.dur * 10);
  F.hp -= fr;
  F.lastHit = F.t;
  F.flash = 1;
  fx(90, 120, "#f55", 8);
  F.shake = 8;
  SFX[t ? "blk" : "hit"]();
  navigator.vibrate && navigator.vibrate(30);
  say(t + "-" + fmt(d), "#ff7777");
  if (!bl) {
    injure(F, fr, true);
    if (kind === "melee" && fr > 0.06 && Math.random() < 0.3) addSx(F, "bleed", 5);
    if (kind === "ki" && Math.random() < 0.25) addSx(F, "burn", 5);
    if (Math.random() < 0.1) addSx(F, "dizzy", 4);
  }
  const rt = E.str / A.dur;
  if (!bl && F.si <= 0 && Math.random() < clamp(0.04 * rt * mul, 0, 0.5)) {
    const du = clamp(0.4 * Math.sqrt(rt), 0.3, 1.8);
    F.stun = Math.max(F.stun, du);
    F.si = du + 3;
    say("STUNNED!", "#ffe34d");
  }
  if (F.hp <= 0) {
    if (P.race === "Human" && !F.ngu) {
      F.ngu = true;
      F.hp = 0.01;
      F.ki = 100;
      F.rage = 10;
      say("NEVER GIVE UP!", "#ffd84a");
    } else end(false);
  }
}
// ============================================================
// ENEMY STRIKE RESOLVES: dodge / auto-dodge / Time Freeze
// ============================================================
function estrike() {
  const e = F.e,
    A = pe(),
    E = ee();
  if (P.gene === "Guldo" && F.tf <= 0 && F.ki >= 10 && !(F.dodge > 0)) {
    F.tf = 15;
    F.ki -= 10;
    e.stun = 2.5;
    e.state = "idle";
    e.t = 1;
    e.si = 4;
    say("TIME FREEZE!", "#ff7bff");
    F.fl = 0.6;
    return;
  }
  e.lunge = 1;
  const auto =
    inUI() && /Sign/.test(FL()[F.form][0]) && Math.random() < 0.12
      ? "INSTINCT!"
      : P.style === "Angel Training" && Math.random() < 0.06 + 0.02 * lv(P.mas[P.style], 10)
        ? "INSTINCT!"
        : P.style === "Time-Skip Assassin" && F.skip >= 1 && !(F.dodge > 0) && ((F.skip = 0), true)
          ? "TIME SKIP!"
          : P.gene === "Hit Clan" && F.tsk <= 0 && !(F.dodge > 0) && ((F.tsk = 6), true)
            ? "TIME SKIP!"
            : null;
  if (F.dodge > 0 || auto) {
    say(auto || "DODGED!", "#7fe");
    SFX.dodge();
    F.slow = 0.4;
    F.counter = P.style === "Crane School" ? 2.2 : 1.2;
    if (P.gene === "Burter") {
      F.hur = 4;
      say("BLUE HURRICANE!", "#4fd3ff");
    }
    if (P.style === "Crane School") F.sta = Math.min(100, F.sta + 15);
    gain("ma", 1.5);
    gain("spd", 1);
    fx(90, 120, "#7fe", 10);
  } else hurt(e.type, e.type === "ki" ? 2 : 1 + Math.random() * 0.4);
  egrow();
  e.state = "idle";
  e.t = (rand(0.7, 1.5) / clamp(E.spd / A.spd, 0.6, 2)) * (e.hold ? 1.7 : 1) * (e.inj.arm ? 1.4 : 1);
}
function toForm() {
  if (!F || F.over) return;
  const un = FL()
    .map((f, i) => (P.fights >= f[1] ? i : -1))
    .filter((i) => i >= 0);
  let n = F.form < 0 ? un[0] : un[un.indexOf(F.form) + 1];
  if (n === undefined) n = -1;
  if (n >= 0 && F.ki < 15) {
    say("Need 15% ki", "#ccc");
    return;
  }
  F.form = n;
  if (n >= 0) {
    F.fl = 1;
    F.shake = 14;
    SFX.form();
    fx(90, 120, FCc(n), 30);
  }
  say(n < 0 ? "Power down" : FL()[n][0] + "!", "#ffd84a");
}
function dodge() {
  if (!F || F.over || F.dcd > 0 || F.stun > 0) return;
  const w = dodgeWin(pe(), ee());
  F.sta = Math.max(0, F.sta - Math.min(F.sta, 6 * sfac()));
  F.dodge = w;
  F.dcd = w + 0.25;
}
// ============================================================
// PER-FRAME UPDATE: timers, regen, drains, enemy AI
// ============================================================
function upd(dt) {
  const e = F.e,
    A = pe(),
    E = ee();
  F.t += dt;
  [
    "act",
    "stun",
    "dodge",
    "dcd",
    "counter",
    "rage",
    "exh",
    "si",
    "injCd",
    "bflash",
    "tsk",
    "tf",
    "eg",
    "cb",
    "hur",
  ].forEach((k) => (F[k] = Math.max(0, F[k] - dt)));
  e.si = Math.max(0, e.si - dt);
  for (const k in F.sx) {
    F.sx[k] = Math.max(0, F.sx[k] - dt);
    e.sx[k] = Math.max(0, e.sx[k] - dt);
  }
  F.shake = Math.max(0, F.shake * 0.88 - 0.2);
  F.fl = Math.max(0, F.fl - dt * 2);
  F.slow = Math.max(0, F.slow - dt);
  F.pt.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.l -= dt;
  });
  F.pt = F.pt.filter((p) => p.l > 0);
  if (F.chg && Math.random() < 0.5) fx(90 + rand(-25, 25), 185, P.color, 1, 1);
  F.lunge = Math.max(0, F.lunge - dt * 4);
  F.flash = Math.max(0, F.flash - dt * 5);
  e.lunge = Math.max(0, e.lunge - dt * 4);
  e.flash = Math.max(0, e.flash - dt * 5);
  F.skip = Math.min(1, F.skip + dt / 8);
  if (F.sx.bleed > 0) {
    F.hp = Math.max(0.02, F.hp - 0.008 * dt * (P.gene === "Hanma" ? 0.5 : 1));
    if (Math.random() < 0.25) drip(90);
  }
  if (e.sx.bleed > 0 && Math.random() < 0.25) drip(270);
  if (e.sx.bleed > 0 && !e.ng) {
    e.hp -= 0.008 * dt;
    if (e.hp <= 0) {
      end(true);
      return;
    }
  }
  if (has("Regen Gland")) F.hp = Math.min(1, F.hp + 0.008 * dt);
  if (P.race === "Namekian" && (F.inj.arm || F.inj.leg || F.inj.ribs) && F.t - F.injT > 8) {
    F.inj = {};
    say("LIMBS REGENERATED!", "#7dff4a");
  }
  if (e.ng && !e.hold && e.hp < 0.35) e.fm = Math.min(80, e.fm * (1 + 0.3 * dt));
  if (!F.blk && !F.stun) F.sta = Math.min(100, F.sta + 14 * dt * (1 - F.fat / 120) * (F.inj.ribs ? 0.5 : 1));
  if (F.t - F.lastAct > 1)
    F.fat = Math.max(0, F.fat - (F.chg ? (P.gene === "Captain Ginyu" ? 14 : 7) : 4) * dt);
  if (F.chg && !F.blk) {
    F.ki = Math.min(
      100,
      F.ki +
        16 *
          dt *
          (1 + L10(P.st.kic) / 8) *
          (F.sx.burn > 0 ? 0.5 : 1) *
          (P.style === "Turtle School" ? 1.5 : 1),
    );
  } else F.ki = Math.min(100, F.ki + 1 * dt);
  if (F.sx.burn > 0) F.ki = Math.max(0, F.ki - 1.5 * dt);
  if (F.form >= 0) {
    const fm = pf().fm,
      nm = FL()[F.form][0];
    P.fmas[nm] = (P.fmas[nm] || 0) + dt * 3;
    F.ki -=
      (1 + 0.8 * L10(fm)) *
      cfg.drain *
      sb("dr") *
      (P.race === "Frost Demon" ? 0.7 : 1) *
      (1 - 0.05 * lv(P.fmas[nm], 20)) *
      dt;
    if (/Kaioken/.test(nm))
      F.hp = Math.max(0.02, F.hp - (((fm - 1) * 0.0012 * cfg.drain) / (1 + 0.15 * L10(P.st.ma))) * dt);
    if (F.ki <= 0) {
      F.ki = 0;
      F.form = -1;
      say("Ki depleted: form lost", "#ccc");
    }
  }
  if (P.race === "Namekian" && F.t - F.lastHit > 3)
    F.hp = Math.min(1, F.hp + 0.015 * (P.gene === "Dragon Clan" ? 2 : 1) * dt);
  if (P.race === "Saiyan" && F.hp < 0.25 && !F.zen) {
    F.zen = true;
    F.hp = Math.min(1, F.hp + 0.2);
    for (const k in P.st) P.st[k] *= 1 + cfg.zenkai;
    say("ZENKAI!", "#ffd84a");
  }
  if (P.gene === "Captain Ginyu" && F.hp < 0.25 && !F.bc) {
    F.bc = 1;
    F.hp = Math.min(1, F.hp + 0.35);
    F.ki = 100;
    F.inj = {};
    F.sx.bleed = 0;
    F.fl = 1;
    say("BODY CHANGE!", "#ff7bff");
  }
  if (e.stun > 0) e.stun -= dt;
  else {
    e.t -= dt;
    if (e.state === "idle" && e.t <= 0) {
      e.type = Math.random() < 0.35 ? "ki" : "melee";
      e.state = "tele";
      SFX.warn();
      const r = E.spd / A.spd;
      e.t =
        (cfg.tele / clamp(r, 1, 3)) *
        (r < 0.5 ? 1.4 : 1) *
        (e.hold ? 1.6 : 1) *
        (e.inj.arm ? 1.4 : 1) *
        (e.sx.dizzy > 0 ? 1.3 : 1);
      e.tt = e.t;
    } else if (e.state === "tele" && e.t <= 0) estrike();
  }
}
// ============================================================
// END OF FIGHT: growth, balance, unlocks, result screen
// ============================================================
function end(win) {
  if (F.over) return;
  F.over = true;
  SFX[win ? "win" : "lose"]();
  const old = { ...P.st },
    ob = F.ob,
    G =
      Math.pow(cfg.growth, win ? 1 : 0.4) *
      (P.race === "Saiyan" ? 1.2 : 1) *
      (P.gene === "Legendary Saiyan" ? 1.15 : 1),
    tot = Object.values(F.u).reduce((a, b) => a + b, 0);
  for (const k in P.st)
    P.st[k] *= G * (0.8 + 1.2 * (tot ? F.u[k] / tot : 1 / 6)) * (TYPES[P.type].b[k] ? 1.1 : 1);
  const bal = balance(),
    evo =
      win && (F.i + 1) % 3 === 0
        ? (() => {
            try {
              return evolve();
            } catch (e) {
              return "";
            }
          })()
        : "";
  if (win) P.fights = Math.max(P.fights, F.i + 1);
  P.fights > 36 && (P.fights = 36);
  if (P.race === "Alien") P.alien.f[0][3] = Math.round(8 * Math.pow(1.2, P.fights));
  const nu = [];
  Object.keys(STY).forEach((k) => {
    if (P.fights >= STY[k].u && !P.styles.includes(k)) {
      P.styles.push(k);
      nu.push(k);
    }
  });
  save();
  setTimeout(() => {
    ov(
      `<h2>${win ? (F.i >= 35 ? "SAGA COMPLETE! You beat the boss!" : "Victory!") : "Defeated... but you learned"}</h2><div>Power ${fmt(ob)} → <b>${fmt(bp(P.st))}</b></div>${nu.length ? `<p style="color:#7dff4a">New style learned: ${nu.join(", ")}!</p>` : ""}${bal ? `<p class="mu">Balance: your weaker stats caught up toward your strongest.</p>` : ""}${evo ? `<p style="color:#7dff4a">Your build evolved: ${evo}!</p>` : ""}` +
        Object.keys(NM)
          .map((k) => `<div class="mu">${NM[k]}: ${fmt(old[k])} → ${fmt(P.st[k])}</div>`)
          .join("") +
        (win && FL().some((f) => f[1] === P.fights)
          ? `<p style="color:#ffd84a">New form unlocked: ${FL()
              .filter((f) => f[1] === P.fights)
              .map((f) => f[0])}!</p>`
          : ""),
      '<button class="big" onclick="menu()">Main Menu</button>' +
        (win && F.i < 35
          ? `<button class="big alt" onclick="startFight(${F.i + 1})">Next Fight</button>`
          : "") +
        `<button class="big alt" onclick="startFight(${F.i})">Retry / Replay</button>`,
    );
  }, 900);
}
// ---------- Render ----------
const cv = $("cv"),
  c = cv.getContext("2d");
cv.width = 720;
cv.height = 400;
c.scale(2, 2); // draw at 2x resolution; all coordinates are 360x200
// ============================================================
// RENDERING: canvas drawn at 360x200 logical units (scaled 2x for sharpness)
// ============================================================
function arm(sx, sy, h, sk, cl) {
  c.strokeStyle = sk;
  c.lineWidth = 6;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(h[0], h[1]);
  c.stroke();
  c.fillStyle = sk;
  c.beginPath();
  c.arc(h[0], h[1], 4.5, 0, 7);
  c.fill();
  if (cl) {
    c.strokeStyle = "#fff";
    c.lineWidth = 1.5;
    for (let i = -1; i < 2; i++) {
      c.beginPath();
      c.moveTo(h[0] + 3, h[1] + i * 3);
      c.lineTo(h[0] + 9, h[1] + i * 3);
      c.stroke();
    }
  }
}
function hand(o, f) {
  const l = o.lunge,
    t = F.t;
  switch (o.pose) {
    case "punch":
      return f === (o.alt ? 1 : 0) ? [14 + 38 * l, -50 + (1 - l) * 4] : [2, -42];
    case "heavy":
      return [10 + 40 * l, -66 + 28 * (1 - l)];
    case "ki":
      return [22 + 8 * o.kp, -48];
    case "block":
      return f ? [12, -46] : [15, -60];
    case "charge":
      return [(f ? -1 : 1) * (15 + Math.sin(t * 40) * 2), -26];
    case "wind":
      return f ? [-12, -48] : [-4, -72];
    case "stun":
      return [(f ? -1 : 1) * 18, -28];
    default:
      return f ? [-12, -38] : [14, -42 + Math.sin(t * 5) * 2];
  }
}
function fighter(x, face, o) {
  const l = o.lunge,
    t = F.t,
    sk = o.skin,
    ps = o.pose,
    fk = o.fk;
  c.save();
  c.translate(
    x + face * (ps === "punch" || ps === "heavy" ? l * 28 : 0) - face * (ps === "dodge" ? 16 : 0),
    185,
  );
  c.scale(face * o.s * (o.fat || 1), o.s);
  if (o.aura) {
    c.globalAlpha = 0.3 + 0.1 * Math.sin(t * 12);
    c.fillStyle = o.aura;
    c.beginPath();
    c.ellipse(0, -45, 34, 62, 0, 0, 7);
    c.fill();
    c.globalAlpha = 1;
  }
  if (o.bolt) {
    c.strokeStyle = "#fff";
    c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + i * 2.1,
        bx = Math.cos(a) * 30,
        by = -45 + Math.sin(a) * 50;
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(bx + 6, by - 7);
      c.lineTo(bx - 2, by - 12);
      c.stroke();
    }
  }
  if (ps === "dodge") {
    c.globalAlpha = 0.35;
    c.fillStyle = sk;
    c.fillRect(8, -56, 24, 56);
    c.globalAlpha = 1;
  }
  if (o.ape) {
    c.fillStyle = sk;
    c.beginPath();
    c.ellipse(0, -32, 22, 28, 0, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(2, -66, 14, 0, 7);
    c.fill();
    c.fillStyle = "#a6724a";
    c.beginPath();
    c.ellipse(10, -62, 8, 6, 0, 0, 7);
    c.fill();
    c.fillStyle = "#ff3030";
    c.fillRect(5, -71, 4, 3);
    c.fillRect(-2, -71, 4, 3);
    c.fillStyle = sk;
    c.fillRect(-11, -6, 9, 6);
    c.fillRect(3, -6, 9, 6);
    c.strokeStyle = sk;
    c.lineWidth = 9;
    c.lineCap = "round";
    const sw = ps === "punch" || ps === "heavy" ? l : 0;
    c.beginPath();
    c.moveTo(-14, -50);
    c.lineTo(-24, -12);
    c.stroke();
    c.beginPath();
    c.moveTo(14, -50);
    c.lineTo(24 + 30 * sw, -12 - (ps === "heavy" ? 20 * sw : 0));
    c.stroke();
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-18, -20);
    c.quadraticCurveTo(-40, -24, -38, -52);
    c.stroke();
    if (o.inj && (o.inj.arm || o.inj.leg || o.inj.ribs)) {
      c.fillStyle = "#b00";
      c.fillRect(-6, -50, 8, 12);
    }
  } else {
    if (o.frost) {
      c.strokeStyle = sk;
      c.lineWidth = 5;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-10, -24);
      c.quadraticCurveTo(-34, -20, -34, -44);
      c.stroke();
    }
    c.fillStyle = sk;
    c.fillRect(-10, -22, 8, 22);
    if (o.inj && o.inj.leg) {
      c.fillStyle = "#b00";
      c.fillRect(2, -22, 8, 6);
      c.fillStyle = sk;
    } else c.fillRect(2, -22, 8, 22);
    c.fillStyle = o.outfit;
    c.fillRect(-12, -56, 24, 36);
    if (o.inj && o.inj.ribs) {
      c.fillStyle = "#7a1a3a";
      c.fillRect(-9, -46, 12, 10);
      c.fillStyle = "#d00";
      c.fillRect(-6, -44, 3, 6);
    }
    if (o.fa) {
      c.fillStyle = o.fa;
      c.fillRect(-12, -50, 24, 5);
      c.fillRect(-15, -59, 7, 7);
      c.fillRect(8, -59, 7, 7);
    }
    c.fillStyle = sk;
    if (o.frost && fk === 1) {
      c.beginPath();
      c.ellipse(-8, -70, 17, 10, -0.3, 0, 7);
      c.fill();
    }
    c.beginPath();
    c.arc(0, -67, 11, 0, 7);
    c.fill();
    c.fillStyle = o.eye || "#111";
    c.fillRect(3, -69, 3, 3);
    c.fillRect(-3, -69, 3, 3);
    c.fillStyle = o.hair;
    if (o.lg && !o.spiky) c.fillRect(-16, -80, 9, 60);
    if (o.spk) {
      c.fillStyle = "#fff";
      [-8, 0, 8].forEach((x) => {
        c.beginPath();
        c.moveTo(x - 3, -77);
        c.lineTo(x, -89);
        c.lineTo(x + 3, -77);
        c.fill();
      });
    }
    if (o.hor) {
      c.fillStyle = "#f0e0a0";
      c.beginPath();
      c.moveTo(-9, -74);
      c.lineTo(-13, -90);
      c.lineTo(-3, -76);
      c.moveTo(9, -74);
      c.lineTo(13, -90);
      c.lineTo(3, -76);
      c.fill();
    }
    c.fillStyle = o.hair;
    if (o.frost) {
      c.fillStyle = o.fa && fk >= 3 ? o.fa : "#f0e8ff";
      if (fk <= 1) {
        const hh = fk === 0 ? 20 : 10;
        c.beginPath();
        c.moveTo(-9, -74);
        c.lineTo(-14, -74 - hh);
        c.lineTo(-2, -76);
        c.moveTo(9, -74);
        c.lineTo(14, -74 - hh);
        c.lineTo(2, -76);
        c.fill();
      }
    } else if (o.spiky) {
      if (o.lg) c.fillRect(-16, -80, 9, 64);
      c.beginPath();
      c.moveTo(-12, -70);
      c.lineTo(-9, -90);
      c.lineTo(-3, -76);
      c.lineTo(2, -94);
      c.lineTo(7, -76);
      c.lineTo(13, -88);
      c.lineTo(12, -70);
      c.fill();
    } else if (o.ant) {
      c.strokeStyle = sk;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-4, -77);
      c.lineTo(-7, -90);
      c.moveTo(4, -77);
      c.lineTo(7, -90);
      c.stroke();
    } else if (!o.bald) c.fillRect(-11, -79, 22, 9);
    if (o.cell) {
      c.fillStyle = "#1a3a1a";
      [
        [-8, -52],
        [2, -46],
        [-4, -38],
        [6, -54],
        [-2, -30],
      ].forEach((p) => c.fillRect(p[0], p[1], 3, 3));
      c.beginPath();
      c.moveTo(-6, -77);
      c.lineTo(0, -94);
      c.lineTo(6, -77);
      c.fill();
      c.fillRect(-17, -56, 6, 26);
    }
    const sh = [
        [8, -52],
        [-8, -52],
      ],
      n = o.arms || 2;
    for (let i = 0; i < 2; i++) {
      if (i === 0 && o.inj && o.inj.arm) {
        c.fillStyle = "#b00";
        c.beginPath();
        c.arc(sh[0][0], sh[0][1], 4, 0, 7);
        c.fill();
        continue;
      }
      arm(sh[i][0], sh[i][1], hand(o, i), sk, o.claws);
    }
    for (let k = 1; k < n / 2; k++)
      for (let i = 0; i < 2; i++) {
        const hh = hand(o, i);
        arm(sh[i][0], sh[i][1] + k * 7, [hh[0], hh[1] + k * 7], sk, o.claws);
      }
  }
  if (ps === "block") {
    c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 14) + (o.bf || 0) * 0.4;
    c.strokeStyle = "#4fd3ff";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(8, -45, 42, -1.3, 1.3);
    c.stroke();
    c.globalAlpha = 1;
  }
  if ((ps === "punch" || ps === "heavy") && l > 0.2) {
    c.globalAlpha = l;
    c.strokeStyle = ps === "heavy" ? "#ff9a2e" : "#fff";
    c.lineWidth = ps === "heavy" ? 6 : 3;
    c.beginPath();
    c.arc(30, -50, 22 + 10 * (1 - l), -0.9, 0.9);
    c.stroke();
    c.globalAlpha = 1;
  }
  if (ps === "ki") {
    const h = hand(o, 0);
    c.globalAlpha = 0.9;
    c.fillStyle = o.kc || "#6cf";
    c.beginPath();
    c.arc(h[0] + 8, h[1], 4 + 12 * o.kp, 0, 7);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(h[0] + 8, h[1], 2 + 6 * o.kp, 0, 7);
    c.fill();
    c.globalAlpha = 1;
  }
  if (o.flash > 0) {
    c.globalAlpha = o.flash * 0.6;
    c.fillStyle = "#fff";
    c.fillRect(-16, -96, 34, 96);
    c.globalAlpha = 1;
  }
  c.restore();
}
function draw() {
  c.save();
  if (F.shake > 0) c.translate(rand(-F.shake, F.shake) / 2, rand(-F.shake, F.shake) / 2);
  bg();
  drawGore();
  const e = F.e,
    nm = F.form >= 0 ? FL()[F.form][0] : "",
    lk = LK(nm),
    fa = P.race === "Frost Demon",
    fk = F.form;
  let sk = P.race === "Namekian" ? "#35b04f" : P.race === "Alien" ? P.alien.skin : P.skin,
    acc = null;
  if (fa) {
    const q = P.fc;
    sk = fk === 3 ? q.g[0] : fk === 4 ? q.b[0] : "#e8e0f2";
    acc = fk === 3 ? q.g[1] : fk === 4 ? q.b[1] : fk === 2 ? "#8e44ad" : fk < 0 ? "#8e44ad" : null;
  }
  if (lk.sk) sk = lk.sk;
  const GL = GENELOOK[P.gene] || {};
  if (GL.sk && F.form < 0) sk = GL.sk;
  if (P.race === "Alien" && F.form >= 0) sk = P.alien.fc;
  F.skP = sk;
  const ps =
      F.stun > 0
        ? "stun"
        : F.blk
          ? "block"
          : F.dodge > 0
            ? "dodge"
            : F.act > 0
              ? F.pm
              : F.chg
                ? "charge"
                : "idle",
    fc = F.form >= 0 ? FCc(F.form) : null;
  fighter(90, 1, {
    s: (lk.s || 1) * (fa ? [1, 1.2, 1.1, 1, 1, 1][fk + 1] : 1),
    pose: ps,
    lunge: F.lunge,
    alt: F.alt,
    kp: F.pl ? clamp(1 - F.act / F.pl, 0, 1) : 0,
    bf: F.bflash,
    flash: F.flash,
    skin: sk,
    outfit: fa ? sk : GL.out || P.outfit,
    hair: lk.h || GL.h || P.hair,
    spiky: P.race === "Saiyan",
    ant: P.race === "Namekian",
    bald: (P.race === "Alien" && !GL.h) || fa,
    eye: lk.h ? "#1fe0c0" : "#111",
    lg: lk.lg || GL.lg,
    spk: GL.spk,
    hor: GL.hor,
    inj: F.inj,
    bolt: lk.bolt,
    ape: lk.ape,
    frost: fa,
    fk,
    fa: acc,
    arms: has("Extra Arms") ? P.alien.arms : 2,
    claws: has("Claws"),
    kc: P.color,
    aura: lk.a || fc || (F.chg ? P.color : null) || (F.blk ? "#aaa" : null),
  });
  const ep =
    e.stun > 0
      ? "stun"
      : e.lunge > 0
        ? "punch"
        : e.state === "tele"
          ? e.type === "ki"
            ? "ki"
            : "wind"
          : "idle";
  const ea = EA[e.n] || {},
    fn = e.fi >= 0 ? e.forms[e.fi].n : "",
    ef = EFL[fn] || {},
    esk = ef.sk || ea.sk || e.col;
  fighter(270, -1, {
    s: (ea.s || 1) * (ef.s || 1),
    pose: ep,
    lunge: e.lunge,
    alt: 0,
    kp: e.state === "tele" ? clamp(1 - e.t / e.tt, 0, 1) : 0,
    flash: e.flash,
    skin: esk,
    outfit: ea.frost ? esk : ea.out || "#222",
    hair: ef.h || ea.h || "#111",
    spiky: ef.sp || ea.sp,
    bald: ea.bald,
    lg: ea.lg,
    ant: ea.ant,
    spk: ea.spk,
    hor: ef.hor || ea.hor,
    fat: ea.fat,
    cell: ea.cell,
    frost: ea.frost,
    fk: ea.frost ? (FK[fn] === undefined ? -1 : FK[fn]) : undefined,
    fa: ea.frost ? "#8e44ad" : null,
    ape: ef.ape,
    bolt: ef.bolt,
    eye: "#c00",
    kc: "#f66",
    arms: 2,
    inj: e.inj,
    aura: e.ng ? null : ef.a || (e.fi >= 0 ? "#ff9a3a" : null),
  });
  c.textAlign = "center";
  c.lineWidth = 3;
  c.strokeStyle = "#000";
  const lab = {
    punch: ["ATTACK!", "#ff9a2e"],
    heavy: ["HEAVY HIT!", "#ff5a2e"],
    ki: ["KI ATTACK!", "#6cf"],
    block: ["BLOCK", "#4fd3ff"],
    dodge: ["DODGE", "#7dff7d"],
    charge: ["CHARGING", "#6aa8ff"],
    stun: ["STUNNED", "#ffe34d"],
  }[ps];
  c.font = "italic 900 15px Impact,sans-serif";
  if (lab) {
    c.strokeText(lab[0], 90, 24);
    c.fillStyle = lab[1];
    c.fillText(lab[0], 90, 24);
  }
  if (e.stun > 0) {
    c.strokeText("STUNNED", 270, 24);
    c.fillStyle = "#ffe34d";
    c.fillText("STUNNED", 270, 24);
  } else if (e.state === "tele") {
    const tx = e.type === "ki" ? "KI BLAST" : "STRIKE";
    c.strokeText(tx, 270, 24);
    c.fillStyle = "#ff5a5a";
    c.fillText(tx, 270, 24);
  }
  if (e.state === "tele" && e.stun <= 0) {
    const w = dodgeWin(pe(), ee());
    c.fillStyle = e.t <= w ? "#ffe34d" : "#ff4040";
    c.font = "bold 22px sans-serif";
    c.fillText(e.t <= w ? "DODGE!" : "!", 270, 50);
  }
  F.txt = F.txt.filter((t) => (t.t -= 1 / 60) > 0);
  c.font = "italic 900 17px Impact,sans-serif";
  F.txt.forEach((t) => {
    c.globalAlpha = Math.min(1, t.t * 2);
    c.fillStyle = t.c;
    c.strokeStyle = "#000";
    c.lineWidth = 3;
    c.strokeText(t.s, t.x, t.y + 10 - (1.2 - t.t) * 30);
    c.fillText(t.s, t.x, t.y + 10 - (1.2 - t.t) * 30);
  });
  c.globalAlpha = 1;
  drawFx();
}
function bar(id, v, t) {
  const b = $(id);
  b.firstChild.style.width = clamp(v * 100, 0, 100) + "%";
  b.lastChild.textContent = t;
}
const SXN = (o) => [
  ...Object.keys(o.sx)
    .filter((k) => o.sx[k] > 0)
    .map((k) => k.toUpperCase()),
  ...Object.keys(o.inj)
    .filter((k) => o.inj[k])
    .map((k) => ({ arm: "ARM LOST", leg: "LEG LOST", ribs: "RIBS CRACKED" })[k]),
];
// ============================================================
// HUD: updates the bars and status text
// ============================================================
function hud() {
  const A = pe(),
    E = ee();
  $("pi").textContent = `${P.race} · BP ${fmt(bp(P.st) * A.fm)}${F.form >= 0 ? " · " + FL()[F.form][0] : ""}`;
  $("ei").textContent =
    `${F.e.n}${F.e.hold ? " (holding back)" : ""} · BP ${fmt(Object.values(F.e.st).reduce((a, b) => a + b) * E.fm)}`;
  bar("ph", F.hp, "HP " + fmt(F.hp * A.dur * 10));
  bar("pk", F.ki / 100, "Ki " + F.ki.toFixed(0) + "%");
  bar("ps", F.sta / 100, "Stamina");
  bar("pf", F.fat / 100, "Fatigue " + F.fat.toFixed(0) + "%");
  bar("eh", F.e.hp, "HP " + fmt(Math.max(0, F.e.hp) * E.dur * 10));
  $("pst").textContent = [
    ...SXN(F),
    P.style === "Time-Skip Assassin"
      ? F.skip >= 1
        ? "SKIP READY"
        : "skip " + ((F.skip * 100) | 0) + "%"
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  $("est").textContent = SXN(F.e).join(" · ");
  $("form").textContent = F.form < 0 ? "Power Up" : FL()[F.form][0];
}
// ============================================================
// MAIN LOOP and TOUCH BUTTONS
// ============================================================
let last = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (F && !$("game").hidden) {
    if (!F.over) upd(F.slow > 0 ? dt * 0.4 : dt);
    draw();
    hud();
  }
  requestAnimationFrame(loop);
}
const tap = (id, fn) =>
    ($(id).onpointerdown = (e) => {
      e.preventDefault();
      fn();
    }),
  hold = (id, k) => {
    const b = $(id);
    b.onpointerdown = (e) => {
      e.preventDefault();
      F && (F[k] = true);
    };
    b.onpointerup =
      b.onpointerleave =
      b.onpointercancel =
        () => {
          F && (F[k] = false);
        };
  },
  tt = (i) => () => {
    const m = T(i);
    m ? atk(m) : F && say("Create it in the menu", "#ccc");
  };
tap("punch", () => atk(MV.punch));
tap("heavy", () => atk(MV.heavy));
tap("blast", () => atk(MV.blast));
tap("t1", tt(0));
tap("t2", tt(1));
tap("form", toForm);
tap("dodge", dodge);
hold("block", "blk");
hold("charge", "chg");
// ---------- Keyboard & mouse (PC) ----------
// Tap keys run once per press; hold keys set a flag on the fight (F.blk / F.chg) while down.
const KEYMAP = { q: () => atk(MV.blast), e: dodge, r: toForm, 1: tt(0), 2: tt(1) };
const HOLDKEYS = { shift: "blk", " ": "blk", c: "chg" };
const inFight = () => F && !F.over && !$("game").hidden && $("ov").hidden;
const lit = (key, on) =>
  document.querySelectorAll('#keys [data-key="' + key + '"]').forEach((el) => el.classList.toggle("on", on));
addEventListener("keydown", (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !inFight()) return;
  const k = e.key.toLowerCase();
  if (KEYMAP[k]) {
    e.preventDefault();
    if (!e.repeat) KEYMAP[k]();
    lit(k, true);
  } else if (HOLDKEYS[k]) {
    e.preventDefault();
    F[HOLDKEYS[k]] = true;
    lit(k === " " ? "shift" : k, true);
  }
});
addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (HOLDKEYS[k] && F) F[HOLDKEYS[k]] = false;
  lit(k === " " ? "shift" : k, false);
});
$("game").addEventListener("mousedown", (e) => {
  // left = attack, right = heavy
  if (!inFight() || e.target.closest("#pad")) return;
  if (e.button === 0) atk(MV.punch);
  if (e.button === 2) atk(MV.heavy);
  lit("m" + e.button, true);
});
addEventListener("mouseup", (e) => lit("m" + e.button, false));
$("game").addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("blur", () => {
  if (F) {
    F.blk = false;
    F.chg = false;
  }
}); // never get stuck blocking

load();
menu();
requestAnimationFrame(loop);