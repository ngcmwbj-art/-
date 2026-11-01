// 捕まえない自由研究（50_ch2_story 10.21、52_ch2_level_art 7.5、53_ch2_audio 8.14、
// 02_ch2_index #64）
//
// Once the tomato is in the net, the net can't catch anything: グソっ君
// talks しゅん into a 自由研究 of looking (mushiInvite(), at the end of
// 〔ハウスを出たとき〕, once: flag_ch2_mushi). Five insects of an August night,
// each where it really lives — drawn only in the lantern's light (litOnly).
// ★2026-10-01 依頼主「虫が2つしか見つからなかった」(02 #80): all five where
// the night's walk passes, in the lantern's reach:
//
//   obj_hoshi_mushi_kantan   (4,30)  the ヨモギ at 3号ハウス's door (the first, right as he is talked into it)
//   obj_hoshi_mushi_umaoi    (27,30) the grass under the school gate's lamp
//   obj_hr_kucho_mushi       (34,37) ぴょん夫人's rearing case on a stand under ほうき家's eaves, by the road
//   obj_hoshi_mushi_enma     (46,37) the foot of the dry-stone wall on the slope up to the barn
//   obj_hoshi_mushi_kutsuwa  (50,15) the クズ's edge by the farm lane past the gate
//   obj_hoshi_mushi_kabuto   (43,1)  the クヌギ at the hill path (a bonus, not counted)
//
// To find them: one not seen yet twinkles in the light (the glow layer); the
// first time しゅん comes near one it sings once, quietly, from its place, and
// グソっ君 notices it in a bubble (MUSHI_NEAR, flag_ch2_mushi_near_<kind>).
// After each find he says how many are left and where one was heard (MUSHI_NEXT).
//
// Examined: the loupe comes up (the insect close, in warm light), it sings
// once (se_h_mushi_*), the page; the first time also 「（むし n/5）」
// (flag_ch2_mushi_<kind>). The fifth: 〔開花〕 — the page gets its title
// 『星見台の 夜の 虫』, 「しゅんは、虫の 声を 聞きわけるのが、好きに なって
// いた。」 (flag_ch2_mushi_done); after that each one's text is 〔くわしく〕.
// ぴょん夫人's next talk: 「……ええ 耳ね。」, 朱肉 +2 (flag_ch2_mushi_yoshie).
// Not one of the ten ふしぎ, and never set to a tune (00 16章, 53 1.4).
//
//   __game.cmd.mushiSheet()   the six loupes (both frames) and sketches, 3×, as a PNG data URL
//   __game.cmd.mushi(n)       mark the first n of the five seen (0 clears; also the invitation)

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { W } from '../../engine/screen';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { field, type FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { showBubble } from '../../ui/bubble';
import { LOUPE, MUSHI5, mushiLoupe, mushiSketch, type MushiKind } from '../../art/props/hoshi_mushi';
import {
  KABUTO_AGAIN,
  KABUTO_FIRST,
  KABUTO_FIRST_GENJIRO,
  MUSHI_BLOSSOM,
  MUSHI_CASE_PLAIN,
  MUSHI_INVITE,
  MUSHI_TEXT,
  MUSHI_YOSHIE,
  MUSHI_YOSHIE_FLIP,
  MUSHI_YOSHIE_GET,
  MUSHI_BOOK,
  MUSHI_NEAR,
  MUSHI_NEXT_ORDER,
  MUSHI_PAGE_TITLE,
  mushiCountText,
  mushiNextText,
} from '../../data/text/hoshi_mushi';
import { fitWrap, phraseWrapInfo, textW } from '../../ui/window';
import { FOLD, LP, RP } from '../../ui/menu/notebook';
import { se, seAt } from './compat';
import { lanternOn, say } from './common';

export const MUSHI_FLAG = 'flag_ch2_mushi';
export const MUSHI_DONE = 'flag_ch2_mushi_done';

export function mushiSeen(kind: MushiKind): boolean {
  return flag(`flag_ch2_mushi_${kind}`) > 0;
}

/** How many of the five have been seen. */
export function mushiCount(): number {
  return MUSHI5.filter(mushiSeen).length;
}

/** グソっ君's invitation (once; called at the end of 〔ハウスを出たとき〕). */
export function* mushiInvite(): Co {
  if (flag(MUSHI_FLAG)) return;
  setFlag(MUSHI_FLAG, 1);
  yield 300;
  yield* say(MUSHI_INVITE);
}

// ---------------------------------------------------------------- the loupe

/** How long each one sings (ms): the loupe's two frames alternate for as long. */
const SING_MS: Record<MushiKind, number> = { kantan: 2600, enma: 700, kutsuwa: 2700, umaoi: 700, suzu: 1400, kabuto: 0 };

class Loupe implements Widget {
  modal = false;
  done = false;
  a = 0;
  t = 0;
  singUntil = 0;
  /** Top-left on the screen: above the window, in the middle — or beside しゅん when he stands there. */
  x = Math.round(W / 2 - LOUPE / 2);
  y = 26;
  constructor(readonly kind: MushiKind) {
    const f = field();
    if (!f) return;
    const [sx, sy] = f.worldToScreen(f.player.x, f.player.y);
    const over = sx + 10 > this.x && sx - 10 < this.x + LOUPE && sy > this.y && sy - 30 < this.y + LOUPE;
    if (over) this.x = sx < W / 2 ? sx + 18 : sx - 18 - LOUPE;
    this.x = Math.max(4, Math.min(W - LOUPE - 4, this.x));
  }
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.a <= 0) return;
    const sing = this.t < this.singUntil && Math.floor(this.t / 110) % 2 === 1;
    const img = mushiLoupe(this.kind, sing ? 1 : 0);
    // it comes up a little (4px) as it fades in
    g.img(img, this.x, Math.round(this.y + (1 - this.a) * 4), this.a < 1 ? { alpha: this.a } : {});
  }
}

/** The loupe up, the song once, the page, the loupe down. */
function* look(kind: MushiKind, text: string): Co {
  se('se_examine');
  const w = new Loupe(kind);
  game.ui.push(w);
  yield* animate(160, (k) => (w.a = k), ease.quadOut);
  if (kind !== 'kabuto') {
    se(`se_h_mushi_${kind}`);
    w.singUntil = w.t + SING_MS[kind];
  }
  yield 420;
  yield* say(text);
  yield* animate(140, (k) => (w.a = 1 - k));
  w.done = true;
  game.ui.remove(w);
}

function* examine(kind: Exclude<MushiKind, 'kabuto'>): Co {
  const t = MUSHI_TEXT[kind];
  const first = !mushiSeen(kind);
  yield* look(kind, first ? t.first : flag(MUSHI_DONE) ? t.more : t.again);
  if (!first) return;
  setFlag(`flag_ch2_mushi_${kind}`, 1);
  const n = mushiCount();
  se('se_pen_write');
  yield* say(mushiCountText(n));
  // some left: グソっ君 says how many, and where one of them was heard (02 #80)
  const next = MUSHI_NEXT_ORDER.find((k) => !mushiSeen(k));
  if (n < 5 && next && kanenariHere()) yield* say(mushiNextText(5 - n, next));
  if (n >= 5 && !flag(MUSHI_DONE)) {
    // 〔開花〕 the page gets its title
    setFlag(MUSHI_DONE, 1);
    yield 300;
    se('se_page');
    yield 200;
    se('se_pen_write');
    yield* say(MUSHI_BLOSSOM);
  }
}

for (const kind of ['kantan', 'enma', 'kutsuwa', 'umaoi'] as const)
  registerScript(`obj_hoshi_mushi_${kind}`, function* (): Co {
    yield* examine(kind);
  });

// ---------------------------------------------------------------- finding them (02 #80)

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** Where each of the five is on map_hoshimidai (its tile) — for the twinkle, the first song and グソっ君's bubble. */
export const MUSHI_SPOT: Record<Exclude<MushiKind, 'kabuto'>, [number, number]> = {
  kantan: [4, 30],
  umaoi: [27, 30],
  suzu: [34, 37],
  enma: [46, 37],
  kutsuwa: [50, 15],
};
/** How near (tiles, from しゅん's tile) he must come for the first song and the bubble. */
const NEAR_TILES = 3.2;

/** The insect's drawn self on the field (the case's for the スズムシ) and how lit it is now (0–1). */
function bugOnField(f: FieldScene, kind: Exclude<MushiKind, 'kabuto'>): { x: number; y: number; a: number } | null {
  const pr = f.props.find((p) =>
    kind === 'suzu' ? p.obj.t === 'prop' && p.obj.prop === 'prop_hr_mushi_case' : p.obj.t === 'prop' && p.obj.prop === 'prop_h_mushi' && (p.obj as { opts?: { k?: string } }).opts?.k === kind,
  );
  if (!pr || !pr.present) return null;
  const a = pr.art;
  // the case: its lid's corner (the crickets inside); a bug: the middle of its 16px frame
  const x = pr.x + a.ox + (kind === 'suzu' ? 9 : 8);
  const y = pr.y + a.oy + (kind === 'suzu' ? 4 : 10);
  return { x, y, a: kind === 'suzu' ? 1 : f.light.alphaOf(pr) };
}

registerWorldFx({
  map: 'map_hoshimidai',
  update(f) {
    if (!flag(MUSHI_FLAG) || !lanternOn() || !f.controllable) return;
    const p = f.player;
    for (const kind of MUSHI_NEXT_ORDER) {
      const near = `flag_ch2_mushi_near_${kind}`;
      if (mushiSeen(kind) || flag(near)) continue;
      const [tx, ty] = MUSHI_SPOT[kind];
      if (Math.hypot(p.x / 16 - (tx + 0.5), (p.y - 8) / 16 - (ty + 0.5)) > NEAR_TILES) continue;
      const bug = bugOnField(f, kind);
      if (!bug || bug.a < 0.5) continue;
      setFlag(near, 1);
      // it sings once, quietly, from where it is; グソっ君 notices
      seAt(`se_h_mushi_${kind}`, bug.x, bug.y, { vol: 0.55 });
      if (kanenariHere()) showBubble('kanenari', MUSHI_NEAR[kind], 2400);
      return;
    }
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow' || !flag(MUSHI_FLAG) || !lanternOn()) return;
    // one not seen yet twinkles in the light: a small four-point star over it, every 1.6 s
    for (const kind of MUSHI_NEXT_ORDER) {
      if (mushiSeen(kind)) continue;
      const bug = bugOnField(f, kind);
      if (!bug || bug.a <= 0.05) continue;
      const ph = (f.t + kind.length * 290) % 1600;
      if (ph > 520) continue;
      const k = Math.sin((ph / 520) * Math.PI) * bug.a;
      const X = Math.round(bug.x - cx);
      const Y = Math.round(bug.y - cy - 7);
      const r = k > 0.6 ? 2 : 1;
      g.rect(X - r, Y, r * 2 + 1, 1, '#FFF6D8', 0.85 * k);
      g.rect(X, Y - r, 1, r * 2 + 1, '#FFF6D8', 0.85 * k);
      g.rect(X - 1, Y - 1, 3, 3, '#FFE7A3', 0.25 * k);
    }
  },
});

/** ぴょん夫人's rearing case: an ordinary thing until the research has begun. */
registerScript('obj_hr_kucho_mushi', function* (): Co {
  if (!flag(MUSHI_FLAG)) {
    se('se_examine');
    yield* say(MUSHI_CASE_PLAIN);
    return;
  }
  yield* examine('suzu');
});

/** The beetle at the クヌギ (not counted). しゅん's own ゲンジロウ, if he looked at it in chapter 1. */
registerScript('obj_hoshi_mushi_kabuto', function* (): Co {
  const first = !flag('flag_ch2_mushi_kabuto');
  const text = !first ? KABUTO_AGAIN : flag('flag_seen_obj_mushikago') ? KABUTO_FIRST_GENJIRO : KABUTO_FIRST;
  yield* look('kabuto', text);
  setFlag('flag_ch2_mushi_kabuto', 1);
});

// ---------------------------------------------------------------- ぴょん夫人

/**
 * The next talk after the fifth (once, before her other lines): 「5つ
 * 聞きわけたの。……ええ 耳ね。」 and 朱肉 +2. True when it was said (her tea follows).
 */
export function* mushiAtYoshie(): Co<boolean> {
  if (!flag(MUSHI_DONE) || flag('flag_ch2_mushi_yoshie')) return false;
  setFlag('flag_ch2_mushi_yoshie', 1);
  yield* say(MUSHI_YOSHIE);
  const m = state.party.find((p) => p.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + 2);
  se('se_item');
  yield* say(MUSHI_YOSHIE_GET);
  yield* say(MUSHI_YOSHIE_FLIP);
  return true;
}

// ---------------------------------------------------------------- QA

registerDebug('mushiSheet', () => {
  const kinds: MushiKind[] = [...MUSHI5, 'kabuto'];
  const s = 3;
  const cw = LOUPE * 2 + 36 + 16;
  const cv = document.createElement('canvas');
  cv.width = (cw * s) | 0;
  cv.height = (kinds.length * (LOUPE + 6) * s) | 0;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3A3F48';
  ctx.fillRect(0, 0, cv.width, cv.height);
  kinds.forEach((k, i) => {
    const y = i * (LOUPE + 6) * s;
    ctx.drawImage(mushiLoupe(k, 0), 0, y, LOUPE * s, LOUPE * s);
    ctx.drawImage(mushiLoupe(k, 1), (LOUPE + 4) * s, y, LOUPE * s, LOUPE * s);
    ctx.fillStyle = '#FBF3DC';
    ctx.fillRect((LOUPE * 2 + 10) * s, y + 20 * s, 36 * s, 28 * s);
    ctx.drawImage(mushiSketch(k), (LOUPE * 2 + 10) * s, y + 20 * s, 36 * s, 28 * s);
  });
  return cv.toDataURL();
});

registerDebug('mushi', (n = 5) => {
  setFlag(MUSHI_FLAG, 1);
  MUSHI5.forEach((k, i) => setFlag(`flag_ch2_mushi_${k}`, i < n ? 1 : 0));
  setFlag(MUSHI_DONE, n >= 5 ? 1 : 0);
  if (n <= 0) {
    setFlag(MUSHI_FLAG, 0);
    setFlag('flag_ch2_mushi_yoshie', 0);
    // グソっ君's bubbles near each one (02 #80) come again
    MUSHI5.forEach((k) => setFlag(`flag_ch2_mushi_near_${k}`, 0));
  }
  return { seen: mushiCount(), done: flag(MUSHI_DONE) };
});

/**
 * QA (wrapCheck asks it too): the notebook's 『むし』 page against its columns —
 * the index names (2 lines), the call (1 line), the place (2), しゅん's notes
 * (2), the "where the voice comes from" (2), and the title under the index.
 */
export function mushiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const labelW = FOLD - 4 - (LP.x + 14);
  const fits = (where: string, text: string, w: number, max: number) => {
    pages++;
    const { lines, forced } = phraseWrapInfo(text, w);
    const tight = fitWrap(text, w);
    if (tight.length > max || (forced && tight.every((l) => !l.spacing))) bad.push(`${where}: ${lines.join('／')} (${tight.length}/${max})`);
  };
  for (const b of MUSHI_BOOK) {
    fits(`むし ${b.name} 一覧`, b.name, labelW, 2);
    fits(`むし ${b.name} 声`, b.call.startsWith('（') ? b.call : `「${b.call}」`, RP.w - 4, 1);
    fits(`むし ${b.name} 場所`, b.place, RP.w - 8, 2);
    fits(`むし ${b.name} メモ`, b.note, RP.w, 2);
    if (b.noteGenjiro) fits(`むし ${b.name} メモ（ゲンジロウ）`, b.noteGenjiro, RP.w, 2);
    if (b.hint) fits(`むし ${b.name} 声の方`, `（${b.hint}）`, RP.w, 2);
  }
  pages++;
  if (textW(MUSHI_PAGE_TITLE) > LP.w - 8) bad.push(`むし 題: ${MUSHI_PAGE_TITLE} ${textW(MUSHI_PAGE_TITLE)}px`);
  return { pages, bad };
}
registerDebug('mushiBookText', () => mushiBookCheck());
