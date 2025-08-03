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
  'cooking-memo': {
    id: 'cooking-memo',
    name: '料理メモ',
    description: '日常の試行錯誤で生まれた料理のメモをするシリーズ',
    color: '#f77d03',
    icon: '🥣'
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