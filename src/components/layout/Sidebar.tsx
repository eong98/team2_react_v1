import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { fetchMenuNav, type MenuNavBase, type MenuNavGroup } from '../ts/menuNav';
import { GlobalStoreSession } from '../../store/LoginStore';
import { axiosInstance } from '../../utils/Tool';
import { isAdminGrade } from '../ts/MyPage';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

const navItemClass = ({ isActive }: { isActive: boolean }) => `nav_item${isActive ? ' active' : ''}`;

/* ---------------------------------------------------------------------
   /dbms/*, /user/* 양쪽에서 공용으로 쓰는 사이드바.

   - 현재 경로가 /dbms로 시작하면 IN_MENU(/inmenu API), /user로 시작하면
     SHOP_MENU(/shopmenu API)를 불러와서 메뉴를 그립니다.
   - 대표 메뉴(dept=1)는 하위 메뉴가 있으면 아코디언 그룹으로, 하위 메뉴가
     없으면 바로 이동하는 단일 링크로 렌더링합니다.
   - 하위 메뉴(dept=2)는 대표 메뉴 아코디언 안에 링크로 들어갑니다.
   - purl이 "/"로 시작하면 절대경로로 그대로 쓰고, 아니면 현재 영역
     (/dbms 또는 /user) 접두사를 붙여서 링크를 만듭니다.
--------------------------------------------------------------------- */
export default function Sidebar({ open, onNavigate }: SidebarProps) {
  const location = useLocation();

  const navigate = useNavigate();

  const { mname, no, grade } = GlobalStoreSession();
  const isMyPageAdmin = isAdminGrade(grade);

  const isDbms = location.pathname.startsWith('/dbms');
  const apiBase: MenuNavBase = isDbms ? '/inmenu' : '/shopmenu';
  const linkPrefix = isDbms ? '/dbms' : '/user';


  const resolveHref = (purl: string) => {
    if (!purl) return linkPrefix;
    return purl.startsWith('/') ? purl : `${linkPrefix}/${purl}`;
  };

  const [groups, setGroups] = useState<MenuNavGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchMenuNav(apiBase)
      .then((data) => {
        if (alive) setGroups(data);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setGroups([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [apiBase]);

  // 아코디언 펼침 상태 - 메뉴를 새로 불러오면 하위 메뉴가 있는 그룹은 기본 전부 펼침
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  useEffect(() => {
    setOpenGroups(new Set(groups.filter((g) => g.children.length > 0).map((g) => g.top.no)));
  }, [groups]);

  // 현재 경로가 속한 그룹은 접혀있어도 강제로 펼쳐서 보여줌
  const activeGroupNo = useMemo(() => {
    return groups.find((g) =>
      g.children.some((c) => {
        const href = resolveHref(c.purl);
        return location.pathname === href || location.pathname.startsWith(`${href}/`);
      })
    )?.top.no;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, location.pathname]);

  const isGroupOpen = (no: number) => openGroups.has(no) || no === activeGroupNo;
  const toggleGroup = (no: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const [avatarUrl, setAvatarUrl] = useState('');
  useEffect(() => {
    let objectUrl = '';
    if (!no || isMyPageAdmin) {
      setAvatarUrl('');
      return;
    }
    axiosInstance
      .get(`/profile/img/${no}`)
      .then((res) => {
        const storeFilename = res.data?.storeFilename;
        if (!storeFilename) return;
        return axiosInstance
          .get('/download', {
            params: { dir: 'profile', filename: storeFilename, downname: storeFilename },
            responseType: 'blob',
          })
          .then((imgRes) => {
            objectUrl = URL.createObjectURL(new Blob([imgRes.data]));
            setAvatarUrl(objectUrl);
          });
      })
      .catch(() => setAvatarUrl(''));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [no, isMyPageAdmin]);

  const handleLogout = () => {
    GlobalStoreSession.getState().setLogin(false);
    GlobalStoreSession.getState().setNo(0);
    GlobalStoreSession.getState().setGrade(99);
    GlobalStoreSession.getState().setId('');
    GlobalStoreSession.getState().setMname('');
    onNavigate();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        {isDbms ? 'allimio 관리자' : 'allimio'}
      </div>

      <nav className="lnb">
        {loading ? (
          <div className="nav_label">메뉴 불러오는 중...</div>
        ) : groups.length === 0 ? (
          <div className="nav_label">등록된 메뉴가 없습니다.</div>
        ) : (
          groups.map((group) => {
            const { top, children } = group;

            // 하위 메뉴가 없는 대표 메뉴는 아코디언 없이 바로 이동하는 링크로 렌더링
            if (children.length === 0) {
              return (
                <div className="nav_group" key={top.no}>
                  <NavLink to={resolveHref(top.purl)} className={navItemClass} onClick={onNavigate}>
                    {top.title}
                  </NavLink>
                </div>
              );
            }

            const isOpen = isGroupOpen(top.no);
            const isActiveGroup = top.no === activeGroupNo;

            return (
              <div className="nav_group" key={top.no}>
                <button
                  type="button"
                  className={`nav_label nav_group_trigger${isActiveGroup ? ' active' : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${top.no}`}
                  onClick={() => toggleGroup(top.no)}
                >
                  {top.title}
                  <span className="chev" aria-hidden="true">
                    ›
                  </span>
                </button>
                <div className={`nav_group_items${isOpen ? ' open' : ''}`} id={`nav-group-${top.no}`}>
                  {children.map((child) => (
                    <NavLink key={child.no} to={resolveHref(child.purl)} className={navItemClass} onClick={onNavigate}>
                      {child.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </nav>

      <div className="sidebar_foot">
        <a className="nav_item" href="/" style={{ marginBottom: 10 }}>
          <span className="ic">🏠</span>랜딩 페이지로
        </a>

        <div className="user_chip">
          <div className="avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="프로필 이미지"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              mname.slice(0, 1)
            )}
          </div>
          <div>
            <div className="name">{mname}</div>
            <div className="role" style={{ display: 'flex', gap: 6 }}>
              <NavLink to={isDbms ? '/dbms/mypage' : '/user/mypage'} onClick={onNavigate}>
                마이페이지
              </NavLink>
              <span>·</span>
              <button
                type="button"
                onClick={handleLogout}
                style={{ padding: 0, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
