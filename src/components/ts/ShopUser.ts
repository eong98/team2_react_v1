/* ---------------------------------------------------------------------
   매장(SHOP) 타입/상수. ShopList.tsx(목록)와 ShopForm.tsx(작성/수정)가 함께 참조합니다.

   ShopDTO (백엔드, dev.jpa.allimio.shop)
   no        long    - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   mno       long    - 회원번호(매장 소유자), 로그인 세션에서 채워짐 (GlobalStoreSession)
   title     String  - 매장명
   zip       String  - 우편번호 (다음 우편번호 서비스로 자동 입력)
   address   String  - 주소1 (다음 우편번호 서비스로 자동 입력)
   address2  String  - 상세주소 (직접 입력)
   tel       String  - 매장연락처
   coment    String  - 특이사항 (CLOB)
   phone     String  - 핸드폰(담당자 연락처)
   snum      String  - 사업자등록번호
   udate     String  - 수정일, 서버(ShopService.update)에서 Tool.getDate()로 채움
   cdate     String  - 등록일, 서버(ShopService.save)에서 Tool.getDate()로 채움

   ※ 2026-08-11 PAYSTATE(결제상태)/QRIMG(QR이미지) 컬럼은 SHOP 테이블에서
     제거했습니다. QR이미지는 "고객의소리" 쪽에서 받는 것으로 방향이 바뀌었고,
     결제상태도 이 테이블 책임이 아닌 것으로 정리되어 함께 뺐습니다.
     (DB DROP COLUMN 쿼리는 팀 채팅으로 별도 공유)

   API (ShopCont, /shop)
   POST /shop/save          - ShopDTO(JSON) → 등록
   PUT  /shop/update        - ShopDTO(JSON, no 포함) → 수정
   GET  /shop/{pk}          - 단건 조회
   GET  /shop/search        - 목록 검색 + 페이징
        ?mno=&keyword=&page=&size=
        → { content, totalElements, totalPages, page(0부터), size }
   DELETE /shop/{pk}        - 삭제

   ※ save/update가 @RequestBody(JSON)이므로 FormData/multipart가 아닌
     JSON으로 전송합니다.
--------------------------------------------------------------------- */

export interface ShopType {
  no?: number;
  mno?: number;
  title?: string;
  zip?: string;
  address?: string;
  address2?: string;
  tel?: string;
  coment?: string;
  phone?: string;
  snum?: string;
  udate?: string;
  cdate?: string;
}

/** GET /shop/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface ShopSearchResult {
  content: ShopType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 6;

export interface Filters {
  keyword: string; // 매장명·주소 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  keyword: '',
};

/** 신규 등록 시 초기값 */
export const EMPTY_SHOP: ShopType = {
  title: '',
  zip: '',
  address: '',
  address2: '',
  tel: '',
  coment: '',
  phone: '',
  snum: '',
};
