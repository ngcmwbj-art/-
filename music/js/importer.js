// 曲の取り込み。
// 選んだファイルを1つずつ、タグを読む → ジャケットを保存 → 本体を保存、の順に入れます。
// ファイル全体をメモリに読むことはしません（タグの部分だけ読みます）。

import { parseTags, guessMime, parseFileName, isAudioFile } from './tags.js';
import { isQuotaError, requestPersist } from './db.js';

// 入れ物（コンテナ）ごとの、ブラウザに「鳴らせる？」と聞くときの種類の書き方
const PROBE_TYPES = {
  mp3: ['audio/mpeg'],
  mp4: ['audio/mp4', 'audio/x-m4a', 'audio/aac'],
  aac: ['audio/aac', 'audio/aacp', 'audio/mp4'],
  flac: ['audio/flac', 'audio/x-flac'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  aiff: ['audio/aiff', 'audio/x-aiff'],
};

const CONTAINER_MIME = {
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  aiff: 'audio/aiff',
};

const playableCache = new Map();   // 'ogg/opus' など → true / false

// この端末で鳴らせる形式かどうか
async function canPlay(audio, file, container, codec, mime) {
  const key = `${container}/${codec || ''}/${container === 'unknown' ? mime : ''}`;
  if (playableCache.has(key)) return playableCache.get(key);
  let types = PROBE_TYPES[container];
  if (container === 'ogg') {
    types = codec === 'opus'
      ? ['audio/ogg; codecs="opus"', 'audio/opus']
      : codec === 'flac' ? ['audio/ogg; codecs="flac"'] : ['audio/ogg; codecs="vorbis"'];
  }
  if (!types) types = mime ? [mime] : [];
  let ok = false;
  for (const t of types) {
    try { if (audio.canPlayType(t)) { ok = true; break; } } catch (_) { /* 何もしない */ }
  }
  if (!ok) {
    // 「鳴らせない」と答えても実際は鳴ることがあるので、本当に読み込ませて確かめる
    ok = await probeByLoading(file, mime);
  }
  playableCache.set(key, ok);
  return ok;
}

function probeByLoading(file, mime) {
  return new Promise((resolve) => {
    const a = document.createElement('audio');
    const url = URL.createObjectURL(mime && file.type !== mime ? file.slice(0, file.size, mime) : file);
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      a.removeAttribute('src');
      try { a.load(); } catch (_) { /* 何もしない */ }
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    // 返事が来ない端末（操作なしでは読み込まない iPhone など）では、入れておくほうを選ぶ
    const timer = setTimeout(() => finish(true), 2500);
    a.addEventListener('loadedmetadata', () => finish(true));
    a.addEventListener('error', () => finish(false));
    a.preload = 'metadata';
    a.src = url;
    try { a.load(); } catch (_) { /* 何もしない */ }
  });
}

const collator = (() => {
  try { return new Intl.Collator('ja', { numeric: true }); } catch (_) { return null; }
})();

// files: File のならび（FileList でもよい）
// ctx: { db, library, art, audio, onProgress(done, total, name), isCancelled() }
// 返すもの: { added, duplicates, unsupported: [名前], failed: [名前], notAudio, quota, cancelled }
export async function importFiles(files, ctx) {
  const { db, library, art, audio } = ctx;
  const list = Array.from(files);
  const pathOf = (f) => f.webkitRelativePath || f.name;
  if (collator) list.sort((a, b) => collator.compare(pathOf(a), pathOf(b)));

  const result = {
    added: 0, duplicates: 0, unsupported: [], failed: [], notAudio: 0, quota: false, cancelled: false,
  };
  const total = list.length;
  const now = Date.now();
  let lastNotify = Date.now();

  for (let i = 0; i < total; i++) {
    if (ctx.isCancelled && ctx.isCancelled()) { result.cancelled = true; break; }
    const file = list[i];
    if (ctx.onProgress) ctx.onProgress(i, total, file.name);

    if (!isAudioFile(file.name, file.type)) { result.notAudio++; continue; }
    if (!file.size) { result.failed.push(file.name); continue; }
    const sig = `${file.name}|${file.size}`;
    if (library.hasSig(sig)) { result.duplicates++; continue; }

    try {
      const tags = await parseTags(file, file.name);
      const container = tags.container || 'unknown';
      const mime = CONTAINER_MIME[container] || guessMime(file.name, file.type) || file.type || '';

      if (!(await canPlay(audio, file, container, tags.codec, mime))) {
        result.unsupported.push(file.name);
        continue;
      }

      const fromName = parseFileName(file.name, file.webkitRelativePath || '');
      const artId = tags.picture ? await art.save(tags.picture) : null;

      const track = {
        title: tags.title || fromName.title || file.name,
        artist: tags.artist || fromName.artist || '',
        album: tags.album || fromName.album || '',
        albumArtist: tags.albumArtist || '',
        genre: tags.genre || '',
        composer: tags.composer || '',
        year: tags.year || 0,
        track: tags.track || fromName.track || 0,
        trackTotal: tags.trackTotal || 0,
        disc: tags.disc || 0,
        discTotal: tags.discTotal || 0,
        compilation: !!tags.compilation,
        sortTitle: tags.sortTitle || '',
        sortArtist: tags.sortArtist || '',
        sortAlbum: tags.sortAlbum || '',
        sortAlbumArtist: tags.sortAlbumArtist || '',
        duration: tags.duration || 0,
        artId,
        hasLyrics: !!tags.lyrics,
        container,
        codec: tags.codec || '',
        fileName: file.name,
        size: file.size,
        mime,
        sig,
        addedAt: now + i,
        playCount: 0,
        lastPlayed: 0,
      };

      // 種類（MIME）を付けた Blob として保存する。slice は中身を写さないので速い
      const body = mime && file.type !== mime ? file.slice(0, file.size, mime) : file;
      const id = await db.addTrack(track, body, tags.lyrics || '');
      track.id = id;
      library.add(track);
      result.added++;
    } catch (err) {
      if (isQuotaError(err)) { result.quota = true; break; }
      result.failed.push(file.name);
    }

    // 長い取り込みの間も、ときどき一覧を新しくする
    if (Date.now() - lastNotify > 1500) {
      lastNotify = Date.now();
      library.notify();
    }
  }

  if (ctx.onProgress) ctx.onProgress(total, total, '');
  if (result.added) {
    library.notify();
    requestPersist();
  }
  return result;
}

// 取り込みの結果を、ひとことの文にする
export function summarize(result) {
  const lines = [];
  if (result.added) lines.push(`${result.added}曲を追加しました。`);
  else if (!result.quota && !result.cancelled) lines.push('追加した曲はありません。');
  if (result.cancelled) lines.push('途中で中止しました。');
  if (result.duplicates) lines.push(`すでに入っている ${result.duplicates}曲はとばしました。`);
  if (result.unsupported.length) {
    lines.push(`この端末で再生できない形式のため、${result.unsupported.length}件を入れませんでした（${sample(result.unsupported)}）。`);
  }
  if (result.notAudio) lines.push(`音楽ではないファイル ${result.notAudio}件はとばしました。`);
  if (result.failed.length) lines.push(`読み込めなかったファイルが ${result.failed.length}件ありました（${sample(result.failed)}）。`);
  if (result.quota) lines.push('保存できる容量がいっぱいになったため、途中で止めました。いらない曲を消すか、端末の空きを増やしてください。');
  return lines.join('\n');
}

function sample(names) {
  const head = names.slice(0, 2).join('、');
  return names.length > 2 ? `${head} ほか` : head;
}
