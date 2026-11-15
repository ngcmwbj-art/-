// 再生エンジン（js/player.js）を、連打・シャッフル・削除などで揺さぶって、状態がずれないかを確かめる。
//   node tests/e2e/player.check.mjs
// 失敗したら exit 1。

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright'));
}

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'fixtures');
// Chromium で鳴らせるものだけ
const FILES = ['a1-natsu.mp3', 'a2-kusa.mp3', 'a3-yuuyake.flac', 'b2-seaside.ogg', 'c1-opus.opus', '07 たぐなしの曲.wav', 'wav-info.wav', 'notag-vbr.mp3', 'both-tags.mp3'];

let failures = 0;
function ok(cond, what) {
  if (cond) { console.log(`  ✓ ${what}`); return; }
  failures++;
  console.log(`  ✗ ${what}   ← 失敗`);
}

const { server, url } = await startServer(0);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

// いまの状態が、つじつまの合ったものかを調べる（合わない点を文字のならびで返す）
const check = () => page.evaluate(() => {
  const { player, library } = window.__music;
  const a = document.getElementById('audio');
  const bad = [];
  if (player.queue.length) {
    if (player.index < 0 || player.index >= player.queue.length) bad.push(`index ${player.index} がならびの外`);
    const want = library.get(player.queue[player.index]);
    if (player.current !== want) bad.push('current がならびの曲とちがう');
    if (player._loaded && a.src !== player._url) bad.push('<audio> の中身が、いまの曲のものではない');
    if (player._loaded && player.wantPlay && a.paused && !a.ended) bad.push('再生中のはずなのに止まっている');
    if (player._loaded && !player.wantPlay && !a.paused) bad.push('止めたはずなのに鳴っている');
    const n = player.queue.length;
    const near = new Set();
    if (n > 1) { near.add(player.queue[(player.index + 1) % n]); near.add(player.queue[(player.index - 1 + n) % n]); }
    for (const id of player._ready.keys()) if (!near.has(id)) bad.push(`となりではない曲 ${id} を用意したまま`);
    if (player._ready.size > 2) bad.push(`用意した曲が ${player._ready.size} 個`);
    const sorted = (x) => x.slice().sort((p, q) => p - q).join(',');
    if (sorted(player.queue) !== sorted(player.base)) bad.push('queue と base の中身がちがう');
    for (const id of player.queue) if (!library.get(id)) bad.push(`消えた曲 ${id} がならびに残っている`);
  } else {
    if (player.current) bad.push('ならびが空なのに current がある');
    if (player.wantPlay) bad.push('ならびが空なのに再生中');
    if (player._ready.size) bad.push('ならびが空なのに用意した曲がある');
  }
  return bad;
});
const settle = (ms = 500) => page.waitForTimeout(ms);
const P = (fn, arg) => page.evaluate(fn, arg);

try {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__music && !document.getElementById('boot'));
  await page.setInputFiles('#file-input', FILES.map((name) => ({ name, mimeType: '', buffer: readFileSync(join(fixtures, name)) })));
  await page.waitForFunction((n) => window.__music.library.size === n, FILES.length, { timeout: 30000 });
  await settle(2300);
  // 最初の1回は本当に押して、<audio> を「使ってよい」状態にする
  await page.locator('.page:not([hidden]) .vl-song').first().click();
  await page.waitForFunction(() => !document.getElementById('audio').paused);
  await page.click('#np-back');
  await settle(450);

  console.log('\n■ 連打');
  await P(() => { const p = window.__music.player; for (let i = 0; i < 12; i++) p.next(true); });
  await settle();
  ok((await check()).length === 0, `「次へ」を12回つづけて押しても、つじつまが合う ${JSON.stringify(await check())}`);
  await P(async () => { const p = window.__music.player; for (let i = 0; i < 9; i++) { p.prev(); await new Promise((r) => setTimeout(r, 7)); } });
  await settle();
  ok((await check()).length === 0, `「前へ」を9回 ${JSON.stringify(await check())}`);
  await P(async () => {
    const p = window.__music.player;
    for (let i = 0; i < 20; i++) { p.toggle(); await new Promise((r) => setTimeout(r, 3)); }
  });
  await settle();
  ok((await check()).length === 0, `再生・一時停止を20回 ${JSON.stringify(await check())}`);
  await P(async () => {
    const p = window.__music.player;
    const n = p.queue.length;
    for (let i = 0; i < 15; i++) { p.jumpTo((i * 4) % n); await new Promise((r) => setTimeout(r, i % 3 ? 0 : 12)); }
  });
  await settle();
  ok((await check()).length === 0, `ならびの中をあちこちへ飛ぶ ${JSON.stringify(await check())}`);

  console.log('\n■ シャッフル・リピート・次に再生');
  const r1 = await P(async () => {
    const p = window.__music.player;
    const cur = p.current.id;
    const size = p.queue.length;
    p.setShuffle(true);
    const a = { keep: p.current.id === cur && p.index === 0, size: p.queue.length === size };
    p.setShuffle(false);
    const b = { keep: p.current.id === cur, order: p.queue.join(',') === p.base.join(',') };
    for (let i = 0; i < 7; i++) p.cycleRepeat();
    p.setShuffle(true); p.setShuffle(true); p.setShuffle(false);
    return { a, b, repeat: p.repeat };
  });
  await settle();
  ok(r1.a.keep && r1.a.size && r1.b.keep && r1.b.order, 'シャッフルを入り切りしても、いまの曲と曲の数は変わらず、切ると元の順にもどる');
  ok(r1.repeat === 'all', 'リピートを7回押すと「全体」（オフ → 全体 → 1曲 のくり返し）');
  ok((await check()).length === 0, `つじつまが合う ${JSON.stringify(await check())}`);
  const r2 = await P(async () => {
    const p = window.__music.player;
    while (p.repeat !== 'off') p.cycleRepeat();
    const others = p.queue.filter((id) => id !== p.current.id);
    p.playNext([others[3]]);
    const nextId = p.queue[p.index + 1];
    p.next(true);
    await new Promise((r) => setTimeout(r, 300));
    return { inserted: nextId === others[3], now: p.current.id === others[3], dup: p.queue.filter((id) => id === others[3]).length };
  });
  await settle();
  ok(r2.inserted && r2.now && r2.dup === 2, '「次に再生」で入れた曲が、すぐ次に流れる（同じ曲が2回入ったならびになる）');
  ok((await check()).length === 0, `同じ曲が2回入ったならびでも、つじつまが合う ${JSON.stringify(await check())}`);
  const r3 = await P(() => {
    const p = window.__music.player;
    const n = p.queue.length;
    p.setShuffle(true);
    const m = p.queue.length;
    p.setShuffle(false);
    return { n, m, k: p.queue.length };
  });
  ok(r3.n === r3.m && r3.m === r3.k, '同じ曲が2回入ったならびでシャッフルしても、数が変わらない');

  console.log('\n■ 再生中の削除');
  const del = async (which) => P(async (w) => {
    const { player, library, db } = window.__music;
    const ids = w === 'current' ? [player.current.id]
      : w === 'next' ? [player.queue[(player.index + 1) % player.queue.length]]
        : w === 'two-before' ? player.queue.slice(0, Math.min(2, player.index))
          : Array.from(library.tracks.keys());
    if (!ids.length) return { ids, before: player.index, after: player.index, cur: player.current && player.current.id, was: player.current && player.current.id };
    const was = player.current.id;
    const before = player.index;
    await db.deleteTracks(ids);
    player.tracksRemoved(ids);
    library.remove(ids);
    return { ids, before, after: player.index, was, cur: player.current ? player.current.id : null, playing: player.playing };
  }, which);
  await P(() => { const p = window.__music.player; p.jumpTo(3); });
  await settle(300);
  let d = await del('current');
  await settle();
  ok(d.cur !== d.was && d.after === d.before && d.playing, 'いまの曲を消すと、同じ場所にずれてきた次の曲が鳴る');
  ok((await check()).length === 0, `つじつまが合う ${JSON.stringify(await check())}`);
  d = await del('next');
  await settle();
  ok(d.cur === d.was && d.after === d.before, '次の曲を消しても、いまの曲はそのまま');
  ok((await check()).length === 0, `用意してあった次の曲を手放している ${JSON.stringify(await check())}`);
  d = await del('two-before');
  await settle();
  ok(d.cur === d.was && d.after === d.before - d.ids.length, '前にある曲を消すと、番号だけが前へずれる');
  ok((await check()).length === 0, `つじつまが合う ${JSON.stringify(await check())}`);
  // 読みこんでいる最中に消す
  await P(async () => {
    const { player, library, db } = window.__music;
    const target = (player.index + 1) % player.queue.length;
    const id = player.queue[target];
    player.jumpTo(target);
    await db.deleteTracks([id]);
    player.tracksRemoved([id]);
    library.remove([id]);
  });
  await settle();
  ok((await check()).length === 0, `読みこみの最中にその曲を消しても、つじつまが合う ${JSON.stringify(await check())}`);

  console.log('\n■ 最後の曲・1曲だけのならび');
  const r4 = await P(async () => {
    const { player, library } = window.__music;
    const ids = Array.from(library.tracks.keys());
    player.playList([ids[0]], 0, { shuffle: false });
    await new Promise((r) => setTimeout(r, 300));
    const a = { ready: player._ready.size };
    player.next(true);
    await new Promise((r) => setTimeout(r, 300));
    a.sameAfterNext = player.current.id === ids[0] && player.index === 0;
    player.prev();
    a.sameAfterPrev = player.current.id === ids[0];
    return a;
  });
  await settle();
  ok(r4.ready === 0 && r4.sameAfterNext && r4.sameAfterPrev, '1曲だけのならびでは、次へ・前へを押しても同じ曲のまま');
  ok((await check()).length === 0, `つじつまが合う ${JSON.stringify(await check())}`);

  console.log('\n■ 全部消す');
  await del('all');
  await settle();
  const end = await P(() => {
    const { player } = window.__music;
    const a = document.getElementById('audio');
    return { cur: player.current, q: player.queue.length, src: a.getAttribute('src'), paused: a.paused, url: player._url, ls: localStorage.getItem('music.pos') };
  });
  ok(end.cur === null && end.q === 0 && !end.src && end.paused && end.url === null && end.ls === null, '全部消すと、止まって、控えも消える');
  ok((await check()).length === 0, `つじつまが合う ${JSON.stringify(await check())}`);

  ok(pageErrors.length === 0, `ページのエラーなし ${pageErrors.slice(0, 3).join(' / ')}`);
} catch (err) {
  failures++;
  console.log(`\n✗ 途中で止まりました: ${err && err.message}`);
  if (pageErrors.length) console.log('  ページのエラー:', pageErrors.slice(0, 5));
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} 件の失敗` : '\nすべて通りました');
process.exit(failures ? 1 : 0);
