# css-audit
* ページで使用されているcssクラス一覧を取得するGoogle Chrome 拡張機能
* 解析後に3つの形式でjsonをダウンロードできる
* 各jsonの種類
* usedClasses.json：「ページ内で実際に使われていたクラス名の一覧」を記録するファイル。
* fileToClasses.json：「各CSSファイルごとに、そこに定義されているクラス」をまとめたマップ。
* cssIndex.json：「クラス名ごとに、定義されているCSSファイル」を逆引きでまとめたマップ。（＝fileToClasses.json の“逆”の構造）
