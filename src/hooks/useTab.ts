import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * URL Query Parameter 기반 범용 탭 제어 훅.
 * 페이지 번호(page)는 여기서 관리하지 않습니다 — 그건 usePaging.ts가 따로 담당합니다.
 * (예전에 한 훅이 tab과 page를 같이 setSearchParams로 건드리다 보니, 같은 이벤트 핸들러
 * 안에서 두 번 연속 호출될 때 서로의 변경을 덮어써서 탭 클릭이 씹히는 문제가 있었습니다.
 * tab과 page를 완전히 분리하고, 이동 시에는 "지금 URL의 쿼리스트링을 그대로" 들고 가는
 * 방식으로 바꿔서 — 이 훅이 page의 존재 자체를 몰라도 자연스럽게 같이 유지됩니다.)
 *
 * @example
 * const { tab, changeTab, navigateWithTab, goToList } = useTab<'qa' | 'my' | 'faq'>({
 *   defaultTab: 'qa',
 *   basePath: '/user/qa',
 * });
 *
 * // 탭 변경 (검색 조건 초기화 등 콜백 제공 가능). page 쿼리는 자동으로 지워집니다.
 * changeTab('faq', () => resetFilters());
 *
 * // 지금 URL의 쿼리스트링(tab, page 등)을 그대로 유지하며 상세/작성 페이지로 이동
 * navigateWithTab('123'); // 지금 URL이 ?tab=faq&page=2 였다면 -> 123?tab=faq&page=2
 *
 * // 지금 URL의 쿼리스트링을 그대로 유지하며 목록으로 돌아가기
 * goToList(); // -> /user/qa?tab=faq&page=2
 */

interface UseTabOptions<T extends string = string> {
  /** URL 쿼리 파라미터 키 이름 (기본값: 'tab') */
  paramName?: string;
  /** 기본 선택될 탭 값 */
  defaultTab: T;
  /** 목록 페이지의 기본 라우트 경로 (예: '/user/notice', '/user/qa') */
  basePath?: string;
  /** 탭이 바뀔 때 같이 지울 쿼리 파라미터들 (기본값: ['page'] — 다른 탭의 목록을 이어보는 페이지 번호로 보는 게 어색하니까) */
  resetParamsOnTabChange?: string[];
}

export function useTab<T extends string = string>({
  paramName = 'tab',
  defaultTab,
  basePath,
  resetParamsOnTabChange = ['page'],
}: UseTabOptions<T>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationState = location.state as Record<string, unknown> | null;

  // 1. URL 쿼리 스트링 -> 2. location.state -> 3. 기본값 순으로 탭 읽기
  const tab = (searchParams.get(paramName) as T) || (locationState?.[paramName] as T) || defaultTab;

  /** 동일 페이지 내에서 탭 변경. page 등 resetParamsOnTabChange에 지정한 쿼리는 함께 삭제됩니다. */
  const changeTab = (nextTab: T, onTabChange?: (tab: T) => void) => {
    if (nextTab === tab) return;

    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        updated.set(paramName, nextTab);
        resetParamsOnTabChange.forEach((key) => updated.delete(key));
        return updated;
      },
      { replace: true },
    );

    if (onTabChange) onTabChange(nextTab);
  };

  /** 지금 URL의 쿼리스트링(tab, page 등 전부)을 그대로 들고 지정한 경로로 이동 (상세/작성 페이지 등) */
  const navigateWithTab = (to: string) => {
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

  return {
    tab,
    changeTab,
    navigateWithTab,
    goToList,
  };
}