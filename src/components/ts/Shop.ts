/* ---------------------------------------------------------------------
   매장(SHOP) 관리자용 타입/상수. ShopList.tsx(목록)와 ShopForm.tsx(수정)가 함께 참조합니다.
   (user 쪽 ../user/shop/Shop.ts 와 컬럼은 동일하지만, 관리자 화면은 mno 상관없이
   전체 매장을 대상으로 하므로 관리자 전용 검색 타입을 따로 둡니다.)

   ShopDTO (백엔드, dev.jpa.allimio.shop)
   no        long    - PK
   mno       long    - 회원번호(매장 소유자). 관리자 화면에서는 참고용으로만 표시하고 수정하지 않음
   title     String  - 매장명
   zip       String  - 우편번호
   address2  String  - 상세주소
   tel       String  - 매장연락처
   coment    String  - 특이사항 (CLOB)
   phone     String  - 핸드폰(담당자 연락처)
   snum      String  - 사업자등록번호
   udate     String  - 수정일, 서버(ShopService.update)에서 Tool.getDate()로 채움
   cdate     String  - 등록일, 서버(ShopService.save)에서 Tool.getDate()로 채움

   API (ShopCont, /shop)
   GET  /shop/admin/search  - 관리자 목록 검색 + 페이징. mno 상관없이 전체 매장 대상
        ?mno=&keyword=&page=&size=  (mno는 특정 회원 매장만 보고 싶을 때만 선택적으로 사용)
        → { content, totalElements, totalPages, page(0부터), size }
   GET  /shop/{pk}          - 단건 조회 (수정 화면 진입 시)
   PUT  /shop/update        - ShopDTO(JSON, no 포함) → 수정
   DELETE /shop/{pk}        - 삭제

   ※ update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌 JSON으로 전송합니다.
--------------------------------------------------------------------- */

export interface ShopType {
  no: number;
  mno: number;
  title: string;
  zip: string;
  address: string;
  address2: string | null;
  tel: string | null;
  coment: string | null;
  phone: string | null;
  snum: string | null;
  udate: string | null;
  cdate: string;
}

/** GET /shop/admin/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface ShopSearchResult {
  content: ShopType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 10;

/** 목록에 표시할 때 전체 건수 기준 순번(cnt)을 붙인 행 타입 (CctvIssueList.tsx와 동일 패턴) */
export type RowType = ShopType & { cnt: number };

export interface Filters {
  keyword: string; // 매장명·주소·상세주소 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  keyword: '',
};
