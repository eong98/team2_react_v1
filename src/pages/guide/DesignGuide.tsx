import { PageHeader } from '../../components/ui';
import {
  AccordionPrimitiveSection,
  AttachSection,          // ← 추가
  BadgeSection,
  ButtonSection,
  ColorSection,
  FormSection,
  HooksSection,
  LayoutSection,
  ModalSection,
  PaginationCompareSection,
  TableSection,
  TabSection,
  ToolbarCompareSection,
  TypographySection,
} from './GuideSections';

/**
 * 디자인 가이드 — /dbms/guide, /user/guide 둘 다 이 컴포넌트 하나를 그대로 가리킵니다.
 * user와 dbms 디자인이 다른 항목(검색바/페이지네이션)도 Compare 섹션으로 한 페이지 안에서
 * 같이 보이기 때문에, 어느 쪽 주소로 들어와도 똑같은 내용을 봅니다 — 굳이 파일을 나눌 이유가 없어서 통합.
 */
export default function DesignGuide() {
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
      <AttachSection />   {/* ← 추가 */}
      <HooksSection />
      <ToolbarCompareSection />
      <PaginationCompareSection />
      <TableSection />
      <AccordionPrimitiveSection />
      <ModalSection />
      
    </section>
  );
}