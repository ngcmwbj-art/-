// Variables used by Scriptable.
// icon-color: orange; icon-glyph: tasks;
//
// Claude Code 進捗ウィジェット（Scriptable 用）
//
// GitHub の公開リポジトリを読んで、Claude Code がどれだけ作業を進めたかを
// iPhone のホーム画面に出す。読むのは公開されている情報だけで、
// パスワードやトークンは使わない。
//
// 使い方は widget/README.md を参照。

const CONFIG = {
  owner: "ngcmwbj-art",
  repo: "-",
  // ゲーム台帳（無ければ自動で省く）
  gamesJsonPath: "portal/games.json",
  // 使用状況の画面（タップで開く）
  usageUrl: "https://claude.ai/settings/usage",
  // 何分おきに GitHub を見に行くか
  refreshMinutes: 30,
  // 1回の更新で調べるブランチの数（多いほど通信が増える）
  maxBranches: 4,
};

// ウィジェットの「Parameter」に owner/repo と書くと、別のリポジトリを見られる
const param = (typeof args !== "undefined" && args.widgetParameter) || "";
if (/^[^/\s]+\/[^/\s]+$/.test(param.trim())) {
  const [o, r] = param.trim().split("/");
  CONFIG.owner = o;
  CONFIG.repo = r;
}

const API = `https://api.github.com/repos/${CONFIG.owner}/${encodeURIComponent(CONFIG.repo)}`;
const RAW = `https://raw.githubusercontent.com/${CONFIG.owner}/${encodeURIComponent(CONFIG.repo)}`;
const DAY = 24 * 60 * 60 * 1000;

// ---------- 色 ----------
const C = {
  bg: Color.dynamic(new Color("#FAF9F5"), new Color("#262624")),
  text: Color.dynamic(new Color("#1F1E1D"), new Color("#F5F4EF")),
  sub: Color.dynamic(new Color("#6B6A65"), new Color("#A6A39A")),
  accent: new Color("#D97757"),
  bar: Color.dynamic(new Color("#E3DFD3"), new Color("#45443F")),
};

// ---------- データ ----------
async function getJSON(url) {
  const req = new Request(url);
  req.headers = { Accept: "application/vnd.github+json" };
  req.timeoutInterval = 15;
  const json = await req.loadJSON();
  const status = req.response && req.response.statusCode;
  if (status && status >= 400) {
    throw new Error(`HTTP ${status}`);
  }
  return json;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function branchLabel(branch, titles) {
  if (titles[branch]) return titles[branch];
  return branch
    .replace(/^claude\//, "")
    .replace(/-[a-z0-9]{6}$/, "")
    .replace(/-/g, " ");
}

async function fetchStatus() {
  const now = new Date();
  const weekStart = new Date(startOfDay(now).getTime() - 6 * DAY);

  // 1) この1週間に動きのあったブランチ（新しい順）
  const activity = await getJSON(`${API}/activity?time_period=week&per_page=100`);
  const branches = [];
  for (const a of Array.isArray(activity) ? activity : []) {
    const b = String(a.ref || "").replace(/^refs\/heads\//, "");
    if (b && a.activity_type !== "branch_deletion" && !branches.includes(b)) {
      branches.push(b);
    }
  }

  // 2) ゲーム台帳（あれば）。ブランチ名→作品名の対応にも使う
  const titles = {};
  let games = null;
  try {
    const g = await getJSON(`${RAW}/HEAD/${CONFIG.gamesJsonPath}`);
    const list = (g && g.games) || [];
    games = {
      total: list.length,
      live: list.filter((x) => x.status === "公開中").length,
    };
    const perRef = {};
    for (const x of list) {
      const ref = x.source && x.source.ref ? x.source.ref.replace(/^origin\//, "") : "";
      if (ref) (perRef[ref] = perRef[ref] || []).push(x.title);
    }
    // 1つのブランチに1作品だけ入っているときだけ、作品名で呼ぶ
    for (const ref in perRef) {
      if (perRef[ref].length === 1) titles[ref] = perRef[ref][0];
    }
  } catch (e) {
    games = null;
  }

  // 3) 各ブランチのコミット（同じコミットは1回だけ数える）
  const seen = {};
  const commits = [];
  const active = branches.slice(0, CONFIG.maxBranches);
  for (const b of active) {
    let list = [];
    try {
      list = await getJSON(
        `${API}/commits?sha=${encodeURIComponent(b)}&since=${weekStart.toISOString()}&per_page=100`
      );
    } catch (e) {
      continue;
    }
    for (const c of Array.isArray(list) ? list : []) {
      if (seen[c.sha]) continue;
      seen[c.sha] = true;
      commits.push({
        sha: c.sha,
        date: c.commit.committer.date,
        message: String(c.commit.message || "").split("\n")[0],
        branch: b,
        label: branchLabel(b, titles),
      });
    }
  }
  commits.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    fetchedAt: now.toISOString(),
    commits: commits.slice(0, 300),
    branchCount: branches.length,
    games,
  };
}

// 日ごとの本数は、表示するたびに端末の時計で数え直す（古い控えでも日付がずれない）
function summarize(status) {
  const today = startOfDay(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push({ date: new Date(today.getTime() - i * DAY), count: 0 });
  }
  for (const c of status.commits) {
    const idx = Math.round((startOfDay(new Date(c.date)) - days[0].date) / DAY);
    if (idx >= 0 && idx < 7) days[idx].count++;
  }
  return {
    days,
    today: days[6].count,
    week: days.reduce((s, d) => s + d.count, 0),
    latest: status.commits,
  };
}

// ---------- 控え（通信できないときは前回の値を出す） ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(
  fm.cacheDirectory(),
  `claude-progress-${CONFIG.owner}-${CONFIG.repo}.json`.replace(/[^\w.-]/g, "_")
);

function readCache() {
  try {
    if (fm.fileExists(cachePath)) return JSON.parse(fm.readString(cachePath));
  } catch (e) {}
  return null;
}

async function loadStatus() {
  const cached = readCache();
  const fresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < (CONFIG.refreshMinutes - 5) * 60000;
  // ホーム画面での自動更新は、控えが新しければ通信しない（GitHub の回数制限を守る）
  if (fresh && config.runsInWidget) return { status: cached, stale: false };
  try {
    const status = await fetchStatus();
    fm.writeString(cachePath, JSON.stringify(status));
    return { status, stale: false };
  } catch (e) {
    if (cached) return { status: cached, stale: true, error: String(e.message || e) };
    return { status: null, stale: true, error: String(e.message || e) };
  }
}

// ---------- 表示の部品 ----------
function ago(iso) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function clock(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function text(stack, str, size, color, weight) {
  const t = stack.addText(String(str));
  t.font =
    weight === "bold"
      ? Font.boldSystemFont(size)
      : weight === "medium"
      ? Font.mediumSystemFont(size)
      : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function header(w, info) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const dot = row.addStack();
  dot.size = new Size(8, 8);
  dot.cornerRadius = 4;
  dot.backgroundColor = C.accent;
  row.addSpacer(6);
  text(row, "Claude Code", 12, C.text, "bold");
  row.addSpacer();
  if (info.status) {
    const label = info.stale ? `前回 ${clock(info.status.fetchedAt)}` : clock(info.status.fetchedAt);
    text(row, label, 10, C.sub);
  }
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function bars(parent, sum, height, barWidth) {
  const max = Math.max(1, ...sum.days.map((d) => d.count));
  const row = parent.addStack();
  row.layoutHorizontally();
  row.bottomAlignContent();
  row.spacing = 4;
  sum.days.forEach((d, i) => {
    const col = row.addStack();
    col.layoutVertically();
    col.spacing = 2;
    const track = col.addStack();
    track.layoutVertically();
    track.size = new Size(barWidth, height);
    track.addSpacer();
    const bar = track.addStack();
    const h = d.count === 0 ? 2 : Math.max(4, Math.round((d.count / max) * height));
    bar.size = new Size(barWidth, h);
    bar.cornerRadius = 2;
    bar.backgroundColor = i === 6 ? C.accent : C.bar;
    const lab = col.addStack();
    lab.size = new Size(barWidth, 10);
    lab.centerAlignContent();
    text(lab, WEEKDAYS[d.date.getDay()], 8, i === 6 ? C.accent : C.sub);
  });
}

function todayBlock(parent, sum, big) {
  text(parent, "今日のコミット", 10, C.sub);
  const row = parent.addStack();
  row.layoutHorizontally();
  row.bottomAlignContent();
  const n = text(row, sum.today, big, C.text, "bold");
  n.minimumScaleFactor = 0.6;
  row.addSpacer(4);
  const side = row.addStack();
  side.layoutVertically();
  text(side, `今週 ${sum.week}`, 10, C.sub);
  side.addSpacer(5);
}

function commitRow(parent, c) {
  const box = parent.addStack();
  box.layoutVertically();
  const m = text(box, c.message, 12, C.text, "medium");
  m.lineLimit = 1;
  const meta = text(box, `${c.label}・${ago(c.date)}`, 10, C.sub);
  meta.lineLimit = 1;
}

function footer(w, info) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const g = info.status && info.status.games;
  if (g) {
    text(row, `ゲーム ${g.live}本公開中`, 10, C.sub);
  } else if (info.status) {
    text(row, `動いているブランチ ${info.status.branchCount}`, 10, C.sub);
  }
  row.addSpacer();
  const link = row.addStack();
  link.url = CONFIG.usageUrl;
  text(link, "使用状況を開く ›", 10, C.accent, "medium");
}

function emptyMessage(w, info) {
  w.addSpacer();
  const t = w.addText("GitHub を読めませんでした");
  t.font = Font.mediumSystemFont(13);
  t.textColor = C.text;
  const s = w.addText(info.error ? `（${info.error}）しばらくすると自動でやり直します` : "しばらくすると自動でやり直します");
  s.font = Font.systemFont(10);
  s.textColor = C.sub;
  w.addSpacer();
}

// ---------- 大きさごとの組み立て ----------
function buildSmall(w, info, sum) {
  header(w, info);
  w.addSpacer(6);
  todayBlock(w, sum, 34);
  w.addSpacer(4);
  bars(w, sum, 22, 14);
  w.addSpacer();
  const last = sum.latest[0];
  if (last) {
    const m = text(w, last.message, 10, C.sub);
    m.lineLimit = 1;
  }
  // 小サイズは全体で1つのタップ先しか持てないので、使用状況の画面を開く
  w.url = CONFIG.usageUrl;
}

function buildWide(w, info, sum, rows, large) {
  header(w, info);
  w.addSpacer(large ? 12 : 8);

  if (large) {
    const top = w.addStack();
    top.layoutHorizontally();
    top.bottomAlignContent();
    const left = top.addStack();
    left.layoutVertically();
    todayBlock(left, sum, 40);
    top.addSpacer();
    bars(top, sum, 44, 22);
    w.addSpacer(16);
    text(w, "さいきんの作業", 10, C.sub);
    w.addSpacer(6);
    const list = w.addStack();
    list.layoutVertically();
    list.spacing = 7;
    sum.latest.slice(0, rows).forEach((c) => commitRow(list, c));
    if (sum.latest.length === 0) text(list, "この1週間のコミットはありません", 12, C.sub);
  } else {
    const body = w.addStack();
    body.layoutHorizontally();
    const left = body.addStack();
    left.layoutVertically();
    left.size = new Size(104, 0);
    todayBlock(left, sum, 32);
    left.addSpacer(4);
    bars(left, sum, 24, 11);
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    right.spacing = 5;
    sum.latest.slice(0, rows).forEach((c) => commitRow(right, c));
    if (sum.latest.length === 0) text(right, "この1週間のコミットはありません", 12, C.sub);
    body.addSpacer();
  }

  w.addSpacer();
  footer(w, info);
}

function buildLockScreen(w, info, sum) {
  const t = w.addText(`Claude Code　今日 ${sum.today}・今週 ${sum.week}`);
  t.font = Font.boldSystemFont(12);
  t.lineLimit = 1;
  const last = sum.latest[0];
  if (last) {
    const m = w.addText(last.message);
    m.font = Font.systemFont(11);
    m.lineLimit = 2;
  }
}

async function createWidget(family) {
  const info = await loadStatus();
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);

  if (String(family).startsWith("accessory")) {
    if (info.status) buildLockScreen(w, info, summarize(info.status));
    else w.addText("Claude Code　読み込めません");
    return w;
  }

  w.backgroundColor = C.bg;
  w.setPadding(12, 16, 10, 16);
  if (!info.status) {
    header(w, info);
    emptyMessage(w, info);
    footer(w, info);
    return w;
  }
  const sum = summarize(info.status);
  if (family === "small") buildSmall(w, info, sum);
  else if (family === "large") buildWide(w, info, sum, 6, true);
  else buildWide(w, info, sum, 3, false);
  return w;
}

const family = config.widgetFamily || "medium";
const widget = await createWidget(family);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (family === "small") {
  await widget.presentSmall();
} else if (family === "large") {
  await widget.presentLarge();
} else {
  await widget.presentMedium();
}
Script.complete();
