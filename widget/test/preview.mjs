// Scriptable の代わりをする最小限の部品を用意して、ウィジェット本体を Node で動かす。
// 実際の GitHub を読み、small / medium / large の見た目を HTML に書き出す。
//
//   node widget/test/preview.mjs [出力先フォルダ]
//
// iPhone の描画そのものではないので、文字の詰まり具合などは実機と少し違う。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(os.tmpdir(), "claude-widget-preview"));
fs.mkdirSync(outDir, { recursive: true });
const code = fs.readFileSync(path.join(here, "..", process.env.WIDGET_ENTRY || "claude-progress.js"), "utf8");

// ---- Scriptable のまね ----
class Color {
  constructor(hex) { this.light = hex; this.dark = hex; }
  static dynamic(l, d) { const c = new Color(l.light); c.dark = d.dark; return c; }
}
const Font = {
  systemFont: (size) => ({ size, weight: 400 }),
  mediumSystemFont: (size) => ({ size, weight: 500 }),
  boldSystemFont: (size) => ({ size, weight: 700 }),
};
class Size { constructor(w, h) { this.width = w; this.height = h; } }
class Text { constructor(s) { this.kind = "text"; this.text = s; } }
class Stack {
  constructor(dir = "row") { this.kind = "stack"; this.dir = dir; this.children = []; this.align = "start"; this.padding = null; }
  addText(s) { const t = new Text(s); this.children.push(t); return t; }
  addStack() { const s = new Stack("row"); this.children.push(s); return s; }
  addSpacer(len) { this.children.push({ kind: "spacer", len }); }
  layoutHorizontally() { this.dir = "row"; }
  layoutVertically() { this.dir = "column"; }
  centerAlignContent() { this.align = "center"; }
  bottomAlignContent() { this.align = "end"; }
  topAlignContent() { this.align = "start"; }
  setPadding(t, l, b, r) { this.padding = [t, r, b, l]; }
}
let captured = null;
class ListWidget extends Stack {
  constructor() { super("column"); }
  async presentSmall() { captured = this; }
  async presentMedium() { captured = this; }
  async presentLarge() { captured = this; }
}
let requests = 0;
class Request {
  constructor(url) { this.url = url; this.headers = {}; this.response = {}; }
  async loadString() {
    requests++;
    const a = ["-sS", "-m", "20", "-w", "\n%{http_code}", this.url];
    for (const k in this.headers) a.push("-H", `${k}: ${this.headers[k]}`);
    const out = execFileSync("curl", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const i = out.lastIndexOf("\n");
    this.response = { statusCode: Number(out.slice(i + 1)) };
    return out.slice(0, i);
  }
  async loadJSON() { return JSON.parse(await this.loadString()); }
}
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-widget-cache-"));
const FileManager = {
  local: () => ({
    cacheDirectory: () => cacheDir,
    documentsDirectory: () => cacheDir,
    joinPath: (a, b) => path.join(a, b),
    fileExists: (p) => fs.existsSync(p),
    readString: (p) => fs.readFileSync(p, "utf8"),
    writeString: (p, s) => fs.writeFileSync(p, s),
  }),
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function run(family, { offline = false } = {}) {
  captured = null;
  const config = { runsInWidget: true, widgetFamily: family };
  const Script = { setWidget: (w) => { captured = w; }, complete() {} };
  const Req = offline
    ? class { constructor() { this.headers = {}; } async loadJSON() { throw new Error("オフライン"); } async loadString() { throw new Error("オフライン"); } }
    : Request;
  // Scriptable ではこれらが最初から「どこからでも使える名前」になっている（入口→本体の2段でも届くように同じ形にする）
  Object.assign(globalThis, { Color, Font, Size, ListWidget, Request: Req, FileManager, config, Script, args: { widgetParameter: null } });
  await new AsyncFunction(code)();
  if (!captured) throw new Error(`${family}: ウィジェットが設定されなかった`);
  return captured;
}

// ---- HTML に描く ----
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const col = (c, mode) => (c ? c[mode] : null);
function html(node, mode, parentDir) {
  if (node.kind === "spacer") {
    const prop = parentDir === "row" ? "width" : "height";
    return node.len == null ? `<div style="flex:1 1 0"></div>` : `<div style="flex:0 0 auto;${prop}:${node.len}px"></div>`;
  }
  if (node.kind === "text") {
    const f = node.font || { size: 12, weight: 400 };
    const clamp = node.lineLimit === 1
      ? "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
      : node.lineLimit ? `display:-webkit-box;-webkit-line-clamp:${node.lineLimit};-webkit-box-orient:vertical;overflow:hidden;` : "";
    return `<div style="font-size:${f.size}px;font-weight:${f.weight};line-height:1.25;color:${col(node.textColor, mode) || "inherit"};min-width:0;max-width:100%;${clamp}">${esc(node.text)}</div>`;
  }
  const s = [`display:flex`, `flex-direction:${node.dir}`, `min-width:0`, `box-sizing:border-box`];
  s.push(`align-items:${node.align === "center" ? "center" : node.align === "end" ? "flex-end" : "flex-start"}`);
  if (node.spacing) s.push(`gap:${node.spacing}px`);
  if (node.padding) s.push(`padding:${node.padding.map((p) => p + "px").join(" ")}`);
  if (node.backgroundColor) s.push(`background:${col(node.backgroundColor, mode)}`);
  if (node.cornerRadius) s.push(`border-radius:${node.cornerRadius}px`);
  if (node.size) {
    if (node.size.width) s.push(`width:${node.size.width}px`, `flex:0 0 auto`);
    if (node.size.height) s.push(`height:${node.size.height}px`);
  }
  // 中に伸びる余白を持つ箱は、親の中でいっぱいに広がる
  if (node.children.some((c) => c.kind === "spacer" && c.len == null) && !(node.size && node.size.width)) s.push("align-self:stretch", "flex:1 1 auto");
  const attr = node.url ? ` data-url="${esc(node.url)}"` : "";
  return `<div style="${s.join(";")}"${attr}>${node.children.map((c) => html(c, mode, node.dir)).join("")}</div>`;
}

const SIZES = { small: [158, 158], medium: [338, 158], large: [338, 354] };
function frame(widget, family, mode) {
  const [w, h] = SIZES[family];
  return `<div class="w" data-family="${family}" style="width:${w}px;height:${h}px">${html(widget, mode)}</div>`;
}
function texts(node, out = []) {
  if (node.kind === "text") out.push(node.text);
  (node.children || []).forEach((c) => texts(c, out));
  return out;
}

const widgets = {};
for (const f of ["medium", "small", "large"]) widgets[f] = await run(f);
const online = requests;
const lock = await run("accessoryRectangular");
const offline = await run("medium", { offline: true });

// 控えを古くして、通信できないときに「前回」の値が出るか
const cacheFile = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".json")).map((f) => path.join(cacheDir, f))[0];
const old = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
old.fetchedAt = new Date(Date.now() - 3 * 3600e3).toISOString();
fs.writeFileSync(cacheFile, JSON.stringify(old));
const stale = await run("medium", { offline: true });
fs.rmSync(cacheFile);
const empty = await run("medium", { offline: true });

const page = (mode) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;font-family:-apple-system,"Hiragino Sans","Noto Sans CJK JP",sans-serif;background:${mode === "dark" ? "#0e0e10" : "#c9d3dc"};display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;width:760px}
.w{border-radius:22px;overflow:hidden;display:flex;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.w>div{width:100%;height:100%}
.c{display:flex;flex-direction:column;gap:20px}
</style><div class="c">${frame(widgets.medium, "medium", mode)}${frame(widgets.small, "small", mode)}${frame(stale, "medium", mode)}${frame(empty, "medium", mode)}</div>${frame(widgets.large, "large", mode)}`;
fs.writeFileSync(path.join(outDir, "light.html"), page("light"));
fs.writeFileSync(path.join(outDir, "dark.html"), page("dark"));

console.log("通信回数（3サイズ合計）:", online);
console.log("medium:", texts(widgets.medium).join(" | "));
console.log("lock  :", texts(lock).join(" | "));
console.log("控えが新しいとき:", texts(offline).slice(0, 3).join(" | "));
console.log("通信できず控えが古いとき:", texts(stale).slice(0, 3).join(" | "));
console.log("通信できず控えも無いとき:", texts(empty).join(" | "));
console.log("出力先:", outDir);
