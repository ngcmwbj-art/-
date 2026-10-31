// 水槽の うら（第3章の クリア前、段階3。げむきか 10/17 の 案3、2026-10-17 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_aq_ura.ts、地図は data/maps/c3_aq.ts（map_c3_aq_ura と 入口の 東の 壁の 戸 (19,9)）、
// 絵は art/props/c3_aq.ts（prop_c3_aq_ura_shell・prop_c3_ura_*）、みました帳の ページは ui/menu/book_aqura.ts。
//
//   S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。クリア後と S20 から 先は
//   戸は 閉まった まま。順路（伝票・マフィ屋・空の 水槽・えさの 部屋）と S16〜S19 の 起動は 変えない。
//   ・売店の あとの『関係者以外』の 戸 obj_aqura_to を 調べる（1回）→ 戸が 開く（flag_aqura_open）。
//   ・うらの 物 6つ（obj_aqura_t）：① 予備水槽（2回目は 大写し「塩の 輪」）② 真水の タンク ③ 比重計 ④ ろ過槽
//     ⑤ アクリルふき ⑥ 搬入口（シャッター・台車・ヒロスケ）。どの 順でも（flag_aqura_seen_<k>）。6つで 朱肉 +2 と
//     みました帳③の すみ『水槽の うら』（flag_aqura_done）。
//   ・ヒロスケ（裏の 顔）：S17 の あと（flag_ch3_diorama_done）から S19 まで（flag_ch3_esa_done の 前）、搬入口の
//     台車の 横 (21,2) で シャッターの 小窓を 見ている（aqura_hiro。npc_hirosuke の 台本は 包まない）。
//     ②を 見ていれば 真水の 話（1回、flag_aqura_hiro）。回廊の 伝票05 を 読んでいれば もう 1ページ。
//   ・ジュンロ（sym_c3_aq_03、配管の 通路 (9,5)〜(15,5)）。みました に した あと、配管の 通路で グソっ君（1回）。
//
// QA：__game.cmd.aqura(step)、auState()、auText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import type { ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_aq_ura';
import { AU_UI } from '../../data/text/c3_aq_ura';
import { addMp, grace } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const UF = {
  open: 'flag_aqura_open',
  first: 'flag_aqura_first',
  yobi2: 'flag_aqura_yobi2',
  hiro: 'flag_aqura_hiro',
  hiro05: 'flag_aqura_hiro05',
  junroKn: 'flag_aqura_junro_kn',
  done: 'flag_aqura_done',
} as const;

const URA = 'map_c3_aq_ura';
const KINDS = ['yobi', 'tank', 'hijuu', 'roka', 'acryl', 'hannyu'] as const;
type Kind = (typeof KINDS)[number];
const seenF = (k: Kind) => `flag_aqura_seen_${k}`;

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

/** うらへ 入れる 間：段階3、S15 の あと、S20 の 前（クリア後は 閉まった まま）。 */
export function auOpen(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_aq_enter') > 0 && !flag('flag_ch3_tsugao1') && !flag('flag_ch3_clear');
}

/** ヒロスケが 搬入口に いる 間（S17 の あと 〜 S19）。 */
function hiroHere(): boolean {
  return auOpen() && flag('flag_ch3_diorama_done') > 0 && !flag('flag_ch3_esa_done');
}

function seenN(): number {
  return KINDS.filter((k) => flag(seenF(k)) > 0).length;
}

// ================================================================ 地図の 物（W の 地図に E が 足す）

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;

addToMap('map_c3_aq_iriguchi', [
  // the staff door behind the empty shop (19,9): open (a doorstop) from S15 to S20, once its note is read
  { t: 'door', id: 'door_c3_aq_suisoura', x: 19, y: 9, to: URA, tx: 1, ty: 5, dir: 'right', se: 'se_door', cond: { when: () => auOpen() && flag(UF.open) > 0 } } as unknown as MapObj,
  { t: 'obj', id: 'obj_aqura_to', x: 19, y: 9, face: 'right', script: 'obj_aqura_to' } as unknown as MapObj,
  // the light through the gap of the door held open by its stop (only while it is open)
  { t: 'prop', prop: 'prop_c3_ura_doorgap', x: 18, y: 9, cond: { when: auOpen } } as unknown as MapObj,
]);

addToMap(
  URA,
  [
    // ヒロスケ（裏の 顔）by the cart, looking out of the shutter's little window
    NPC({ id: 'aqura_hiro', sprite: 'npc_hirosuke', x: 21, y: 2, dir: 'up', script: 'aqura_hiro', cond: { when: hiroHere } }),
    // ジュンロ round the pipes' passage (61 9.5's optional enemy: the same battle as the corridor's)
    { t: 'sym', id: 'sym_c3_aq_03', enemies: ['enemy_junro'], x: 9, y: 5, dir: 'right', move: 'cone', to: [15, 5], cond: { when: auOpen }, restoreAt: [9, 5] } as unknown as MapObj,
    // after ジュンロ is in the book: グソっ君 on the pipes' passage once
    { t: 'trig', id: 'trig_aqura_junro', x: 6, y: 5, w: 12, h: 2, script: 'trig_aqura_junro', cond: { flag: 'flag_book_enemy_junro', notFlag: UF.junroKn } } as unknown as MapObj,
  ],
  ['evt_aqura_first'],
);

// ================================================================ 大写し「塩の 輪」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;

export class ShioPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;

  update(dt: number, _input: Input): void {
    this.t += dt;
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      const SX = PX + 4;
      const SY = PY + 4 + dy;
      g.clip(SX, SY, PW - 8, PH - 8, () => {
        // the back room's grey light, the empty little tank seen close
        g.rect(SX, SY, PW - 8, PH - 8, '#3A3E3A');
        g.rect(SX, SY + PH - 26, PW - 8, 18, '#5A6070');
        const gx = SX + 60;
        const gy = SY + 10;
        const gw = 210;
        const gh = 84;
        g.rect(gx - 3, gy - 3, gw + 6, gh + 6, '#6B7186');
        g.rect(gx, gy, gw, gh, '#9AB0B8');
        g.rect(gx, gy, gw, gh, '#B8CCD2', 0.5);
        // the white rings, step after step down the glass (the water went, the salt stayed)
        for (let r = 0; r < 10; r++) {
          const y = gy + 12 + r * 7;
          const c = r % 3 === 0 ? '#FFFFFF' : '#E8ECEA';
          for (let x = gx + 2; x < gx + gw - 2; x++) {
            const wob = Math.round(Math.sin(x / 13 + r) * 0.8);
            g.px(x, y + wob, c);
            if ((x + r) % 4 === 0) g.px(x, y + wob + 1, '#D8DCD8');
          }
        }
        // the salt crust on the bottom, the shine on the glass
        g.rect(gx, gy + gh - 6, gw, 6, '#E8E8E0');
        for (let x = gx; x < gx + gw; x += 3) g.px(x, gy + gh - 7, '#F8F8F4');
        g.rect(gx + 14, gy + 4, 3, gh - 12, '#F4FAFC', 0.5);
        g.rect(gx + 20, gy + 4, 1, gh - 12, '#F4FAFC', 0.4);
      });
      const tw = g.measure(AU_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, AU_UI.place, { seed: 67 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* withShio(fn: () => Co): Co {
  const p = new ShioPanel();
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

/** 見た 物を 数える（6つで ごほうび）。 */
function* seen(k: Kind): Co {
  if (flag(seenF(k))) return;
  setFlag(seenF(k), 1);
  const n = seenN();
  se('se_item', { vol: 0.4 });
  yield* say3(T.auCount(n));
  if (n >= KINDS.length && !flag(UF.done)) {
    setFlag(UF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.AU_REWARD);
  }
}

/** 売店の あとの 戸。 */
registerScript('obj_aqura_to', function* (): Co {
  se('se_examine');
  if (!auOpen()) {
    yield* say3(T.AU_TO_SHUT);
    return;
  }
  if (!flag(UF.open)) {
    setFlag(UF.open, 1);
    se('se_door', { vol: 0.4 });
    yield* say(T.AU_TO_FIRST);
    return;
  }
  yield* say3(T.AU_TO_AGAIN);
});

registerScript('evt_aqura_first', function* (): Co {
  if (!auOpen() || flag(UF.first)) return;
  setFlag(UF.first, 1);
  yield 400;
  const f = field();
  if (f?.map.objects.some((o) => o.t === 'sym' && (o as { id?: string }).id === 'sym_c3_aq_03') && !state.taken['sym_c3_aq_03']) yield* say(T.AU_FIRST_JUNRO);
});

registerScript('obj_aqura_t', function* (ctx: ScriptCtx): Co {
  const id = ctx.source;
  se('se_examine');
  if (id === 'obj_aqura_yobi') {
    if (!flag(seenF('yobi'))) yield* say(T.AU_YOBI_A);
    else if (!flag(UF.yobi2)) {
      setFlag(UF.yobi2, 1);
      yield* withShio(function* () {
        yield* say(T.AU_YOBI_B);
      });
    } else yield* say3(T.AU_YOBI_AGAIN);
    yield* seen('yobi');
  } else if (id === 'obj_aqura_tank') {
    yield* say(flag(seenF('tank')) ? T.AU_TANK_AGAIN : T.AU_TANK);
    yield* seen('tank');
  } else if (id === 'obj_aqura_hijuu') {
    yield* say(T.AU_HIJUU);
    yield* seen('hijuu');
  } else if (id === 'obj_aqura_roka') {
    yield* say(T.AU_ROKA);
    yield* seen('roka');
  } else if (id === 'obj_aqura_acryl') {
    yield* say(T.AU_ACRYL);
    yield* seen('acryl');
  } else if (id === 'obj_aqura_shutter') {
    yield* say3(T.AU_SHUTTER);
    yield* seen('hannyu');
  } else if (id === 'obj_aqura_daisha') {
    if (hiroHere()) {
      yield* hiro();
      return;
    }
    yield* say3(T.AU_HANNYU_EMPTY);
    yield* seen('hannyu');
  }
});

/** ⑥ 搬入口の ヒロスケ。 */
function* hiro(): Co {
  const f = field();
  const h = f?.actorById('aqura_hiro');
  if (flag(UF.hiro)) {
    yield* say3(T.AU_HIRO_AFTER);
    return;
  }
  if (!flag(seenF('tank'))) {
    if (h) h.dir = f!.player.x < h.x ? 'left' : 'down';
    yield* say3(T.AU_HIRO_WAIT);
    if (h) h.dir = 'up';
    yield* seen('hannyu');
    return;
  }
  setFlag(UF.hiro, 1);
  if (h) {
    h.data.scripted = true;
    h.dir = f!.player.x < h.x ? 'left' : 'down';
  }
  yield* say(T.AU_HIRO_A);
  // かくし：回廊の 伝票05『荷さばき、はじめて ほめられた』を 読んでいる（1回）
  if (flag('flag_ch3_denpyo_05') && !flag(UF.hiro05)) {
    setFlag(UF.hiro05, 1);
    yield 400;
    yield* say3(T.AU_HIRO_05);
  }
  if (h) h.dir = 'up';
  yield 400;
  yield* say(T.AU_HIRO_B);
  if (h) delete h.data.scripted;
  yield* seen('hannyu');
  grace();
}
registerScript('aqura_hiro', function* (): Co {
  yield* hiro();
});

registerScript('trig_aqura_junro', function* (): Co {
  if (flag(UF.junroKn) || !flag('flag_book_enemy_junro') || !knWith()) return;
  setFlag(UF.junroKn, 1);
  yield* say3(T.AU_JUNRO_KN);
});

// グソっ君（隊列）の ひとこと
let knN = 0;
registerScript('kanenari_' + URA, function* (): Co {
  yield* say3(`@npc_kanenari\n${T.AU_KN[knN++ % T.AU_KN.length]}`);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.aqura(step = 'to')
 *   'to'     S15 の あと（館の 中、12:00）、売店の あとの 戸の 前 (18,9) 東向き
 *   'ura'    戸を 開けた あと、うらの 西の はし (1,5)
 *   'hiro'   S17 の あと（伝票05 と ②を 見た）、搬入口の ヒロスケの 前 (21,3) 上向き
 *   'shut'   S20 の あと、戸の 前（閉まっている）
 */
if (import.meta.env.DEV) {
  registerDebug('aqura', (step = 'to') => {
    cmd().jump?.('ch3:kairo', true);
    for (const id of Object.values(UF)) setFlag(id, 0);
    for (const k of KINDS) setFlag(seenF(k), 0);
    setFlag('flag_ch3_stage', 3);
    setFlag('flag_ch3_aq_enter', 1);
    setFlag('flag_ch3_tsugao1', 0);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'shut') {
      setFlag('flag_ch3_tsugao1', 1);
      return go('map_c3_aq_iriguchi', 18, 9, 'right');
    }
    if (step === 'to') return go('map_c3_aq_iriguchi', 18, 9, 'right');
    setFlag(UF.open, 1);
    if (step === 'ura') return go(URA, 1, 5, 'right');
    setFlag(UF.first, 1);
    setFlag('flag_ch3_kairo_done', 1);
    setFlag('flag_ch3_diorama_done', 1);
    setFlag('flag_ch3_esa_done', 0);
    setFlag('flag_ch3_denpyo_05', 1);
    setFlag(seenF('tank'), 1);
    return go(URA, 21, 3, 'up');
  });

  registerDebug('auState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(UF)) flags[k] = flag(id);
    const seenK = KINDS.filter((k) => flag(seenF(k)));
    return { flags, seen: seenK, open: auOpen(), hiro: hiroHere(), map: field()?.map.id, panel: !!game.ui.widgets.find((w) => w instanceof ShioPanel) };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 「まだ」 in the new lines, no clock time; the names without さん in the narration. */
export function auTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '飼育係', '係長', '1つだけ', 'えさ', '日誌', '名札', '具足'];
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
  walkT('au', T.AU_TEXTS);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('auText', () => auTextCheck());
