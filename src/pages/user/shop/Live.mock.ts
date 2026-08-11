/* ---------------------------------------------------------------------
   실시간 관제(LIVE) 목업 데이터 + 타입
   LiveView(모니터/카메라스트립)와 EventDetailPanel(상세)이 함께 참조합니다.
   실제 API 연동 시 이 파일의 CAMERAS/EVENTS 대신 서버 응답으로 교체하면 됩니다.
--------------------------------------------------------------------- */

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

export const CAMERAS = ['CAM 01', 'CAM 02', 'CAM 03', 'CAM 04', 'CAM 05', 'CAM 06'];

export const EVENTS: DashboardEvent[] = [
  {
    id: 1, date: '2026-08-03', time: '14:32:07', cam: 'CAM 03', type: '폭행', level: 'danger', confidence: 94, status: '대기',
    desc: '열람실 A구역에서 급격한 신체 접촉과 움직임이 감지되었습니다.',
    sensor: [['출입기록', '14:20 카드 태그 · 2명 입장'], ['소음 레벨', '78dB (평상시 대비 급상승)'], ['체류 시간', '12분']],
  },
  {
    id: 2, date: '2026-08-03', time: '13:58:41', cam: 'CAM 05', type: '장시간 배회', level: 'warn', confidence: 81, status: '대기',
    desc: '동일 인물이 47분간 서가 주변을 반복적으로 배회하고 있습니다.',
    sensor: [['출입기록', '13:11 카드 태그 · 1명 입장'], ['소음 레벨', '32dB (평상시 수준)'], ['체류 시간', '47분']],
  },
  {
    id: 3, date: '2026-08-02', time: '12:47:19', cam: 'CAM 01', type: '쓰러짐', level: 'danger', confidence: 97, status: '처리완료',
    desc: '1인 열람석에서 낙상 후 10초 이상 움직임이 감지되지 않았습니다.',
    sensor: [['출입기록', '12:02 카드 태그 · 1명 입장'], ['소음 레벨', '41dB'], ['무움직임 지속', '23초']],
  },
  {
    id: 4, date: '2026-08-01', time: '03:14:52', cam: 'CAM 04', type: '무단침입', level: 'danger', confidence: 88, status: '처리완료',
    desc: '영업 종료 시간대에 출입기록 없이 비인가 출입이 감지되었습니다.',
    sensor: [['출입기록', '해당 시간대 태그 기록 없음'], ['소음 레벨', '55dB'], ['시간대', '심야 (00시~06시)']],
  },
  {
    id: 5, date: '2026-07-31', time: '23:40:10', cam: 'CAM 02', type: '기물파손', level: 'danger', confidence: 91, status: '오탐지',
    desc: '정수기 앞에서 충격이 감지되었으나, 확인 결과 물병 낙하로 판명되었습니다.',
    sensor: [['출입기록', '23:35 카드 태그 · 1명 입장'], ['소음 레벨', '66dB (순간 피크)'], ['재검토 결과', '오탐지 확정']],
  },
  {
    id: 6, date: '2026-07-31', time: '21:05:33', cam: 'CAM 06', type: '장시간 배회', level: 'warn', confidence: 76, status: '처리완료',
    desc: '심야 시간대 동일 인물이 출입구 주변을 30분 이상 배회했습니다.',
    sensor: [['출입기록', '20:40 카드 태그 · 1명 입장'], ['소음 레벨', '29dB'], ['체류 시간', '31분']],
  },
];

export function statusBadgeClass(s: EventStatus): 'danger' | 'ok' | 'neutral' {
  return s === '대기' ? 'danger' : s === '처리완료' ? 'ok' : 'neutral';
}

export function confColor(level: EventLevel): string {
  return level === 'danger' ? 'var(--red-500)' : level === 'warn' ? 'var(--amber-500)' : 'var(--green-500)';
}
