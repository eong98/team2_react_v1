import { PageHeader } from '../../components/ui';
import {
  AccordionPrimitiveSection,
  BadgeSection,
  ButtonSection,
  ColorSection,
  FormSection,
  LayoutSection,
  ModalSection,
  PaginationCompareSection,
  TableSection,
  TabSection,
  ToolbarCompareSection,
  TypographySection,
} from './GuideSections';

/**
 * /user/guide — 디자인 가이드 (사용자 화면 기준으로 진입).
 * dbms 가이드와 완전히 같은 내용입니다 — 어느 쪽으로 들어와도 user/dbms 비교까지 다 보이도록
 * 일부러 페이지를 나누지 않고 공용 섹션(pages/guide/GuideSections.tsx)을 그대로 씁니다.
 */
export default function UserDesignGuide() {
  return (
    <section className="view active">
      <PageHeader title="디자인 가이드" description="화면 전반에서 공통으로 쓰는 스타일·컴포넌트 모음입니다." />

      <ColorSection />
      <TypographySection />
      <LayoutSection />
      <ButtonSection />
      <BadgeSection />
      <TabSection />
      <FormSection />
      <ToolbarCompareSection />
      <PaginationCompareSection />
      <TableSection />
      <AccordionPrimitiveSection />
      <ModalSection />
    </section>
  );
}
