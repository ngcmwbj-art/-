// クリア後の会話（05_postgame 6章。E の第2期）：3つの町の人と、隊列のグソっ君の新しい台詞。
//
// 人ごとの台本を包む（前の台本は消さない。クリア後でなければ前の物をそのまま呼ぶ）。クリア後は：
//   1. 返す物（潜りで拾った めがね・仕掛け・『か』の字）を持っていれば、持ち主に返す1ページ
//   2. その人が入口の寄り道（yarinokoshi.ts の行）が、窓の中で まだ なら、前の台本（寄り道の入口の
//      今の台詞。6.1）。グソっ君が要る行は、グソっ君が いっしょの ときだけ
//   3. はじめての1回は p_1、寄り道が済んだあとの1ページ（after。1回ずつ）、それから帯の台詞
//      （pa・ph・py・pn）、無ければ p
// W の pickTalk の p キー（話の表に p を入れる形）は使わない：表は今のまま、flag_seen_* も
// クリア後の台詞では立てない（seen を条件にしている寄り道は、2. で前の台本に通る）。
//
// グソっ君（隊列）は、地図ごとの台本（kanenari_<map>）を包む：寄り道の地図（屋上・校庭・天文台）と
// 店の前（events/postgame.ts の「店に もどる？」）は前の物、ほかは町 × 帯の ひとこと。
//
// QA（開発サーバーだけ）：__game.cmd.pgTalk(id)  その人の今の判定（寄り道の入口か、どのキーか）

import type { Co } from '../engine/co';
import { flag, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { registerScript } from '../world/api';
import { getScript, type ScriptCtx } from '../world/scripts';
import { mapIds } from '../world/maps';
import { field } from '../world/field';
import { pgBand, pgBandDef, pgOn, pgTownOf } from '../world/postgame';
import { YR_ROWS, yrWindowOpen, type YrRow } from '../data/text/yarinokoshi';
import { PG_KN_LINES, PG_RETURN_MEGANE, PG_TALK_HOSHI, PG_TALK_UMI, PG_TALK_YUNARI, type PgTalk } from '../data/text/pg_talk';
import { RETURN_KA, RETURN_SHIKAKE } from '../data/text/c3_story2';
import { PG_OBJ_SAME, PG_OBJ_TEXT, PG_OBJ_WINDOW } from '../data/text/pg_objs';
import { sfx } from '../audio';
import { say3 } from './ch3/common';
import { pgAtShop } from './postgame';

const TALK: Record<string, PgTalk> = { ...PG_TALK_YUNARI, ...PG_TALK_HOSHI, ...PG_TALK_UMI };

/** グソっ君が隊列に いる（見えている）。 */
function knWith(): boolean {
  const f = field();
  return flag('flag_pg_kn') > 0 && !flag('flag_follower_hidden') && !!f?.follower?.visible;
}

/** その人が入口の、窓の中で まだの 寄り道。 */
export function pgPendingRow(npcId: string): YrRow | null {
  const band = pgBand();
  for (const r of YR_ROWS) {
    if (!r.npcs.includes(npcId) || r.done()) continue;
    if (!yrWindowOpen(r, band)) continue;
    if (r.kn && !knWith()) continue;
    return r;
  }
  return null;
}

/** 返す物（1回）：true = 返した。 */
function* giveBack(npcId: string): Co<boolean> {
  const has = (i: string): boolean => state.inventory.includes(i);
  if (npcId === 'npc_c3_sirenban' && has('item_c3_megane')) {
    yield* say3(PG_RETURN_MEGANE);
    removeItem('item_c3_megane');
    setFlag('flag_ch3_megane_back', 1);
    return true;
  }
  if (npcId === 'npc_c3_tsuri' && has('item_c3_shikake')) {
    yield* say3(RETURN_SHIKAKE);
    removeItem('item_c3_shikake');
    setFlag('flag_ch3_shikake_back', 1);
    return true;
  }
  if (npcId === 'npc_c3_shokudo' && has('item_c3_kanban_ka')) {
    yield* say3(knWith() ? RETURN_KA : RETURN_KA.replace(/^@npc_kanenari\n[^@]*/, '@narr\n看板の『か』を、わたした。\n'));
    removeItem('item_c3_kanban_ka');
    setFlag('flag_ch3_kanban_ka', 1);
    return true;
  }
  return false;
}

/** 今の帯で話す台詞のキー（なければ null）。first：はじめての1回か。 */
function pickKey(npcId: string, t: PgTalk): string | null {
  if (t.p_1 && !flag(`flag_pg_talk_${npcId}`)) return 'p_1';
  for (const a of t.after ?? []) {
    const row = YR_ROWS.find((r) => r.id === a.row);
    if (row?.done() && !flag(`flag_pg_after_${npcId}_${a.row}`)) return `after:${a.row}`;
  }
  const k = pgBandDef().key;
  if (t[k]) return k;
  if (t.p) return 'p';
  return null;
}

function textOf(t: PgTalk, key: string): string {
  if (key.startsWith('after:')) return t.after!.find((a) => a.row === key.slice(6))!.text;
  return (t as Record<string, string>)[key];
}

function wrapNpc(npcId: string, t: PgTalk): void {
  const before = getScript(npcId);
  registerScript(npcId, function* (ctx: ScriptCtx): Co {
    const old = function* (): Co {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
    };
    if (!pgOn()) {
      yield* old();
      return;
    }
    if (yield* giveBack(npcId)) return;
    if (pgPendingRow(npcId)) {
      yield* old();
      return;
    }
    const key = pickKey(npcId, t);
    if (!key) {
      yield* old();
      return;
    }
    if (key === 'p_1') setFlag(`flag_pg_talk_${npcId}`, 1);
    if (key.startsWith('after:')) setFlag(`flag_pg_after_${npcId}_${key.slice(6)}`, 1);
    yield* say3(textOf(t, key), npcId);
  });
}

for (const [id, t] of Object.entries(TALK)) wrapNpc(id, t);

// ---------------------------------------------------------------- グソっ君（隊列）

/** 前の台本を通す地図：寄り道の入口（屋上の握手・校庭・天文台）。 */
const KN_KEEP = new Set(['map_mall_roof', 'map_school_kotei', 'map_hoshi_dome']);

for (const m of mapIds()) {
  const before = getScript('kanenari_' + m);
  registerScript('kanenari_' + m, function* (ctx: ScriptCtx): Co {
    const f = field();
    if (!pgOn() || !f || KN_KEEP.has(m) || pgAtShop()) {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
      return;
    }
    const lines = PG_KN_LINES[`${pgTownOf(f.map.def)}_${pgBand()}`];
    if (!lines?.length) {
      yield* ctx.runDefault();
      return;
    }
    const n = flag('flag_pg_kn_usual');
    setFlag('flag_pg_kn_usual', n + 1);
    yield* say3(`@npc_kanenari\n${lines[n % lines.length]}`);
  });
}

// ---------------------------------------------------------------- 調べる物（6.3）

/**
 * 止まった時間の文が出ていた物：クリア後は 1ページの 今の文（data/text/pg_objs.ts）。まだ 拾っていない
 * 隠し物・まだ 押していない ふしぎは、今のまま（物の決まりが 先）。寄り道の物は、その窓の間は今の台本。
 */
function objDef(id: string): Record<string, unknown> | null {
  const f = field();
  const o = f?.map.objects.find((x) => x.t === 'obj' && x.id === id) as Record<string, unknown> | undefined;
  return o ?? null;
}
const OBJ_IDS = [...Object.keys(PG_OBJ_TEXT), ...Object.keys(PG_OBJ_SAME)];
for (const id of OBJ_IDS) {
  const before = getScript(id);
  const text = PG_OBJ_TEXT[PG_OBJ_SAME[id] ?? id];
  registerScript(id, function* (ctx: ScriptCtx): Co {
    const old = function* (): Co {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
    };
    if (!pgOn() || PG_OBJ_WINDOW[id] === pgBand()) {
      yield* old();
      return;
    }
    const o = objDef(id);
    const reward = o?.reward as { flag?: string } | undefined;
    if ((reward?.flag && !flag(reward.flag)) || (typeof o?.fushigi === 'string' && !flag('flag_' + o.fushigi))) {
      yield* old();
      return;
    }
    sfx('se_examine');
    yield* say3(text);
  });
}

// ---------------------------------------------------------------- QA

if (import.meta.env.DEV)
  registerDebug('pgTalk', (id?: string) => {
    if (!id) return Object.keys(TALK);
    const t = TALK[id];
    return { pending: pgPendingRow(id)?.id ?? null, key: t ? pickKey(id, t) : null, band: pgBand() };
  });
