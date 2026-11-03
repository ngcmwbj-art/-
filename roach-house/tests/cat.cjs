// ネコの見た目の確認（横・正面・顔のアップ・しのび足）
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 900, height: 600 } });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=' + (process.env.Q || 'medium'));
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  await page.evaluate(() => {
    document.getElementById('optTutor').checked = false;
    window.__rh.startGame('s4');
    const g = window.__rh.game;
    Object.assign(g.cat, { x: -8, z: 3.4, h: Math.PI / 2, st: 'wander', tx: -8, tz: 3.4, t: 0, cd: 99, pesterT: 999 });
    g.farmer.x = 19; g.farmer.z = 12; g.farmer.timer = 999;
    Object.assign(g.player, { x: -14, z: 6, surface: -1, y: 0 });
  });
  const views = {
    side: [[-8, 0.7, 6.0], [-8, 0.6, 3.4]],
    front: [[-6.3, 1.0, 3.9], [-8, 0.7, 3.4]],
    face: [[-7.05, 0.98, 3.45], [-7.4, 0.9, 3.4]],
    low: [[-6.5, 0.15, 4.6], [-8, 0.5, 3.4]],
  };
  for (const [name, [pos, tgt]] of Object.entries(views)) {
    if (name === 'low') await page.evaluate(() => { const C = window.__rh.game.cat; C.st = 'stalk'; C.target = window.__rh.game.player; C.t = 0; C.tx = C.x; });
    await page.waitForTimeout(800);
    const data = await page.evaluate(([pos, tgt]) => {
      const RH = window.__rh, cam = RH.camera.clone();
      cam.fov = 35; cam.near = 0.02; cam.updateProjectionMatrix();
      cam.position.set(...pos); cam.lookAt(...tgt);
      RH.game.cat.m.root.updateMatrixWorld(true);
      RH.renderer.render(RH.scene, cam);
      return RH.renderer.domElement.toDataURL('image/png');
    }, [pos, tgt]);
    fs.writeFileSync(`${out}/cat-${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
    console.log('shot', name);
  }
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
