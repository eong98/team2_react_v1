import type { ReactNode } from 'react';

interface AdminToolbarProps {
  /** 검색어 (controlled) */
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** 셀렉트 필터 등 검색 입력 옆에 추가로 넣을 요소들 (상태 필터, 기간 필터 등) */
  filters?: ReactNode;
  /** 우측 끝에 붙는 보조 버튼 (예: 엑셀 다운로드, 새로고침) — 생성 버튼은 AdminPageHeader에서 처리 */
  extra?: ReactNode;
}

/**
 * 리스트 상단 검색/필터 바. AdminPageHeader 바로 아래, 테이블 위에 배치.
 * 사용 예:
 *   <AdminToolbar
 *     searchValue={keyword}
 *     onSearchChange={setKeyword}
 *     searchPlaceholder="제목으로 검색"
 *     filters={
 *       <select className="dbms-select" value={tag} onChange={(e) => setTag(e.target.value)}>
 *         <option value="">전체</option>
 *         <option value="긴급">긴급</option>
 *       </select>
 *     }
 *   />
 */
export default function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '검색어를 입력하세요',
  filters,
  extra,
}: AdminToolbarProps) {
  return (
    <div className="dbms-toolbar">
      <div className="dbms-search">
        <span className="dbms-search-icon" aria-hidden>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          className="dbms-search-input"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchValue && (
          <button
            type="button"
            className="dbms-search-clear"
            aria-label="검색어 지우기"
            onClick={() => onSearchChange('')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filters && (
        <>
          <span className="dbms-toolbar-divider" />
          {filters}
        </>
      )}

      {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
    </div>
  );
}
