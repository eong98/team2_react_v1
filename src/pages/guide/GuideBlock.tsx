import { useState, type ReactNode } from 'react';
import './guide.css';

interface GuideBlockProps {
  /** 기능/컴포넌트 이름 */
  title: string;
  /** 무슨 기능인지 자세한 설명 */
  description: ReactNode;
  /** 실제 동작하는 데모 (children) */
  children: ReactNode;
  /** 복사 버튼으로 복사되는 사용 예시 코드 */
  code: string;
}

/**
 * 디자인 가이드의 최소 단위 블록. "설명 → 실제 동작 데모 → 복사 가능한 사용 코드" 3단 구성.
 * GuideCompare/GuideStack 안에 넣어서 두 개씩 나란히(비교) 또는 위아래로 배치할 수 있습니다.
 */
export function GuideBlock({ title, description, children, code }: GuideBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 환경 등 — 조용히 무시 (버튼 라벨이 안 바뀌는 것으로 실패를 알 수 있음)
    }
  };

  return (
    <div className="guide_block">
      <h4 className="title sm">{title}</h4>
      <p className="b_title guide_desc">{description}</p>

      <div className="guide_demo">{children}</div>

      <div className="guide_code_wrap">
        <div className="guide_code_head">
          <span className="b_caption">사용 예시</span>
          <button type="button" className="btn btn_sm btn_ghost" onClick={handleCopy}>
            {copied ? '복사됨 ✓' : '코드 복사'}
          </button>
        </div>
        <pre className="guide_code">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

/** 같은 기능인데 user/dbms 디자인이 서로 다를 때 — 좌우로 나란히 배치해서 바로 비교 */
export function GuideCompare({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="guide_compare">
      <div className="guide_compare_col">{left}</div>
      <div className="guide_compare_col">{right}</div>
    </div>
  );
}

/** 폼 구조(가로형/세로형)처럼 폭이 넓어서 좌우 배치가 안 맞는 경우 — 위아래로 배치 */
export function GuideStack({ children }: { children: ReactNode }) {
  return <div className="guide_stack">{children}</div>;
}

/** 여러 GuideBlock을 하나의 큰 섹션(카드)으로 묶는 래퍼 — 섹션 제목 + 설명 포함 */
export function GuideSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="guide_section">
      <div className="guide_section_head">
        <h3 className="title md">{title}</h3>
        {description && <p className="b_title">{description}</p>}
      </div>
      {children}
    </section>
  );
}
