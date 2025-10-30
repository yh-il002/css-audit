// 可能な限り @import を辿ってCSS本文を返す
async function fetchCssWithImports(url, visited = new Set()) {
  if (!url || visited.has(url)) return [];
  visited.add(url);

  const results = [];
  try {
    const resp = await fetch(url, { credentials: "omit" });
    const text = await resp.text();
    results.push({ url, text });

    // @import の抽出
    const importRe = /@import\s+(?:url\(([^)]+)\)|["']([^"']+)["'])/g;
    let m;
    while ((m = importRe.exec(text))) {
      const raw = (m[1] ?? m[2] ?? "").trim().replace(/^['"]|['"]$/g, "");
      try {
        const abs = new URL(raw, url).toString();
        const nested = await fetchCssWithImports(abs, visited);
        results.push(...nested);
      } catch { /* 無視 */ }
    }
  } catch { /* 取得失敗はスキップ */ }

  return results;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "FETCH_CSS_BULK") {
      const out = [];
      for (const href of msg.hrefs || []) {
        const items = await fetchCssWithImports(href);
        out.push(...items);
      }
      sendResponse({ ok: true, payload: out });
    }
  })();
  // true を返すと sendResponse の非同期を許可
  return true;
});
