// 見本の曲。
// 「まず動くところを見たい」ときのために、短い曲とジャケットをこの場で作ります
// （どこからも取ってこないので、通信なしでも作れます）。
// できあがるのは、題名・アーティスト・アルバム・ジャケットのタグが入った、ふつうの WAV ファイルです。
// ふだんの取り込みと同じ道を通して入れるので、あとで消すのも、ふつうの曲と同じです。

const RATE = 22050;

// 見本のアルバム2枚（2曲ずつ）。notes は [音の高さ（MIDI の番号）, 長さ（拍）] のならび。0 は休み
const ALBUMS = [
  {
    album: 'あさの牧場',
    artist: '見本の楽団',
    year: 2024,
    colors: ['#8fd3f4', '#3f7fd9', '#fdf6c3'],
    tracks: [
      {
        title: 'あさのチャイム',
        tempo: 96,
        notes: [[72, 1], [76, 1], [79, 1], [84, 2], [79, 1], [76, 1], [72, 2], [74, 1], [77, 1], [81, 1], [86, 2], [81, 1], [77, 1], [74, 2], [72, 1], [76, 1], [79, 1], [84, 3]],
      },
      {
        title: 'ひるのさんぽ',
        tempo: 120,
        notes: [[67, 1], [69, 1], [71, 1], [74, 1], [71, 1], [69, 1], [67, 2], [69, 1], [71, 1], [74, 1], [76, 1], [74, 1], [71, 1], [69, 2], [67, 1], [71, 1], [74, 1], [79, 1], [76, 1], [74, 1], [71, 1], [67, 3]],
      },
    ],
  },
  {
    album: 'ゆうぐれの丘',
    artist: '見本の楽団',
    year: 2025,
    colors: ['#f7c948', '#e8552d', '#5b2a6e'],
    tracks: [
      {
        title: 'ゆうやけこみち',
        tempo: 76,
        notes: [[69, 2], [72, 1], [76, 2], [74, 1], [72, 2], [69, 1], [67, 3], [69, 2], [72, 1], [77, 2], [76, 1], [74, 2], [72, 1], [69, 4]],
      },
      {
        title: 'ほしのこもりうた',
        tempo: 66,
        notes: [[76, 2], [74, 1], [72, 2], [69, 1], [72, 2], [74, 1], [76, 3], [79, 2], [76, 1], [74, 2], [72, 1], [69, 2], [67, 1], [69, 4]],
      },
    ],
  },
];

// ── 音を作る ─────────────────────────────────────────────

// やわらかい鐘のような音（基音と倍音を重ね、だんだん消える）
function synth(notes, tempo) {
  const beat = 60 / tempo;
  const total = notes.reduce((sum, n) => sum + n[1], 0) * beat + 2.2;
  const out = new Float32Array(Math.ceil(total * RATE));
  let t = 0.15;
  for (const [midi, beats] of notes) {
    if (midi > 0) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const start = Math.floor(t * RATE);
      const len = Math.min(out.length - start, Math.floor(2.0 * RATE));
      for (let i = 0; i < len; i++) {
        const s = i / RATE;
        const env = Math.min(1, s * 220) * Math.exp(-s * 2.6);
        const w = 2 * Math.PI * f * s;
        out[start + i] += env * (0.52 * Math.sin(w) + 0.2 * Math.sin(2 * w) + 0.08 * Math.sin(3 * w + 0.5))
          // 低い音をそっと添える
          + Math.min(1, s * 60) * Math.exp(-s * 1.6) * 0.14 * Math.sin(w / 2);
      }
    }
    t += beats * beat;
  }
  // 大きすぎるところをなだらかにおさえる
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const pcm = new Int16Array(out.length);
  for (let i = 0; i < out.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767);
  return pcm;
}

// ── ジャケットを描く ─────────────────────────────────────

function drawCover(colors, seed) {
  const size = 600;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, colors[0]);
  sky.addColorStop(1, colors[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, size, size);
  // 太陽（または月）
  g.fillStyle = colors[2];
  g.globalAlpha = 0.92;
  g.beginPath();
  g.arc(seed ? 430 : 170, seed ? 250 : 190, seed ? 86 : 70, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  // 丘を3枚、奥から手前へ
  const hills = seed
    ? [['rgba(60,20,70,.55)', 420, 70], ['rgba(40,14,52,.8)', 480, 46], ['rgba(24,8,34,.95)', 540, 30]]
    : [['rgba(46,125,50,.55)', 410, 60], ['rgba(56,142,60,.85)', 470, 44], ['rgba(27,94,32,.95)', 535, 28]];
  hills.forEach(([color, base, amp], k) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, size);
    for (let x = 0; x <= size; x += 10) {
      g.lineTo(x, base - amp * Math.sin((x / size) * Math.PI * (1.2 + k * 0.5) + k * 1.7 + seed));
    }
    g.lineTo(size, size);
    g.closePath();
    g.fill();
  });
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      const bytes = blob ? new Uint8Array(await blob.arrayBuffer()) : null;
      canvas.width = 0;
      canvas.height = 0;
      resolve(bytes);
    }, 'image/jpeg', 0.86);
  });
}

// ── タグつきの WAV ファイルに組み立てる ──────────────────

function ascii(s) {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function u32be(n) { return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); }
function u32le(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
function u16le(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }

// 文字のフレーム（UTF-16・BOM つき）
function textFrame(id, text) {
  const body = new Uint8Array(3 + text.length * 2);
  body[0] = 1;
  body[1] = 0xff;
  body[2] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    body[3 + i * 2] = c & 255;
    body[4 + i * 2] = c >> 8;
  }
  return concat([ascii(id), u32be(body.length), new Uint8Array(2), body]);
}

function pictureFrame(jpeg) {
  const body = concat([new Uint8Array([0]), ascii('image/jpeg'), new Uint8Array([0, 3, 0]), jpeg]);
  return concat([ascii('APIC'), u32be(body.length), new Uint8Array(2), body]);
}

function id3Tag(info, jpeg) {
  const frames = [
    textFrame('TIT2', info.title),
    textFrame('TPE1', info.artist),
    textFrame('TALB', info.album),
    textFrame('TRCK', `${info.track}/${info.total}`),
    textFrame('TYER', String(info.year)),
    textFrame('TCON', '見本'),
  ];
  if (jpeg) frames.push(pictureFrame(jpeg));
  const body = concat(frames);
  const n = body.length;
  const size = new Uint8Array([(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127]);
  return concat([ascii('ID3'), new Uint8Array([3, 0, 0]), size, body]);
}

function wavFile(pcm, tag, name) {
  const data = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const pad = (b) => (b.length % 2 ? concat([b, new Uint8Array(1)]) : b);
  const fmt = concat([
    ascii('fmt '), u32le(16), u16le(1), u16le(1), u32le(RATE), u32le(RATE * 2), u16le(2), u16le(16),
  ]);
  const chunks = concat([
    fmt,
    ascii('data'), u32le(data.length), pad(data),
    ascii('id3 '), u32le(tag.length), pad(tag),
  ]);
  const bytes = concat([ascii('RIFF'), u32le(4 + chunks.length), ascii('WAVE'), chunks]);
  return new File([bytes], name, { type: 'audio/wav', lastModified: 1700000000000 });
}

// 見本の曲のファイル（File のならび）を作る
export async function makeDemoFiles() {
  const files = [];
  for (let a = 0; a < ALBUMS.length; a++) {
    const al = ALBUMS[a];
    const jpeg = await drawCover(al.colors, a);
    al.tracks.forEach((tr, i) => {
      const tag = id3Tag({ title: tr.title, artist: al.artist, album: al.album, track: i + 1, total: al.tracks.length, year: al.year }, jpeg);
      files.push(wavFile(synth(tr.notes, tr.tempo), tag, `見本 ${a + 1}-${i + 1} ${tr.title}.wav`));
    });
  }
  return files;
}
