import { useEffect, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance, getNowDate, set_focus } from '../../../utils/Tool';
import { QA_TYPE_OPTIONS, type QCRequest, type TabKey } from '../../user/board/QaType';

/**
 * USER 쪽 QaForm.tsx는 내 문의만 작성/수정이 가능합니다.
 */
export default function QaForm() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  
  // 작성자 관리자/회원 번호 (임시)
  const mno = 1;
  const isEdit = Boolean(no);
  const location = useLocation();

  // 목록에서 어느 탭에서 들어왔는지 확인하여 돌아갈 때 상태 전달
  const fromTab = (location.state as { tab?: TabKey })?.tab;

  const goBack = () => navigate('/user/qa', { state: { tab: fromTab } });

  // ==========================================
  // 1. 폼 상태 관리 ('Y' / 'N' 반영)
  // ==========================================
  const [input, setInput] = useState<QCRequest>({
    mno: mno,
    type: 0,
    title: '',
    content: '',
    cdate: '',
    pw: '',
    vmode: 'N', // 👈 'Y' | 'N' 문자열 초기값
  });

  // 유효성 검사 에러 메시지
  type FormErrors = Partial<Record<keyof QCRequest, string>>;
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  /** 수정 진입 시 기존 데이터를 불러와 폼에 채워 넣음 */
  const loadQa = () => {
    axiosInstance
      .get(`/qa/${no}`)
      .then((result) => result.data)
      .then((data) => {
        setInput((prev) => ({
          ...prev,
          mno: mno,
          type: data.type,
          title: data.title,
          content: data.content,
          vmode: data.vmode === 'Y' || data.vmode === true ? 'Y' : 'N', // 👈 백엔드 값 'Y'/'N' 변환
        }));
      })
      .catch((err) => console.error('게시물 상세 조회 실패:', err));
  };

  useEffect(() => {
    if (!isEdit) return;
    loadQa();
  }, [isEdit, no]);

  // 💡 공통 onChange (체크박스를 'Y' / 'N'으로 변환)
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 체크박스일 경우 checked 여부에 따라 'Y' / 'N' 설정
    const newValue = type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 'Y' : 'N') : value;

    setInput((prev) => ({ ...prev, [name]: newValue }));

    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // ==========================================
  // 2. 입력값 유효성 검사
  // ==========================================
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string; id: string }[] = [
    { field: 'title', label: '문의 제목', id: 'label_03' },
    { field: 'content', label: '문의 내용', id: 'label_04' },
    { field: 'pw', label: '게시글 비밀번호', id: 'password' },
  ];

  const validate = () => {
    for (const { field, label, id } of REQUIRED_FIELDS) {
      if (!String(input[field] ?? '').trim()) {
        setErrors({ [field]: `${label}을(를) 입력해주세요.` });
        set_focus(id);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  // ==========================================
  // 3. API 저장 처리 (POST / PUT)
  // ==========================================
  const handleSave = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: QCRequest = {
        mno,
        type: Number(input.type),
        title: input.title,
        content: input.content,
        cdate: getNowDate(),
        pw: input.pw,
        vmode: input.vmode, // 👈 'Y' 또는 'N' 전송
      };

      if (isEdit) {
        await axiosInstance.put(`/qa/${no}`, payload);
      } else {
        await axiosInstance.post('/qa', payload);
      }

      setAlert({
        message: isEdit ? '문의사항이 수정되었습니다.' : '문의사항이 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (error) {
      console.error('문의사항 저장 중 오류 발생:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 400 || status === 401) {
          setAlert({ message: '입력값을 확인하거나 비밀번호를 다시 확인해주세요.', variant: 'error' });
        } else if (status === 404) {
          setAlert({ message: '존재하지 않거나 이미 삭제된 게시글입니다.', variant: 'error' });
        } else if (status === 500) {
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
        } else {
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
      } else {
        setAlert({ message: '알 수 없는 오류가 발생했습니다.', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '문의 수정' : '문의 작성'}
        description={
          isEdit
            ? `No.${no} 문의사항 항목을 수정합니다.`
            : '서비스 이용에 어려움을 겪고있는 문의사항을 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg form_page">
        {/* 태그 (접수 유형) */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_01">
            문의 유형<span className="req" title="필수 입력 요소">*</span>
          </label>

          <div className="form_control">
            <select
              id="label_01"
              name="type"
              className="form_select"
              value={input.type}
              onChange={onChange}
              style={{ maxWidth: 200 }}
            >
              {QA_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="form_hint">유형을 선택하지 않을 경우 기타유형으로 등록됩니다.</div>
          </div>
        </div>

        {/* 작성자 (readOnly) */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_02">
            작성자 ID
          </label>
          <div className="form_control">
            <input
              type="text"
              id="label_02"
              name="ano"
              className="form_input"
              value={`No.${mno}`}
              readOnly
              style={{ maxWidth: 200 }}
            />
          </div>
        </div>

        {/* 제목 */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_03">
            문의 제목<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <input
              type="text"
              id="label_03"
              className={`form_input ${errors.title ? 'is_error' : ''}`}
              placeholder="문의사항 제목을 입력하세요"
              name="title"
              value={input.title}
              onChange={onChange}
            />
            {errors.title && <div className="form_hint error">{errors.title}</div>}
          </div>
        </div>

        {/* 내용 */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_04">
            문의 내용<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <textarea
              id="label_04"
              className={`form_textarea ${errors.content ? 'is_error' : ''}`}
              placeholder="문의사항 내용을 입력하세요"
              value={input.content}
              name="content"
              onChange={onChange}
              style={{ minHeight: 220 }}
            />
            {errors.content ? (
              <div className="form_hint error">{errors.content}</div>
            ) : (
              <div className="form_hint">등록 후에도 내 문의 목록에서 수정할 수 있습니다.</div>
            )}
          </div>
        </div>

        {/* 비밀글 여부 ('Y' / 'N' 체크박스) */}
        <div className="form_group">
          <div className="form_label">비밀글 여부</div>
          <div className="form_control">
            <div className="form_check">
              <input
                type="checkbox"
                id="label_08"
                name="vmode"
                checked={input.vmode === 'Y'} // 👈 'Y' 인지 비교
                onChange={onChange}
              />
              <label htmlFor="label_08" className="b_title">
                비밀글 설정
              </label>
            </div>
            <div className="form_hint">비밀글 미설정시 전체공개됩니다.</div>
          </div>
        </div>

        {/* 게시글 비밀번호 */}
        <div className="form_group">
          <label className="form_label" htmlFor="password">
            게시글 비밀번호<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <input
              type="password"
              id="password"
              name="pw"
              className={`form_input ${errors.pw ? 'is_error' : ''}`}
              value={input.pw}
              onChange={onChange}
              style={{ maxWidth: 200 }}
            />
            {errors.pw && <div className="form_hint error">{errors.pw}</div>}
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            취소
          </button>
          <button
            type="button"
            className="btn btn_md btn_primary"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}