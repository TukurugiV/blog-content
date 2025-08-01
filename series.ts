// シリーズの定義
export interface Series {
  id: string;
  name: string;
  description: string;
  color?: string;
  icon?: string;
}

// シリーズ情報の定義
export const SERIES: Record<string, Series> = {
  'web-development-basics': {
    id: 'web-development-basics',
    name: 'Web開発入門',
    description: 'Web開発の基礎から応用まで、順序立てて学習できるシリーズです。',
    color: '#4299e1',
    icon: '🌐'
  },
  'astro-tutorial': {
    id: 'astro-tutorial',
    name: 'Astroチュートリアル',
    description: 'AstroフレームワークでWebサイトを構築する方法を学ぶシリーズです。',
    color: '#ff6b35',
    icon: '🚀'
  },
  'modern-css': {
    id: 'modern-css',
    name: 'モダンCSS技術',
    description: 'CSS Grid、Flexbox、CSS Customプロパティなど、モダンなCSS技術を解説します。',
    color: '#48bb78',
    icon: '🎨'
  },
  'javascript-advanced': {
    id: 'javascript-advanced',
    name: 'JavaScript上級編',
    description: 'JavaScriptの高度な概念とパターンを学ぶシリーズです。',
    color: '#ed8936',
    icon: '⚡'
  }
};

// シリーズIDから情報を取得
export function getSeriesById(seriesId: string): Series | undefined {
  return SERIES[seriesId];
}

// すべてのシリーズを取得
export function getAllSeries(): Series[] {
  return Object.values(SERIES);
}