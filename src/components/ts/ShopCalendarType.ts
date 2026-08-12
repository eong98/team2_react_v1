/* ---------------------------------------------------------------------
   매장(SHOP_CALENDAR) 캘린더 타입/상수/날짜 변환 유틸.
   ShopCalendar.tsx 에서만 참조합니다.
   (파일명은 ShopCalendar.tsx와의 default export 충돌을 피하려고
    ShopCalendarType.ts로 지었습니다.)

   ShopCalendarDTO (백엔드, dev.jpa.allimio.shopcalendar)
   no        long    - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   sno       long    - 매장번호(SHOP.NO), Topbar에서 입장한 GlobalCurrentShop().no
   ctype     int     - 일정 종류 (0 일반 / 1 휴무 / 2 이벤트 / 3 정산 / 4 점검)
   title     String  - 제목 (필수)
   contents  String  - 메모 (선택)
   sdate     String  - 시작일시 "YYYY-MM-DD HH:MM:SS"
   edate     String  - 종료일시 "YYYY-MM-DD HH:MM:SS"
   allday    String  - 종일 여부 'Y' / 'N' (기본 'Y')
   color     String  - 이벤트 색상 hex (선택, 없으면 ctype 기본색 사용)
   status    String  - 사용 여부 'Y' / 'N' (기본 'Y')
   cdate     String  - 등록일, 서버(ShopCalendarService.save)에서 Tool.getDate()로 채움
   udate     String  - 수정일, 서버(ShopCalendarService.update)에서 Tool.getDate()로 채움

   API (ShopCalendarCont, /shopcalendar)
   POST   /shopcalendar/save              - ShopCalendarDTO(JSON) → 등록
   PUT    /shopcalendar/update            - ShopCalendarDTO(JSON, no 포함) → 수정
   GET    /shopcalendar/{pk}              - 단건 조회
   GET    /shopcalendar/find_by_sno/{sno} - 매장별 전체 일정 목록
   DELETE /shopcalendar/{pk}              - 삭제

   ※ save/update가 @RequestBody(JSON)이므로 FormData가 아닌 JSON으로 전송합니다.
   ※ 백엔드는 이미 구현되어 있어 프론트만 새로 작업합니다.
--------------------------------------------------------------------- */

export interface ShopCalendarType {
  no?: number;
  sno?: number;
  ctype: number;
  title: string;
  contents?: string;
  sdate: string;
  edate: string;
  allday: 'Y' | 'N';
  color?: string;
  status?: 'Y' | 'N';
  cdate?: string;
  udate?: string;
}

/** 일정 종류. label/color는 프론트 전용(백엔드는 ctype 숫자만 저장) */
export interface CtypeOption {
  value: number;
  label: string;
  color: string;
}

export const CTYPE_OPTIONS: CtypeOption[] = [
  { value: 0, label: '일반', color: '#33D6C0' }, // teal
  { value: 1, label: '휴무', color: '#FFB020' }, // amber
  { value: 2, label: '이벤트', color: '#7C5CFF' }, // violet
  { value: 3, label: '정산', color: '#33D68A' }, // green
  { value: 4, label: '점검', color: '#FF4D5E' }, // red
];

export const getCtypeOption = (ctype: number): CtypeOption =>
  CTYPE_OPTIONS.find((c) => c.value === ctype) ?? CTYPE_OPTIONS[0];

/** 색상 팔레트(수동 선택). 비워두면 ctype 기본색을 씁니다. */
export const COLOR_SWATCHES = [
  '#33D6C0', // teal
  '#33D68A', // green
  '#7C5CFF', // violet
  '#FFB020', // amber
  '#FF6A3D', // orange
  '#FF4D5E', // red
];

/** 신규 등록 시 초기값 (sno/sdate/edate는 열 때 채워 넣음) */
export const EMPTY_CALENDAR: ShopCalendarType = {
  ctype: 0,
  title: '',
  contents: '',
  sdate: '',
  edate: '',
  allday: 'Y',
  color: '',
  status: 'Y',
};

/* -----------------------------------------------------------------
   날짜 변환 유틸
   - DB: "YYYY-MM-DD HH:MM:SS" 문자열 (Tool.getNowDate()와 동일 포맷)
   - FullCalendar: JS Date 객체 (로컬 타임존 그대로 사용, UTC 변환 없음)
------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

export const formatDbDateTime = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** "YYYY-MM-DD HH:MM:SS" / "YYYY-MM-DD" → Date (로컬시간 해석) */
export const parseDbDate = (s?: string): Date | null => {
  if (!s) return null;
  const norm = s.trim();
  const iso = norm.length === 10 ? `${norm}T00:00:00` : norm.replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** input[type=datetime-local] / input[type=date] 표시용 문자열 */
export const toInputValue = (d: Date, allDay: boolean): string => {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return allDay ? base : `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** input value("YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm") → Date (로컬시간) */
export const fromInputValue = (value: string, allDay: boolean): Date | null => {
  if (!value) return null;
  const iso = allDay ? `${value}T00:00:00` : `${value}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * FullCalendar select/drop/resize 결과(start, end, allDay)를 DB 저장용
 * sdate/edate 문자열로 변환.
 * - 종일 일정: FullCalendar의 end는 "다음날 00:00"(배타적)이라 하루 전으로
 *   당겨 23:59:59로 저장(포함 종료일 기준으로 통일).
 */
export const toStoreDates = (start: Date, end: Date | null, allDay: boolean) => {
  const s = new Date(start);
  let e = end ? new Date(end) : new Date(start);

  if (allDay) {
    s.setHours(0, 0, 0, 0);
    if (end) {
      e = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }
    e.setHours(23, 59, 59, 0);
  }

  return { sdate: formatDbDateTime(s), edate: formatDbDateTime(e) };
};

/**
 * DB의 sdate/edate/allday를 FullCalendar 이벤트 start/end로 변환.
 * 종일 일정은 edate(포함 종료일) 다음날 00:00을 배타적 end로 넘겨줍니다.
 */
export const toFcRange = (sdate: string, edate: string, allDay: boolean) => {
  const s = parseDbDate(sdate) ?? new Date();
  const e = parseDbDate(edate) ?? s;

  if (allDay) {
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    end.setDate(end.getDate() + 1);
    return { start, end, allDay: true as const };
  }

  return { start: s, end: e, allDay: false as const };
};

/** 화면에 보여줄 기간 문자열 (예: "2026-08-12" / "2026-08-12 14:00 ~ 15:30") */
export const formatRangeLabel = (row: ShopCalendarType): string => {
  const { start, end } = toFcRange(row.sdate, row.edate, row.allday === 'Y');
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (row.allday === 'Y') {
    const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return dateStr(start) === dateStr(lastDay) ? dateStr(start) : `${dateStr(start)} ~ ${dateStr(lastDay)}`;
  }

  return dateStr(start) === dateStr(end)
    ? `${dateStr(start)} ${timeStr(start)} ~ ${timeStr(end)}`
    : `${dateStr(start)} ${timeStr(start)} ~ ${dateStr(end)} ${timeStr(end)}`;
};
