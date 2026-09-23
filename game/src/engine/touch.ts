// On-screen touch controls (DOM overlay), shown only after the first touch.
// A virtual stick on the left, confirm / cancel / menu buttons on the right.

import type { Action, Input } from './input';

const CSS = `
.tc{position:fixed;inset:0;pointer-events:none;z-index:10;user-select:none;-webkit-user-select:none;display:none}
.tc.on{display:block}
.tc-pad{position:absolute;left:4vmin;bottom:5vmin;width:34vmin;height:34vmin;border-radius:50%;
  background:radial-gradient(circle,#ffffff14 0 45%,#ffffff22 46% 100%);border:2px solid #ffffff30;pointer-events:auto;touch-action:none}
.tc-knob{position:absolute;left:50%;top:50%;width:13vmin;height:13vmin;margin:-6.5vmin 0 0 -6.5vmin;border-radius:50%;
  background:#ffffff38;border:2px solid #ffffff55}
.tc-btn{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;
  font:bold 4vmin/1 sans-serif;color:#ffffffc0;background:#ffffff1c;border:2px solid #ffffff40}
.tc-btn.down{background:#ffffff48}
.tc-a{right:5vmin;bottom:15vmin;width:17vmin;height:17vmin}
.tc-b{right:24vmin;bottom:6vmin;width:14vmin;height:14vmin}
.tc-m{right:6vmin;top:5vmin;width:11vmin;height:11vmin;font-size:3vmin}
`;

export function installTouch(input: Input): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.className = 'tc';
  root.innerHTML = `<div class="tc-pad"><div class="tc-knob"></div></div>
    <div class="tc-btn tc-a">A</div><div class="tc-btn tc-b">B</div><div class="tc-btn tc-m">MENU</div>`;
  document.body.appendChild(root);

  window.addEventListener('touchstart', () => root.classList.add('on'), { once: true, passive: true });

  const pad = root.querySelector('.tc-pad') as HTMLElement;
  const knob = root.querySelector('.tc-knob') as HTMLElement;
  let padId: number | null = null;
  const dirs: Action[] = ['up', 'down', 'left', 'right'];
  const setDirs = (dx: number, dy: number) => {
    const dead = 0.3;
    input.setVirtual('left', dx < -dead);
    input.setVirtual('right', dx > dead);
    input.setVirtual('up', dy < -dead);
    input.setVirtual('down', dy > dead);
  };
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    knob.style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
    setDirs(dx, dy);
  };
  pad.addEventListener('pointerdown', (e) => {
    padId = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    move(e);
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === padId) move(e);
  });
  const endPad = (e: PointerEvent) => {
    if (e.pointerId !== padId) return;
    padId = null;
    knob.style.transform = '';
    for (const d of dirs) input.setVirtual(d, false);
  };
  pad.addEventListener('pointerup', endPad);
  pad.addEventListener('pointercancel', endPad);

  const bind = (sel: string, a: Action) => {
    const el = root.querySelector(sel) as HTMLElement;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      el.classList.add('down');
      input.setVirtual(a, true);
    });
    const up = () => {
      el.classList.remove('down');
      input.setVirtual(a, false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  bind('.tc-a', 'confirm');
  bind('.tc-b', 'cancel');
  bind('.tc-m', 'menu');
}
