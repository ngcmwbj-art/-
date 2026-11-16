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
  maxBranches: 6,
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

// 「ミュージック：曲の切り上げを短く」→ 頭の「ミュージック」を作品名として取り出す
function splitPrefix(msg) {
  const m = String(msg).match(/^([^：:\s][^：:]{0,13})[：:]\s*(.+)$/);
  return m ? { prefix: m[1].trim(), rest: m[2].trim() } : { prefix: null, rest: String(msg) };
}

// コミット1件ごとにプロジェクト名を決める。
// 頭に名前が付いていればそれ、無ければ同じブランチの後のコミットの名前、それも無ければブランチ名
function projectNames(branch, messages, titles) {
  const own = messages.map((m) => {
    const p = splitPrefix(m).prefix;
    // 「作業途中：」「作業メモ：」「WIP:」などは作品名ではないので使わない
    if (!p || p.length > 10 || /^(作業|メモ|修正|WIP|wip|fix|Fix|chore|feat|docs)/.test(p)) return null;
    return p;
  });
  return own.map((p, i) => {
    if (p) return p;
    // 後に続いた作業（新しい側）を先に見る。同じ作業の続きであることが多いため
    for (let j = i - 1; j >= 0; j--) if (own[j]) return own[j];
    for (let j = i + 1; j < own.length; j++) if (own[j]) return own[j];
    return branchLabel(branch, titles);
  });
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
    list = Array.isArray(list) ? list : [];
    const firstLines = list.map((c) => String(c.commit.message || "").split("\n")[0]);
    const labels = projectNames(b, firstLines, titles);
    list.forEach((c, i) => {
      const label = labels[i];
      if (seen[c.sha]) return;
      seen[c.sha] = true;
      const sp = splitPrefix(firstLines[i]);
      commits.push({
        sha: c.sha,
        date: c.commit.committer.date,
        // 頭の作品名はプロジェクト名と同じなら省く（同じ言葉を2回出さない）
        message: sp.prefix === label ? sp.rest : firstLines[i],
        branch: b,
        label,
      });
    });
  }
  commits.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    fetchedAt: now.toISOString(),
    commits: commits.slice(0, 300),
    branchCount: branches.length,
    games,
  };
}

// 「作業中」とみなす時間（最後のコミットからこの分数以内）
const ACTIVE_MINUTES = 60;

// 日ごとの本数は、表示するたびに端末の時計で数え直す（古い控えでも日付がずれない）
function summarize(status) {
  const today = startOfDay(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push({ date: new Date(today.getTime() - i * DAY), count: 0 });
  }
  const projects = [];
  const byName = {};
  for (const c of status.commits) {
    const idx = Math.round((startOfDay(new Date(c.date)) - days[0].date) / DAY);
    if (idx >= 0 && idx < 7) days[idx].count++;
    // commits は新しい順なので、最初に出てきたものがそのプロジェクトの最新
    let p = byName[c.label];
    if (!p) {
      p = byName[c.label] = {
        name: c.label,
        last: c,
        today: 0,
        week: 0,
        active: Date.now() - new Date(c.date).getTime() < ACTIVE_MINUTES * 60000,
      };
      projects.push(p);
    }
    if (idx >= 0 && idx < 7) p.week++;
    if (idx === 6) p.today++;
  }
  return {
    days,
    today: days[6].count,
    week: days.reduce((s, d) => s + d.count, 0),
    projects,
    activeCount: projects.filter((p) => p.active).length,
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

function dot(parent, color, d) {
  const s = parent.addStack();
  s.size = new Size(d, d);
  s.cornerRadius = d / 2;
  s.backgroundColor = color;
  return s;
}

function header(w, info, compact) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  dot(row, C.accent, 8);
  row.addSpacer(6);
  text(row, "Claude Code", 12, C.text, "bold");
  row.addSpacer();
  if (info.status) {
    const t = clock(info.status.fetchedAt);
    const label = info.stale ? `前回 ${t}` : compact ? t : `${t} 更新`;
    text(row, label, 10, C.sub);
  }
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 7日分の棒。棒の上にその日のコミット数を書くので、高さだけで読まなくてよい
function bars(parent, sum, height, barWidth) {
  const max = Math.max(1, ...sum.days.map((d) => d.count));
  const row = parent.addStack();
  row.layoutHorizontally();
  row.bottomAlignContent();
  row.spacing = 3;
  sum.days.forEach((d, i) => {
    const isToday = i === 6;
    const col = row.addStack();
    col.layoutVertically();
    col.spacing = 1;
    const num = col.addStack();
    num.size = new Size(barWidth, 10);
    num.centerAlignContent();
    const n = text(num, d.count, 8, isToday ? C.accent : C.sub, isToday ? "bold" : null);
    n.minimumScaleFactor = 0.7;
    const track = col.addStack();
    track.layoutVertically();
    track.size = new Size(barWidth, height);
    track.addSpacer();
    const bar = track.addStack();
    const h = d.count === 0 ? 2 : Math.max(3, Math.round((d.count / max) * height));
    bar.size = new Size(barWidth, h);
    bar.cornerRadius = 2;
    bar.backgroundColor = isToday ? C.accent : C.bar;
    const lab = col.addStack();
    lab.size = new Size(barWidth, 10);
    lab.centerAlignContent();
    // 棒が細いときは「今日」が入らないので曜日のまま（色で今日を示す）
    text(lab, isToday && barWidth >= 20 ? "今日" : WEEKDAYS[d.date.getDay()], 8, isToday ? C.accent : C.sub, isToday ? "bold" : null);
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
  text(side, `件　今週 ${sum.week}件`, 10, C.sub);
  side.addSpacer(big > 36 ? 7 : 5);
}

// プロジェクト1つ分：●名前　時刻 ／ 最新のコミット
function projectRow(parent, p, opts) {
  const box = parent.addStack();
  box.layoutVertically();
  box.spacing = 1;
  const top = box.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  dot(top, p.active ? C.accent : C.bar, 6);
  top.addSpacer(5);
  const name = text(top, p.name, 12, C.text, "bold");
  name.minimumScaleFactor = 0.8;
  top.addSpacer();
  const when = p.active ? `作業中・${ago(p.last.date)}` : ago(p.last.date);
  text(top, opts.showToday && p.today ? `今日${p.today}件・${when}` : when, 10, p.active ? C.accent : C.sub, p.active ? "medium" : null);
  const msgRow = box.addStack();
  msgRow.addSpacer(11);
  const m = text(msgRow, p.last.message, 11, C.sub);
  m.lineLimit = opts.lines || 1;
}

function projectHeading(parent, sum) {
  const label = sum.activeCount > 0 ? `いま作業中 ${sum.activeCount}件` : "いま作業中のものはありません";
  text(parent, label, 10, sum.activeCount > 0 ? C.accent : C.sub, "medium");
}

function footer(w, info) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const g = info.status && info.status.games;
  if (g) text(row, `ゲーム ${g.live}本公開中`, 10, C.sub);
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
  header(w, info, true);
  w.addSpacer(4);
  todayBlock(w, sum, 30);
  w.addSpacer(2);
  bars(w, sum, 16, 15);
  w.addSpacer();
  const p = sum.projects[0];
  if (p) {
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    dot(row, p.active ? C.accent : C.bar, 6);
    row.addSpacer(4);
    const t = text(row, p.active ? `作業中：${p.name}` : `最後：${p.name} ${ago(p.last.date)}`, 10, p.active ? C.accent : C.sub, "medium");
    t.minimumScaleFactor = 0.8;
  }
  // 小サイズは全体で1つのタップ先しか持てないので、使用状況の画面を開く
  w.url = CONFIG.usageUrl;
}

function buildMedium(w, info, sum) {
  header(w, info);
  w.addSpacer(6);
  const body = w.addStack();
  body.layoutHorizontally();
  const left = body.addStack();
  left.layoutVertically();
  left.size = new Size(110, 0);
  todayBlock(left, sum, 28);
  left.addSpacer(2);
  bars(left, sum, 18, 13);
  body.addSpacer(12);
  const right = body.addStack();
  right.layoutVertically();
  right.spacing = 5;
  projectHeading(right, sum);
  sum.projects.slice(0, 2).forEach((p) => projectRow(right, p, {}));
  if (sum.projects.length === 0) text(right, "この1週間のコミットはありません", 11, C.sub);
  w.addSpacer();
  footer(w, info);
}

function buildLarge(w, info, sum) {
  header(w, info);
  w.addSpacer(10);
  const top = w.addStack();
  top.layoutHorizontally();
  top.bottomAlignContent();
  const left = top.addStack();
  left.layoutVertically();
  todayBlock(left, sum, 40);
  top.addSpacer();
  bars(top, sum, 40, 22);
  w.addSpacer(4);
  const note = text(w, "棒の上の数字＝その日のコミット（作業の区切りごとの保存）の数", 9, C.sub);
  note.minimumScaleFactor = 0.8;
  w.addSpacer(12);
  projectHeading(w, sum);
  w.addSpacer(6);
  const list = w.addStack();
  list.layoutVertically();
  list.spacing = 8;
  sum.projects.slice(0, 4).forEach((p) => projectRow(list, p, { showToday: true, lines: p.active ? 2 : 1 }));
  if (sum.projects.length === 0) text(list, "この1週間のコミットはありません", 12, C.sub);
  w.addSpacer();
  footer(w, info);
}

function buildLockScreen(w, info, sum) {
  const t = w.addText(`Claude Code　今日 ${sum.today}件・今週 ${sum.week}件`);
  t.font = Font.boldSystemFont(12);
  t.lineLimit = 1;
  const p = sum.projects[0];
  if (p) {
    const m = w.addText(p.active ? `作業中：${p.name}　${p.last.message}` : `最後：${p.name}（${ago(p.last.date)}）`);
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
  else if (family === "large") buildLarge(w, info, sum);
  else buildMedium(w, info, sum);
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
