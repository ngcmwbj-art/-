// むずかしい 言葉を ひらがなに（改善会議 2026-10-28 の 4）。せってい「ひらがな：なし／あり」（ui/settings.ts kana）。
//
// 人・物の 名前などの むずかしい 言葉の 短い 表（KANA_WORDS）を、会話の 文を 表示する 1か所
// （ui/dialog.ts の buildRequest）で ひらがなに 置きかえる。文の 元（data/text ほか）は 変えない。
// 名札（SayOpts.name）は 置きかえない（表示名は そのまま）。{…} の 中（色・間・効果の 印）も さわらない。
//
// ひらがなが 長く 続くと、行を 切る 所（ui/window.ts phraseWrap の「漢字の あとの 助詞」）が 無くなる。
// そこで 1行（段落）ずつ、置きかえた 文を 336px と iPad 横の せまい 窓（NARROW_W、全角の 間でも 切る）で
// phraseWrapInfo に 通し、行が ふえる（336px）・字の 間で 切る 所（forced）が ふえる・はみ出す ときは、その 行だけ
// もとの 漢字の まま に する。＝ 置きかえで はみ出しは 出ない。
// QA：__game.cmd.kanaText()（data/ の 文 ぜんぶを 置きかえて 点検。wrapCheck からも 呼ぶ）、kanaTry('文')。

import { measure } from '../engine/font';
import { registerDebug } from '../debug';
import { phraseWrapInfo } from './window';
import { settings } from './settings';

/** 言葉 → よみ（長い 言葉から 先に 置きかえる：堆肥舎 → 堆肥）。20語ほど。 */
export const KANA_WORDS: [string, string][] = [
  ['具足', 'ぐそく'],
  ['出荷', 'しゅっか'],
  ['朱肉', 'しゅにく'],
  ['堆肥舎', 'たいひしゃ'],
  ['堆肥', 'たいひ'],
  ['懸垂', 'けんすい'],
  ['符丁', 'ふちょう'],
  ['触角', 'しょっかく'],
  ['脇芽', 'わきめ'],
  ['提灯', 'ちょうちん'],
  ['親戚', 'しんせき'],
  ['回覧板', 'かいらんばん'],
  ['師匠', 'ししょう'],
  ['伝票', 'でんぴょう'],
  ['観望会', 'かんぼうかい'],
  ['防波堤', 'ぼうはてい'],
  ['番付', 'ばんづけ'],
  ['帳面', 'ちょうめん'],
  ['換気扇', 'かんきせん'],
  ['羽釜', 'はがま'],
  ['漬物', 'つけもの'],
];

/** 会話の 文の はば（ui/dialog.ts TEXT_W）と、iPad 横の いちばん せまい 窓の 文の はば（めやす）。 */
const TEXT_W = 336;
const NARROW_W = 232;

const ORDER = [...KANA_WORDS].sort((a, b) => b[0].length - a[0].length);
const RE = new RegExp(ORDER.map(([w]) => w).join('|'), 'g');
const HAS = new RegExp(ORDER.map(([w]) => w).join('|'));
const READ = new Map(KANA_WORDS);

/** {…} の 外だけ 置きかえる。 */
function swap(s: string): string {
  return s
    .split(/(\{[^}]*\})/)
    .map((part) => (part.startsWith('{') ? part : part.replace(RE, (w) => READ.get(w) ?? w)))
    .join('');
}

const plain = (s: string): string => s.replace(/\{[^}]*\}/g, '');

interface Fit {
  lines: number;
  forced: number;
  wide: number;
}
function fitOf(s: string, w: number, zenkaku: boolean): Fit {
  const { lines, forced } = phraseWrapInfo(plain(s), w, { zenkaku });
  const wide = lines.filter((l) => measure(l) > w + (/[、。]$/.test(l) ? 8 : /[！？」』）]$/.test(l) ? 16 : 0)).length;
  return { lines: lines.length, forced, wide };
}
const worse = (a: Fit, b: Fit): boolean => b.lines > a.lines || b.forced > a.forced || b.wide > a.wide;

/** 1行（段落）：置きかえて 切り方が わるく ならなければ 置きかえた 行、なれば もとの 行。 */
function kanaLine(line: string): string {
  const out = swap(line);
  if (out === line) return line;
  if (worse(fitOf(line, TEXT_W, false), fitOf(out, TEXT_W, false))) return line;
  // （せまい 窓は 行が ふえて よい：ページの 行が 3より 多く なる 形。字の 間で 切る・はみ出す のは だめ）
  const a = fitOf(line, NARROW_W, true);
  const b = fitOf(out, NARROW_W, true);
  if (b.forced > a.forced || b.wide > a.wide) return line;
  return out;
}

/** 会話の 文（1回の 表示ぶん）を ひらがなに（せってい「ひらがな：あり」の ときだけ）。 */
export function kanaText(text: string, force = false): string {
  if (!force && !settings.kana) return text;
  if (!HAS.test(text)) return text;
  return text.split('\n').map(kanaLine).join('\n');
}

// ---------------------------------------------------------------- QA

/** 1つの 文を 置きかえて 切り方を 見る。 */
registerDebug('kanaTry', (text = '朱肉の 箱を、堆肥舎の 前に。') => {
  const out = kanaText(text, true);
  return { out, wide: phraseWrapInfo(plain(out), TEXT_W), narrow: phraseWrapInfo(plain(out), NARROW_W, { zenkaku: true }) };
});

if (import.meta.env.DEV) {
  // data/ の 文 ぜんぶ（ページの 形の 物：@ で 始まる・改行を ふくむ）を 置きかえて、ページごとに
  // 3行 × 336px に おさまるか・字の 間で 切って いないか（iPad 横の せまい 窓も）を 見る。
  const mods = import.meta.glob('/src/data/**/*.ts');
  let cache: { pages: number; swapped: number; kept: number; bad: string[] } | null = null;
  const run = async () => {
    const texts: [string, string][] = [];
    const walk = (name: string, v: unknown, depth = 0) => {
      if (depth > 7) return;
      if (typeof v === 'string') {
        if (v.includes('\n') || v.startsWith('@')) texts.push([name, v]);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(`${name}[${i}]`, x, depth + 1));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x, depth + 1);
    };
    for (const [path, load] of Object.entries(mods)) {
      const m = (await load()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(m)) walk(`${path.replace('/src/data/', '')}:${k}`, v);
    }
    const bad: string[] = [];
    let pages = 0;
    let swapped = 0;
    for (const [name, src] of texts) {
      // 1ページ = @名札 や 空行・選択肢・命令で 区切られた 行の 集まり（events/ch2/debug.ts pagesOf と 同じ 見方）
      let cur: string[] = [];
      const flush = () => {
        if (!cur.length) return;
        pages++;
        const before = cur.join('\n');
        const after = kanaText(before, true);
        if (after !== before) swapped++;
        const a = fitOf(after, TEXT_W, false);
        const o = fitOf(before, TEXT_W, false);
        if (a.lines > Math.max(3, o.lines) || a.forced > o.forced || a.wide > o.wide) bad.push(`${name}: ${plain(after).replace(/\n/g, '／')}`);
        const an = fitOf(after, NARROW_W, true);
        const on = fitOf(before, NARROW_W, true);
        if (an.forced > on.forced || an.wide > on.wide) bad.push(`${name}（iPad）: ${plain(after).replace(/\n/g, '／')}`);
        cur = [];
      };
      for (const raw of src.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || t.startsWith('>') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        cur.push(raw.replace(/\s+$/, ''));
      }
      flush();
    }
    // （もとの 漢字に もどした 行の 数：kept）
    let k = 0;
    for (const [, src] of texts) for (const l of src.split('\n')) if (swap(l) !== l && kanaLine(l) === l) k++;
    cache = { pages, swapped, kept: k, bad };
    return cache;
  };
  registerDebug('kanaCheck', () => run());
  // wrapCheck から（同期）：はじめの 1回は 読みこみ中。もう一度 呼ぶと 結果
  registerDebug('kanaText', () => {
    if (!cache) {
      void run();
      return { pages: 0, bad: ['kanaText: 読みこみ中（もう一度 呼ぶ）'] };
    }
    return { pages: cache.pages, bad: cache.bad };
  });
  // 起動の すこし あとに 1回（wrapCheck が 同期で 読めるように）
  setTimeout(() => void run(), 4000);
}
