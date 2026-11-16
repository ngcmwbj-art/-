// js/tags.js（音声ファイルのタグ読み）のテスト。
//   node --test music/tests/unit/
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTags, guessMime, parseFileName, isAudioFile, AUDIO_EXTENSIONS } from '../../js/tags.js';
import {
  bytes, u16be, u24be, u32be, u64be, u16le, u32le, u64le, synchsafe,
  utf8, utf16le, utf16be, latin1, sjis, randomBytes, rng, fakeJpeg, fakePng,
  unsync, id3Frame, id3Frame22, textData, id3v2, apicData, id3v1,
  mp3Frames, mp3FramesMpeg2,
  atom, atom64, mp4Item, mp4Text,
  flacBlock, flacStreamInfo, vorbisComments, flacPicture, base64,
  oggPages, vorbisIdent, opusHead,
  TrackingBlob,
} from './tags-helpers.mjs';

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url));
const fixture = (name) => fs.readFileSync(path.join(FIXTURES, name));
const fixtureBlob = (name) => new Blob([fixture(name)]);
const MB = 1024 * 1024;

/** バイト列から Blob を作って読む */
const parse = (data, name, options) => parseTags(new Blob([data]), name, options);

/** 長さとジャケットをのぞいた残り（まるごと比べる用） */
function rest(tags) {
  const { duration, picture, ...others } = tags;
  return others;
}

function near(actual, expected, tolerance, label = '長さ') {
  assert.ok(typeof actual === 'number' && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} が ${expected} ± ${tolerance} に入っていない`);
}

function sameBytes(actual, expected, label = 'ジャケット') {
  assert.ok(actual instanceof Uint8Array, `${label}: Uint8Array ではない`);
  assert.equal(actual.length, expected.length, `${label}: 大きさがちがう`);
  assert.ok(Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength).equals(Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength)), `${label}: 中身がちがう`);
}

/** 返ってきた形が決まりどおりか（どんな入力でも守られるべきこと） */
function checkShape(tags) {
  assert.equal(typeof tags, 'object');
  assert.ok(['mp3', 'mp4', 'flac', 'ogg', 'wav', 'aiff', 'aac', 'unknown'].includes(tags.container), 'container: ' + tags.container);
  for (const key of ['codec', 'title', 'artist', 'album', 'albumArtist', 'genre', 'composer', 'sortTitle', 'sortArtist', 'sortAlbum', 'sortAlbumArtist', 'lyrics']) {
    if (key in tags) {
      assert.equal(typeof tags[key], 'string', key);
      assert.ok(tags[key].length > 0, key + ' が空');
      assert.equal(tags[key], tags[key].trim(), key + ' の前後に空白');
      assert.ok(!/^\0|\0$/.test(tags[key]), key + ' の前後に NUL');
    }
  }
  for (const key of ['year', 'track', 'trackTotal', 'disc', 'discTotal']) {
    if (key in tags) assert.ok(Number.isInteger(tags[key]) && tags[key] > 0, key + ': ' + tags[key]);
  }
  if ('compilation' in tags) assert.equal(tags.compilation, true);
  if ('duration' in tags) assert.ok(Number.isFinite(tags.duration) && tags.duration > 0, 'duration: ' + tags.duration);
  if ('picture' in tags) {
    assert.equal(typeof tags.picture.mime, 'string');
    assert.ok(tags.picture.mime.startsWith('image/'), 'mime: ' + tags.picture.mime);
    assert.ok(tags.picture.data instanceof Uint8Array && tags.picture.data.length > 0);
    assert.equal(tags.picture.data.byteOffset, 0, 'ジャケットは専用のバッファ');
    assert.equal(tags.picture.data.byteLength, tags.picture.data.buffer.byteLength, 'ジャケットは専用のバッファ');
  }
}

// ============================================================
// 1. 実ファイル（tests/fixtures。ffprobe の表示と突き合わせた期待値）
// ============================================================

describe('実ファイル', () => {
  it('a1-natsu.mp3: ID3v2.3 / UTF-16 / ジャケットつき', async () => {
    const t = await parseTags(fixtureBlob('a1-natsu.mp3'), 'a1-natsu.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '夏のはじまり', artist: '牧場バンド', album: 'あおぞら牧場', albumArtist: '牧場バンド',
      genre: 'J-Pop', year: 2021, track: 1, trackTotal: 3, disc: 1, discTotal: 1,
    });
    near(t.duration, 3.03, 0.01);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, fixture('cover-a.jpg'));
  });

  it('a2-kusa.mp3: ID3v2.4 / UTF-8', async () => {
    const t = await parseTags(fixtureBlob('a2-kusa.mp3'), 'a2-kusa.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '草の匂い', artist: '牧場バンド', album: 'あおぞら牧場', albumArtist: '牧場バンド',
      genre: 'J-Pop', year: 2021, track: 2, trackTotal: 3,
    });
    near(t.duration, 2.04, 0.01);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, fixture('cover-a.jpg'));
  });

  it('a3-yuuyake.flac: Vorbis コメント + PICTURE', async () => {
    const t = await parseTags(fixtureBlob('a3-yuuyake.flac'), 'a3-yuuyake.flac');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'flac', codec: 'flac',
      title: 'ゆうやけ', artist: '牧場バンド', album: 'あおぞら牧場', albumArtist: '牧場バンド',
      genre: 'J-Pop', year: 2021, track: 3, trackTotal: 3,
    });
    near(t.duration, 2.0, 0.001);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, fixture('cover-a.jpg'));
  });

  it('b1-umi.m4a: AAC / iTunes 形式のタグ / PNG ジャケット / 歌詞', async () => {
    const t = await parseTags(fixtureBlob('b1-umi.m4a'), 'b1-umi.m4a');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp4', codec: 'aac',
      title: '海へ行く道', artist: '潮風トリオ', album: '海岸通り', albumArtist: '潮風トリオ',
      genre: 'Rock', year: 2019, composer: '山田太郎',
      track: 1, trackTotal: 2, disc: 1, discTotal: 1,
      lyrics: '海へ行く道は\nまっすぐで\n風が吹いている',
    });
    assert.equal(t.lyrics.split('\n').length, 3);
    near(t.duration, 3.0, 0.001);
    assert.equal(t.picture.mime, 'image/png');
    sameBytes(t.picture.data, fixture('cover-b.png'));
    // make-fixtures.sh は sort_name などを指定しているが、ffmpeg の MP4 書き出しは
    // よみがな（sonm / soar / soal）を書かないので、このファイルには入っていない（ffprobe でも出ない）。
    // よみがなの読み取りは、下の「合成: MP4」で確かめている。
    assert.equal(fixture('b1-umi.m4a').includes('sonm'), false);
    assert.equal(t.sortTitle, undefined);
  });

  it('b2-seaside.ogg: Vorbis / ジャケットなし', async () => {
    const t = await parseTags(fixtureBlob('b2-seaside.ogg'), 'b2-seaside.ogg');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'ogg', codec: 'vorbis',
      title: 'Seaside Walk', artist: '潮風トリオ', album: '海岸通り', albumArtist: '潮風トリオ',
      genre: 'Rock', year: 2019, track: 2,
    });
    near(t.duration, 2.0, 0.001);
    assert.equal(t.picture, undefined);
  });

  it('c1-opus.opus: Opus（pre-skip を引いて 48000 で割る）', async () => {
    const t = await parseTags(fixtureBlob('c1-opus.opus'), 'c1-opus.opus');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'ogg', codec: 'opus', title: 'Opus Song', artist: 'Tester', album: 'Singles', track: 1 });
    near(t.duration, 2.0, 0.01);
  });

  it('07 たぐなしの曲.wav: タグなし → ファイル名から題名', async () => {
    const name = '07 たぐなしの曲.wav';
    const t = await parseTags(fixtureBlob(name), name);
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'wav', codec: 'pcm' });
    near(t.duration, 2.0, 0.001);
    assert.deepEqual(parseFileName(name), { title: 'たぐなしの曲', track: 7 });
  });

  it('wav-info.wav: LIST/INFO', async () => {
    const t = await parseTags(fixtureBlob('wav-info.wav'), 'wav-info.wav');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'wav', codec: 'pcm', title: 'Wave Info Title', artist: 'Wave Artist', album: 'Wave Album' });
    near(t.duration, 2.0, 0.001);
  });

  it('c2-alac.m4a: ALAC / JPEG ジャケット', async () => {
    const t = await parseTags(fixtureBlob('c2-alac.m4a'), 'c2-alac.m4a');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'mp4', codec: 'alac', title: 'Lossless Tune', artist: 'Tester', album: 'Singles', track: 2 });
    near(t.duration, 2.0, 0.001);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, fixture('cover-c.jpg'));
  });

  it('aiff-id3.aiff: ID3 チャンク + COMM', async () => {
    const t = await parseTags(fixtureBlob('aiff-id3.aiff'), 'aiff-id3.aiff');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'aiff', codec: 'pcm', title: 'Aiff Title', artist: 'Aiff Artist', album: 'Aiff Album' });
    near(t.duration, 2.0, 0.001);
  });

  it('notag-vbr.mp3: タグなし / Xing ヘッダから長さ', async () => {
    const t = await parseTags(fixtureBlob('notag-vbr.mp3'), 'notag-vbr.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3' });
    near(t.duration, 4.05, 0.01);
  });

  it('both-tags.mp3: ID3v2.3 と ID3v1 の両方', async () => {
    const t = await parseTags(fixtureBlob('both-tags.mp3'), 'both-tags.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3', title: 'Both Tags', artist: 'Tester', album: 'Singles', genre: 'Blues', track: 3 });
    near(t.duration, 2.04, 0.01);
  });

  it('拡張子がまちがっていても、中身（マジックバイト）で形式を決める', async () => {
    assert.equal((await parseTags(fixtureBlob('a3-yuuyake.flac'), 'x.mp3')).container, 'flac');
    assert.equal((await parseTags(fixtureBlob('b1-umi.m4a'), 'x.wav')).title, '海へ行く道');
    assert.equal((await parseTags(fixtureBlob('a1-natsu.mp3'), 'noext')).title, '夏のはじまり');
    assert.equal((await parseTags(fixtureBlob('c1-opus.opus'))).codec, 'opus');
  });

  it('picture: false ならジャケットを読まない', async () => {
    for (const name of ['a1-natsu.mp3', 'a3-yuuyake.flac', 'b1-umi.m4a']) {
      const t = await parseTags(fixtureBlob(name), name, { picture: false });
      assert.equal(t.picture, undefined, name);
      assert.ok(t.title, name);
    }
    const small = await parseTags(fixtureBlob('a1-natsu.mp3'), 'a1-natsu.mp3', { maxPictureBytes: 1000 });
    assert.equal(small.picture, undefined, '上限より大きいジャケットはあきらめる');
  });
});

// ============================================================
// 2. 手で組み立てたファイル
// ============================================================

describe('合成: ID3', () => {
  it('ID3v2.2（TT2 / TP1 / PIC など3文字のフレーム）', async () => {
    const img = fakeJpeg(700);
    const tag = id3v2(2, [
      id3Frame22('TT2', textData(0, 'Old Title')),
      id3Frame22('TP1', textData(1, utf16le('歌手'))),
      id3Frame22('TAL', textData(0, 'Old Album')),
      id3Frame22('TP2', textData(0, 'Old Band')),
      id3Frame22('TRK', textData(0, '5/11')),
      id3Frame22('TPA', textData(0, '2/2')),
      id3Frame22('TYE', textData(0, '1998')),
      id3Frame22('TCO', textData(0, '(17)')),
      id3Frame22('TCM', textData(0, 'Composer')),
      id3Frame22('TCP', textData(0, '1')),
      id3Frame22('TST', textData(0, 'old title sort')),
      id3Frame22('ULT', bytes(0, 'eng', 0, 'line1\rline2\r\nline3')),
      id3Frame22('PIC', bytes(0, 'JPG', 3, 'cover', 0, img)),
    ], 0, 120);
    const t = await parse(bytes(tag, mp3Frames(20)), 'old.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: 'Old Title', artist: '歌手', album: 'Old Album', albumArtist: 'Old Band',
      genre: 'Rock', year: 1998, composer: 'Composer',
      track: 5, trackTotal: 11, disc: 2, discTotal: 2, compilation: true,
      sortTitle: 'old title sort', lyrics: 'line1\nline2\nline3',
    });
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, img);
    near(t.duration, (20 * 417 * 8) / 128000, 0.001);
  });

  it('ID3v2.4: フレームごとの非同期化 + データ長指示子 + 拡張ヘッダ + NUL 区切りの複数値', async () => {
    const img = fakeJpeg(3000); // FF 00 や FF E1 をふくむ → 非同期化で 00 がはさまる
    const frame = (id, data) => {
      const raw = bytes(data);
      const u = unsync(raw);
      return bytes(id, synchsafe(4 + u.length), u16be(0x0003), synchsafe(raw.length), u);
    };
    const ext = bytes(synchsafe(6), 1, 0x00);
    const tag = id3v2(4, [
      ext,
      frame('TIT2', textData(1, utf16le('非同期タイトル'))), // BOM（FF FE）にも 00 がはさまる
      frame('TPE1', textData(3, bytes(utf8('歌い手A'), 0, utf8('歌い手B')))),
      frame('TALB', textData(2, utf16be('アルバム', false))),
      frame('APIC', apicData('image/jpeg', 3, img, 1, '表')),
      frame('TDRC', textData(0, '2015-03-04T10:00:00')),
      frame('TCON', textData(3, bytes('17', 0, 'Jazz'))),
      frame('TSOT', textData(3, utf8('ひどうきたいとる'))),
      frame('TSOP', textData(3, utf8('うたいて'))),
      frame('TSOA', textData(3, utf8('あるばむ'))),
      frame('TSO2', textData(3, utf8('あるばむあーてぃすと'))),
    ], 0x80 | 0x40, 64);
    assert.ok(unsync(img).length > img.length, 'テストの画像に非同期化される並びが入っている');
    const t = await parse(bytes(tag, mp3Frames(8)), 'u.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '非同期タイトル', artist: '歌い手A / 歌い手B', album: 'アルバム',
      genre: 'Rock / Jazz', year: 2015,
      sortTitle: 'ひどうきたいとる', sortArtist: 'うたいて', sortAlbum: 'あるばむ', sortAlbumArtist: 'あるばむあーてぃすと',
    });
    sameBytes(t.picture.data, img);
  });

  it('ID3v2.3: タグ全体の非同期化 + 拡張ヘッダ', async () => {
    const img = fakeJpeg(2000);
    const ext = bytes(u32be(6), u16be(0), u32be(0));
    const frames = bytes(
      ext,
      id3Frame('TIT2', textData(1, utf16le('全体が非同期'))),
      id3Frame('APIC', apicData('image/jpeg', 3, img)),
      id3Frame('TALB', textData(0, 'After Picture')),
      id3Frame('TYER', textData(0, '2004')),
      id3Frame('XSOT', textData(0, 'zentai')),
    );
    const tag = id3v2(3, unsync(frames), 0x80 | 0x40);
    const t = await parse(bytes(tag, mp3Frames(8)), 'u3.mp3');
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3', title: '全体が非同期', album: 'After Picture', year: 2004, sortTitle: 'zentai' });
    sameBytes(t.picture.data, img);
  });

  it('「拡張ヘッダあり」の旗がまちがっていても読める', async () => {
    const tag = id3v2(3, [id3Frame('TIT2', textData(0, 'No Ext Header')), id3Frame('TPE1', textData(0, 'A'))], 0x40);
    const t = await parse(bytes(tag, mp3Frames(4)), 'x.mp3');
    assert.equal(t.title, 'No Ext Header');
    assert.equal(t.artist, 'A');
  });

  it('UTF-16 は BOM が LE でも BE でも、BOM なしでも読める', async () => {
    const tag = id3v2(3, [
      id3Frame('TIT2', textData(1, utf16le('夏のはじまり'))), // FF FE
      id3Frame('TPE1', textData(1, utf16be('牧場バンド'))), // FE FF
      id3Frame('TALB', textData(2, utf16be('あおぞら牧場', false))), // UTF-16BE（BOM なし）
      id3Frame('TPE2', textData(1, utf16le('牧場', false))), // BOM を忘れた UTF-16LE
      id3Frame('TCOM', textData(1, utf16be('Composer BE', false))), // BOM を忘れた UTF-16BE
      id3Frame('TCON', textData(1, bytes(utf16le('J-Pop'), 0, 0))), // 終わりの NUL つき
      id3Frame('USLT', bytes(1, 'jpn', utf16le(''), 0, 0, utf16le('一行目\r\n二行目'))),
    ]);
    const t = await parse(bytes(tag, mp3Frames(4)), 'bom.mp3');
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '夏のはじまり', artist: '牧場バンド', album: 'あおぞら牧場', albumArtist: '牧場', genre: 'J-Pop', composer: 'Composer BE',
      lyrics: '一行目\n二行目',
    });
  });

  it('「ISO-8859-1」と書いてあるが中身は Shift_JIS（日本の古い MP3）', async () => {
    const tag = id3v2(3, [
      id3Frame('TIT2', textData(0, sjis('夏のはじまり'))),
      id3Frame('TPE1', textData(0, sjis('ﾓｰﾆﾝｸﾞ娘。'))), // 半角カナまじり
      id3Frame('TALB', textData(0, sjis('津軽海峡冬景色'))), // 漢字だけ
      id3Frame('TPE2', textData(0, sjis('LOVEマシーン feat. DJ 須藤'))), // 英字まじり
      id3Frame('TCOM', textData(0, sjis('ｻｻﾞﾝ'))), // 半角カナだけ
      id3Frame('TCON', textData(0, sjis('歌謡曲'))),
      id3Frame('USLT', bytes(0, 'jpn', 0, sjis('海は広いな'), '\r\n', sjis('大きいな'))),
    ]);
    const t = await parse(bytes(tag, mp3Frames(4)), 'sjis.mp3');
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '夏のはじまり', artist: 'ﾓｰﾆﾝｸﾞ娘。', album: '津軽海峡冬景色', albumArtist: 'LOVEマシーン feat. DJ 須藤',
      genre: '歌謡曲', composer: 'ｻｻﾞﾝ', lyrics: '海は広いな\n大きいな',
    });
  });

  it('「ISO-8859-1」と書いてあるが中身は UTF-8', async () => {
    const tag = id3v2(3, [id3Frame('TIT2', textData(0, utf8('草の匂い'))), id3Frame('TPE1', textData(0, utf8('Beyoncé')))]);
    const t = await parse(bytes(tag, mp3Frames(4)), 'u8.mp3');
    assert.equal(t.title, '草の匂い');
    assert.equal(t.artist, 'Beyoncé');
  });

  it('本当に Latin-1 の欧文は、Shift_JIS とまちがえない', async () => {
    const names = ['Björk', 'Édith Piaf', 'Motörhead', 'Beyoncé', 'Sigur Rós', 'Mötley Crüe', 'Antônio Carlos Jobim', 'Amélie', 'Zoé', 'Céline Dion', 'José González', 'élément', 'Señorita', 'Für Elise', 'Hääyö'];
    for (const name of names) {
      const tag = id3v2(3, [id3Frame('TPE1', textData(0, latin1(name)))]);
      const t = await parse(bytes(tag, mp3Frames(4)), 'l1.mp3');
      assert.equal(t.artist, name);
      // ID3v1 でも同じ
      const v1 = await parse(bytes(mp3Frames(4), id3v1({ artist: latin1(name) })), 'l1.mp3');
      assert.equal(v1.artist, name, 'ID3v1: ' + name);
    }
  });

  it('第2水準の漢字だけの題名（絆・蕾・薔薇 など）を、欧文とまちがえない', async () => {
    for (const name of ['絆', '蕾', '薔薇', '躊躇', '颯', '絆 -kizuna-', '蕾 (Live)']) {
      const tag = id3v2(3, [id3Frame('TIT2', textData(0, sjis(name)))]);
      const t = await parse(bytes(tag, mp3Frames(4)), 'k.mp3');
      assert.equal(t.title, name);
      const v1 = await parse(bytes(mp3Frames(4), id3v1({ title: sjis(name) })), 'k.mp3');
      assert.equal(v1.title, name, 'ID3v1: ' + name);
    }
  });

  it('Windows-1252 の曲がったアポストロフィ（Don’t など）を、漢字とまちがえない', async () => {
    const cp1252 = (text) => Uint8Array.from(Array.from(text, (ch) => (ch === '’' ? 0x92 : ch.charCodeAt(0))));
    for (const name of ['Don’t Stop', 'It’s My Life', 'I’m Yours', 'We’re', 'You’ve Got', 'Destiny’s Child']) {
      const tag = id3v2(3, [id3Frame('TIT2', textData(0, cp1252(name)))]);
      const t = await parse(bytes(tag, mp3Frames(4)), 'w.mp3');
      assert.equal(t.title, name);
    }
  });

  it('文字コード 3（UTF-8）なのに中身が Shift_JIS でも読める', async () => {
    const tag = id3v2(4, [id3Frame('TIT2', textData(3, sjis('ゆうやけ')), 4)]);
    assert.equal((await parse(bytes(tag, mp3Frames(4)), 'x.mp3')).title, 'ゆうやけ');
  });

  it('Shift_JIS の ID3v1 / v1.1（ジャンル番号・曲番号・途中で切れた文字）', async () => {
    const longAlbum = 'A' + '春夏秋冬'.repeat(4); // 1 + 32 バイト → 30 バイトで切ると最後の文字が半分になる
    const v1 = id3v1({ title: sjis('夏のはじまり'), artist: sjis('牧場バンド'), album: sjis(longAlbum), year: '2003', comment: 'c', track: 7, genre: 146 });
    assert.equal(v1.length, 128);
    const t = await parse(bytes(mp3Frames(10), v1), 'v1.mp3');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp3', codec: 'mp3',
      title: '夏のはじまり', artist: '牧場バンド', album: 'A' + '春夏秋冬'.repeat(3) + '春夏', genre: 'J-Pop', year: 2003, track: 7,
    });
    near(t.duration, (10 * 417 * 8) / 128000, 0.001, 'ID3v1 の 128 バイトは音声に数えない');
  });

  it('ID3v1.0（曲番号なし）とジャンル 255（なし）', async () => {
    const v1 = id3v1({ title: 'T', artist: 'A', album: 'B', year: '1987', comment: 'x'.repeat(30), genre: 255 });
    const t = await parse(bytes(mp3Frames(4), v1), 'v10.mp3');
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3', title: 'T', artist: 'A', album: 'B', year: 1987 });
  });

  it('ID3v2 と ID3v1 の両方があれば v2 を優先し、無い項目だけ v1 で補う', async () => {
    const tag = id3v2(3, [id3Frame('TIT2', textData(0, 'V2 Title')), id3Frame('TRCK', textData(0, '4'))]);
    const v1 = id3v1({ title: 'V1 Title', artist: 'V1 Artist', album: 'V1 Album', year: '1999', track: 9, genre: 8 });
    const t = await parse(bytes(tag, mp3Frames(6), v1), 'both.mp3');
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3', title: 'V2 Title', artist: 'V1 Artist', album: 'V1 Album', genre: 'Jazz', year: 1999, track: 4 });
  });

  it('ID3v2.4 なのにフレームの大きさが synchsafe でない（昔の iTunes）', async () => {
    const img = fakeJpeg(5000);
    const longTitle = 'とても長い題名'.repeat(12); // UTF-8 で 252 バイト
    const tag = id3v2(4, [
      id3Frame('TPE1', textData(3, utf8('歌手')), 4),
      id3Frame('TIT2', textData(3, utf8(longTitle)), 4, { plainSize: true }),
      id3Frame('APIC', apicData('image/jpeg', 3, img), 4, { plainSize: true }),
      id3Frame('TALB', textData(3, utf8('あとのアルバム')), 4),
    ], 0, 300);
    const t = await parse(bytes(tag, mp3Frames(6)), 'itunes.mp3');
    assert.equal(t.title, longTitle);
    assert.equal(t.artist, '歌手');
    assert.equal(t.album, 'あとのアルバム');
    sameBytes(t.picture.data, img);

    // 決まりどおり（synchsafe）に書いたものも、もちろん読める
    const good = id3v2(4, [
      id3Frame('TIT2', textData(3, utf8(longTitle)), 4),
      id3Frame('APIC', apicData('image/jpeg', 3, img), 4),
      id3Frame('TALB', textData(3, utf8('あとのアルバム')), 4),
    ]);
    const g = await parse(bytes(good, mp3Frames(6)), 'good.mp3');
    assert.equal(g.title, longTitle);
    assert.equal(g.album, 'あとのアルバム');
    sameBytes(g.picture.data, img);
  });

  it('ジャケットは表（種類 3）を優先。なければ最初の1枚', async () => {
    const back = fakeJpeg(900, 1);
    const front = fakePng(800, 2);
    const other = fakeJpeg(700, 3);
    let tag = id3v2(3, [id3Frame('APIC', apicData('image/jpeg', 4, back)), id3Frame('APIC', apicData('image/png', 3, front)), id3Frame('APIC', apicData('image/jpeg', 0, other))]);
    let t = await parse(bytes(tag, mp3Frames(4)), 'p.mp3');
    assert.equal(t.picture.mime, 'image/png');
    sameBytes(t.picture.data, front);

    tag = id3v2(3, [id3Frame('APIC', apicData('image/jpeg', 0, other)), id3Frame('APIC', apicData('image/jpeg', 4, back))]);
    t = await parse(bytes(tag, mp3Frames(4)), 'p.mp3');
    sameBytes(t.picture.data, other);
  });

  it('画像の MIME が空・不完全・まちがいなら、先頭バイトで判定する', async () => {
    const cases = [
      ['', fakePng(300), 'image/png'],
      ['image/', fakeJpeg(300), 'image/jpeg'],
      ['image/jpg', fakeJpeg(300), 'image/jpeg'],
      ['image/jpeg', fakePng(300), 'image/png'],
      ['PNG', fakePng(300), 'image/png'],
      ['', bytes('GIF89a', randomBytes(100)), 'image/gif'],
      ['', bytes('RIFF', u32le(200), 'WEBPVP8 ', randomBytes(100)), 'image/webp'],
      ['', bytes('BM', u32le(154), u32le(0), u32le(54), randomBytes(140)), 'image/bmp'],
      ['image/x-unknown', bytes(1, 2, 3, 4, 5, 6, 7, 8), 'image/x-unknown'],
    ];
    for (const [mime, img, expected] of cases) {
      const tag = id3v2(3, [id3Frame('APIC', apicData(mime, 3, img))]);
      const t = await parse(bytes(tag, mp3Frames(4)), 'm.mp3');
      assert.equal(t.picture.mime, expected, JSON.stringify(mime));
      sameBytes(t.picture.data, img);
    }
  });

  it('ジャンルの書き方いろいろ', async () => {
    const cases = [['(13)', 'Pop'], ['13', 'Pop'], ['(13)Pop', 'Pop'], ['(4)Eurodisco', 'Eurodisco'], ['(RX)', 'Remix'], ['(CR)', 'Cover'], ['(51)(39)', 'Techno-Industrial / Noise'], ['((Live)', '(Live)'], ['J-Pop', 'J-Pop'], ['0', 'Blues'], ['(191)', 'Psybient'], ['1990', '1990']];
    for (const [raw, expected] of cases) {
      const tag = id3v2(3, [id3Frame('TCON', textData(0, raw))]);
      assert.equal((await parse(bytes(tag, mp3Frames(4)), 'g.mp3')).genre, expected, raw);
    }
    const none = id3v2(3, [id3Frame('TCON', textData(0, '(255)'))]);
    assert.equal((await parse(bytes(none, mp3Frames(4)), 'g.mp3')).genre, undefined);
  });

  it('年の書き方いろいろ（TDRC > TYER > TDRL > TDOR）と、空の値は項目ごと省く', async () => {
    const tag = id3v2(4, [
      id3Frame('TDOR', textData(0, '1970'), 4),
      id3Frame('TYER', textData(0, '2001'), 4),
      id3Frame('TDRC', textData(0, '2012-06'), 4),
      id3Frame('TIT2', textData(0, bytes('  ', 0, 0)), 4),
      id3Frame('TPE1', textData(1, bytes(0xff, 0xfe, 0, 0)), 4),
      id3Frame('TALB', textData(0, '  Trim Me \0'), 4),
      id3Frame('TRCK', textData(0, '0/0'), 4),
      id3Frame('TCMP', textData(0, '0'), 4),
    ]);
    const t = await parse(bytes(tag, mp3Frames(4)), 'y.mp3');
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3', album: 'Trim Me', year: 2012 });
  });

  it('TXXX の ALBUMARTISTSORT / ALBUM ARTIST', async () => {
    const tag = id3v2(3, [
      id3Frame('TXXX', bytes(0, 'ALBUMARTISTSORT', 0, 'band, the')),
      id3Frame('TXXX', bytes(1, utf16le('ALBUM ARTIST'), 0, 0, utf16le('The Band'))),
      id3Frame('TXXX', bytes(0, 'OTHER', 0, 'ignored')),
    ]);
    const t = await parse(bytes(tag, mp3Frames(4)), 'x.mp3');
    assert.equal(t.sortAlbumArtist, 'band, the');
    assert.equal(t.albumArtist, 'The Band');
  });

  it('ID3v2 が2つ続いていても読める', async () => {
    const a = id3v2(3, [id3Frame('TIT2', textData(0, 'First'))]);
    const b = id3v2(4, [id3Frame('TIT2', textData(0, 'Second'), 4), id3Frame('TPE1', textData(0, 'Second Artist'), 4)]);
    const t = await parse(bytes(a, b, mp3Frames(4)), 'two.mp3');
    assert.equal(t.title, 'First');
    assert.equal(t.artist, 'Second Artist');
    near(t.duration, (4 * 417 * 8) / 128000, 0.001);
  });

  it('AAC（ADTS）: 先頭の ID3v2 だけ読む。長さは分からない', async () => {
    const tag = id3v2(4, [id3Frame('TIT2', textData(3, utf8('AAC の曲')), 4), id3Frame('TPE1', textData(3, utf8('歌手')), 4)]);
    const adts = bytes(0xff, 0xf1, 0x50, 0x80, 0x02, 0x1f, 0xfc, randomBytes(400));
    const t = await parse(bytes(tag, adts), 'a.aac');
    assert.deepEqual(t, { container: 'aac', codec: 'aac', title: 'AAC の曲', artist: '歌手' });
    // 拡張子がなくても、中身で分かる
    assert.equal((await parse(bytes(tag, adts), 'a')).container, 'aac');
    assert.equal((await parse(adts, 'a')).container, 'aac');
  });
});

describe('合成: MP3 の長さ', () => {
  it('CBR で Xing なし → 音声部分の大きさ × 8 ÷ ビットレート', async () => {
    const t = await parse(mp3Frames(100), 'cbr.mp3');
    assert.deepEqual(rest(t), { container: 'mp3', codec: 'mp3' });
    near(t.duration, (100 * 417 * 8) / 128000, 0.0005);
    // 前に ID3v2、後ろに ID3v1 があっても同じ
    const tag = id3v2(3, [id3Frame('TIT2', textData(0, 'CBR'))], 0, 500);
    const u = await parse(bytes(tag, mp3Frames(100), id3v1({ title: 'CBR' })), 'cbr.mp3');
    near(u.duration, (100 * 417 * 8) / 128000, 0.0005);
  });

  it('MPEG2 Layer III（22050Hz / 64kbps）の表', async () => {
    const t = await parse(mp3FramesMpeg2(50), 'm2.mp3');
    assert.equal(t.codec, 'mp3');
    near(t.duration, (50 * 208 * 8) / 64000, 0.0005);
  });

  it('Xing ヘッダ（フレーム数）', async () => {
    const first = new Uint8Array(417);
    first.set([0xff, 0xfb, 0x90, 0x44]);
    first.set(bytes('Xing', u32be(1), u32be(5000)), 4 + 32); // MPEG1 ステレオはヘッダの 32 バイト後ろ
    const t = await parse(bytes(first, mp3Frames(5)), 'x.mp3');
    near(t.duration, (5000 * 1152) / 44100, 0.0005);
  });

  it('VBRI ヘッダ（フレーム数）', async () => {
    const first = new Uint8Array(417);
    first.set([0xff, 0xfb, 0x90, 0x44]);
    first.set(bytes('VBRI', u16be(1), u16be(0), u16be(75), u32be(123456), u32be(1000)), 36);
    const t = await parse(bytes(first, mp3Frames(5)), 'v.mp3');
    near(t.duration, (1000 * 1152) / 44100, 0.0005);
  });

  it('音声の前にごみがあっても、にせの同期にだまされずに最初のフレームを見つける', async () => {
    const junk = new Uint8Array(3000);
    junk.set([0xff, 0xfb, 0x90, 0x44], 100); // 次のフレームが続かない、にせもの
    junk.set([0xff, 0xe0, 0x00, 0x00], 500);
    const t = await parse(bytes(junk, mp3Frames(40)), 'j.mp3');
    assert.equal(t.codec, 'mp3');
    near(t.duration, (40 * 417 * 8) / 128000, 0.0005);
  });

  it('フレームが見つからなければ長さは無し', async () => {
    const t = await parse(new Uint8Array(5000).fill(0x41), 'none.mp3');
    assert.deepEqual(t, { container: 'mp3' });
  });
});

describe('合成: MP4', () => {
  const esds = (kind) => atom('esds', u32be(0), 0x03, 0x80, 0x80, 0x80, 0x19, u16be(1), 0x00, 0x04, 0x80, 0x80, 0x80, 0x11, kind, 0x15, new Uint8Array(16));
  const audioTrack = (format, extra = []) => atom('trak',
    atom('tkhd', new Uint8Array(84)),
    atom('mdia',
      atom('mdhd', u32be(0), u32be(0), u32be(0), u32be(44100), u32be(441000), u32be(0)),
      atom('hdlr', u32be(0), u32be(0), 'soun', new Uint8Array(13)),
      atom('minf', atom('smhd', new Uint8Array(8)), atom('stbl',
        atom('stsd', u32be(0), u32be(1), atom(format, new Uint8Array(28), extra)),
        atom('stts', new Uint8Array(4000)),
        atom('stsz', new Uint8Array(4000)),
      ))));
  const videoTrack = atom('trak', atom('mdia',
    atom('hdlr', u32be(0), u32be(0), 'vide', new Uint8Array(13)),
    atom('minf', atom('stbl', atom('stsd', u32be(0), u32be(1), atom('jpeg', new Uint8Array(70)))))));
  const meta = (ilst) => atom('meta', u32be(0), atom('hdlr', u32be(0), u32be(0), 'mdir', 'appl', new Uint8Array(9)), ilst);
  const ftyp = atom('ftyp', 'M4A ', u32be(0), 'M4A mp42isom');

  it('moov が mdat の後ろ + 64 ビットの大きさ + よみがな', async () => {
    const img = fakeJpeg(4000);
    const ilst = atom('ilst',
      mp4Text('\xA9nam', '合成の曲'),
      mp4Text('\xA9ART', '合成バンド'),
      mp4Text('aART', 'アルバムの人'),
      mp4Text('\xA9alb', '合成アルバム'),
      mp4Item('gnre', 0, u16be(18)), // ID3v1 の 17（Rock）+ 1
      mp4Text('\xA9day', '2008-11-21T08:00:00Z'),
      mp4Text('\xA9wrt', '作曲の人'),
      mp4Item('trkn', 0, [0, 0, 0, 4, 0, 10, 0, 0]),
      mp4Item('disk', 0, [0, 0, 0, 2, 0, 3]),
      mp4Item('cpil', 21, [1]),
      mp4Text('sonm', 'ごうせいのきょく'),
      mp4Text('soar', 'ごうせいばんど'),
      mp4Text('soal', 'ごうせいあるばむ'),
      mp4Text('soaa', 'あるばむのひと'),
      mp4Text('\xA9lyr', '一行目\r\n二行目\r三行目'),
      mp4Text('\xA9too', 'ignored'),
      mp4Item('----', 1, 'freeform'),
      mp4Item('covr', 13, img),
    );
    const mvhd = atom('mvhd', 1, 0, 0, 0, u64be(0), u64be(0), u32be(1000), u64be(10500), new Uint8Array(80)); // 版 1（64 ビット）
    const moov = atom64('moov', mvhd, videoTrack, audioTrack('mp4a', esds(0x40)), atom('udta', meta(ilst)));
    const payload = randomBytes(200000, 5);
    const file = bytes(ftyp, atom('free'), u32be(1), 'mdat', u64be(16 + payload.length), payload, moov);
    const t = await parse(file, 'synth.m4a');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'mp4', codec: 'aac',
      title: '合成の曲', artist: '合成バンド', album: '合成アルバム', albumArtist: 'アルバムの人',
      genre: 'Rock', year: 2008, composer: '作曲の人',
      track: 4, trackTotal: 10, disc: 2, discTotal: 3, compilation: true,
      sortTitle: 'ごうせいのきょく', sortArtist: 'ごうせいばんど', sortAlbum: 'ごうせいあるばむ', sortAlbumArtist: 'あるばむのひと',
      lyrics: '一行目\n二行目\n三行目',
    });
    near(t.duration, 10.5, 0.0001);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, img);
  });

  it('moov が先頭（mvhd 版 0）/ ALAC / PNG / 文字のジャンル / mdat が「最後まで」', async () => {
    const img = fakePng(1000);
    const ilst = atom('ilst', mp4Text('\xA9nam', 'Front'), mp4Text('\xA9gen', 'アニメ'), mp4Item('covr', 14, img), mp4Item('trkn', 0, [0, 0, 0, 7]));
    const mvhd = atom('mvhd', u32be(0), u32be(0), u32be(0), u32be(600), u32be(1500), new Uint8Array(80));
    const moov = atom('moov', mvhd, audioTrack('alac'), atom('udta', meta(ilst)));
    const file = bytes(ftyp, moov, u32be(0), 'mdat', randomBytes(5000));
    const t = await parse(file, 'front.m4a');
    assert.deepEqual(rest(t), { container: 'mp4', codec: 'alac', title: 'Front', genre: 'アニメ', track: 7 });
    near(t.duration, 2.5, 0.0001);
    assert.equal(t.picture.mime, 'image/png');
    sameBytes(t.picture.data, img);
  });

  it('mvhd の長さが 0 なら音声トラックの mdhd を使う / MP3 入りの MP4 / UTF-16 の文字', async () => {
    const ilst = atom('ilst', mp4Item('\xA9nam', 2, utf16be('ユニコード', false)), mp4Item('\xA9ART', 3, sjis('シフトJIS')));
    const mvhd = atom('mvhd', u32be(0), u32be(0), u32be(0), u32be(1000), u32be(0), new Uint8Array(80));
    const moov = atom('moov', mvhd, audioTrack('mp4a', esds(0x6b)), meta(ilst)); // moov の直下に meta がある書き方
    const t = await parse(bytes(ftyp, moov), 'mp3in.mp4');
    assert.deepEqual(rest(t), { container: 'mp4', codec: 'mp3', title: 'ユニコード', artist: 'シフトJIS' });
    near(t.duration, 10, 0.0001);
  });

  it('moov が無い（途中で切れた）ファイルは形式だけ返す', async () => {
    const t = await parse(bytes(ftyp, u32be(1), 'mdat', u64be(16 + 1000), randomBytes(1000)), 'cut.m4a');
    assert.deepEqual(t, { container: 'mp4' });
  });
});

describe('合成: FLAC / OGG', () => {
  it('前に ID3v2 が付いた FLAC（FLAC のタグを優先し、無い項目だけ ID3 で補う）', async () => {
    const front = fakeJpeg(3000, 11);
    const back = fakePng(2000, 12);
    const id3 = id3v2(3, [
      id3Frame('TIT2', textData(0, 'ID3 Title')),
      id3Frame('TCOM', textData(0, 'ID3 Composer')),
      id3Frame('APIC', apicData('image/jpeg', 3, fakeJpeg(500, 13))),
    ], 0, 200);
    const flac = bytes(
      'fLaC',
      flacBlock(0, flacStreamInfo(48000, 48000 * 12.5)),
      flacBlock(3, randomBytes(1800)), // SEEKTABLE
      flacBlock(1, new Uint8Array(4096)), // PADDING
      flacBlock(6, flacPicture(4, 'image/png', back, 'うら')),
      flacBlock(4, vorbisComments(['TITLE=FLAC の題名', 'Artist=フラック歌手', 'ALBUM=FLAC Album', 'TRACKNUMBER=03', 'TOTALTRACKS=9', 'DISCNUMBER=2/2', 'YEAR=1977'])),
      flacBlock(6, flacPicture(3, 'image/jpeg', front, 'おもて'), true),
      randomBytes(20000, 14),
    );
    const t = await parse(bytes(id3, flac), 'pre.flac');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'flac', codec: 'flac',
      title: 'FLAC の題名', artist: 'フラック歌手', album: 'FLAC Album', year: 1977, composer: 'ID3 Composer',
      track: 3, trackTotal: 9, disc: 2, discTotal: 2,
    });
    near(t.duration, 12.5, 0.0001);
    assert.equal(t.picture.mime, 'image/jpeg');
    sameBytes(t.picture.data, front);
  });

  it('FLAC: 36 ビットのサンプル数 / FLAC にタグが無ければ ID3 のものを使う', async () => {
    const id3 = id3v2(3, [id3Frame('TIT2', textData(0, 'Only ID3')), id3Frame('APIC', apicData('image/png', 3, fakePng(600)))]);
    const total = 5 * 4294967296 + 1000; // 4GB サンプルをこえる
    const flac = bytes('fLaC', flacBlock(0, flacStreamInfo(96000, total), true), randomBytes(500));
    const t = await parse(bytes(id3, flac), 'x.flac');
    assert.equal(t.container, 'flac');
    assert.equal(t.title, 'Only ID3');
    near(t.duration, total / 96000, 0.001);
    assert.equal(t.picture.mime, 'image/png');
  });

  it('FLAC: Vorbis コメントの中の METADATA_BLOCK_PICTURE と、古い COVERART', async () => {
    const img = fakeJpeg(5000, 21);
    let flac = bytes('fLaC', flacBlock(0, flacStreamInfo(44100, 44100)), flacBlock(4, vorbisComments(['TITLE=In Comment', 'METADATA_BLOCK_PICTURE=' + base64(flacPicture(3, 'image/jpeg', img))]), true));
    let t = await parse(flac, 'c.flac');
    assert.equal(t.title, 'In Comment');
    sameBytes(t.picture.data, img);

    const png = fakePng(4001, 22);
    flac = bytes('fLaC', flacBlock(0, flacStreamInfo(44100, 44100)), flacBlock(4, vorbisComments(['COVERART=' + base64(png), 'COVERARTMIME=image/png', 'TITLE=Old Style']), true));
    t = await parse(flac, 'c.flac');
    assert.equal(t.title, 'Old Style');
    assert.equal(t.picture.mime, 'image/png');
    sameBytes(t.picture.data, png);
  });

  it('OGG Vorbis: 複数ページにまたがるコメント + METADATA_BLOCK_PICTURE（base64）', async () => {
    const img = fakePng(150000, 31);
    const comments = vorbisComments([
      'TITLE=ページをまたぐ曲',
      'artist=小文字のキー',
      'Artist=ふたりめ',
      'ALBUM=Ogg Album',
      'ALBUM ARTIST=空白つきのキー',
      'TRACKNUMBER=3/12',
      'DISCNUMBER=1',
      'DISCTOTAL=2',
      'DATE=2020-05-05',
      'GENRE=Folk',
      'GENRE=Pop',
      'COMPOSER=作曲',
      'COMPILATION=1',
      'UNSYNCEDLYRICS=一行目\r\n二行目',
      'TITLESORT=ぺーじをまたぐきょく',
      'ARTISTSORT=こもじのきー',
      'ALBUMSORT=おっぐあるばむ',
      'ALBUMARTISTSORT=くうはくつきのきー',
      'METADATA_BLOCK_PICTURE=' + base64(flacPicture(3, 'image/png', img, 'front')),
      'ENCODER=after the picture',
      'TRACKTOTAL=99',
    ]);
    const serial = 0x1234abcd;
    const file = bytes(
      oggPages(serial, [{ data: vorbisIdent(44100), flush: true }]),
      oggPages(serial, [
        { data: bytes(0x03, 'vorbis', comments, 0x01) },
        { data: bytes(0x05, 'vorbis', randomBytes(3000, 32)), flush: true },
        { data: randomBytes(4000, 33), granule: 44100 * 2, flush: true },
        { data: randomBytes(4000, 34), granule: 44100 * 5, flush: true },
      ], { startSeq: 1, eos: true }),
    );
    // コメントのパケットは 20 万バイトをこえるので、4ページ以上にまたがっているはず
    const pageCount = file.reduce((n, b, i) => n + (b === 0x4f && file[i + 1] === 0x67 && file[i + 2] === 0x67 && file[i + 3] === 0x53 && file[i + 4] === 0 ? 1 : 0), 0);
    assert.ok(pageCount >= 6, 'ページ数 ' + pageCount);

    const t = await parse(file, 'multi.ogg');
    checkShape(t);
    assert.deepEqual(rest(t), {
      container: 'ogg', codec: 'vorbis',
      title: 'ページをまたぐ曲', artist: '小文字のキー / ふたりめ', album: 'Ogg Album', albumArtist: '空白つきのキー',
      genre: 'Folk / Pop', year: 2020, composer: '作曲',
      track: 3, trackTotal: 12, disc: 1, discTotal: 2, compilation: true,
      sortTitle: 'ぺーじをまたぐきょく', sortArtist: 'こもじのきー', sortAlbum: 'おっぐあるばむ', sortAlbumArtist: 'くうはくつきのきー',
      lyrics: '一行目\n二行目',
    });
    near(t.duration, 5.0, 0.0001);
    assert.equal(t.picture.mime, 'image/png');
    sameBytes(t.picture.data, img);

    // 小さなページ（1ページ 17 区切り）に刻んでも同じ
    const small = bytes(
      oggPages(serial, [{ data: vorbisIdent(44100), flush: true }]),
      oggPages(serial, [{ data: bytes(0x03, 'vorbis', comments, 0x01), flush: true }, { data: randomBytes(100), granule: 44100, flush: true }], { startSeq: 1, maxSegments: 17 }),
    );
    const s = await parse(small, 'small.ogg');
    assert.equal(s.title, 'ページをまたぐ曲');
    sameBytes(s.picture.data, img);
    near(s.duration, 1.0, 0.0001);
  });

  it('OGG Opus: pre-skip を引いて 48000 で割る', async () => {
    const serial = 77;
    const file = bytes(
      oggPages(serial, [{ data: opusHead(312, 44100), flush: true }]),
      oggPages(serial, [
        { data: bytes('OpusTags', vorbisComments(['TITLE=オーパス', 'ARTIST=A', 'TRACKNUMBER=2'])), flush: true },
        { data: randomBytes(500), granule: 48000 * 3 + 312, flush: true },
      ], { startSeq: 1 }),
    );
    const t = await parse(file, 'o.opus');
    assert.deepEqual(rest(t), { container: 'ogg', codec: 'opus', title: 'オーパス', artist: 'A', track: 2 });
    near(t.duration, 3.0, 0.0001);
  });

  it('OGG FLAC: メタデータブロックが1パケットずつ', async () => {
    const img = fakeJpeg(2500, 41);
    const serial = 5;
    const first = bytes(0x7f, 'FLAC', 1, 0, u16be(2), 'fLaC', flacBlock(0, flacStreamInfo(48000, 0)));
    const file = bytes(
      oggPages(serial, [{ data: first, flush: true }]),
      oggPages(serial, [
        { data: flacBlock(4, vorbisComments(['TITLE=Ogg FLAC', 'ALBUM=X'])) },
        { data: flacBlock(6, flacPicture(3, 'image/jpeg', img), true), flush: true },
        { data: bytes(0xff, 0xf8, randomBytes(300)), granule: 48000 * 4, flush: true },
      ], { startSeq: 1 }),
    );
    const t = await parse(file, 'f.oga');
    assert.deepEqual(rest(t), { container: 'ogg', codec: 'flac', title: 'Ogg FLAC', album: 'X' });
    near(t.duration, 4.0, 0.0001);
    sameBytes(t.picture.data, img);
  });

  it('OGG: 映像など別の流れがまざっていても、音声の流れだけを読む', async () => {
    const video = 900;
    const audio = 901;
    const file = bytes(
      oggPages(video, [{ data: bytes(0x80, 'theora', randomBytes(40)), flush: true }]),
      oggPages(audio, [{ data: vorbisIdent(32000), flush: true }]),
      oggPages(video, [{ data: bytes(0x81, 'theora', vorbisComments(['TITLE=Video Title'])), flush: true }], { startSeq: 1 }),
      oggPages(audio, [{ data: bytes(0x03, 'vorbis', vorbisComments(['TITLE=Audio Title']), 1), flush: true }], { startSeq: 1 }),
      oggPages(audio, [{ data: randomBytes(200), granule: 32000 * 7, flush: true }], { startSeq: 2 }),
      oggPages(video, [{ data: randomBytes(200), granule: 999999999, flush: true }], { startSeq: 2 }),
    );
    const t = await parse(file, 'mux.ogg');
    assert.equal(t.title, 'Audio Title');
    near(t.duration, 7.0, 0.0001);
  });

  it('OGG: コメントの途中で切れていても、読めた分は返す', async () => {
    const comments = vorbisComments(['TITLE=切れた曲', 'ARTIST=歌手', 'METADATA_BLOCK_PICTURE=' + base64(flacPicture(3, 'image/png', fakePng(90000)))]);
    const full = bytes(
      oggPages(9, [{ data: vorbisIdent(44100), flush: true }]),
      oggPages(9, [{ data: bytes(0x03, 'vorbis', comments, 1), flush: true }], { startSeq: 1 }),
    );
    const t = await parse(full.subarray(0, 70000), 'cut.ogg');
    assert.deepEqual(t, { container: 'ogg', codec: 'vorbis', title: '切れた曲', artist: '歌手' });
  });
});

describe('合成: WAV / AIFF / CAF', () => {
  const fmt = bytes('fmt ', u32le(16), u16le(1), u16le(2), u32le(44100), u32le(176400), u16le(4), u16le(16));
  const infoItem = (id, data) => {
    const d = bytes(data, 0);
    return bytes(id, u32le(d.length), d, d.length & 1 ? [0] : []);
  };
  const riff = (...chunks) => {
    const body = bytes('WAVE', chunks);
    return bytes('RIFF', u32le(body.length), body);
  };
  const chunk = (id, data) => {
    const d = bytes(data);
    return bytes(id, u32le(d.length), d, d.length & 1 ? [0] : []);
  };

  it('WAV: data のうしろの LIST/INFO（Shift_JIS）と曲番号・年・ジャンル', async () => {
    const info = bytes('INFO', infoItem('INAM', sjis('波の題名')), infoItem('IART', sjis('ｳｪｰﾌﾞ歌手')), infoItem('IPRD', utf8('ユーティーエフ8')), infoItem('ICRD', '2011-02-03'), infoItem('IGNR', 'Pop'), infoItem('ITRK', '6'), infoItem('ISFT', 'ignored'));
    const pcm = new Uint8Array(44100 * 4 * 3 + 1); // 奇数 → 詰め物が1バイト入る
    const file = riff(fmt, chunk('data', pcm), chunk('LIST', info));
    const t = await parse(file, 'w.wav');
    checkShape(t);
    assert.deepEqual(rest(t), { container: 'wav', codec: 'pcm', title: '波の題名', artist: 'ｳｪｰﾌﾞ歌手', album: 'ユーティーエフ8', genre: 'Pop', year: 2011, track: 6 });
    near(t.duration, 3.0, 0.0001);
  });

  it('WAV: id3 チャンクを LIST/INFO より優先し、無い項目だけ INFO で補う', async () => {
    const img = fakeJpeg(1500);
    const id3 = id3v2(3, [id3Frame('TIT2', textData(1, utf16le('ID3 の題名'))), id3Frame('APIC', apicData('image/jpeg', 3, img))]);
    const info = bytes('INFO', infoItem('INAM', 'INFO Title'), infoItem('IART', 'INFO Artist'));
    const file = riff(fmt, chunk('LIST', info), chunk('data', new Uint8Array(176400)), chunk('id3 ', id3));
    const t = await parse(file, 'w.wav');
    assert.deepEqual(rest(t), { container: 'wav', codec: 'pcm', title: 'ID3 の題名', artist: 'INFO Artist' });
    near(t.duration, 1.0, 0.0001);
    sameBytes(t.picture.data, img);
  });

  it('WAV: data の大きさが未記入（0 や FFFFFFFF）なら最後までを音声とみなす / MP3 入りの WAV', async () => {
    for (const size of [0, 0xffffffff]) {
      const file = bytes('RIFF', u32le(size), 'WAVE', fmt, 'data', u32le(size), new Uint8Array(88200));
      near((await parse(file, 's.wav')).duration, 0.5, 0.0001, 'size=' + size);
    }
    const mp3fmt = bytes('fmt ', u32le(30), u16le(0x55), u16le(2), u32le(44100), u32le(16000), u16le(1), u16le(0), new Uint8Array(14));
    const t = await parse(riff(mp3fmt, chunk('fact', u32le(441000)), chunk('data', mp3Frames(10))), 'm.wav');
    assert.equal(t.container, 'wav');
    assert.equal(t.codec, 'mp3');
    near(t.duration, 10, 0.0001);
  });

  it('WAV: RF64（4GB ごえ用の書き方）', async () => {
    const ds64 = bytes('ds64', u32le(28), u64le(0), u64le(88200 * 2), u64le(0), u32le(0));
    const file = bytes('RF64', u32le(0xffffffff), 'WAVE', ds64, fmt, 'data', u32le(0xffffffff), new Uint8Array(88200 * 2));
    const t = await parse(file, 'big.wav');
    assert.equal(t.container, 'wav');
    near(t.duration, 1.0, 0.0001);
  });

  const comm = (frames, rate80, extra = []) => {
    const d = bytes(u16be(2), u32be(frames), u16be(16), rate80, extra);
    return bytes('COMM', u32be(d.length), d, d.length & 1 ? [0] : []);
  };
  const RATE_44100 = [0x40, 0x0e, 0xac, 0x44, 0, 0, 0, 0, 0, 0];
  const RATE_48000 = [0x40, 0x0e, 0xbb, 0x80, 0, 0, 0, 0, 0, 0];
  const RATE_8000 = [0x40, 0x0b, 0xfa, 0x00, 0, 0, 0, 0, 0, 0];
  const form = (type, ...chunks) => {
    const body = bytes(type, chunks);
    return bytes('FORM', u32be(body.length), body);
  };
  const aChunk = (id, data) => {
    const d = bytes(data);
    return bytes(id, u32be(d.length), d, d.length & 1 ? [0] : []);
  };

  it('AIFF: COMM（80 ビットのサンプルレート）と NAME / AUTH', async () => {
    const file = form('AIFF', comm(44100 * 6, RATE_44100), aChunk('NAME', 'Aiff Name'), aChunk('AUTH', sjis('作者')), aChunk('SSND', new Uint8Array(1001)), aChunk('ANNO', 'note'));
    const t = await parse(file, 'a.aif');
    assert.deepEqual(rest(t), { container: 'aiff', codec: 'pcm', title: 'Aiff Name', artist: '作者' });
    near(t.duration, 6.0, 0.0001);
    near((await parse(form('AIFF', comm(48000 * 2, RATE_48000)), 'b.aiff')).duration, 2.0, 0.0001);
    near((await parse(form('AIFF', comm(8000 * 9, RATE_8000)), 'c.aiff')).duration, 9.0, 0.0001);
  });

  it('AIFC: 圧縮の種類 / ID3 チャンクを NAME より優先', async () => {
    const id3 = id3v2(4, [id3Frame('TIT2', textData(3, utf8('ID3 が勝つ')), 4)]);
    const file = form('AIFC', aChunk('NAME', 'Chunk Name'), aChunk('AUTH', 'Chunk Author'), comm(44100, RATE_44100, bytes('sowt', 0, 0)), aChunk('SSND', new Uint8Array(400)), aChunk('ID3 ', id3));
    const t = await parse(file, 'c.aifc');
    assert.deepEqual(rest(t), { container: 'aiff', codec: 'pcm', title: 'ID3 が勝つ', artist: 'Chunk Author' });
    near(t.duration, 1.0, 0.0001);
    const alac = form('AIFC', comm(44100, RATE_44100, bytes('alac', 0, 0)));
    assert.equal((await parse(alac, 'x.aifc')).codec, 'alac');
  });

  it('CAF: 長さと題名は読む（container は決まりの一覧に無いので unknown）', async () => {
    const rate = new Uint8Array(8);
    new DataView(rate.buffer).setFloat64(0, 44100);
    const cafChunk = (id, data) => {
      const d = bytes(data);
      return bytes(id, u64be(d.length), d);
    };
    const desc = cafChunk('desc', bytes(rate, 'lpcm', u32be(0), u32be(4), u32be(1), u32be(2), u32be(16)));
    const info = cafChunk('info', bytes(u32be(2), 'title', 0, utf8('カフの曲'), 0, 'artist', 0, 'CAF Artist', 0));
    const file = bytes('caff', u16be(1), u16be(0), desc, info, cafChunk('data', bytes(u32be(0), new Uint8Array(44100 * 4 * 2))));
    const t = await parse(file, 'c.caf');
    assert.deepEqual(rest(t), { container: 'unknown', codec: 'pcm', title: 'カフの曲', artist: 'CAF Artist' });
    near(t.duration, 2.0, 0.0001);
  });
});

// ============================================================
// 3. 頑丈さ（どんな入力でも、例外を出さず・すぐ戻る）
// ============================================================

describe('頑丈さ', () => {
  const NAMES = ['x.mp3', 'x.m4a', 'x.flac', 'x.ogg', 'x.opus', 'x.wav', 'x.aiff', 'x.aac', 'x.caf', 'x.bin', 'x', ''];
  const FIXTURE_FILES = ['a1-natsu.mp3', 'a2-kusa.mp3', 'a3-yuuyake.flac', 'b1-umi.m4a', 'b2-seaside.ogg', 'c1-opus.opus', '07 たぐなしの曲.wav', 'wav-info.wav', 'c2-alac.m4a', 'aiff-id3.aiff', 'notag-vbr.mp3', 'both-tags.mp3'];
  let slowest = 0;

  /** 例外が出ない・5秒以内に戻る・形が正しい、を確かめる */
  async function safe(data, name, label) {
    const started = performance.now();
    let t;
    try {
      t = await parseTags(data instanceof Uint8Array ? new Blob([data]) : data, name);
    } catch (e) {
      assert.fail(`${label}: 例外が外に出た: ${e && e.stack}`);
    }
    const ms = performance.now() - started;
    slowest = Math.max(slowest, ms);
    assert.ok(ms < 5000, `${label}: ${ms.toFixed(0)}ms かかった`);
    try {
      checkShape(t);
    } catch (e) {
      assert.fail(`${label}: ${e.message}`);
    }
    return t;
  }

  it('空のファイル・数バイトだけのファイル', async () => {
    const expected = { 'x.mp3': 'mp3', 'x.m4a': 'mp4', 'x.flac': 'flac', 'x.ogg': 'ogg', 'x.opus': 'ogg', 'x.wav': 'wav', 'x.aiff': 'aiff', 'x.aac': 'aac', 'x.caf': 'unknown', 'x.bin': 'unknown', x: 'unknown', '': 'unknown' };
    for (const name of NAMES) {
      const t = await safe(new Uint8Array(0), name, '空 ' + name);
      assert.deepEqual(t, { container: expected[name] }, '空のファイルは拡張子で形式だけ返す: ' + name);
    }
    const starts = ['ID3', 'ID3\x03\x00\x00\x00\x00\x00', 'ID3\x04\x00\x00\x7f\x7f\x7f\x7f', 'fLaC', 'fLaC\x00', 'fLaC\x84\xff\xff\xff', 'OggS', 'OggS\x00\x02', 'RIFF', 'RIFF\x00\x00\x00\x00WAVE', 'RIFF\xff\xff\xff\xffWAVEfmt ', 'FORM', 'FORM\x00\x00\x00\x00AIFF', 'FORM\x00\x00\x00\x00AIFCCOMM', '\x00\x00\x00\x08ftyp', '\x00\x00\x00\x01ftyp', '\x00\x00\x00\x00moov', 'caff', 'caff\x00\x01\x00\x00desc', '\xff\xfb', '\xff\xfb\x90\x44', '\xff\xf1\x50', 'TAG', '\x00', '\xff'];
    for (const s of starts) {
      for (const name of NAMES) await safe(bytes(s), name, JSON.stringify(s) + ' ' + name);
    }
    assert.equal((await safe(bytes('fLaC'), 'x.bin', 'fLaC')).container, 'flac');
    assert.equal((await safe(bytes('OggS'), 'x.bin', 'OggS')).container, 'ogg');
  });

  it('Blob でないものを渡しても例外にならない', async () => {
    for (const bad of [null, undefined, {}, 'text', 42, { size: 10 }, { size: 10, slice: () => ({}) }, { size: 100, slice: () => { throw new Error('読めない'); } }, { size: 100, slice: () => ({ arrayBuffer: () => Promise.reject(new Error('だめ')) }) }]) {
      const t = await parseTags(bad, 'x.mp3');
      assert.deepEqual(t, { container: 'mp3' });
    }
    assert.deepEqual(await parseTags(new Blob([fixture('a2-kusa.mp3')]), null), await parseTags(new Blob([fixture('a2-kusa.mp3')]), 'a2-kusa.mp3'));
  });

  it('でたらめなバイト列', async () => {
    const sizes = [1, 2, 3, 5, 9, 10, 11, 27, 64, 127, 128, 129, 500, 4096, 70000, 300000];
    let seed = 1;
    for (const size of sizes) {
      for (const name of NAMES) await safe(randomBytes(size, seed++), name, `でたらめ ${size}B ${name}`);
    }
    // 形式の目じるしだけ本物で、あとはでたらめ
    const heads = ['ID3\x03\x00\x00', 'ID3\x04\x00\xff', 'ID3\x02\x00\x80', 'fLaC', 'OggS\x00\x02', 'RIFFxxxxWAVE', 'FORMxxxxAIFF', '\x00\x00\x00\x20ftypM4A ', 'caff\x00\x01\x00\x00', '\xff\xfb\x90\x44', '\xff\xf1\x50\x80'];
    for (const h of heads) {
      for (let i = 0; i < 12; i++) {
        const junk = randomBytes(200 + i * 3000, seed++);
        await safe(bytes(h, junk), 'x.bin', `${JSON.stringify(h)} + でたらめ #${i}`);
      }
    }
  });

  it('各 fixture を途中で切ったもの（いろいろな長さ）', async () => {
    for (const name of FIXTURE_FILES) {
      const full = fixture(name);
      const lengths = new Set([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 16, 20, 26, 27, 28, 29, 32, 36, 40, 44, 64, 100, 127, 128, 129, 200, 256, 300, 512, 1000, 1024, 2000, 4096, full.length - 129, full.length - 128, full.length - 127, full.length - 10, full.length - 1]);
      for (let i = 1; i < 60; i++) lengths.add(Math.floor((full.length * i) / 60));
      const whole = await parseTags(new Blob([full]), name);
      for (const n of lengths) {
        if (n < 0 || n > full.length) continue;
        const t = await safe(full.subarray(0, n), name, `${name} の先頭 ${n} バイト`);
        // 切れたファイルからは、本物と食いちがう文字の項目は出てこない（出るなら同じ値）
        for (const key of ['title', 'artist', 'album']) {
          if (t[key] !== undefined) assert.equal(t[key], whole[key], `${name} @${n}: ${key}`);
        }
      }
      // うしろ半分だけ・まんなかだけ
      await safe(full.subarray(full.length >> 1), name, name + ' のうしろ半分');
      await safe(full.subarray(full.length >> 2, (full.length * 3) >> 2), name, name + ' のまんなか');
    }
  });

  it('大きさの欄を巨大な値・0・でたらめに書きかえたもの', async () => {
    const random = rng(2024);
    const patterns = [[0xff, 0xff, 0xff, 0xff], [0x7f, 0x7f, 0x7f, 0x7f], [0, 0, 0, 0], [0, 0, 0, 1], [0x80, 0, 0, 0], [0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0xff]];
    let count = 0;
    for (const name of FIXTURE_FILES) {
      const full = fixture(name);
      // 先頭 200 バイトは全部の位置、そのあとはタグのありそうな所をとびとびに
      const positions = [];
      for (let p = 0; p < Math.min(200, full.length); p++) positions.push(p);
      for (let i = 0; i < 260; i++) positions.push(Math.floor(random() * full.length));
      for (const p of positions) {
        const pattern = patterns[count % patterns.length];
        const copy = Uint8Array.from(full);
        copy.set(pattern.slice(0, Math.max(0, Math.min(pattern.length, copy.length - p))), p);
        await safe(copy, name, `${name} の ${p} バイト目を ${pattern.map((b) => b.toString(16)).join(' ')} に`);
        count++;
      }
      // でたらめに 1〜8 バイトこわす
      for (let i = 0; i < 150; i++) {
        const copy = Uint8Array.from(full);
        const n = 1 + Math.floor(random() * 8);
        for (let k = 0; k < n; k++) copy[Math.floor(random() * Math.min(copy.length, 40000))] = Math.floor(random() * 256);
        await safe(copy, name, `${name} をでたらめにこわす #${i}`);
        count++;
      }
    }
    assert.ok(count > 5000);
  });

  it('わざと作った意地悪なファイル', async () => {
    const cases = {
      'ID3: タグが 256MB あると言い張る': bytes('ID3', 3, 0, 0, 0x7f, 0x7f, 0x7f, 0x7f, id3Frame('TIT2', textData(0, 'Liar')), mp3Frames(3)),
      'ID3: フレームが 4GB あると言い張る': bytes(id3v2(3, bytes('TIT2', 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 'abc')), mp3Frames(3)),
      'ID3: 大きさ 0 のフレームが延々と続く': bytes(id3v2(3, new Array(5000).fill(bytes('TIT2', u32be(0), u16be(0)))), mp3Frames(3)),
      'ID3: 非同期化の旗だけ立っていて、中身は全部 FF': bytes(id3v2(3, new Uint8Array(50000).fill(0xff), 0x80), mp3Frames(3)),
      'ID3: v2.4 で拡張ヘッダが巨大': bytes(id3v2(4, bytes(0x7f, 0x7f, 0x7f, 0x7f, 1, 0, id3Frame('TIT2', textData(0, 'x'), 4)), 0x40), mp3Frames(3)),
      'ID3: APIC の説明が終わらない': bytes(id3v2(3, id3Frame('APIC', bytes(1, 'image/jpeg', 0, 3, new Uint8Array(3001).fill(0x41)))), mp3Frames(3)),
      'ID3: ID3 が 4 個より多く続く': bytes(new Array(40).fill(id3v2(3, id3Frame('TIT2', textData(0, 'x')))), mp3Frames(3)),
      'MP3: FF だけが続く': new Uint8Array(300000).fill(0xff),
      'MP3: にせのフレームヘッダだらけ': bytes(new Array(60000).fill([0xff, 0xfb, 0x90, 0x44])),
      'MP4: 64 ビットの大きさが 2^60': bytes(u32be(24), 'ftypM4A ', u32be(0), 'M4A mp42', u32be(1), 'moov', 0x10, 0, 0, 0, 0, 0, 0, 0, randomBytes(100)),
      'MP4: 大きさ 8 の空箱が延々と続く': bytes(u32be(16), 'ftypM4A ', u32be(0), new Array(20000).fill(bytes(u32be(8), 'free'))),
      'MP4: moov の中身が自分より大きいと言い張る': bytes(atom('ftyp', 'M4A ', u32be(0)), u32be(64), 'moov', u32be(0xfffffff0), 'udta', u32be(0xfffffff0), 'meta', u32be(0), u32be(0xfffffff0), 'ilst', u32be(0xfffffff0), '\xA9nam', u32be(0xfffffff0), 'data', u32be(1), u32be(0), 'Title'),
      'MP4: 大きさ 0 の箱（最後まで）が入れ子': bytes(atom('ftyp', 'M4A ', u32be(0)), u32be(0), 'moov', u32be(0), 'udta', u32be(0), 'meta', u32be(0), u32be(0), 'ilst', u32be(0), '\xA9nam', u32be(0), 'data', u32be(1), u32be(0), 'Zero Size'),
      'MP4: covr が 3GB あると言い張る': bytes(atom('ftyp', 'M4A ', u32be(0)), atom('moov', atom('udta', atom('meta', u32be(0), atom('ilst', bytes(u32be(0xc0000000), 'covr', u32be(0xbffffff8), 'data', u32be(13), u32be(0), fakeJpeg(100))))))),
      'FLAC: ブロックが 16MB あると言い張る': bytes('fLaC', 0x04, 0xff, 0xff, 0xff, vorbisComments(['TITLE=Short'])),
      'FLAC: コメントの数と長さが 4GB': bytes('fLaC', flacBlock(4, bytes(u32le(0xffffffff), u32le(0xffffffff), u32le(0xffffffff), 'TITLE=x'), true)),
      'FLAC: 長さ 0 のブロックが延々と続く': bytes('fLaC', new Array(30000).fill([0x01, 0, 0, 0])),
      'FLAC: PICTURE の中の長さがでたらめ': bytes('fLaC', flacBlock(6, bytes(u32be(3), u32be(0xffffffff), 'image/png', u32be(0xffffffff), randomBytes(100)), true)),
      'OGG: 区切りの表が 255 個ぜんぶ 255': bytes('OggS', 0, 2, new Uint8Array(8), u32le(1), u32le(0), u32le(0), 255, new Uint8Array(255).fill(255), vorbisIdent(44100)),
      'OGG: 終わらないパケット': bytes(oggPages(3, [{ data: vorbisIdent(44100), flush: true }]), new Array(300).fill(bytes('OggS', 0, 1, new Uint8Array(8).fill(0xff), u32le(3), u32le(1), u32le(0), 1, 255, new Uint8Array(255)))),
      'OGG: 長さ 0 のページが延々と続く': bytes(oggPages(3, [{ data: vorbisIdent(44100), flush: true }]), new Array(20000).fill(bytes('OggS', 0, 0, new Uint8Array(8), u32le(4), u32le(1), u32le(0), 0))),
      'OGG: コメントの長さがでたらめ': bytes(oggPages(3, [{ data: vorbisIdent(44100), flush: true }]), oggPages(3, [{ data: bytes(0x03, 'vorbis', u32le(0xfffffff0), 'x', u32le(0xffffffff)) }], { startSeq: 1 })),
      'WAV: チャンクが全部 4GB': bytes('RIFF', u32le(0xffffffff), 'WAVE', 'fmt ', u32le(0xffffffff), u16le(1), u16le(2), u32le(44100), 'LIST', u32le(0xffffffff), 'INFO', 'INAM', u32le(0xffffffff), 'Title'),
      'WAV: 大きさ 0 のチャンクが延々と続く': bytes('RIFF', u32le(4), 'WAVE', new Array(30000).fill(bytes('junk', u32le(0)))),
      'WAV: サンプルレート 0': bytes('RIFF', u32le(100), 'WAVE', 'fmt ', u32le(16), u16le(1), u16le(0), u32le(0), u32le(0), u16le(0), u16le(0), 'data', u32le(4), 1, 2, 3, 4),
      'AIFF: サンプルレートが無限大・0': bytes('FORM', u32be(100), 'AIFF', 'COMM', u32be(18), u16be(2), u32be(1000), u16be(16), 0x7f, 0xff, new Uint8Array(8), 'COMM', u32be(18), u16be(2), u32be(1000), u16be(16), new Uint8Array(10)),
      'AIFF: チャンクが全部 4GB': bytes('FORM', u32be(0xffffffff), 'AIFF', 'NAME', u32be(0xffffffff), 'Name', 'ID3 ', u32be(0xffffffff), id3v2(3, id3Frame('TIT2', textData(0, 'x')))),
      'CAF: 大きさが負の数': bytes('caff', u16be(1), u16be(0), 'desc', 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, randomBytes(64)),
    };
    for (const [label, data] of Object.entries(cases)) {
      for (const name of ['x.bin', 'x.mp3', 'x.m4a']) await safe(data, name, label + ' / ' + name);
    }
    assert.equal((await parse(cases['MP4: 大きさ 0 の箱（最後まで）が入れ子'], 'z.m4a')).title, 'Zero Size');
    assert.equal((await parse(cases['FLAC: ブロックが 16MB あると言い張る'], 'z.flac')).title, 'Short');
    assert.equal((await parse(cases['ID3: タグが 256MB あると言い張る'], 'z.mp3')).title, 'Liar');
  });

  it('大きさだけ巨大に見せかけた入れもの（読む量と回数に上限がある）', async () => {
    // 2GB あると言うが、どこを読んでも「箱が 100KB 先にある」ように見える、終わらないファイル
    const fake = {
      size: 2 * 1024 * MB,
      reads: 0,
      bytes: 0,
      slice(a, b) {
        const self = this;
        const n = Math.max(0, Math.min(b, this.size) - a);
        return {
          size: n,
          async arrayBuffer() {
            self.reads++;
            self.bytes += n;
            const out = new Uint8Array(n);
            out.set(bytes(u32be(100000), a === 0 ? 'ftyp' : 'free').subarray(0, n));
            return out.buffer;
          },
        };
      },
    };
    const t = await safe(fake, 'endless.m4a', '終わらない MP4');
    assert.deepEqual(t, { container: 'mp4' });
    assert.ok(fake.bytes <= 64 * MB, `読んだ量 ${fake.bytes}`);
    assert.ok(fake.reads <= 4000, `読んだ回数 ${fake.reads}`);
  });

  it('いちばん遅かった1回も 5 秒以内', () => {
    assert.ok(slowest < 5000, `いちばん遅かったのは ${slowest.toFixed(0)}ms`);
  });
});

// ============================================================
// 4. ファイル全体を読んでいないこと
// ============================================================

describe('読む量（大きなファイルでも、いる所だけ読む）', () => {
  const BIG = 20 * MB;
  const filler = new Uint8Array(BIG);

  /** 読んだ結果と、読みこみの記録を返す */
  async function track(parts, name, options) {
    const blob = new TrackingBlob(new Blob(parts));
    const tags = await parseTags(blob, name, options);
    return { tags, blob };
  }

  it('MP4: 20MB の mdat が先にあっても、mdat は読まない', async () => {
    const cover = fakeJpeg(300000);
    const ilst = atom('ilst', mp4Text('\xA9nam', '大きな曲'), mp4Text('\xA9ART', 'Artist'), mp4Item('covr', 13, cover), mp4Item('trkn', 0, [0, 0, 0, 3, 0, 9, 0, 0]));
    const moov = atom('moov', atom('mvhd', u32be(0), u32be(0), u32be(0), u32be(1000), u32be(180000), new Uint8Array(80)), atom('udta', atom('meta', u32be(0), atom('hdlr', new Uint8Array(25)), ilst)));
    const ftyp = atom('ftyp', 'M4A ', u32be(0), 'M4A mp42');
    const mdatHead = bytes(u32be(1), 'mdat', u64be(16 + BIG));

    for (const [label, parts] of [['mdat が先', [ftyp, mdatHead, filler, moov]], ['moov が先', [ftyp, moov, mdatHead, filler]]]) {
      const { tags, blob } = await track(parts, 'big.m4a');
      assert.equal(tags.title, '大きな曲', label);
      assert.equal(tags.track, 3, label);
      near(tags.duration, 180, 0.001);
      sameBytes(tags.picture.data, cover);
      assert.ok(blob.totalBytes < MB + cover.length, `${label}: 読んだ量 ${blob.totalBytes}`);
      assert.ok(blob.readCount <= 6, `${label}: 読んだ回数 ${blob.readCount}`);
    }
    // ジャケットが要らなければ、もっと少ない
    const { tags, blob } = await track([ftyp, mdatHead, filler, moov], 'big.m4a', { picture: false });
    assert.equal(tags.title, '大きな曲');
    assert.equal(tags.picture, undefined);
    assert.ok(blob.totalBytes < 200 * 1024, `ジャケットなし: 読んだ量 ${blob.totalBytes}`);
  });

  it('MP3: 大きなジャケット + 20MB の音声でも、タグの前後と末尾しか読まない', async () => {
    const cover = fakeJpeg(300000);
    const tag = id3v2(3, [
      id3Frame('TIT2', textData(1, utf16le('大きな曲'))),
      id3Frame('GEOB', new Uint8Array(500000)), // 関係のない大きなフレーム
      id3Frame('APIC', apicData('image/png', 4, fakePng(400000))), // 裏ジャケット（読まなくてよい）
      id3Frame('APIC', apicData('image/jpeg', 3, cover)),
      id3Frame('TALB', textData(0, 'Album')),
    ], 0, 2048);
    const audio = mp3Frames(48000); // 約 20MB
    const { tags, blob } = await track([tag, audio, id3v1({ title: 'v1', artist: 'V1 Artist', genre: 13 })], 'big.mp3');
    assert.deepEqual(rest(tags), { container: 'mp3', codec: 'mp3', title: '大きな曲', artist: 'V1 Artist', album: 'Album', genre: 'Pop' });
    near(tags.duration, (audio.length * 8) / 128000, 0.01);
    sameBytes(tags.picture.data, cover);
    assert.ok(blob.totalBytes < MB + cover.length, `読んだ量 ${blob.totalBytes}`);
    assert.ok(blob.readCount <= 8, `読んだ回数 ${blob.readCount}`);
    // 音声のまんなかは、まったく読んでいない
    assert.equal(blob.bytesInside(tag.length + 200000, tag.length + audio.length - 200000), 0);
  });

  it('FLAC: PADDING（5MB）と音声（20MB）は読まない', async () => {
    const cover = fakeJpeg(300000);
    const head = bytes('fLaC', flacBlock(0, flacStreamInfo(44100, 44100 * 200)));
    const padding = flacBlock(1, new Uint8Array(5 * MB));
    const tail = bytes(flacBlock(4, vorbisComments(['TITLE=Flac Big', 'ARTIST=A'])), flacBlock(6, flacPicture(3, 'image/jpeg', cover), true));
    const { tags, blob } = await track([head, padding, tail, filler], 'big.flac');
    assert.equal(tags.title, 'Flac Big');
    near(tags.duration, 200, 0.001);
    sameBytes(tags.picture.data, cover);
    assert.ok(blob.totalBytes < MB + cover.length, `読んだ量 ${blob.totalBytes}`);
    assert.equal(blob.bytesInside(head.length + 100000, head.length + padding.length - 100000), 0, 'PADDING の中身');
    const audioStart = head.length + padding.length + tail.length;
    assert.equal(blob.bytesInside(audioStart + 100000, audioStart + BIG), 0, '音声の中身');
  });

  it('WAV / AIFF: 20MB の音声のうしろにあるタグまで飛んで読む', async () => {
    const fmt = bytes('fmt ', u32le(16), u16le(1), u16le(2), u32le(44100), u32le(176400), u16le(4), u16le(16));
    const info = bytes('LIST', u32le(4 + 8 + 10), 'INFO', 'INAM', u32le(10), 'Wav Title', 0);
    const wav = await track([bytes('RIFF', u32le(4 + fmt.length + 8 + BIG + info.length), 'WAVE'), fmt, bytes('data', u32le(BIG)), filler, info], 'big.wav');
    assert.equal(wav.tags.title, 'Wav Title');
    near(wav.tags.duration, BIG / 176400, 0.001);
    assert.ok(wav.blob.totalBytes < 200 * 1024, `WAV: 読んだ量 ${wav.blob.totalBytes}`);

    const id3 = id3v2(3, [id3Frame('TIT2', textData(0, 'Aiff Big'))]);
    const comm = bytes('COMM', u32be(18), u16be(2), u32be(BIG / 4), u16be(16), 0x40, 0x0e, 0xac, 0x44, 0, 0, 0, 0, 0, 0);
    const aiff = await track([bytes('FORM', u32be(4 + comm.length + 8 + BIG + 8 + id3.length), 'AIFF'), comm, bytes('SSND', u32be(BIG)), filler, bytes('ID3 ', u32be(id3.length)), id3], 'big.aiff');
    assert.equal(aiff.tags.title, 'Aiff Big');
    near(aiff.tags.duration, BIG / 4 / 44100, 0.001);
    assert.ok(aiff.blob.totalBytes < 200 * 1024, `AIFF: 読んだ量 ${aiff.blob.totalBytes}`);
  });

  it('OGG: 先頭のヘッダと、末尾の 64KB ほどしか読まない', async () => {
    const serial = 42;
    const head = bytes(
      oggPages(serial, [{ data: vorbisIdent(44100), flush: true }]),
      oggPages(serial, [{ data: bytes(0x03, 'vorbis', vorbisComments(['TITLE=Ogg Big']), 1), flush: true }], { startSeq: 1 }),
    );
    const last = oggPages(serial, [{ data: randomBytes(3000), granule: 44100 * 600, flush: true }], { startSeq: 2, eos: true });
    const { tags, blob } = await track([head, filler, last], 'big.ogg');
    assert.equal(tags.title, 'Ogg Big');
    near(tags.duration, 600, 0.001);
    assert.ok(blob.totalBytes < 200 * 1024, `読んだ量 ${blob.totalBytes}`);
    assert.ok(blob.readCount <= 3, `読んだ回数 ${blob.readCount}`);
  });

  it('小さなファイルは1回で読み終える', async () => {
    for (const name of ['a1-natsu.mp3', 'a3-yuuyake.flac', 'b1-umi.m4a', 'b2-seaside.ogg', 'wav-info.wav', 'aiff-id3.aiff']) {
      const blob = new TrackingBlob(fixtureBlob(name));
      await parseTags(blob, name);
      assert.equal(blob.readCount, 1, name);
      assert.ok(blob.totalBytes <= blob.size, name);
    }
  });
});

// ============================================================
// 5. ファイル名から題名・曲番号を推しはかる
// ============================================================

describe('parseFileName', () => {
  it('曲番号つきの名前', () => {
    assert.deepEqual(parseFileName('01 Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('01. Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('01 - Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('01-Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('01_Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('01.Title.mp3'), { title: 'Title', track: 1 });
    assert.deepEqual(parseFileName('[03] Title.flac'), { title: 'Title', track: 3 });
    assert.deepEqual(parseFileName('(03) Title.flac'), { title: 'Title', track: 3 });
    assert.deepEqual(parseFileName('7. Title.m4a'), { title: 'Title', track: 7 });
    assert.deepEqual(parseFileName('12 Title With Spaces.ogg'), { title: 'Title With Spaces', track: 12 });
    assert.deepEqual(parseFileName('007 James.mp3'), { title: 'James', track: 7 });
    assert.deepEqual(parseFileName('07 たぐなしの曲.wav'), { title: 'たぐなしの曲', track: 7 });
    assert.deepEqual(parseFileName('01夏のはじまり.mp3'), { title: '夏のはじまり', track: 1 });
    assert.deepEqual(parseFileName('02　全角の空白.mp3'), { title: '全角の空白', track: 2 });
  });

  it('ディスク-トラック', () => {
    assert.deepEqual(parseFileName('1-01 Title.mp3'), { title: 'Title', track: 1, disc: 1 });
    assert.deepEqual(parseFileName('2-13 - Title.m4a'), { title: 'Title', track: 13, disc: 2 });
    assert.deepEqual(parseFileName('2-05. Title.m4a'), { title: 'Title', track: 5, disc: 2 });
    assert.deepEqual(parseFileName('Artist - Album - 2-03 - Title.flac'), { title: 'Title', track: 3, disc: 2, artist: 'Artist', album: 'Album' });
  });

  it('アーティスト - 題名', () => {
    assert.deepEqual(parseFileName('Artist - Title.mp3'), { title: 'Title', artist: 'Artist' });
    assert.deepEqual(parseFileName('Artist - Album - 03 - Title.flac'), { title: 'Title', track: 3, artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('Artist - 03 - Title.flac'), { title: 'Title', track: 3, artist: 'Artist' });
    assert.deepEqual(parseFileName('Artist - Album - Title.mp3'), { title: 'Title', artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('03 - Artist - Title.mp3'), { title: 'Title', track: 3, artist: 'Artist' });
    assert.deepEqual(parseFileName('03 Artist - Title.mp3'), { title: 'Title', track: 3, artist: 'Artist' });
    assert.deepEqual(parseFileName('牧場バンド – 夏のはじまり.mp3'), { title: '夏のはじまり', artist: '牧場バンド' });
    assert.deepEqual(parseFileName('01_Some_Artist_-_Some_Title.mp3'), { title: 'Some Title', track: 1, artist: 'Some Artist' });
    assert.deepEqual(parseFileName('AC-DC - Back In Black.mp3'), { title: 'Back In Black', artist: 'AC-DC' });
    assert.deepEqual(parseFileName('Artist - Title - Live - 2001.mp3'), { title: 'Live - 2001', artist: 'Artist', album: 'Title' });
  });

  it('数字だけ・数字で始まる題名をこわさない', () => {
    assert.deepEqual(parseFileName('1999.mp3'), { title: '1999' });
    assert.deepEqual(parseFileName('01.mp3'), { title: '01' });
    assert.deepEqual(parseFileName('7.flac'), { title: '7' });
    assert.deepEqual(parseFileName('7 Years.mp3'), { title: '7 Years' });
    assert.deepEqual(parseFileName('100 Years.mp3'), { title: '100 Years' });
    assert.deepEqual(parseFileName('1979 Remastered.mp3'), { title: '1979 Remastered' });
    assert.deepEqual(parseFileName('3月9日.mp3'), { title: '3月9日' });
    assert.deepEqual(parseFileName('15の夜.mp3'), { title: '15の夜' });
    assert.deepEqual(parseFileName('100万回のI love you.m4a'), { title: '100万回のI love you' });
    assert.deepEqual(parseFileName('19-2000.mp3'), { title: '19-2000' });
    assert.deepEqual(parseFileName('3.14.mp3'), { title: '3.14' });
    assert.deepEqual(parseFileName('24K Magic.mp3'), { title: '24K Magic' });
    assert.deepEqual(parseFileName('1999 - Prince.mp3'), { title: 'Prince', artist: '1999' });
    assert.deepEqual(parseFileName('00 Intro.mp3'), { title: 'Intro' });
  });

  it('フォルダつきのパスから artist / album を補う', () => {
    assert.deepEqual(parseFileName('01 Title.mp3', 'Artist/Album/01 Title.mp3'), { title: 'Title', track: 1, artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('01 Title.mp3', 'Music/Artist/Album/01 Title.mp3'), { title: 'Title', track: 1, artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('Title.mp3', 'Album/Title.mp3'), { title: 'Title', album: 'Album' });
    assert.deepEqual(parseFileName('Title.mp3', 'Title.mp3'), { title: 'Title' });
    assert.deepEqual(parseFileName('Title.mp3', ''), { title: 'Title' });
    assert.deepEqual(parseFileName('03 Title.flac', 'Artist/Album/Disc 2/03 Title.flac'), { title: 'Title', track: 3, disc: 2, artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('03 Title.flac', 'Artist\\Album\\CD1\\03 Title.flac'), { title: 'Title', track: 3, disc: 1, artist: 'Artist', album: 'Album' });
    // フォルダつきの名前を fileName にそのまま渡してもよい
    assert.deepEqual(parseFileName('Artist/Album/01 Title.mp3'), { title: 'Title', track: 1, artist: 'Artist', album: 'Album' });
    // フォルダだけのパスでもよい
    assert.deepEqual(parseFileName('01 Title.mp3', 'Artist/Album'), { title: 'Title', track: 1, artist: 'Artist', album: 'Album' });
    // ファイル名に書いてあるほうを優先
    assert.deepEqual(parseFileName('Real Artist - Real Album - 02 - Title.mp3', 'Folder A/Folder B/x.mp3'), { title: 'Title', track: 2, artist: 'Real Artist', album: 'Real Album' });
    // フォルダでアーティストが分かっているときは、題名の中の " - " で分けない
    assert.deepEqual(parseFileName('05 Title - Live.mp3', 'Artist/Album/05 Title - Live.mp3'), { title: 'Title - Live', track: 5, artist: 'Artist', album: 'Album' });
    assert.deepEqual(parseFileName('05 Artist - Title.mp3', 'Artist/Album/05 Artist - Title.mp3'), { title: 'Title', track: 5, artist: 'Artist', album: 'Album' });
  });

  it('拡張子・濁点の正規化・変わった入力', () => {
    assert.deepEqual(parseFileName('Song.v2.FLAC'), { title: 'Song.v2' });
    assert.deepEqual(parseFileName('No Extension'), { title: 'No Extension' });
    assert.deepEqual(parseFileName('Mr. Big.mp3'), { title: 'Mr. Big' });
    assert.deepEqual(parseFileName('.mp3'), { title: '.mp3' });
    assert.deepEqual(parseFileName(''), { title: '' });
    assert.deepEqual(parseFileName(undefined), { title: '' });
    assert.deepEqual(parseFileName(null, null), { title: '' });
    // macOS のファイル名は濁点が分かれている（NFD）ことがある → くっつける（NFC）
    const nfd = '01 がぎぐげご.mp3'.normalize('NFD');
    assert.notEqual(nfd, '01 がぎぐげご.mp3');
    assert.deepEqual(parseFileName(nfd, ('ばんど/あるばむ/' + '01 がぎぐげご.mp3').normalize('NFD')), { title: 'がぎぐげご', track: 1, artist: 'ばんど', album: 'あるばむ' });
  });
});

// ============================================================
// 6. 拡張子と MIME
// ============================================================

describe('guessMime / isAudioFile / AUDIO_EXTENSIONS', () => {
  it('guessMime', () => {
    assert.equal(guessMime('a.mp3', ''), 'audio/mpeg');
    assert.equal(guessMime('a.MP3', 'application/octet-stream'), 'audio/mpeg');
    assert.equal(guessMime('a.m4a', 'audio/x-m4a'), 'audio/mp4');
    assert.equal(guessMime('a.m4b'), 'audio/mp4');
    assert.equal(guessMime('a.mp4', 'video/mp4'), 'audio/mp4');
    assert.equal(guessMime('a.flac'), 'audio/flac');
    assert.equal(guessMime('a.ogg'), 'audio/ogg');
    assert.equal(guessMime('a.oga'), 'audio/ogg');
    assert.equal(guessMime('a.opus'), 'audio/ogg');
    assert.equal(guessMime('a.wav'), 'audio/wav');
    assert.equal(guessMime('a.wave'), 'audio/wav');
    assert.equal(guessMime('a.aif'), 'audio/aiff');
    assert.equal(guessMime('a.aiff'), 'audio/aiff');
    assert.equal(guessMime('a.aifc'), 'audio/aiff');
    assert.equal(guessMime('a.aac'), 'audio/aac');
    assert.equal(guessMime('a.caf'), 'audio/x-caf');
    assert.equal(guessMime('dir.with.dots/a.b.c.FLAC'), 'audio/flac');
    assert.equal(guessMime('a.xyz', 'audio/x-something'), 'audio/x-something');
    assert.equal(guessMime('a.xyz'), '');
    assert.equal(guessMime('noext', ''), '');
    assert.equal(guessMime('', undefined), '');
    assert.equal(guessMime(undefined, null), '');
  });

  it('AUDIO_EXTENSIONS のすべてに MIME があり、isAudioFile が true', () => {
    for (const ext of ['mp3', 'm4a', 'm4b', 'mp4', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'wave', 'aif', 'aiff', 'aifc', 'caf']) {
      assert.ok(AUDIO_EXTENSIONS.includes(ext), ext);
    }
    assert.equal(new Set(AUDIO_EXTENSIONS).size, AUDIO_EXTENSIONS.length, '重複なし');
    for (const ext of AUDIO_EXTENSIONS) {
      assert.equal(ext, ext.toLowerCase());
      assert.ok(guessMime('x.' + ext).startsWith('audio/'), ext);
      assert.equal(isAudioFile('x.' + ext, ''), true, ext);
      assert.equal(isAudioFile('X.' + ext.toUpperCase()), true, ext);
    }
  });

  it('isAudioFile', () => {
    assert.equal(isAudioFile('song.mp3', 'audio/mpeg'), true);
    assert.equal(isAudioFile('song.mp3', ''), true);
    assert.equal(isAudioFile('Artist/Album/song.flac'), true);
    assert.equal(isAudioFile('cover.jpg', 'image/jpeg'), false);
    assert.equal(isAudioFile('notes.txt', 'text/plain'), false);
    assert.equal(isAudioFile('noext', 'audio/mpeg'), true);
    assert.equal(isAudioFile('noext', ''), false);
    assert.equal(isAudioFile('strange.xyz', 'audio/x-whatever'), true);
    assert.equal(isAudioFile('list.m3u', 'audio/x-mpegurl'), false);
    assert.equal(isAudioFile('list.m3u8', 'audio/mpegurl'), false);
    assert.equal(isAudioFile('noext', 'audio/x-mpegurl'), false);
    assert.equal(isAudioFile('song.mid', 'audio/midi'), false);
    assert.equal(isAudioFile('._song.mp3', 'audio/mpeg'), false, 'macOS の付属ファイル');
    assert.equal(isAudioFile('Album/._song.mp3'), false);
    assert.equal(isAudioFile('.DS_Store', ''), false);
    assert.equal(isAudioFile('movie.mkv', 'video/x-matroska'), false);
    assert.equal(isAudioFile('', ''), false);
    assert.equal(isAudioFile(undefined, undefined), false);
  });
});
