import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { axiosInstance } from '../../utils/Tool';

/* ---------------------------------------------------------------------
   관리자 사이드바 메뉴에 붙이는 "처리할 일" 숫자.
   메뉴 주소(href)별 건수를 돌려주고, Sidebar가 해당 메뉴 이름 옆에 숫자를 표시합니다.

   - /dbms/qa      : 답변해야 할 문의 (답변대기 + 확인중)
   - /dbms/pending : 승인을 기다리는 구독 변경 신청

   화면을 이동할 때와 1분마다 다시 셉니다. 조회에 실패하면 그 메뉴는 숫자 없이 둡니다.
   로그인이 풀린 것(401)을 한 번 확인하면 그 뒤로는 다시 묻지 않습니다
   (다른 곳에서 같은 계정으로 로그인해 세션이 끊긴 채 화면을 켜 두면 콘솔에 401이 계속 쌓이던 것을 막음).
   다시 로그인하면 사이드바가 새로 그려지면서 조회도 다시 시작됩니다.
--------------------------------------------------------------------- */

const REFRESH_MS = 60_000;

/**
 * 목록 API의 전체 건수만 읽음 (size=1).
 * 뒤에서 조용히 도는 조회라, 로그인이 만료됐을 때 토큰 재발급·로그인 화면 이동을 일으키지 않게 함
 * (_retry: 공통 응답 처리(Tool.ts)가 "이미 재시도한 요청"으로 보고 그대로 실패 처리).
 * 작성 중인 화면이 이 조회 때문에 갑자기 로그인 화면으로 넘어가지 않게 하려는 것 — 실패하면 숫자만 안 보임.
 */
const countOf = async (url: string, params: Record<string, unknown>): Promise<number> => {
  const config = { params: { ...params, page: 0, size: 1 }, _retry: true };
  const res = await axiosInstance.get<{ totalElements?: number }>(url, config);
  return res.data?.totalElements ?? 0;
};

export function useAdminMenuBadges(enabled: boolean): Record<string, number> {
  const location = useLocation();
  const [badges, setBadges] = useState<Record<string, number>>({});
  // 로그인이 풀린 것을 확인했는지 — 확인한 뒤로는 조회하지 않음
  const signedOut = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setBadges({});
      return;
    }
    if (signedOut.current) return;
    let alive = true;
    let timer = 0;

    const load = async () => {
      const [qaWait, qaChecking, pending] = await Promise.allSettled([
        countOf('/qa/list', { status: 0 }),
        countOf('/qa/list', { status: 1 }),
        countOf('/shop_order_pending/list', { status: 0 }),
      ]);
      if (!alive) return;
      const unauthorized = [qaWait, qaChecking, pending].some(
        (r) => r.status === 'rejected' && [401, 403].includes(r.reason?.response?.status),
      );
      if (unauthorized) {
        signedOut.current = true;
        window.clearInterval(timer);
        setBadges({});
        return;
      }
      const value = (r: PromiseSettledResult<number>) => (r.status === 'fulfilled' ? r.value : 0);
      setBadges({
        '/dbms/qa': value(qaWait) + value(qaChecking),
        '/dbms/pending': value(pending),
      });
    };

    load();
    timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
    // 화면을 옮길 때마다 다시 셈 — 답변·승인 직후 숫자가 바로 줄어들게
  }, [enabled, location.pathname]);

  return badges;
}
