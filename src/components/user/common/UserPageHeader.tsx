import type { ReactNode } from 'react';

interface UserPageHeaderProps {
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
 * 기존 .view_head / .btn 클래스를 그대로 사용 (StoresView.tsx 패턴과 동일).
 *
 * 사용 예:
 *   <AdminPageHeader
 *     title="공지사항"
 *     description="서비스 업데이트와 점검 안내를 관리합니다."
 *     createLabel="+ 공지 작성"
 *     onCreate={() => setModalOpen(true)}
 *   />
 */
export default function UserPageHeader({
  title,
  description,
  createLabel,
  onCreate,
  actions,
}: UserPageHeaderProps) {
  return (
    <div
      className="view_head"
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
    >
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions ? (
        actions
      ) : createLabel ? (
        <button type="button" className="btn btn_md btn_primary" onClick={onCreate}>
          {createLabel}
        </button>
      ) : null}
    </div>
  );
}
