
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
 * /dbms/guide — 디자인 가이드 (관리자 화면 기준으로 진입).
 * 섹션 대부분은 user/dbms 공용이라 pages/guide/GuideSections.tsx를 그대로 가져다 씁니다.
 * user와 디자인이 다른 항목(검색바/페이지네이션)은 Compare 섹션으로 좌우 비교가 같이 보입니다.
 */
export default function DbmsDesignGuide() {
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
