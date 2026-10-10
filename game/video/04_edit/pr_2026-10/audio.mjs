import { chromium } from '/home/user/-/game/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2];
const jobs = JSON.parse(process.argv[3]);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:5173/src/audio/qa/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__audioQaReady, null, { timeout: 60000 });
for (const j of jobs) {
  const b64 = await page.evaluate(async (j) => {
    const rep = await import('/src/audio/report.ts');
    const chime = await import('/src/audio/chime.ts');
    let r;
    if (j.song) r = await rep.renderSong(j.song, j.sec, { params: j.params ?? {} });
    else if (j.chime) r = await rep.render(j.sec, () => { chime.playChimeMotif({ notes: j.chime, cut: false }); });
    else if (j.sfx) r = await rep.renderSfx(j.sfx, {}, j.sec);
    else if (j.amb) r = await rep.renderAmbient(j.amb, j.sec, 0);
    const b = r.buffer, n = b.length, ch = [b.getChannelData(0), b.getChannelData(1)];
    const buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, b.sampleRate, true); v.setUint32(28, b.sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const s = Math.max(-1, Math.min(1, ch[c][i])); v.setInt16(o, s * 32767, true); o += 2; }
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(bin);
  }, j);
  fs.writeFileSync(`${out}/${j.name}.wav`, Buffer.from(b64, 'base64'));
  console.log('wrote', j.name);
}
await browser.close();
