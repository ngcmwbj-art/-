// プレイヤー操作と三人称カメラ
import * as THREE from 'three';
import { createMasato } from './masato.js';
import { groundAt, isWalkable, SPAWN } from './world.js';
import { clamp, damp } from './util.js';

export class Player {
  constructor(scene, camera) {
    this.camera = camera;
    this.model = createMasato();
    scene.add(this.model.root);
    this.pos = new THREE.Vector3(SPAWN.x, groundAt(SPAWN.x, SPAWN.z), SPAWN.z);
    this.vel = new THREE.Vector3();
    this.facing = Math.PI;
    this.camYaw = Math.PI; this.camPitch = 0.28; this.camDist = 7.5;
    this.onGround = true;
    this.stun = 0;
    this.speedN = 0;
    this.shake = 0;
    this.camPos = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.soloOn = false;
  }

  look(dx, dy) {
    this.camYaw -= dx * 0.0024;
    this.camPitch = clamp(this.camPitch + dy * 0.0022, -0.45, 1.25);
  }

  forward() { return new THREE.Vector3(Math.sin(this.camYaw + Math.PI), 0, Math.cos(this.camYaw + Math.PI)); }

  // 前方の地点（タワー設置プレビュー用）
  aimPoint(dist) {
    const f = this.forward();
    const x = this.pos.x + f.x * dist, z = this.pos.z + f.z * dist;
    return new THREE.Vector3(x, groundAt(x, z), z);
  }

  knock(from, power) {
    const d = this.pos.clone().sub(from); d.y = 0;
    if (d.lengthSq() < 0.01) d.set(1, 0, 0);
    d.normalize().multiplyScalar(power);
    this.vel.x += d.x; this.vel.z += d.z;
    this.vel.y = Math.max(this.vel.y, power * 0.45);
    this.onGround = false;
    this.stun = Math.max(this.stun, 0.6);
    this.shake = Math.max(this.shake, 0.6);
  }

  teleport(dist) {
    const f = this.forward();
    for (let d = dist; d > 2; d -= 2) {
      const x = this.pos.x + f.x * d, z = this.pos.z + f.z * d;
      if (isWalkable(x, z)) {
        const from = this.pos.clone();
        this.pos.set(x, groundAt(x, z), z);
        this.vel.set(0, 0, 0);
        return from;
      }
    }
    return null;
  }

  update(dt, t, input, wind) {
    const move = new THREE.Vector3();
    if (this.stun <= 0) {
      if (input.f) move.z -= 1;
      if (input.b) move.z += 1;
      if (input.l) move.x -= 1;
      if (input.r) move.x += 1;
      // スマホのバーチャルスティック（-1..1）
      if (input.ax || input.az) { move.x += input.ax; move.z += input.az; }
    }
    this.stun -= dt;
    const sprint = input.sprint;
    const maxSpeed = sprint ? 14 : 8;
    if (move.lengthSq() > 0) {
      const mag = Math.min(1, move.length());
      move.normalize().multiplyScalar(mag).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);
      const targetFacing = Math.atan2(move.x, move.z);
      let d = targetFacing - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * (1 - Math.exp(-14 * dt));
    }
    const accel = this.onGround ? 14 : 3;
    this.vel.x = damp(this.vel.x, move.x * maxSpeed, accel, dt);
    this.vel.z = damp(this.vel.z, move.z * maxSpeed, accel, dt);
    // 嵐の風に押される
    this.vel.x += wind.x * dt;
    this.vel.z += wind.y * dt;

    if (input.jump && this.onGround && this.stun <= 0) {
      this.vel.y = 7.5; this.onGround = false;
    }
    input.jump = false;
    this.vel.y -= 22 * dt;

    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    if (isWalkable(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
    else if (isWalkable(nx, this.pos.z)) { this.pos.x = nx; this.vel.z = 0; }
    else if (isWalkable(this.pos.x, nz)) { this.pos.z = nz; this.vel.x = 0; }
    else { this.vel.x = this.vel.z = 0; }
    this.pos.y += this.vel.y * dt;
    const g = groundAt(this.pos.x, this.pos.z);
    if (this.pos.y <= g) {
      this.pos.y = g; this.vel.y = 0; this.onGround = true;
    } else if (this.pos.y - g > 0.25) {
      this.onGround = false;
    } else if (this.vel.y <= 0) {
      this.pos.y = g; this.onGround = true;
    }

    const horiz = Math.hypot(this.vel.x, this.vel.z);
    this.speedN = damp(this.speedN, clamp(horiz / 14, 0, 1), 10, dt);
    const r = this.model.root;
    r.position.copy(this.pos);
    r.rotation.y = this.facing;
    this.model.update(dt, t, this.speedN, !this.onGround, this.soloOn, this.stun > 0);

    // カメラ（右肩越し）
    const pitch = this.camPitch, yaw = this.camYaw;
    const target = this.pos.clone().add(new THREE.Vector3(0, 1.75, 0));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    target.addScaledVector(right, 0.7);
    const cdt = dt || 1 / 60; // 一時停止中もカメラは追従させる
    const dist = this.camDist + this.speedN * 1.2;
    const off = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist);
    const desired = target.clone().add(off);
    // 地面へのめり込み防止（カメラ位置と途中の地点を確認）
    for (const k of [1, 0.66, 0.33]) {
      const px = target.x + (desired.x - target.x) * k, pz = target.z + (desired.z - target.z) * k;
      const gh = groundAt(px, pz) + 0.9 - (1 - k) * 0.5;
      if (desired.y < gh) desired.y = gh;
    }
    if (this.camPos.lengthSq() === 0 || this.camPos.distanceTo(desired) > 40) { this.camPos.copy(desired); this.camTarget.copy(target); }
    this.camPos.lerp(desired, 1 - Math.exp(-18 * cdt));
    const gmin = groundAt(this.camPos.x, this.camPos.z) + 0.6;
    if (this.camPos.y < gmin) this.camPos.y = gmin;
    this.camTarget.lerp(target, 1 - Math.exp(-22 * cdt));
    this.camera.position.copy(this.camPos);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sh = this.shake * this.shake;
    this.camera.position.x += (Math.random() - 0.5) * sh * 0.6;
    this.camera.position.y += (Math.random() - 0.5) * sh * 0.6;
    this.camera.lookAt(this.camTarget);
  }
}
