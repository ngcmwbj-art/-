// ショッピングプラザ・ユウナリ: evt_mall_enter (5.15), evt_kaitenyaki
// (fushigi_12, 8.12), evt_maigo_door (5.17), evt_boss_intro (5.18).
// The boss battle itself (phases, final stamp) is the battle team's.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { flag, setFlag } from '../game/state';
import { syncProgressSkills } from '../data/battle';
import { playHankoLearn } from '../battle';
import { enemyArt } from '../art/enemies';
import { lvTime } from '../art/props/istate';
import { sfx, stopAmbient } from '../audio';
import { actor, despawn, msg, place, registerScript, spawn } from '../world/api';
import { registerWorldFx } from '../world/fx';
import { fushigiCount, fushigiDone } from '../world/fushigi';
import { stampFx } from '../world/stamp';
import { choose } from '../ui/api';
import * as T from '../data/text/events';
import { KAITENYAKI_PRESSED, KAITENYAKI_SEEN, YAKINAMES, YAKINAMES_KANA } from '../data/text/mall';
import { addMp, eventBattle, F, getKeyItem, panBack, panTo } from './lib';
import { puff, sparkle } from './fx';
import { evtEnding } from './ending';

// ---------------------------------------------------------------- 5.15 evt_mall_enter

registerScript('evt_mall_enter', function* (): Co {
  if (flag('flag_mall_entered')) return;
  setFlag('flag_mall_entered', 1);
  yield 350;
  // entrance → the dry fountain, three tiles, and back (1.6 s)
  yield* panTo(10, 9, 900);
  yield 250;
  yield* msg(T.MALL_ENTER);
  if (flag('flag_kanenari_joined')) {
    const k = F().follower;
    if (k) {
      k.data.scripted = true;
      k.tempPose = 'flip_hold';
      sfx('se_flip');
    }
    yield* msg(T.MALL_ENTER_FLIP);
    if (k) {
      k.tempPose = null;
      delete k.data.scripted;
    }
  }
  yield* panBack(700);
});

// ---------------------------------------------------------------- 8.12 evt_kaitenyaki (fushigi_12 ★ the key)

registerScript('evt_kaitenyaki', function* (): Co {
  sfx('se_examine');
  if (fushigiDone('fushigi_12')) {
    const n = Math.max(1, Math.min(3, flag('flag_yakiname') || 3));
    yield* msg(`@narr
回転焼き機は 止まっている。{w=300}
焼き型に 小さく、
『${YAKINAMES[n - 1]}』と 刻まれている。`);
    return;
  }
  yield* msg(KAITENYAKI_SEEN);
  if (!flag('flag_got_hanko')) return;
  const i = yield* msg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return;
  // the seal on the plate; the turning slows and stops (1.2 s)
  sfx('se_stamp');
  yield* stampFx('fushigi_12');
  sfx('se_kaitenyaki_stop');
  stopAmbient('amb_kaitenyaki', 1.2);
  yield 1200;
  setFlag('flag_fushigi_12', 1);
  puff(10 * 16, 3 * 16 + 10, '#F4F1E8');
  yield 300;
  yield* msg(KAITENYAKI_PRESSED);
  const k = yield* choose(YAKINAMES);
  setFlag('flag_yakiname', k + 1);
  yield* msg(`@回転焼き機:vending
${YAKINAMES_KANA[k]}`);
  yield* msg(`@回転焼き機:vending
……ソウ 呼ンデ モラエルナラ、
ナンデモ ヨカッタ。`);
  // the key rolls off the plate: ころん
  sparkle(10 * 16 + 10, 3 * 16 + 12);
  sfx('se_coin', { pitch: 0.8 });
  yield 450;
  yield* getKeyItem('item_maigo_key', `@sys
迷子センターの カギを
手に入れた！`);
  setFlag('flag_got_maigo_key', 1);
  if (flag('flag_kanenari_joined')) {
    const kn = F().follower;
    if (kn) {
      kn.data.scripted = true;
      kn.tempPose = 'flip_hold';
      sfx('se_flip');
    }
    yield* msg(`@flip
ぼくは 大判焼き派です。`);
    yield* msg(k === 1 ? `@flip
（気が 合いますね）` : `@flip
（でも、いい 名前です）`);
    if (kn) {
      kn.tempPose = null;
      delete kn.data.scripted;
    }
  }
  syncProgressSkills();
  yield* playHankoLearn('skill_yarinaoshi');
  addMp(2);
  yield* msg(`@sys
朱肉が 2 たまった。
/
みました帳に 書きこんだ。
（ふしぎ ${fushigiCount()}/12）`);
  F().applyAudio(false);
});

// ---------------------------------------------------------------- 5.17 evt_maigo_door

function* flip(text: string): Co {
  const k = F().follower;
  if (!flag('flag_kanenari_joined') || !k) {
    yield* msg(text);
    return;
  }
  k.data.scripted = true;
  k.tempPose = 'flip_hold';
  sfx('se_flip');
  yield* msg(text);
  k.tempPose = null;
  delete k.data.scripted;
}

registerScript('evt_maigo_door', function* (): Co {
  sfx('se_examine');
  if (flag('flag_maigo_door_open')) {
    yield* msg(T.MAIGO_DOOR_OPENED);
    return;
  }
  if (!flag('flag_got_maigo_key')) {
    yield* msg(T.MAIGO_DOOR_LOCKED);
    if (flag('flag_kanenari_joined')) yield* flip(T.MAIGO_DOOR_LOCKED_FLIP);
    return;
  }
  yield* msg(T.MAIGO_DOOR_USE);
  sfx('se_door_heavy');
  game.shake(1, 200);
  setFlag('flag_maigo_door_open', 1);
  yield 600;
  if (flag('flag_kanenari_joined')) yield* flip(T.MAIGO_DOOR_OPEN_FLIP);
});

registerScript('trig_maigo_door_rest', function* (): Co {
  if (!flag('flag_kanenari_joined')) return;
  yield* flip(T.MAIGO_DOOR_REST_FLIP);
});

// ---------------------------------------------------------------- 5.18 evt_boss_intro: the heap rises

const boss = { rise: 0, pupil: 0, wobble: 0, t: 0, alpha: 1 };
const BOSS_FOOT: [number, number] = [10 * 16 + 4, 6 * 16 + 2];

function drawRisingBoss(g: Gfx, x: number, y: number): void {
  const art = enemyArt('boss_omukaemachi');
  if (!art || boss.rise <= 0) return;
  boss.t += 16.7;
  const img = art.frame({ pose: 'idle', t: boss.t, gt: boss.t, hpRate: 1, flags: {}, params: { pupil: boss.pupil } });
  const s = 0.75;
  const w = Math.round(art.w * s);
  const h = Math.round(art.h * s);
  const dx = Math.round(x - w / 2 + Math.sin(boss.t / 170) * boss.wobble);
  const dy = Math.round(y - h + (1 - boss.rise) * 10);
  const shown = Math.round(h * boss.rise);
  // the dark it rises from
  g.alpha(0.45 * boss.rise, () => {
    g.rect(dx + 10, y - 3, w - 20, 5, '#1B1733');
    g.rect(dx + 18, y - 5, w - 36, 2, '#1B1733');
  });
  g.clip(dx, dy + h - shown, w, shown, () => {
    g.ctx.save();
    g.ctx.imageSmoothingEnabled = false;
    g.ctx.globalAlpha = boss.alpha;
    g.ctx.drawImage(img, dx, dy, w, h);
    g.ctx.restore();
  });
}

function spawnBoss(): void {
  if (actor('boss_rising')) return;
  const a = spawn('boss_rising', 10, 5, { sprite: 'kanenari', ghost: true });
  a.x = BOSS_FOOT[0];
  a.y = BOSS_FOOT[1];
  a.shadowH = 0;
  a.data.scripted = true;
  a.drawFn = (g, x, y) => drawRisingBoss(g, x, y);
}

registerScript('evt_boss_intro', function* (): Co {
  if (flag('flag_boss_beaten')) return;
  const f = F();
  const p = f.player;
  p.path = [];
  p.moving = false;
  p.dir = 'up';
  const again = !!flag('flag_boss_intro_seen');
  yield 300;
  if (!again) yield* msg(T.BOSS_A);
  // the heap shudders, 2 px, three times
  for (let i = 0; i < 3; i++) {
    lvTime.pileShakeUntil = f.t + 260;
    sfx('se_rumble', { vol: 0.8 + i * 0.1 });
    game.shake(1, 160);
    yield 480;
  }
  // it rises: a big shadow child sitting with its knees up (1.2 s)
  lvTime.pileHidden = true;
  boss.rise = 0;
  boss.pupil = 0;
  boss.wobble = 2;
  spawnBoss();
  sfx('se_rumble', { vol: 1, pitch: 0.7 });
  const t0 = f.t;
  yield () => {
    boss.rise = Math.min(1, (f.t - t0) / 1200);
    return boss.rise >= 1;
  };
  game.shake(2, 200);
  yield 300;
  // the name-tag eyes open and look for Minato
  for (const px of [-1, 1, -0.6, 0.4, 0]) {
    const from = boss.pupil;
    const s0 = f.t;
    yield () => {
      const k = Math.min(1, (f.t - s0) / 260);
      boss.pupil = from + (px - from) * k;
      return k >= 1;
    };
    yield 140;
  }
  sfx('se_boss_voice');
  yield* msg(T.BOSS_B);
  if (flag('flag_kanenari_joined')) yield* flip(T.BOSS_FLIP);
  setFlag('flag_boss_intro_seen', 1);
  // one chime note, E5
  sfx('se_chime_note', { note: 'E5', hold: 0.8 });
  yield 900;
  const r = yield* eventBattle({ enemies: ['boss_omukaemachi'], boss: true, music: 'bgm_boss', background: 'bg_boss' });
  if (r === 'load') return;
  if (r === 'retry') {
    // back at the door, the heap as it was
    despawn('boss_rising');
    lvTime.pileHidden = false;
    boss.rise = 0;
    place('player', 6, 9, 'up');
    f.snapCamera();
    yield* game.fadeIn(500);
    return;
  }
  despawn('boss_rising');
  yield* evtEnding();
});

// entering 迷子センター again (after a load): the heap is a heap
registerWorldFx({
  map: 'map_mall_maigo',
  update() {
    if (lvTime.pileHidden && !flag('flag_boss_beaten') && !actor('boss_rising')) lvTime.pileHidden = false;
  },
});
