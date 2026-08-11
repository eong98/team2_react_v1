import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_NOTICES, type Notice } from './notice.mock';
import PageHeader from '../../../components/ui/common/PageHeader';

// 파일이름 꼭 맞춰주세요 
/* ---------------------------------------------------------------------
   공지 작성(/dbms/board/notice/new) / 수정(/dbms/board/notice/:no/edit) 페이지.
   NoticeView.tsx의 생성/수정 모달을 대체하는 전용 라우트입니다.
   (삭제는 그대로 목록 화면의 확인 모달을 사용합니다.)

   레이아웃: 라벨을 좌측에 고정폭으로 두는 .field_row 방식
   (SettingsView.tsx의 .slider_row/.toggle_row와 동일한 톤 — dbms.css 참고)

   
    2026-08-09
    에러 메시지 노출을 위해 form_group 으로 감싸서 사용할 것

    ** 웹 접근성 **
    req 사용시 title='필수 입력 요소' 필수 명시
    인풋 사용시 checkbox,radio 외 모든 인풋요소에 label htmlFor / input id 값 매칭 필수

--------------------------------------------------------------------- */

const TAG_OPTIONS: Notice['tag'][] = ['긴급', '중요', '신규', '일반'];

export default function NoticeFormView() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);

  const editing = useMemo(() => {
    if (!isEdit) return null;
    return MOCK_NOTICES.find((n) => String(n.no) === no) ?? null;
  }, [isEdit, no]);

  const [tag, setTag] = useState<Notice['tag']>(editing?.tag ?? '일반');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState(editing?.content ?? '');

  const goBack = () => navigate('/dbms/board/notice');

  const handleSave = () => {
    // TODO: 실제 등록/수정 API 연동
    //   신규: POST /api/notice        { tag, title, content }
    //   수정: PUT  /api/notice/{no}   { tag, title, content }
    goBack();
  };

  if (isEdit && !editing) {
    return (
      <section className="view active">
        <PageHeader title="공지 수정" description="해당 공지를 찾을 수 없습니다." />
        <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
          ← 목록으로
        </button>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '공지 수정' : '공지 작성'}
        description={
          isEdit
            ? `No.${editing?.no} · 작성자 ${editing?.writer} · ${editing?.cdate}`
            : '서비스 업데이트, 점검, 안내 사항을 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg form_page">

        <div className="form_group">
          <label className="form_label" htmlFor='label_01'>
            태그<span className="req" title='필수 입력 요소'>*</span>
          </label>

          <div className="form_control">
            <select
              id="label_01"
              className="form_select"
              value={tag}
              onChange={(e) => setTag(e.target.value as Notice['tag'])}
              style={{ maxWidth: 200 }}
            >
              {TAG_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            
            <div className="form_hint error">에러메시지</div>
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor='label_02'>작성자</label>
          <div className="form_control">
            <input id='label_02' className="form_input" value={editing?.writer ?? 'admin'} readOnly style={{ maxWidth: 200 }} />
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor='label_03'>
            제목<span className="req" title='필수 입력 요소'>*</span>
          </label>
          <div className="form_control">
            <input
              id='label_03'
              className="form_input"
              placeholder="공지 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <div className="form_hint error">에러메시지</div>
          </div>
        </div>

        <div className="form_group">
          <label className="form_label" htmlFor='label_04'>
            내용<span className="req" title='필수 입력 요소'>*</span>
          </label>
          <div className="form_control">
            <textarea
              id='label_04'
              className="form_textarea"
              placeholder="공지 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: 220 }}
            />
            
            <div className="form_hint">등록 후에도 목록에서 다시 수정할 수 있습니다.</div>
          </div>
        </div>

        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </section>
  );
}
