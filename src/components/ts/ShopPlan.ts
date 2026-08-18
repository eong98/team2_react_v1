/* ---------------------------------------------------------------------
   구독권(SHOP_PLAN) 관리자용 타입/상수. ShopPlanList.tsx(목록)와
   ShopPlanForm.tsx(등록·수정)가 함께 참조합니다.

   ShopPlanDTO.Response (백엔드, dev.jpa.allimio.shopplan)
   no, pname, pmonth(6|12), bprice(대당 단가), minqty, maxqty, description, issell, cdate
   ※ description은 '|'로 구분해서 저장 (사용자 화면에서 split해 리스트로 노출)

   API (ShopPlanCont, /shop_plan)
   GET /shop_plan/list/admin?word=&pmonth=&issell=&page=&size=  - 검색 + 페이징
     → { content, totalElements, totalPages, page(0부터), size }  (PageResponse)
   DELETE /shop_plan/{no}
--------------------------------------------------------------------- */

export interface ShopPlanTypes {
  no: number;
  pname: string;
  pmonth: number | '';
  bprice: number | '';
  mincctv: number | '';
  maxcctv: number | '';
  description?: string;
  issell: 'Y' | 'N';
  cdate?: string;
}

export type RowType = ShopPlanTypes & { cnt: number };

/** GET /shop_plan/list/admin 응답 형태 (PageResponse<ShopPlanDTO.Response>) */
export interface ShopPlanSearchResult {
  content: ShopPlanTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 10;


export interface Filters {
  word: string;   // 구독권 이름 검색
  pmonth: string; // '' | '6' | '12'
  issell: string; // '' | 'Y' | 'N'
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  pmonth: '',
  issell: '',
};