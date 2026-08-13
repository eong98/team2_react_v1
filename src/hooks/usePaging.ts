import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * URL Query Parameter 기반 페이지 번호 제어 훅. useTab.ts와 독립적으로 동작합니다.
 * (tab이랑 page를 한 훅에서 같이 setSearchParams로 건드리면, 같은 이벤트 핸들러 안에서
 * 두 값을 연달아 바꿀 때 서로의 변경을 덮어쓰는 문제가 있었습니다. 그래서 완전히 분리했고,
 * "탭이 바뀌면 페이지를 1로" 같은 연동은 useTab의 changeTab이 page 쿼리를 지우는 것으로
 * 처리합니다 — 그러면 이 훅이 그걸 감지해서 자동으로 기본값(1)으로 떨어집니다.)
 *
 * @example
 * const { page, setPage, resetPage } = usePaging();
 *
 * <Pagination page={page} onChange={setPage} ... />
 *
 * useEffect(() => { loadList(); }, [page, ...]);
 */

interface UsePagingOptions {
  /** URL 쿼리 파라미터 키 이름 (기본값: 'page') */
  paramName?: string;
  /** 기본 페이지 번호 (기본값: 1) */
  defaultPage?: number;
}

export function usePaging({ paramName = 'page', defaultPage = 1 }: UsePagingOptions = {}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationState = location.state as Record<string, unknown> | null;

  // 1. URL 쿼리 스트링 -> 2. location.state -> 3. 기본값 순으로 읽기
  const page = (() => {
    const fromQuery = Number(searchParams.get(paramName));
    if (fromQuery > 0) return fromQuery;
    const fromState = locationState?.[paramName];
    if (typeof fromState === 'number' && fromState > 0) return fromState;
    return defaultPage;
  })();

  const setPage = (nextPage: number) => {
    if (nextPage === page) return;
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        updated.set(paramName, String(nextPage));
        return updated;
      },
      { replace: true },
    );
  };

  const resetPage = () => setPage(defaultPage);

  return { page, setPage, resetPage };
}