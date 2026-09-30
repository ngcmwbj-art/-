/**
 * 爆走！つがおのビバベジ便！ みんなのランキング（Google Apps Script）
 *
 * スプレッドシートの「拡張機能 → Apps Script」にこのファイルの中身を丸ごと貼り付けて、
 * 「デプロイ → 新しいデプロイ → ウェブアプリ」（実行するユーザー：自分／アクセスできるユーザー：全員）で公開する。
 * 記録は「ranking」シートに1人1行でたまる。いたずらの行は、シートから行ごと消せばランキングからも消える。
 */
const SHEET = 'ranking';
const HEAD = ['id', '名前', 'スコア', '距離(m)', '更新日時', 'key'];
const TOP = 50;              // ゲームに返す人数
const MAX_ROWS = 5000;       // これ以上は新しい人を受け付けない
const TOMATO_MAX = 17;       // 1 m で増える点数の上限（トマトの最大数）

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@');   // 名前はいつも文字として保存する
  }
  return sh;
}

function top_(values) {
  return values.slice(1)
    .filter(r => r[0] && Number(r[2]) > 0)
    .map(r => ({ id: String(r[0]), name: String(r[1]).slice(0, 12), score: Number(r[2]) || 0, m: Number(r[3]) || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP);   // key は返さない
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, rows: top_(sheet_().getDataRange().getValues()) });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad_json' }); }
  const id = String(b.id || ''), key = String(b.key || '');
  if (!/^[0-9a-f]{32}$/.test(id) || !/^[0-9a-f]{32}$/.test(key)) return out_({ ok: false, error: 'bad_id' });
  // 名前：空白をまとめ、数式として読まれる先頭の記号を外して 12 文字まで
  const name = String(b.name || '').replace(/\s+/g, ' ').trim().replace(/^[=+\-@]+/, '').slice(0, 12);
  const score = Math.floor(Number(b.score)), m = Math.floor(Number(b.m));
  if (!name) return out_({ ok: false, error: 'bad_name' });
  if (!(score > 0 && score < 1e9 && m >= 0 && m < 1e7)) return out_({ ok: false, error: 'bad_score' });
  if (score > (m + 10) * TOMATO_MAX) return out_({ ok: false, error: 'bad_score' });   // 距離に対して多すぎる点数

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const values = sh.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) if (String(values[i][0]) === id) { row = i; break; }
    if (row < 0) {
      if (values.length > MAX_ROWS) return out_({ ok: false, error: 'full' });
      sh.appendRow([id, name, score, m, new Date(), key]);
    } else {
      if (String(values[row][5]) !== key) return out_({ ok: false, error: 'not_yours' });
      if (score > (Number(values[row][2]) || 0)) sh.getRange(row + 1, 2, 1, 4).setValues([[name, score, m, new Date()]]);
      else sh.getRange(row + 1, 2).setValue(name);   // 記録はそのまま、名前だけ変える
    }
    return out_({ ok: true, rows: top_(sh.getDataRange().getValues()) });
  } finally {
    lock.releaseLock();
  }
}
