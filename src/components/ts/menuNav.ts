import { axiosInstance } from '../../utils/Tool';

/* ---------------------------------------------------------------------
   Sidebar(관리자/매장관리 공용)에서 쓰는 메뉴 트리 로더.

   - /dbms/* 화면에서는 IN_MENU(백엔드 /inmenu API)를,
     /user/* 화면에서는 SHOP_MENU(백엔드 /shopmenu API)를 불러옵니다.
   - 두 테이블 모두 컬럼 구조(no/fkno/dept/ord/title/purl/tname/mname/useYn)가
     동일해서, base 경로만 다르게 넘기면 이 파일 하나로 둘 다 처리됩니다.
   - dept=1(대표 메뉴) 기준으로 그룹을 만들고, 각 그룹의 dept=2(하위 메뉴)를
     children으로 붙여서 반환합니다. useYn='N'(미사용)인 메뉴는 제외합니다.
--------------------------------------------------------------------- */

export type MenuNavBase = '/inmenu' | '/shopmenu';

export interface MenuNavItem {
  no: number;
  fkno: number | null;
  dept: number;
  ord: number;
  purl: string;
  title: string;
  useYn?: 'Y' | 'N';
}

export interface MenuNavGroup {
  top: MenuNavItem;
  children: MenuNavItem[];
}

const DEPT_TOP = 1;

/**
 * base: '/inmenu' (관리자, IN_MENU) | '/shopmenu' (매장관리, SHOP_MENU)
 * find_by_fkno를 파라미터 없이 호출하면 대표 메뉴(fkno=null) 목록,
 * fkno를 넘기면 해당 대표 메뉴의 하위 메뉴 목록이 옵니다.
 */
export async function fetchMenuNav(base: MenuNavBase): Promise<MenuNavGroup[]> {
  const topRes = await axiosInstance.get(`${base}/find_by_fkno`);
  const tops = (topRes.data as MenuNavItem[])
    .filter((m) => Number(m.dept) === DEPT_TOP && m.useYn !== 'N')
    .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));

  const groups = await Promise.all(
    tops.map(async (top): Promise<MenuNavGroup> => {
      const childRes = await axiosInstance.get(`${base}/find_by_fkno`, {
        params: { fkno: top.no },
      });
      const children = (childRes.data as MenuNavItem[])
        .filter((m) => m.useYn !== 'N')
        .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));

      return { top, children };
    })
  );

  return groups;
}
