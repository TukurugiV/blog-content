import { visit } from "unist-util-visit";

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
        const name = attributes.name || file;
        const url = attributes.url; // オプションでURL指定可能
        
        // ファイルパスを構築（URLが指定されていない場合はR2パスを想定）
        const downloadUrl = url || (file.startsWith('http') ? file : `/api/file/downloads/${file}`);
        
        data.hName = "div";
        data.hProperties = {
          className: ["download-block"],
        };
        
        node.children = [{
          type: 'paragraph',
          children: [{
            type: 'html',
            value: `
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
            `
          }]
        }];
      }
      
      // オーディオ再生
      else if (tagName === 'audio') {
        const file = attributes.file;
        const name = attributes.name || file;
        const url = attributes.url; // オプションでURL指定可能
        
        // ファイルパスを構築（URLが指定されていない場合はR2パスを想定）
        const audioUrl = url || (file.startsWith('http') ? file : `/api/file/audio/${file}`);
        
        data.hName = "div";
        data.hProperties = {
          className: ["audio-block"],
        };
        
        node.children = [{
          type: 'paragraph',
          children: [{
            type: 'html',
            value: `
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
