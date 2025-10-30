// DOMに実際に付与されているクラス一覧
function collectUsedClasses() {
  const set = new Set();
  document.querySelectorAll("[class]").forEach(el => {
    String(el.className)
      .split(/\s+/).filter(Boolean)
      .forEach(c => set.add(c));
  });
  return Array.from(set).sort();
}

// ページが参照するCSS（外部href）とインライン<style>を収集
function collectStyles() {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .map(l => l.href || l.getAttribute("href"))
    .filter(Boolean);
  const inline = Array.from(document.querySelectorAll("style"))
    .map((s, i) => ({
      id: `inline-style-${i}`,
      attrs: Array.from(s.attributes).map(a => `${a.name}=${a.value}`).join(" "),
      text: s.textContent || ""
    }));
  return { links, inline };
}

window.__CSS_AUDIT__ = {
  getSnapshot() {
    return {
      url: location.href,
      usedClasses: collectUsedClasses(),
      styles: collectStyles()
    };
  }
};
