/* ---------------------------------------------------------------------
   CCTV(장비) 관리자용 타입/상수. dbms/cctv/CctvList.tsx(목록)와
   dbms/cctv/CctvForm.tsx(등록·수정)가 함께 참조합니다.
   (user 쪽 ../user/shop/CctvUser.ts 와 컬럼은 동일하지만, 관리자 화면은 sno
   상관없이 전체 CCTV를 대상으로 하고 등록/수정/삭제까지 하므로 타입을 따로 둡니다.
   ShopAdmin.ts/ShopUser.ts 분리 패턴과 동일합니다.)

   ⚠️ CCTV 등록/수정/삭제는 관리자(dbms) 전용입니다. 사용자(user/shop)는
     CctvUser.ts + CctvList.tsx(조회 전용)만 사용합니다.

   CctvDTO (백엔드, dev.jpa.allimio.cctv)
   no        long    - PK
   sno       long    - 매장번호(SHOP.no). 어느 매장 소유 CCTV인지 - 등록 시 관리자가 직접 지정
   mac       String  - MAC 주소 (장비 고유 식별자)
   represent String  - 대표 카메라 여부 'Y'/'N'
   cname     String  - CCTV명 (예: "카운터", "출입구")
   ckdate    String  - 최근 점검일자 (yyyy-MM-dd)
   state     int     - 장비 상태 코드
   cdate     String  - 등록일, 서버(CctvService.save)에서 Tool.getDate()로 채움

   ⚠️ state 값 체계는 참조 테이블이 없어서 일반적인 장비 운영 상태(정상/점검중/고장) 기준으로
     임시 매핑해뒀습니다. 실제 코드값이 다르면 아래 STATE_LABELS/STATE_BADGE만 고치면 됩니다.

   API (CctvCont, /cctv)
   POST /cctv/save          - CctvDTO(JSON) → 등록 (관리자 전용)
   GET  /cctv/admin/search  - 관리자 목록 검색 + 페이징. sno 상관없이 전체 CCTV 대상
        ?sno=&state=&keyword=&page=&size=  (sno는 특정 매장 CCTV만 보고 싶을 때만 선택적으로 사용)
        → { content, totalElements, totalPages, page(0부터), size }
   GET  /cctv/{pk}          - 단건 조회 (수정 화면 진입 시)
   PUT  /cctv/update        - CctvDTO(JSON, no 포함) → 수정 (관리자 전용)
   DELETE /cctv/{pk}        - 삭제 (관리자 전용)

   ※ save/update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌 JSON으로 전송합니다.
--------------------------------------------------------------------- */

export interface CctvType {
  no?: number;
  sno?: number;
  mac?: string;
  represent?: 'Y' | 'N' | string;
  cname?: string;
  ckdate?: string;
  state?: number;
  cdate?: string;
}

/** GET /cctv/admin/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvSearchResult {
  content: CctvType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 10;

// 장비 상태(STATE) - NUMBER, 참조 테이블 없어서 임시 매핑 (CctvIssue.ts STATE_LABELS와 동일한 방식)
export const STATE_LABELS: Record<number, string> = {
  0: '정상',
  1: '점검중',
  2: '고장',
};
export const STATE_BADGE: Record<number, string> = {
  0: 'badge_success',
  1: 'badge_warning',
  2: 'badge_danger',
};

/** 목록에 표시할 때 전체 건수 기준 순번(cnt)을 붙인 행 타입 (CctvIssueList.tsx와 동일 패턴) */
export type RowType = CctvType & { cnt: number };

export interface Filters {
  sno: string; // 매장번호 필터
  state: string; // '' | '0' | '1' | '2' ...
  keyword: string; // CCTV명·MAC주소 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  sno: '',
  state: '',
  keyword: '',
};

/** 신규 등록 시 초기값 */
export const EMPTY_CCTV: CctvType = {
  sno: undefined,
  mac: '',
  represent: 'N',
  cname: '',
  ckdate: '',
  state: 0,
};
