// Variables used by Scriptable.
// icon-color: orange; icon-glyph: tasks;
//
// Claude Code 進捗ウィジェットの「入口」。
// Scriptable に貼るのはこのファイルだけ。本体は GitHub から自動で取ってくるので、
// あとで本体を直しても貼り直しは要らない。

const OWNER = "ngcmwbj-art";
const REPO = "-";
const PATH = "widget/claude-progress.js";
// 上から順に探す（HEAD ＝ リポジトリの既定ブランチ）
const REFS = ["HEAD", "refs/heads/claude/cool-einstein-b2jskj"];

const fm = FileManager.local();
const saved = fm.joinPath(fm.documentsDirectory(), "claude-progress-main.js");

let code = null;
for (const ref of REFS) {
  try {
    const req = new Request(`https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(REPO)}/${ref}/${PATH}`);
    req.timeoutInterval = 10;
    const body = await req.loadString();
    if (req.response.statusCode === 200 && body.includes("createWidget")) {
      code = body;
      fm.writeString(saved, body);
      break;
    }
  } catch (e) {}
}
// 取れなかったら、前に取った本体を使う
if (!code && fm.fileExists(saved)) code = fm.readString(saved);

if (!code) {
  const w = new ListWidget();
  w.addText("本体を取得できませんでした。通信を確認してください。");
  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentMedium();
  Script.complete();
} else {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction(code)();
}
