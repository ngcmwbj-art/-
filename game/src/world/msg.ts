// Runner for the "msg" block format of 10_narrative.md 1.4, so NPC and
// examine texts can be pasted from the design book almost verbatim:
//
//   @npc_mother            speaker (npc id → name tag + voice), @narr, @sys, @flip, @名札:voice
//   text line              shown as written (one line = one display line)
//   /                      page break
//   ? べつ | いっしょ        choice (result drives the [label] branches below)
//   [べつ] ... [-]         branch; [-] (or a new speaker after all branches) closes it
//   ?? flag_x / ?! flag_x   stop here unless flag_x is set / unset
//   !command args          actions: flag, flag+, heal, fullheal, mp, item, money, se, save, script,
//                          emote, gacha, wait
//   > comment              ignored

import type { Co } from '../engine/co';
import { choose, say } from '../ui/dialog';
import { flag, setFlag } from '../game/state';

export interface Speaker {
  name?: string;
  voice?: string;
}

/** 10_narrative 1.5 name tags and voice ids. */
export const SPEAKERS: Record<string, Speaker> = {
  narr: { voice: 'narr' },
  sys: { voice: 'sys' },
  flip: { name: 'カネナリくん', voice: 'flip' },
  npc_mother: { name: '母', voice: 'mother' },
  npc_maruyama: { name: '丸山', voice: 'maruyama' },
  npc_obaa: { name: 'おばあ', voice: 'obaa' },
  npc_mamekichi: { name: 'まめ吉', voice: 'mamekichi' },
  npc_inui: { name: '乾', voice: 'inui' },
  npc_tsurumi: { name: '鶴見巡査', voice: 'tsurumi' },
  npc_sae: { name: 'サエ', voice: 'sae' },
  npc_jk: { name: '女子高生', voice: 'jk' },
  npc_chugaku: { name: '中学生', voice: 'chugaku' },
  npc_postman: { name: '郵便屋さん', voice: 'postman' },
  npc_madam: { name: '日傘の人', voice: 'madam' },
  npc_sand_girl: { name: '女の子', voice: 'girl' },
  npc_gacha_boy: { name: '男の子', voice: 'kid' },
  npc_ojii: { name: 'おじいさん', voice: 'ojii' },
  npc_mizumaki: { name: '水まきの人', voice: 'mizumaki' },
  npc_shadow_man: { name: '影の人', voice: 'shadow' },
  npc_hato: { name: 'ハト', voice: 'hato' },
  npc_kotaro: { name: 'コタロウ', voice: 'dog' },
  npc_cat_sauce: { name: 'ネコ', voice: 'cat' },
  npc_cat_mike: { name: 'ネコ', voice: 'cat' },
  npc_crow: { name: 'カラス', voice: 'crow' },
  npc_tv: { name: 'テレビ', voice: 'tv' },
  npc_broadcast: { name: '防災無線', voice: 'broadcast' },
  npc_kanenari: { name: 'カネナリくん', voice: 'flip' },
};

export function speakerOf(tag: string): Speaker {
  const s = SPEAKERS[tag];
  if (s) return s;
  const i = tag.indexOf(':');
  if (i >= 0) return { name: tag.slice(0, i), voice: tag.slice(i + 1) };
  return { name: tag };
}

/** Hooks for actions that need the world (installed by the field module). */
export interface MsgHooks {
  command?(name: string, args: string[]): Co | void;
}
let hooks: MsgHooks = {};
export function setMsgHooks(h: MsgHooks): void {
  hooks = h;
}

/**
 * Optional (scenario): where the window of each speaker's pages goes — the
 * story scenes move it to the top when the people in the scene stand under
 * the bottom window. Returning undefined keeps the default.
 */
type MsgPosHook = (speaker: string) => 'top' | 'bottom' | undefined;
let posHook: MsgPosHook | null = null;
export function setMsgPosHook(fn: MsgPosHook | null): void {
  posHook = fn;
}

interface Line {
  kind: 'speaker' | 'text' | 'page' | 'choice' | 'branch' | 'end' | 'cmd' | 'guard';
  v: string;
}

function lex(src: string): Line[] {
  const out: Line[] = [];
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const l = raw.replace(/\s+$/, '');
    if (!l.trim()) continue;
    const t = l.trim();
    if (t.startsWith('>')) continue;
    if (t === '/') out.push({ kind: 'page', v: '' });
    else if (t.startsWith('??') || t.startsWith('?!')) out.push({ kind: 'guard', v: t });
    else if (t.startsWith('?')) out.push({ kind: 'choice', v: t.slice(1).trim() });
    else if (t === '[-]' || t === '[共通]') out.push({ kind: 'end', v: '' });
    else if (/^\[.+\]$/.test(t)) out.push({ kind: 'branch', v: t.slice(1, -1).trim() });
    else if (t.startsWith('@')) out.push({ kind: 'speaker', v: t.slice(1).trim() });
    else if (t.startsWith('!')) out.push({ kind: 'cmd', v: t.slice(1).trim() });
    else out.push({ kind: 'text', v: l });
  }
  return out;
}

/** Run a msg block. Returns the index of the last choice made (or -1). */
export function* runMsg(src: string, defaultSpeaker = 'narr'): Co<number> {
  const lines = lex(src);
  let speaker = defaultSpeaker;
  let pages: string[] = [];
  let cur: string[] = [];
  let lastChoice = -1;
  let choiceLabels: string[] = [];
  let inBranch: string | null = null;
  let skipping = false;

  const flushPage = () => {
    if (cur.length) pages.push(cur.join('\n'));
    cur = [];
  };
  function* flush(): Co {
    flushPage();
    if (!pages.length) return;
    const sp = speakerOf(speaker);
    const p = pages;
    pages = [];
    yield* say(p, { name: sp.name, voice: sp.voice, pos: posHook?.(speaker) });
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.kind === 'branch') {
      yield* flush();
      inBranch = ln.v;
      const idx = choiceLabels.indexOf(ln.v);
      skipping = !(idx >= 0 && idx === lastChoice) && !(ln.v === 'それ以外' && lastChoice >= 0 && choiceLabels[lastChoice] !== inBranch);
      continue;
    }
    if (ln.kind === 'end') {
      yield* flush();
      inBranch = null;
      skipping = false;
      continue;
    }
    if (skipping) continue;
    switch (ln.kind) {
      case 'speaker':
        yield* flush();
        speaker = ln.v;
        break;
      case 'text':
        cur.push(ln.v);
        break;
      case 'page':
        flushPage();
        break;
      case 'guard': {
        const f = ln.v.slice(2).trim();
        const ok = ln.v.startsWith('??') ? flag(f) > 0 : flag(f) === 0;
        if (!ok) {
          yield* flush();
          return lastChoice;
        }
        break;
      }
      case 'choice': {
        // the current page stays on screen while choosing
        flushPage();
        const opts = ln.v.split('|').map((s) => s.trim());
        choiceLabels = opts;
        if (pages.length) {
          const sp = speakerOf(speaker);
          const p = pages;
          pages = [];
          yield* say(p, { name: sp.name, voice: sp.voice });
        }
        lastChoice = yield* choose(opts);
        break;
      }
      case 'cmd': {
        yield* flush();
        const [name, ...args] = ln.v.split(/\s+/);
        if (name === 'flag') setFlag(args[0], args[1] === undefined ? 1 : Number(args[1]));
        else if (name === 'flag+') setFlag(args[0], flag(args[0]) + (args[1] === undefined ? 1 : Number(args[1])));
        else if (name === 'wait') yield Number(args[0] ?? 300);
        else {
          const r = hooks.command?.(name, args);
          if (r) yield* r;
        }
        break;
      }
    }
  }
  yield* flush();
  return lastChoice;
}
