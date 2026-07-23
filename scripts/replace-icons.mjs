// Replace all emoji icons with SVG components across the codebase.
// Run from repo root: node scripts/replace-icons.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = "src";

// Emoji → icon-name. The JSX used will be <emojiIconMap[name] />.
// We'll import a single object E from "@/components/emojis" that has these keys.
const EMOJI_MAP = {
  "📄": "Doc",         // file / invoice
  "📋": "Clipboard",   // quotation / draft
  "🧮": "Calc",        // calculator
  "👁️": "Eye",
  "💾": "Save",
  "🖨️": "Printer",
  "🗑️": "Trash",
  "👤": "User",
  "➕": "Plus",
  "✏️": "Pencil",
  "💵": "Cash",
  "🏦": "Bank",
  "💰": "Money",
  "📚": "Books",
  "📊": "Chart",
  "🔒": "Lock",
  "⏳": "Hourglass",
  "📅": "Calendar",
  "📆": "Calendar",
  "⏱️": "Stopwatch",
  "👥": "Users",
  "🎉": "Party",
  "💳": "Card",
  "🏷️": "Tag",
  "✅": "Check",
  "⚠️": "Warn",
  "❌": "X",
  "ℹ️": "Info",
  "⭐": "Star",
  "🔍": "Search",
  "🎯": "Target",
  "📈": "TrendUp",
  "📉": "TrendDown",
  "📞": "Phone",
  "✉️": "Mail",
  "✉": "Mail",
  "🏠": "Home",
  "⚙️": "Gear",
  "🚪": "Door",
  "🌙": "Moon",
  "☀️": "Sun",
  "📱": "Mobile",
  "💡": "Bulb",
  "🔥": "Flame",
  "🎁": "Gift",
  "💎": "Gem",
  "🗂️": "Folder",
  "📝": "Note",
  "💻": "Laptop",
  "📷": "Camera",
  "🔑": "Key",
  "🧭": "Compass",
  "🧱": "Brick",
  "💼": "Briefcase",
  "🧾": "Receipt",
  "📦": "Box",
  "✂️": "Scissors",
  "📌": "Pin",
  "🔖": "Bookmark",
  "📍": "Pin",
  "⏰": "Clock",
  "⏲️": "Clock",
  "🔔": "Bell",
  "🔕": "BellOff",
  "💬": "Chat",
  "📣": "Megaphone",
  "🔋": "Battery",
  "🔌": "Plug",
  "💸": "RupeeCircle",
  "💴": "Cash",
  "💶": "Cash",
  "💷": "Cash",
  "⚖️": "Scale",
  "🔧": "Wrench",
  "🔨": "Hammer",
  "🛠️": "Tool",
  "🔩": "Nut",
  "📿": "Beads",
  "💈": "Barber",
  "🔭": "Telescope",
  "🔬": "Microscope",
  "💊": "Pill",
  "💉": "Syringe",
  "🧬": "Dna",
  "🌡️": "Thermo",
  "🧹": "Broom",
  "🚽": "Toilet",
  "🚰": "Water",
  "🚿": "Shower",
  "🛁": "Bath",
  "🛀": "Bath",
  "🛒": "Cart",
  "🛡️": "Shield",
  "📥": "Inbox",
  "📤": "Outbox",
  "📒": "Ledger",
  "📖": "Book",
  "🏢": "Building",
  "👑": "Crown",
  "🥇": "Medal1",
  "🥈": "Medal2",
  "🥉": "Medal3",
  "📂": "Folder",
  "📜": "Scroll",
  "🏆": "Trophy",
  "🔎": "Search",
  "☰": "Menu",
  "👍": "ThumbUp",
  "⚡": "Bolt",
  "☎": "Phone",
};

// Some emojis have a variant selector (FE0F) — handle with & without.
const allKeys = [...new Set([...Object.keys(EMOJI_MAP), ...Object.keys(EMOJI_MAP).map(k => k.replace(/\uFE0F/g, "")), ...Object.keys(EMOJI_MAP).map(k => k + "\uFE0F")])];
const emojiRegex = new RegExp(
  "(" +
  Array.from(new Set(allKeys)).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a,b)=>b.length-a.length).join("|") +
  ")",
  "gu"
);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || ent.name === "node_modules" || ent.name === "emojis.tsx" || ent.name === "replace-icons.mjs") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const src0 = fs.readFileSync(file, "utf8");
  // Skip this script's output target
  if (file.endsWith("emojis.tsx")) continue;
  let src = src0;

  // Replace standalone emojis in JSX/strings. Be careful not to touch emojis inside comments/imports.
  src = src.replace(emojiRegex, (m) => {
    const norm = m.replace(/\uFE0F/g, "");
    const key = EMOJI_MAP[m] || EMOJI_MAP[norm] || EMOJI_MAP[norm + "\uFE0F"];
    if (!key) return m;
    return `<E.${key}/>`;
  });

  // If we inserted <E.X/>, ensure E is imported.
  if (src !== src0) {
    const needsImport = /<E\.[A-Za-z0-9]+\/?>/.test(src);
    const hasImport = /from\s+["']@\/components\/emojis["']/.test(src);
    if (needsImport && !hasImport) {
      // Insert after last top-level import.
      const lines = src.split("\n");
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i])) lastImport = i;
      }
      const imp = `import { E } from "@/components/emojis";`;
      if (lastImport >= 0) lines.splice(lastImport + 1, 0, imp);
      else lines.unshift(imp);
      src = lines.join("\n");
    }
    fs.writeFileSync(file, src, "utf8");
    changed++;
    console.log("updated", file);
  }
}
console.log("done:", changed, "files");
