// クリア後の QA コマンド（05_postgame。開発サーバーだけ）：
//   __game.cmd.pg()                 今の時計・帯・段階・光
//   __game.cmd.pg('17:30')          時刻を置く（日は変えない）
//   __game.cmd.pg('band', '夜')     その帯の始まりへ（朝・昼・夕方・夜、または asa・hiru・yu・yoru）
//   __game.cmd.pg('+', 90)          分を進める（ツガオ便と同じ道。日をまたげば日が進む）
//   __game.cmd.pg('speed', 10)      時計の速さ（1 = ふつう）
//   __game.cmd.pg('snap')           光と人を今の帯にすぐ（20秒の移りを待たない）
//   __game.cmd.pgWho()              今の地図で、表（pgSchedule と下じき）が決めている物
//   __game.cmd.pgCut('yasumi', ms)  シークレットエンディングの1枚絵（cut_pg_yasumi）を見せる
//   __game.cmd.pgShot(i)            1日を回るカット i（0〜3）・'park' の所と時刻へ（HD-2D はそのレンズ）

import { registerDebug } from '../debug';
import { game } from '../engine/game';
import { playC3Cut } from '../events/ch3/cuts';
import { PG_SECRET_CUTS, PG_SECRET_PARK } from './pg_secret';
import { flag } from '../game/state';
import { field } from './field';
import { pgObjPresent } from './pg_schedule';
import {
  PG_BANDS,
  pgBand,
  pgBandDef,
  pgClockText,
  pgDay,
  pgLight,
  pgMin,
  pgOn,
  pgAdvance,
  pgSetMin,
  pgSkipTo,
  pgSpeed,
  setPgSpeed,
  type PgBand,
} from './postgame';

function bandOf(s: string): PgBand | null {
  const d = PG_BANDS.find((b) => b.id === s || b.name === s);
  return d ? d.id : null;
}

function status(): Record<string, unknown> {
  const f = field();
  return {
    on: pgOn(),
    clock: pgClockText(),
    min: pgMin(),
    day: pgDay(),
    band: `${pgBand()}（${pgBandDef().name}）`,
    speed: pgSpeed,
    flag_stage: flag('flag_stage'),
    flag_clock: flag('flag_clock'),
    flag_ch2_stage: flag('flag_ch2_stage'),
    flag_ch3_stage: flag('flag_ch3_stage'),
    light: f ? pgLight(f.map.def)?.id ?? null : null,
    map: f?.map.id ?? null,
  };
}

if (import.meta.env.DEV) {
  registerDebug('pg', (a?: unknown, b?: unknown) => {
    if (!pgOn() && a !== undefined) return 'クリア後ではない（flag_ch3_clear が 0）';
    const f = field();
    if (typeof a === 'string') {
      const m = /^(\d{1,2}):(\d{2})$/.exec(a);
      if (m) pgSetMin(+m[1] * 60 + +m[2]);
      else if (a === 'band') {
        const band = bandOf(String(b));
        if (!band) return '帯は 朝・昼・夕方・夜（asa・hiru・yu・yoru）';
        pgSkipTo(band);
      } else if (a === '+') pgAdvance(Number(b) || 0);
      else if (a === 'speed') setPgSpeed(Number(b) || 1);
      else if (a === 'snap') f?.pgSnap();
      else return "pg('17:30') / pg('band','夜') / pg('+',90) / pg('speed',10) / pg('snap')";
      if (a !== 'speed' && a !== 'snap' && b !== false) f?.pgSnap();
    }
    return status();
  });

  registerDebug('pgWho', () => {
    const f = field();
    if (!f) return null;
    const out: Record<string, boolean> = {};
    for (const o of f.map.objects) {
      if (o.t === 'door' || o.t === 'trig') continue;
      const v = pgObjPresent(o, f.map.id);
      if (v !== null) out[(o.t === 'prop' ? o.prop : o.id) + `@${o.x},${o.y}`] = v;
    }
    return out;
  });
}

if (import.meta.env.DEV) {
  registerDebug('pgCut', (name = 'yasumi', ms = 4000) => {
    game.scripts.run(playC3Cut('cut_pg_' + name, { ms }));
    return 'cut_pg_' + name;
  });

  registerDebug('pgShot', async (i: number | 'park' = 0) => {
    // (loaded here: events/ending is the scenario's module, not to be pulled in by the world's)
    const { endingView } = await import('../events/ending');
    const f = field();
    if (!f) return null;
    const c = i === 'park' ? { shot: PG_SECRET_PARK.shot, at: PG_SECRET_PARK.shun, min: PG_SECRET_PARK.min } : PG_SECRET_CUTS[i];
    if (!c) return null;
    f.loadMap(c.at.map, c.at.x, c.at.y, c.at.dir ?? 'down');
    pgSetMin(c.min);
    f.pgSnap();
    // (the lens holds while a script runs: a long wait keeps it up for QA)
    game.scripts.run(
      (function* () {
        endingView.shot(f, c.shot);
        yield 30000;
        endingView.shot(f, null);
      })(),
    );
    return c;
  });
}
