import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * URL Query Parameter 기반 범용 탭 제어 훅.
 * 페이지 번호(page)와 "쿼리 유지하며 이동"(navigateWithQuery/goToList)은 usePaging.ts가
 * 담당합니다 — 페이지네이션은 거의 모든 목록 화면에 있지만 탭은 없는 화면도 많아서, 이동
 * 관련 함수를 tab 쪽에 묶어두면 탭이 없는 화면에서 억지로 useTab을 끌어와야 했습니다.
 * 지금은 완전히 분리돼서, 탭이 있는 화면은 useTab + usePaging을 같이 쓰고 탭이 없는 화면은
 * usePaging만 씁니다.
 *
 * @example
 * const { tab, changeTab } = useTab<'qa' | 'my' | 'faq'>({ defaultTab: 'qa' });
 * const { page, setPage, navigateWithQuery, goToList } = usePaging({ basePath: '/user/qa' });
 *
 * // 탭 변경 (검색 조건 초기화 등 콜백 제공 가능). page 쿼리는 자동으로 지워집니다.
 * changeTab('faq', () => resetFilters());
 *
 * // 지금 URL의 쿼리스트링(tab, page 등)을 그대로 유지하며 상세/작성 페이지로 이동
 * navigateWithQuery('123'); // 지금 URL이 ?tab=faq&page=2 였다면 -> 123?tab=faq&page=2
 *
 * // 지금 URL의 쿼리스트링을 그대로 유지하며 목록으로 돌아가기
 * goToList(); // -> /user/qa?tab=faq&page=2
 */

interface UseTabOptions<T extends string = string> {
  /** URL 쿼리 파라미터 키 이름 (기본값: 'tab') */
  paramName?: string;
  /** 기본 선택될 탭 값 */
  defaultTab: T;
  /** 탭이 바뀔 때 같이 지울 쿼리 파라미터들 (기본값: ['page'] — 다른 탭의 목록을 이어보는 페이지 번호로 보는 게 어색하니까) */
  resetParamsOnTabChange?: string[];
}

export function useTab<T extends string = string>({
  paramName = 'tab',
  defaultTab,
  resetParamsOnTabChange = ['page'],
}: UseTabOptions<T>) {
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

  return { tab, changeTab };
}
