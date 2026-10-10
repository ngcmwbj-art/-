// ふくじんづけと 耳の あいさつ（第2章。2026-10-09 依頼主の採用：げむきか 10/9 の 案5。02_ch2_index #95、
// 50 10.31、52 7.12）。文は data/text/hoshi_mimi.ts、絵は art/props/mimi_art.ts（犬の 顔 dogFace と
// グソっ君の 頭 kaneHead〈耳の 板つき〉）、みました帳の ページは ui/menu/book_mimi.ts。
//
//   段階0〜2、グソっ君が いっしょの とき：
//   ・ふくじんづけ（牛舎の 前 (53,33)）に 話す：いつもの 文の あと〔片目だけ〕（flag_mimi_start）。
//   ・村の 5人の コツ（flag_mimi_tip_<who>。その 人の 物語や ほかの 寄り道の 用が 先）。
//     トマじいの あとは 犬の 所で においを かがせる（flag_mimi_kagu）、ぴょん夫人の あとは 名前を 呼ぶ
//     （flag_mimi_namae）。3人目の あと グソっ君「しゃがんで みよか」。
//   ・耳あわせ（3人 以上、段階1〜2）：MimiPanel。犬が 耳を 動かすので、同じ 形に（↑ 立てる・←→ 横・
//     ↓ うしろ）。時間の 帯が なくなるか、ちがう 形だと 犬が 片目を 閉じて、少し 待って その 回から。
//     4回（5人 ぜんぶの あとは 5回目「ぱたぱた」↑↓↑↓、そろうと 朱肉 +1 flag_mimi_five）。
//     1回も まちがえずに 4回 → flag_mimi_meijin。おわると 犬が グソっ君の よろいに おなかを つけて 寝る。
//     段階0 は 寝ているので できない（グソっ君の 1行）。
//   ・マサルに 話すと〔mimi〕1回（flag_mimi_gen）→ 朱肉 +2、ページの 耳の 絵。
//   ・段階2：〔h2〕「キャン！」の あと、耳が そろって 山を 向く（1回、flag_mimi_h2）。
//   ・そのあと（段階1〜2）：牛舎の 前を 通ると、犬が 耳だけで あいさつ、グソっ君の 耳の 板も 上がる
//     （world fx。段階2 は 呼び声の たびにも）。台詞なし。
//
// この ファイルは ch2/index.ts で tenban の あとに import する（ほかの 寄り道の 用が 先に 出る）。
//
// QA：__game.cmd.mimi(step, stage, auto)、mimiState()、mimiText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, registerWorldFx } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { fxAt } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { callAge } from '../../world/hoshi';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_mimi';
import { MIMI_WHO, type MimiWho } from '../../data/text/hoshi_mimi';
import { dogFace, kaneHead, type DogEar } from '../../art/props/mimi_art';
import { addMp } from '../lib';
import { se } from './compat';
import { hStage, lanternOn, npc, poseAny, unpose } from './common';
import { YK } from './sawako_yk';
import { DF } from './dome';
import { deliveryOn } from './tsugao';
import { MUSHI_DONE } from './mushi';

export const MF = {
  /** 片目だけ（ページが できた）。 */
  start: 'flag_mimi_start',
  /** トマじいの あと、においを かがせた／ぴょん夫人の あと、名前を 呼んだ。 */
  kagu: 'flag_mimi_kagu',
  namae: 'flag_mimi_namae',
  /** 3人目の あとの グソっ君（1回）。 */
  three: 'flag_mimi_three',
  /** 段階0 の「寝とる 子を」（1回）。 */
  h0: 'flag_mimi_h0',
  /** 耳あわせが できた／1回も まちがえなかった／5回目。 */
  awase: 'flag_mimi_awase',
  meijin: 'flag_mimi_meijin',
  five: 'flag_mimi_five',
  /** マサル〔mimi〕（朱肉 +2）。 */
  gen: 'flag_mimi_gen',
  /** 段階2 の 耳が そろう（1回）。 */
  h2: 'flag_mimi_h2',
} as const;

export const tipFlag = (w: MimiWho): string => `flag_mimi_tip_${w}`;
export const tipped = (w: MimiWho): boolean => flag(tipFlag(w)) > 0;
export const tipCount = (): number => MIMI_WHO.filter(tipped).length;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
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

function* say(text: string): Co<number> {
  return yield* runMsg(text);
}

/** The person's own story line comes first (the tip waits for the next talk). */
function storyFirst(who: MimiWho): boolean {
  switch (who) {
    case 'gen':
      if (!flag('flag_ch2_got_tomato')) return false;
      return !flag('flag_ch2_met_gen') || !flag('flag_ch2_gate_open') || flag('flag_ch2_barn_work_on') > 0;
    case 'tome':
      if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
      if (flag('flag_ch2_sawa_wait')) return true;
      if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
      if (!flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') || flag('flag_met_maru')) && (flag('flag_seen_npc_hoshi_tome_h0_2') || hStage() >= 1)) return true;
      return flag('flag_ch2_got_otsukare') > 0 && !flag('flag_ch2_sawa_open');
    case 'sawako':
      if (state.taken['sym_hoshi_02'] && !flag('flag_seen_npc_hoshi_sawako_mujin_done')) return true;
      return flag(YK.kabe) > 0 && !flag(YK.yk);
    case 'fumi': {
      if (!flag('flag_ch2_yoriai')) return true;
      if (flag('flag_ch2_sawa_seki') && !flag('flag_seen_npc_hoshi_fumi_sawa')) return true;
      const s = hStage();
      const dome = lanternOn() && s >= 1 && s <= 2 && !flag('flag_ch2_boss_beaten');
      if (dome && (!flag(DF.key) || (flag(DF.n) >= 3 && !flag(DF.report)) || (flag(DF.report) > 0 && !flag(DF.after)))) return true;
      return false;
    }
    case 'yoshie':
      if (!flag('flag_ch2_yoriai') || deliveryOn()) return true;
      return flag(MUSHI_DONE) > 0 && !flag('flag_ch2_mushi_yoshie');
  }
}

/** 段階0〜2。 */
function onNight(): boolean {
  return hStage() <= 2 && !flag('flag_ch2_boss_beaten');
}

// ================================================================ the five

/** 書きこむ 合図（鉛筆の 音と、1行）。 */
function* note(n: number): Co {
  se('se_pen_write', { pitch: 1.1 });
  yield 120;
  yield* say(T.MIMI_NOTE(n));
}

function* tipAt(who: MimiWho): Co<boolean> {
  if (!flag(MF.start) || tipped(who) || !onNight() || !kanenariHere() || storyFirst(who)) return false;
  setFlag(tipFlag(who), 1);
  yield* say(T.MIMI_ASK);
  yield* say(T.MIMI_TIP[who]);
  yield* note(tipCount());
  if (tipCount() >= 3 && !flag(MF.three) && !flag(MF.awase)) {
    setFlag(MF.three, 1);
    yield* say(T.MIMI_THREE);
  }
  return true;
}

const NPC_OF: Record<MimiWho, string[]> = {
  gen: ['npc_hoshi_gen'],
  tome: ['npc_hoshi_tome'],
  sawako: ['npc_hoshi_sawako'],
  fumi: ['npc_hoshi_fumi'],
  // ぴょん夫人は お茶の 場所の スクリプトでも 話す
  yoshie: ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai'],
};

for (const who of MIMI_WHO)
  for (const id of NPC_OF[who])
    wrap(id, function* (_ctx, orig): Co {
      if (who === 'gen' && (yield* genSees())) return;
      if (yield* tipAt(who)) return;
      yield* orig();
    });

/** マサル〔mimi〕：耳あわせの あと 1回（朱肉 +2）。 */
function* genSees(): Co<boolean> {
  if (!flag(MF.awase) || flag(MF.gen) || !kanenariHere() || storyFirst('gen')) return false;
  setFlag(MF.gen, 1);
  yield* say(T.MIMI_GEN);
  addMp(2);
  se('se_item');
  yield* say(T.MIMI_REWARD);
  return true;
}

// ================================================================ ふくじんづけ

wrap('npc_hoshi_gon', function* (_ctx, orig): Co {
  const s = hStage();
  const kane = kanenariHere() && onNight();
  const dog = npc('npc_hoshi_gon');
  if (!kane) {
    yield* orig();
    return;
  }
  // 1 片目だけ：いつもの 文の あと
  if (!flag(MF.start)) {
    yield* orig();
    setFlag(MF.start, 1);
    yield* say(T.MIMI_START);
    const kotaro = flag('flag_seen_npc_madam_s2_2') > 0;
    yield* say(kotaro ? T.MIMI_START_KOTARO : T.MIMI_START_OTHER);
    se('se_page');
    yield 200;
    yield* say(T.MIMI_START_ASK);
    return;
  }
  // 犬の 所で：においを かがせる（トマじい）・名前を 呼ぶ（ぴょん夫人）
  if (tipped('tome') && !flag(MF.kagu)) {
    setFlag(MF.kagu, 1);
    const k = field()?.follower;
    poseAny(k, 'crouch_hand');
    yield* say(T.MIMI_KAGU.split('\n/\n')[0]);
    se('se_dog_bark', { pitch: 1.8, vol: 0.25 });
    yield* say(`@narr\n${T.MIMI_KAGU.split('\n/\n')[1]}`);
    unpose(k);
    return;
  }
  if (tipped('yoshie') && !flag(MF.namae)) {
    setFlag(MF.namae, 1);
    const cut = T.MIMI_NAMAE.indexOf('@narr');
    yield* say(T.MIMI_NAMAE.slice(0, cut));
    dog?.playAnim('ear', false);
    yield 300;
    yield* say(T.MIMI_NAMAE.slice(cut));
    return;
  }
  // 3 耳あわせ
  if (tipCount() >= 3 && !flag(MF.awase)) {
    if (s === 0) {
      yield* orig();
      if (!flag(MF.h0)) {
        setFlag(MF.h0, 1);
        yield* say(T.MIMI_H0);
      }
      return;
    }
    yield* awaseScene();
    return;
  }
  yield* orig();
  // 段階2：「キャン！」の あと、耳が そろう（耳あわせの あと 1回）
  if (s === 2 && flag(MF.awase) && !flag(MF.h2)) {
    setFlag(MF.h2, 1);
    greet.t = 0;
    greet.on = true;
    yield 300;
    yield* say(T.MIMI_H2);
  }
});

// ================================================================ 耳あわせ（大写し）

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 92;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 犬の 顔（2倍）と グソっ君（2倍）の 左上。 */
const DX = SX + 10;
const KX = SX + CW - 86;
const FY = SY + 10;
/** 1回の 時間（ms）。 */
const LIMIT = 2600;
const FLAP_LIMIT = 4200;
const FLAP_SEQ: DogEar[] = ['up', 'down', 'up', 'down'];

type Phase = 'wait' | 'ask' | 'ok' | 'miss' | 'done';

export class MimiPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  phase: Phase = 'wait';
  dogEar: DogEar = 'side';
  kaneEar: DogEar = 'side';
  wink = false;
  /** この 回（0..）と、ぜんぶの 回。 */
  round = 0;
  rounds = 4;
  /** この 回の 残り（ms）。 */
  left = 0;
  limit = LIMIT;
  /** 5回目（ぱたぱた）：何番目まで 合わせたか。 */
  flap = -1;
  misses = 0;
  auto = false;
  words: { text: string; x: number; y: number; t: number; ms: number }[] = [];
  private keys: DogEar[] = [];

  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (input.pressed('up')) this.keys.push('up');
    else if (input.pressed('down')) this.keys.push('down');
    else if (input.pressed('left') || input.pressed('right')) this.keys.push('side');
    if (this.phase === 'ask') this.left -= dt;
    // the flap: the dog's ears go up and down, quick
    if (this.flap >= 0 && this.phase === 'ask') this.dogEar = Math.floor(this.t / 220) % 2 ? 'up' : 'down';
  }

  take(): DogEar | null {
    return this.keys.shift() ?? null;
  }
  clearInput(): void {
    this.keys.length = 0;
  }

  word(text: string, x: number, y: number, ms = 800): void {
    this.words.push({ text, x, y, t: 0, ms });
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    const oy = SY + dy;
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, oy, CW, CH, () => {
        g.rect(SX, oy, CW, CH, '#3E3A5E');
        // the dog (left) and グソっ君 (right), 2×
        g.img(dogFace(this.dogEar, this.wink ? 'wink' : 'open'), DX, FY + dy, { scale: 2 });
        const mood = this.phase === 'ok' ? 'happy' : this.phase === 'miss' ? 'sad' : 'normal';
        g.img(kaneHead(this.kaneEar, mood), KX, oy + 6, { scale: 2 });
        // the middle: the round, what to do, the keys
        const mx = SX + CW / 2;
        let y = oy + 3;
        g.text(T.MIMI_UI.hint, mx, y, { color: UI.bg, align: 'center' });
        y += 20;
        if (this.flap >= 0) {
          // ↑↓↑↓, the done ones lit
          const seq = ['↑', '↓', '↑', '↓'];
          seq.forEach((c, i) => g.text(c, mx - 30 + i * 16, y, { color: i < this.flap ? '#FFB070' : UI.bg }));
        } else {
          const rows: [string, string, DogEar][] = [
            ['↑', T.MIMI_UI.keys.up, 'up'],
            ['←→', T.MIMI_UI.keys.side, 'side'],
            ['↓', T.MIMI_UI.keys.down, 'down'],
          ];
          rows.forEach(([key, label, e], i) => {
            const on = this.kaneEar === e && this.phase !== 'wait';
            g.text(key, mx - 40, y + i * 15, { color: on ? '#FFB070' : UI.bg2 });
            g.text(label, mx - 6, y + i * 15, { color: on ? '#FFB070' : UI.bg });
          });
        }
        // the time left: a bar under the dog
        if (this.phase === 'ask') {
          const w = Math.max(0, Math.round((this.left / this.limit) * 60));
          g.rect(DX + 2, oy + CH - 6, 60, 3, '#2A2440');
          g.rect(DX + 2, oy + CH - 6, w, 3, w < 18 ? '#F2894B' : '#FFE7A3');
        }
      });
      const name = T.MIMI_UI.place;
      const tw = g.measure(name) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 41 });
      markText(SX + 8, PY + dy - 5, tw, 16);
      // the round on a tape at the top right
      const r = T.MIMI_UI.round(Math.min(this.round + 1, this.rounds), this.rounds);
      const rw = g.measure(r) + 14;
      drawTape(g, SX + CW - rw - 6, PY + dy - 5, rw, 16, r, { seed: 42, color: '#F6D98A' });
      markText(SX + CW - rw - 6, PY + dy - 5, rw, 16);
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(SY + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 24, yy, 48, 16, true);
    }
  }
}

function pickEar(not: DogEar): DogEar {
  const opts = (['up', 'side', 'down'] as DogEar[]).filter((e) => e !== not);
  return opts[Math.floor(Math.random() * opts.length)];
}

/** One round (or the flap). True when it matched; false after a miss (the dog winks, a wait). */
function* playRound(p: MimiPanel): Co<boolean> {
  p.phase = 'wait';
  p.wink = false;
  p.clearInput();
  yield 500 + Math.random() * 500;
  const flapRound = p.round >= 4;
  if (flapRound) {
    p.flap = 0;
    p.limit = FLAP_LIMIT;
  } else {
    p.flap = -1;
    p.limit = LIMIT;
    // (never the shape his ears already have)
    p.dogEar = pickEar(p.kaneEar);
    se('se_cursor', { pitch: 1.4, vol: 0.4 });
  }
  p.left = p.limit;
  p.phase = 'ask';
  p.clearInput();
  let autoAt = p.t + 450;
  for (;;) {
    let key = p.take();
    if (p.auto && p.t >= autoAt) {
      key = flapRound ? FLAP_SEQ[p.flap] : p.dogEar;
      autoAt = p.t + 300;
    }
    if (key) {
      p.kaneEar = key;
      if (flapRound) {
        if (key === FLAP_SEQ[p.flap]) {
          p.flap++;
          se('se_cursor', { pitch: 1.2 + p.flap * 0.1, vol: 0.4 });
          if (p.flap >= FLAP_SEQ.length) break;
        } else return yield* miss(p);
      } else if (key === p.dogEar) break;
      else return yield* miss(p);
    }
    if (p.left <= 0) return yield* miss(p);
    yield null;
  }
  p.phase = 'ok';
  p.word(T.MIMI_UI.ok, KX - SX + 40, 30, 800);
  se('se_pen_write', { pitch: 1.5, vol: 0.5 });
  yield 650;
  return true;
}

function* miss(p: MimiPanel): Co<boolean> {
  p.phase = 'miss';
  p.misses++;
  p.wink = true;
  p.word(T.MIMI_UI.miss, DX - SX + 32, 30, 800);
  se('se_cursor', { pitch: 0.7, vol: 0.5 });
  yield 1400;
  p.wink = false;
  return false;
}

let qaAuto = false;

function* awaseScene(): Co {
  const f = field();
  if (!f) return;
  const dog = npc('npc_hoshi_gon');
  const k = f.follower;
  const five = tipCount() >= MIMI_WHO.length;
  // グソっ君 crouches beside the dog (to the west of him, side on)
  if (k && dog) {
    k.data.scripted = true;
    k.x = dog.x - 14;
    k.y = dog.y;
    k.dir = 'right';
    poseAny(k, 'crouch_hand');
  }
  if (dog) dog.data.scripted = true;
  yield* say(T.MIMI_AWASE_START);
  const p = new MimiPanel();
  p.auto = qaAuto;
  p.rounds = 4;
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  let gotFive = false;
  try {
    for (p.round = 0; p.round < 4; ) {
      if (yield* playRound(p)) {
        p.round++;
        if (p.round === 1) {
          p.phase = 'wait';
          yield* say(T.MIMI_AWASE_FIRST);
        }
      }
    }
    if (five) {
      // かくし：5回目（ぱたぱた）
      p.rounds = 5;
      p.phase = 'wait';
      yield* say(T.MIMI_FIVE);
      while (!(yield* playRound(p))) {
        /* again */
      }
      p.round = 5;
      gotFive = true;
    }
    p.phase = 'done';
    yield 300;
  } finally {
    yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
    p.done = true;
    game.ui.remove(p);
  }
  setFlag(MF.awase, 1);
  if (p.misses === 0) setFlag(MF.meijin, 1);
  // the dog comes and lies against his armour
  if (dog && k) {
    unpose(dog);
    const home = { x: dog.x, y: dog.y, dir: dog.dir, pose: dog.pose };
    dog.dir = 'left';
    yield* animate(400, (x) => (dog.x = home.x - x * 6));
    dog.pose = 'lie';
    yield* say(T.MIMI_AWASE_DONE);
    if (gotFive) {
      setFlag(MF.five, 1);
      addMp(1);
      se('se_item');
      yield* say(T.MIMI_FIVE_DONE);
    }
    dog.x = home.x;
    dog.y = home.y;
    dog.dir = home.dir;
    dog.pose = home.pose;
    delete dog.data.scripted;
    unpose(k);
    delete k.data.scripted;
    f.syncFollower(true);
  } else {
    yield* say(T.MIMI_AWASE_DONE);
    if (gotFive) {
      setFlag(MF.five, 1);
      addMp(1);
      yield* say(T.MIMI_FIVE_DONE);
    }
  }
}

// ================================================================ そのあと：耳だけの あいさつ（world fx）

const greet = { on: false, t: 0, near: false, lastCall: 1e9 };
const GREET_MS = 1100;

registerWorldFx({
  map: 'map_hoshimidai',
  anchored: true,
  update(f: FieldScene, dt: number) {
    const s = hStage();
    if (!flag(MF.awase) || s < 1 || s > 2 || !kanenariHere()) {
      greet.on = false;
      return;
    }
    if (greet.on) {
      greet.t += dt;
      if (greet.t > GREET_MS) greet.on = false;
    }
    const dog = f.actorById('npc_hoshi_gon');
    const k = f.follower;
    if (!dog || !k) return;
    const p = f.player;
    const d = Math.min(Math.hypot(dog.x - k.x, dog.y - k.y), Math.hypot(dog.x - p.x, dog.y - p.y));
    // passing by the barn: once each time he comes near
    if (d < 56 && !greet.near && !dog.data.scripted) {
      greet.near = true;
      greet.on = true;
      greet.t = 0;
      dog.playAnim('ear', false);
    } else if (d > 110) greet.near = false;
    // stage 2: each call, while near enough to hear each other
    const ca = callAge();
    if (s === 2 && ca < 300 && greet.lastCall > 300 && d < 200) {
      greet.on = true;
      greet.t = 0;
    }
    greet.lastCall = ca;
  },
  draw(f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (layer !== 'fg' || !greet.on) return;
    const dog = f.actorById('npc_hoshi_gon');
    const k = f.follower;
    if (!dog || !k) return;
    // two little flicks above each head: the ears going up together (no words)
    const up = Math.min(1, greet.t / 150);
    const fade = greet.t > GREET_MS - 300 ? (GREET_MS - greet.t) / 300 : 1;
    const mark = (wx: number, wy: number, w: number) => {
      const [sx, sy] = fxAt(f, wx, wy, cx, cy);
      const x = Math.round(sx);
      const y = Math.round(sy - up * 3);
      g.alpha(Math.max(0, fade), () => {
        for (const s of [-1, 1]) {
          // a little ear-shaped flick: a 2×4 stroke leaning out, a bright tip
          const bx = x + s * w - (s < 0 ? 2 : 0);
          g.rect(bx, y - 3, 2, 4, '#3A2B24');
          g.rect(bx + (s < 0 ? 0 : 0), y - 3, 2, 3, '#FFE7A3');
          g.px(bx + (s < 0 ? -1 : 2), y - 5, '#FFF6D8');
          g.px(bx + (s < 0 ? 0 : 1), y - 4, '#FFF6D8');
        }
      });
    };
    mark(dog.x, dog.y - 14, 4);
    mark(k.x, k.y - 26, 7);
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** Where to stand to talk to each of the five (stage 1; マサル in the barn, stage 2 at the gate). */
const AT: Record<MimiWho, [string, number, number, string]> = {
  gen: ['map_hoshi_barn', 19, 6, 'right'],
  tome: ['map_hoshimidai', 20, 11, 'right'],
  sawako: ['map_hoshimidai', 23, 38, 'up'],
  fumi: ['map_hoshi_school', 8, 3, 'right'],
  yoshie: ['map_hoshi_school', 3, 5, 'left'],
};

/**
 * QA: __game.cmd.mimi(step = 'dog', stage = 1, auto = false)
 *   'dog'    ふくじんづけの 前 (53,34) 北向き（話すと〔片目だけ〕）
 *   'gen' 'tome' 'sawako' 'fumi' 'yoshie'   片目だけの あと、その 人の となり
 *   'kagu'   トマじいと ぴょん夫人に 聞いた あと、犬の 前（においを かがせる → 名前を 呼ぶ）
 *   'awase'  3人に 聞いた あと、犬の 前（話すと 耳あわせ。auto：自動で 合わせる）
 *   'five'   5人 ぜんぶ 聞いた あと、犬の 前（5回目つき）
 *   'genSee' 耳あわせの あと、マサルの となり（〔mimi〕）
 *   'done'   ぜんぶ した あと、牛舎の 前の 少し 南（歩いて 近づくと 耳の あいさつ）
 */
if (import.meta.env.DEV) {
  registerDebug('mimi', (step = 'dog', st = 1, auto = false) => {
    const sn = Number(st);
    if (sn <= 0) cmd().jump?.('ch2:mitsu', true);
    else cmd().jump?.('ch2:houki', true);
    if (sn >= 2) {
      for (const id of ['flag_ch2_tetsuya_beaten', 'flag_ch2_houki_enter', 'flag_ch2_keitora_here']) setFlag(id, 1);
      state.taken['sym_hoshi_07'] = true;
      setFlag('flag_ch2_stage', 2);
    }
    for (const id of Object.values(MF)) setFlag(id, 0);
    for (const w of MIMI_WHO) setFlag(tipFlag(w), 0);
    qaAuto = !!auto;
    const dogAt = (): unknown => cmd().warp?.('map_hoshimidai', 53, 34, 'up');
    if (step === 'dog') return dogAt();
    setFlag(MF.start, 1);
    if ((MIMI_WHO as string[]).includes(String(step))) {
      const w = step as MimiWho;
      const at = w === 'gen' && sn >= 2 ? (['map_hoshimidai', 49, 19, 'right'] as const) : AT[w];
      return cmd().warp?.(at[0], at[1], at[2], at[3]);
    }
    if (step === 'kagu') {
      setFlag(tipFlag('tome'), 1);
      setFlag(tipFlag('yoshie'), 1);
      return dogAt();
    }
    const n = step === 'awase' ? 3 : 5;
    MIMI_WHO.slice(0, n).forEach((w) => setFlag(tipFlag(w), 1));
    setFlag(MF.kagu, 1);
    setFlag(MF.namae, 1);
    setFlag(MF.three, 1);
    if (step === 'awase' || step === 'five') return dogAt();
    setFlag(MF.awase, 1);
    if (step === 'genSee') return sn >= 2 ? cmd().warp?.('map_hoshimidai', 49, 19, 'right') : cmd().warp?.('map_hoshi_barn', 19, 6, 'right');
    if (step === 'done') {
      setFlag(MF.meijin, 1);
      setFlag(MF.five, 1);
      setFlag(MF.gen, 1);
      return cmd().warp?.('map_hoshimidai', 53, 39, 'up');
    }
    return null;
  });

  registerDebug('mimiState', () => {
    const p = game.ui.widgets.find((w) => w instanceof MimiPanel) as MimiPanel | undefined;
    return {
      start: flag(MF.start),
      tips: MIMI_WHO.filter(tipped),
      awase: flag(MF.awase),
      meijin: flag(MF.meijin),
      five: flag(MF.five),
      gen: flag(MF.gen),
      greet: { ...greet },
      panel: p ? { phase: p.phase, round: p.round, rounds: p.rounds, dog: p.dogEar, kane: p.kaneEar, left: Math.round(p.left), misses: p.misses, flap: p.flap } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines. */
export function mimiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', 'らっきょ', 'ほどよい'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
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
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('mimi', T.MIMI_TEXTS);
  // the close-up's middle column: between the dog (2×) and グソっ君 (2×)
  const room = KX - (DX + 64) - 4;
  for (const l of [T.MIMI_UI.hint, `↑ ${T.MIMI_UI.keys.up}`, `←→ ${T.MIMI_UI.keys.side}`, `↓ ${T.MIMI_UI.keys.down}`]) {
    const w = l.startsWith('↑') || l.startsWith('←') || l.startsWith('↓') ? 34 + measure(l.split(' ')[1]) : measure(l);
    if (w > room) bad.push(`ui: ${w}px > ${room}: ${l}`);
  }
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mimiText', () => mimiTextCheck());
