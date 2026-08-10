import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/common/PageHeader';
import {enter_chk, axiosInstance} from '../../../utils/Tool.ts'
import { MOCK_NOTICES, type Notice } from './InMenu.mock';

// 파일이름 꼭 맞춰주세요 
/* ---------------------------------------------------------------------
   공지 작성(/dbms/board/notice/new) / 수정(/dbms/board/notice/:no/edit) 페이지.
   NoticeView.tsx의 생성/수정 모달을 대체하는 전용 라우트입니다.
   (삭제는 그대로 목록 화면의 확인 모달을 사용합니다.)

   레이아웃: 라벨을 좌측에 고정폭으로 두는 .field_row 방식
   (SettingsView.tsx의 .slider_row/.toggle_row와 동일한 톤 — dbms.css 참고)
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

  const goBack = () => navigate('/dbms/menu');

  const send = async (e:React.SyntheticEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append('fkno', String(fkno));
    formData.append('dept', String(dept));
    formData.append('ord', String(ord));
    formData.append('title', String(title));
    formData.append('purl', String(purl));
    formData.append('tname', String(tname));
    formData.append('mname', String(mname));
    formData.append('useyn', String(useyn));


    try {
      const response = await axiosInstance.post(`/inmenu/save`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 401) { // axios는 상태값 처리, fetch는 안됨.
        alert('업로드 권한이 없습니다.\n관리자로 다시 로그인 해주세요.');
        return;
      } else if (response.status !== 200) {
        alert('업로드에 실패했습니다.\n다시 시도해주세요.');
        return;
      }

      // const result = await response.text(); // fetch
      const result = await response.data; // axios
      console.log('서버 응답:', result);
      navigate("/dbms/menu/");

    } catch (err) {
      console.error('네트워크 오류:', err);
      alert('네트워크 오류가 발생했습니다.\n다시 시도해주세요.');
    }
  }

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
      <form onSubmit={send} encType="multipart/form-data">
      <div className="card card_pad_lg form_page">  
        <div className="field_row">
          <div className="field_label">
            태그<span className="req">*</span>
          </div>
          <div className="field_control">
            <select
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
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">작성자</div>
          <div className="field_control">
            <input className="form_input" value={editing?.writer ?? 'admin'} disabled style={{ maxWidth: 200 }} />
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">
            제목<span className="req">*</span>
          </div>
          <div className="field_control">
            <input
              className="form_input"
              placeholder="공지 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">
            내용<span className="req">*</span>
          </div>
          <div className="field_control">
            <textarea
              className="form_textarea"
              placeholder="공지 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: 220 }}
            />
            <div className="field_hint">등록 후에도 목록에서 다시 수정할 수 있습니다.</div>
          </div>
        </div>

        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" onClick={send}>
            저장
          </button>
        </div>
      </div>
      </form>
    </section>
  );
}
