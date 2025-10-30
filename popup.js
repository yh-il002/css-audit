function parseClassesFromCss(cssText) {
  // ざっくりパーサ：セレクタ部分だけを対象にし、.class を抽出
  const classes = new Set();
  // コメント除去
  const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  // 各ルールのセレクタ部分（{ の手前）を走査
  const ruleRe = /([^{]+)\{/g;
  let m;
  while ((m = ruleRe.exec(noComments))) {
    const selectors = m[1].split(",");
    for (const sel of selectors) {
      const re = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
      let s;
      while ((s = re.exec(sel))) classes.add(s[1]);
    }
  }
  return classes;
}

function downloadJson(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById("run").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "解析中…";

  const tab = await getActiveTab();

  // content.js のスナップショットを評価
  const [{ result: snap }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.__CSS_AUDIT__?.getSnapshot?.()
  });

  if (!snap) {
    status.textContent = "ページ準備中（再試行してください）";
    return;
  }

  // 外部CSSをバックグラウンド経由で取得（@importも展開）
  const resp = await chrome.runtime.sendMessage({
    type: "FETCH_CSS_BULK",
    hrefs: snap.styles.links
  });

  const externalCss = (resp?.payload || []).map(x => ({ url: x.url, text: x.text }));
  const inlineCss = snap.styles.inline.map(x => ({
    url: `${x.id}${x.attrs ? ` (${x.attrs})` : ""}`,
    text: x.text
  }));
  const allCss = [...externalCss, ...inlineCss];

  // 解析：クラス → ファイル、ファイル → クラス
  const classToFiles = new Map();
  const fileToClasses = new Map();
  for (const { url, text } of allCss) {
    const set = parseClassesFromCss(text);
    fileToClasses.set(url, Array.from(set).sort());
    for (const c of set) {
      if (!classToFiles.has(c)) classToFiles.set(c, new Set());
      classToFiles.get(c).add(url);
    }
  }

  // 出力オブジェクト
  const usedClasses = snap.usedClasses;
  const cssIndex = Object.fromEntries(
    Array.from(classToFiles.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([cls, files]) => [cls, Array.from(files).sort()])
  );
  const fileMap = Object.fromEntries(
    Array.from(fileToClasses.entries())
      .sort(([a],[b]) => a.localeCompare(b))
  );

  // UI反映
  document.getElementById("count-used").textContent = `used: ${usedClasses.length}`;
  document.getElementById("count-css").textContent = `css files: ${allCss.length}`;
  document.getElementById("count-classes").textContent =
    `defined classes: ${Object.keys(cssIndex).length}`;
  document.getElementById("preview").textContent =
    JSON.stringify({ sample_cssIndex: Object.fromEntries(Object.entries(cssIndex).slice(0, 10)) }, null, 2);

  // 保存ボタン
  document.getElementById("save-used").onclick = () => downloadJson("usedClasses.json", usedClasses);
  document.getElementById("save-filemap").onclick = () => downloadJson("fileToClasses.json", fileMap);
  document.getElementById("save-index").onclick = () => downloadJson("cssIndex.json", cssIndex);

  status.textContent = "完了！";
});
