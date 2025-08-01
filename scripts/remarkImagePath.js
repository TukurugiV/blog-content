import { visit } from 'unist-util-visit';

// Markdownの相対パス画像を絶対パスに変換するremarkプラグイン
export function remarkImagePath() {
  return function(tree, file) {
    // ファイルパスからコレクション名を取得
    const filePath = file.history[0] || '';
    let collection = 'blog';
    
    if (filePath.includes('/news/')) {
      collection = 'news';
    } else if (filePath.includes('/events/')) {
      collection = 'events';
    }
    
    visit(tree, 'image', (node) => {
      if (node.url && !node.url.startsWith('http') && !node.url.startsWith('/')) {
        // 相対パスの画像を絶対パスに変換
        if (node.url.startsWith('./')) {
          node.url = `/images/${collection}/${node.url.substring(2)}`;
        } else {
          node.url = `/images/${collection}/${node.url}`;
        }
      }
    });
  };
}