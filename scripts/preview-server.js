import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';
import cors from 'cors';
import chokidar from 'chokidar';
import multer from 'multer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import matter from 'gray-matter';
import { remarkCustomBlocks } from './remarkCustomBlock.js';
import { remarkImagePath } from './remarkImagePath.js';
import { remarkEmbedCards } from './remarkEmbedCards.js';
import { uploadToR2, listR2Files, getCategoryFromMimeType, validateR2Config } from './r2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1.0GB limit
  },
  fileFilter: (req, file, cb) => {
    // 日本語ファイル名のエンコーディングを正規化
    if (file.originalname) {
      // Buffer.from で適切にデコードしてからUTF-8で再エンコード
      try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (error) {
        // エンコーディングエラーの場合はそのまま使用
        console.warn('File encoding warning:', error.message);
      }
    }
    cb(null, true);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Check R2 configuration on startup
const r2Available = validateR2Config();
if (!r2Available) {
  console.warn('⚠️  R2 configuration incomplete. File uploads will use mock data.');
} else {
  console.log('✅ R2 configuration validated.');
}

// Content directory (current directory)
let contentDir = join(__dirname, '..');

// Watch for file changes
const watcher = chokidar.watch(join(contentDir, '**/*.md'), {
  ignored: /^\./, 
  persistent: true
});

// WebSocket for live reload (simple implementation)
const clients = new Set();

// Markdown processor
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkMath)
  .use(remarkEmbedCards)
  .use(remarkCustomBlocks)
  .use(remarkImagePath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

// API Routes
app.get('/api/content/:collection', (req, res) => {
  const { collection } = req.params;
  const collectionPath = join(contentDir, collection);
  
  if (!fs.existsSync(collectionPath)) {
    return res.json([]);
  }
  
  try {
    const files = fs.readdirSync(collectionPath)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = join(collectionPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { data, content: body } = matter(content);
        const slug = file.replace('.md', '');
        
        return {
          slug,
          data,
          body,
          path: filePath
        };
      })
      .sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate));
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/content/:collection/:slug', async (req, res) => {
  const { collection, slug } = req.params;
  const filePath = join(contentDir, collection, `${slug}.md`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: body } = matter(content);
    
    // Process markdown
    const result = await processor.process(body);
    const html = result.toString();
    
    res.json({
      slug,
      data,
      body,
      html,
      path: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new content
app.post('/api/content/:collection', (req, res) => {
  const { collection } = req.params;
  const { slug, title, description, tags = [], author = '創技 光' } = req.body;
  
  const collectionDir = join(contentDir, collection);
  if (!fs.existsSync(collectionDir)) {
    fs.mkdirSync(collectionDir, { recursive: true });
  }
  
  const now = new Date();
  const frontmatter = {
    title,
    description,
    pubDate: now.toISOString(),
    author,
    tags,
    draft: false
  };
  
  const content = `---
title: "${title}"
description: "${description}"
pubDate: ${now.toISOString()}
author: "${author}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
draft: false
---

# ${title}

ここに記事の内容を書いてください。

## サンプルコンテンツ

### 情報ブロック
:::info
これは情報ブロックです。
:::

### 画像スライダー
:::slider
![画像1](https://via.placeholder.com/800x400)
![画像2](https://via.placeholder.com/800x400)
:::

### 数式
インライン数式: $E = mc^2$

ブロック数式:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### コードブロック
\`\`\`javascript:example.js
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### ハイライト
これは==重要な内容==です。

### ダウンロード
:::download
file=sample.pdf
name=サンプルファイル
:::

### オーディオ
:::audio
file=sample.mp3
name=サンプル音声
:::
`;
  
  const filePath = join(collectionDir, `${slug}.md`);
  
  try {
    fs.writeFileSync(filePath, content);
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload files
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type } = req.params;
    const file = req.file;
    
    // ファイルタイプを検証
    const category = getCategoryFromMimeType(file.mimetype, file.originalname);
    
    if (r2Available) {
      // R2にアップロード
      const uploadResult = await uploadToR2(
        file.buffer,
        file.originalname,
        file.mimetype,
        type === 'downloads' ? 'downloads' : category
      );
      
      if (!uploadResult.success) {
        return res.status(500).json({ error: uploadResult.error });
      }
      
      // マークダウン用のテキストを生成
      let markdown;
      if (type === 'downloads' || category === 'downloads') {
        markdown = `:::download\nfile=${uploadResult.fileName}\nname=${file.originalname}\n:::`;
      } else if (type === 'audio' || category === 'audio') {
        markdown = `:::audio{file="${uploadResult.fileName}" name="${file.originalname}"}\n:::`;
      } else if (category === 'images') {
        markdown = `![${file.originalname}](${uploadResult.url})`;
      } else {
        markdown = `[${file.originalname}](${uploadResult.url})`;
      }
      
      res.json({
        success: true,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        size: uploadResult.size,
        category: uploadResult.category,
        markdown
      });
    } else {
      // Mock response when R2 is not available
      const mockExtension = type === 'images' ? 'jpg' : type === 'audio' ? 'mp3' : 'pdf';
      const mockUrl = `https://example.com/${type}/uploaded-file.${mockExtension}`;
      
      let markdown;
      if (type === 'downloads') {
        markdown = `:::download\nfile=uploaded-file.${mockExtension}\nname=${file.originalname}\n:::`;
      } else if (type === 'audio') {
        markdown = `:::audio{file="uploaded-file.${mockExtension}" name="${file.originalname}"}\n:::`;
      } else {
        markdown = `![${file.originalname}](${mockUrl})`;
      }
      
      res.json({
        success: true,
        url: mockUrl,
        fileName: `uploaded-file.${mockExtension}`,
        originalName: file.originalname,
        size: file.size,
        category: type,
        markdown
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// File list
app.get('/api/files/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (r2Available) {
      // R2からファイル一覧を取得
      const category = type === 'files' ? 'downloads' : type;
      const files = await listR2Files(category);
      res.json(files);
    } else {
      // Mock file list when R2 is not available
      const mockFiles = {
        images: [
          { name: 'sample1.jpg', url: 'https://via.placeholder.com/400x300', size: '125KB' },
          { name: 'sample2.png', url: 'https://via.placeholder.com/600x400', size: '89KB' }
        ],
        downloads: [
          { name: 'document.pdf', url: '/downloads/document.pdf', size: '2.3MB' },
          { name: 'spreadsheet.xlsx', url: '/downloads/spreadsheet.xlsx', size: '456KB' }
        ],
        audio: [
          { name: 'bgm.mp3', url: '/audio/bgm.mp3', size: '3.2MB' },
          { name: 'voice.wav', url: '/audio/voice.wav', size: '1.8MB' }
        ]
      };
      
      res.json(mockFiles[type] || []);
    }
  } catch (error) {
    console.error('Error loading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// File proxy endpoint for serving R2 files
app.get('/api/file/:category/:filename', async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    if (r2Available) {
      // R2からファイル一覧を取得してURLを見つける
      const files = await listR2Files(category);
      const file = files.find(f => f.name === filename);
      
      if (file) {
        // R2の公開URLにリダイレクト
        res.redirect(file.url);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } else {
      // Mock files when R2 is not available
      res.status(404).json({ error: 'File not found (R2 not configured)' });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve preview HTML
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ローカル記事プレビュー</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #f5f5f5;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
      display: grid; 
      grid-template-columns: 300px 1fr 300px; 
      gap: 20px; 
    }
    .sidebar { 
      background: white; 
      border-radius: 8px; 
      padding: 20px; 
      height: fit-content;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content { 
      background: white; 
      border-radius: 8px; 
      padding: 30px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content-list { list-style: none; padding: 0; margin: 0; }
    .content-item { 
      padding: 10px; 
      border-bottom: 1px solid #eee; 
      cursor: pointer; 
      transition: background 0.2s;
    }
    .content-item:hover { background: #f9f9f9; }
    .content-item.active { background: #e3f2fd; }
    .content-title { font-weight: 600; margin-bottom: 5px; }
    .content-date { font-size: 12px; color: #666; }
    .btn { 
      padding: 8px 16px; 
      background: #2196f3; 
      color: white; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
      margin: 5px;
    }
    .btn:hover { background: #1976d2; }
    .btn.secondary { background: #757575; }
    .btn.secondary:hover { background: #424242; }
    .form-group { margin-bottom: 15px; }
    .form-label { display: block; margin-bottom: 5px; font-weight: 500; }
    .form-input { 
      width: 100%; 
      padding: 8px; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
    }
    .tabs { 
      display: flex; 
      border-bottom: 1px solid #ddd; 
      margin-bottom: 15px; 
    }
    .tab { 
      padding: 10px 20px; 
      cursor: pointer; 
      border-bottom: 2px solid transparent; 
    }
    .tab.active { 
      border-bottom-color: #2196f3; 
      color: #2196f3; 
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .file-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
      gap: 10px; 
    }
    .file-item { 
      border: 1px solid #ddd; 
      border-radius: 4px; 
      padding: 10px; 
      text-align: center; 
      cursor: pointer;
    }
    .file-item:hover { background: #f9f9f9; }
    .file-name { font-size: 12px; margin-top: 5px; }
    .preview-content h1,
    .preview-content h2,
    .preview-content h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .custom-block { padding: 15px; margin: 15px 0; border-left: 4px solid #ccc; border-radius: 4px; }
    .custom-block-info { background: #e3f2fd; border-left-color: #2196f3; }
    .custom-block-warning { background: #fff3e0; border-left-color: #ff9800; }
    .custom-block-danger { background: #ffebee; border-left-color: #f44336; }
    .custom-block-success { background: #e8f5e8; border-left-color: #4caf50; }
    .image-slider { position: relative; margin: 20px 0; }
    .image-slider img { width: 100%; border-radius: 4px; }
    .download-container, .audio-player { 
      display: flex; 
      align-items: center; 
      gap: 15px; 
      padding: 15px; 
      background: #f9f9f9; 
      border-radius: 4px; 
      margin: 15px 0; 
    }
    .download-button { 
      background: #2196f3; 
      color: white; 
      padding: 8px 16px; 
      text-decoration: none; 
      border-radius: 4px; 
    }
    
    /* Embed Cards */
    .embed-card {
      margin: 20px 0;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .embed-container {
      position: relative;
      width: 100%;
      height: 0;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      overflow: hidden;
    }
    
    .embed-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
    
    .embed-content {
      padding: 15px;
    }
    
    .embed-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 15px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    
    .embed-icon {
      font-size: 16px;
      opacity: 0.7;
    }
    
    .embed-info {
      flex: 1;
    }
    
    .embed-title {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 2px;
    }
    
    .embed-url {
      font-size: 12px;
      color: #666;
      word-break: break-all;
    }
    
    .embed-url a {
      color: #666;
      text-decoration: none;
    }
    
    .embed-url a:hover {
      text-decoration: underline;
    }
    
    /* GitHub specific styles */
    .github-card {
      padding: 15px;
    }
    
    .github-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .github-icon {
      font-size: 20px;
    }
    
    .github-repo {
      font-weight: 600;
      font-size: 16px;
      color: #0366d6;
    }
    
    .github-description {
      font-size: 14px;
      color: #586069;
    }
    
    .github-button {
      display: inline-block;
      padding: 6px 12px;
      background: #0366d6;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .github-button:hover {
      background: #0256cc;
      color: white;
      text-decoration: none;
    }
    
    pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
    mark { background: #ffeb3b; padding: 2px 4px; border-radius: 2px; }
    @media (max-width: 768px) {
      .container { grid-template-columns: 1fr; }
      .sidebar { order: 2; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h3>記事一覧</h3>
      <div style="margin-bottom: 20px;">
        <select id="collectionSelect" class="form-input">
          <option value="blog">ブログ</option>
          <option value="news">ニュース</option>
          <option value="events">イベント</option>
        </select>
      </div>
      <button class="btn" onclick="showNewContentForm()">新規記事作成</button>
      <ul class="content-list" id="contentList"></ul>
      
      <!-- New Content Form -->
      <div id="newContentForm" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
        <h4>新規記事作成</h4>
        <div class="form-group">
          <label class="form-label">タイトル</label>
          <input type="text" id="newTitle" class="form-input" placeholder="記事のタイトル">
        </div>
        <div class="form-group">
          <label class="form-label">説明</label>
          <input type="text" id="newDescription" class="form-input" placeholder="記事の説明">
        </div>
        <div class="form-group">
          <label class="form-label">スラッグ</label>
          <input type="text" id="newSlug" class="form-input" placeholder="url-friendly-slug">
        </div>
        <div class="form-group">
          <label class="form-label">タグ（カンマ区切り）</label>
          <input type="text" id="newTags" class="form-input" placeholder="tag1, tag2, tag3">
        </div>
        <button class="btn" onclick="createContent()">作成</button>
        <button class="btn secondary" onclick="hideNewContentForm()">キャンセル</button>
      </div>
    </div>
    
    <div class="content">
      <div id="contentPreview">
        <h2>記事プレビュー</h2>
        <p>左側から記事を選択してプレビューを表示します。</p>
      </div>
    </div>
    
    <div class="sidebar">
      <h3>ファイル管理</h3>
      <div class="tabs">
        <div class="tab active" onclick="switchTab('images')">画像</div>
        <div class="tab" onclick="switchTab('files')">ファイル</div>
        <div class="tab" onclick="switchTab('audio')">音声</div>
      </div>
      
      <div id="images-tab" class="tab-content active">
        <button class="btn" onclick="uploadFile('images')">画像アップロード</button>
        <div class="file-grid" id="imagesList"></div>
      </div>
      
      <div id="files-tab" class="tab-content">
        <button class="btn" onclick="uploadFile('downloads')">ファイルアップロード</button>
        <div class="file-grid" id="filesList"></div>
      </div>
      
      <div id="audio-tab" class="tab-content">
        <button class="btn" onclick="uploadFile('audio')">音声アップロード</button>
        <div class="file-grid" id="audioList"></div>
      </div>
    </div>
  </div>

  <script>
    let currentCollection = 'blog';
    let currentSlug = null;
    
    // 安全なクリップボードアクセス関数
    async function copyToClipboard(text) {
      try {
        // モダンブラウザでHTTPS環境の場合
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        
        // フォールバック: execCommand（非推奨だが互換性のため）
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          return true;
        }
        
        throw new Error('クリップボードアクセスに失敗しました');
      } catch (error) {
        console.warn('Clipboard access failed:', error);
        return false;
      }
    }
    
    async function loadContent() {
      try {
        const response = await fetch(\`/api/content/\${currentCollection}\`);
        const content = await response.json();
        
        const list = document.getElementById('contentList');
        list.innerHTML = content.map(item => \`
          <li class="content-item" onclick="selectContent('\${item.slug}')">
            <div class="content-title">\${item.data.title}</div>
            <div class="content-date">\${new Date(item.data.pubDate).toLocaleDateString('ja-JP')}</div>
          </li>
        \`).join('');
      } catch (error) {
        console.error('Error loading content:', error);
      }
    }
    
    async function selectContent(slug) {
      try {
        const response = await fetch(\`/api/content/\${currentCollection}/\${slug}\`);
        const item = await response.json();
        
        document.getElementById('contentPreview').innerHTML = \`
          <h1>\${item.data.title}</h1>
          <div style="color: #666; margin-bottom: 20px;">
            <small>作成日: \${new Date(item.data.pubDate).toLocaleDateString('ja-JP')}</small>
            \${item.data.tags ? \` • タグ: \${item.data.tags.join(', ')}\` : ''}
          </div>
          <div class="preview-content">\${item.html}</div>
        \`;
        
        // Update active state
        document.querySelectorAll('.content-item').forEach(el => el.classList.remove('active'));
        event.target.closest('.content-item').classList.add('active');
        
        currentSlug = slug;
      } catch (error) {
        console.error('Error loading content preview:', error);
      }
    }
    
    async function loadFiles(type) {
      try {
        const response = await fetch(\`/api/files/\${type}\`);
        const files = await response.json();
        
        const container = document.getElementById(\`\${type === 'downloads' ? 'files' : type}List\`);
        container.innerHTML = files.map(file => \`
          <div class="file-item" onclick="copyFileMarkdown('\${file.url}', '\${file.name}', '\${type}')">
            \${type === 'images' ? \`<img src="\${file.url}" style="width: 100%; height: 80px; object-fit: cover;" alt="\${file.name}">\` : 
              type === 'audio' ? '🎵' : '📁'}
            <div class="file-name">\${file.name}</div>
            <div style="font-size: 10px; color: #999;">\${file.size}</div>
          </div>
        \`).join('');
      } catch (error) {
        console.error('Error loading files:', error);
      }
    }
    
    async function copyFileMarkdown(url, name, type) {
      let markdown;
      if (type === 'images') {
        markdown = \`![alt text](\${url})\`;
      } else if (type === 'downloads') {
        markdown = \`:::download\\nfile=\${url.split('/').pop()}\\nname=\${name}\\n:::\`;
      } else if (type === 'audio') {
        markdown = \`:::audio{file="\${url.split('/').pop()}" name="\${name}"}\\n:::\`;
      }
      
      const success = await copyToClipboard(markdown);
      if (success) {
        alert('Markdownをクリップボードにコピーしました！');
      } else {
        // クリップボードアクセスに失敗した場合、テキストをアラートで表示
        alert(\`Markdownをクリップボードにコピーできませんでした。\\n以下をコピーしてください：\\n\\n\${markdown}\`);
      }
    }
    
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById(\`\${tab}-tab\`).classList.add('active');
      
      loadFiles(tab === 'files' ? 'downloads' : tab);
    }
    
    function uploadFile(type) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = false;
      
      // ファイルタイプに応じて受け入れ可能な拡張子を設定
      if (type === 'images') {
        input.accept = 'image/*';
      } else if (type === 'audio') {
        input.accept = 'audio/*';
      } else if (type === 'downloads') {
        input.accept = '.pdf,.doc,.docx,.txt,.zip,.rar,.xlsx,.xls,.ppt,.pptx';
      }
      
      input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await fetch(\`/api/upload/\${type}\`, {
            method: 'POST',
            body: formData
          });
          
          const result = await response.json();
          
          if (result.success) {
            // アップロード成功時にマークダウンをクリップボードにコピー
            const clipboardSuccess = await copyToClipboard(result.markdown);
            if (clipboardSuccess) {
              alert(\`ファイルがアップロードされました！\\nマークダウン形式をクリップボードにコピーしました：\\n\\n\${result.markdown}\`);
            } else {
              alert(\`ファイルがアップロードされました！\\nマークダウン形式（手動でコピーしてください）：\\n\\n\${result.markdown}\`);
            }
            
            // ファイル一覧を更新
            loadFiles(type);
          } else {
            alert(\`アップロードに失敗しました: \${result.error}\`);
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert(\`アップロード中にエラーが発生しました: \${error.message}\`);
        }
      };
      
      input.click();
    }
    
    function showNewContentForm() {
      document.getElementById('newContentForm').style.display = 'block';
    }
    
    function hideNewContentForm() {
      document.getElementById('newContentForm').style.display = 'none';
      // Reset form
      ['newTitle', 'newDescription', 'newSlug', 'newTags'].forEach(id => {
        document.getElementById(id).value = '';
      });
    }
    
    async function createContent() {
      const title = document.getElementById('newTitle').value;
      const description = document.getElementById('newDescription').value;
      const slug = document.getElementById('newSlug').value || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tags = document.getElementById('newTags').value.split(',').map(t => t.trim()).filter(t => t);
      
      if (!title || !description) {
        alert('タイトルと説明は必須です');
        return;
      }
      
      try {
        const response = await fetch(\`/api/content/\${currentCollection}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, title, description, tags })
        });
        
        const result = await response.json();
        if (result.success) {
          alert('記事を作成しました！');
          hideNewContentForm();
          loadContent();
        }
      } catch (error) {
        console.error('Error creating content:', error);
        alert('記事の作成に失敗しました');
      }
    }
    
    // Event listeners
    document.getElementById('collectionSelect').addEventListener('change', (e) => {
      currentCollection = e.target.value;
      loadContent();
    });
    
    // Auto-generate slug from title
    document.getElementById('newTitle').addEventListener('input', (e) => {
      const slug = e.target.value.toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g, '-')
        .replace(/^-+|-+$/g, '');
      document.getElementById('newSlug').value = slug;
    });
    
    // Initial load
    loadContent();
    loadFiles('images');
  </script>
</body>
</html>`;
  
  res.send(html);
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 ローカル記事プレビューサーバーが起動しました！

📝 プレビュー: http://localhost:${PORT}
📁 コンテンツディレクトリ: ${contentDir}

機能:
- 記事のリアルタイムプレビュー
- 新規記事作成
- ファイル管理（画像・ダウンロード・音声）
- オリジナルMarkdown記法対応
- 数式表示（KaTeX）
- 画像スライダー

使用方法:
1. ブラウザで http://localhost:${PORT} を開く
2. 左側のリストから記事を選択してプレビュー
3. 「新規記事作成」で新しい記事を作成
4. 右側でファイル管理
  `);
});

// Watch for file changes and notify clients
watcher.on('change', (path) => {
  console.log(`📝 ファイルが変更されました: ${path}`);
  // In a real implementation, this would trigger browser reload via WebSocket
});