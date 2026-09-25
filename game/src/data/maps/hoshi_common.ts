// Shared pieces of the chapter-2 maps (星見台, 52_ch2_level_art): the text
// lookups (the texts themselves live in src/data/text/hoshi_*.ts and the
// scenario team registers a script for every examinable id — the text given
// here is the fallback the field shows while a script isn't registered),
// the object helpers and the ground ids of the chapter-2 tiles.

import type { HGround } from '../../art/tiles/hoshi_ground';
import type { Ground, MapObj, StageText, TalkTable, TileSpec } from '../../world/types';
import { HOSHI_OBJ, HOSHI_OBJ_EVENTS, HOSHI_RESTORED } from '../text/hoshi_objects';
import { HOSHI_NPC } from '../text/hoshi_npcs';

/** A chapter-2 ground id as a world Ground (art/tiles/hoshi_ground.ts draws it). */
export const hg = (g: HGround): Ground => g as string as Ground;

/**
 * The examine text of an object as the field reads it: a plain msg, or the
 * stage keys (h0, 'h1+', …) of a record with its `text` part as the default.
 * Named parts ('get', 'again', …) belong to the scripts.
 */
export function htext(id: string): StageText | undefined {
  const t = HOSHI_OBJ[id] ?? HOSHI_RESTORED[id];
  if (t === undefined) return undefined;
  if (typeof t === 'string') return t;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    if (/^[hs]\d/.test(k)) out[k] = v;
    else if (k === 'text' || k === 'default') out.default = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** An NPC's talk table (50 3章, keys h0_1 …). */
export function htalk(id: string): TalkTable | undefined {
  return HOSHI_NPC[id];
}

/** The event an object runs when examined (save points, the dark corridor). */
export function hevent(id: string): string | undefined {
  return HOSHI_OBJ_EVENTS[id];
}

/** An examinable object with its text (and its event script, when it has one). */
export function O(id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  const o: Record<string, unknown> = { t: 'obj', id, x, y, ...extra };
  if (o.text === undefined) {
    const t = htext((o.textId as string | undefined) ?? id);
    if (t !== undefined) o.text = t;
  }
  delete o.textId;
  const ev = hevent(id);
  if (ev && o.script === undefined) o.script = ev;
  return o as unknown as MapObj;
}

/** A second placement of an object (another tile, the same text and script). */
export function O2(id: string, n: number, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  return O(`${id}_${n}`, x, y, { script: id, textId: id, ...extra });
}

/** A decorative prop. */
export function PR(prop: string, x: number, y: number, opts?: Record<string, unknown>, extra: Record<string, unknown> = {}): MapObj {
  return { t: 'prop', prop, x, y, ...(opts ? { opts } : {}), ...extra } as unknown as MapObj;
}

/** Walls, voids and the furniture cells shared by the interiors. */
export const INDOOR: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};

/** Sort areas narrowest first (52 1.2: where they overlap the narrower one wins). */
export function narrowFirst<T extends { w: number; h: number }>(zones: T[]): T[] {
  return [...zones].sort((a, b) => a.w * a.h - b.w * b.h);
}
