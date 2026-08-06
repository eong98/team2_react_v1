interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="topbar_mobile">
      <button className="menu_btn" onClick={onMenuClick} aria-label="전체 메뉴 열기">
        ☰
      </button>
      <div className="brand">
        <span className="logo_placeholder" aria-hidden="true" />
        allimio
      </div>
    </header>
  );
}
