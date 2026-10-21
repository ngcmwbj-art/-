// HUD：ステータス・ミニマップ・拍インジケーター・トースト・体力バー
import * as THREE from 'three';
import { FIELDS, coastX, BOUNDS, LIGHTHOUSE, HOUSE, BARN, SHRINE } from './world.js';
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
      cdR: $('cd-r'), cdF: $('cd-f'), cdG: $('cd-g'), floaters: $('floaters'), hint: $('hud-hint'),
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
    if (this.el.lane) for (let i = 0; i < 6; i++) { const n = document.createElement('i'); n.className = 'lnote'; n.textContent = '♪'; this.el.lane.appendChild(n); this.laneNotes.push(n); }
    this.arrowEls = [];
    this.prepFolded = false;
    this.el.obj.addEventListener('pointerdown', (e) => {
      if (!this.el.obj.classList.contains('prep')) return;
      e.stopPropagation();
      this.prepFolded = !this.prepFolded; this.prepTouched = true;
    });
    this.mapBg = this.renderMapBg();
    // 大きな地図（ミニマップをタップ／［Tab］で開く。見るだけ・開いている間は時間が止まる）
    this.bigSize = 800;
    this.bigCanvas = $('bigmap-c');
    this.bigCtx = this.bigCanvas.getContext('2d');
    this.mapBgBig = this.renderMapBg(this.bigSize);
  }

  renderMapBg(size = 200) {
    const S = 200, c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.scale(size / S, size / S);
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

  // 量子メモ：本当の物理／ゲームでは／言い伝え（ゲームの中の世界観）
  memo(card) {
    (this.memoQ ||= []).push(card);
    if (!this.memoOn) this.nextMemo();
  }
  nextMemo() {
    const el = $('memo');
    const card = this.memoQ.shift();
    if (!card) { this.memoOn = false; el.className = ''; document.body.classList.remove('memo-on'); return; }
    this.memoOn = true;
    document.body.classList.add('memo-on');
    el.innerHTML = `<span class="tag">量子メモ</span><h4>${card.title}</h4>
      <dl><dt>本当の量子力学</dt><dd>${card.physics}</dd><dt>ゲームでは</dt><dd>${card.game}</dd></dl>
      <p class="lore"><small>言い伝え（ゲームの中の世界観）</small>${card.lore}</p><i class="close">×</i>`;
    el.className = ''; void el.offsetWidth; el.className = 'show';
    const done = () => { clearTimeout(this._mt); el.onpointerdown = null; el.className = 'out'; setTimeout(() => this.nextMemo(), 400); };
    el.onpointerdown = (e) => { e.stopPropagation(); done(); };
    this._mt = setTimeout(done, 11000);
  }

  // キャベツがやられたとき、画面の端を一瞬赤く
  hurt() {
    const now = performance.now();
    if (now - (this._hurtAt || 0) < 350) return;
    this._hurtAt = now;
    const v = $('vignette');
    v.classList.remove('on'); void v.offsetWidth; v.classList.add('on');
  }

  // 連続撃破
  streak(n) {
    const el = $('streak');
    el.innerHTML = `<b>${n}</b>体撃破${'！'.repeat(n >= 12 ? 3 : n >= 5 ? 2 : 1)}`;
    el.className = ''; void el.offsetWidth; el.className = 'show' + (n >= 8 ? ' hot' : '');
  }

  // マサトの吹き出し
  say(text) {
    const el = $('speech');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._st);
    this._st = setTimeout(() => el.classList.remove('show'), 2800);
  }
  updateSpeech(game) {
    const el = $('speech');
    if (!el.classList.contains('show')) return;
    const p = game.player.pos.clone().add(new THREE.Vector3(0, 2.7, 0)).project(game.camera);
    if (p.z > 1) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = '';
    el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px';
    el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
  }

  // 台風情報ニュース（画面下のテロップ。8 秒かタップで消える）
  news(title, lines) {
    const el = $('news');
    el.innerHTML = `<span class="ch">銚子ローカル 台風情報</span><b>${title}</b>${lines.map((l) => `<p>${l}</p>`).join('')}<i class="x">×</i>`;
    el.className = ''; void el.offsetWidth; el.className = 'show';
    clearTimeout(this._nt);
    const close = () => { el.className = ''; };
    el.onpointerdown = (e) => { e.stopPropagation(); close(); };
    this._nt = setTimeout(close, 8000);
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
  objective(html, sub, slim = false) {
    const o = this.el.obj;
    if (!html) { o.hidden = true; return; }
    const s = slim ? `<b>${html}</b>` : `<span class="tag">目的</span><b>${html}</b><em>${sub || ''}</em>`;
    if (o._last !== s) { o.innerHTML = s; o._last = s; }
    o.className = slim ? 'slim' : '';
    o.hidden = false;
  }

  // 準備タイムのやることリスト
  prep(title, forecast, items) {
    const o = this.el.obj;
    // スマホ・iPad では畳める（タップで開く／閉じる）
    if (this.prepFolded) {
      const left = items.filter(([d]) => !d).length;
      const s = `<b>${title}</b><small class="fold">やること 残り ${left} ▼ タップで開く</small>`;
      if (o._last !== s) { o.innerHTML = s; o._last = s; }
      o.className = 'prep folded';
    } else {
      const s = `<span class="tag">準備タイム</span><b>${title}</b><em>${forecast}</em><ul class="todo">${items.map(([done, text]) => `<li class="${done ? 'done' : ''}">${text}</li>`).join('')}</ul>${document.body.classList.contains('touch') ? '<small class="fold">▲ タップでたたむ</small>' : ''}`;
      if (o._last !== s) { o.innerHTML = s; o._last = s; }
      o.className = 'prep';
    }
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
    el.cdR.style.setProperty('--p', Math.max(0, game.cd.teleport / (game.blessing === 'en' ? 1.5 : 3)));
    el.cdF.style.setProperty('--p', Math.max(0, game.cd.observe / 4));
    el.cdG.style.setProperty('--p', Math.max(0, game.cd.kekkai / (game.blessing === 'en' ? 6 : 12)));

    // 拍インジケーター
    const b = game.audio.beatInfo();
    const k = 1 - b.frac;
    el.beat.style.setProperty('--k', k.toFixed(3));
    el.beat.classList.toggle('on', b.offset < 0.11);

    // 拍のレーン（音符が輪に重なった瞬間が JUST）
    if (this.el.lane) {
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
    }

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

  // big=true は全画面の大きな地図（同じ描き方を拡大して描く）
  drawMap(game, big = false) {
    const g = big ? this.bigCtx : this.mctx, S = 200, size = big ? this.bigSize : 200;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.save();
    g.setTransform(size / S, 0, 0, size / S, 0, 0);
    if (!big) { g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip(); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(big ? this.mapBgBig : this.mapBg, 0, 0); g.restore();
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
    // 上陸予想地点
    if (game.phase === 'prep' && game.plan) { const [lx, ly] = this.toMap(game.plan.landing.x, game.plan.landing.z); g.strokeStyle = '#ff5a4a'; g.lineWidth = 2; g.beginPath(); g.arc(lx, ly, 6 + Math.sin(performance.now() / 150) * 1.5, 0, 7); g.stroke(); }
    // 雑魚の来る方角
    const gate = (game.phase === 'prep' || (game.phase === 'storm' && !game.spawn.boss)) && game.plan?.gate;
    if (gate) {
      const gg = gate, h = gg.width / 2;
      const [ax, ay] = this.toMap(gg.x - gg.along.x * h, gg.z - gg.along.y * h), [bx, by] = this.toMap(gg.x + gg.along.x * h, gg.z + gg.along.y * h);
      const [cx, cy] = this.toMap(gg.x, gg.z), [tx, ty] = this.toMap(gg.x + gg.in.x * 30, gg.z + gg.in.y * 30);
      g.strokeStyle = '#ff9a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx, ty); g.stroke();
      const ang = Math.atan2(ty - cy, tx - cx);
      g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - Math.cos(ang - 0.5) * 6, ty - Math.sin(ang - 0.5) * 6); g.lineTo(tx - Math.cos(ang + 0.5) * 6, ty - Math.sin(ang + 0.5) * 6); g.fill();
    }
    // 牛
    for (const c of game.cows?.list || []) if (c.obj.visible && c.state !== 'home') dot(c.pos.x, c.pos.z, '#f2c62e', 1.8);
    // 雑魚
    for (const m of game.threats.minions) dot(m.pos.x, m.pos.z, m.type === 'mushi' ? '#9fe05a' : m.type === 'inoshishi' ? '#b07040' : '#222', m.type === 'inoshishi' ? 3 : 2);
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
    // 停電中の発電機（小さな地図にも）
    if (game.outage?.state === 'on' && (performance.now() / 250) % 2 < 1.4) { const gp = game.cows.genPos; dot(gp.x, gp.z, '#ffd24a', big ? 3 : 4); }
    // 大きな地図だけ：名前のラベル
    if (big) {
      g.font = '700 5px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center';
      const label = (x, z, text, c = '#fff', dy = -5) => { const [a, b] = this.toMap(x, z); g.lineWidth = 1.2; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(text, a, b + dy); g.fillStyle = c; g.fillText(text, a, b + dy); };
      dot(SHRINE.x, SHRINE.z, '#c9b8ff', 2.5); dot(BARN.x, BARN.z, '#b0703a', 2.5);
      label(HOUSE.x, HOUSE.z, '家'); label(BARN.x, BARN.z, '牛舎');
      if (game.outage?.state === 'on') { const gp = game.cows.genPos; dot(gp.x, gp.z, '#ffd24a', 3); label(gp.x, gp.z, '発電機（停電中）', '#ffd24a', 8); } label(SHRINE.x, SHRINE.z, '量子の祠', '#d8ccff');
      label(LIGHTHOUSE.x, LIGHTHOUSE.z, '灯台');
      label(p.pos.x, p.pos.z, 'マサト', '#ffe66a', -7);
      if (gate) label(gate.x + gate.in.x * 12, gate.z + gate.in.y * 12, `雑魚は${gate.name}から`, '#ffb36a', 2);
      if (game.phase === 'prep' && game.plan) label(game.plan.landing.x, game.plan.landing.z, 'ボス上陸地点', '#ff8a7a', -9);
      for (const t of game.towers.list) label(t.pos.x, t.pos.z, t.def.name, t.def.color, -4.5);
    }
    // 風向
    const wd = game.weather.windDir;
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(170, 30); g.lineTo(170 + wd.x * 14, 30 + wd.y * 14); g.stroke();
    g.restore();
  }
}
