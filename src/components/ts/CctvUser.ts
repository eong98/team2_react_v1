/* ---------------------------------------------------------------------
   CCTV(장비) 사용자용 타입/상수. user/shop/CctvList.tsx(목록, 조회 전용)가 참조합니다.

   ⚠️ CCTV 등록/수정/삭제는 관리자(dbms/cctv) 전용입니다. 사용자는 로그인 후
     입장한 매장(GlobalCurrentShop().no = sno) 소유 CCTV 목록을 조회만 할 수 있고,
     특정 CCTV를 선택하면 그 CCTV에서 발생한 이슈 처리 현황(user/shop/CctvIssueList.tsx,
     ?cno= 쿼리)으로 이동해 상황이 어떻게 처리됐는지 확인합니다.
     (컬럼/상수는 관리자용 ../CctvAdmin.ts 와 동일하지만, ShopAdmin.ts/ShopUser.ts
     분리 패턴과 동일하게 사용자 전용 파일을 따로 둡니다.)

   CctvDTO (백엔드, dev.jpa.allimio.cctv)
   no/sno/mac/represent/cname/ckdate/state/cdate

   API (CctvCont, /cctv)
   GET /cctv/search  - 매장 CCTV 목록 검색 + 페이징 (조회 전용)
        ?sno=&keyword=&page=&size=
        → { content, totalElements, totalPages, page(0부터), size }
--------------------------------------------------------------------- */

export interface CctvType {
  no: number;
  sno: number;
  mac: string | null;
  represent: 'Y' | 'N' | string;
  cname: string | null;
  ckdate: string | null;
  state: number;
  cdate: string;
}

/** GET /cctv/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvSearchResult {
  content: CctvType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 12;

// 장비 상태(STATE) - CctvAdmin.ts와 동일 매핑 (실제 코드값 바뀌면 두 파일 다 고쳐야 함)
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

export interface Filters {
  keyword: string; // CCTV명·MAC주소 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  keyword: '',
};
