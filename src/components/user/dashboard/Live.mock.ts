export type EventLevel = 'danger' | 'warn' | 'ok';
export type EventStatus = '대기' | '처리완료' | '오탐지';

export interface DashboardEvent {
  id: number;
  date: string;
  time: string;
  cam: string;
  type: string;
  level: EventLevel;
  confidence: number;
  status: EventStatus;
  desc: string;
  sensor: [string, string][];
}

export interface Store {
  name: string;
  addr: string;
  status: 'danger' | 'warn' | 'ok';
  statusText: string;
  cams: number;
  todayEv: number;
}

export interface SensitivityItem {
  key: string;
  label: string;
  val: number;
}

export interface Integration {
  icon: string;
  name: string;
  desc: string;
  on: boolean;
}

export const CAMERAS = ['CAM 01', 'CAM 02', 'CAM 03', 'CAM 04', 'CAM 05', 'CAM 06'];

export const EVENTS: DashboardEvent[] = [
  {
    id: 1, date: '2026-07-24', time: '14:32:07', cam: 'CAM 03', type: '폭행', level: 'danger', confidence: 94, status: '대기',
    desc: '열람실 A구역에서 급격한 신체 접촉과 움직임이 감지되었습니다.',
    sensor: [['출입기록', '14:20 카드 태그 · 2명 입장'], ['소음 레벨', '78dB (평상시 대비 급상승)'], ['체류 시간', '12분']],
  },
  {
    id: 2, date: '2026-07-24', time: '13:58:41', cam: 'CAM 05', type: '장시간 배회', level: 'warn', confidence: 81, status: '대기',
    desc: '동일 인물이 47분간 서가 주변을 반복적으로 배회하고 있습니다.',
    sensor: [['출입기록', '13:11 카드 태그 · 1명 입장'], ['소음 레벨', '32dB (평상시 수준)'], ['체류 시간', '47분']],
  },
  {
    id: 3, date: '2026-07-24', time: '12:47:19', cam: 'CAM 01', type: '쓰러짐', level: 'danger', confidence: 97, status: '처리완료',
    desc: '1인 열람석에서 낙상 후 10초 이상 움직임이 감지되지 않았습니다.',
    sensor: [['출입기록', '12:02 카드 태그 · 1명 입장'], ['소음 레벨', '41dB'], ['무움직임 지속', '23초']],
  },
  {
    id: 4, date: '2026-07-23', time: '03:14:52', cam: 'CAM 04', type: '무단침입', level: 'danger', confidence: 88, status: '처리완료',
    desc: '영업 종료 시간대에 출입기록 없이 비인가 출입이 감지되었습니다.',
    sensor: [['출입기록', '해당 시간대 태그 기록 없음'], ['소음 레벨', '55dB'], ['시간대', '심야 (00시~06시)']],
  },
  {
    id: 5, date: '2026-07-22', time: '23:40:10', cam: 'CAM 02', type: '기물파손', level: 'danger', confidence: 91, status: '오탐지',
    desc: '정수기 앞에서 충격이 감지되었으나, 확인 결과 물병 낙하로 판명되었습니다.',
    sensor: [['출입기록', '23:35 카드 태그 · 1명 입장'], ['소음 레벨', '66dB (순간 피크)'], ['재검토 결과', '오탐지 확정']],
  },
  {
    id: 6, date: '2026-07-22', time: '21:05:33', cam: 'CAM 06', type: '장시간 배회', level: 'warn', confidence: 76, status: '처리완료',
    desc: '심야 시간대 동일 인물이 출입구 주변을 30분 이상 배회했습니다.',
    sensor: [['출입기록', '20:40 카드 태그 · 1명 입장'], ['소음 레벨', '29dB'], ['체류 시간', '31분']],
  },
];

export const STORES: Store[] = [
  { name: '본점 · 스터디카페 A', addr: '서울 강남구 · 카메라 6대', status: 'danger', statusText: '이상 감지', cams: 6, todayEv: 5 },
  { name: '2호점 · 무인카페 B', addr: '서울 마포구 · 카메라 4대', status: 'ok', statusText: '정상', cams: 4, todayEv: 0 },
  { name: '3호점 · 스터디카페 C', addr: '경기 성남시 · 카메라 8대', status: 'warn', statusText: '주의', cams: 8, todayEv: 2 },
  { name: '4호점 · 무인카페 D', addr: '인천 부평구 · 카메라 4대', status: 'ok', statusText: '정상', cams: 4, todayEv: 0 },
];

export const SENSITIVITY: SensitivityItem[] = [
  { key: 'assault', label: '폭행', val: 90 },
  { key: 'damage', label: '기물파손', val: 75 },
  { key: 'fall', label: '쓰러짐(응급)', val: 95 },
  { key: 'intrusion', label: '무단침입', val: 80 },
  { key: 'loiter', label: '장시간 배회', val: 60 },
];

export const INTEGRATIONS: Integration[] = [
  { icon: '🚓', name: '경찰 신고 자동 연동', desc: '폭행·무단침입 감지 시 관할 경찰서로 자동 연계', on: false },
  { icon: '🚑', name: '119 신고 자동 연동', desc: '쓰러짐(응급) 감지 시 119로 자동 연계', on: false },
  { icon: '🛡️', name: '보안업체 연동', desc: '위험도 높은 이벤트를 계약 보안업체로 자동 전달', on: false },
];

export const PERIOD_DATA: Record<'week' | 'month' | 'quarter', { labels: string[]; values: number[]; title: string }> = {
  week: { labels: ['월', '화', '수', '목', '금', '토', '일'], values: [4, 6, 3, 8, 5, 10, 6], title: '기간별 이벤트 발생 추이 · 주간' },
  month: { labels: ['1주', '2주', '3주', '4주'], values: [18, 22, 15, 27], title: '기간별 이벤트 발생 추이 · 월간' },
  quarter: { labels: ['1월', '2월', '3월'], values: [64, 58, 82], title: '기간별 이벤트 발생 추이 · 분기' },
};

export function statusBadgeClass(s: EventStatus): 'danger' | 'ok' | 'neutral' {
  return s === '대기' ? 'danger' : s === '처리완료' ? 'ok' : 'neutral';
}

export function confColor(level: EventLevel): string {
  return level === 'danger' ? 'var(--red-500)' : level === 'warn' ? 'var(--amber-500)' : 'var(--green-500)';
}
