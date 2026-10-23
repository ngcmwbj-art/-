// アシスト設定：照準アシスト・やさしいモード・左利き配置・ボタンの大きさ（localStorage に保存）
const KEY = 'masato-settings-v1';
const DEFAULT = { aim: true, left: false, size: 1, bgm: true, vol: 0.8, diff: 1 };

export function loadSettings() {
  try {
    const s = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    // 前の「やさしいモード」は台風の強さ「やさしい」に引き継ぐ
    if (s.easy) { s.diff = 0; delete s.easy; }
    return s;
  } catch (e) { return { ...DEFAULT }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 保存できない環境 */ }
}
export function applySettingsCss(s) {
  document.body.classList.toggle('lefty', !!s.left);
  document.documentElement.style.setProperty('--btn-scale', s.size);
}

// 設定画面のつまみと設定を結びつける
export function bindSettingsPanel(game) {
  game.settingsSync = () => sync();
  const el = document.getElementById('settings');
  const s = game.settings;
  const sync = () => {
    el.querySelectorAll('[data-key]').forEach((b) => {
      const k = b.dataset.key;
      if (b.tagName === 'SELECT') b.value = String(s[k]);
      else b.classList.toggle('on', !!s[k]);
    });
  };
  el.querySelectorAll('button[data-key]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    s[b.dataset.key] = !s[b.dataset.key];
    saveSettings(s); applySettingsCss(s); sync(); game.applyAudio?.();
  }));
  el.querySelectorAll('select[data-key]').forEach((b) => b.addEventListener('change', () => {
    s[b.dataset.key] = +b.value;
    saveSettings(s); applySettingsCss(s); sync(); game.applyAudio?.();
  }));
  el.querySelector('.done').addEventListener('click', (e) => { e.stopPropagation(); game.toggleSettings(false); });
  applySettingsCss(s); sync();
}
