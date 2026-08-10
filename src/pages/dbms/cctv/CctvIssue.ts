
export interface CctvIssueType {
  no: number;
  cno: number;
  mno: number | null;
  code: string;
  state: number;
  comnet: string | null;
  reliability: string | null;
  pdate: string | null;
  noticeyn: 'Y' | 'N';
  cdate: string;
}

/** GET /cctv_issue/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvIssueSearchResult {
  content: CctvIssueType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}
