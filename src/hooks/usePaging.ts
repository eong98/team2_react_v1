import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * URL Query Parameter 기반 페이지 번호 제어 + "지금 쿼리스트링 유지 이동" 훅.
 * useTab.ts와 독립적으로 동작합니다.
 * (tab이랑 page를 한 훅에서 같이 setSearchParams로 건드리면, 같은 이벤트 핸들러 안에서
 * 두 값을 연달아 바꿀 때 서로의 변경을 덮어쓰는 문제가 있었습니다. 그래서 완전히 분리했고,
 * "탭이 바뀌면 페이지를 1로" 같은 연동은 useTab의 changeTab이 page 쿼리를 지우는 것으로
 * 처리합니다 — 그러면 이 훅이 그걸 감지해서 자동으로 기본값(1)으로 떨어집니다.)
 *
 * navigateWithQuery/goToList는 원래 useTab에 있었는데, 실제로는 tab 값을 전혀 참조하지 않고
 * "지금 URL의 쿼리스트링을 통째로 들고 이동"할 뿐이라 tab이 없는 화면(페이지네이션만 있고
 * 탭은 없는 목록)에서도 그대로 씁니다. 페이지네이션은 거의 모든 목록 화면에 있는 반면 탭은
 * 있는 화면이 적어서, useTab이 아니라 usePaging 쪽에 두는 게 더 범용적입니다.
 * (탭이 있는 화면이면 useTab의 changeTab을 페이지 초기화 콜백과 같이 쓰고, 이동은 그대로
 * 이 훅의 navigateWithQuery/goToList를 쓰면 됩니다 — tab 쿼리도 이미 URL에 있으니 같이 유지됩니다.)
 *
 * @example
 * const { page, setPage, navigateWithQuery, goToList } = usePaging();
 *
 * <Pagination page={page} onChange={setPage} ... />
 * navigateWithQuery(`${no}`); // 지금 쿼리(예: ?page=2, 있다면 ?tab=faq&page=2)를 유지한 채 이동
 * goToList();                 // 지금 쿼리를 유지한 채 목록으로 복귀
 */

interface UsePagingOptions {
  /** URL 쿼리 파라미터 키 이름 (기본값: 'page') */
  paramName?: string;
  /** 기본 페이지 번호 (기본값: 1) */
  defaultPage?: number;
  /** 목록 페이지의 기본 라우트 경로 (goToList의 fallback으로 사용, 예: '/user/qa') */
  basePath?: string;
}

export function usePaging({ paramName = 'page', defaultPage = 1, basePath }: UsePagingOptions = {}) {
  const navigate = useNavigate();
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

  /** 지금 URL의 쿼리스트링(page, tab 등 전부)을 그대로 들고 지정한 경로로 이동 (상세/작성 페이지 등) */
  const navigateWithQuery = (to: string) => {
    const hasQuery = to.includes('?');
    const currentQuery = location.search.replace(/^\?/, '');
    const target = currentQuery ? `${to}${hasQuery ? '&' : '?'}${currentQuery}` : to;
    navigate(target, { state: locationState ?? undefined });
  };

  /** 지금 URL의 쿼리스트링을 그대로 들고 목록으로 돌아가기 */
  const goToList = (fallbackPath?: string) => {
    const targetPath = fallbackPath || basePath || location.pathname;
    const hasQuery = targetPath.includes('?');
    const currentQuery = location.search.replace(/^\?/, '');
    const target = currentQuery ? `${targetPath}${hasQuery ? '&' : '?'}${currentQuery}` : targetPath;
    navigate(target, { state: locationState ?? undefined });
  };

  return { page, setPage, resetPage, navigateWithQuery, goToList };
}
