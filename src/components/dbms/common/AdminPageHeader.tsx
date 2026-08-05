import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: ReactNode;
  /** 우측 상단 버튼 라벨 (예: "+ 공지 작성"). onCreate와 함께 사용 */
  createLabel?: string;
  onCreate?: () => void;
  /** 버튼 대신 커스텀 우측 영역을 직접 넣고 싶을 때 */
  actions?: ReactNode;
}

/**
 * 모든 관리자 리스트 화면 최상단에 공통으로 쓰는 헤더.
 * 사용 예:
 *   <AdminPageHeader
 *     title="공지사항"
 *     description="서비스 업데이트와 점검 안내를 관리합니다."
 *     createLabel="+ 공지 작성"
 *     onCreate={() => setModalOpen(true)}
 *   />
 */
export default function AdminPageHeader({
  title,
  description,
  createLabel,
  onCreate,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="dbms-header">
      <div>
        <h1 className="dbms-header-title">{title}</h1>
        {description && <p className="dbms-header-desc">{description}</p>}
      </div>
      {actions ? (
        actions
      ) : createLabel ? (
        <button type="button" className="dbms-btn dbms-btn-md dbms-btn-primary" onClick={onCreate}>
          {createLabel}
        </button>
      ) : null}
    </div>
  );
}
