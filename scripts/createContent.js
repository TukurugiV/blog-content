#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// コマンドライン引数をパース
const args = process.argv.slice(2);
let contentType = '';
let slugName = '';

// 引数を解析
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg.startsWith('new::')) {
    contentType = arg.replace('new::', '');
  } else if (arg === '-n' && i + 1 < args.length) {
    slugName = args[i + 1];
    i++; // 次の引数をスキップ
  } else if (!arg.startsWith('new::') && !arg.startsWith('-') && !slugName) {
    // 位置引数として slug を受け取る
    slugName = arg;
  }
}

// バリデーション
if (!contentType || !['blog', 'event', 'news', 'series', 'series-post'].includes(contentType)) {
  console.error('使用方法:');
  console.error('  npm run new new::blog [slug]');
  console.error('  npm run new new::event [slug]');  
  console.error('  npm run new new::news [slug]');
  console.error('  npm run new new::series [series-id]');
  console.error('  npm run new new::series-post [series-id/post-id]');
  console.error('');
  console.error('または直接:');
  console.error('  node createContent.js new::blog [slug]');
  console.error('  node createContent.js new::series -n [series-id]');
  console.error('  node createContent.js new::series-post -n [series-id/post-id]');
  console.error('');
  console.error('オプション:');
  console.error('  [slug]     記事のスラッグ名（省略時はUUIDを生成）');
  console.error('  -n [slug]  記事のスラッグ名（省略時はUUIDを生成）');
  console.error('');
  console.error('シリーズ例:');
  console.error('  # シリーズを作成');
  console.error('  npm run new new::series web-development-basics');
  console.error('  # シリーズの記事を作成');
  console.error('  npm run new new::series-post web-development-basics/html-basics');
  process.exit(1);
}

// スラッグ名が指定されていない場合はUUIDを生成
if (!slugName) {
  const uuid = uuidv4();
  slugName = uuid;
}

// スラッグの正規化（series-post の場合は '/' を保持）
if (contentType !== 'series-post') {
  slugName = slugName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
} else {
  // series-post の場合は '/' を保持して個別に正規化
  const parts = slugName.split('/');
  slugName = parts.map(part => 
    part
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  ).join('/');
}

// コンテンツタイプに応じたディレクトリ名
const dirMapping = {
  'blog': 'blog',
  'event': 'events',
  'news': 'news'
};

const contentDir = dirMapping[contentType];
const now = new Date();

// フロントマターテンプレート
const templates = {
  blog: {
    title: 'New Blog Post',
    description: 'Blog post description',
    additionalFields: ''
  },
  event: {
    title: 'New Event',
    description: 'Event description',
    additionalFields: `eventDate: ${now.toISOString()}
eventEndDate: ${now.toISOString()}
location: "TBD"`
  },
  news: {
    title: 'News Update',
    description: 'News description',
    additionalFields: ''
  }
};

const template = templates[contentType];

// シリーズ関連の場合はフロントマターを作成しない
let frontmatter = '';
if (template) {
  frontmatter = `---
title: "${template.title}"
description: "${template.description}"
pubDate: ${now.toISOString()}
author: "創技 光"
tags: []
draft: false
${template.additionalFields}
---

# ${template.title}

ここに${contentType === 'blog' ? 'ブログ記事' : contentType === 'event' ? 'イベント' : 'ニュース'}の内容を記述してください。

## 見出し2

記事の内容...

### オリジナル記法の例

#### 情報ブロック
:::info
これは情報ブロックです。
:::

#### 警告ブロック
:::warning
これは警告ブロックです。
:::

#### エラーブロック
:::danger
これはエラーブロックです。
:::

#### 成功ブロック
:::success
これは成功ブロックです。
:::

#### 画像スライダー
:::slider
![画像1](./image1.jpg)
![画像2](./image2.jpg)
![画像3](./image3.jpg)
:::

#### 数式
インライン数式: $E = mc^2$

ブロック数式:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

#### ハイライト
これは==重要な内容==です。

#### コードブロック（ファイル名付き）
\`\`\`javascript:example.js
function hello() {
  console.log("Hello, World!");
}
\`\`\`

#### ダウンロード
:::download
file=sample.pdf
name=サンプルファイル
:::

#### オーディオ
:::audio
file=sample.mp3
name=サンプル音声
:::

## まとめ

記事のまとめ...
`;
}

async function createSeries(seriesId) {
  try {
    const seriesDir = path.join(__dirname, '..', 'blog', seriesId);
    
    // 既に存在する場合はエラー
    if (await fs.pathExists(seriesDir)) {
      console.error(`❌ エラー: シリーズ "${seriesId}" は既に存在します`);
      console.error(`   パス: ${seriesDir}`);
      process.exit(1);
    }
    
    // シリーズディレクトリを作成
    await fs.ensureDir(seriesDir);
    
    // series.json を作成
    const seriesConfig = {
      name: seriesId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `${seriesId} シリーズの説明`,
      color: '#4299e1',
      icon: '📚',
      order: 0
    };
    
    await fs.writeJSON(path.join(seriesDir, 'series.json'), seriesConfig, { spaces: 2 });
    
    // README.md を作成
    const readmeContent = `# ${seriesConfig.name}

${seriesConfig.description}

## シリーズ構成

このディレクトリには以下の構造で記事を配置してください：

\`\`\`
${seriesId}/
├── series.json          # シリーズ設定
├── README.md           # このファイル
├── 01-first-post/      # 第1回の記事
│   ├── main.md
│   └── cover.png
├── 02-second-post/     # 第2回の記事
│   ├── main.md
│   └── cover.png
└── ...
\`\`\`

## 記事の作成方法

新しい記事を追加するには：

\`\`\`bash
npm run new new::series-post ${seriesId}/post-name
\`\`\`

## シリーズ設定

\`series.json\` で以下の設定を変更できます：

- \`name\`: シリーズ名
- \`description\`: シリーズの説明
- \`color\`: シリーズのテーマカラー
- \`icon\`: シリーズのアイコン（絵文字）
- \`order\`: シリーズ一覧での表示順序
`;
    
    await fs.writeFile(path.join(seriesDir, 'README.md'), readmeContent);
    
    console.log('✅ シリーズが正常に作成されました！');
    console.log('');
    console.log(`📚 シリーズID: ${seriesId}`);
    console.log(`📁 パス: ${seriesDir}`);
    console.log(`🌐 URL: /series/${seriesId}`);
    console.log('');
    console.log('📝 次のステップ:');
    console.log(`1. ${path.join(seriesDir, 'series.json')} を編集してシリーズ情報を設定`);
    console.log(`2. 記事を作成: npm run new new::series-post ${seriesId}/first-post`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

async function createSeriesPost(fullSlug) {
  try {
    const [seriesId, postId] = fullSlug.split('/');
    
    if (!seriesId || !postId) {
      console.error('❌ エラー: シリーズ記事のスラッグは "series-id/post-id" の形式で指定してください');
      process.exit(1);
    }
    
    const seriesDir = path.join(__dirname, '..', 'blog', seriesId);
    const postDir = path.join(seriesDir, postId);
    const postPath = path.join(postDir, 'main.md');
    
    // シリーズが存在するかチェック
    if (!(await fs.pathExists(seriesDir))) {
      console.error(`❌ エラー: シリーズ "${seriesId}" が存在しません`);
      console.error(`先にシリーズを作成してください: npm run new new::series ${seriesId}`);
      process.exit(1);
    }
    
    // 既に存在する場合はエラー
    if (await fs.pathExists(postPath)) {
      console.error(`❌ エラー: 記事 "${fullSlug}" は既に存在します`);
      console.error(`   パス: ${postPath}`);
      process.exit(1);
    }
    
    // 記事ディレクトリを作成
    await fs.ensureDir(postDir);
    
    // シリーズ設定を読み込み
    let seriesConfig = { name: seriesId };
    try {
      seriesConfig = await fs.readJSON(path.join(seriesDir, 'series.json'));
    } catch {
      // series.jsonが存在しない場合はデフォルト値を使用
    }
    
    const postTitle = postId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const frontmatter = `---
title: "${postTitle}"
description: "${seriesConfig.name}シリーズの記事"
pubDate: ${new Date().toISOString()}
author: "創技 光"
tags: ["${seriesId}", "シリーズ"]
draft: false
cover: "./cover.png"
coverAlt: "${postTitle}のカバー画像"
---

# ${postTitle}

${seriesConfig.name}シリーズの記事です。

## 概要

この記事では...について説明します。

## 内容

### セクション1

記事の内容...

### セクション2

記事の内容...

## まとめ

この記事のまとめ...

## 次回予告

次回は...について解説します。
`;
    
    await fs.writeFile(postPath, frontmatter);
    
    console.log('✅ シリーズ記事が正常に作成されました！');
    console.log('');
    console.log(`📚 シリーズ: ${seriesConfig.name}`);
    console.log(`📝 記事: ${postTitle}`);
    console.log(`📁 パス: ${postPath}`);
    console.log(`🌐 URL: /blog/${fullSlug}`);
    console.log('');
    console.log('📖 編集を開始してください:');
    console.log(`   ${postPath}`);
    console.log('');
    console.log('🖼️  画像やファイルは以下のディレクトリに配置してください:');
    console.log(`   ${postDir}/`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

async function createContent() {
  // シリーズ関連の処理
  if (contentType === 'series') {
    return await createSeries(slugName);
  }
  
  if (contentType === 'series-post') {
    return await createSeriesPost(slugName);
  }
  
  try {
    // ディレクトリが存在しない場合は作成（スタンドアロンでは現在のディレクトリから）
    const baseDir = path.join(__dirname, '..', contentDir);
    await fs.ensureDir(baseDir);
    
    // 新しい構造: [collection]/[slug]/main.md
    const articleDir = path.join(baseDir, slugName);
    const articlePath = path.join(articleDir, 'main.md');
    
    // 既に存在する場合はエラー
    if (await fs.pathExists(articlePath)) {
      console.error(`❌ エラー: 記事 "${slugName}" は既に存在します`);
      console.error(`   パス: ${articlePath}`);
      process.exit(1);
    }
    
    // ディレクトリを作成
    await fs.ensureDir(articleDir);
    
    // 記事ファイルを作成
    await fs.writeFile(articlePath, frontmatter);
    
    // README.mdも作成（画像やファイル管理のガイド用）
    const readmeContent = `# ${template.title}

この記事用のファイル管理ディレクトリです。

## ファイル構成

- \`main.md\` - 記事のメインコンテンツ
- \`*.jpg, *.png, *.gif\` - 記事で使用する画像
- \`*.pdf, *.docx\` - ダウンロード用ファイル
- \`*.mp3, *.wav\` - オーディオファイル

## 画像の使用方法

### 相対パス参照
\`\`\`markdown
![alt text](./image.jpg)
\`\`\`

### 画像スライダー
\`\`\`markdown
:::slider
![画像1](./image1.jpg)
![画像2](./image2.jpg)
:::
\`\`\`

## ファイルダウンロード

\`\`\`markdown
:::download
file=document.pdf
name=ドキュメント名
:::
\`\`\`

## オーディオファイル

\`\`\`markdown
:::audio
file=audio.mp3
name=音声タイトル
:::
\`\`\`
`;
    
    await fs.writeFile(path.join(articleDir, 'README.md'), readmeContent);
    
    console.log('✅ 記事が正常に作成されました！');
    console.log('');
    console.log(`📝 タイプ: ${contentType}`);
    console.log(`🔗 スラッグ: ${slugName}`);
    console.log(`📁 パス: ${articlePath}`);
    console.log(`🌐 URL: /${contentDir}/${slugName}`);
    console.log('');
    console.log('📖 編集を開始してください:');
    console.log(`   ${articlePath}`);
    console.log('');
    console.log('🖼️  画像やファイルは以下のディレクトリに配置してください:');
    console.log(`   ${articleDir}/`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

createContent();