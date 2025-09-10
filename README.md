# Othello / Reversi

シンプルな HTML / CSS / JavaScript で動くオセロ（リバーシ）です。

## デモ
- 公開URL: https://takashit24.github.io/test-othello/
- リポジトリ: https://github.com/takashit24/test-othello

## ローカルで遊ぶ
- `index.html` をブラウザで開くだけでOKです。

## GitHub Pages について
- このリポジトリは GitHub Pages で公開する前提になっています。
- `main` ブランチへ push すると、`.github/workflows/pages.yml` により自動デプロイされます。
- ルートに `.nojekyll` を配置しているため、そのまま静的ファイルが配信されます。

## ファイル構成
- `index.html` : レイアウトとUI
- `style.css` : 盤面・駒のスタイル、アニメーション
- `script.js` : ゲームロジック（合法手判定/反転/パス/終局/CPU/取り消し）
- `.nojekyll` : Jekyll無効化（そのまま静的配信）
- `.github/workflows/pages.yml` : GitHub Pages への自動デプロイ

