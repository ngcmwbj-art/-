// 70年の 色紙と 小さな 夏祭り（げむきか10/5の 改5、02_ch2_index #84、50 9.9・10.26）。
// 文は data/text/hoshi_shikishi.ts。ここでは、かかわる 人と 物の 台本を 包む（npcs・objects・
// rooms2・nihyaku・sawa・dome の あとに import するので、getScript() は その人たちの 台本を 返す）。
//
//   段階1〜2（トマトの 灯りを 持っている あいだ。nightOn）：
//   ・シゲじいと スギばあの 家の カレンダー obj_hr_mk2_calendar → flag_shikishi_cal、グソっ君（1回）
//   ・ぴょん夫人（npc_hoshi_yoshie / evt_ch2_rest_yoriai）〔70〕→ item_shikishi（flag_shikishi_start）。
//     とちゅうは のこりの 人（集めた 数が かわった ときだけ）、7つで〔さいご〕→ 色紙を 返す、朱肉 +2
//     （flag_shikishi_last 1 しゅん／2 グソっ君、flag_shikishi_done）。祭りが 先なら そのまま 読み上げ。
//   ・7人の ひとこと（flag_shikishi_<who> = もらった 順番 1〜7）。話の 筋の 場面が 先の ときは 次の 回
//     （storyFirst。二百十日の〔210〕と 同じ 考え）。マサルの あと、マサルの 母の 寝言（flag_shikishi_haha）
//     → ソワカの「藍を 2つ」。
//   ・区の 倉庫の 提灯の 箱 → グソっ君「ハモ区長に、聞いて みいひん？」（flag_matsuri_ask。第1章の 垂れ幕を
//     聞いた 人は「夕鳴町の 祭りは…」も。flag_matsuri_banner は obj_sk_banner を 包んで 立てる）
//     → 区長〔matsuri〕（flag_matsuri_kucho）→ 箱から item_matsuri_chochin、太鼓は グソっ君の 背中
//     （flag_matsuri_taiko。follower の 絵に 重ねる）→ 校庭の 桜 obj_hoshi_sakura（色紙が とちゅうなら
//     グソっ君が 止める）→ 祭り（flag_matsuri_kake・on・done、朱肉 +2）。
//   ・かくし：座布団の 10円玉の 紙の 裏（flag_shikishi_ura）、勝敗表の △（flag_shikishi_sankaku）、
//     集会所の 色紙（flag_shikishi_tate。エンディングの カット2d）、カット3で ぴょん夫人が 消えた
//     提灯を さげる（flag_matsuri_done）。
//
// QA：__game.cmd.shikishi(step)、__game.cmd.matsuri(step)、__game.cmd.shikishiState()、
//     __game.cmd.shikishiText()（ページの 幅と 行、第2章の 台詞の 決まり）、jump('ch2:shikishi')。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { measure } from '../../engine/font';
import { touchControlsOn } from '../../engine/touch';
import type { Gfx } from '../../engine/gfx';
import { flag, hasItem, removeItem, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, registerWorldFx, spawn, despawn, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { runMsg } from '../../world/msg';
import type { Actor } from '../../world/actor';
import { makeCanvas } from '../../engine/pixel';
import { HOSHI_NPC } from '../../data/text/hoshi_npcs';
import { R2_OBJ } from '../../data/text/hoshi_rooms2';
import * as T from '../../data/text/hoshi_shikishi';
import type { ShikishiWho } from '../../data/text/hoshi_shikishi';
import { drumOnBack, handLantern } from '../../art/props/matsuri_art';
import { keyGuide } from '../stage';
import { addMp, getKeyItem } from '../lib';
import { sparkle } from '../fx';
import { se } from './compat';
import { hStage, isHoshi, lanternOn, poseIf, runCue, unpose } from './common';
import { DF } from './dome';
import { YK } from './sawako_yk';

export const SF = {
  /** カレンダー『結婚 70年』を 段階1〜2に 見た。 */
  cal: 'flag_shikishi_cal',
  /** カレンダーの あとの グソっ君（1回）。 */
  calFlip: 'flag_shikishi_calflip',
  /** ぴょん夫人〔70〕：色紙を あずかった。 */
  start: 'flag_shikishi_start',
  /** 色紙を あずかった あとの グソっ君（1回）。 */
  flip: 'flag_shikishi_flip',
  /** ぴょん夫人の「あと〜つ」を 言った ときの 数 + 1（数が かわるまで くりかえさない）。 */
  remind: 'flag_shikishi_remind',
  /** マサルの 家の 母の 寝言を 聞いた。 */
  haha: 'flag_shikishi_haha',
  /** ソワカが 藍の もんぺを 2つ 描いた。 */
  ai: 'flag_shikishi_ai',
  /** さいごの ひとこと：1 しゅん、2 グソっ君。 */
  last: 'flag_shikishi_last',
  /** 7つと さいごの ひとこと：ぴょん夫人が あずかった（朱肉 +2）。 */
  done: 'flag_shikishi_done',
  /** 区長が 読み上げた。 */
  read: 'flag_shikishi_read',
  /** 集会所の 2人の 座布団の あいだに 立っている。 */
  tate: 'flag_shikishi_tate',
  /** 10円玉の 紙の 裏を 見た。 */
  ura: 'flag_shikishi_ura',
  /** 勝敗表の △ を 見つけた。 */
  sankaku: 'flag_shikishi_sankaku',
};
export const MF = {
  /** 第1章の 商店会の 倉庫の 垂れ幕で、グソっ君の「ほな、来年は 行こな。」を 聞いた。 */
  banner: 'flag_matsuri_banner',
  /** 提灯の 箱で グソっ君「ハモ区長に、聞いて みいひん？」。 */
  ask: 'flag_matsuri_ask',
  /** 区長〔matsuri〕を 聞いた（提灯を 出して いい）。 */
  kucho: 'flag_matsuri_kucho',
  /** 箱から 提灯を 出した。 */
  chochin: 'flag_matsuri_chochin',
  /** 太鼓が グソっ君の 背中に ある。 */
  taiko: 'flag_matsuri_taiko',
  /** 校庭の 桜に 提灯を かけた。 */
  kake: 'flag_matsuri_kake',
  /** 祭りの とちゅう（桜の 下に 太鼓）。 */
  on: 'flag_matsuri_on',
  /** タケじいの 太鼓の 寝言を 聞いた。 */
  take: 'flag_matsuri_take',
  /** 祭りが すんだ（朱肉 +2）。 */
  done: 'flag_matsuri_done',
};
const wordFlag = (w: ShikishiWho): string => `flag_shikishi_${w}`;

// ---------------------------------------------------------------- helpers

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2、トマトの 灯りを 持っている あいだ。 */
function nightOn(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

/** How many of the seven have written. */
export function shikishiCount(): number {
  return T.SHIKISHI_WHO.filter((w) => flag(wordFlag(w.who)) > 0).length;
}

/** The seven in the order they wrote (for the notebook). */
export function shikishiOrder(): ShikishiWho[] {
  return T.SHIKISHI_WHO.filter((w) => flag(wordFlag(w.who)) > 0)
    .sort((a, b) => flag(wordFlag(a.who)) - flag(wordFlag(b.who)))
    .map((w) => w.who);
}

/** Wrap another module's script (or the object's default text) with ours. */
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

function* reward(): Co {
  addMp(2);
  se('se_item');
  yield* runMsg(T.SHIKISHI_REWARD);
}

/** ぴょん夫人の お茶（npcs.ts と 同じ：HP 全快、朱肉は ふえない）。 */
function* tea(): Co {
  se('se_heal');
  for (const m of state.party) m.hp = m.maxHp;
  setFlag('flag_ch2_rest_count', flag('flag_ch2_rest_count') + 1);
  yield* runMsg(HOSHI_NPC.npc_hoshi_yoshie.tea);
}

/** ぴょん夫人の「ひとこと、あと Nつじゃ。」と のこりの 人（呼び方を 1行 300px までに 折る）。 */
export function leftText(): string {
  const left = T.SHIKISHI_WHO.filter((w) => !flag(wordFlag(w.who)));
  const lines: string[] = [];
  let cur = '';
  left.forEach((w, i) => {
    const part = w.call + (i === left.length - 1 ? '。' : '、');
    if (cur && measure((cur + part).replace(/\{[^}]*\}/g, '')) > 300) {
      lines.push(cur);
      cur = '';
    }
    cur += part;
  });
  if (cur) lines.push(cur);
  // 名前が 3行に なるときは、「あと Nつじゃ。」を 1ページに
  return `${T.SHIKISHI_LEFT_HEAD}\n${T.SHIKISHI_LEFT_PRE(left.length)}\n${lines.length > 2 ? '/\n' : ''}${lines.join('\n')}`;
}

// ---------------------------------------------------------------- 1 カレンダー

wrap('obj_hr_mk2_calendar', function* (_ctx, orig): Co {
  yield* orig();
  if (!nightOn() || flag(SF.start)) return;
  setFlag(SF.cal, 1);
  if (!flag(SF.calFlip) && kanenariHere()) {
    setFlag(SF.calFlip, 1);
    yield* runMsg(T.SHIKISHI_CAL_FLIP);
  }
});

// ---------------------------------------------------------------- ぴょん夫人

/** 〔70〕・のこりの 人・〔さいご〕・（祭りが 先なら）集会所での 読み上げ。true: こちらで 話した。 */
function* yoshieShikishi(): Co<boolean> {
  if (!nightOn() || flag('flag_ch2_delivery_on') || !flag('flag_ch2_yoriai')) return false;
  if (!flag(SF.start)) {
    if (!flag(SF.cal)) return false;
    setFlag(SF.start, 1);
    yield* runMsg(T.SHIKISHI_YOSHIE_70);
    yield* getKeyItem('item_shikishi', T.SHIKISHI_GET);
    yield* runMsg(T.SHIKISHI_YOSHIE_7);
    if (kanenariHere() && !flag(SF.flip)) {
      setFlag(SF.flip, 1);
      yield* runMsg(T.SHIKISHI_FLIP_70);
    }
    yield* tea();
    return true;
  }
  if (flag(SF.last)) {
    if (flag(MF.done) && !flag(SF.read)) {
      yield* runMsg(T.SHIKISHI_KEEP_READ);
      yield* reading('heya');
      return true;
    }
    return false;
  }
  const n = shikishiCount();
  if (n >= T.SHIKISHI_WHO.length) {
    yield* lastWord();
    return true;
  }
  // とちゅう：その 段階の はじめの 台詞が 先。のこりの 人は、集めた 数が かわった ときだけ
  const s = Math.min(2, hStage());
  if (!flag(`flag_seen_npc_hoshi_yoshie_h${s}_1`) || flag(SF.remind) === n + 1) return false;
  setFlag(SF.remind, n + 1);
  yield* runMsg(leftText());
  yield* tea();
  return true;
}

/** 〔さいご〕：「しゅんが 書く｜グソっ君が 書く」→ 色紙を 返す → 朱肉 +2 → 祭りの こと。 */
function* lastWord(): Co {
  const r = yield* runMsg(T.SHIKISHI_LAST_ASK);
  const gk = r === 1;
  setFlag(SF.last, gk ? 2 : 1);
  se('se_page');
  for (let i = 0; i < (gk ? 1 : 4); i++) {
    yield 140;
    se('se_pen_write', { pitch: 1 + (i % 2) * 0.08 });
  }
  yield 120;
  yield* runMsg(gk ? T.SHIKISHI_LAST_GK : T.SHIKISHI_LAST_SHUN);
  // （まつ先生の『ん』の 話の あと：7つが そろってからなので、いつも）
  if (gk && flag(wordFlag('fumi'))) yield* runMsg(T.SHIKISHI_LAST_GK_YOSHIE);
  yield* runMsg(T.SHIKISHI_KEEP);
  se('se_page', { pitch: 0.9 });
  removeItem('item_shikishi');
  setFlag(SF.done, 1);
  yield* reward();
  if (flag(MF.done)) {
    // 祭りは もう すんだ：ここで 読み上げる
    yield* runMsg(T.SHIKISHI_KEEP_READ);
    yield* reading('heya');
    return;
  }
  yield* runMsg(flag(MF.kucho) ? T.SHIKISHI_KEEP_MATSURI : T.SHIKISHI_KEEP_SOKO);
}

/** 区長の 読み上げ → 寝言 2つ（ありがとう → うん）→ ぴょん夫人。集会所では その場で 色紙を 立てる。 */
function* reading(where: 'mado' | 'heya'): Co {
  yield* runMsg(T.SHIKISHI_READ);
  yield 300;
  yield* runMsg(flag(SF.last) === 2 ? T.SHIKISHI_READ_GK : T.SHIKISHI_READ_SHUN);
  yield 500;
  se('se_h_ibiki', { vol: 0.6 });
  yield 700;
  yield* runMsg(T.SHIKISHI_NEGOTO(where));
  setFlag(SF.read, 1);
  yield* runMsg(T.SHIKISHI_KIKOE);
  if (where !== 'heya') return;
  yield* runCue(T.SHIKISHI_TATE_HEYA, {
    *tate() {
      yield* game.fadeOut(250, '#0B0B14');
      setFlag(SF.tate, 1);
      field()?.refreshPresence();
      yield 200;
      yield* game.fadeIn(250);
    },
  });
}

for (const id of ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai'])
  wrap(id, function* (_ctx, orig): Co {
    if (yield* yoshieShikishi()) return;
    yield* orig();
  });

// ---------------------------------------------------------------- 2 7人の ひとこと

/** A story line of this person comes first (then the word waits for the next talk). */
function storyFirst(who: ShikishiWho): boolean {
  switch (who) {
    case 'tome':
      // 課長の 話、名前の 石、マルの 伝言（二百十日と 同じ）
      if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
      if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
      return !flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') > 0 || flag('flag_met_maru') > 0);
    case 'gen':
      // 呼びとめ、見回り（ゲートを 開ける）の 前、牛舎の おてつだいの 最中
      return !flag('flag_ch2_met_gen') || (!flag('flag_ch2_gate_open') && !flag('flag_ch2_gate_wait')) || flag('flag_ch2_barn_work_on') > 0;
    case 'mitsu':
      // ハウスを 出る 前の 台詞、脇芽の 報告
      return !flag('flag_ch2_house_exit') || (flag('flag_ch2_wakime_done') > 0 && !flag('flag_ch2_wakime_report'));
    case 'kucho':
      return !flag('flag_ch2_yoriai');
    case 'fumi':
      // 沢の 自由研究、天文台の 鍵、観望会カードの 報告
      if (flag('flag_ch2_sawa_seki') && !flag('flag_seen_npc_hoshi_fumi_sawa')) return true;
      if (!flag(DF.key)) return true;
      return flag(DF.n) >= 3 && !flag(DF.report);
    case 'sawako':
      // ムジン販売員の あと、色見本
      if (state.taken['sym_hoshi_02'] && !flag('flag_seen_npc_hoshi_sawako_mujin_done')) return true;
      return flag(YK.kabe) > 0 && !flag(YK.yk);
    case 'sankado':
      return false;
  }
}

/** The person's word on the shikishi, when it is due. True when it was said. */
function* wordAt(who: ShikishiWho): Co<boolean> {
  if (!nightOn() || !hasItem('item_shikishi') || flag(wordFlag(who)) || storyFirst(who)) return false;
  setFlag(wordFlag(who), shikishiCount() + 1);
  yield* runMsg(T.SHIKISHI_SHOW);
  yield* runMsg(T.SHIKISHI_WORD[who]);
  if (who === 'sawako') {
    const ai = flag(SF.haha) > 0;
    if (ai) {
      setFlag(SF.ai, 1);
      yield* runMsg(T.SHIKISHI_SAWAKO_AI);
    }
    // 筆で さらさら
    for (let i = 0; i < 3; i++) {
      yield 160;
      se('se_pen_write', { pitch: 0.8 });
    }
    yield 120;
    yield* runMsg(ai ? T.SHIKISHI_SAWAKO_E_AI : T.SHIKISHI_SAWAKO_E);
  }
  if (who === 'gen' && kanenariHere()) yield* runMsg(T.SHIKISHI_GEN_FLIP);
  if (shikishiCount() >= T.SHIKISHI_WHO.length && kanenariHere()) yield* runMsg(T.SHIKISHI_SOROTA);
  return true;
}

for (const { who, npc } of T.SHIKISHI_WHO) {
  if (who === 'kucho') continue;
  wrap(npc, function* (_ctx, orig): Co {
    if (yield* wordAt(who)) return;
    yield* orig();
  });
}

/** マサルの 家の 母：マサルの ひとことの あと、1回だけ 寝言（スギちゃん、おそろいの もんぺ）。 */
wrap('obj_hr_gen_haha', function* (_ctx, orig): Co {
  if (!nightOn() || !flag(wordFlag('gen')) || flag(SF.haha)) {
    yield* orig();
    return;
  }
  se('se_examine');
  setFlag(SF.haha, 1);
  setFlag('flag_seen_obj_hr_gen_haha', 1);
  yield* runMsg(T.SHIKISHI_HAHA);
});

// ---------------------------------------------------------------- 区長：〔matsuri〕と ひとこと

function* kuchoMatsuri(): Co<boolean> {
  if (!nightOn() || !flag(MF.ask) || flag(MF.kucho) || !flag('flag_ch2_yoriai')) return false;
  yield* runMsg(T.MATSURI_KUCHO);
  if (flag(SF.done)) yield* runMsg(T.MATSURI_KUCHO_SHIKISHI_DONE);
  else if (flag(SF.start)) yield* runMsg(T.MATSURI_KUCHO_SHIKISHI);
  yield* runMsg(T.MATSURI_KUCHO_END);
  setFlag(MF.kucho, 1);
  return true;
}

wrap('npc_hoshi_kucho', function* (_ctx, orig): Co {
  if (yield* kuchoMatsuri()) return;
  if (yield* wordAt('kucho')) return;
  yield* orig();
});

// ---------------------------------------------------------------- 第1章：商店会の 倉庫の 垂れ幕

wrap('obj_sk_banner', function* (_ctx, orig): Co {
  yield* orig();
  // グソっ君が 仲間なら「……おもろいんか。ほな、来年は 行こな。」を 聞いた
  if (flag('flag_kanenari_joined')) setFlag(MF.banner, 1);
});

// ---------------------------------------------------------------- 区の 倉庫

wrap('obj_hr_soko_chochin', function* (_ctx, orig): Co {
  if (!nightOn()) {
    yield* orig();
    return;
  }
  if (flag(MF.chochin)) {
    se('se_examine');
    yield* runMsg(T.MATSURI_BOX_AFTER);
    return;
  }
  if (flag(MF.kucho)) {
    se('se_examine');
    yield* runMsg(T.MATSURI_BOX_TAKE);
    setFlag(MF.chochin, 1);
    yield* getKeyItem('item_matsuri_chochin', T.MATSURI_CHOCHIN_GET);
    yield* runCue(T.MATSURI_TAIKO_SEOU, {
      *seou() {
        // 太鼓が よろいの 背中に のる
        se('se_step_wood', { pitch: 0.7 });
        setFlag(MF.taiko, 1);
        const k = field()?.follower;
        if (k) k.hop(4, 220);
        yield 380;
      },
    });
    return;
  }
  yield* orig();
  if (flag(MF.ask) || !kanenariHere()) return;
  setFlag(MF.ask, 1);
  // 部屋の ひとこと（「わい、祭りって 行ってみたいわ。」）を まだ 言っていなければ、ここで
  const said = flag('flag_kanenari_flip_hoshi_r_soko') > 0;
  setFlag('flag_kanenari_flip_hoshi_r_soko', 1);
  const body = (s: string) => s.replace(/^@npc_kanenari\n/, '');
  let t = said ? T.MATSURI_BOX_FLIP2 : T.MATSURI_BOX_FLIP;
  if (flag(MF.banner)) t += '\n/\n' + body(T.MATSURI_BOX_BANNER);
  t += '\n/\n' + body(T.MATSURI_BOX_ASK);
  yield* runMsg(t);
});

wrap('obj_hr_soko_taiko', function* (_ctx, orig): Co {
  const s = hStage();
  if ((flag(MF.taiko) || flag(MF.on)) && s >= 1 && s <= 2) {
    se('se_examine');
    yield* runMsg(T.MATSURI_TAIKO_GONE);
    return;
  }
  if (flag(MF.done)) {
    se('se_examine');
    yield* runMsg(T.MATSURI_TAIKO_BACK);
    return;
  }
  yield* orig();
});

// ---------------------------------------------------------------- 校庭の 桜 → 祭り

wrap('obj_hoshi_sakura', function* (_ctx, orig): Co {
  if (!nightOn()) {
    yield* orig();
    return;
  }
  if (flag(MF.kake)) {
    se('se_examine');
    yield* runMsg(T.MATSURI_SAKURA_AFTER);
    return;
  }
  if (!hasItem('item_matsuri_chochin')) {
    yield* orig();
    return;
  }
  se('se_examine');
  // 色紙が とちゅう：そろって からに しよ
  if (flag(SF.start) && !flag(SF.done)) {
    yield* runMsg(T.MATSURI_SAKURA_WAIT);
    return;
  }
  const r = yield* runMsg(T.MATSURI_SAKURA_ASK);
  if (r !== 0) return;
  yield* matsuri();
});

/** QA: the drum is hit by itself (no key presses needed). */
let qaAuto = false;

/** Words floating up from the drum (ドン・ドン・カッ), drawn over the world. */
const floats: { text: string; x: number; y: number; t0: number }[] = [];
registerWorldFx({
  map: 'map_hoshimidai',
  draw(f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (layer !== 'top' || !floats.length) return;
    const now = f.t;
    for (let i = floats.length - 1; i >= 0; i--) {
      const w = floats[i];
      const k = (now - w.t0) / 800;
      if (k >= 1) {
        floats.splice(i, 1);
        continue;
      }
      const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const x = Math.round(w.x - cx - measure(w.text) / 2);
      const y = Math.round(w.y - cy - 10 * Math.min(1, k * 2.2));
      g.text(w.text, x, y, { color: '#FFF6D8', outline: '#2A2440', alpha: a });
    }
  },
});

// 校庭の 東（桜の 提灯が 見える ところ）：太鼓 (27,29)、しゅんは その 東、グソっ君は その また 東。
// ぴょん夫人は 太鼓の 北、区長は 昇降口の 前（留守番の 範囲）
const DRUM: [number, number] = [27, 29];
const SPOT = { shun: [28, 29] as [number, number], kn: [29, 29] as [number, number], yoshie: [27, 28] as [number, number], kucho: [26, 28] as [number, number], door: [26, 27] as [number, number] };
const YOSHIE_ID = 'matsuri_yoshie';
const KUCHO_ID = 'matsuri_kucho';

/** Walk with the geta's カラン, コロン on each step. */
function* getaWalk(id: string, pts: [number, number][], face: Dir): Co {
  let on = true;
  game.scripts.run(
    (function* (): Co {
      let i = 0;
      while (on) {
        se('se_matsuri_geta', { pitch: i++ % 2 ? 0.86 : 1 });
        yield 290;
      }
    })(),
  );
  yield* walk(id, pts, { speed: 2.2, face });
  on = false;
}

/** ぴょん夫人 (or しゅん): two claps and a turn. */
function* clapAndTurn(a: Actor, claps: 'wave' | 'hold_up'): Co {
  for (let i = 0; i < 2; i++) {
    if (claps === 'wave' && a.sprite.anims?.wave) a.playAnim('wave', false);
    else poseIf(a, claps);
    se('se_matsuri_clap', { pitch: 1 + i * 0.04 });
    yield 300;
    unpose(a);
    yield 120;
  }
  const order: Dir[] = ['left', 'up', 'right', 'down'];
  const start = order.indexOf(a.dir);
  for (let i = 1; i <= 4; i++) {
    a.dir = order[(start + i) % 4];
    yield 110;
  }
  a.hop(3, 200);
  yield 260;
}

/** The festival: the lantern on the cherry, the drum, the sleeper's drum, ぴょん夫人 and 区長, the dance, the reading. */
function* matsuri(): Co {
  const f = field();
  if (!f) return;
  removeItem('item_matsuri_chochin');
  setFlag(MF.kake, 1);
  f.refreshPresence();
  se('se_matsuri_tomoru');
  yield* runMsg(T.MATSURI_SAKURA_HANG);

  // the scene: しゅん beside the drum's place, グソっ君 behind him, the camera on the yard
  yield* game.fadeOut(300, '#0B0B14');
  const p = f.player;
  p.path = [];
  p.moving = false;
  p.x = SPOT.shun[0] * 16 + 8;
  p.y = SPOT.shun[1] * 16 + 16;
  p.dir = 'left';
  f.syncFollower(true);
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.path = [];
    k.x = SPOT.kn[0] * 16 + 8;
    k.y = SPOT.kn[1] * 16 + 16;
    k.dir = 'left';
  }
  f.camOverride = { x: 27 * 16, y: 28 * 16 + 12 };
  f.snapCamera();
  yield 200;
  yield* game.fadeIn(300);
  yield 200;
  // the drum off his back, onto the ground under the cherry
  if (k) k.hop(4, 220);
  yield 220;
  setFlag(MF.taiko, 0);
  setFlag(MF.on, 1);
  f.refreshPresence();
  se('se_step_wood', { pitch: 0.6 });
  yield 300;
  yield* runMsg(T.MATSURI_TAIKO_OKU);

  // ドン、ドン、カッ（決定を 3回。失敗は ない）
  if (!qaAuto) keyGuide([[[touchControlsOn() ? 'けってい' : 'Z'], T.MATSURI_WORD.tataku]], 6000, 8);
  const dx = DRUM[0] * 16 + 8;
  const dy = DRUM[1] * 16;
  for (let i = 0; i < 3; i++) {
    yield 120;
    if (qaAuto) yield 380;
    else yield () => game.input.pressed('confirm');
    poseIf(p, 'stamp');
    if (i < 2) {
      se('se_matsuri_don', { pitch: 1 - i * 0.03 });
      game.shake(1, 140);
    } else se('se_matsuri_ka');
    floats.push({ text: T.MATSURI_HITS[i], x: dx, y: dy - 6, t0: f.t });
    if (i === 2) sparkle(dx + 5, dy + 4, 360);
    yield 180;
    unpose(p);
  }
  yield 700;
  yield* runMsg(T.MATSURI_TAKE_NEGOTO);
  setFlag(MF.take, 1);
  yield 300;

  // ぴょん夫人が 下駄で 出てくる、区長も
  se('se_door');
  yield 350;
  const yo = spawn(YOSHIE_ID, SPOT.door[0], SPOT.door[1], { sprite: 'npc_hoshi_yoshie', dir: 'down', ghost: true });
  yo.data.scripted = true;
  yield* getaWalk(YOSHIE_ID, [[SPOT.door[0], 28], SPOT.yoshie], 'down');
  p.dir = 'up';
  yield* runMsg(T.MATSURI_YOSHIE_OUT);
  se('se_door', { pitch: 0.95, vol: 0.8 });
  yield 300;
  const ku = spawn(KUCHO_ID, SPOT.door[0], SPOT.door[1], { sprite: 'npc_hoshi_kucho', dir: 'down', ghost: true });
  ku.data.scripted = true;
  yield* walk(KUCHO_ID, [SPOT.kucho], { speed: 2.2, face: 'down' });
  yield* runMsg(T.MATSURI_KUCHO_OUT);

  // 踊り：手を 2つ たたいて、くるっと。しゅんが まねる。グソっ君の 拍手は 多すぎる
  yield* runMsg(T.MATSURI_ODORI);
  yield 200;
  yield* clapAndTurn(yo, 'wave');
  yo.dir = 'down';
  yield 200;
  yield* clapAndTurn(p, 'hold_up');
  p.dir = 'up';
  yield 200;
  if (k) {
    k.dir = 'down';
    if (k.sprite.anims?.washa) k.playAnim('washa', true);
  }
  for (const t of [0, 300, 300, 90, 90, 90, 90, 90]) {
    if (t) yield t;
    se('se_matsuri_clap', { pitch: 1.05 + Math.random() * 0.15 });
  }
  yield 300;
  yield* runMsg(T.MATSURI_HAKUSHU);
  if (k) k.anim = null;

  // 色紙が そろっていれば、区長の 読み上げ（窓から 寝言が 2つ）
  const reads = flag(SF.done) > 0 && !flag(SF.read);
  if (reads) {
    ku.dir = 'right';
    yield 200;
    yield* reading('mado');
  }
  yield 300;
  yield* runMsg(T.MATSURI_GK_END);
  // 第1章の「ほな、来年は 行こな。」の 回収
  if (flag(MF.banner)) yield* runMsg(T.MATSURI_GK_RAINEN);
  if (reads) yield* runMsg(T.SHIKISHI_TATE_MATSURI);
  ku.dir = 'down';
  yield* runMsg(T.MATSURI_KUCHO_TAIKO);

  // 区長は 太鼓を 元の 場所へ、ぴょん夫人は 集会所へ（色紙を 立てに）
  yield* game.fadeOut(400, '#0B0B14');
  despawn(YOSHIE_ID);
  despawn(KUCHO_ID);
  setFlag(MF.on, 0);
  if (reads) setFlag(SF.tate, 1);
  setFlag(MF.done, 1);
  f.refreshPresence();
  f.camOverride = null;
  if (k) delete k.data.scripted;
  f.syncFollower(true);
  f.snapCamera();
  yield 300;
  yield* game.fadeIn(400);
  yield* reward();
}

// ---------------------------------------------------------------- 5 かくし：10円玉と 勝敗表

const body = (s: string) => s.replace(/^@narr\n/, '');

wrap('obj_hr_mk2_zabuton', function* (_ctx, orig): Co {
  if (!flag(SF.done)) {
    yield* orig();
    return;
  }
  se('se_examine');
  // いつもの 文の「そっと もどしておいた。」は、紙の 裏を 見た あとに 回す
  const base = R2_OBJ.obj_hr_mk2_zabuton as string;
  const head = base.replace(/\n\{w=300\}そっと もどしておいた。$/, '');
  yield* runMsg(`${head}\n/\n${body(T.SHIKISHI_URA)}`);
  if (!flag(SF.ura)) {
    setFlag(SF.ura, 1);
    if (kanenariHere()) yield* runMsg(T.SHIKISHI_URA_FLIP);
  }
  if (head !== base) yield* runMsg(T.SHIKISHI_URA_END);
});

wrap('obj_hr_mk2_hyou', function* (_ctx, orig): Co {
  if (!flag(SF.done) || (!flag(SF.sankaku) && !kanenariHere())) {
    yield* orig();
    return;
  }
  if (!flag(SF.sankaku)) {
    yield* orig();
    setFlag(SF.sankaku, 1);
    yield* runMsg(T.SHIKISHI_SANKAKU_FLIP);
    se('se_glint', { vol: 0.4 });
    yield* runMsg(T.SHIKISHI_SANKAKU);
    return;
  }
  se('se_examine');
  yield* runMsg(`${R2_OBJ.obj_hr_mk2_hyou as string}\n/\n${body(T.SHIKISHI_SANKAKU)}`);
});

/** 集会所の 2人の 座布団の あいだの 色紙。 */
registerScript('obj_hoshi_shikishi', function* (): Co {
  se('se_examine');
  yield* runMsg(T.SHIKISHI_TATE_OBJ);
});

// ---------------------------------------------------------------- 人物の 絵に 重ねる 物

/** One composited frame per (source frame, key): the base frame stays as it is. */
const overCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function composite(src: HTMLCanvasElement, key: string, pad: number, up: number, paint: (ctx: CanvasRenderingContext2D, bx: number, by: number) => void, behind: boolean): HTMLCanvasElement {
  let m = overCache.get(src);
  if (!m) overCache.set(src, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(src.width + pad * 2, src.height + up);
  ctx.imageSmoothingEnabled = false;
  // bottom centre = the feet (Actor.drawPos keeps the frame's bottom centre)
  const bx = Math.floor(c.width / 2);
  const by = c.height;
  if (behind) paint(ctx, bx, by);
  ctx.drawImage(src, pad, up);
  if (!behind) paint(ctx, bx, by);
  m.set(key, c);
  return c;
}

/** グソっ君 with the drum on his back (by the way he faces). */
function withDrum(a: Actor, src: HTMLCanvasElement): HTMLCanvasElement {
  const d = a.dir;
  const view = d === 'up' ? 'back' : d === 'down' ? 'front' : 'side';
  const img = drumOnBack(view);
  return composite(
    src,
    'drum_' + d,
    4,
    6,
    (ctx, bx, by) => {
      // from behind it rides over his plates; from the front its top shows over his shoulders;
      // from the side it sits on his back (the side away from where he walks)
      const x = d === 'left' ? bx + 1 : d === 'right' ? bx - img.width - 1 : bx - Math.floor(img.width / 2);
      const y = by - (d === 'down' ? 26 : d === 'up' ? 18 : 15);
      ctx.drawImage(img, x, y);
    },
    d !== 'up',
  );
}

/** ぴょん夫人 in cut 3 with last night's lantern (unlit) hanging from her hand, on the side she faces. */
function withLantern(a: Actor, src: HTMLCanvasElement): HTMLCanvasElement {
  const d = a.dir;
  const img = handLantern();
  return composite(
    src,
    'lantern_' + d,
    6,
    0,
    (ctx, bx, by) => {
      const x = d === 'left' ? bx - 9 - img.width + 4 : d === 'right' ? bx + 5 : bx + 4;
      ctx.drawImage(img, x, by - 15);
    },
    d === 'up',
  );
}

type FrameFn = (a: Actor, src: HTMLCanvasElement) => HTMLCanvasElement;
/** Put an over-drawing on one actor's frames (an own frame() on the instance; `unpatch` takes it off). */
function patch(a: Actor, key: string, fn: FrameFn): void {
  if (a.data.matsuriPatch === key) return;
  unpatch(a);
  const base = Object.getPrototypeOf(a).frame as (this: Actor) => HTMLCanvasElement;
  (a as unknown as { frame: () => HTMLCanvasElement }).frame = () => fn(a, base.call(a));
  a.data.matsuriPatch = key;
}
function unpatch(a: Actor): void {
  if (!a.data.matsuriPatch) return;
  delete (a as unknown as { frame?: unknown }).frame;
  delete a.data.matsuriPatch;
}

registerWorldFx({
  map: '',
  update(f) {
    const s = hStage();
    const night = s >= 1 && s <= 2 && isHoshi(f.map.id);
    // the drum on グソっ君's back (from the storehouse to the cherry)
    const k = f.follower;
    if (k) {
      if (night && flag(MF.taiko)) patch(k, 'drum', withDrum);
      else if (k.data.matsuriPatch === 'drum') unpatch(k);
    }
    // the storehouse's drum is away while he carries it, or while it stands under the cherry
    if (f.map.id === 'map_hoshi_soko') {
      const away = night && (flag(MF.taiko) > 0 || flag(MF.on) > 0);
      for (const p of f.props) {
        const o = p.obj as { t: string; prop?: string; opts?: { v?: string } };
        if (o.t === 'prop' && o.prop === 'prop_hr_obj' && o.opts?.v === 'taiko') p.present = !away;
      }
    }
    // the ending's cut 3: ぴょん夫人 with the lantern taken down (the festival was held)
    if (f.map.id === 'map_hoshimidai' && s >= 3 && flag(MF.done)) {
      const y = f.actorById('end_npc_hoshi_yoshie');
      if (y) patch(y, 'lantern', withLantern);
    }
  },
});

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** Where to stand to talk to each (stage 1 unless said: マサル in the barn, まつ先生 in the school). */
const AT: Record<ShikishiWho | 'yoshie' | 'cal' | 'haha' | 'zabuton' | 'hyou' | 'soko' | 'taiko' | 'sakura' | 'tate', [string, number, number, Dir]> = {
  cal: ['map_hoshi_minka2', 9, 2, 'up'],
  yoshie: ['map_hoshi_school', 3, 5, 'left'],
  tome: ['map_hoshimidai', 20, 11, 'right'],
  gen: ['map_hoshi_barn', 19, 6, 'right'],
  mitsu: ['map_hoshimidai', 4, 32, 'left'],
  kucho: ['map_hoshi_school', 6, 4, 'up'],
  fumi: ['map_hoshi_school', 9, 4, 'up'],
  sawako: ['map_hoshimidai', 23, 38, 'up'],
  sankado: ['map_hoshimidai', 36, 41, 'up'],
  haha: ['map_hoshi_gen', 8, 4, 'right'],
  zabuton: ['map_hoshi_minka2', 4, 6, 'up'],
  hyou: ['map_hoshi_minka2', 3, 2, 'up'],
  soko: ['map_hoshi_soko', 1, 3, 'up'],
  taiko: ['map_hoshi_soko', 4, 3, 'up'],
  sakura: ['map_hoshimidai', 23, 30, 'right'],
  tate: ['map_hoshi_school', 7, 7, 'up'],
};

function resetAll(): void {
  for (const id of [...Object.values(SF), ...Object.values(MF), ...T.SHIKISHI_WHO.map((w) => wordFlag(w.who))]) setFlag(id, 0);
  removeItem('item_shikishi');
  removeItem('item_matsuri_chochin');
}

/** Stage 1 with the lantern (the gate open, the round done, the observatory's key and the rest of the story's first talks heard). */
function ready(): void {
  cmd().jump?.('ch2:houki', true);
  resetAll();
  for (const id of ['flag_dome_key', 'flag_seen_npc_hoshi_yoshie_h1_1', 'flag_seen_npc_hoshi_yoshie_h2_1']) setFlag(id, 1);
}

function give(n: number): void {
  if (!state.inventory.includes('item_shikishi')) state.inventory.push('item_shikishi');
  setFlag(SF.cal, 1);
  setFlag(SF.start, 1);
  setFlag(SF.flip, 1);
  T.SHIKISHI_WHO.slice(0, n).forEach((w, i) => setFlag(wordFlag(w.who), i + 1));
}

function done(last: 1 | 2): void {
  give(7);
  removeItem('item_shikishi');
  setFlag(SF.last, last);
  setFlag(SF.done, 1);
}

function go(at: [string, number, number, Dir]): void {
  cmd().warp?.(at[0], at[1], at[2], at[3]);
}

/**
 * QA: __game.cmd.shikishi(step = 'cal')
 *   'cal'      段階1、シゲじいと スギばあの 家の カレンダーの 前（調べる → グソっ君）
 *   'yoshie'   カレンダーを 見た：集会所の ぴょん夫人の となり（話すと〔70〕）
 *   'tome' 'gen' 'mitsu' 'kucho' 'fumi' 'sawako' 'sankado'   色紙を あずかって、その 人の となり
 *   'h2'       段階2：色紙を あずかって、ゲートの 横の マサルの となり
 *   'haha'     マサルの ひとことの あと：マサルの 家の 母の となり（寝言）
 *   'last'     7つ そろった：ぴょん夫人の となり（〔さいご〕→ 朱肉 +2）
 *   'zabuton' 'hyou'   ぜんぶ 書いた あと：座布団の 10円玉／勝敗表の 前
 *   'book'     みました帳②の すみの ページ（メニュー → みました帳 → ②ふしぎ の いちばん下）
 *   'tate'     読み上げた あと：集会所の 色紙の 前
 *   'reset'    この 案の フラグと 大事なものを もどす
 */
registerDebug('shikishi', (step = 'cal') => {
  if (step === 'reset') {
    resetAll();
    return 'shikishi: reset';
  }
  ready();
  if (step === 'cal') {
    go(AT.cal);
    return 'shikishi: examine the calendar (Z)';
  }
  if (step === 'yoshie') {
    setFlag(SF.cal, 1);
    go(AT.yoshie);
    return 'shikishi: talk to ぴょん夫人 (Z) — 〔70〕';
  }
  if (step === 'h2') {
    cmd().jump?.('ch2:hill', true);
    resetAll();
    setFlag('flag_dome_key', 1);
    give(0);
    go(['map_hoshimidai', 49, 19, 'right']);
    return 'shikishi: stage 2, talk to マサル at the gate (Z)';
  }
  if (step === 'haha') {
    give(1);
    setFlag(wordFlag('gen'), 1);
    setFlag(wordFlag('tome'), 2);
    go(AT.haha);
    return 'shikishi: examine マサルの 母 (Z)';
  }
  if (step === 'last') {
    give(7);
    go(AT.yoshie);
    return 'shikishi: talk to ぴょん夫人 (Z) — the last word';
  }
  if (step === 'zabuton' || step === 'hyou' || step === 'book' || step === 'tate') {
    done(2);
    setFlag(SF.haha, 1);
    setFlag(MF.take, 1);
    if (step === 'tate') {
      setFlag(SF.read, 1);
      setFlag(SF.tate, 1);
    }
    if (step === 'book') return 'shikishi: done (open the menu: みました帳 ② ふしぎ, the last row)';
    go(AT[step as 'zabuton' | 'hyou' | 'tate']);
    return `shikishi: examine (Z) — ${step}`;
  }
  const at = AT[step as ShikishiWho];
  if (!at || !T.SHIKISHI_WHO.some((w) => w.who === step)) return Object.keys(AT);
  give(0);
  go(at);
  return `shikishi: talk (Z) — the word of ${step}`;
});

/**
 * QA: __game.cmd.matsuri(step = 'soko', auto = 0)
 *   'soko'     段階1、区の 倉庫の 提灯の 箱の 前（調べる → グソっ君「ハモ区長に…」）
 *   'kucho'    箱を 見た：集会所の 区長の 前（〔matsuri〕）
 *   'get'      区長に 聞いた：箱の 前（提灯を 出す → 太鼓を 背負う）
 *   'sakura'   提灯と 太鼓を 持って、桜の 西 (23,30)（調べる → かける → 祭り。色紙は なし）
 *   'full'     同じ、色紙が そろっている（読み上げ つき、さいごは グソっ君の『ん』）
 *   'fullshun' 同じ、さいごは しゅん
 *   'wait'     色紙が とちゅう：桜で グソっ君が 止める
 *   'end'      祭りの あと（太鼓は 倉庫、提灯は 桜）、桜の 西
 *   auto = 1   太鼓を ひとりでに 3回 たたく（QA の 写真）
 *   'reset'    もどす
 */
registerDebug('matsuri', (step = 'soko', auto = 0) => {
  qaAuto = !!Number(auto);
  if (step === 'reset') {
    resetAll();
    return 'matsuri: reset';
  }
  ready();
  setFlag(MF.banner, 1);
  if (step === 'soko') {
    go(AT.soko);
    return 'matsuri: examine the lantern box (Z)';
  }
  setFlag(MF.ask, 1);
  setFlag('flag_kanenari_flip_hoshi_r_soko', 1);
  if (step === 'kucho') {
    go(AT.kucho);
    return 'matsuri: talk to ハモ区長 (Z) — 〔matsuri〕';
  }
  setFlag(MF.kucho, 1);
  if (step === 'get') {
    go(AT.soko);
    return 'matsuri: examine the box (Z) — the lantern, the drum on his back';
  }
  setFlag(MF.chochin, 1);
  if (step === 'end') {
    setFlag(MF.kake, 1);
    setFlag(MF.take, 1);
    setFlag(MF.done, 1);
    go(AT.sakura);
    return 'matsuri: after the festival';
  }
  setFlag(MF.taiko, 1);
  if (!state.inventory.includes('item_matsuri_chochin')) state.inventory.push('item_matsuri_chochin');
  if (step === 'full' || step === 'fullshun') done(step === 'full' ? 2 : 1);
  if (step === 'wait') give(3);
  go(AT.sakura);
  return `matsuri: examine the cherry (Z) — ${step}${qaAuto ? ' (the drum hits itself)' : ''}`;
});

registerDebug('shikishiState', () => ({
  stage: hStage(),
  night: nightOn(),
  count: shikishiCount(),
  order: shikishiOrder(),
  ...Object.fromEntries(Object.entries(SF).map(([k, f]) => ['s_' + k, flag(f)])),
  ...Object.fromEntries(Object.entries(MF).map(([k, f]) => ['m_' + k, flag(f)])),
  items: state.inventory.filter((i) => i === 'item_shikishi' || i === 'item_matsuri_chochin'),
}));

/** Every page of this idea: 3 lines × 336 px; no clock time or the words chapter 2 keeps out; no さん after a name in @narr. */
export function shikishiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const texts: [string, string][] = [];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') texts.push([name, v]);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('shikishi', T.SHIKISHI_TEXTS);
  // ぴょん夫人の のこりの 人：7人 ぜんぶ のこっている とき（いちばん 長い）
  const saved = T.SHIKISHI_WHO.map((w) => flag(wordFlag(w.who)));
  T.SHIKISHI_WHO.forEach((w) => setFlag(wordFlag(w.who), 0));
  texts.push(['shikishi.left7', leftText()]);
  T.SHIKISHI_WHO.forEach((w, i) => setFlag(wordFlag(w.who), saved[i]));
  for (const [name, src] of texts) {
    let speaker = '';
    let cur: string[] = [];
    const flush = () => {
      if (!cur.length) return;
      pages++;
      if (cur.length > 3) bad.push(`${name}: ${cur.length} lines: ${cur.join('／')}`);
      for (const l of cur) {
        const w = measure(l.replace(/\{[^}]*\}/g, ''));
        if (w > 336) bad.push(`${name}: ${w}px: ${l}`);
        const plain = l.replace(/\{[^}]*\}/g, '');
        for (const ng of ['12人', '1日2本', 'おまけの 1つ', 'おまけの1つ', '具足様', 'まだ', '平和', '17', '3人', '盆踊り', 'あちゃ〜', 'ほどよい', 'らっきょ'])
          if (plain.includes(ng)) bad.push(`${name}: 「${ng}」: ${plain}`);
        if (/\d{1,2}[:：]\d{2}|\d+時/.test(plain)) bad.push(`${name}: clock time: ${plain}`);
        if (speaker === 'narr' && /(マサル|ソワカ|ペロ|さんかど|トマじい|まつ先生|ぴょん夫人|区長|シゲじい|スギばあ)さん/.test(plain)) bad.push(`${name}: さん in @narr: ${plain}`);
      }
      cur = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      if (t.startsWith('@')) {
        flush();
        speaker = t.slice(1);
        continue;
      }
      if (t === '/') {
        flush();
        continue;
      }
      cur.push(raw.replace(/\s+$/, ''));
    }
    flush();
  }
  return { pages, bad };
}
registerDebug('shikishiText', () => shikishiTextCheck());
