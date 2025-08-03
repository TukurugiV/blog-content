---
title: "New Blog Post"
description: "Blog post description"
pubDate: 2024-08-20-21:43:00
author: "創技 光"
tags: []
draft: false

---

# ブログシステム カスタムMarkdown記法

このブログシステムで使用できるオリジナルのMarkdown記法をまとめています。

## 1. カスタムブロック記法

### アラート・コールアウトブロック

情報の種類に応じて異なるスタイルのブロックを作成できます。

```markdown
:::info
これは情報ブロックです。ℹ️ アイコンが表示されます。
:::

:::warning
これは警告ブロックです。⚠️ アイコンが表示されます。
:::

:::danger
これは危険・エラーブロックです。❌ アイコンが表示されます。
:::

:::success
これは成功ブロックです。✅ アイコンが表示されます。
:::
```

### 画像スライダー

複数の画像をスライドショーとして表示できます。

```markdown
:::slider
![画像1](./image1.jpg)
![画像2](./image2.jpg)
![画像3](./image3.jpg)
:::
```

- 自動でナビゲーションコントロールとドットが追加されます
- インタラクティブなスライドショー機能付き

### ファイルダウンロードブロック

ダウンロード可能なファイルへのリンクを美しく表示できます。

```markdown
:::download file="sample.pdf" name="サンプルドキュメント"
:::

:::download url="https://example.com/file.pdf" name="外部ファイル"
:::
```

- `file`: ローカルファイル（R2ストレージ経由）
- `url`: 外部URL
- ファイルアイコン付きのスタイル付きダウンロードカード

### オーディオプレイヤーブロック

音声ファイルをカスタムプレイヤーで再生できます。

```markdown
:::audio file="sample.mp3" name="サンプル音声"
:::

:::audio url="https://example.com/audio.mp3" name="外部音声"
:::
```

- 再生/一時停止、プログレスバー、音量コントロール付き
- キーボードショートカット対応（スペース、矢印キー）
- ローカルファイル（R2ストレージ）または外部URL対応

## 2. 自動埋め込み機能

URLを単独で記述すると、自動的にリッチな埋め込みカードに変換されます。

### YouTube
```markdown
https://www.youtube.com/watch?v=YgjQnrMu6rw
```

### Twitter/X
```markdown
https://x.com/Tukurugi_V/status/1889992929873207761
```

## 3. テキストハイライト

テキストをマーカーでハイライトできます。

```markdown
これは==ハイライトされたテキスト==です。
```

## 4. ファイル名付きコードブロック

コードブロックにファイル名を表示できます。

```markdown
```javascript:example.js
function hello() {
  console.log("Hello, World!");
}
```
```

```javascript:example.js
function hello() {
  console.log("Hello, World!");
}
```

## 5. 数式記法

KaTeXを使用した数式表示に対応しています。

```markdown
インライン数式: $E = mc^2$

ブロック数式:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

## 6. 画像パス処理

相対パスの画像は自動的に絶対パスに変換されます。

```markdown
![画像](./image.jpg)
# ↓ 自動変換
# /images/blog/post-slug/image.jpg
```

## 7. フロントマター拡張

### ブログ記事

```yaml
---
title: "記事タイトル"
description: "記事の説明"
pubDate: 2024-01-15
updatedDate: 2024-01-16  # 任意
author: "著者名"          # デフォルト: "創技 光"
tags: ["tag1", "tag2"]   # デフォルト: []
draft: false             # デフォルト: false
cover: "cover-image.jpg" # 任意
coverAlt: "代替テキスト"   # 任意
seriesId: "series-name"  # 任意 - シリーズ機能用
seriesNumber: 1          # 任意 - シリーズ内の順序
---
```

### イベント記事

ブログの基本フィールドに加えて：

```yaml
---
eventDate: 2024-01-15      # 必須
eventEndDate: 2024-01-16   # 任意
location: "イベント会場"    # 任意
---
```

## 8. HTMLオーディオ拡張

標準の `<audio>` タグも自動的にカスタムプレイヤーに変換されます。

```html
<audio src="path/to/audio.mp3" controls></audio>
```

## 9. シリーズ機能

記事をシリーズとしてグループ化できます。

```yaml
---
seriesId: "tutorial-series"  # シリーズID
seriesNumber: 1              # シリーズ内の順序
---
```

## 10. レスポンシブ対応

すべてのカスタム要素は以下の機能を持ちます：

- モバイル対応のレスポンシブデザイン
- ダークモード対応（オーディオプレイヤーなど）
- キーボードナビゲーション対応
- 適切なARIAラベルとセマンティックHTML

## 使用例

```markdown
---
title: "カスタム記法の使用例"
description: "ブログシステムのオリジナル記法を使った記事"
pubDate: 2024-01-15
tags: ["tutorial", "markdown"]
---

# カスタム記法の使用例

## 重要な情報

:::info
この記事では、ブログシステムのカスタム記法について説明します。
:::

## コードサンプル

```javascript:sample.js
function greet(name) {
  return `Hello, ${name}!`;
}
```

## 音声ファイル

:::audio file="introduction.mp3" name="紹介音声"
:::

## ダウンロード資料

:::download file="guide.pdf" name="学習ガイド"
:::

## 数式

確率密度関数: $f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}$

## YouTube動画

https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

このカスタム記法により、標準のMarkdownを大幅に拡張し、リッチなコンテンツを簡単に作成できます。