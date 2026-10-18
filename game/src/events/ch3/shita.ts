// 下の 紙の 字（第3章の クリア前、段階3。げむきか 10/18 の 案3、2026-10-18 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_shita.ts、みました帳の ページは ui/menu/book_shita.ts。地図の 物は ここで 足す（W の 地図は そのまま）：
// 入口と 券売所 map_c3_aq_iriguchi の 券売所の 窓の 下の つづり (5,7)（(6,7) から 左向き）と、売店の 棚 (15,8) の
// えんぴつ（下から 上向き）。10-17 の「水槽の うら」（aq_ura.ts、東の 壁 (19,9) の 戸）とは 別の 所。
//
//   S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。クリア後と S20 から 先は 足さない。
//   ・つづり obj_shita_tsuzuri：1回目 でこぼこ（flag_sh_deko）。えんぴつを 持っていれば 大写し RubPanel（←→で 向き、
//     けっていで 1往復。寝かせて 5往復で 字が ぜんぶ 浮かぶ。立てると 黒く なって 2枚目で やりなおし：flag_sh_nimai）
//     → 台本（flag_sh_tsuzuri）。
//   ・えんぴつ obj_shita_enpitsu → 大事なもの item_c3_enpitsu（flag_sh_enpitsu）。段階4（S28 の あと）に 何も 言わずに 消える。
//   ・回廊の 伝票01・白紙の 日：えんぴつを 持って、2回目に 調べると こする（flag_sh_01・flag_sh_hakushi）。
//   ・こすった 物 3つで 朱肉 +2、みました帳③の すみ（flag_sh_done）。
//   ・かくし：つづりの あと、回廊の 丸い 字の 伝票（08・09・12）で グソっ君の 1行（flag_sh_maru）。
//   ・S19 の 最後（aq.ts の 鍵の 場面、〔札〕の あと）に 1ページ（flag_sh_s19）：ESA_KEY_HOOKS。
//
// QA：__game.cmd.shita(step, auto)、shState()、shText()

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
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_shita';
import { SH_UI } from '../../data/text/c3_shita';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';
import { ESA_KEY_HOOKS } from './aq';

export const SF = {
  deko: 'flag_sh_deko',
  enpitsu: 'flag_sh_enpitsu',
  rule: 'flag_sh_rule',
  tsuzuri: 'flag_sh_tsuzuri',
  nimai: 'flag_sh_nimai',
  one: 'flag_sh_01',
  hakushi: 'flag_sh_hakushi',
  maru: 'flag_sh_maru',
  s19: 'flag_sh_s19',
  done: 'flag_sh_done',
} as const;

const IRIGUCHI = 'map_c3_aq_iriguchi';
const ITEM = 'item_c3_enpitsu';

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

/** こすれる 間：段階3、S15 の あと、S20 の 前（クリア後は 足さない）。 */
export function shOpen(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_aq_enter') > 0 && !flag('flag_ch3_tsugao1') && !flag('flag_ch3_clear');
}

function hasPencil(): boolean {
  return state.inventory.includes(ITEM);
}

export function shCountN(): number {
  return [SF.tsuzuri, SF.one, SF.hakushi].filter((f) => flag(f) > 0).length;
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

// ================================================================ 地図の 物（W の 地図に 足す）

addToMap(IRIGUCHI, [
  // the pad of tickets under the booth's window (examined from (6,7) facing west; over the window's own text)
  { t: 'obj', id: 'obj_shita_tsuzuri', x: 5, y: 7, face: 'left', priority: 2, script: 'obj_shita_tsuzuri' } as unknown as MapObj,
  // the shop's shelf: the unsold penguin pencils (from below, facing up)
  { t: 'obj', id: 'obj_shita_enpitsu', x: 15, y: 8, w: 2, face: 'up', script: 'obj_shita_enpitsu' } as unknown as MapObj,
]);

// ================================================================ 大写し「つづりの 1枚目」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 226;
/** 寝かせて この 回数で 字が ぜんぶ 浮かぶ。 */
const RUBS = 5;

export class RubPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  result: 'ok' | 'ruined' | 'cancel' | null = null;
  /** 2枚目（字が うすい）。 */
  second: boolean;
  /** 寝かせる（true）・立てる。 */
  lie = true;
  rubs = 0;
  ruined = false;
  /** 今 こすっている（ms、1往復）。 */
  stroke = 0;
  private ePress = false;
  private eCancel = false;

  constructor(second: boolean) {
    this.second = second;
  }

  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.stroke > 0) {
      this.stroke = Math.max(0, this.stroke - dt);
      if (this.stroke === 0) this.afterStroke();
      return;
    }
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (!this.active || this.result) return;
    if (this.eCancel) {
      this.eCancel = false;
      this.result = 'cancel';
      return;
    }
    if (this.auto) {
      this.lie = true;
      this.ePress = true;
    } else if (input.pressed('left') || input.pressed('right')) {
      this.lie = !this.lie;
      se('se_cursor', { vol: 0.3 });
    }
    if (this.ePress) {
      this.ePress = false;
      this.stroke = 420;
      se('se_pen_write', { vol: 0.35, pitch: this.lie ? 0.8 : 1.2 });
    }
  }

  private afterStroke(): void {
    if (!this.lie) {
      this.ruined = true;
      this.result = 'ruined';
      return;
    }
    this.rubs++;
    if (this.rubs >= RUBS) this.result = 'ok';
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
        // the booth's counter, the pad of tickets on it
        g.rect(SX, oy, CW, CH, '#5A4A3A');
        for (let x = 0; x < CW; x += 9) g.rect(SX + x, oy, 1, CH, '#4E4032');
        const px = SX + 10;
        const py = oy + 8;
        const pw = 212;
        const ph = CH - 16;
        // the sheets under it (their edges), the top sheet
        g.rect(px + 3, py + 3, pw, ph, '#D8D2C2');
        g.rect(px + 1, py + 1, pw, ph, '#E8E2D2');
        g.rect(px, py, pw, ph, '#F8F4EA');
        g.rect(px, py, pw, 12, '#E8C8C0');
        g.rect(px, py + 12, pw, 1, '#C8A8A0');
        // the graphite: how far it has been rubbed (a stroke grows it across)
        const done = this.ruined ? 1 : Math.min(1, (this.rubs + (this.stroke > 0 && this.lie ? 1 - this.stroke / 420 : 0)) / RUBS);
        const gx = px + 4;
        const gy = py + 14;
        const gw = pw - 8;
        const gh = ph - 16;
        const shade = this.ruined ? '#2A2A30' : '#6A6A74';
        g.rect(gx, gy, Math.round(gw * Math.min(1, done * 1.2)), gh, shade, this.ruined ? 0.95 : 0.15 + 0.55 * done);
        // the white letters in the graphite (the dents the pencil skipped)
        if (!this.ruined && done > 0.15) {
          const la = Math.min(1, (done - 0.15) / 0.7) * (this.second ? 0.6 : 1);
          g.alpha(la, () => {
            SH_UI.lines.forEach((l, i) => g.text(l, gx + 4, gy + 1 + i * 15, { color: '#FFFFFF' }));
            // the crossed-out line in the bottom corner, and three little bird's feet
            const kx = gx + gw - g.measure(SH_UI.kesi) - 6;
            const ky = gy + gh - 16;
            g.text(SH_UI.kesi, kx, ky, { color: '#F0F0F4' });
            g.rect(kx - 2, ky + 7, g.measure(SH_UI.kesi) + 4, 1, '#F8F8FA');
            for (let f = 0; f < 3; f++) {
              const fx = gx + 10 + f * 12;
              const fy = gy + gh - 8 - (f % 2) * 3;
              g.line(fx, fy, fx - 2, fy - 3, '#FFFFFF');
              g.line(fx, fy, fx, fy - 4, '#FFFFFF');
              g.line(fx, fy, fx + 2, fy - 3, '#FFFFFF');
            }
          });
        }
        // the pencil: laid flat or stood up, moving across while it rubs
        const s = this.stroke > 0 ? 1 - this.stroke / 420 : 0;
        const pxp = gx + 20 + Math.round(Math.sin(s * Math.PI) * 120);
        const pyp = gy + 30;
        // (put down once the letters are all up)
        if (this.result === 'ok') {
          // nothing in the way of the letters
        } else if (this.lie) {
          g.line(pxp, pyp + 12, pxp + 46, pyp - 4, '#E8C040');
          g.line(pxp, pyp + 13, pxp + 46, pyp - 3, '#C8A030');
          g.line(pxp - 4, pyp + 14, pxp, pyp + 12, '#3A3440');
          g.rect(pxp + 46, pyp - 9, 6, 6, '#2A2440');
          g.px(pxp + 48, pyp - 8, '#FFFFFF');
        } else {
          g.rect(pxp, pyp - 30, 3, 40, '#E8C040');
          g.rect(pxp + 2, pyp - 30, 1, 40, '#C8A030');
          g.rect(pxp + 1, pyp + 10, 1, 3, '#3A3440');
          g.rect(pxp - 1, pyp - 37, 6, 7, '#2A2440');
          g.px(pxp + 1, pyp - 35, '#FFFFFF');
        }
        // the right column: the pencil's way, the strokes, the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(this.lie ? SH_UI.lie : SH_UI.stand, RX, oy + 4, { color: '#F4ECD8' });
        for (let i = 0; i < RUBS; i++) g.rect(RX + i * 12, oy + 26, 9, 4, i < this.rubs ? '#FFE7A3' : '#1A1626');
        if (this.active) SH_UI.keys.forEach((l, i) => g.text(l, RX, oy + 44 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const place = this.second ? SH_UI.place2 : SH_UI.place;
      const tw = g.measure(place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, place, { seed: 75 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: RubPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: RubPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

/** 1枚 こする（'ok' 字が 浮かんだ・'ruined' 黒く なった・'cancel'）。字が 浮かんだら 台本の 文を 大写しの 上で。 */
function* rubSheet(second: boolean): Co<'ok' | 'ruined' | 'cancel'> {
  const p = new RubPanel(second);
  p.auto = qaAuto;
  let r: 'ok' | 'ruined' | 'cancel' = 'cancel';
  try {
    yield* openPanel(p);
    if (!flag(SF.rule)) {
      setFlag(SF.rule, 1);
      yield* say(T.SH_RUB_RULE);
    }
    p.clearInput();
    p.active = true;
    while (!p.result) yield null;
    p.active = false;
    r = p.result;
    yield 400;
    if (r === 'ruined') yield* say(knWith() ? T.SH_RUINED : T.SH_RUINED_SOLO);
    if (r === 'ok') {
      yield* say(T.SH_DAIHON_A);
      yield* say(T.SH_DAIHON_B);
      yield* say(T.SH_DAIHON_C);
    }
  } finally {
    yield* closePanel(p);
  }
  return r;
}

/** こすった 物を 数える（3つで ごほうび）。 */
function* counted(id: string): Co {
  if (flag(id)) return;
  setFlag(id, 1);
  const n = shCountN();
  se('se_item', { vol: 0.5 });
  yield* say3(T.shCount(n));
  if (n >= 3 && !flag(SF.done)) {
    setFlag(SF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.SH_REWARD);
  }
}

registerScript('obj_shita_tsuzuri', function* (): Co {
  se('se_examine');
  if (!shOpen()) {
    yield* say3(T.SH_TSUZURI_SHUT);
    return;
  }
  if (flag(SF.tsuzuri)) {
    yield* say3(T.SH_TSUZURI_AFTER);
    return;
  }
  if (!flag(SF.deko)) {
    setFlag(SF.deko, 1);
    yield* say(T.SH_DEKO);
    return;
  }
  if (!hasPencil()) {
    yield* say3(T.SH_DEKO_AGAIN);
    return;
  }
  yield* say3(T.SH_RUB_START);
  let r = yield* rubSheet(flag(SF.nimai) > 0);
  if (r === 'ruined') {
    setFlag(SF.nimai, 1);
    r = yield* rubSheet(true);
  }
  if (r === 'cancel' || r === 'ruined') {
    yield* say3(T.SH_STOP);
    return;
  }
  yield* counted(SF.tsuzuri);
});

registerScript('obj_shita_enpitsu', function* (): Co {
  se('se_examine');
  if (!shOpen() || flag(SF.enpitsu)) {
    yield* say3(T.SH_TANA);
    return;
  }
  setFlag(SF.enpitsu, 1);
  yield* say3(T.SH_ENPITSU);
  yield* getKeyItem(ITEM, T.SH_GET_ENPITSU, false);
  yield* say(T.SH_ENPITSU_KN);
});

// ---- 回廊で こする（今の 調べる 物の 2回目。えんぴつを 持っている とき）

wrap('obj_c3_denpyo_01', function* (_ctx, orig): Co {
  const before = flag('flag_ch3_denpyo_01');
  yield* orig();
  if (!before || !shOpen() || !hasPencil() || flag(SF.one)) return;
  yield* say(T.SH_01);
  yield* counted(SF.one);
});

let hakushiN = 0;
wrap('obj_c3_denpyo_hakushi', function* (_ctx, orig): Co {
  yield* orig();
  if (!shOpen() || !hasPencil() || flag(SF.hakushi)) return;
  // (the 2nd look: it was looked at before — ヒロスケ taps it at the end of S16 — or once already with the pencil.
  // ふしぎ③ 07's wrapper shows its after-text on every other look without coming here: the next look that does rubs)
  if (++hakushiN < 2 && !flag('flag_ch3_kairo_done')) return;
  yield* say(knWith() ? T.SH_HAKUSHI : T.SH_HAKUSHI_SOLO);
  yield* counted(SF.hakushi);
});

// かくし：丸い 字の 伝票（08・09・12）を、つづりを こすった あとに 読む（1回）
for (const id of ['obj_c3_denpyo_08', 'obj_c3_denpyo_09', 'obj_c3_denpyo_12'])
  wrap(id, function* (_ctx, orig): Co {
    yield* orig();
    if (!flag(SF.tsuzuri) || flag(SF.maru) || !knWith() || !inCh3()) return;
    setFlag(SF.maru, 1);
    yield* say(T.SH_MARU);
  });

// ---- S19 の 最後（鍵と〔札〕の あと、「鍵を 受けとった！」の 前）

ESA_KEY_HOOKS.push(function* (): Co {
  if (!flag(SF.tsuzuri) || flag(SF.s19)) return;
  setFlag(SF.s19, 1);
  yield* say(T.SH_S19);
});

// ---- えんぴつは 段階4（S28 の あと）に 何も 言わずに 大事なものから 消える

registerWorldFx({
  map: '',
  update() {
    if (flag('flag_ch3_stage') >= 4 && state.inventory.includes(ITEM)) removeItem(ITEM);
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.shita(step = 'deko', auto = false)
 *   'deko'     S15 の あと（館の 中、12:00）、つづりの 前 (6,7) 左向き
 *   'enpitsu'  でこぼこを 見た あと、売店の 棚の 前 (15,9) 上向き
 *   'rub'      えんぴつを 持って、つづりの 前（こする）
 *   'kairo'    つづりを こすった あと、回廊の 伝票01 の 前 (4,3) 上向き（伝票01 は 読んだ ことに）
 *   'hakushi'  回廊の 白紙の 日の 前 (38,3) 上向き
 *   'esa'      S19：えさの 部屋、ポコシャの 前（鍵の 場面。つづりは こすった）
 */
if (import.meta.env.DEV) {
  registerDebug('shita', (step = 'deko', auto = false) => {
    if (step === 'esa') {
      const r = cmd().jump?.('ch3:esa', true);
      for (const id of [SF.deko, SF.enpitsu, SF.tsuzuri]) setFlag(id, 1);
      setFlag(SF.s19, 0);
      if (!hasPencil()) giveKey(ITEM);
      return r;
    }
    cmd().jump?.('ch3:kairo', true);
    for (const id of Object.values(SF)) setFlag(id, 0);
    hakushiN = 0;
    qaAuto = !!auto;
    while (state.inventory.includes(ITEM)) removeItem(ITEM);
    setFlag('flag_ch3_stage', 3);
    setFlag('flag_ch3_aq_enter', 1);
    setFlag('flag_ch3_tsugao1', 0);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'deko') return go(IRIGUCHI, 6, 7, 'left');
    setFlag(SF.deko, 1);
    if (step === 'enpitsu') return go(IRIGUCHI, 15, 9, 'up');
    setFlag(SF.enpitsu, 1);
    giveKey(ITEM);
    if (step === 'rub') return go(IRIGUCHI, 6, 7, 'left');
    setFlag(SF.tsuzuri, 1);
    setFlag('flag_ch3_denpyo_01', 1);
    if (step === 'kairo') return go('map_c3_aq_kairo', 4, 3, 'up');
    return go('map_c3_aq_kairo', 38, 3, 'up');
  });

  registerDebug('shState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(SF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof RubPanel) as RubPanel | undefined;
    return { flags, n: shCountN(), open: shOpen(), pencil: hasPencil(), map: field()?.map.id, panel: p ? { lie: p.lie, rubs: p.rubs, ruined: p.ruined, second: p.second, result: p.result } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; before S19 not the words of S19; no clock time; the names without さん in the narration. */
export function shTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown, banned: string[]) => {
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
        for (const b of banned) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x, banned));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x, banned);
  };
  walkT('sh', T.SH_TEXTS, ['平和', '飼育係', '係長', '1つだけ', 'えさ', '日誌', '8月30日', '具足']);
  walkT('shS19', T.SH_TEXTS_S19, ['平和']);
  // the panel's words in their room (the paper 208 px, the right column)
  const g = SX + CW - RX - 2;
  for (const l of [...SH_UI.keys, SH_UI.lie, SH_UI.stand]) if (measure(l) > g) bad.push(`右の 列: ${measure(l)}px > ${g}: ${l}`);
  if (1 + SH_UI.lines.length * 15 > 80 - 16) bad.push('紙: 行が 消した 字に かかる');
  for (const l of SH_UI.lines) if (measure(l) + 8 > 204) bad.push(`紙: ${measure(l)}px: ${l}`);
  if (44 + SH_UI.keys.length * 16 > CH) bad.push('keys: too low');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('shText', () => shTextCheck());
