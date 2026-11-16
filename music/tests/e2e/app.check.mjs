// 画面を実際に動かして確かめるテスト（Playwright の Chromium）。
//   node tests/e2e/app.check.mjs
// 取り込み → 一覧 → 再生 → 次の曲 → 開きなおし → 削除 → プレイリスト → 検索 → 通信なしでの起動、まで通します。
// 失敗したら exit 1。
//
// メモ: Chromium は AAC / ALAC（.m4a）と AIFF を鳴らせないので、
//   AIFF は「取り込みのときにとばす」、m4a は「鳴らせなかったら次の曲へ進む」の確認に使っています。

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
const FILES = [
  'a1-natsu.mp3', 'a2-kusa.mp3', 'a3-yuuyake.flac', 'b1-umi.m4a', 'b2-seaside.ogg', 'c1-opus.opus',
  '07 たぐなしの曲.wav', 'wav-info.wav', 'c2-alac.m4a', 'aiff-id3.aiff', 'notag-vbr.mp3', 'both-tags.mp3',
];
// ファイル名に日本語があると Playwright がパス指定では渡せないことがあるので、中身を直接渡す
const payload = (names) => names.map((name) => ({ name, mimeType: '', buffer: readFileSync(join(fixtures, name)) }));

let failures = 0;
let step = '';
function ok(cond, what) {
  if (cond) { console.log(`  ✓ ${what}`); return; }
  failures++;
  console.log(`  ✗ ${what}   ← 失敗（${step}）`);
}
function section(name) { step = name; console.log(`\n■ ${name}`); }

const { server, url } = await startServer(0);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ja-JP',
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text()}`); });

const M = (fn, arg) => page.evaluate(fn, arg);
const ready = () => page.waitForFunction(() => window.__music && !document.getElementById('boot'), null, { timeout: 15000 });
const settle = (ms = 450) => page.waitForTimeout(ms);
const tab = async (name) => { await page.click(`.tab[data-tab="${name}"]`); await settle(120); };
const titles = (sel = '.page:not([hidden]) .vl-item .r-title') => page.locator(sel).allTextContents();
const dismissAlert = async () => { const b = page.locator('.alert-btn').last(); await b.click(); await settle(350); };
const state = () => M(() => {
  const p = window.__music.player;
  const a = document.getElementById('audio');
  return {
    title: p.current ? p.current.title : null, playing: p.playing, time: p.time, index: p.index,
    queue: p.queue.length, paused: a.paused, shuffle: p.shuffle, repeat: p.repeat,
  };
});
const waitTitle = (t, timeout = 12000) => page.waitForFunction(
  (x) => window.__music.player.current && window.__music.player.current.title === x, t, { timeout },
);
const waitPlaying = (min = 0.25) => page.waitForFunction(
  (m) => !document.getElementById('audio').paused && document.getElementById('audio').currentTime > m, min, { timeout: 10000 },
);
const openNp = async () => { await page.click('.bb.nowp'); await settle(500); };
const closeNp = async () => { await page.click('#np-back'); await settle(500); };

try {
  // ──────────────────────────────────────────────
  section('起動（曲がない状態）');
  await page.goto(url, { waitUntil: 'load' });
  await ready();
  ok(await page.locator('.empty-title').first().innerText() === '曲がありません', '「曲がありません」の案内が出る');
  ok(await page.locator('.tab.on').getAttribute('data-tab') === 'songs', '最初は「曲」タブ');
  ok(!(await page.locator('.bb.nowp').count()), '「再生中」ボタンは出ていない');

  // ──────────────────────────────────────────────
  section('見本の曲');
  await page.locator('.page:not([hidden]) .bigbtn.gray', { hasText: '見本の曲を入れてみる' }).click();
  await page.waitForFunction(() => window.__music.library.size === 4, null, { timeout: 20000 });
  await settle(2300);
  {
    const demo = await M(() => {
      const { library } = window.__music;
      const tracks = Array.from(library.tracks.values());
      return {
        titles: tracks.map((t) => t.title).sort(),
        albums: library.albumRows().map((r) => `${r.item.title}/${r.item.artist}/${r.item.tracks.length}/${r.item.year}`),
        art: tracks.every((t) => !!t.artId),
        arts: new Set(tracks.map((t) => t.artId)).size,
        durations: tracks.every((t) => t.duration > 8 && t.duration < 40),
        tracks: tracks.map((t) => t.track).sort().join(''),
      };
    });
    ok(JSON.stringify(demo.titles) === JSON.stringify(['あさのチャイム', 'ひるのさんぽ', 'ほしのこもりうた', 'ゆうやけこみち'].sort()), '見本の4曲が入る');
    ok(JSON.stringify(demo.albums) === JSON.stringify(['あさの牧場/見本の楽団/2/2024', 'ゆうぐれの丘/見本の楽団/2/2025']), 'アルバム2枚にまとまる（題名・年もタグから読めている）');
    ok(demo.art && demo.arts === 2 && demo.durations && demo.tracks === '1122', 'ジャケット・長さ・曲番号が入っている');
  }
  await page.locator('.page:not([hidden]) .vl-song', { hasText: 'あさのチャイム' }).click();
  await waitPlaying();
  ok((await state()).title === 'あさのチャイム', '見本の曲が鳴る');
  await page.click('#np-play');
  await closeNp();
  // 見本を消して、まっさらにもどす
  await M(async () => {
    const { library, db, player, art } = window.__music;
    const ids = Array.from(library.tracks.keys());
    await db.clearMusic();
    player.tracksRemoved(ids);
    art.reset();
    library.load([], []);
  });
  await settle(300);
  ok(await page.locator('.empty-title').first().isVisible(), '消すと「曲がありません」にもどる');

  // ──────────────────────────────────────────────
  section('取り込み');
  await page.setInputFiles('#file-input', [
    ...payload(FILES),
    { name: 'memo.txt', mimeType: 'text/plain', buffer: Buffer.from('これは音楽ではありません') },
  ]);
  await page.waitForSelector('.alert', { timeout: 30000 });
  const summary = await page.locator('.alert-msg').innerText();
  ok(/11曲を追加しました/.test(summary), `11曲を追加した（${summary.split('\n')[0]}）`);
  ok(/再生できない形式.*1件.*aiff-id3\.aiff/.test(summary), 'この端末で鳴らせない AIFF はとばして知らせる');
  ok(/音楽ではないファイル 1件/.test(summary), '音楽ではないファイルはとばす');
  await dismissAlert();
  ok(await M(() => window.__music.library.size) === 11, 'ライブラリに 11曲');
  const songTitles = await titles('.page:not([hidden]) .vl-song .r-title');
  ok(songTitles.length === 11 && songTitles.includes('夏のはじまり') && songTitles.includes('たぐなしの曲'),
    '題名がタグ（無ければファイル名）から付いている');
  ok(songTitles[0] === 'たぐなしの曲' && songTitles[1] === 'ゆうやけ', 'かな → 英字 → その他 の順にならぶ');
  ok((await page.locator('.vl-note').innerText()) === '11曲', '下に「11曲」');

  // ──────────────────────────────────────────────
  section('アルバム・アーティスト');
  await tab('albums');
  const albumTitles = await titles('.page:not([hidden]) .vl-album .r-title');
  ok(JSON.stringify(albumTitles.slice().sort()) === JSON.stringify(['Singles', 'Wave Album', 'あおぞら牧場', '不明なアルバム', '海岸通り'].sort()),
    `アルバムが5枚にまとまる（${albumTitles.join('・')}）`);
  await page.locator('.vl-album', { hasText: 'あおぞら牧場' }).click();
  await settle();
  ok((await page.locator('.nav-title').innerText()) === 'あおぞら牧場', 'アルバムのページへ進む');
  ok(JSON.stringify(await titles('.page:not([hidden]) .vl-track .r-title')) === JSON.stringify(['夏のはじまり', '草の匂い', 'ゆうやけ']),
    '曲番号の順にならぶ（MP3 と FLAC が同じアルバムにまとまる）');
  ok(/2021年、3曲/.test(await page.locator('.ah-meta').innerText()), 'アルバムの頭に「2021年、3曲」');
  await page.waitForFunction(() => { const i = document.querySelector('.ah-art img'); return i && i.naturalWidth > 0; }, null, { timeout: 5000 });
  ok(true, 'ジャケットの絵が出る');

  // ──────────────────────────────────────────────
  section('再生・一時停止・次の曲・自動で次へ');
  await page.locator('.vl-track', { hasText: '夏のはじまり' }).click();
  await waitPlaying();
  await settle(300);
  let s = await state();
  ok(s.title === '夏のはじまり' && s.playing && s.queue === 3, '押した曲が鳴りだし、アルバムの3曲がならびに入る');
  ok(await page.locator('#np').isVisible() && (await page.locator('#np-title').innerText()) === '夏のはじまり', '再生中の画面が開く');
  ok(await M(() => { const i = document.getElementById('np-art'); return !i.hidden && i.naturalWidth > 0; }), '再生中の画面にジャケット');
  ok((await page.locator('#np-count').innerText()) === '1 / 3', '「1 / 3」');
  await page.click('#np-play');
  await settle(200);
  s = await state();
  ok(!s.playing && s.paused, '一時停止できる');
  ok((await page.locator('#np-play').getAttribute('aria-label')) === '再生', 'ボタンが「再生」に変わる');
  await page.click('#np-play');
  await waitPlaying();
  await page.click('#np-next');
  await waitTitle('草の匂い');
  await waitPlaying(0.1);
  ok(true, '「次へ」で次の曲になり、そのまま鳴る');
  await waitTitle('ゆうやけ', 8000);
  await waitPlaying(0.1);
  ok(true, '曲が終わると自動で次の曲へ進む');
  await page.waitForFunction(() => window.__music.player.index === 0 && !window.__music.player.playing, null, { timeout: 8000 });
  s = await state();
  ok(s.title === '夏のはじまり' && !s.playing, '最後まで流しおえたら、先頭にもどって止まる');
  ok(await M(() => Array.from(window.__music.library.tracks.values()).filter((t) => t.playCount > 0).length) === 2, '最後まで聴いた曲に回数がつく');

  // ──────────────────────────────────────────────
  section('再生位置のつまみ・前へ・シャッフル・リピート');
  await page.click('#np-play');
  await waitPlaying();
  {
    // つまみの線の 60% のあたりを押す
    const sb = await page.locator('#np-scrub').boundingBox();
    await page.mouse.click(sb.x + 11 + (sb.width - 22) * 0.6, sb.y + sb.height / 2);
  }
  await settle(250);
  s = await state();
  ok(s.time > 1.5 && s.time < 2.6, `つまみを動かすと再生位置が移る（${s.time.toFixed(2)}秒）`);
  await page.click('#np-play');   // 止める
  await settle(150);
  await page.click('#np-prev');
  await settle(200);
  s = await state();
  ok(s.title === '夏のはじまり' && s.time < 0.5, '「前へ」は、まず曲の頭にもどる');
  await page.click('#np-shuffle');
  await settle(100);
  s = await state();
  ok(s.shuffle && s.index === 0 && s.title === '夏のはじまり', 'シャッフルを入れても、いまの曲はそのまま');
  await page.click('#np-shuffle');
  await page.click('#np-repeat');
  await page.click('#np-repeat');
  s = await state();
  ok(!s.shuffle && s.repeat === 'one', 'リピートは オフ → 全体 → 1曲 と切りかわる');
  await page.click('#np-repeat');
  ok((await state()).repeat === 'off', 'もう一度でオフにもどる');

  // ──────────────────────────────────────────────
  section('裏返して順番を見る');
  await page.click('#np-flip');
  await settle(800);
  ok(JSON.stringify(await titles('#np-queue .vl-track .r-title')) === JSON.stringify(['夏のはじまり', '草の匂い', 'ゆうやけ']), '裏面に、流れる順番が出る');
  await page.locator('#np-queue .vl-track', { hasText: 'ゆうやけ' }).click();
  await waitTitle('ゆうやけ');
  ok(true, '裏面の曲を押すと、その曲へ飛ぶ');
  await page.click('#np-play');
  await settle(150);
  await page.click('#np-flip');
  await settle(800);

  // ──────────────────────────────────────────────
  section('開きなおしても続きから');
  await M(() => window.__music.player.seek(1.2));
  await settle(700);
  await page.reload({ waitUntil: 'load' });
  await ready();
  ok(await M(() => window.__music.library.size) === 11, '開きなおしても 11曲が残っている');
  s = await state();
  ok(s.title === 'ゆうやけ' && !s.playing && Math.abs(s.time - 1.2) < 0.2, `前回の曲と位置を覚えている（${s.title} ${s.time.toFixed(2)}秒）`);
  ok(await page.locator('.bb.nowp').isVisible(), '「再生中」ボタンが出ている');
  await openNp();
  await page.click('#np-play');
  await waitPlaying(1.0);
  s = await state();
  ok(s.playing && s.time >= 1.0, '再生を押すと、続きの位置から鳴る');
  await page.click('#np-play');
  await closeNp();

  // ──────────────────────────────────────────────
  section('鳴らせない曲は、知らせて次へ進む');
  await tab('songs');
  const before = await titles('.page:not([hidden]) .vl-song .r-title');
  const iAlac = before.indexOf('Lossless Tune');
  await page.locator('.page:not([hidden]) .vl-song', { hasText: 'Lossless Tune' }).click();
  await page.waitForFunction((t) => window.__music.player.current && window.__music.player.current.title !== t, 'Lossless Tune', { timeout: 10000 });
  await waitPlaying(0.1);
  s = await state();
  ok(s.title === before[iAlac + 1] && s.playing, `鳴らせない曲（.m4a）をとばして次の「${s.title}」が鳴る`);
  await page.click('#np-play');
  await closeNp();

  // ──────────────────────────────────────────────
  section('画面を消している間は、終わる少し手前で次の曲へ（iPhone 向けの備え）');
  {
    // iPhone のふり：早めの切りかえを入れ、「画面が消えている」ことにする
    const r = await M(async () => {
      const { player, library } = window.__music;
      const byTitle = (t) => Array.from(library.tracks.values()).find((x) => x.title === t);
      const a = document.getElementById('audio');
      let ended = 0;
      const onEnded = () => { ended++; };
      a.addEventListener('ended', onEnded);
      player.earlySwitch = true;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      const first = byTitle('notag-vbr');   // 約4秒
      const second = byTitle('ゆうやけ');
      const before = first.playCount || 0;
      player.playList([first.id, second.id], 0, { shuffle: false });
      const t0 = performance.now();
      let leftAtSwitch = null;
      const onTrack = () => { if (player.current === second && leftAtSwitch === null) leftAtSwitch = a.duration - a.currentTime; };
      await new Promise((resolve) => {
        const tick = () => {
          if (player.current === second && !a.paused && a.currentTime > 0.05) resolve();
          else if (performance.now() - t0 > 9000) resolve();
          else setTimeout(tick, 30);
        };
        tick();
      });
      const out = {
        title: player.current && player.current.title, ended, counted: (first.playCount || 0) - before,
        playing: !a.paused, ms: Math.round(performance.now() - t0),
      };
      a.removeEventListener('ended', onEnded);
      delete document.hidden;
      player.earlySwitch = false;
      player.pause();
      return out;
    });
    ok(r.title === 'ゆうやけ' && r.playing, `次の曲へ進んで鳴っている（${r.ms} ミリ秒後）`);
    ok(r.ended === 0, '前の曲が「終わった」状態になる前に切りかえている');
    ok(r.counted === 1, '聴いた回数は1回だけ数える');
  }

  // ──────────────────────────────────────────────
  section('「次に再生」のあと、いまの曲の行を押す');
  {
    await page.locator('.page:not([hidden]) .vl-song', { hasText: 'notag-vbr' }).click();
    await waitPlaying(0.3);
    await closeNp();
    const before2 = await M(() => {
      const { player, library } = window.__music;
      const other = Array.from(library.tracks.values()).find((t) => t.title === 'Seaside Walk');
      player.playNext([other.id]);
      return { len: player.queue.length };
    });
    await settle(700);
    await page.locator('.page:not([hidden]) .vl-song', { hasText: 'notag-vbr' }).click();
    await settle(500);
    const after2 = await M(() => {
      const { player } = window.__music;
      return { len: player.queue.length, t: document.getElementById('audio').currentTime, title: player.current.title, next: window.__music.library.get(player.queue[player.index + 1]).title };
    });
    ok(after2.title === 'notag-vbr' && after2.t > 0.9, `曲は頭から鳴りなおさない（${after2.t.toFixed(2)}秒）`);
    ok(after2.len === before2.len && after2.next === 'Seaside Walk', '差しこんだ曲がならびに残っている');
    ok(await page.locator('#np').isVisible(), '再生中の画面が開く');
    await page.click('#np-play');
    await closeNp();
  }

  // ──────────────────────────────────────────────
  section('長押しのメニュー・削除');
  {
    // 本物の指のように、押したまま 0.8 秒待って、はなす
    const target = page.locator('.page:not([hidden]) .vl-song', { hasText: 'Wave Info Title' });
    const b = await target.boundingBox();
    const cdp = await context.newCDPSession(page);
    const pt = { x: Math.round(b.x + 120), y: Math.round(b.y + b.height / 2) };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await settle(800);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await settle(500);
    await cdp.detach();
  }
  ok(JSON.stringify(await page.locator('.sheet-btn').allTextContents())
    === JSON.stringify(['次に再生', 'プレイリストに追加…', 'この曲を削除', 'キャンセル']), '長押しでメニューが出て、指をはなしても開いたまま');
  ok(!(await page.locator('#np').isVisible()), '長押しでは再生がはじまらない');
  await page.locator('.sheet-btn', { hasText: 'この曲を削除' }).click();
  await settle(450);
  ok(/Wave Info Title.*削除しますか/s.test(await page.locator('.sheet-title').innerText()), '削除の前に確かめる');
  await page.locator('.sheet-btn.destructive').click();
  await page.waitForFunction(() => window.__music.library.size === 10, null, { timeout: 5000 });
  await settle(400);
  ok(!(await titles('.page:not([hidden]) .vl-song .r-title')).includes('Wave Info Title'), '一覧から消える');
  ok(await M(async () => {
    const all = await window.__music.db.getAllTracks();
    const files = await Promise.all(all.map((t) => window.__music.db.getFile(t.id, t.mime)));
    const ids = await window.__music.db.fileIds();
    return all.length === 10 && ids.length === 10 && files.every((f, i) => f && f.size === all[i].size && f.type === all[i].mime);
  }), '保存場所からも消え、残りの 10曲のファイルは大きさも種類もそろっている');

  {
    const dbr = await M(async () => {
      const { db, library } = window.__music;
      const some = Array.from(library.tracks.values())[0];
      let name = '';
      try { await db.addTrack({ ...some }, [new ArrayBuffer(16)], ''); } catch (err) { name = err && err.name; }
      const countAfterFail = (await db.getAllTracks()).length;
      // 消した曲への書きこみ（聴いた回数など）が、曲を一覧に戻さない
      const ghost = { ...some, id: 987654, title: 'もういない曲' };
      await db.updateTrack(ghost);
      const all = await db.getAllTracks();
      return { name, countAfterFail, ghost: all.some((t) => t.id === 987654), n: all.length };
    });
    ok(dbr.name === 'ConstraintError' && dbr.countAfterFail === 10, `保存に失敗したとき、理由の名前が伝わり、半端に残らない（${dbr.name}）`);
    ok(!dbr.ghost && dbr.n === 10, '保存場所にない曲への書きこみは、曲を増やさない');
  }

  // 横になぞって削除
  const row = page.locator('.page:not([hidden]) .vl-song', { hasText: 'Both Tags' });
  const box = await row.boundingBox();
  await page.mouse.move(box.x + 250, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 22, { steps: 6 });
  await page.mouse.up();
  await settle(300);
  ok(await page.locator('.vl-del.in').isVisible(), '行を横になぞると「削除」ボタンが出る');
  await page.locator('.page:not([hidden]) .vl-song', { hasText: 'Opus Song' }).click();
  await settle(250);
  ok(!(await page.locator('.vl-del').count()) && !(await page.locator('#np').isVisible()), 'ほかの場所を押すと、何もせずにボタンが引っこむ');

  // ──────────────────────────────────────────────
  section('プレイリスト');
  await tab('playlists');
  await page.locator('.vl-action', { hasText: '新規プレイリスト' }).click();
  await page.waitForSelector('.alert-input');
  await page.fill('.alert-input', 'ドライブ');
  await page.locator('.alert-btn', { hasText: '保存' }).click();
  await page.waitForFunction(() => document.querySelector('.nav-title') && document.querySelector('.nav-title').textContent === '曲を追加', null, { timeout: 5000 });
  await settle(500);
  await page.locator('.page:not([hidden]) .vl-pick', { hasText: 'Seaside Walk' }).click();
  await page.locator('.page:not([hidden]) .vl-pick', { hasText: '夏のはじまり' }).click();
  await settle(150);
  ok(await page.locator('.page:not([hidden]) .vl-pick.added').count() === 2, '押した曲に「追加ずみ」の印がつく');
  await page.locator('.bb.done').click();
  await settle(500);
  ok((await page.locator('.nav-title').innerText()) === 'ドライブ', '「完了」でプレイリストにもどる');
  ok(JSON.stringify(await titles('.page:not([hidden]) .vl-pltrack .r-title')) === JSON.stringify(['Seaside Walk', '夏のはじまり']), '入れた順に2曲ならぶ');
  // 編集：赤い丸 → 削除
  await page.locator('.pl-btn', { hasText: '編集' }).click();
  await settle(150);
  await page.locator('.page:not([hidden]) .vl-pltrack .r-minus').first().click();
  await settle(250);
  await page.locator('.vl-del').click();
  await settle(350);
  ok(JSON.stringify(await titles('.page:not([hidden]) .vl-pltrack .r-title')) === JSON.stringify(['夏のはじまり']), '編集で曲をはずせる（曲そのものは消えない）');
  ok(await M(() => window.__music.library.size) === 10, 'ライブラリは 10曲のまま');
  await page.locator('.pl-btn', { hasText: '完了' }).click();
  await page.locator('.bb.back').click();
  await settle(500);
  ok((await titles('.page:not([hidden]) .vl-row .r-title')).includes('ドライブ'), 'プレイリストの一覧に出る');

  // ──────────────────────────────────────────────
  section('検索');
  await tab('songs');
  await page.locator('.page:not([hidden]) .vl-search').click();
  await settle(500);
  await page.fill('.nav-search input', '牧場');
  await settle(350);
  ok(JSON.stringify((await titles('.page:not([hidden]) .vl-song .r-title')).sort()) === JSON.stringify(['ゆうやけ', '夏のはじまり', '草の匂い'].sort()), 'アーティスト名・アルバム名でも見つかる');
  await page.fill('.nav-search input', 'ＳＥＡＳＩＤＥ');
  await settle(350);
  ok(JSON.stringify(await titles('.page:not([hidden]) .vl-song .r-title')) === JSON.stringify(['Seaside Walk']), '全角・大文字でも見つかる');
  await page.fill('.nav-search input', 'ぜったいにないことば');
  await settle(350);
  ok((await page.locator('.page:not([hidden]) .vl-note').innerText()) === '見つかりませんでした', '無いときは「見つかりませんでした」');
  await page.locator('.nav-search .bb').click();
  await settle(500);
  ok((await page.locator('.nav-title').innerText()) === '曲', '「キャンセル」で曲の一覧にもどる');

  // ──────────────────────────────────────────────
  section('同じファイルは二度入れない');
  await page.setInputFiles('#file-input', payload(['a1-natsu.mp3', 'a2-kusa.mp3']));
  await page.waitForSelector('.alert', { timeout: 15000 });
  ok(/すでに入っている 2曲/.test(await page.locator('.alert-msg').innerText()), '「すでに入っている 2曲はとばしました」');
  await dismissAlert();
  ok(await M(() => window.__music.library.size) === 10, '10曲のまま');

  // ──────────────────────────────────────────────
  section('通信なしで開く（Service Worker）');
  const swOk = await M(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  ok(swOk, 'Service Worker が入った');
  await page.reload({ waitUntil: 'load' });
  await ready();
  ok(await M(() => !!navigator.serviceWorker.controller), 'ページが Service Worker の管理下にある');
  ok(await M(async () => {
    const t = Array.from(window.__music.library.tracks.values()).find((x) => x.artId);
    const list = await window.__music.art.artwork(t.artId);
    if (!list || !/\/__art\//.test(list[0].src)) return false;
    const res = await fetch(list[0].src);
    const blob = await res.blob();
    const miss = await fetch(new URL('__art/zzz', document.baseURI));
    return res.ok && res.headers.get('Content-Type') === 'image/jpeg' && blob.size > 500 && miss.status === 404;
  }), 'ロック画面用のジャケットを、ふつうの URL で取り出せる');
  {
    // 同じ置き場所の別のページに、控えを消されたことにする → 通信があるうちに開けば、入れなおす
    await M(async () => { for (const k of await caches.keys()) await caches.delete(k); });
    await page.reload({ waitUntil: 'load' });
    await ready();
    await page.waitForFunction(async () => {
      for (const k of await caches.keys()) { if ((await (await caches.open(k)).keys()).length > 20) return true; }
      return false;
    }, null, { timeout: 15000 });
    ok(true, '控えが消されていても、開いたときに入れなおす');
  }
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await ready();
  ok(await M(() => window.__music.library.size) === 10, '通信を切っても開けて、10曲が見える');
  await tab('songs');
  await page.locator('.page:not([hidden]) .vl-song', { hasText: '草の匂い' }).click();
  await waitPlaying();
  ok((await state()).title === '草の匂い', '通信なしで再生できる');
  await page.click('#np-play');
  await closeNp();
  await context.setOffline(false);

  // ──────────────────────────────────────────────
  section('たくさんの曲でも軽い');
  const many = await M(() => {
    const { library } = window.__music;
    const real = Array.from(library.tracks.values());
    const fake = [];
    const kana = 'あかさたなはまやらわ';
    for (let i = 0; i < 5000; i++) {
      const head = i % 3 === 0 ? kana[i % 10] : String.fromCharCode(65 + (i % 26));
      fake.push({ id: 100000 + i, title: `${head}のうた ${i}`, artist: `アーティスト ${i % 120}`, album: `アルバム ${i % 400}`, duration: 200 });
    }
    const t0 = performance.now();
    library.load([...real, ...fake], library.playlists);
    const ms = performance.now() - t0;
    return { ms, rows: document.querySelectorAll('.page:not([hidden]) .vl-item').length, index: !document.querySelector('.page:not([hidden]) .vl-index').hidden };
  });
  ok(many.rows > 5 && many.rows < 120, `5010曲でも、作る行は ${many.rows} 行だけ`);
  ok(many.ms < 1500, `ならべなおしと表示に ${Math.round(many.ms)} ミリ秒`);
  ok(many.index, '右はしに索引が出る');
  const jumped = await M(() => {
    const idx = document.querySelector('.page:not([hidden]) .vl-index');
    const r = idx.getBoundingClientRect();
    const fire = (type, y) => idx.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + 5, clientY: y, pointerId: 1, isPrimary: true }));
    fire('pointerdown', r.bottom - 3);
    fire('pointerup', r.bottom - 3);
    const sc = document.querySelector('.page:not([hidden]) .vl-scroll');
    const heads = Array.from(document.querySelectorAll('.page:not([hidden]) .vl-item.vl-header')).map((n) => n.textContent);
    return { top: sc.scrollTop, atEnd: sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2, heads };
  });
  ok(jumped.top > 10000 && jumped.atEnd && jumped.heads.includes('#'), '索引のいちばん下を押すと、最後の見出し「#」まで飛ぶ');
  await page.reload({ waitUntil: 'load' });   // 仮の曲は保存していないので、開きなおせば消える
  await ready();

  // ──────────────────────────────────────────────
  section('横向きにするとジャケットの流れ');
  await page.setViewportSize({ width: 844, height: 390 });
  await settle(700);
  ok(await page.locator('#coverflow').isVisible(), '横向きで出る');
  {
    const cb = await page.locator('#coverflow').boundingBox();
    ok(cb.x === 0 && cb.width === 844 && cb.height === 390, `横向きのスマホで、画面いっぱいに出る（幅 ${cb.width}）`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(500);
  ok(!(await page.locator('#coverflow').isVisible()), 'たて向きにもどすと消える');

  // ──────────────────────────────────────────────
  section('すべて削除');
  await tab('more');
  await page.locator('.page:not([hidden]) .vl-row', { hasText: '保存容量' }).click();
  await settle(500);
  ok(/10曲/.test(await page.locator('.g-row').first().innerText()), '保存容量のページに曲の数');
  await page.locator('.bigbtn.red').click();
  await settle(400);
  await page.locator('.sheet-btn.destructive').click();
  await page.waitForFunction(() => window.__music.library.size === 0, null, { timeout: 5000 });
  ok(await M(async () => (await window.__music.db.getAllTracks()).length === 0 && (await window.__music.db.getArtKeys()).length === 0), '曲もジャケットも保存場所から消える');
  await tab('songs');
  ok(await page.locator('.empty-title').first().isVisible(), '「曲がありません」にもどる');
  ok(!(await page.locator('.bb.nowp').count()), '「再生中」ボタンも消える');

  // ──────────────────────────────────────────────
  section('エラーが出ていないこと');
  // 鳴らせない .m4a を読ませたときにブラウザが出す1行は、わざと起こしたものなので数えない
  const unexpected = pageErrors.filter((e) => !/DEMUXER_ERROR|MEDIA_ELEMENT_ERROR|Failed to load resource/i.test(e));
  ok(unexpected.length === 0, `ページのエラーなし${unexpected.length ? `（${unexpected.slice(0, 3).join(' / ')}）` : ''}`);
} catch (err) {
  failures++;
  console.log(`\n✗ 途中で止まりました（${step}）: ${err && err.message}`);
  try { await page.screenshot({ path: join(here, 'failure.png') }); console.log(`  画面を tests/e2e/failure.png に撮りました`); } catch (_) { /* 何もしない */ }
  if (pageErrors.length) console.log('  ページのエラー:', pageErrors.slice(0, 5));
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} 件の失敗` : '\nすべて通りました');
process.exit(failures ? 1 : 0);
