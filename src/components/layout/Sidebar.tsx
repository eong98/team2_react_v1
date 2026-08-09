import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getCopyright } from '../../utils/Tool';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

const navItemClass = ({ isActive }: { isActive: boolean }) => `nav_item${isActive ? ' active' : ''}`;

// 메뉴 데이터: 그룹 하나 = 아코디언 한 칸
const NAV_GROUPS = [
  {
    key: 'dashboard',
    label: '헤더 있는 페이지',
    items: [
      { to: 'user/dashboard/test1', label: '실시간 관제'},
      { to: 'user/dashboard/test2', label: '필터 여러개'},
      { to: 'user/dashboard/test3', label: '통계 / tab ui'},
      { to: 'user/dashboard/test4', label: '카드 ui'},
      { to: 'user/dashboard/test5', label: '설정 카드 ui'},
    ],
  },
  {
    key: 'form',
    label: '폼영역',
    items: [
      { to: 'user/form', label: '입력/수정/탈퇴' },
      { to: 'user/list', label: '목록(thead)/목록/카드목록' },
    ],
  },
  {
    key: 'send',
    label: '발송',
    items: [
      { to: 'user/send/form', label: '발송관리/ai도면' },
      { to: 'user/send/list', label: '목록/카드목록' }
    ],
  },
];

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  const location = useLocation();
  
  // 기본값: 전부 펼쳐진 상태 (기존 화면과 동일하게 보이도록)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(NAV_GROUPS.map((g) => g.key)));
  
  // 현재 경로가 속한 그룹은 접혀있어도 강제로 펼쳐서 보여줌
  const activeGroupKey = NAV_GROUPS.find((g) =>
    g.items.some((item) => location.pathname.endsWith(`/${item.to}`) || location.pathname === item.to)
  )?.key;

  const isGroupOpen = (key: string) => openGroups.has(key) || key === activeGroupKey;
  const toggleGroup = (key: string) => {
    setOpenGroups((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        allimio
      </div>

      <nav className='lnb'>
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.key);
          const isActiveGroup = group.key === activeGroupKey;
          return (
            <div className="nav_group" key={group.key}>
              <button
                type="button"
                className={`nav_label nav_group_trigger${isActiveGroup ? ' active' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`nav-group-${group.key}`}
                onClick={() => toggleGroup(group.key)}
              >
                {group.label}
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className={`nav_group_items${isOpen ? ' open' : ''}`} id={`nav-group-${group.key}`}>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navItemClass} onClick={onNavigate}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar_foot">
        <a className="nav_item" href="/" style={{ marginBottom: 10 }}>
          <span className="ic">🏠</span>랜딩 페이지로
        </a>

        <div className="user_chip">
          <div className="avatar">관</div>
          <div>
            <div className="name">관리자</div>
            <div className="role">본점 · 스터디카페 A</div>
          </div>
        </div>

      </div>
    </aside>
  );
}
