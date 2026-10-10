// HUD：ステータス・ミニマップ・拍インジケーター・トースト・体力バー
import * as THREE from 'three';
import { FIELDS, coastX, BOUNDS, LIGHTHOUSE, HOUSE } from './world.js';
import { TOWER_TYPES } from './towers.js';
import { BEAT } from './audio.js';
const WAVES_NAME = (game) => game.waveName();

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      wave: $('hud-wave'), phase: $('hud-phase'), timer: $('hud-timer'), windv: $('hud-wind'), windbar: $('hud-windbar'),
      cab: $('hud-cab'), cabbar: $('hud-cabbar'), q: $('hud-q'), solo: $('hud-solo'), soloLabel: $('hud-solo-label'),
      beat: $('hud-beat'), toasts: $('toasts'), bars: $('bars'), hotbar: $('hotbar'), judge: $('judge'),
      cdR: $('cd-r'), cdF: $('cd-f'), floaters: $('floaters'), hint: $('hud-hint'),
    };
    this.map = $('minimap');
    this.mctx = this.map.getContext('2d');
    this.barEls = new Map();
    TOWER_TYPES.forEach((t) => {
      const d = document.createElement('div');
      d.className = 'slot'; d.dataset.id = t.id;
      d.innerHTML = `<span class="k">${t.key}</span><b>${t.name}</b><small>${t.short}</small><span class="c">${t.cost}Q</span><i style="background:${t.color}"></i>`;
      d.title = t.desc;
      this.el.hotbar.appendChild(d);
    });
    this.lastToast = '';
    this.el.banner = $('banner'); this.el.obj = $('objective'); this.el.comboEl = $('combo');
    this.el.lane = $('lane'); this.el.arrows = $('arrows'); this.el.bossbar = $('bossbar');
    // 拍のレーン：右から流れてくる音符
    this.laneNotes = [];
    for (let i = 0; i < 6; i++) { const n = document.createElement('i'); n.className = 'lnote'; n.textContent = '♪'; this.el.lane.appendChild(n); this.laneNotes.push(n); }
    this.arrowEls = [];
    this.mapBg = this.renderMapBg();
  }

  renderMapBg() {
    const S = 200, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    // 山（外側）→ 台地 → 東の海
    g.fillStyle = '#2c4a26'; g.fillRect(0, 0, S, S);
    const [x0, z0] = this.toMap(BOUNDS.xMin, BOUNDS.zMin), [, z1] = this.toMap(0, BOUNDS.zMax);
    g.fillStyle = '#4c7a36';
    g.fillRect(x0, z0, S, z1 - z0);
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const z = -230 + i / 64 * 460;
      const [mx, my] = this.toMap(coastX(z), z);
      i ? g.lineTo(mx, my) : g.moveTo(mx, my);
    }
    g.lineTo(S, S); g.lineTo(S, 0); g.closePath();
    g.fillStyle = '#0d2630'; g.fill();
    g.strokeStyle = '#c8b48a'; g.lineWidth = 1.5; g.stroke();
    return c;
  }
  mapScale() { return 100 / 210; }
  toMap(x, z) { const s = this.mapScale(); return [100 + x * s, 100 + z * s]; }

  setHotbar(selected, q) {
    for (const s of this.el.hotbar.children) {
      const def = TOWER_TYPES.find((t) => t.id === s.dataset.id);
      s.classList.toggle('sel', s.dataset.id === selected);
      s.classList.toggle('poor', q < def.cost);
    }
  }

  toast(msg, kind = '') {
    if (!msg || msg === this.lastToast) return;
    this.lastToast = msg;
    setTimeout(() => { if (this.lastToast === msg) this.lastToast = ''; }, 1500);
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = msg;
    this.el.toasts.prepend(d);
    while (this.el.toasts.children.length > 4) this.el.toasts.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3200);
  }

  // 画面中央の大きな見出し（台風接近・台風一過など）
  banner(title, sub) {
    const b = this.el.banner;
    b.innerHTML = `<h2>${title}</h2><p>${sub || ''}</p>`;
    b.className = '';
    void b.offsetWidth;
    b.className = 'show';
    clearTimeout(this._bt);
    this._bt = setTimeout(() => { b.className = ''; }, 3600);
  }

  // チュートリアルのミッション表示
  mission(i, n, text) {
    this.el.obj.className = 'mission';
    this.el.obj.innerHTML = `<span class="tag">練習ミッション ${i} / ${n}</span><b>${text}</b><em id="obj-progress"></em><small class="pc-only">［Enter］で練習を飛ばす</small>`;
    this.el.obj.hidden = false;
  }
  missionProgress(t) { const e = document.getElementById('obj-progress'); if (e) e.textContent = t; }

  // 通常時の目的表示
  objective(html, sub) {
    const o = this.el.obj;
    if (!html) { o.hidden = true; return; }
    const s = `<span class="tag">目的</span><b>${html}</b><em>${sub || ''}</em>`;
    if (o._last !== s) { o.innerHTML = s; o._last = s; }
    o.className = '';
    o.hidden = false;
  }

  combo(n, mult) {
    const c = this.el.comboEl;
    if (n < 2) { c.className = ''; return; }
    c.innerHTML = `<b>${n}</b><span>COMBO</span><em>ダメージ ×${mult.toFixed(1)}</em>`;
    c.className = '';
    void c.offsetWidth;
    c.className = 'show' + (n >= 10 ? ' hot' : '');
  }

  judge(text, kind) {
    const j = this.el.judge;
    j.textContent = text;
    j.className = 'show ' + kind;
    void j.offsetWidth;
    clearTimeout(this._jt);
    this._jt = setTimeout(() => { j.className = ''; }, 380);
  }

  floater(text, pos, camera, color = '#7ff3ff') {
    const v = pos.clone().project(camera);
    if (v.z > 1) return;
    const d = document.createElement('div');
    d.className = 'floater';
    d.textContent = text;
    d.style.color = color;
    d.style.left = ((v.x + 1) / 2 * innerWidth) + 'px';
    d.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    this.el.floaters.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }

  update(game) {
    const { el } = this;
    const w = game.weather, cab = game.cabbages;
    el.wave.textContent = game.waveLabel();
    el.phase.textContent = game.phaseLabel();
    el.timer.textContent = game.timerLabel();
    el.windv.textContent = `${w.windSpeed.toFixed(0)} m/s`;
    el.windbar.style.width = Math.min(100, w.windSpeed / 70 * 100) + '%';
    el.cab.textContent = `${cab.alive} / ${cab.total}`;
    const ratio = cab.alive / cab.total;
    el.cabbar.style.width = ratio * 100 + '%';
    el.cabbar.style.background = ratio > 0.6 ? '#8fd16a' : ratio > 0.4 ? '#f0c24a' : '#ff6a5a';
    el.q.textContent = Math.floor(game.q);
    el.solo.style.width = game.solo + '%';
    el.soloLabel.classList.toggle('ready', game.solo >= 100);
    this.setHotbar(game.buildSel, game.q);
    el.cdR.style.setProperty('--p', Math.max(0, game.cd.teleport / 3));
    el.cdF.style.setProperty('--p', Math.max(0, game.cd.observe / 4));

    // 拍インジケーター
    const b = game.audio.beatInfo();
    const k = 1 - b.frac;
    el.beat.style.setProperty('--k', k.toFixed(3));
    el.beat.classList.toggle('on', b.offset < 0.11);

    // 拍のレーン（音符が輪に重なった瞬間が JUST）
    const laneW = this.el.lane.clientWidth || 260;
    const now = b.idx + b.frac;
    this.laneNotes.forEach((n, i) => {
      const beatNo = Math.floor(now) + i;
      const dt = beatNo - now;
      const x = 28 + dt * (laneW - 40) / 4;
      n.style.transform = `translateX(${x}px) scale(${beatNo % 4 === 0 ? 1.25 : 1})`;
      n.style.opacity = dt < -0.15 ? 0 : 1;
    });
    this.el.lane.classList.toggle('on', b.offset < 0.11);

    // 画面外の竜巻の方向を示す矢印
    let ai = 0;
    const W = innerWidth, H = innerHeight;
    for (const t of game.threats.tornados) {
      if (!t.alive) continue;
      const p = t.pos.clone().add(new THREE.Vector3(0, 12, 0)).project(game.camera);
      const behind = p.z > 1;
      let x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H;
      if (behind) { x = W - x; y = H - y; }
      const onScreen = !behind && x > 40 && x < W - 40 && y > 40 && y < H - 40;
      if (onScreen) continue;
      const cx = W / 2, cy = H / 2;
      let dx = x - cx, dy = y - cy;
      if (behind && Math.abs(dy) < 1) dy = 1;
      const s = Math.min((W / 2 - 48) / Math.abs(dx || 1e-3), (H / 2 - 64) / Math.abs(dy || 1e-3));
      let el = this.arrowEls[ai];
      if (!el) { el = document.createElement('div'); el.className = 'arrow'; el.innerHTML = '<i></i><span></span>'; this.el.arrows.appendChild(el); this.arrowEls.push(el); }
      el.style.display = '';
      el.style.left = (cx + dx * s) + 'px';
      el.style.top = (cy + dy * s) + 'px';
      el.firstChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      el.className = 'arrow ' + (t.group.collapsed ? 'real' : 'ghost');
      el.lastChild.textContent = `${Math.round(t.pos.distanceTo(game.player.pos))}m`;
      ai++;
    }
    for (let i = ai; i < this.arrowEls.length; i++) this.arrowEls[i].style.display = 'none';

    // 大ボスの体力ゲージ（画面上部）
    const bb = this.el.bossbar, boss = game.threats.boss;
    if (boss && boss.members.some((m) => m.alive)) {
      const real = boss.members.find((m) => m.real);
      const known = boss.collapsed;
      bb.hidden = false;
      bb.querySelector('b').textContent = `${WAVES_NAME(game)}の目`;
      bb.querySelector('i').style.width = (known && real ? Math.max(0, real.hp / real.maxHp * 100) : 100) + '%';
      bb.classList.toggle('unknown', !known);
      bb.querySelector('em').textContent = known ? '' : '正体不明 ― 紫の分身を観測して本物を見つけよう';
    } else bb.hidden = true;

    // 竜巻の体力バー
    const seen = new Set();
    for (const t of game.threats.tornados) {
      if (!t.alive || !t.group.collapsed) continue;
      const p = t.pos.clone().add(new THREE.Vector3(0, 30, 0)).project(game.camera);
      const dist = t.pos.distanceTo(game.camera.position);
      if (p.z > 1 || dist > 260) continue;
      seen.add(t);
      let bar = this.barEls.get(t);
      if (!bar) {
        bar = document.createElement('div'); bar.className = 'hpbar'; bar.innerHTML = `<i></i><span>${t.group.mini ? 'つむじ風' : t.group.boss ? '台風の目' : '竜巻'}</span>`;
        el.bars.appendChild(bar); this.barEls.set(t, bar);
      }
      bar.style.left = ((p.x + 1) / 2 * innerWidth) + 'px';
      bar.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
      bar.firstChild.style.width = Math.max(0, t.hp / t.maxHp * 100) + '%';
    }
    for (const [t, bar] of this.barEls) if (!seen.has(t)) { bar.remove(); this.barEls.delete(t); }

    // ミニマップは 1 秒に 8 回だけ描き直す
    const nowMs = performance.now();
    if (nowMs - (this._mapAt || 0) > 125) { this._mapAt = nowMs; this.drawMap(game); }
  }

  drawMap(game) {
    const g = this.mctx, S = 200;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip();
    g.drawImage(this.mapBg, 0, 0);
    const s = this.mapScale();
    // 畑
    FIELDS.forEach((f, i) => {
      const ratio = game.cabbages.fieldAlive[i] / game.cabbages.fieldTotal[i];
      const [x, y] = this.toMap(f.x, f.z);
      g.save(); g.translate(x, y); g.rotate(f.rot);
      g.fillStyle = `rgba(${Math.round(255 - ratio * 120)},${Math.round(90 + ratio * 140)},90,0.9)`;
      g.fillRect(-f.w / 2 * s, -f.d / 2 * s, f.w * s, f.d * s);
      g.restore();
    });
    // 施設
    const dot = (x, z, c, r) => { const [a, b] = this.toMap(x, z); g.fillStyle = c; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); };
    dot(LIGHTHOUSE.x, LIGHTHOUSE.z, '#fff', 2.5);
    dot(HOUSE.x, HOUSE.z, '#e7dfcf', 2.5);
    for (const t of game.towers.list) dot(t.pos.x, t.pos.z, t.def.color, 3);
    // 落雷予告
    for (const st of game.threats.strikes) dot(st.pos.x, st.pos.z, '#ffd24a', 3);
    // 雑魚
    for (const m of game.threats.minions) dot(m.pos.x, m.pos.z, m.type === 'mushi' ? '#9fe05a' : '#222', 2);
    // 飛来物
    for (const d of game.threats.debris) dot(d.pos.x, d.pos.z, '#ccc', 1.6);
    // 竜巻
    const blink = (performance.now() / 200) % 2 < 1;
    for (const t of game.threats.tornados) {
      if (!t.alive) continue;
      if (t.group.collapsed) dot(t.pos.x, t.pos.z, '#ff4a3a', 4.5);
      else if (blink) dot(t.pos.x, t.pos.z, '#b48cff', 4);
    }
    // プレイヤー
    const p = game.player;
    const [px, py] = this.toMap(p.pos.x, p.pos.z);
    g.save(); g.translate(px, py); g.rotate(-p.camYaw + Math.PI);
    g.fillStyle = '#ffe66a'; g.beginPath(); g.moveTo(0, 6); g.lineTo(4, -4); g.lineTo(-4, -4); g.closePath(); g.fill();
    g.restore();
    // 風向
    const wd = game.weather.windDir;
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(170, 30); g.lineTo(170 + wd.x * 14, 30 + wd.y * 14); g.stroke();
    g.restore();
  }
}
