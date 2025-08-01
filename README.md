# コンテンツリポジトリテンプレート

このディレクトリには、ブログシステム用のコンテンツファイルが含まれています。

## 📁 ディレクトリ構造

```
content-repo-template/
├── blog/                    # ブログ記事
│   ├── [slug]/
│   │   └── main.md         # 記事のメインファイル
│   └── ...
├── news/                   # ニュース記事
│   ├── [slug]/
│   │   └── main.md
│   └── ...
├── events/                 # イベント記事
│   ├── [slug]/
│   │   └── main.md
│   └── ...
├── config/                 # サイト設定
│   ├── authors.json        # 著者情報
│   └── site.json          # サイト情報
├── config.ts              # Astro Content Collections設定
├── series.ts              # ブログシリーズ設定
└── package.json           # コンテンツ固有の設定
```

## 📝 記事の書き方

### 新しいフォルダ構造

各記事は独自のフォルダを持ち、その中に`main.md`ファイルを配置します：

```
blog/
├── my-article/
│   ├── main.md           # メインの記事ファイル
│   ├── images/          # 記事専用の画像（オプション）
│   └── assets/          # 記事専用のアセット（オプション）
```

### フロントマターの例

```markdown
---
title: "記事のタイトル"
description: "記事の説明文"
pubDate: 2025-01-31T10:00:00Z
updatedDate: 2025-01-31T15:30:00Z  # オプション
author: "創技 光"
tags: ["タグ1", "タグ2", "タグ3"]
draft: false
cover: "/images/covers/blog/my-cover.jpg"  # オプション
coverAlt: "カバー画像の説明"              # オプション
series: "web-development-basics"          # オプション：シリーズID
seriesNumber: 1                          # オプション：シリーズ内の順番
---

# 記事のタイトル

記事の内容をここに書きます...
```

## 🎨 カスタムMarkdown記法

このブログシステムでは、以下のカスタム記法をサポートしています：

### 情報ボックス

```markdown
:::info
重要な情報をここに書きます
:::

:::warning
注意事項をここに書きます
:::

:::danger
危険な内容をここに書きます
:::

:::success
成功のメッセージをここに書きます
:::
```

### ファイルダウンロード

```markdown
:::download
file=document.pdf
name=重要な文書
:::
```

### オーディオプレーヤー

```markdown
:::audio
file=bgm.mp3
name=背景音楽
:::
```

### 数式表示

```markdown
$$
E = mc^2
$$

インライン数式: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$
```

### コードブロック

```javascript:filename.js
console.log("Hello, World!");
```

## 🔗 埋め込み機能

URLを単独の段落に記載すると、自動的に埋め込み形式で表示されます：

### YouTube
```
https://www.youtube.com/watch?v=VIDEO_ID
```

### Twitter
```
https://twitter.com/user/status/TWEET_ID
```

### GitHub
```
https://github.com/owner/repository
```

## 📚 シリーズ機能

関連する記事をシリーズとしてグループ化できます：

1. `series.ts`でシリーズを定義
2. 記事のフロントマターで`series`と`seriesNumber`を指定
3. 自動的にナビゲーションが生成されます

## 🚀 使用方法

### 新規記事作成

```bash
# 新しい記事を作成
npm run new

# または直接フォルダを作成
mkdir blog/my-new-article
echo "---\ntitle: \"新しい記事\"\n---\n\n# 新しい記事" > blog/my-new-article/main.md
```

### プレビュー

```bash
# ローカルプレビューサーバーを起動
npm run preview:local
```

### ビルド

```bash
# サイトをビルド
npm run build
```

## 📋 記事管理のベストプラクティス

1. **スラッグ名は英語で**: `my-article-name`形式
2. **画像は適切なサイズに**: 記事用画像は適切な解像度に調整
3. **タグは統一**: 既存のタグを再利用して一貫性を保つ
4. **下書き機能**: `draft: true`で下書き保存
5. **更新日**: 記事を更新したら`updatedDate`を設定

## 🔧 技術仕様

- **Markdown処理**: Astro Content Collections + remark/rehype
- **画像処理**: Astro Image Service
- **検索**: タグベースのフィルタリング
- **RSS**: 自動生成
- **サイトマップ**: 自動生成
- **OGP画像**: 自動生成（1200x630px）

## 📊 現在のコンテンツ

### ブログ記事
- **astro-blog-introduction**: Astroでブログサイトを構築してみた
- **web-development-trends-2025**: 2025年のWeb開発トレンド予測
- **embed-test**: 埋め込み機能テスト
- **sample-post**: サンプル記事タイトル

### ニュース記事
- **monthly-update-january**: 1月のアップデート情報
- **site-launch-announcement**: サイト公開のお知らせ

### イベント記事
- **web-development-workshop**: Web開発ワークショップ開催
- **education-tech-seminar**: 教育テクノロジーセミナー

## 🚀 デプロイの仕組み

1. コンテンツをプッシュ
2. GitHub Actionsがビルドをトリガー
3. Cloudflare Pagesに自動デプロイ
4. サイトが更新される

---

**最終更新**: 2025年1月31日