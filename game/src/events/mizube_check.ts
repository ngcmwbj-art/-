// 水辺の 図鑑（02 #81）の 文の 検査：1ページ 3行・1行 336px。第1章（ch1）は「平和」「まだ」「17」を
// 使わない、第2章は 時刻の 数字・「12人」「1日2本」「おまけの1つ」「具足様」を 入れない。

import { measure } from '../engine/font';

/** Every page: at most 3 lines, each at most 336 px; no 「平和」「まだ」「17」 in chapter 1 (10 2.x). */
export function mizubeTextCheck(texts: Record<string, unknown>, ch1 = true): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@') && !v.startsWith('?')) return;
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('>')) continue;
        if (t.startsWith('@') || t === '/' || t.startsWith('!') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        if (t.startsWith('?')) {
          flush();
          for (const o of t.slice(1).split('|')) if (measure(o.trim()) > 300) bad.push(`${name}: choice ${o}`);
          continue;
        }
        const plain = raw.replace(/\s+$/, '').replace(/\{[^}]*\}/g, '');
        const w = measure(plain);
        if (w > 336) bad.push(`${name}: ${w}px: ${plain}`);
        if (ch1) {
          for (const word of ['平和', '17']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        } else {
          for (const word of ['12人', '1日2本', 'おまけの1つ', '具足様']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/\d+[:：]\d+|\d+時|\d+分/.test(plain)) bad.push(`${name}: 時刻の 数字: ${plain}`);
        }
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('mizube', texts);
  return { pages, bad };
}

