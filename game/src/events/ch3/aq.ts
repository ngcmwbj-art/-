// 旧水族館（60_ch3_story 10.15〜10.20、62 4.8〜4.15・1.4・1.6、63 12.13〜12.15）:
//
//   S15 案A の荷台が岬に着く → ポコシャが ガラス戸を開ける → 館の中は 12:00
//       （flag_ch3_stage=3）→ 入館券（flag_ch3_aq_enter）。券売所の窓でセーブ（S15〜S19）。
//   S16 回廊：伝票のメモ12枚（flag_ch3_denpyo_<NN>・_n、最低4枚）→ 東のはしでヒロスケ
//       （trig_ch3_kairo_end）→ 白紙の日（8月30日）→ flag_ch3_kairo_done。
//   S17 ジオラマ：3つの模型を調べるたびに、しゅんが話しかけた人の人形が1体光る
//       （flag_ch3_diorama_n 最大10、ゆれ1・ゆれ2）→ マフィ屋（必須）→ flag_ch3_diorama_done。
//   S18 深海の展示室：グソっ君が しゅんの1マス前を歩く（道は部屋の床から毎回たどる）、
//       分かれ道の声・まちがえた声・館内放送、飼育日誌の切れはし6枚（任意）、
//       空の水槽（trig_ch3_shinkai_tank）→ flag_ch3_shinkai_done（出口の戸まで先頭のまま）。
//   S19 えさの部屋：ポコシャの話（入ると）、えさの札（任意。flag_ch3_esa_fuda）、
//       ポコシャに話すと鍵（item_c3_hall_key、flag_ch3_esa_done）→ オートセーブ。
//   S20 ホール：長いすの前（trig_ch3_hall）→ ツガオ → 初戦（B。必ず終わる負け戦）→
//       捕らわれる（flag_ch3_tsugao1）→ えさの倉庫（souko.ts の S21 へ）。
//
// W の地図（data/maps/c3_aq.ts）の物と人は W の id のまま。ここはその文と動きと、
// 62 1.6 の trig_ch3_* を足す。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { addItem, flag, setFlag, state, type Dir } from '../../game/state';
import { duckMusic, playBgm, stopBgm } from '../../audio';
import { despawn, registerScript, setSprite, spawn, walk } from '../../world/api';
import { getScript } from '../../world/scripts';
import { getMapDef, hasMap } from '../../world/maps';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import type { Actor } from '../../world/actor';
import { SPEAKERS, speakerOf } from '../../world/msg';
import { hasChar } from '../../art/chars/registry';
import { startBattle } from '../../battle/api';
import { getEnemy } from '../../data/battle';
import { showBubble } from '../../ui/bubble';
import { saveConfirm, saveWithStamp } from '../../ui/save';
import { autosaveSoon } from '../../ui/autosave';
import { C3_NAMES } from '../../data/text/c3_names';
import * as T from '../../data/text/c3_story3';
import { F, grace, tileFree } from '../lib';
import { ambVol, se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';
import { jumpMap } from './prologue';
import { KITA } from './azemichi';
import { capturedToSouko } from './souko';

// ---------------------------------------------------------------- speakers (60 0.4)

SPEAKERS.npc_yakisoban = { name: 'ヤキソバン', voice: 'maruyama' };
SPEAKERS.npc_dakoku = { name: 'エゴ', voice: 'dakoku' };

const AQ = (id: string) => id.startsWith('map_c3_aq');
export const inAq = (): boolean => inCh3() && AQ(F().map.id);

/** Turn an actor (no walking). */
function faceTo(a: Actor | null | undefined, d: Dir): void {
  if (a) a.dir = d;
}

/** A sprite that may not be drawn yet (W's art comes in parallel): fall back. */
function sprite(id: string, fallback: string): string {
  return hasChar(id) ? id : fallback;
}

/** グソっ君 held by the scene (no following) / let go. */
function holdKn(on: boolean): Actor | null {
  const kn = F().actorById('kanenari') ?? null;
  if (kn) {
    if (on) kn.data.scripted = true;
    else delete kn.data.scripted;
  }
  return kn;
}

// ================================================================ S15 evt_ch3_aq_enter

/**
 * From S14's arrival in front of the old aquarium (map_umizoi (73,30), facing
 * up, the screen just faded in): ポコシャ opens the tailgate and the glass door,
 * しゅん and グソっ君 go in.
 */
export function* aqArrive(): Co {
  const f = F();
  if (flag('flag_ch3_aq_enter')) return;
  if (f.map.id !== 'map_umizoi') {
    yield* aqInside();
    return;
  }
  // the tailgate (the truck stands at (69–71,30–31), facing north)
  se('se_truck_aori');
  const po = spawn('c3_aq_pokosha', 72, 31, { sprite: 'npc_pokosha', dir: 'up', ghost: true });
  po.data.scripted = true;
  yield 500;
  yield* walk('c3_aq_pokosha', [[72, 29], [74, 29]], { speed: 2.4, face: 'up' });
  se('se_c3_aq_door');
  yield 400;
  despawn('c3_aq_pokosha');
  yield 300;
  yield* goInside();
}

/** Through the glass door: inside it is 12:00 again (stage 3). */
function* goInside(): Co {
  const f = F();
  const p = f.player;
  if (p.tileX !== 74 || p.tileY !== 29) yield* walk('player', [[p.tileX, 29], [74, 29]], { speed: 2.8, face: 'up' });
  se('se_door_glass');
  yield* game.fadeOut(400, '#0B0B14');
  setFlag('flag_ch3_stage', 3);
  if (hasMap('map_c3_aq_iriguchi')) {
    jumpMap('map_c3_aq_iriguchi', 7, 10, 'up');
    f.syncFollower(true);
  }
  yield 200;
  yield* game.fadeIn(600);
  yield* aqInside();
}

/** Inside the glass door (60 10.15): ポコシャ, the notice, the ticket. */
function* aqInside(): Co {
  const f = F();
  if (flag('flag_ch3_aq_enter')) return;
  const po = spawn('c3_aq_pokosha', 7, 8, { sprite: 'npc_pokosha', dir: 'down', ghost: true });
  po.data.scripted = true;
  yield 400;
  yield* say3(T.S15_A);
  // the notice on the glass door behind them
  f.player.dir = 'down';
  yield 400;
  yield* say3(T.S15_HARIGAMI);
  f.player.dir = 'up';
  yield 300;
  yield* say3(T.S15_B);
  se('se_c3_aq_ticket');
  yield 300;
  addItem('item_c3_nyukanken');
  se('se_item', { vol: 0.6 });
  yield* say3(T.S15_GOT);
  yield* say3(T.S15_KEN);
  // into the ticket booth's back (60: 券売所の奥へ消える)
  yield* walk('c3_aq_pokosha', [[7, 7], [6, 7]], { speed: 2.0, face: 'left' });
  yield 200;
  despawn('c3_aq_pokosha');
  setFlag('flag_ch3_aq_enter', 1);
  grace();
}

registerScript('evt_ch3_aq_enter', function* (): Co {
  if (inCh3() && flag('flag_ch3_truck_trap') && !flag('flag_ch3_aq_enter')) yield* aqArrive();
});
// a save made between S14 and S15 (the town, the door shut): pushing into the glass door
addToMap('map_umizoi', [
  { t: 'trig', id: 'trig_ch3_aq_door', x: 74, y: 29, w: 2, h: 1, on: 'bump', script: 'trig_ch3_aq_door', cond: { flag: 'flag_ch3_truck_trap', notFlag: 'flag_ch3_aq_enter' } } as unknown as MapObj,
]);
registerScript('trig_ch3_aq_door', function* (): Co {
  if (!flag('flag_ch3_truck_trap') || flag('flag_ch3_aq_enter')) return;
  yield* goInside();
});

// 券売所の窓：セーブ（10.32。S15〜S19）
registerScript('obj_c3_aq_ticket', function* (): Co {
  se('se_examine');
  yield* say3(T.AQ_OBJ.obj_c3_aq_ticket);
  if (!flag('flag_ch3_aq_enter')) return;
  const yes = yield* saveConfirm('narr', { text: T.SAVE_TICKET, options: T.SAVE_TICKET_OPTIONS });
  if (!yes) return;
  se('se_stamp', { vol: 0.6 });
  const ok = yield* saveWithStamp();
  if (ok) yield* say3(T.SAVE_TICKET_DONE);
});
registerScript('obj_c3_aq_glass_out_shut', function* (): Co {
  yield* say3(T.AQ_GLASS_SHUT);
});

// the plain things of the old aquarium (9.5)
for (const id of ['obj_c3_aq_penguin', 'obj_c3_aq_speaker', 'obj_c3_hall_suisou', 'obj_c3_hall_bench', 'obj_c3_hall_pack', 'obj_c3_esa_board', 'obj_c3_esa_clock', 'obj_c3_esa_bucket'])
  registerScript(id, function* (): Co {
    se('se_examine');
    yield* say3(T.AQ_OBJ[id]);
  });

// ================================================================ S16 回廊「40年の 伝票」

const NN = (i: number) => String(i + 1).padStart(2, '0');
/** 60 5.4: 伝票 4/12 is enough. */
const DENPYO_MIN = 4;

for (let i = 0; i < 12; i++) {
  registerScript(`obj_c3_denpyo_${NN(i)}`, function* (): Co {
    se('se_c3_aq_denpyo');
    yield* say3(T.denpyoRead(i));
    const f = `flag_ch3_denpyo_${NN(i)}`;
    if (flag(f)) return;
    setFlag(f, 1);
    const n = flag('flag_ch3_denpyo_n') + 1;
    setFlag('flag_ch3_denpyo_n', n);
    // the three hands: the first other one, then the second (60 S16)
    const ji = T.DENPYO[i].ji;
    if (ji !== 'futoi' && !flag(`flag_c3_ji_${ji}`)) {
      const second = !!flag(`flag_c3_ji_${ji === 'hosoi' ? 'marui' : 'hosoi'}`);
      setFlag(`flag_c3_ji_${ji}`, 1);
      yield* say3(T.denpyoJi(ji, second));
    }
    if (!state.inventory.includes('item_c3_denpyo')) addItem('item_c3_denpyo');
    se('se_item', { vol: 0.5 });
    yield* say3(T.denpyoGot(n));
    if (T.DENPYO_SHIRUSHI[i]) yield* say3(T.DENPYO_SHIRUSHI[i]);
    if (i === 11) yield* say3(T.DENPYO_12_KN);
    // the fourth one read right beside ヒロスケ (the last slips): he speaks now
    if (n === DENPYO_MIN && F().player.tileX >= 34 && !flag('flag_ch3_kairo_done')) yield* kairoEnd();
  });
}
registerScript('obj_c3_denpyo_hakushi', function* (): Co {
  se('se_c3_aq_hakushi');
  yield* say3(T.DENPYO_HAKUSHI);
});

function* kairoEnd(fromTrig = false): Co {
  const f = F();
  const hiro = f.actorById('npc_hirosuke');
  if (flag('flag_ch3_denpyo_n') < DENPYO_MIN) {
    faceTo(hiro, 'left');
    // walking by (the last slips are read from right beside him): a word only
    if (fromTrig) showBubble('npc_hirosuke', T.KAIRO_MORE_BUBBLE, 2200);
    else yield* say3(T.KAIRO_MORE);
    return;
  }
  const p = f.player;
  // stand west of him, by the wall of slips
  if (p.tileX !== 35 || p.tileY !== 4) yield* walk('player', [[35, p.tileY], [35, 4]], { speed: 3, face: 'right' });
  p.dir = 'right';
  faceTo(hiro, 'left');
  yield* say3(T.KAIRO_A);
  // he taps the blank slip of 8月30日 (38,2)
  if (hiro) {
    hiro.data.scripted = true;
    yield* walk('npc_hirosuke', [[38, 4], [38, 3]], { speed: 2.4, face: 'up' });
  }
  se('se_c3_aq_hakushi');
  p.dir = 'up';
  yield 400;
  yield* say3(T.KAIRO_HAKUSHI);
  if (hiro) hiro.dir = 'left';
  p.dir = 'right';
  yield* say3(T.KAIRO_B);
  setFlag('flag_ch3_kairo_done', 1);
  // on through the east end, ahead of them
  if (hiro) {
    yield* walk('npc_hirosuke', [[38, 3]], { speed: 2.6, face: 'right' });
    hiro.visible = false;
    // (his cond is over now: the map takes him off)
    delete hiro.data.scripted;
  }
  se('se_step_tile', { vol: 0.4 });
  grace();
}
addToMap('map_c3_aq_kairo', [
  { t: 'trig', id: 'trig_ch3_kairo_end', x: 34, y: 3, w: 5, h: 3, script: 'trig_ch3_kairo_end', cond: { notFlag: 'flag_ch3_kairo_done' } } as unknown as MapObj,
]);
registerScript('trig_ch3_kairo_end', function* (): Co {
  if (inCh3() && !flag('flag_ch3_kairo_done')) yield* kairoEnd(true);
});
registerScript('obj_c3_aq_diorama_shut', function* (): Co {
  if (inCh3() && !flag('flag_ch3_kairo_done')) yield* kairoEnd();
});

// ヒロスケ in the old aquarium (his chapter-2 talk elsewhere)
const hiroBefore = getScript('npc_hirosuke');
registerScript('npc_hirosuke', function* (ctx): Co {
  const m = F().map.id;
  if (inCh3() && m === 'map_c3_aq_kairo' && !flag('flag_ch3_kairo_done')) {
    yield* kairoEnd();
    return;
  }
  if (inCh3() && m === 'map_c3_aq_diorama' && !flag('flag_ch3_diorama_done')) {
    yield* say3(T.DIORAMA_HIRO);
    return;
  }
  if (inCh3() && m === 'map_c3_aq_rouka' && !flag('flag_ch3_hp_beaten')) {
    const hp = getScript('trig_ch3_hp');
    if (hp) yield* hp(ctx);
    return;
  }
  if (hiroBefore) yield* hiroBefore(ctx);
});

// ================================================================ S17 ジオラマの部屋

type Town = 'yunari' | 'hoshi' | 'umi';

/** The people of each model しゅん talked to (60 3.4 / C3_NAMES), in the table's order. */
function dollsOf(town: Town): string[] {
  const talked = (id: string) => !!flag(`flag_talked_${id}`);
  if (town === 'umi') return Object.keys(C3_NAMES).filter((id) => !id.startsWith('npc_c3_kid_') && talked(id));
  const ids = KITA.map((k) => k.id).filter((id) => (town === 'hoshi') === id.startsWith('npc_hoshi_'));
  return ids.filter(talked);
}

const DOLL_MAX = 10;

function* diorama(town: Town): Co {
  se('se_examine');
  yield* say3(T.DIORAMA_TOWN[town]);
  const all = dollsOf(town);
  if (!all.length) {
    yield* say3(T.DOLL_NONE);
    return;
  }
  const next = all.find((id) => !flag(`flag_ch3_doll_${id}`));
  const n = flag('flag_ch3_diorama_n');
  if (!next || n >= DOLL_MAX) {
    yield* say3(T.DOLL_ALL);
    return;
  }
  setFlag(`flag_ch3_doll_${next}`, 1);
  setFlag('flag_ch3_diorama_n', n + 1);
  se('se_c3_aq_ningyo');
  yield* say3(T.dollLine(speakerOf(next).name ?? ''));
  yield* say3(T.dollCount(n + 1));
  // ヒロスケ wavers (3 and 6 lit), while he is there
  if (flag('flag_ch3_diorama_done')) return;
  if (n + 1 >= 3 && !flag('flag_c3_diorama_yure1')) {
    setFlag('flag_c3_diorama_yure1', 1);
    yield* say3(T.DIORAMA_YURE1);
  } else if (n + 1 >= 6 && !flag('flag_c3_diorama_yure2')) {
    setFlag('flag_c3_diorama_yure2', 1);
    yield* say3(T.DIORAMA_YURE2);
  }
}
for (const town of ['yunari', 'hoshi', 'umi'] as const)
  registerScript(`obj_c3_diorama_${town}`, function* (): Co {
    yield* diorama(town);
  });

registerScript('obj_c3_diorama_clock', function* (): Co {
  se('se_examine');
  yield* say3(T.DIORAMA_CLOCK);
});

/** 〔マフィ屋〕 the model's corner shop (required). */
registerScript('obj_c3_diorama_mafiya', function* (): Co {
  se('se_examine');
  if (flag('flag_ch3_diorama_done') || !inCh3()) {
    yield* say3(T.MAFIYA_AGAIN);
    return;
  }
  const f = F();
  const hiro = f.actorById('npc_hirosuke');
  if (hiro) {
    hiro.data.scripted = true;
    // he comes over to the corner
    yield* walk('npc_hirosuke', [[5, 11], [5, 7]], { speed: 2.4, face: 'left' });
  }
  ambVol('amb_c3_aq_diorama', 0.6, 0.6);
  yield* say3(T.MAFIYA_A);
  if (hiro) hiro.dir = 'right';
  yield 600;
  yield* say3(T.MAFIYA_NUGUU);
  yield 600;
  yield* say3(T.MAFIYA_B);
  ambVol('amb_c3_aq_diorama', 1, 0.6);
  setFlag('flag_ch3_mafiya', 1);
  setFlag('flag_ch3_diorama_done', 1);
  // he steps aside from the black curtain and goes on ahead (60: 奥の扉の前からどく)
  if (hiro) {
    yield* walk('npc_hirosuke', [[5, 7], [5, 3], [22, 3]], { speed: 2.8, face: 'right' });
    hiro.visible = false;
    delete hiro.data.scripted;
  }
  grace();
});

// マフィ屋 (3,6) lies inside 夕鳴町's model (3–7,4–6): examined from (3,7) it must win over the model
{
  const def = getMapDef('map_c3_aq_diorama');
  const o = def?.objects.find((x) => x.t === 'obj' && x.id === 'obj_c3_diorama_mafiya') as { priority?: number } | undefined;
  if (o && !(o.priority! > 0)) o.priority = 1;
}

registerScript('evt_ch3_diorama', function* (): Co {
  if (!inCh3() || flag('flag_ch3_diorama_done') || flag('flag_c3_diorama_in')) return;
  setFlag('flag_c3_diorama_in', 1);
  yield 400;
  F().player.dir = 'right';
  yield* say3(T.DIORAMA_A);
});
registerScript('obj_c3_aq_shinkai_shut', function* (): Co {
  yield* say3(T.DIORAMA_DOOR_SHUT);
});

// ================================================================ S18 深海の展示室

const TANK: [number, number] = [12, 2];
const EXIT: [number, number] = [1, 2];

/** Tile distances to `goal` over the room's floor (4-way). */
function distField(goal: [number, number]): Map<string, number> {
  const d = new Map<string, number>();
  const k = (x: number, y: number) => `${x},${y}`;
  d.set(k(goal[0], goal[1]), 0);
  const q: [number, number][] = [goal];
  const f = F();
  while (q.length) {
    const [x, y] = q.shift()!;
    const v = d.get(k(x, y))!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= f.map.w || ny >= f.map.h || d.has(k(nx, ny)) || !tileFree(nx, ny)) continue;
      d.set(k(nx, ny), v + 1);
      q.push([nx, ny]);
    }
  }
  return d;
}

/** The guide's tile hints (on the way from the curtain to the tank, 60 S18). */
const HINTS: { at: [number, number]; text: string }[] = [
  { at: [19, 16], text: T.SHINKAI_MIGI },
  { at: [14, 15], text: T.SHINKAI_DANSA },
  { at: [9, 9], text: T.SHINKAI_NAZE },
];

const guide = { map: '', goal: '' as string, field: null as Map<string, number> | null, last: -1, lastXY: '', wrongT: 0 };

/**
 * グソっ君 a tile ahead of しゅん along the way (S18; to the tank, then on to the
 * door out once it is done). Off this room, or once he steps through, he follows again.
 */
registerWorldFx({
  map: '',
  update(f: FieldScene, dt: number) {
    const on = f.map.id === 'map_c3_aq_shinkai' && inCh3() && !flag('flag_ch3_esa_done');
    const kn = f.actorById('kanenari');
    if (!on) {
      if (guide.map && kn?.data.guide) {
        delete kn.data.guide;
        delete kn.data.scripted;
      }
      guide.map = '';
      return;
    }
    if (!kn || !kn.visible) return;
    const goal = flag('flag_ch3_shinkai_done') ? EXIT : TANK;
    const gk = goal.join(',');
    if (guide.map !== f.map.id || guide.goal !== gk) {
      guide.map = f.map.id;
      guide.goal = gk;
      guide.field = distField(goal);
      guide.last = -1;
    }
    // a scene has him (the tank): leave him be
    if (kn.data.scripted && !kn.data.guide) return;
    kn.data.scripted = true;
    kn.data.guide = true;
    const p = f.player;
    const fd = guide.field!;
    const here = fd.get(`${p.tileX},${p.tileY}`);
    // the next tile toward the goal from しゅん's
    let tx = p.tileX;
    let ty = p.tileY;
    if (here !== undefined && here > 0)
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const v = fd.get(`${p.tileX + dx},${p.tileY + dy}`);
        if (v !== undefined && v === here - 1) {
          tx = p.tileX + dx;
          ty = p.tileY + dy;
          break;
        }
      }
    const gx = tx * 16 + 8;
    const gy = ty * 16 + 16;
    const dx = gx - kn.x;
    const dy = gy - kn.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const s = Math.min(dist, (3.6 * 16 * dt) / 1000);
      kn.x += (dx / dist) * s;
      kn.y += (dy / dist) * s;
      kn.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      kn.moving = true;
    } else {
      kn.moving = false;
      if (here !== undefined && here > 0) kn.dir = tx > p.tileX ? 'right' : tx < p.tileX ? 'left' : ty < p.tileY ? 'up' : 'down';
    }
    kn.update(dt);
    // his words on the way, and when しゅん turns the wrong way
    guide.wrongT = Math.max(0, guide.wrongT - dt);
    const xy = `${p.tileX},${p.tileY}`;
    if (xy === guide.lastXY || !f.controllable) return;
    guide.lastXY = xy;
    if (!flag('flag_ch3_shinkai_done'))
      for (const h of HINTS)
        if (h.at[0] === p.tileX && h.at[1] === p.tileY && !flag(`flag_c3_hint_${h.at.join('_')}`)) {
          setFlag(`flag_c3_hint_${h.at.join('_')}`, 1);
          showBubble('kanenari', h.text, 2200);
        }
    if (here !== undefined && guide.last >= 0 && here > guide.last && guide.wrongT <= 0) {
      guide.wrongT = 6000;
      showBubble('kanenari', T.SHINKAI_CHAU, 1800);
    }
    if (here !== undefined) guide.last = here;
  },
});

registerScript('evt_ch3_shinkai', function* (): Co {
  if (!inCh3() || flag('flag_ch3_shinkai_done') || flag('flag_c3_shinkai_in')) return;
  setFlag('flag_c3_shinkai_in', 1);
  yield 500;
  yield* say3(T.SHINKAI_A);
});

// the PA in front of the 「関係者以外」 door (once)
addToMap('map_c3_aq_shinkai', [
  { t: 'trig', id: 'trig_ch3_shinkai_pa', x: 1, y: 2, w: 3, h: 2, script: 'trig_ch3_shinkai_pa', cond: { notFlag: 'flag_c3_shinkai_pa' } } as unknown as MapObj,
  { t: 'trig', id: 'trig_ch3_shinkai_tank', x: 11, y: 2, w: 3, h: 1, script: 'trig_ch3_shinkai_tank', cond: { notFlag: 'flag_ch3_shinkai_done' } } as unknown as MapObj,
]);
registerScript('trig_ch3_shinkai_pa', function* (): Co {
  if (!inCh3() || flag('flag_c3_shinkai_pa')) return;
  setFlag('flag_c3_shinkai_pa', 1);
  se('se_c3_aq_pa_chime');
  yield 900;
  yield* say3(T.SHINKAI_PA);
  se('se_h_pa_close');
});

for (let i = 0; i < 6; i++)
  registerScript(`obj_c3_nisshi_${NN(i)}`, function* (): Co {
    const f = `flag_ch3_nisshi_${NN(i)}`;
    if (flag(f)) return;
    se('se_c3_aq_nisshi');
    yield* say3(T.nisshiRead(i));
    setFlag(f, 1);
    const n = flag('flag_ch3_nisshi_n') + 1;
    setFlag('flag_ch3_nisshi_n', n);
    if (!state.inventory.includes('item_c3_nisshi')) addItem('item_c3_nisshi');
    se('se_item', { vol: 0.5 });
    yield* say3(T.nisshiGot(n));
    if (!flag('flag_c3_nisshi_kn')) {
      setFlag('flag_c3_nisshi_kn', 1);
      yield* say3(T.NISSHI_KN);
    }
  });
for (let i = 1; i <= 5; i++)
  registerScript(`obj_c3_shinkai_case_${i}`, function* (): Co {
    se('se_examine');
    yield* say3(T.shinkaiCase(i - 1));
  });
registerScript('obj_c3_marine_snow', function* (): Co {
  se('se_examine');
  yield* say3(T.MARINE_SNOW);
  if (!flag('flag_c3_marine_kn')) {
    setFlag('flag_c3_marine_kn', 1);
    yield* say3(T.MARINE_SNOW_KN);
  }
});

/** The empty tank at the far end (required). */
function* karaSuisou(): Co {
  if (flag('flag_ch3_shinkai_done')) {
    se('se_examine');
    yield* say3(T.KARA_AGAIN);
    return;
  }
  const f = F();
  const p = f.player;
  if (p.tileY !== 2 || p.tileX < 11 || p.tileX > 13) yield* walk('player', [[12, 2]], { speed: 2.4 });
  p.dir = 'up';
  const kn = f.actorById('kanenari');
  if (kn) {
    kn.data.scripted = true;
    delete kn.data.guide;
  }
  const kx = p.tileX === 13 ? 12 : p.tileX + 1;
  if (kn) yield* walk('kanenari', [[kx, 2]], { speed: 2.2, face: 'up' });
  se('se_examine', { vol: 0.5 });
  yield* say3(T.KARA_A);
  // his claw on the glass: 2.0 s, nothing said (the quietest moment)
  ambVol('amb_c3_aq_shinkai', 0.5, 0.4);
  se('se_c3_aq_glass');
  yield 2000;
  yield* say3(T.KARA_B);
  ambVol('amb_c3_aq_shinkai', 1, 1.2);
  setFlag('flag_ch3_shinkai_done', 1);
  // still in front: on to the door out (the guide takes him again)
  if (kn) delete kn.data.scripted;
  grace();
}
registerScript('trig_ch3_shinkai_tank', function* (): Co {
  if (inCh3() && !flag('flag_ch3_shinkai_done')) yield* karaSuisou();
});
registerScript('obj_c3_kara_suisou', function* (): Co {
  yield* karaSuisou();
});
registerScript('obj_c3_aq_esa_shut', function* (): Co {
  yield* say3(T.SHINKAI_DOOR_SHUT);
});

// ================================================================ S19 えさの時間の部屋

registerScript('evt_ch3_esa', function* (): Co {
  if (!inCh3() || flag('flag_ch3_esa_done') || flag('flag_c3_esa_talk')) return;
  setFlag('flag_c3_esa_talk', 1);
  const f = F();
  const po = f.actorById('npc_pokosha');
  yield 500;
  // his back to the door at first; he turns when they come in
  if (po) {
    po.data.scripted = true;
    yield 600;
    po.dir = 'right';
  }
  f.player.dir = 'left';
  duckMusic(0.6, 40);
  yield* say3(T.ESA_A);
  duckMusic(1, 0.5);
  if (po) delete po.data.scripted;
});

/** 〔鍵〕 talking to ポコシャ after the story. */
function* esaKey(): Co {
  yield* say3(T.ESA_KEY);
  if (flag('flag_ch3_esa_fuda')) yield* say3(T.ESA_FUDA_LINE);
  se('se_c3_aq_key');
  yield 300;
  addItem('item_c3_hall_key');
  se('se_item', { vol: 0.6 });
  yield* say3(T.ESA_GOT);
  setFlag('flag_ch3_esa_done', 1);
  // オートセーブ (10.32: after S19)
  autosaveSoon();
  grace();
}

const pokoBefore = getScript('npc_pokosha');
registerScript('npc_pokosha', function* (ctx): Co {
  const m = F().map.id;
  if (inCh3() && m === 'map_c3_aq_esa') {
    if (!flag('flag_c3_esa_talk')) {
      const s = getScript('evt_ch3_esa');
      if (s) yield* s(ctx);
    }
    if (!flag('flag_ch3_esa_done')) yield* esaKey();
    else yield* say3(T.ESA_AFTER);
    return;
  }
  if (inCh3() && m === 'map_c3_aq_rouka' && !flag('flag_ch3_hp_beaten')) {
    const hp = getScript('trig_ch3_hp');
    if (hp) yield* hp(ctx);
    return;
  }
  if (pokoBefore) yield* pokoBefore(ctx);
});
registerScript('obj_c3_aq_hall_shut', function* (): Co {
  yield* say3(T.ESA_DOOR_SHUT);
});

/** えさの札（任意）：4つのかけ金に、朝から順に（E 作の謎）。 */
registerScript('obj_c3_esa_fuda', function* (): Co {
  se('se_examine');
  if (flag('flag_ch3_esa_fuda')) {
    yield* say3(T.FUDA_DONE);
    return;
  }
  yield* say3(T.FUDA_INTRO);
  if (flag('flag_ch3_nisshi_n') >= 4 && !flag('flag_c3_fuda_hint')) {
    setFlag('flag_c3_fuda_hint', 1);
    yield* say3(T.FUDA_HINT);
  }
  // the four tags in a muddle (a fixed muddle: the same every time)
  let left = [T.FUDA_TIMES[2], T.FUDA_TIMES[0], T.FUDA_TIMES[3], T.FUDA_TIMES[1]];
  for (let k = 0; k < 4; k++) {
    const opts = [...left, 'やめる'];
    const i = yield* say3(`${T.fudaAsk(k)}\n? ${opts.join(' | ')}`);
    if (i < 0 || i >= left.length) {
      yield* say3(T.FUDA_LATER);
      return;
    }
    se('se_c3_aq_esa_fuda');
    if (left[i] !== T.FUDA_TIMES[k]) {
      yield 300;
      yield* say3(T.FUDA_NG);
      return;
    }
    left = left.filter((_, j) => j !== i);
  }
  setFlag('flag_ch3_esa_fuda', 1);
  // M11 の1回目（63 12.14）
  se('se_c3_aq_esa_bell');
  yield 600;
  yield* say3(T.FUDA_OK);
});

// ================================================================ S20 大水槽のホール → 初戦 → 捕らわれる

addToMap('map_c3_aq_hall', [
  { t: 'trig', id: 'trig_ch3_hall', x: 8, y: 8, w: 9, h: 2, script: 'trig_ch3_hall', cond: { flag: 'flag_ch3_aq_enter', notFlag: 'flag_ch3_tsugao1' } } as unknown as MapObj,
]);

function* evtHall(): Co {
  const f = F();
  const p = f.player;
  const ts = f.actorById('npc_tsugao');
  stopBgm(1.5);
  if (p.tileX !== 12 || p.tileY !== 9) yield* walk('player', [[12, p.tileY], [12, 9]], { speed: 2.4, face: 'up' });
  p.dir = 'up';
  const kn = holdKn(true);
  if (kn) yield* walk('kanenari', [[13, 9]], { speed: 2.4, face: 'up' });
  yield 1000;
  playBgm('bgm_tsugao_hall');
  yield* say3(T.HALL_A);
  // he looks at グソっ君 (600 ms)
  yield 600;
  duckMusic(0.4, 2.5);
  yield* say3(T.HALL_EBI);
  yield* say3(T.HALL_B);
  // 初戦（61 12。B）：必ず終わる負け戦。結果が何でも、捕らわれるへ
  if (getEnemy('boss_tsugao_1') && !(import.meta.env.DEV && flag('flag_qa_c3_nobattle'))) {
    const mp0 = new Map(state.party.map((m) => [m.id, [m.hp, m.mp] as const]));
    yield* startBattle({ enemies: ['boss_tsugao_1'], boss: true, music: 'keep', background: 'bg_c3_aq_hall', canLose: true });
    // nothing is lost (61 12.4; the battle puts them back too)
    for (const m of state.party) {
      const v = mp0.get(m.id);
      if (v) [m.hp, m.mp] = [Math.max(1, v[0]), v[1]];
      m.status = {};
    }
    game.fadeColor = '#0B1420';
    yield* game.fadeIn(600);
  } else {
    yield* say3(T.TSUGAO1_STANDIN);
  }
  yield* tsugao1End(ts ?? null);
}

/** 〔evt_ch3_tsugao1_end〕 ヒロスケとポコシャが、2人の手をとる。 */
function* tsugao1End(ts: Actor | null): Co {
  const f = F();
  stopBgm(0.8);
  yield 800;
  yield* say3(T.T1END_A);
  // from the south door, to either side of them (nobody is rough: they take their hands)
  const hi = spawn('c3_t1_hiro', 12, 16, { sprite: 'npc_hirosuke', dir: 'up', ghost: true });
  const po = spawn('c3_t1_poko', 13, 16, { sprite: 'npc_pokosha', dir: 'up', ghost: true });
  hi.data.scripted = true;
  po.data.scripted = true;
  se('se_step_tile', { vol: 0.5 });
  yield* walk('c3_t1_hiro', [[11, 16], [11, 9]], { speed: 3 });
  faceTo(hi, 'right');
  yield* walk('c3_t1_poko', [[14, 16], [14, 9]], { speed: 3 });
  faceTo(po, 'left');
  // ポコシャ's hand stops a moment (0.6 s)
  yield 600;
  yield* say3(T.T1END_B);
  // the nightcap; the tank's light a little dimmer
  if (ts && hasChar('npc_tsugao_nightcap')) setSprite('npc_tsugao', 'npc_tsugao_nightcap');
  yield* say3(T.T1END_C);
  se('se_c3_aq_reizo');
  yield* game.fadeOut(1200, '#0B1420');
  despawn('c3_t1_hiro');
  despawn('c3_t1_poko');
  setFlag('flag_ch3_tsugao1', 1);
  holdKn(false);
  void f;
  yield* capturedToSouko();
}

registerScript('trig_ch3_hall', function* (): Co {
  if (inCh3() && flag('flag_ch3_aq_enter') && !flag('flag_ch3_tsugao1')) yield* evtHall();
});
registerScript('evt_ch3_hall', function* (): Co {
  if (inCh3() && flag('flag_ch3_aq_enter') && !flag('flag_ch3_tsugao1')) yield* evtHall();
});
const tsugaoBefore = getScript('npc_tsugao');
registerScript('npc_tsugao', function* (ctx): Co {
  if (inCh3() && F().map.id === 'map_c3_aq_hall' && !flag('flag_ch3_tsugao1')) {
    yield* evtHall();
    return;
  }
  if (tsugaoBefore) yield* tsugaoBefore(ctx);
});

// ================================================================ onEnter（W's maps; events/ch3 adds them）

addToMap('map_c3_aq_diorama', [], ['evt_ch3_diorama']);
addToMap('map_c3_aq_shinkai', [], ['evt_ch3_shinkai']);
addToMap('map_c3_aq_esa', [], ['evt_ch3_esa']);
