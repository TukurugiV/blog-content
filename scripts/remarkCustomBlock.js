import { visit } from "unist-util-visit";

/**
 * R2の直接URLを構築する
 * @param {string} filename - ファイル名
 * @param {string} category - カテゴリ (downloads, audio, etc.)
 * @returns {string} R2の直接URL
 */
function constructR2Url(filename, category) {
  // 環境変数からR2設定を取得
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${category}/${filename}`;
  } else if (R2_ACCOUNT_ID) {
    return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${category}/${filename}`;
  } else {
    // フォールバック: デフォルトのパブリックURL構造を仮定
    return `https://pub-example.r2.dev/${category}/${filename}`;
  }
}

export function remarkCustomBlocks() {
  return (tree) => {
    visit(tree, "containerDirective", (node) => {
      const data = node.data || (node.data = {});
      const tagName = node.name;
      const attributes = node.attributes || {};

      // 基本的なコンテナ（info, warning, danger, success）
      if (['info', 'warning', 'danger', 'success'].includes(tagName)) {
        data.hName = "div";
        data.hProperties = {
          className: ["custom-block", `custom-block-${tagName}`],
        };
        
        // アイコンを追加
        const iconMap = {
          info: 'ℹ️',
          warning: '⚠️',
          danger: '❌',
          success: '✅'
        };
        
        // 最初に子要素としてアイコンを追加
        node.children.unshift({
          type: 'paragraph',
          children: [{
            type: 'html',
            value: `<div class="custom-block-icon">${iconMap[tagName]}</div>`
          }]
        });
      }
      
      // 画像スライダー
      else if (tagName === 'slider') {
        data.hName = "div";
        data.hProperties = {
          className: ["image-slider"],
          'data-slider': 'true'
        };
        
        // スライダー制御ボタンを追加
        node.children.push({
          type: 'paragraph',
          children: [{
            type: 'html',
            value: `
              <div class="slider-controls">
                <button class="slider-prev" onclick="prevSlide(this)">❮</button>
                <button class="slider-next" onclick="nextSlide(this)">❯</button>
              </div>
              <div class="slider-dots"></div>
            `
          }]
        });
      }
      
      // ファイルダウンロード
      else if (tagName === 'download') {
        const file = attributes.file;
        const name = attributes.name || file || 'Unknown File';
        const url = attributes.url; // オプションでURL指定可能
        
        // ファイルパスを構築（URLが指定されていない場合はR2の直接URLを構築）
        let downloadUrl;
        if (url) {
          downloadUrl = url;
        } else if (file && file.startsWith('http')) {
          downloadUrl = file;
        } else if (file) {
          downloadUrl = constructR2Url(file, 'downloads');
        } else {
          // ファイルが指定されていない場合はエラー表示
          downloadUrl = '#';
        }
        
        data.hName = "div";
        data.hProperties = {
          className: ["download-block"],
        };
        
        node.children = [{
          type: 'paragraph',
          children: [{
            type: 'html',
            value: file ? `
              <div class="download-container">
                <div class="download-icon">📁</div>
                <div class="download-info">
                  <div class="download-name">${name}</div>
                  <div class="download-file">${file}</div>
                </div>
                <a href="${downloadUrl}" class="download-button" download>
                  <span>ダウンロード</span>
                  <span class="download-arrow">⬇️</span>
                </a>
              </div>
            ` : `
              <div class="download-container error">
                <div class="download-icon">⚠️</div>
                <div class="download-info">
                  <div class="download-name">エラー: ファイルが指定されていません</div>
                  <div class="download-file">:::download file="filename.pdf" name="表示名" の形式で指定してください</div>
                </div>
              </div>
            `
          }]
        }];
      }
      
      // オーディオ再生
      else if (tagName === 'audio') {
        const file = attributes.file;
        const name = attributes.name || file || 'Unknown Audio';
        const url = attributes.url; // オプションでURL指定可能
        
        // ファイルパスを構築（URLが指定されていない場合はR2の直接URLを構築）
        let audioUrl;
        if (url) {
          audioUrl = url;
        } else if (file && file.startsWith('http')) {
          audioUrl = file;
        } else if (file) {
          audioUrl = constructR2Url(file, 'audio');
        } else {
          // ファイルが指定されていない場合はエラー表示
          audioUrl = '#';
        }
        
        data.hName = "div";
        data.hProperties = {
          className: ["audio-block"],
        };
        
        node.children = [{
          type: 'paragraph',
          children: [{
            type: 'html',
            value: file ? `
              <div class="audio-player">
                <div class="audio-info">
                  <div class="audio-icon">🎵</div>
                  <div class="audio-name">${name}</div>
                </div>
                <audio controls preload="metadata">
                  <source src="${audioUrl}" type="audio/mpeg">
                  <source src="${audioUrl}" type="audio/wav">
                  <source src="${audioUrl}" type="audio/ogg">
                  お使いのブラウザはオーディオ要素をサポートしていません。
                </audio>
              </div>
            ` : `
              <div class="audio-player error">
                <div class="audio-info">
                  <div class="audio-icon">⚠️</div>
                  <div class="audio-name">エラー: オーディオファイルが指定されていません</div>
                </div>
                <div class="audio-error">:::audio file="filename.mp3" name="表示名" の形式で指定してください</div>
              </div>
            `
          }]
        }];
      }
      
      // その他のカスタムブロック
      else {
        data.hName = "div";
        data.hProperties = {
          className: ["custom-block", `custom-block-${tagName}`],
        };
      }
    });
    
    // コードブロックの拡張処理
    visit(tree, "code", (node) => {
      if (node.lang && node.lang.includes(':')) {
        const [lang, filename] = node.lang.split(':');
        node.lang = lang;
        
        const data = node.data || (node.data = {});
        data.hProperties = {
          ...data.hProperties,
          'data-filename': filename
        };
      }
    });
  };
}
