// 真昼の 顔（第3章の クリア前、段階1。げむきか 10/18 の 案1、2026-10-18 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_mahiru.ts、みました帳の ページは ui/menu/book_mahiru.ts。S31 の 1ページは ending.ts（cut3Photo）、
// 1枚絵の 差分は ui/cut_c3.ts（photoPicture）。地図は 今の まま（写真館の 主人は azemichi.ts の 来る人の 表）。
//
//   段階1（正午）、写真館の 主人が 便で 着いてから（flag_ch3_kita_npc_photo_master）。来ていなければ 起きない。
//   ・主人（c3_kita_npc_photo_master）：来た ときの 1行の あと 1回 → 1（flag_mh_start、item_c3_camera）。
//   ・トロ箱 obj_c3_toro：主人と 話した あとの 2回目から → 2（flag_mh_futa、item_c3_futa）。
//   ・カイト・テル・ウミ（今の 置き場所）：カメラと ふたが あって、グソっ君が いっしょ なら 話すと 撮る（1人 1回）：
//     大写し「のぞき窓」PeepPanel（←→で ふたの 角度 3段、けっていで シャッター。失敗は ない）→ flag_mh_<who>
//     （1 ちょうど・2 のどだけ・3 まぶしい）。その 人の 今の 台本は 次に 話した とき。
//   ・3枚 撮って 主人へ → 7・8（flag_mh_done）。3枚とも ちょうど → 4枚目（flag_mh_four）。
//   ・段階2 に なって 撮りかけ → 主人「……日が 動いた。」（flag_mh_end。撮った 写真は 残る）。カメラと ふたは
//     主人に 返す（段階2 で 何も 言わずに 消える 分も）。
//
// QA：__game.cmd.mahiru(step, auto)、mhState()、mhText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { mhPortrait } from '../../ui/mahiru_face';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_mahiru';
import { MH_UI } from '../../data/text/c3_mahiru';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { inCh3, kita, noon, say3 } from './common';

export const MF = {
  start: 'flag_mh_start',
  toroN: 'flag_mh_toro_n',
  futa: 'flag_mh_futa',
  rule: 'flag_mh_rule',
  kaito: 'flag_mh_kaito',
  teru: 'flag_mh_teru',
  umi: 'flag_mh_umi',
  umiBr: 'flag_mh_umi_br',
  four: 'flag_mh_four',
  done: 'flag_mh_done',
  after: 'flag_mh_after',
  end: 'flag_mh_end',
} as const;

export type Who = 'kaito' | 'teru' | 'umi';
const WHO: Who[] = ['kaito', 'teru', 'umi'];
const NPC_OF: Record<Who, string> = { kaito: 'npc_c3_kanshiin', teru: 'npc_c3_toudai', umi: 'npc_c3_mago' };
const MASTER = 'npc_photo_master';
const CAMERA = 'item_c3_camera';
const FUTA = 'item_c3_futa';

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
}

/** 寄り道が 開いている：段階1（正午）、主人が 来ている。 */
export function mhOpen(): boolean {
  return noon() && kita(MASTER);
}

export function mhShots(): number {
  return WHO.filter((w) => flag(MF[w]) > 0).length;
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

function dropTools(): void {
  for (const id of [CAMERA, FUTA]) while (state.inventory.includes(id)) removeItem(id);
}

// ================================================================ 顔（写真の 絵：のぞき窓・帳面）

/** The face of one photo (ui/mahiru_face.ts: the book draws them too). */
export const portrait = mhPortrait;

// ================================================================ 大写し「のぞき窓」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;
/** The window of the camera (inside the panel's picture). */
const VX = SX + 20;
const VW = 178;

export class PeepPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  result: number | null = null;
  who: Who | 'four';
  /** 0 低い・1 ちょうど・2 高い。 */
  angle = 0;
  flash = 0;
  br: boolean;
  private ePress = false;

  constructor(who: Who | 'four', br = false) {
    this.who = who;
    this.br = br;
  }

  clearInput(): void {
    this.ePress = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    if (input.pressed('confirm')) this.ePress = true;
    if (!this.active || this.result !== null) return;
    if (this.auto) {
      this.angle = 1;
      this.ePress = true;
    } else if (input.pressed('left') && this.angle > 0) {
      this.angle--;
      se('se_cursor', { vol: 0.3 });
    } else if (input.pressed('right') && this.angle < 2) {
      this.angle++;
      se('se_cursor', { vol: 0.3 });
    }
    if (this.ePress) {
      this.ePress = false;
      this.flash = 260;
      se('se_c3_photo', { vol: 0.7 });
      this.result = this.angle === 1 ? 1 : this.angle === 0 ? 2 : 3;
    }
  }

  private place(): string {
    return this.who === 'kaito' ? 'beach' : this.who === 'umi' ? 'sea' : 'lighthouse';
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
        // the old camera's body round the little window
        g.rect(SX, oy, CW, CH, '#2A2830');
        for (let x = 0; x < RX - SX - 4; x += 3) g.px(SX + x, oy + CH - 3, '#3A3840');
        const vy = oy + 6;
        const vh = CH - 12;
        g.rect(VX - 3, vy - 3, VW + 6, vh + 6, '#141218');
        g.clip(VX, vy, VW, vh, () => {
          // noon at the sea: the hard blue sky, the sea, the white of the breakwater or the sand
          const place = this.place();
          g.rect(VX, vy, VW, vh, '#5AA8E8');
          g.rect(VX, vy + 40, VW, 30, '#3A86C0');
          g.rect(VX, vy + 70, VW, vh - 70, place === 'lighthouse' ? '#C8C4B8' : '#E8D8A8');
          if (place === 'lighthouse') {
            g.rect(VX + 150, vy + 4, 18, 70, '#E8E4D8');
            for (let i = 0; i < 4; i++) g.rect(VX + 150, vy + 10 + i * 16, 18, 7, '#C8402E');
          }
          // the face(s), chest up (the sprite four times over: its feet fall out of the window)
          const lvl = this.result !== null || this.active ? this.angle : 0;
          const draw1 = (id: string, cx: number, pose?: string, level = lvl, br = false, sc = 5) => {
            const pic = portrait(id, level, br, pose);
            if (pic) g.img(pic, Math.round(cx - (pic.width * sc) / 2), vy + 2, { scale: sc });
          };
          if (this.who === 'four') {
            draw1('minato', VX + 62, undefined, 1, false, 4);
            draw1('kanenari', VX + 120, 'happy', 1, false, 4);
          } else draw1(NPC_OF[this.who], VX + VW / 2 - 6, undefined, lvl, this.br);
          // グソっ君's claw and the white lid's corner at the bottom (tipped by the angle)
          if (this.who !== 'four') {
            const lx = VX + VW - 46;
            const ly = vy + vh;
            const tip = [6, 18, 30][lvl];
            for (let i = 0; i < 46; i++) {
              const hh = 8 + Math.round((tip * i) / 45);
              g.rect(lx + i, ly - hh, 1, hh, i % 11 === 0 ? '#E0E0DC' : '#F4F4F0');
              g.px(lx + i, ly - hh, '#FFFFFF');
            }
            g.rect(lx - 10, ly - 10, 12, 10, '#C8402E');
            g.rect(lx - 8, ly - 12, 4, 3, '#C8402E');
            g.px(lx - 6, ly - 9, '#E86A4E');
            // the light thrown back up (stronger the higher)
            g.alpha(0.08 + lvl * 0.06, () => g.rect(VX, vy + 30, VW, vh - 30, '#FFFFFF'));
          }
          if (this.flash > 0) g.alpha(this.flash / 260, () => g.rect(VX, vy, VW, vh, '#FFFFFF'));
        });
        // the right column: the lid's angle, the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        if (this.who !== 'four') {
          g.text(MH_UI.angles[this.angle], RX, oy + 4, { color: '#F4ECD8' });
          for (let i = 0; i < 3; i++) g.rect(RX + i * 14, oy + 26, 10, 4, i === this.angle ? '#FFE7A3' : '#1A1626');
          if (this.active) MH_UI.keys.forEach((l, i) => g.text(l, RX, oy + 44 + i * 16, { color: '#FFE7A3' }));
        }
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(MH_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, MH_UI.place, { seed: 77 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: PeepPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: PeepPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

// ================================================================ 台本

/** 1 主人に 話す（来た ときの 1行の あと 1回）・撮っている 間・3枚で 7。 */
wrap(`c3_kita_${MASTER}`, function* (_ctx, orig): Co {
  if (!inCh3() || !kita(MASTER)) {
    yield* orig();
    return;
  }
  // 段階2 から 先：撮りかけ なら 1回 終わりの 1行（カメラと ふたは 返す）
  if (flag('flag_ch3_stage') >= 2 && flag(MF.start) && !flag(MF.done) && !flag(MF.end)) {
    setFlag(MF.end, 1);
    yield* say(T.MH_END);
    if (state.inventory.includes(CAMERA) || state.inventory.includes(FUTA)) {
      dropTools();
      yield* say3(T.MH_END_RETURN);
    }
    return;
  }
  if (!mhOpen()) {
    if (flag(MF.done) && !flag(MF.after)) {
      setFlag(MF.after, 1);
      yield* say3(T.MH_AFTER_MASTER);
      return;
    }
    yield* orig();
    return;
  }
  if (!flag(MF.start)) {
    yield* orig();
    yield 300;
    setFlag(MF.start, 1);
    yield* say(T.MH_A);
    yield* getKeyItem(CAMERA, T.MH_GET_CAMERA, false);
    yield* say3(T.MH_A2);
    return;
  }
  if (!flag(MF.done)) {
    if (mhShots() >= 3) {
      yield* finale();
      return;
    }
    yield* say3(T.MH_WAIT);
    return;
  }
  if (!flag(MF.after)) {
    setFlag(MF.after, 1);
    yield* say3(T.MH_AFTER_MASTER);
    return;
  }
  yield* orig();
});

/** 2 トロ箱（主人と 話した あとの 2回目から）。 */
wrap('obj_c3_toro', function* (_ctx, orig): Co {
  if (!mhOpen() || !flag(MF.start) || flag(MF.futa) || flag(MF.done)) {
    yield* orig();
    if (mhOpen() && flag(MF.start)) setFlag(MF.toroN, flag(MF.toroN) + 1);
    return;
  }
  if (flag(MF.toroN) < 1) {
    setFlag(MF.toroN, 1);
    yield* orig();
    return;
  }
  se('se_examine');
  setFlag(MF.futa, 1);
  yield* say(T.MH_FUTA);
  yield* getKeyItem(FUTA, T.MH_GET_FUTA, false);
  yield* say(T.MH_TERASU);
});

/** 3〜6 撮る（その 人の 今の 台本の かわりに 1回）。 */
function* shoot(who: Who): Co {
  const umiBr = who === 'umi' && flag('flag_ch3_umi_done') > 0;
  yield* say(T.MH_BEFORE[who]);
  const p = new PeepPanel(who, umiBr);
  p.auto = qaAuto;
  let r = 1;
  try {
    yield* openPanel(p);
    if (!flag(MF.rule)) {
      setFlag(MF.rule, 1);
      yield* say(T.MH_RULE);
    }
    p.clearInput();
    p.active = true;
    while (p.result === null) yield null;
    p.active = false;
    r = p.result;
    yield 700;
  } finally {
    yield* closePanel(p);
  }
  setFlag(MF[who], r);
  const after = T.MH_AFTER[who];
  yield* say(after[Math.min(after.length - 1, r - 1)]);
  if (umiBr && !flag(MF.umiBr)) {
    setFlag(MF.umiBr, 1);
    yield* say(T.MH_UMI_BR);
  }
  se('se_item', { vol: 0.5 });
  yield* say3(T.mhCount(mhShots()));
}

for (const who of WHO)
  wrap(NPC_OF[who], function* (_ctx, orig): Co {
    const f = field();
    const ready = mhOpen() && f?.map.id === 'map_umizoi' && flag(MF.futa) && !flag(MF.done) && state.inventory.includes(CAMERA);
    if (!ready) {
      yield* orig();
      return;
    }
    if (flag(MF[who])) {
      // taken: once its own word, then the person's own talk again
      const seen = `flag_mh_taken_${who}`;
      if (!flag(seen)) {
        setFlag(seen, 1);
        yield* say3(T.MH_TAKEN[who]);
        return;
      }
      yield* orig();
      return;
    }
    if (!knWith()) {
      yield* say3(T.MH_NO_KN);
      yield* orig();
      return;
    }
    yield* shoot(who);
  });

/** 7〜8 かぶりたい 物は（3枚 撮って 主人に もどる）。 */
function* finale(): Co {
  yield* say(T.MH_FIN_A);
  const all = WHO.every((w) => flag(MF[w]) === 1);
  if (all && knWith()) {
    yield* say(T.MH_FOUR_A);
    const p = new PeepPanel('four');
    try {
      yield* openPanel(p);
      yield 600;
      p.flash = 260;
      se('se_c3_photo', { vol: 0.7 });
      yield 900;
    } finally {
      yield* closePanel(p);
    }
    setFlag(MF.four, 1);
    yield* say3(T.MH_FOUR_B);
  }
  dropTools();
  setFlag(MF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.MH_REWARD);
}

// 段階2 から 先は カメラと ふたを 持ち歩かない（主人に 返す 1行は 主人に 話した とき）
registerWorldFx({
  map: '',
  update() {
    if (flag('flag_ch3_stage') >= 2 && (state.inventory.includes(CAMERA) || state.inventory.includes(FUTA)) && flag(MF.end)) dropTools();
    if (flag('flag_ch3_stage') >= 3 && (state.inventory.includes(CAMERA) || state.inventory.includes(FUTA))) dropTools();
  },
});

/** S31（ending.ts cut3Photo）：主人が 来ていて、すんで いれば「はい、みなさん、寄って ください。」の 前に 1ページ。 */
export function* mhS31(): Co {
  if (!flag(MF.done)) return;
  yield* say3(T.MH_S31);
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.mahiru(step = 'master', auto = false)（第3章の 段階1、主人が 来た あと）
 *   'master'  主人の 前 (12,31) 下向き（話すと 1）
 *   'toro'    カメラを 借りた あと、トロ箱の 前 (20,25) 上向き（2回 調べると ふた）
 *   'kaito'   カメラと ふた、カイトの 前 (57,28) 上向き
 *   'teru'    テルの 前 (10,30) 左向き
 *   'umi'     ウミの 前 (60,29) 下向き（③を ほどいた あとの 形）
 *   'fin'     3枚とも ちょうど、主人の 前（話すと 7・8 と 4枚目）
 *   'end'     撮りかけの まま 段階2、主人の 前
 *   'none'    主人が 来ていない、カイトの 前（ふつうの 台本）
 */
if (import.meta.env.DEV) {
  registerDebug('mahiru', (step = 'master', auto = false) => {
    cmd().jump?.('ch3:umizoi', true);
    for (const id of Object.values(MF)) setFlag(id, 0);
    for (const w of WHO) setFlag(`flag_mh_taken_${w}`, 0);
    qaAuto = !!auto;
    dropTools();
    setFlag('flag_ch3_stage', 1);
    const go = (x: number, y: number, d: string) => cmd().warp?.('map_umizoi', x, y, d);
    if (step === 'none') {
      setFlag(`flag_ch3_kita_${MASTER}`, 0);
      return go(57, 28, 'up');
    }
    if (!flag(`flag_ch3_kita_${MASTER}`)) {
      setFlag(`flag_ch3_kita_${MASTER}`, 1);
      setFlag('flag_ch3_kita_n', flag('flag_ch3_kita_n') + 1);
    }
    if (step === 'master') return go(12, 31, 'down');
    setFlag(MF.start, 1);
    giveKey(CAMERA);
    if (step === 'toro') return go(20, 25, 'up');
    setFlag(MF.futa, 1);
    giveKey(FUTA);
    if (step === 'kaito') return go(57, 28, 'up');
    if (step === 'teru') return go(10, 30, 'left');
    if (step === 'umi') {
      setFlag('flag_ch3_umi_done', 1);
      return go(60, 29, 'down');
    }
    for (const w of WHO) setFlag(MF[w], 1);
    if (step === 'fin') return go(12, 31, 'down');
    setFlag(MF.kaito, 2);
    setFlag(MF.umi, 0);
    setFlag('flag_ch3_stage', 2);
    return go(12, 31, 'down');
  });

  registerDebug('mhState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof PeepPanel) as PeepPanel | undefined;
    return { flags, shots: mhShots(), open: mhOpen(), items: state.inventory.filter((i) => i === CAMERA || i === FUTA), map: field()?.map.id, panel: p ? { who: p.who, angle: p.angle, result: p.result } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function mhTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '具足'];
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
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('mh', T.MH_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...MH_UI.keys, ...MH_UI.angles]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mhText', () => mhTextCheck());
