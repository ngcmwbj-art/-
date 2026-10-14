// S07 ① 市場「ひゃくえんの まま」（60_ch3_story 10.7、62 4.2、63 12.5、61 9.1）:
//
//   ツグミ〔c1_1〕→ 2回目 evt_ch3_ichiba（符丁ノートが ばらばら）→ 切れはし 5枚
//   （市場のあちこち、最低3枚。flag_ch3_fucho_<01..05>, flag_ch3_fucho_n）→ 3枚以上で
//   ツグミに話すと evt_ch3_seri: 買い手3人の手（符丁）を見て、いちばん高い人に札を
//   上げる ×3（まちがえても進む）。2回目のあと ネフダマヨイ（必須戦）。3回目のあと
//   ツグミの「はい、売った！」→ 割り箸＝部品①（flag_ch3_ichiba_done, flag_ch3_part_hashi）。
//
// The fragments, the auction ring's trigger and the buyers are added to W's
// map_c3_ichiba here; the fragments are drawn as little paper scraps (an
// anchored world fx) until W gives them a prop.

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag } from '../../game/state';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import * as T from '../../data/text/c3_story2';
import { C3_TALK } from '../../data/text/c3_events';
import { F, getKeyItem, giveKey, grace } from '../lib';
import { musicParam, se } from '../ch2/compat';
import { duckMusic } from '../../audio';
import { addToMap, c3Battle, inCh3, kita, npc, pickC3, say3 } from './common';
import { talkC3 } from './umizoi';
import { addDish } from './azemichi';
import { pgOn } from '../../world/postgame';
import { PG_FUCHO_TSUGUMI } from '../../data/text/pg_rows';

// ---------------------------------------------------------------- places (62 4.2)

/** The five scraps of ゲン's 符丁 note. */
const FUCHO_AT: [number, number][] = [
  [1, 5],
  [17, 3],
  [6, 9],
  [13, 10],
  [18, 8],
];
const fid = (i: number) => `flag_ch3_fucho_${String(i + 1).padStart(2, '0')}`;
export const fuchoN = (): number => flag('flag_ch3_fucho_n');

addToMap('map_c3_ichiba', [
  ...FUCHO_AT.map(
    ([x, y], i) =>
      ({
        t: 'obj',
        id: `obj_c3_fucho_${String(i + 1).padStart(2, '0')}`,
        x,
        y,
        flat: true,
        cond: { flag: 'flag_ch3_ichiba_start', notFlag: fid(i) },
      }) as unknown as MapObj,
  ),
  // セリの輪（62 1.6 trig_ch3_seri）: 3 scraps or more
  {
    t: 'trig', id: 'trig_ch3_seri', x: 7, y: 5, w: 6, h: 3, script: 'evt_ch3_seri',
    cond: { flag: 'flag_ch3_ichiba_start', notFlag: 'flag_ch3_ichiba_done', when: () => fuchoN() >= 3 && !flag('flag_ch3_seri_wait') },
  } as unknown as MapObj,
  { t: 'obj', id: 'obj_c3_kouika', x: 8, y: 3, face: 'up' } as unknown as MapObj,
]);

// ---------------------------------------------------------------- the scraps

for (const [i] of FUCHO_AT.entries())
  registerScript(`obj_c3_fucho_${String(i + 1).padStart(2, '0')}`, function* (): Co {
    if (flag(fid(i))) return;
    setFlag(fid(i), 1);
    const n = fuchoN() + 1;
    setFlag('flag_ch3_fucho_n', n);
    giveKey('item_c3_fucho');
    se('se_c3_fucho', { level: n - 1 });
    yield* say3(T.fuchoGot(i, n));
    // クリア後：セリのあとで拾うと、ツグミが1ページ（はじめの1回）
    if (pgOn() && flag('flag_ch3_ichiba_done') && !flag('flag_pg_fucho_tsugumi')) {
      setFlag('flag_pg_fucho_tsugumi', 1);
      yield* say3(PG_FUCHO_TSUGUMI);
    }
  });

/** The scraps lying on the wet floor: a little white paper with two pencil lines. */
registerWorldFx({
  map: 'map_c3_ichiba',
  anchored: true,
  draw(f: FieldScene, g, cx, cy, layer) {
    // （クリア後は セリのあとでも 残りの切れはしが 落ちている：05_postgame 2.3 yr_c3_fucho）
    if (layer !== 'ground' || !flag('flag_ch3_ichiba_start') || (flag('flag_ch3_ichiba_done') && !pgOn())) return;
    for (const [i, [x, y]] of FUCHO_AT.entries()) {
      if (flag(fid(i))) continue;
      const [sx, sy] = fxAt(f, x * 16 + 8, y * 16 + 11, cx, cy);
      const px = Math.round(sx) - 4;
      const py = Math.round(sy) - 3;
      g.rect(px, py, 8, 6, '#F4F1E8');
      g.rect(px + 1, py + 1, 5, 1, '#6B7186');
      g.rect(px + 1, py + 3, 4, 1, '#6B7186');
      g.rect(px + 7, py, 1, 2, '#D8D2C2');
      // a glint now and then
      if (Math.floor(game.time / 900 + i) % 4 === 0) g.rect(px + 2, py - 1, 1, 1, '#FFFFFF');
    }
  },
});

// ---------------------------------------------------------------- ツグミ・ゲン

function* talkTsugumi(): Co {
  if (flag('flag_ch3_ichiba_done')) {
    yield* say3(T.C2_TALK.npc_c3_seri_deshi);
    return;
  }
  if (!flag('flag_ch3_ichiba_start')) {
    if (!flag('flag_seen_npc_c3_seri_deshi_c1_1')) {
      pickC3('npc_c3_seri_deshi', C3_TALK.npc_c3_seri_deshi, 1);
      yield* say3(C3_TALK.npc_c3_seri_deshi.c1_1, 'npc_c3_seri_deshi');
      return;
    }
    // evt_ch3_ichiba: the second time
    yield* say3(T.S07_START);
    setFlag('flag_ch3_ichiba_start', 1);
    return;
  }
  if (fuchoN() < 3) {
    yield* say3(T.S07_MORE);
    return;
  }
  yield* evtSeri();
}
registerScript('npc_c3_seri_deshi', function* (): Co {
  if (!inCh3()) return;
  yield* talkTsugumi();
});
registerScript('evt_ch3_ichiba', function* (): Co {
  if (flag('flag_ch3_ichiba_start')) return;
  yield* say3(T.S07_START);
  setFlag('flag_ch3_ichiba_start', 1);
});
registerScript('npc_c3_seri', function* (): Co {
  if (flag('flag_ch3_ichiba_done')) yield* say3(T.C2_TALK.npc_c3_seri);
  else yield* talkC3('npc_c3_seri');
});

// ---------------------------------------------------------------- evt_ch3_seri (the auction)

/** Where the buyers stand (62 4.2): ナミエ (8,7) N, ホシミ (10,7) N, ヒロスケ (12,6) W. */
const BUYERS: [number, number, 'up' | 'left'][] = [
  [8, 7, 'up'],
  [10, 7, 'up'],
  [12, 6, 'left'],
];

function knownSigns(): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < 5; i++) if (flag(fid(i))) s.add(i);
  return s;
}

export function* evtSeri(): Co {
  if (flag('flag_ch3_ichiba_done')) return;
  setFlag('flag_ch3_seri_wait', 1);
  const f = F();
  const onMap = f.map.id === 'map_c3_ichiba';
  const staged: string[] = [];
  if (onMap) {
    yield* T_walkToStand(f);
    for (const [b, [x, y, dir]] of BUYERS.entries()) {
      const a = spawn(`c3_seri_buyer_${b}`, x, y + 3, { sprite: T.SERI_BUYER_IDS[b], dir, ghost: true });
      a.data.scripted = true;
      staged.push(a.id);
      game.scripts.run(walk(a.id, [[x, y]], { speed: 4, face: dir }));
      yield 180;
    }
    // 3.4: ハモ区長 and なんばるわん among the buyers if they came
    if (kita('npc_hoshi_kucho')) {
      const a = spawn('c3_seri_kucho', 6, 7, { sprite: 'npc_hoshi_kucho', dir: 'up', ghost: true });
      a.data.scripted = true;
      staged.push(a.id);
    }
    if (kita('npc_madam')) {
      const a = spawn('c3_seri_madam', 13, 7, { sprite: 'npc_madam', dir: 'up', ghost: true });
      a.data.scripted = true;
      staged.push(a.id);
    }
    yield 900;
  }
  yield* say3(T.S07_SERI_GO);
  yield* say3(T.S07_SERI_BUYERS);
  if (kita('npc_hoshi_kucho')) yield* say3(T.S07_SERI_KUCHO);
  if (kita('npc_madam')) yield* say3(T.S07_SERI_MADAM);
  const start = flag('flag_ch3_seri_n');
  for (let r = start; r < 3; r++) {
    if (r === 2 && !flag('flag_ch3_nefuda_beaten')) {
      const ok = yield* nefuda();
      if (!ok) {
        cleanup(staged);
        return;
      }
    }
    yield* seriRound(r);
    setFlag('flag_ch3_seri_n', r + 1);
  }
  yield* utta();
  cleanup(staged);
}

function* T_walkToStand(f: FieldScene): Co {
  const p = f.player;
  if (p.tileX !== 10 || p.tileY !== 5) yield* walk('player', [[p.tileX, 5], [10, 5]], { speed: 4 });
  p.dir = 'down';
  const ts = npc('npc_c3_seri_deshi');
  if (ts) ts.dir = 'down';
}

function cleanup(staged: string[]): void {
  for (const id of staged) despawn(id);
  setFlag('flag_ch3_seri_wait', 0);
}

/** One of the three rounds: the hands, then whom to raise the tag to. */
function* seriRound(r: number): Co {
  const round = T.SERI_ROUNDS[r];
  const known = knownSigns();
  yield* say3(T.seriAsk(r));
  // retry until right? No: wrong goes on (ツグミ「……もう 1回、見ます」) — one more look, then on
  for (let tries = 0; tries < 2; tries++) {
    const lines = round.hands.map((h, b) => T.seriHandLine(b, h, known.has(h))).join('\n');
    const opts = T.SERI_BUYER_NAMES.join(' | ');
    const i = yield* say3(`@narr\n${lines}\n? ${opts}`);
    se('se_c3_seri_fuda');
    yield 200;
    if (i === round.best) {
      se('se_confirm');
      yield* say3(T.SERI_OK);
      return;
    }
    se('se_buzzer', { vol: 0.5 });
    yield* say3(T.SERI_NG);
  }
}

/** ネフダマヨイ (必須戦, after the second round). false: a save was loaded. */
function* nefuda(): Co<boolean> {
  yield* say3(T.S07_NEFUDA);
  if ((yield* c3Battle({ enemies: ['enemy_nefuda'], background: 'bg_c3_ichiba' })) === 'load') return false;
  setFlag('flag_ch3_nefuda_beaten', 1);
  grace();
  yield 300;
  yield* say3(T.S07_AFTER_NEFUDA);
  return true;
}

/** 〔3回目のあと〕 */
function* utta(): Co {
  duckMusic(0.25, 0.6);
  yield 600;
  yield* say3(T.S07_UTTA_A);
  // (the mallet and the bell; ゲン's stopped voice ends with c3_ichiba = 1)
  se('se_c3_utta');
  yield 1000;
  yield* say3(T.S07_UTTA_B);
  se('se_c3_hashi');
  yield* getKeyItem('item_c3_hashi', T.S07_GOT_HASHI, false);
  se('se_c3_part', { level: 0 });
  setFlag('flag_ch3_ichiba_done', 1);
  setFlag('flag_ch3_part_hashi', 1);
  // 今日の 魚 goes to 食堂かもめ (S08: the first dish)
  if (flag('flag_ch3_shokudo_start') && !flag('flag_ch3_shokudo_done')) yield* addDish('sakana');
  musicParam('c3_ichiba', 1);
  yield 300;
  se('se_c3_kouika');
  yield* say3(T.S07_KOUIKA);
}

registerScript('evt_ch3_seri', function* (): Co {
  if (fuchoN() < 3 || flag('flag_ch3_ichiba_done')) return;
  yield* evtSeri();
});

// 調べる物（9.3）: コウイカの最後の1箱（ヒロスケが S07 の終わりに買っていく。メモの字の回収は S14）、セリの鐘
for (const id of ['obj_c3_kouika', 'obj_c3_seri_kane', 'obj_c3_akimise']) {
  const o = T.C3_OBJ2[id];
  registerScript(id, function* (): Co {
    se('se_examine');
    yield* say3(o.after && flag('flag_ch3_ichiba_done') ? o.after : o.text);
  });
}
