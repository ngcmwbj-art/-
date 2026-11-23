// Chapter 3 (海ぞいの町, 62_ch3_level_art) — what the world needs to know about
// it: whether 夕鳴町 is in its 9月1日 11:10 (stage 0: S01–S04 run on chapter
// 1's maps, whose own flag_stage stays where chapter 1 left it), and which
// grade family a map takes (the field's grading, render.ts's rooms).

import { flag } from '../game/state';
import { isCh2Map, isCh3Map } from './maps';
import type { MapDef } from './types';
import { fxAt, registerWorldFx } from './fx';
import type { FieldScene } from './field';
import { pgOn } from './postgame';

/** 夕鳴町 at 11:10 on 9月1日 (flag_ch3_stage 0 once chapter 3 has started, 62 5.1). */
export function ch3Hirumae(): boolean {
  // (クリア後は false：flag_ch3_clear を見ている。05 5.2)
  return flag('flag_ch3_started') > 0 && flag('flag_ch3_stage') === 0 && !flag('flag_ch3_clear') && !flag('flag_c3_end_light');
}

/**
 * Does this map grade with the pal_c3_* presets? 海ぞいの町's maps always;
 * chapter 1's (夕鳴町, the house, the shops) while it is 11:10 (stage 0).
 */
export function ch3Graded(def: MapDef | undefined | null): boolean {
  if (!def) return false;
  if (isCh3Map(def)) return true;
  return !isCh2Map(def) && ch3Hirumae();
}

/**
 * 夕鳴町 in chapter 3's ending and after it (62 5.3): flag_c3_end_light (the scenario's) 1 = 17:00
 * on the way home (S32: chapter 1's evening light, 'c6'), 2 = 5:10 the next morning (S33,
 * pal_c3_akegata 'c5'); after the clear the town stays in its morning. 0 = not this.
 */
export function ch3TownTime(def: MapDef | undefined | null): 0 | 1 | 2 {
  if (!def || isCh3Map(def) || isCh2Map(def) || !flag('flag_ch3_started')) return 0;
  // クリア後（05 5.2）：光は postgame.ts が時刻で選ぶ（pgLight）
  if (pgOn()) return 0;
  const t = flag('flag_c3_end_light');
  if (t === 1 || t === 2) return t;
  return flag('flag_ch3_clear') ? 2 : 0;
}

/** The chapter-3 stage a ch3-graded map shows (0 for 夕鳴町 at 11:10). */
export function ch3GradeStage(def: MapDef | undefined | null): number {
  if (!isCh3Map(def)) return 0;
  // 旧水族館の 屋上（掃除は 上から、03_ch3_index）：館の 中と 同じ 止まった 正午の 日ざし（段階3 でも 外の 光）
  if (def?.id === 'map_c3_aq_okujou' && flag('flag_ch3_stage') === 3) return 1;
  return flag('flag_ch3_stage');
}

// ---------------------------------------------------------------- fx_c3_tomaru (62 6.3)


/** The things that stopped in the air at 12:00 (their glints): gulls, spray, steam, the spread flag. */
const FROZEN = new Set(['prop_c3_kamome_sora', 'prop_c3_shibuki', 'prop_c3_yuge', 'prop_c3_kanshidai', 'prop_c3_seihyo', 'prop_c3_noren']);

interface Glint {
  x: number;
  y: number;
  foot: number;
  t: number;
}
let glints: Glint[] = [];
let nextGlint = 0;

/**
 * fx_c3_tomaru: over what has stopped (stage 1), now and then a 1px white
 * point of light — the stopped time's glitter — every 2 s somewhere near
 * Minato (62 6.3). Gone at 12:01.
 */
registerWorldFx({
  map: 'map_umizoi',
  anchored: true,
  update(f: FieldScene, dt: number) {
    for (const g of glints) g.t += dt;
    glints = glints.filter((g) => g.t < 700);
    if (flag('flag_ch3_stage') !== 1) return;
    nextGlint -= dt;
    if (nextGlint > 0) return;
    nextGlint = 1600 + Math.random() * 900;
    const near = f.props.filter((p) => {
      if (!p.present) return false;
      const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
      return FROZEN.has(id) && Math.abs(p.x - f.player.x) < 220 && Math.abs(p.y - f.player.y) < 130;
    });
    if (!near.length) return;
    const p = near[Math.floor(Math.random() * near.length)];
    const a = p.art;
    glints.push({
      x: Math.round(p.x + a.ox + a.w * (0.25 + Math.random() * 0.5)),
      y: Math.round(p.y + a.oy + a.h * (0.15 + Math.random() * 0.4)),
      foot: p.y + a.foot,
      t: 0,
    });
  },
  draw(f: FieldScene, g, cx, cy, layer) {
    if (layer !== 'top' || !glints.length) return;
    for (const gl of glints) {
      const [x, y] = fxAt(f, gl.x, gl.y, cx, cy, gl.foot);
      const k = gl.t < 200 ? gl.t / 200 : 1 - (gl.t - 200) / 500;
      if (k <= 0) continue;
      g.rect(Math.round(x), Math.round(y), 1, 1, '#FFFFFF', k);
      if (gl.t > 120 && gl.t < 420) {
        g.rect(Math.round(x) - 1, Math.round(y), 3, 1, '#FFFFFF', k * 0.5);
        g.rect(Math.round(x), Math.round(y) - 1, 1, 3, '#FFFFFF', k * 0.5);
      }
    }
  },
});
