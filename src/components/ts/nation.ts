export const NATION_OPTIONS = [
  '대한민국',
  '미국',
  '일본',
  '중국',
  '베트남',
  '필리핀',
  '태국',
  '인도네시아',
  '대만',
  '캐나다',
  '영국',
  '독일',
  '프랑스',
  '호주',
] as const;

export type NationOption = (typeof NATION_OPTIONS)[number];