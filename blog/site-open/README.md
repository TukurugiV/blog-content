# New Blog Post

この記事用のファイル管理ディレクトリです。

## ファイル構成

- `main.md` - 記事のメインコンテンツ
- `*.jpg, *.png, *.gif` - 記事で使用する画像
- `*.pdf, *.docx` - ダウンロード用ファイル
- `*.mp3, *.wav` - オーディオファイル

## 画像の使用方法

### 相対パス参照
```markdown
![alt text](./image.jpg)
```

### 画像スライダー
```markdown
:::slider
![画像1](./image1.jpg)
![画像2](./image2.jpg)
:::
```

## ファイルダウンロード

```markdown
:::download
file=document.pdf
name=ドキュメント名
:::
```

## オーディオファイル

```markdown
:::audio
file=audio.mp3
name=音声タイトル
:::
```
