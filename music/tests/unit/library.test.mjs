// ライブラリ（ならび順・見出し・アルバムのまとめ方・検索）のテスト。  node --test tests/unit/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Library, sectionOf, sortKey, normalize, formatTime, formatMinutes, formatBytes,
  albumKeyOf, SECTION_ORDER, UNKNOWN_ALBUM, UNKNOWN_ARTIST, VARIOUS_ARTISTS,
} from '../../js/library.js';

let nextId = 1;
const T = (o) => ({ id: nextId++, title: '', artist: '', album: '', ...o });

test('見出しの決め方：かな・英字・その他', () => {
  assert.equal(sectionOf(sortKey('あおぞら')), 'あ');
  assert.equal(sectionOf(sortKey('ガラス')), 'か');
  assert.equal(sectionOf(sortKey('ぱんだ')), 'は');
  assert.equal(sectionOf(sortKey('ヴァイオリン')), 'あ');
  assert.equal(sectionOf(sortKey('ｶﾀｶﾅ')), 'か');          // 半角カタカナ
  assert.equal(sectionOf(sortKey('Ｈｅｌｌｏ')), 'H');      // 全角英字
  assert.equal(sectionOf(sortKey('The Beatles')), 'B');     // The は読みとばす
  assert.equal(sectionOf(sortKey('A Hard Day')), 'H');
  assert.equal(sectionOf(sortKey('Élan')), 'E');
  assert.equal(sectionOf(sortKey('夏のはじまり')), '#');     // 漢字はよみがなが無ければ #
  assert.equal(sectionOf(sortKey('夏のはじまり', 'なつのはじまり')), 'な');
  assert.equal(sectionOf(sortKey('1999')), '#');
  assert.equal(sectionOf(sortKey('')), '#');
  assert.equal(sectionOf(sortKey('「かぎかっこ」')), 'か');
  assert.equal(sectionOf(sortKey('んー')), 'わ');
});

test('見出しの順番は あ〜わ → A〜Z → #', () => {
  assert.deepEqual(SECTION_ORDER.slice(0, 10), ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ']);
  assert.equal(SECTION_ORDER[10], 'A');
  assert.equal(SECTION_ORDER[SECTION_ORDER.length - 1], '#');
});

test('曲のならび：見出し順 → 文字順（数字は数として）', () => {
  const lib = new Library();
  lib.load([
    T({ title: 'Zebra' }), T({ title: 'apple' }), T({ title: 'さくら' }), T({ title: 'あさ' }),
    T({ title: '海', sortTitle: 'うみ' }), T({ title: 'Track 10' }), T({ title: 'Track 2' }), T({ title: '99 Luftballons' }),
  ], []);
  const titles = lib.songRows().map((r) => r.item.title);
  assert.deepEqual(titles, ['あさ', '海', 'さくら', 'apple', 'Track 2', 'Track 10', 'Zebra', '99 Luftballons']);
  assert.deepEqual(lib.songRows().map((r) => r.sec), ['あ', 'あ', 'さ', 'A', 'T', 'T', 'Z', '#']);
});

test('アルバムのまとめ方', () => {
  const lib = new Library();
  lib.load([
    T({ title: 'b', artist: 'X', album: 'One', track: 2 }),
    T({ title: 'a', artist: 'X', album: 'One', track: 1 }),
    T({ title: 'c', artist: 'X feat. Y', album: 'One', albumArtist: 'X', track: 3 }),
    T({ title: 'd', artist: 'Z', album: 'One' }),                       // 別のアーティストの同じ名前のアルバム
    T({ title: 'e', artist: 'P', album: 'Comp', compilation: true }),
    T({ title: 'f', artist: 'Q', album: 'Comp', compilation: true }),
    T({ title: 'g' }),                                                  // 何も分からない曲
    T({ title: 'h', artist: 'X', album: 'Two', disc: 2, track: 1 }),
    T({ title: 'i', artist: 'X', album: 'Two', disc: 1, track: 5 }),
  ], []);
  const albums = lib.albumRows().map((r) => r.item);
  const one = albums.filter((a) => a.title === 'One');
  assert.equal(one.length, 2);
  const xOne = one.find((a) => a.artist === 'X');
  assert.deepEqual(xOne.tracks.map((t) => t.title), ['a', 'b', 'c']);   // albumArtist が X の曲も同じアルバムに
  const comp = albums.find((a) => a.title === 'Comp');
  assert.equal(comp.tracks.length, 2);
  assert.equal(comp.artist, VARIOUS_ARTISTS);
  const unknown = albums.find((a) => a.title === UNKNOWN_ALBUM);
  assert.equal(unknown.artist, UNKNOWN_ARTIST);
  const two = albums.find((a) => a.title === 'Two');
  assert.deepEqual(two.tracks.map((t) => t.title), ['i', 'h']);          // ディスク番号が先
  const x = lib.artist('X');
  assert.deepEqual(x.albums.map((a) => a.title), ['One', 'Two']);
  assert.equal(x.tracks.length, 5);
  assert.equal(albumKeyOf({ artist: 'ｘ', album: 'ONE' }), albumKeyOf({ artist: 'X', album: 'one' }));
});

test('さがす：全角半角・大文字小文字・カタカナひらがなを区別しない', () => {
  const lib = new Library();
  lib.load([
    T({ title: 'カントリー・ロード', artist: 'John', album: 'Best' }),
    T({ title: 'Hello World', artist: 'ジョン', album: 'ベスト' }),
    T({ title: '夏のはじまり', artist: '牧場バンド', album: 'あおぞら牧場', sortTitle: 'なつのはじまり' }),
  ], []);
  assert.equal(lib.search('かんとりー').length, 1);
  assert.equal(lib.search('ＨＥＬＬＯ').length, 1);
  assert.equal(lib.search('john best').length, 1);
  assert.equal(lib.search('じょん').length, 1);
  assert.equal(lib.search('なつ').length, 1);        // よみがなでも見つかる
  assert.equal(lib.search('牧場').length, 1);
  assert.equal(lib.search('   ').length, 0);
  assert.equal(lib.search('ない').length, 0);
});

test('足す・消す・同じファイルの印', () => {
  const lib = new Library();
  let changes = 0;
  lib.addEventListener('change', () => changes++);
  lib.load([], []);
  const t = T({ title: 'x', sig: 'x.mp3|10' });
  lib.add(t);
  lib.notify();
  assert.equal(lib.size, 1);
  assert.ok(lib.hasSig('x.mp3|10'));
  lib.remove([t.id]);
  assert.equal(lib.size, 0);
  assert.ok(!lib.hasSig('x.mp3|10'));
  assert.equal(changes, 3);
  assert.deepEqual(lib.songRows(), []);
});

test('プレイリスト・最近追加・よく聴く曲', () => {
  const lib = new Library();
  const a = T({ title: 'a', addedAt: 1, playCount: 3, lastPlayed: 50 });
  const b = T({ title: 'b', addedAt: 3, playCount: 0 });
  const c = T({ title: 'c', addedAt: 2, playCount: 9, lastPlayed: 10 });
  lib.load([a, b, c], [{ id: 1, name: 'P', trackIds: [c.id, 9999, a.id], createdAt: 1 }]);
  assert.deepEqual(lib.playlistTracks(lib.playlists[0]).map((t) => t.title), ['c', 'a']);   // 消えた曲はとばす
  assert.deepEqual(lib.recentlyAdded().map((t) => t.title), ['b', 'c', 'a']);
  assert.deepEqual(lib.mostPlayed().map((t) => t.title), ['c', 'a']);
  assert.deepEqual(lib.recentlyPlayed().map((t) => t.title), ['a', 'c']);
});

test('表示用の小道具', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.9), '1:05');
  assert.equal(formatTime(3723), '1:02:03');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatMinutes(50), '1分');
  assert.equal(formatMinutes(3600), '1時間');
  assert.equal(formatMinutes(3900), '1時間5分');
  assert.equal(formatBytes(0), '0 MB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatBytes(3 * 1024 * 1024 * 1024), '3.00 GB');
  assert.equal(normalize('  ＡＢＣアイウ '), 'abcあいう');
});
