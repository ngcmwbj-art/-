// ごはん 一粒、花 一つ（第2章。げむきか 10/18 の 案5、2026-10-18 依頼主の 採用。02_ch2_index #107）。
// 文は data/text/hoshi_hana.ts、みました帳の ページは ui/menu/book_hana.ts、穂の 光の 絵は art/props/hana_art.ts、
// 置き場所は data/maps/hoshi_village.ts（いちばん 上の 段の 西の 田、水口 (13,2) の そば 6か所）。
//
//   段階1〜2（トマトの 灯り）。「第2章から」でも 遊べる。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く。
//   数の 話は グソっ君の ツッコミの ときだけ）。
//   ・トマじい（棚田の 4段目の 畦 (21,11)）の〔h1_1〕か〔h1_2〕を 1回 聞いた あと、話すと〔hana〕（flag_hn_start）。
//     段階0 は〔h0_1〕の あとに 1ページだけ（flag_hn_h0）。
//   ・穂 6か所 obj_hn_ho_<i>（1段目の 西の 田 (14–18,3–4)。北の 畦 y2 から 下向き、南の 畦 y5 から 上向き）：
//     大写し「穂」HoPanel で 見え方を 3つから 選ぶ（まちがえても 進む：ほんとうの 見え方を もう 1回）。
//     その か所の「これから 咲く」穂（ぜんぶで 7本。2本の 所が 1つ）を 数える（flag_hn_seen_<i>、flag_hn_look_<k>）。
//   ・6か所 見て トマじいに もどる → 3 花畑 → 4 ごほうび（朱肉 +2、みました帳②の すみ、flag_hn_done）。
//   ・かくし：羽釜（flag_hg_done）→ グソっ君と トマじいの 1行。ヘノヘノ課長①（sym_hoshi_03）を みました → トマじいの 1行。
//   ・クリア後の 夜（段階は h1）：トマじいは クリア後の 会話が 包むので、hana_pg.ts が その 上から 先に 呼ぶ。
//
// QA：__game.cmd.hana(step, stage)、hnState()、hnText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_hana';
import { HN_UI } from '../../data/text/hoshi_hana';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const NF = {
  h0: 'flag_hn_h0',
  start: 'flag_hn_start',
  wait: 'flag_hn_wait',
  all: 'flag_hn_all',
  done: 'flag_hn_done',
  hagama: 'flag_hn_hagama',
  kacho: 'flag_hn_kacho',
  after: 'flag_hn_tome_after',
} as const;

export type HoLook = 'ato' | 'kore' | 'mae';
const LOOKS: HoLook[] = ['ato', 'kore', 'mae'];

/** 6か所（西から）：見え方、その か所の「これから 咲く」穂、となりの 穂の 文。ぜんぶで 7本。 */
export const HN_SPOTS: { x: number; y: number; face: 'up' | 'down'; look: HoLook; kore: number; extra?: 'two' | 'ato' | 'mae' }[] = [
  { x: 14, y: 3, face: 'down', look: 'kore', kore: 2, extra: 'two' },
  { x: 16, y: 3, face: 'down', look: 'kore', kore: 1 },
  { x: 18, y: 3, face: 'down', look: 'ato', kore: 1, extra: 'ato' },
  { x: 14, y: 4, face: 'up', look: 'kore', kore: 1 },
  { x: 16, y: 4, face: 'up', look: 'mae', kore: 1, extra: 'mae' },
  { x: 18, y: 4, face: 'up', look: 'kore', kore: 1 },
];
const seenF = (i: number) => `flag_hn_seen_${i}`;
const lookF = (k: HoLook) => `flag_hn_look_${k}`;

function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (kanenariHere()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* runMsg(t);
}

/** 寄り道が 開いている：段階1〜2、トマトの 灯り（クリア後の 夜も）。 */
function open(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

export function hnSeenN(): number {
  return HN_SPOTS.filter((_, i) => flag(seenF(i)) > 0).length;
}
/** 数えた「これから 咲く」穂。 */
export function hnKore(): number {
  return HN_SPOTS.reduce((n, s, i) => n + (flag(seenF(i)) ? s.kore : 0), 0);
}
/** 3つの 見え方を ぜんぶ 見た。 */
export function hnAllLooks(): boolean {
  return LOOKS.every((k) => flag(lookF(k)) > 0);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

// ================================================================ 大写し「穂」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;

/** もみ 1つ（ななめの 小さな 楕円）。 */
function momi(g: Gfx, x: number, y: number, c: string, cl: string, cd: string, open: boolean): void {
  g.rect(x - 2, y - 4, 5, 9, c);
  g.rect(x - 1, y - 5, 3, 1, c);
  g.rect(x - 1, y + 5, 3, 1, cd);
  g.rect(x - 2, y - 3, 1, 6, cl);
  g.px(x + 2, y + 3, cd);
  // the seam down the middle (shut tight, or a little open where it flowered)
  if (open) {
    g.rect(x, y - 4, 1, 7, '#F2EAC8');
  } else {
    g.rect(x, y - 3, 1, 6, cd);
    g.px(x - 1, y - 2, '#E8F4D8');
  }
}

export class HoPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  look: HoLook;
  extra?: 'two' | 'ato' | 'mae';
  /** 選んだ あと：ほんとうの 見え方の 札を 出す。 */
  shown = false;

  constructor(look: HoLook, extra?: 'two' | 'ato' | 'mae') {
    this.look = look;
    this.extra = extra;
  }

  update(dt: number, _input: Input): void {
    this.t += dt;
  }

  /** 1本の 稲：田の 水から 立つ 茎と 葉、その 先の 穂（首を たれて、もみが 2列）。bx, ground：茎の 根もと。 */
  private ear(g: Gfx, bx: number, ground: number, look: HoLook, scale: number): void {
    const top = ground - Math.round(70 * scale);
    // the culm, a little bent, and two long leaves off it
    for (let y = ground; y > top; y--) {
      const x = bx + Math.round(((ground - y) / (ground - top)) * 3);
      g.rect(x, y, 2, 1, '#4E8A3A');
      g.px(x, y, '#6AA24A');
    }
    g.line(bx, ground - 18, bx - 26, ground - 50, '#3E7A32');
    g.line(bx + 1, ground - 18, bx - 25, ground - 50, '#5E9A42');
    g.line(bx + 1, ground - 30, bx + 30, ground - 62, '#3E7A32');
    g.line(bx + 2, ground - 30, bx + 31, ground - 62, '#5E9A42');
    const tx = bx + 3;
    if (look === 'mae') {
      // the ear still inside its leaf: the swollen sheath at the top of the culm, the flag leaf going on up out of it
      const h = Math.round(38 * scale);
      for (let i = 0; i < h; i++) {
        const w = Math.round(Math.sin((i / h) * Math.PI) * 4 * scale) + 1;
        const y = top - i;
        g.rect(tx - w, y, w * 2 + 1, 1, '#4E8A3A');
        g.px(tx - w, y, '#7AB05A');
        g.px(tx + w, y, '#2E5A2A');
      }
      g.line(tx, top - h, tx + 6, top - h - 24, '#5E9A42');
      g.line(tx + 1, top - h, tx + 7, top - h - 24, '#3E7A32');
      g.line(tx + 6, top - h - 24, tx + 16, top - h - 30, '#5E9A42');
      return;
    }
    // the ear: up from the top of the culm, then bowing over
    const n = 9;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push([Math.round(tx + k * 64 * scale), Math.round(top - Math.sin(k * 2.2) * 30 * scale + k * k * 22 * scale)]);
    }
    g.line(tx, top, pts[0][0], pts[0][1], '#6A9A3A');
    for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#7AA040');
    const [c, cl, cd] = look === 'ato' ? ['#7AA048', '#A2C468', '#4E7030'] : ['#5EA040', '#9AD870', '#2E6A2A'];
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      for (const s of [-1, 1]) {
        const mx = x + s * 3;
        const my = y + 3 + (s > 0 ? 1 : -1);
        momi(g, mx, my, c, cl, cd, look === 'ato');
        if (look === 'ato') {
          // the anthers hanging from the tips: white threads, a little yellow at their ends
          const sway = Math.round(Math.sin(this.t / 600 + i + s) * 1);
          g.rect(mx + sway, my + 5, 1, 6, '#F4F0E0');
          g.px(mx + sway, my + 11, '#E8D890');
          if (i % 2) {
            g.rect(mx + 1 + sway, my + 5, 1, 4, '#E8E4D4');
            g.px(mx + 1 + sway, my + 9, '#E0CC80');
          }
        } else if ((i + (s > 0 ? 1 : 0)) % 3 === 0) {
          // the lantern's glint on the shut, glossy glumes
          g.px(mx - 1, my - 3, '#FFFFFF');
        }
      }
    }
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      const oy = SY + dy;
      g.clip(SX, oy, CW, CH, () => {
        // the night before the dawn over the paddy, the lantern's warm pool on the ear
        g.rect(SX, oy, CW, CH, '#141A2A');
        for (let r = 80; r > 0; r -= 10) g.alpha(0.04, () => g.circle(SX + 150, oy + 54, r, '#F28A3A'));
        for (const [sx, sy] of [[14, 8], [70, 4], [250, 10], [300, 6]] as const) g.px(SX + sx, oy + sy, '#C8CCE0');
        // the water of the paddy below, the other plants dark round it
        g.rect(SX, oy + CH - 20, CW, 20, '#1A2430');
        for (let x = 0; x < CW; x += 7) g.px(SX + x, oy + CH - 18 + ((x / 7) % 3), '#3A4A5A');
        for (let i = 0; i < 14; i++) {
          const x = SX + 8 + i * 23;
          g.line(x, oy + CH - 20, x + 6, oy + 30 + ((i * 13) % 30), '#24402A');
        }
        // the ear that is looked at (the lantern on it), and the one beside it
        const gy = oy + CH - 20;
        if (this.extra === 'two' || this.extra === 'ato') this.ear(g, SX + 206, gy, 'kore', 0.8);
        if (this.extra === 'mae') this.ear(g, SX + 210, gy, 'kore', 0.75);
        this.ear(g, SX + 110, gy, this.look, 1.15);
      });
      const tw = g.measure(HN_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, HN_UI.place, { seed: 69 });
      markText(SX + 8, PY + dy - 5, tw, 16);
      if (this.shown) {
        const name = HN_UI.names[this.look];
        const nw = g.measure(name) + 16;
        drawTape(g, SX + CW - nw - 8, PY + dy + PH - 22, nw, 16, name, { seed: 71 });
        markText(SX + CW - nw - 8, PY + dy + PH - 22, nw, 16);
      }
    });
  }
}

function* withHo(p: HoPanel, fn: () => Co): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  try {
    yield* animate(200, (x) => (p.open = x), ease.linear);
    p.open = 1;
    forceBoxPos('bottom');
    yield* fn();
  } finally {
    yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
    p.done = true;
    game.ui.remove(p);
    forceBoxPos(null);
  }
}

// ================================================================ 台本

/** 1か所の 穂。 */
function* lookAt(i: number): Co {
  const s = HN_SPOTS[i];
  se('se_examine');
  if (flag(seenF(i))) {
    yield* say(T.HN_SEEN);
    return;
  }
  yield* say(T.HN_SPOT_A);
  const p = new HoPanel(s.look, s.extra);
  yield* withHo(p, function* () {
    const pick = yield* say(T.HN_ASK);
    const chosen = LOOKS[Math.max(0, pick)];
    if (chosen !== s.look) yield* say(T.HN_WRONG);
    p.shown = true;
    se('se_cursor', { vol: 0.4 });
    yield* say(T.HN_LOOK[s.look]);
    if (s.extra) yield* say(T.HN_EXTRA[s.extra]);
  });
  setFlag(seenF(i), 1);
  setFlag(lookF(s.look), 1);
  se('se_item', { vol: 0.5 });
  const n = hnSeenN();
  yield* runMsg(T.hnCount(n, hnKore()));
  if (n >= HN_SPOTS.length && !flag(NF.all)) {
    setFlag(NF.all, 1);
    yield* say(kanenariHere() ? T.HN_ALL6 : T.HN_ALL6_SOLO);
  }
}

registerScript('obj_hn_ho', function* (ctx: ScriptCtx): Co {
  const i = Number(String(ctx.source).replace(/^obj_hn_ho_/, '')) - 1;
  if (!open() || !flag(NF.start) || flag(NF.done) || !HN_SPOTS[i]) {
    se('se_examine');
    return;
  }
  yield* lookAt(i);
});

/** 3〜4：6か所 見て トマじいに もどる。 */
function* hanabatake(): Co {
  const kn = kanenariHere();
  const n = hnKore();
  yield* say(kn ? T.hnBack(n) : T.hnBackSolo(n));
  if (flag('flag_hg_done') && kn && !flag(NF.hagama)) {
    setFlag(NF.hagama, 1);
    yield* say(T.HN_HAGAMA);
  }
  if (state.taken['sym_hoshi_03'] && !flag(NF.kacho)) {
    setFlag(NF.kacho, 1);
    yield* say(T.HN_KACHO);
  }
  yield* say(kn ? T.HN_END : T.HN_END_SOLO);
  setFlag(NF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.HN_REWARD);
}

/** 話の 用が 先に ある（課長の 話、名前の 石、マルの 伝言。色紙・二百十日と 同じ）。 */
function storyFirst(): boolean {
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
  return !flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') > 0 || flag('flag_met_maru') > 0);
}

/** トマじいの〔h1_1〕か〔h1_2〕を 聞いた（クリア後の 夜は クリア後の 会話を 1回）。 */
function heardH1(): boolean {
  return flag('flag_seen_npc_hoshi_tome_h1_1') > 0 || flag('flag_seen_npc_hoshi_tome_h1_2') > 0 || (pgOn() && flag('flag_pg_talk_npc_hoshi_tome') > 0);
}

/** トマじいの 用（した とき true）。クリア後の 夜は hana_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* hnTome(): Co<boolean> {
  if (!open() || storyFirst()) return false;
  if (!flag(NF.start)) {
    if (!heardH1()) return false;
    setFlag(NF.start, 1);
    yield* say(T.HN_A);
    return true;
  }
  if (!flag(NF.done)) {
    if (hnSeenN() >= HN_SPOTS.length) {
      yield* hanabatake();
      return true;
    }
    if (flag(NF.wait)) return false;
    setFlag(NF.wait, 1);
    yield* say(T.HN_WAIT);
    return true;
  }
  if (!flag(NF.after)) {
    setFlag(NF.after, 1);
    yield* say(T.HN_TOME_AFTER);
    return true;
  }
  return false;
}

wrap('npc_hoshi_tome', function* (_ctx, orig): Co {
  if (yield* hnTome()) return;
  const h0 = flag('flag_seen_npc_hoshi_tome_h0_1');
  yield* orig();
  // 段階0：〔h0_1〕の あとに 1ページ（1回）
  if (hStage() === 0 && !h0 && flag('flag_seen_npc_hoshi_tome_h0_1') && !flag(NF.h0) && !pgOn()) {
    setFlag(NF.h0, 1);
    yield* say(T.HN_H0);
  }
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.hana(step = 'tome', stage = 'h1')（'h1' トマトの 灯り・'h2' よびごえ）
 *   'tome'   〔h1_1〕を 聞いた あと、トマじいの 前 (21,12) 上向き（話すと〔hana〕）
 *   'spot'   はじめた あと、1か所目の 穂の 前 (14,2) 下向き
 *   'spot5'  5か所 見た あと、6か所目の 前 (18,5) 上向き
 *   'back'   6か所 見た あと、トマじいの 前（話すと 花畑 → ごほうび）
 *   'after'  すんだ あと、トマじいの 前
 *   'h0'     段階0、トマじいの 前（〔h0_1〕の あとに 1ページ）
 */
if (import.meta.env.DEV) {
  registerDebug('hana', (step = 'tome', stg = 'h1') => {
    if (step === 'h0') cmd().jump?.('ch2:', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    HN_SPOTS.forEach((_, i) => setFlag(seenF(i), 0));
    for (const k of LOOKS) setFlag(lookF(k), 0);
    const go = (x: number, y: number, d: string) => cmd().warp?.('map_hoshimidai', x, y, d);
    if (step === 'h0') {
      setFlag('flag_seen_npc_hoshi_tome_h0', 0);
      setFlag('flag_seen_npc_hoshi_tome_h0_1', 0);
      return go(21, 12, 'up');
    }
    setFlag('flag_seen_npc_hoshi_tome_h1_1', 1);
    if (step === 'tome') return go(21, 12, 'up');
    setFlag(NF.start, 1);
    if (step === 'spot') return go(14, 2, 'down');
    HN_SPOTS.forEach((s, i) => {
      if (step !== 'spot5' || i < 5) {
        setFlag(seenF(i), 1);
        setFlag(lookF(s.look), 1);
      }
    });
    if (step === 'spot5') return go(18, 5, 'up');
    setFlag(NF.all, 1);
    if (step === 'back') return go(21, 12, 'up');
    setFlag(NF.done, 1);
    return go(21, 12, 'up');
  });

  registerDebug('hnState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof HoPanel) as HoPanel | undefined;
    return { flags, seen: hnSeenN(), kore: hnKore(), looks: LOOKS.filter((k) => flag(lookF(k))), open: open(), panel: p ? { look: p.look, shown: p.shown } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the names without さん in the narration. */
export function hnTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      let who = '';
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) who = t.slice(1);
          if (t.startsWith('?') && measure(t.slice(1)) > 336) bad.push(`${name}: choice ${measure(t.slice(1))}px`);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hn', T.HN_TEXTS);
  for (const l of Object.values(HN_UI.names)) if (measure(l) + 16 > 120) bad.push(`札: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('hnText', () => hnTextCheck());
