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
if (!contentType || !['blog', 'event', 'news'].includes(contentType)) {
  console.error('使用方法:');
  console.error('  npm run new new::blog [slug]');
  console.error('  npm run new new::event [slug]');  
  console.error('  npm run new new::news [slug]');
  console.error('');
  console.error('または直接:');
  console.error('  node createContent.js new::blog [slug]');
  console.error('  node createContent.js new::blog -n [slug]');
  console.error('');
  console.error('オプション:');
  console.error('  [slug]     記事のスラッグ名（省略時はUUIDを生成）');
  console.error('  -n [slug]  記事のスラッグ名（省略時はUUIDを生成）');
  process.exit(1);
}

// スラッグ名が指定されていない場合はUUIDを生成
if (!slugName) {
  const uuid = uuidv4();
  slugName = uuid;
}

// スラッグの正規化
slugName = slugName
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

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

const frontmatter = `---
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

async function createContent() {
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