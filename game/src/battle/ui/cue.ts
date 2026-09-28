// 操作の言葉 (2026-09-28, the client: 「ハンコのゲージの時は 長押し！って
// 言葉があった方がいい」): a short word beside the thing to press along with —
// 「長押し！」→「はなす！」 at the hanko gauge, 「いま！」 at the たたく ring,
// 「ツッコめ！」 over the "!". One look for all of them (cueLettering), drawn
// over the stickies and under the numbers. The timing games own their cue
// (party.ts ringStrike / holdStamp, enemy.ts hitLoop), so every battle —
// chapter 1, chapter 2, the bosses — gets the same words.

import type { Gfx } from '../../engine/gfx';
import { ease } from '../../engine/tween';
import { cueLettering, type CueTone } from '../art/stamps';
import { setButtonHint } from '../../engine/touch';

export type { CueTone };

export interface CueOpts {
  x: number;
  y: number;
  /** How the word sits on (x, y): its left edge, centre or right edge; y is its top. */
  align?: 'left' | 'center' | 'right';
  tone?: CueTone;
  /** 'beat': a slow pulse (waiting for the press) · 'flash': a quick throb (now!) · 'still'. */
  mode?: 'beat' | 'flash' | 'still';
  /** Pixel scale of the lettering (2 = 32px glyphs). */
  scale?: number;
  /** Also show this word on the touch controls' けってい button. */
  button?: string;
}

interface Cue extends Required<Omit<CueOpts, 'button'>> {
  text: string;
  /** ms since the word (or its tone) last changed: it pops in. */
  t: number;
  /** ms since it began to go (-1 while it stays). */
  out: number;
  button?: string;
}

const OUT_MS = 140;

/** The cue words of one battle scene. */
export class Cues {
  private list = new Map<string, Cue>();

  /** Show (or keep showing) the word under `key`; a new word or tone pops in again. */
  set(key: string, text: string, o: CueOpts): void {
    const c = this.list.get(key);
    const tone = o.tone ?? 'hold';
    const fresh = !c || c.out >= 0 || c.text !== text || c.tone !== tone;
    const next: Cue = {
      text,
      tone,
      x: o.x,
      y: o.y,
      align: o.align ?? 'center',
      mode: o.mode ?? 'beat',
      scale: o.scale ?? 2,
      t: fresh ? 0 : c!.t,
      out: -1,
      button: o.button,
    };
    this.list.set(key, next);
    if (fresh || c?.button !== o.button) this.syncButton();
  }

  /** Let the word go (a short fade). `tone` recolours it as it goes (a miss → 'off'). */
  drop(key: string, tone?: CueTone): void {
    const c = this.list.get(key);
    if (!c || c.out >= 0) return;
    c.out = 0;
    if (tone) c.tone = tone;
    this.syncButton();
  }

  clear(): void {
    this.list.clear();
    this.syncButton();
  }

  /** QA: the words up now. */
  peek(): string[] {
    return [...this.list.values()].filter((c) => c.out < 0).map((c) => c.text);
  }

  has(key: string): boolean {
    const c = this.list.get(key);
    return !!c && c.out < 0;
  }

  /** Screen rects of the words up now (labels and numbers keep clear of them). */
  rects(): { x0: number; y0: number; x1: number; y1: number }[] {
    const out: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const c of this.list.values()) {
      if (c.out >= 0) continue;
      const img = cueLettering(c.text, c.tone, c.scale);
      const x = c.align === 'left' ? c.x : c.align === 'right' ? c.x - img.width : c.x - img.width / 2;
      out.push({ x0: x, y0: c.y, x1: x + img.width, y1: c.y + img.height });
    }
    return out;
  }

  update(dt: number): void {
    for (const [k, c] of this.list) {
      c.t += dt;
      if (c.out >= 0) {
        c.out += dt;
        if (c.out > OUT_MS) this.list.delete(k);
      }
    }
  }

  draw(g: Gfx, rt: number): void {
    for (const c of this.list.values()) {
      const img = cueLettering(c.text, c.tone, c.scale);
      // pop in (1.3 → 1 in 110ms), then the mode's own movement
      let k = c.t < 110 ? 1.3 - 0.3 * ease.quadOut(c.t / 110) : 1;
      if (c.t >= 110 && c.out < 0) {
        if (c.mode === 'beat') k *= 1 + 0.07 * Math.max(0, Math.sin((rt / 560) * Math.PI * 2));
        else if (c.mode === 'flash') k *= Math.floor(rt / 90) % 2 === 0 ? 1.08 : 1;
      }
      let a = 1;
      if (c.out >= 0) {
        a = Math.max(0, 1 - c.out / OUT_MS);
        k *= 1 + 0.15 * (c.out / OUT_MS);
      }
      const w = Math.round(img.width * k);
      const h = Math.round(img.height * k);
      const bx = c.align === 'left' ? c.x : c.align === 'right' ? c.x - img.width : c.x - img.width / 2;
      const x = Math.round(bx + img.width / 2 - w / 2);
      const y = Math.round(c.y + img.height / 2 - h / 2);
      g.alpha(a, () => g.ctx.drawImage(img, x, y, w, h));
    }
  }

  /** The けってい button shows the word of the newest cue that asks for it. */
  private syncButton(): void {
    let text: string | null = null;
    let go = false;
    for (const c of this.list.values()) {
      if (c.out >= 0 || !c.button) continue;
      text = c.button;
      go = c.tone === 'go';
    }
    setButtonHint(text, go);
  }
}

/** Size of a cue word (for placing it before it is shown). */
export function cueSize(text: string, scale = 2): { w: number; h: number } {
  const img = cueLettering(text, 'hold', scale);
  return { w: img.width, h: img.height };
}
