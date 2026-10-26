#!/usr/bin/env node
// 文の点検（読むだけ。改善会議 2026-10-26 の4）：src/data/text ほかを読んで、数えて一覧にする。
// ファイルは何も書きかえない。開発サーバーもブラウザもいらない。
//
//   node tools/textlint.mjs                 4つの点検をぜんぶ（標準出力に一覧）
//   node tools/textlint.mjs --only a,b      a〜d のうち選んだ物だけ
//   node tools/textlint.mjs --all           (a) の言い出しの重なりを、同じファイルの中の物も出す
//   node tools/textlint.mjs --pg            (a) の言い出しの重なりに、クリア後の話（pg_*）も入れる
//   node tools/textlint.mjs --json out.json 一覧を JSON でも書き出す（書くのはその1つだけ）
//   node tools/textlint.mjs --root <dir>    よその checkout（git archive で出した古い版など）を見る
//
// (a) 天丼・決めゼリフのくり返し
//     ・docs/design の天丼の割り当て表（50_ch2_story 2.5 → 第2章の文、60_ch3_story 2.6 → 第3章の文）の
//       「…」ごとに、その章の文で出てくる台本の数を数え、表の回数をこえる物に ★
//     ・同じ人（@npc_…）の同じ言い出し（話の最初の1文、6字以上）が、別の台本に出てくる物
//       （例：マサルの「……牛は、しゃべらん。」が2つの寄り道に）。ふつうは別のファイルどうしだけ
//       （--all で同じファイルの中も）。どちらか1つしか出ない分かれ（NR_NERUKA と NR_NERUKA_SOLO の
//       ように、名前が「ほかの名前＋_…」の物）は1つに数える
// (b) 1ページに朱（{c=…}）が2語以上（sys の文＝物の名前の自動の朱は数えない。accentCheck と同じ決まり）
// (c) 名前のない地図：registerMap の地図のうち、場所の名前の札（ui/hud.ts placeNameFor の表
//     MAP_PLACE・HOSHI_PLACE・ROOM2_PLACE、地図の name、町・星見台・海ぞいの町の区分け）が出ない物
// (d) 負けたあとに「戦う前から やりなおす」が出ない戦闘：startBattle を canLose: true で直接よぶ所
//     （eventBattle・storyBattle・c3Battle を通さない＝ui/gameover.ts の runGameOver が出ない）。
//     canLose の無い startBattle（ふつうの戦闘とシンボル）は戦闘の全滅の受け口で出るので数えない
//
// 文の読み方は簡単な読み取り（TypeScript を動かさない）：ファイルの中の文字列のうち、改行を
// ふくむ物か @ で始まる物を台本とみなす。`${…}` はそのまま字として残る（数えに影響しない）。
// 正しい数は、ブラウザの __game.cmd.accentCheck()・textcheck2() が正。これは書く前の確かめ用。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const ROOT = path.resolve(opt('--root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const ONLY = new Set(opt('--only', 'a,b,c,d').split(','));
const ALL = args.includes('--all');
const PG = args.includes('--pg');
const JSON_OUT = opt('--json', '');

const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const lsTs = (dir) =>
  exists(dir)
    ? fs
        .readdirSync(path.join(ROOT, dir))
        .filter((f) => f.endsWith('.ts'))
        .sort()
        .map((f) => `${dir}/${f}`)
    : [];

// ------------------------------------------------------------------ reading the strings

/**
 * The string literals of a TS file, each with the name it hangs on: `EXPORT` for
 * `export const EXPORT = …`, `EXPORT.key` for a key inside it. Comments are skipped.
 */
function literals(src) {
  const out = [];
  let exp = '';
  let key = '';
  /** the keys of the objects we are inside (an array or a key-less object: '') */
  const stack = [];
  const nameNow = () => [exp, ...stack.filter(Boolean), key].filter(Boolean).join('.');
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      i = e < 0 ? n : e + 2;
      continue;
    }
    if (c === '`' || c === "'" || c === '"') {
      const q = c;
      let s = '';
      let j = i + 1;
      while (j < n && src[j] !== q) {
        if (src[j] === '\\') {
          const e = src[j + 1];
          s += e === 'n' ? '\n' : e === 't' ? '\t' : e;
          j += 2;
          continue;
        }
        if (q === '`' && src[j] === '$' && src[j + 1] === '{') {
          // ${ … }: kept as it is written (a name, a number)
          let depth = 0;
          const k0 = j;
          for (; j < n; j++) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}' && --depth === 0) break;
          }
          s += src.slice(k0, j + 1);
          j++;
          continue;
        }
        s += src[j];
        j++;
      }
      const line = src.slice(0, i).split('\n').length;
      i = j + 1;
      // a key written as a string ('npc_x': …)
      if (q !== '`' && /^\s*:/.test(src.slice(i, i + 20))) {
        key = s;
        i = src.indexOf(':', i) + 1;
        continue;
      }
      out.push({ name: nameNow(), exp, s, line });
      continue;
    }
    if (c === '{' || c === '[') {
      stack.push(key);
      key = '';
      i++;
      continue;
    }
    if (c === '}' || c === ']') {
      stack.pop();
      key = '';
      i++;
      continue;
    }
    if (c === ',' || c === ';') {
      key = '';
      i++;
      continue;
    }
    const m = src.slice(i, i + 80).match(/^export\s+(?:const|let|function\*?|function)\s+([A-Za-z_$][\w$]*)/);
    if (m && (i === 0 || /\s|;|\}/.test(src[i - 1]))) {
      exp = m[1];
      key = '';
      stack.length = 0;
      i += m[0].length;
      continue;
    }
    const k = src.slice(i, i + 60).match(/^([A-Za-z_$][\w$]*)\s*:(?!:)/);
    if (k && (i === 0 || /[\s{,(]/.test(src[i - 1]))) {
      key = k[1];
      i += k[0].length;
      continue;
    }
    i++;
  }
  return out;
}

/** The pages of a script: [{ speaker, lines }] (as ch2/debug.ts pagesOf, and 3 lines a page). */
function pagesOf(src) {
  const out = [];
  let speaker = '';
  let cur = [];
  const flush = () => {
    for (let k = 0; k < cur.length; k += 3) out.push({ speaker, lines: cur.slice(k, k + 3), first: k === 0 });
    cur = [];
  };
  let block = 0;
  for (const raw of src.split('\n')) {
    const t = raw.trim();
    if (!t || t.startsWith('>') || t.startsWith('!') || t.startsWith('?') || /^\[.*\]$/.test(t)) {
      if (t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) flush();
      continue;
    }
    if (t.startsWith('@')) {
      flush();
      speaker = t.slice(1).split(/\s/)[0];
      block++;
      continue;
    }
    if (t === '/') {
      flush();
      continue;
    }
    cur.push(raw.replace(/\s+$/, ''));
  }
  flush();
  return out;
}

/** The speeches of a script: [{ speaker, text }] — a speaker's run of lines up to the next @. */
function speechesOf(src) {
  const out = [];
  let speaker = '';
  let cur = [];
  const flush = () => {
    if (cur.length) out.push({ speaker, text: cur.join('\n') });
    cur = [];
  };
  for (const raw of src.split('\n')) {
    const t = raw.trim();
    if (!t || t === '/' || t.startsWith('>') || t.startsWith('!') || t.startsWith('?') || /^\[.*\]$/.test(t)) {
      if (t.startsWith('?') || /^\[.*\]$/.test(t)) flush();
      continue;
    }
    if (t.startsWith('@')) {
      flush();
      speaker = t.slice(1).split(/\s/)[0];
      continue;
    }
    cur.push(t);
  }
  flush();
  return out;
}

/** The words as they read: no markup, no spaces or line breaks. */
const plain = (s) =>
  s
    .replace(/\{\/?[a-z]+(=[^}]*)?\}/g, '')
    .replace(/\{name:[^}]*\}/g, '〇')
    .replace(/[\s　]+/g, '');
/** For matching a 天丼 phrase: also without the dots and the marks at either end. */
const core = (s) => plain(s).replace(/^[…・.〜]+/, '').replace(/[。！？!?、…]+$/g, '');

const chapterOf = (file) => {
  const b = path.basename(file);
  if (b.startsWith('c3_')) return 3;
  if (b.startsWith('hoshi_') || b === 'mizube_ch2.ts') return 2;
  if (b.startsWith('pg_') || b === 'postgame.ts') return 'pg';
  return 1;
};

// every script of src/data/text (and the talk of the rooms written next to the maps)
const TEXT_FILES = [...lsTs('src/data/text'), ...lsTs('src/data/maps').filter((f) => /_text|_names/.test(f))];
const scripts = [];
for (const file of TEXT_FILES) {
  for (const l of literals(rd(file))) {
    if (!(l.s.includes('\n') || l.s.startsWith('@'))) continue;
    scripts.push({ file, name: l.name || `(line ${l.line})`, exp: l.exp, line: l.line, s: l.s, ch: chapterOf(file) });
  }
}

/** Who a speaker is (the name tag): world/msg.ts SPEAKERS and C3_NAMES. */
const NAMES = {};
if (exists('src/world/msg.ts')) for (const m of rd('src/world/msg.ts').matchAll(/^\s*(\w+):\s*\{\s*name:\s*'([^']*)'/gm)) NAMES[m[1]] = m[2];
if (exists('src/data/text/c3_names.ts')) for (const m of rd('src/data/text/c3_names.ts').matchAll(/^\s*(npc_\w+):\s*'([^']*)'/gm)) NAMES[m[1]] ??= m[2];
const who = (id) => (NAMES[id] ? `${NAMES[id]}（${id}）` : id || '（名札なし）');

/**
 * A script's group: the variants shown instead of one another (NR_NERUKA / NR_NERUKA_SOLO,
 * talk keys s1_1 / s1_2 are not variants — they are seen one after the other) count once.
 */
const exps = new Set(scripts.map((s) => s.exp));
/** the same script written twice (a room's talk next to its map and in npcs.ts): one */
const firstCopy = new Map();
for (const sc of scripts) if (!firstCopy.has(sc.s)) firstCopy.set(sc.s, sc);
function groupOf(sc0) {
  const sc = firstCopy.get(sc0.s) ?? sc0;
  let g = sc.exp;
  for (let k = g.lastIndexOf('_'); k > 0; k = g.lastIndexOf('_', k - 1)) if (exps.has(g.slice(0, k))) g = g.slice(0, k);
  return `${sc.file}:${g}${sc.name.includes('.') ? sc.name.slice(sc.name.indexOf('.')) : ''}`;
}

/**
 * The same talk written in two tables (npcs.ts NPC.npc_x.s2_2 and maps/town_text.ts
 * TALK.npc_x.s2_2; events.ts MALL_ENTER_FLIP and maps/interior_text.ts EVT_MALL_ENTER): one.
 */
function canon(sc) {
  const g = groupOf(sc);
  const name = g.slice(g.indexOf(':') + 1);
  const segs = name.split('.');
  const tail = segs.length >= 3 ? segs.slice(-2).join('.') : segs.length === 2 && /^npc_|^obj_/.test(segs[1]) ? segs[1] : null;
  if (tail) return tail;
  return name.replace(/^EVT_/, '').replace(/_FLIP$/, '');
}

const report = {};
const say = (...a) => console.log(...a);

// ------------------------------------------------------------------ (a) 天丼と決めゼリフ

if (ONLY.has('a')) {
  // the tables
  const tables = [
    { doc: 'docs/design/50_ch2_story.md', head: '### 2.5 天丼', ch: 2 },
    { doc: 'docs/design/60_ch3_story.md', head: '### 2.6 天丼', ch: 3 },
  ];
  const rows = [];
  for (const t of tables) {
    if (!exists(t.doc)) continue;
    const md = rd(t.doc);
    const at = md.indexOf(t.head);
    if (at < 0) continue;
    const body = md.slice(at).split('\n').slice(1);
    for (const line of body) {
      if (line.startsWith('#') || line.startsWith('---')) break;
      if (!line.startsWith('|') || /^\|\s*(ネタ|天丼|---)/.test(line)) continue;
      const cols = line.split('|').slice(1, -1).map((c) => c.trim());
      const phrases = [...cols[0].matchAll(/「([^」]+)」/g)].map((m) => m[1]);
      if (!phrases.length) continue;
      // the allowed count: the count column (60), or the first 「N回」 of the places (50)
      // (50: 「…。3回。ほかに 学級日誌の 字で 1回」 → 4。「1回目と 3回目」「1回だけ 返す」は 数えない)
      let max = null;
      if (t.ch === 3) max = /^\d+$/.test(cols[1]) ? Number(cols[1]) : null;
      else {
        const main = cols[1].match(/(?:^|[。）]|文では)\s*(\d+)回(?:まで)?(?=。|$|\s|（)/);
        if (main) {
          max = Number(main[1]);
          for (const e of cols[1].matchAll(/(?:ほかに|例外として)([^。]*?)(\d+)回(?!目)/g)) if (!/第1章/.test(e[1])) max += Number(e[2]);
        }
      }
      for (const p of phrases) rows.push({ ch: t.ch, doc: path.basename(t.doc), phrase: p, max, row: cols[0].replace(/\*\*/g, '').slice(0, 40) });
    }
  }
  const tableOut = [];
  for (const r of rows) {
    // (、・…・。！？ は 書き方が ゆれるので 外して くらべる：「さすが 親分。」＝「……さすが、親分。」)
    const loose = (x) => plain(x).replace(/[、…・.。！？!?〜♪]/g, '');
    const key = loose(r.phrase);
    if (key.length < 3) continue;
    const hits = new Map();
    for (const sc of scripts) {
      if (sc.ch !== r.ch) continue;
      const n = loose(sc.s).split(key).length - 1;
      if (n) hits.set(groupOf(sc), (hits.get(groupOf(sc)) ?? 0) + n);
    }
    const count = hits.size;
    const over = r.max !== null && count > r.max;
    tableOut.push({ ch: r.ch, phrase: r.phrase, max: r.max, count, over, where: [...hits.keys()].map((k) => k.replace('src/data/text/', '')) });
  }
  report.tendon = tableOut;
  say('== (a) 天丼の割り当て表と、文で出てくる台本の数（章の文だけ。分かれは1つ）');
  for (const r of tableOut) {
    const mark = r.over ? '★こえる' : r.count === 0 ? '（文に見つからない：言い方を変えたか、地の文・絵の字）' : '';
    say(`  第${r.ch}章 「${r.phrase}」 表 ${r.max ?? '―'} / 文 ${r.count} ${mark}`);
    if (r.over) for (const w of r.where) say(`      ${w}`);
  }

  // the same opening of the same speaker in two scripts
  const open = new Map();
  for (const sc of scripts) {
    // (クリア後の 話は、同じ人の 前の 話を わざと なぞる 物が 多い：--pg で 入れる)
    if (sc.ch === 'pg' && !PG) continue;
    for (const sp of speechesOf(sc.s)) {
      if (!sp.speaker || sp.speaker === 'narr' || sp.speaker === 'sys' || sp.speaker === 'system') continue;
      const first = plain(sp.text).match(/^.*?[。！？!?]/)?.[0] ?? plain(sp.text);
      if (core(first).length < 6 || first.includes('${')) continue;
      const k = `${sp.speaker}|${core(first)}`;
      if (!open.has(k)) open.set(k, { speaker: sp.speaker, first, groups: new Map() });
      open.get(k).groups.set(canon(sc), sc);
    }
  }
  const dup = [];
  for (const v of open.values()) {
    if (v.groups.size < 2) continue;
    const files = new Set([...v.groups.values()].map((s) => s.file));
    if (files.size < 2 && !ALL) continue;
    dup.push({ speaker: v.speaker, who: who(v.speaker), first: v.first, n: v.groups.size, files: files.size, where: [...v.groups.values()].map((s) => `${s.file.replace('src/data/text/', '')}:${s.name} (${s.line})`) });
  }
  dup.sort((a, b) => b.files - a.files || b.n - a.n || a.speaker.localeCompare(b.speaker));
  report.openings = dup;
  say(`\n== (a) 同じ人の 同じ言い出し（話の最初の1文、6字以上）が ${ALL ? '別の台本' : '別のファイルの台本'}に：${dup.length}件`);
  for (const d of dup) {
    say(`  ${d.who}「${d.first}」 ×${d.n}`);
    for (const w of d.where) say(`      ${w}`);
  }
}

// ------------------------------------------------------------------ (b) 朱が2語以上のページ

if (ONLY.has('b')) {
  const bad = [];
  const seen = new Set();
  let colored = 0;
  let pages = 0;
  const files = [...TEXT_FILES, ...lsTs('src/data/battle')];
  for (const file of files) {
    for (const l of literals(rd(file))) {
      if (!l.s.includes('{c=')) continue;
      for (const pg of pagesOf(l.s.includes('\n') || l.s.startsWith('@') ? l.s : `@?\n${l.s}`)) {
        const text = pg.lines.join('／');
        const k = `${pg.speaker}|${text}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pages++;
        const n = (text.match(/\{c=/g) ?? []).length;
        if (!n) continue;
        colored++;
        if (n >= 2 && pg.speaker !== 'sys') bad.push({ where: `${file.replace('src/data/', '')}:${l.name || l.line} (${l.line})`, speaker: pg.speaker, n, text: plain(text.replace(/／/g, ' ／ ')) });
      }
    }
  }
  report.accent = { pages, colored, bad };
  say(`\n== (b) 1ページに 朱が 2語以上：${bad.length}件（朱のある ページ ${colored}）`);
  for (const b of bad) say(`  ${b.where} ${who(b.speaker)} 朱${b.n}：${b.text}`);
}

// ------------------------------------------------------------------ (c) 名前のない地図

if (ONLY.has('c')) {
  const hud = exists('src/ui/hud.ts') ? rd('src/ui/hud.ts') : '';
  const named = new Set();
  const tableOf = (src, name) => {
    const at = src.indexOf(`const ${name}`);
    if (at < 0) return;
    const body = src.slice(at, src.indexOf('\n};', at));
    for (const m of body.matchAll(/^\s*(map_\w+)\s*:/gm)) named.add(m[1]);
  };
  tableOf(hud, 'MAP_PLACE');
  tableOf(hud, 'HOSHI_PLACE');
  if (exists('src/data/maps/hoshi_rooms2_names.ts')) tableOf(rd('src/data/maps/hoshi_rooms2_names.ts'), 'ROOM2_PLACE');
  // the towns with areas (placeNameFor's own cases)
  for (const m of hud.matchAll(/mapId === '(map_\w+)'\) return/g)) named.add(m[1]);
  const maps = [];
  for (const file of lsTs('src/data/maps')) {
    const src = rd(file);
    const consts = Object.fromEntries([...src.matchAll(/const\s+(\w+)\s*=\s*'(map_\w+)'/g)].map((m) => [m[1], m[2]]));
    /** the object literal that starts at `at` ({ … }), by its braces */
    const objAt = (at) => {
      let d = 0;
      for (let j = at; j < src.length; j++) {
        if (src[j] === '{') d++;
        else if (src[j] === '}' && --d === 0) return src.slice(at + 1, j);
      }
      return '';
    };
    for (const m of src.matchAll(/registerMap\(\s*(\{|[A-Za-z_$][\w$]*\s*\))/g)) {
      let body = '';
      if (m[1] === '{') body = objAt(m.index + m[0].length - 1);
      else {
        const v = m[1].replace(/[\s)]/g, '');
        const d = src.match(new RegExp(`const\\s+${v}\\b[^=]*=\\s*\\{`));
        if (!d) {
          // a loop over a table (hoshi_rooms2: the rooms' names are ROOM2_PLACE)
          maps.push({ id: `(${file.replace('src/data/maps/', '')} の ${v})`, file: file.replace('src/data/maps/', ''), name: null, table: true, loop: true });
          continue;
        }
        body = objAt(d.index + d[0].length - 1);
      }
      const idm = body.match(/^\s*id:\s*(?:'(map_\w+)'|(\w+))/m);
      const id = idm ? idm[1] ?? consts[idm[2]] ?? idm[2] : '?';
      // a name written as a word, or worked out (ROOM2_PLACE[r.map] ?? r.name: a name per room)
      const nmRaw = body.match(/^\s*name:\s*(.+?),?\s*$/m)?.[1] ?? null;
      const nm = nmRaw === null ? null : /^'[^']*'$/.test(nmRaw) ? nmRaw.slice(1, -1) || null : `（${nmRaw}）`;
      maps.push({ id, file: file.replace('src/data/maps/', ''), name: nm, table: named.has(id) });
    }
  }
  const nameless = maps.filter((m) => !m.table && !m.name);
  report.places = { maps: maps.length, nameless };
  say(`\n== (c) 名前のない地図（場所の名前の札が出ない）：${nameless.length}件／地図 ${maps.length}（表で名前を出す 部屋の まとめ ${maps.filter((m) => m.loop).length}）`);
  for (const m of nameless) say(`  ${m.id}  (${m.file})`);
}

// ------------------------------------------------------------------ (d) やりなおしが出ない戦闘

if (ONLY.has('d')) {
  const files = [];
  const walk = (d) => {
    if (!exists(d)) return;
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk('src');
  const rows = [];
  // the wrappers that put up the game-over page themselves (they call startBattle with canLose)
  const WRAPPERS = /function\*\s+(eventBattle|storyBattle)\b/;
  for (const file of files) {
    if (file.startsWith('src/battle/')) continue;
    const src = rd(file);
    for (const m of src.matchAll(/startBattle\(\s*(\{[^;]*?\})\s*\)/g)) {
      const opts = m[1];
      if (!/canLose:\s*true/.test(opts)) continue;
      // inside a wrapper that shows the page?
      const before = src.slice(0, m.index);
      const fnAt = before.lastIndexOf('function*');
      const fnHead = before.slice(fnAt, fnAt + 60);
      if (WRAPPERS.test(fnHead)) continue;
      const line = before.split('\n').length;
      const enemies = opts.match(/enemies:\s*\[([^\]]*)\]/)?.[1]?.replace(/['\s]/g, '') ?? '?';
      // what the script does with a loss: the next lines
      const after = src.slice(m.index, m.index + 400).split('\n').slice(0, 6).join(' ').replace(/\s+/g, ' ');
      const usesLose = /runGameOver/.test(after);
      rows.push({ where: `${file.replace('src/', '')}:${line}`, enemies, gameover: usesLose, next: after.slice(0, 160) });
    }
  }
  // わけがあって 出さない 物（数えない。出すだけ）
  const KNOWN = [
    [/^data\/maps\/lv_fallback\.ts/, '控えの台本（src/events/mall.ts の evt_boss_intro が 同じ id で 置きかえる）'],
    [/boss_tsugao_1/, 'ツガオ初戦は 4ラウンドで かならず 負けて 先へ（61 12.4。全滅も ゲームオーバーも ない）'],
  ];
  for (const r of rows) r.known = KNOWN.find(([re]) => re.test(r.where) || re.test(r.enemies))?.[1] ?? null;
  const bad = rows.filter((r) => !r.gameover && !r.known);
  report.retry = { bad, known: rows.filter((r) => r.known) };
  say(`\n== (d) 負けたあと「戦う前から やりなおす」が 出ない 戦闘（canLose で 直接 startBattle）：${bad.length}件`);
  for (const r of bad) say(`  ${r.where}  ${r.enemies}\n      ${r.next}`);
  for (const r of rows.filter((x) => x.known)) say(`  （わけあり・数えない）${r.where}  ${r.enemies}：${r.known}`);
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
