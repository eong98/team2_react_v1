import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * URL Query Parameter 기반 범용 탭 제어 훅
 * 
 * @example
 * // 1. 기본 사용 (URL: ?tab=qa)
 * const { tab, changeTab, navigateWithTab, goToList } = useTab<'qa' | 'my' | 'faq'>({
 *   defaultTab: 'qa',
 *   basePath: '/user/qa',
 * });
 * 
 * // 탭 변경 (검색 조건 초기화 등 콜백 제공 가능)
 * changeTab('faq', () => resetFilters());
 * 
 * // 탭 상태 유지하며 상세/작성 페이지로 이동
 * navigateWithTab('/user/qa/123'); // -> /user/qa/123?tab=faq
 * 
 * // 탭 상태 유지하며 목록으로 돌아가기
 * goToList(); // -> /user/qa?tab=faq
 * 
 * @example
 * // 2. 커스텀 쿼리 파라미터 사용 (URL: ?section=profile)
 * const { tab: section, changeTab } = useTab<'profile' | 'security'>({
 *   paramName: 'section',
 *   defaultTab: 'profile',
 * });
 */

interface UseTabOptions<T extends string = string> {
  /** URL 쿼리 파라미터 키 이름 (기본값: 'tab') */
  paramName?: string;
  /** 기본 선택될 탭 값 */
  defaultTab: T;
  /** 목록 페이지의 기본 라우트 경로 (예: '/user/notice', '/user/qa') */
  basePath?: string;
}

export function useTab<T extends string = string>({
  paramName = 'tab',
  defaultTab,
  basePath,
}: UseTabOptions<T>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. URL 쿼리 스트링 -> 2. location.state -> 3. 기본값 순으로 탭 읽기
  const currentTab = (searchParams.get(paramName) as T) ||
                     (location.state as Record<string, T>)?.[paramName] ||
                     defaultTab;

  // [기능 1] 동일 페이지 내에서 탭 변경
  const changeTab = (nextTab: T, onTabChange?: (tab: T) => void) => {
    if (nextTab === currentTab) return;

    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set(paramName, nextTab);
      return updated;
    }, { replace: true });

    if (onTabChange) onTabChange(nextTab);
  };

  // [기능 2] 현재 탭 상태를 쿼리스트링에 유지하며 지정한 경로로 이동 (예: 상세페이지, 작성페이지로 이동)
  const navigateWithTab = (to: string) => {
    const hasQuery = to.includes('?');
    const target = `${to}${hasQuery ? '&' : '?'}${paramName}=${currentTab}`;
    navigate(target, { state: { [paramName]: currentTab } });
  };

  // [기능 3] 현재 탭 상태를 유지하며 목록으로 돌아가기
  const goToList = (fallbackPath?: string) => {
    const targetPath = fallbackPath || basePath || location.pathname;
    const hasQuery = targetPath.includes('?');
    const target = `${targetPath}${hasQuery ? '&' : '?'}${paramName}=${currentTab}`;
    
    navigate(target, { state: { [paramName]: currentTab } });
  };

  return {
    tab: currentTab,
    changeTab,
    navigateWithTab,
    goToList,
  };
}