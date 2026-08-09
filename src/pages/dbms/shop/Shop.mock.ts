/* ---------------------------------------------------------------------
   공지사항(NOTICE) 목업 데이터 + 타입
   NoticeView(목록)와 NoticeFormView(작성/수정 페이지)가 함께 참조합니다.
   실제 API 연동 시 이 파일의 MOCK_NOTICES 대신 서버 응답으로 교체하면 됩니다.
--------------------------------------------------------------------- */

export interface Notice {
  no: number;
  tag: '긴급' | '중요' | '신규' | '일반';
  title: string;
  content?: string;
  writer: string;
  hit: number;
  cdate: string;
}

export const TAG_LIST: Notice['tag'][] = ['긴급', '중요', '신규', '일반'];

export const TAG_TONE: Record<Notice['tag'], string> = {
  긴급: 'badge_danger',
  중요: 'badge_warning',
  신규: 'badge_success',
  일반: 'badge_neutral',
};

export const MOCK_NOTICES: Notice[] = [
  { no: 24, tag: '긴급', title: '8/5(수) 02:00~04:00 서버 점검 안내', writer: 'admin', hit: 214, cdate: '2026-08-03' },
  { no: 23, tag: '신규', title: "이상행동 유형에 '흡연 감지'가 추가되었습니다", writer: 'admin', hit: 152, cdate: '2026-07-29' },
  { no: 22, tag: '중요', title: '7월 구독 결제 관련 안내', writer: 'admin', hit: 341, cdate: '2026-07-20' },
  { no: 21, tag: '일반', title: 'CCTV 연동 가이드 문서가 갱신되었습니다', writer: 'admin', hit: 88, cdate: '2026-07-14' },
  { no: 20, tag: '일반', title: '모바일 알림 수신 설정 안내', writer: 'admin', hit: 63, cdate: '2026-07-05' },
  { no: 19, tag: '신규', title: '매장별 대시보드 위젯이 추가되었습니다', writer: 'admin', hit: 121, cdate: '2026-06-28' },
  { no: 18, tag: '중요', title: '개인정보처리방침 개정 안내', writer: 'admin', hit: 205, cdate: '2026-06-19' },
  { no: 17, tag: '일반', title: '이용가이드 오탈자 수정', writer: 'admin', hit: 41, cdate: '2026-06-10' },
  { no: 16, tag: '일반', title: '6월 정기 점검 결과 안내', writer: 'admin', hit: 97, cdate: '2026-06-02' },
  { no: 15, tag: '긴급', title: '일부 지역 CCTV 스트리밍 지연 이슈 안내', writer: 'admin', hit: 276, cdate: '2026-05-27' },
  { no: 14, tag: '신규', title: '통계 화면에 주간 리포트가 추가되었습니다', writer: 'admin', hit: 133, cdate: '2026-05-19' },
];
