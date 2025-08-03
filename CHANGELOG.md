# Changelog - blog-content

blog-contentディレクトリの変更履歴

---

## 📅 2025-08-03 - シリーズ機能対応

### 🎯 主要な変更

#### 1. createContent.js の拡張

**新しいコマンドの追加**:
```bash
# シリーズを作成
npm run new new::series [series-id]

# シリーズ記事を作成  
npm run new new::series-post [series-id/post-id]
```

**使用例**:
```bash
# Web開発基礎シリーズを作成
npm run new new::series web-development-basics

# シリーズの第1回記事を作成
npm run new new::series-post web-development-basics/html-basics

# シリーズの第2回記事を作成
npm run new new::series-post web-development-basics/css-fundamentals
```

#### 2. 新しいフォルダ構造

**シリーズの構造例**:
```
blog/
├── web-development-basics/       # シリーズフォルダ
│   ├── series.json              # シリーズ設定
│   ├── README.md               # 管理ガイド
│   ├── html-basics/            # 第1回記事
│   │   ├── main.md
│   │   ├── cover.png
│   │   └── images/
│   ├── css-fundamentals/       # 第2回記事
│   │   ├── main.md
│   │   └── assets/
│   └── javascript-intro/       # 第3回記事
│       ├── main.md
│       └── demo/
└── regular-post/               # 通常の記事
    ├── main.md
    └── cover.png
```

#### 3. series.json 設定ファイル

**自動生成される設定例**:
```json
{
  "name": "Web Development Basics",
  "description": "web-development-basics シリーズの説明",
  "color": "#4299e1",
  "icon": "📚",
  "order": 0
}
```

**カスタマイズ可能な項目**:
- `name`: シリーズの表示名
- `description`: シリーズの説明文
- `color`: シリーズのテーマカラー（HEX）
- `icon`: シリーズのアイコン（絵文字）
- `order`: シリーズ一覧での表示順序

### 🚀 新機能

#### 1. 自動README生成
- 各シリーズフォルダに管理ガイドを自動生成
- フォルダ構造の説明
- 記事作成方法の案内
- 設定項目の説明

#### 2. シリーズ記事テンプレート
- シリーズに特化したフロントマター
- シリーズ名の自動設定
- 適切なタグの自動付与
- 次回予告セクションの追加

#### 3. バリデーション機能
- シリーズ存在チェック
- 重複記事の検出
- 適切なスラッグ形式の検証

### 📁 生成されるファイル例

#### シリーズ作成時
```
web-development-basics/
├── series.json          # シリーズ設定
└── README.md            # 管理ガイド
```

#### シリーズ記事作成時
```
web-development-basics/html-basics/
├── main.md              # 記事本文
└── [画像・ファイル配置場所]
```

**記事のフロントマター例**:
```yaml
---
title: "Html Basics"
description: "Web Development Basicsシリーズの記事"
pubDate: 2025-08-03T12:00:00.000Z
author: "創技 光"
tags: ["web-development-basics", "シリーズ"]
draft: false
cover: "./cover.png"
coverAlt: "Html Basicsのカバー画像"
---
```

### 🔧 技術的な改善

#### 1. エラーハンドリング強化
- 適切なエラーメッセージ表示
- 前提条件のチェック
- プロセス終了の適切な処理

#### 2. パス解決の改善
- 相対パスの正しい処理
- クロスプラットフォーム対応
- ディレクトリ存在チェック

#### 3. JSON設定の自動生成
- 適切なインデント設定
- デフォルト値の提供
- 設定の拡張性確保

### 📖 使用方法

#### 1. 新しいシリーズの開始
```bash
# シリーズを作成
npm run new new::series my-tutorial-series

# series.jsonを編集してシリーズ情報をカスタマイズ
# - name: シリーズの正式名称
# - description: 詳細な説明
# - color: ブランドカラー
# - icon: 視覚的アイコン
```

#### 2. シリーズ記事の追加
```bash
# 第1回記事
npm run new new::series-post my-tutorial-series/introduction

# 第2回記事
npm run new new::series-post my-tutorial-series/getting-started

# 第3回記事
npm run new new::series-post my-tutorial-series/advanced-topics
```

#### 3. 従来の記事作成（変更なし）
```bash
# 通常の記事作成は従来通り
npm run new new::blog my-article
npm run new new::news announcement
npm run new new::event workshop-2025
```

### 🔄 移行について

#### 後方互換性
- **既存の記事**: そのまま動作継続
- **従来のコマンド**: 全て利用可能
- **フォルダ構造**: 混在利用可能

#### 推奨される使い分け
- **シリーズ記事**: 新しいフォルダ構造を使用
- **単発記事**: 従来の構造で問題なし
- **段階的移行**: 必要に応じて少しずつ移行

### 📋 今後の改善予定

#### 短期
- [ ] シリーズ記事の順序管理機能
- [ ] 記事間のナビゲーション改善
- [ ] カバー画像の自動生成

#### 中期  
- [ ] シリーズの統計情報表示
- [ ] 記事の依存関係管理
- [ ] 進捗トラッキング機能

---

**💡 ヒント**:
- シリーズ名は短く、わかりやすいものにしてください
- 記事IDには順序を示す番号を含めることを推奨します（例：`01-introduction`）
- カバー画像は各記事フォルダに配置することで管理が簡単になります

**🆘 サポート**:
問題や質問がある場合は、メインプロジェクトのIssueまでお気軽にお寄せください。