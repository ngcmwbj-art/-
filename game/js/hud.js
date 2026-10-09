// HUD：ステータス・ミニマップ・拍インジケーター・トースト・体力バー
import * as THREE from 'three';
import { FIELDS, landRadius, LIGHTHOUSE, HOUSE } from './world.js';
import { TOWER_TYPES } from './towers.js';

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
      d.innerHTML = `<span class="k">${t.key}</span><b>${t.name}</b><span class="c">${t.cost}Q</span><i style="background:${t.color}"></i>`;
      d.title = t.desc;
      this.el.hotbar.appendChild(d);
    });
    this.lastToast = '';
    this.mapBg = this.renderMapBg();
  }

  renderMapBg() {
    const S = 200, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#0d2630'; g.fillRect(0, 0, S, S);
    g.beginPath();
    for (let i = 0; i <= 128; i++) {
      const th = i / 128 * Math.PI * 2, r = landRadius(th);
      const x = S / 2 + Math.cos(th) * r * this.mapScale(), y = S / 2 + Math.sin(th) * r * this.mapScale();
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.fillStyle = '#3a5a2c'; g.fill();
    g.strokeStyle = '#c8b48a'; g.lineWidth = 1.5; g.stroke();
    return c;
  }
  mapScale() { return 100 / 290; }
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
        bar = document.createElement('div'); bar.className = 'hpbar'; bar.innerHTML = '<i></i><span>竜巻</span>';
        el.bars.appendChild(bar); this.barEls.set(t, bar);
      }
      bar.style.left = ((p.x + 1) / 2 * innerWidth) + 'px';
      bar.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
      bar.firstChild.style.width = Math.max(0, t.hp / t.maxHp * 100) + '%';
    }
    for (const [t, bar] of this.barEls) if (!seen.has(t)) { bar.remove(); this.barEls.delete(t); }

    this.drawMap(game);
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
