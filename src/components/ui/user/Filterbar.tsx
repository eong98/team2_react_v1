import type { ReactNode } from 'react';

interface FilterbarProps {
  /** 검색어 (controlled) */
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** 셀렉트 필터 등 검색 입력 옆에 추가로 넣을 요소들 (상태 필터, 기간 필터 등) */
  filters?: ReactNode;
  /** 우측 끝에 붙는 보조 버튼 (예: 엑셀 다운로드, 새로고침) — 생성 버튼은 PageHeader에서 처리 */
  extra?: ReactNode;
  /**
   * 필터 바 왼쪽에 붙는 커스텀 요소. page/pageSize/totalCount를 같이 넘기면 이 prop은
   * 무시되고, 아래 안내문구("전체 N건 중 ...건 표시")가 DbmsPagination.tsx와 동일한
   * 계산식으로 자동 렌더링됩니다. 페이지네이션 정보가 아닌 다른 걸 왼쪽에 두고 싶을 때만 쓰세요.
   */
  left?: ReactNode;
  /** 아래 셋을 같이 넘기면 "전체 N건 중 ...건 표시" 안내문구를 Filterbar가 직접 계산해서 보여줍니다. */
  page?: number;
  pageSize?: number;
  totalCount?: number;
  /** false면 page/pageSize/totalCount를 넘겨도 안내문구를 숨김 (기본 true) */
  showInfo?: boolean;
  /** 검색어 입력창에서 Enter 입력 시 실행할 검색 함수 (예: onSearch) */
  onSearchEnter?: () => void;
}

/**
 * 리스트 상단 검색/필터 바. 기존 .filter_bar 클래스를 그대로 사용
 * (HistoryView.tsx의 필터 바와 동일한 톤), 검색 입력만 .search_box로 새로 추가.
 * left(또는 page/pageSize/totalCount)를 넘기면 .filter_bar_row 안에서 필터 바 왼쪽에 나란히 배치됩니다.
 *
 * 사용 예 (페이지네이션 정보 자동 계산 — DbmsPagination.tsx와 동일한 방식):
 *   <Filterbar
 *     searchValue={keyword}
 *     onSearchChange={setKeyword}
 *     searchPlaceholder="제목으로 검색"
 *     page={page}
 *     pageSize={PAGE_SIZE}
 *     totalCount={totalElements}
 *     filters={
 *       <select value={tag} onChange={(e) => setTag(e.target.value)}>
 *         <option value="">전체</option>
 *         <option value="긴급">긴급</option>
 *       </select>
 *     }
 *   />
 *
 * 사용 예 (페이지네이션이 아닌 다른 걸 왼쪽에 두고 싶을 때):
 *   <Filterbar left={<span>커스텀 안내</span>} ... />
 */
export default function Filterbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '검색어를 입력하세요',
  filters,
  extra,
  left,
  page,
  pageSize,
  totalCount,
  showInfo = true,
  onSearchEnter,
}: FilterbarProps) {
  // DbmsPagination.tsx와 동일한 계산식: from은 1부터, to는 totalCount를 넘지 않게
  const hasPaginationInfo = page !== undefined && pageSize !== undefined && totalCount !== undefined;
  const from = hasPaginationInfo && totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = hasPaginationInfo ? Math.min(page * pageSize, totalCount) : 0;

  const leftContent =
    left ??
    (hasPaginationInfo && showInfo && totalCount > 0 ? (
      <span className="pagination_info">
        전체 <em className="b_num">{totalCount}</em>건 중 {from}–{to}건 표시
      </span>
    ) : null);

  return (
    <div className="filter_bar_row">
      {leftContent}

      <div className="filter_bar">
        <div className="search_box">
          <span className="search_ic" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            className="form_input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchEnter?.();
              }
            }}
          />
          {searchValue && (
            <button
              type="button"
              className="search_clear"
              aria-label="검색어 지우기"
              onClick={() => onSearchChange('')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {filters}

        {extra && <div className='actions'>{extra}</div>}
      </div>
    </div>
  );
}