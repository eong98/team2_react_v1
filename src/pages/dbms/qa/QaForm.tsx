import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertModal, AttachUploader, PageHeader, type AttachUploaderHandle } from '../../../components/ui';
import { axiosInstance, cutByByte, getByteLength, getNowDate, set_focus } from '../../../utils/Tool';
import { QA_TYPE_MAP, type FaqCRequest } from '../../../components/ts/QaType';
import axios from 'axios';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { usePaging } from '../../../hooks/usePaging';
import { ATTACH_BOARD_LABEL } from '../../../components/ts/Attach';

/**
 * 
 * DBMS 쪽 QaForm.tsx 는 자주묻는질문(FAQ) 만 수정이 가능합니다.
 * 
 */
export default function QaForm() {
  const { no } = useParams<{ no: string }>();
  const { no:ano, id, grade } = GlobalStoreSession();
  const isEdit = Boolean(no);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);
  
  
  /* 첨부파일 변경확인 */
  const attachRef = useRef<AttachUploaderHandle>(null);
  
  /* 에러타입 정의 */
  type FormErrors = Partial<Record<keyof FaqCRequest, string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const { goToList } = usePaging({ basePath: '/dbms/qa' });

  const [input, setInput] = useState<FaqCRequest>({
    ano: ano,
    type: 0,
    title: '',
    content: '',
    answer: '',
    cdate: '',
    pw: '',
    vseq: 1,
    fileyn : 'N'
  });

  /** 수정 진입 시 기존 데이터를 불러와 폼에 채워 넣는다 */
  const loadQaList = () => {
    axiosInstance.get(`/qa/${no}`, {
        headers: {
          accessNo: String(ano),
          grade: String(grade),
        },
      })
      .then((result) => result.data)
      .then((data) => {
        setInput((prev) => ({
          ...prev,
          ano: ano,
          type: data.type,
          title: data.title,
          content: data.content,
          answer: data.answer ?? '',
          vseq: data.vseq != null ? Number(data.vseq) : 1,
          fileyn: data.fileyn === 'Y' || data.fileyn === true ? 'Y' : 'N'
        }))
      })
      .catch((err) => console.error('게시물 상세 조회 실패:', err));
  }

  useEffect(() => {
    if (!isEdit) return;
    loadQaList();
  }, [isEdit, no]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // 제목(title) 입력 필드인 경우 200바이트 제한 적용
    if (name === 'title' && typeof value === 'string') {
      if (getByteLength(value) > 200) {
        // 200 바이트 넘어가면 자동으로 200바이트까지 잘라서 설정
        value = cutByByte(value, 200);
      }
    }

    setInput({ ...input, [name]: value });
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  



  // ==========================================
  // 2. 입력값 유효성 검사
  // ==========================================
  // 필수 항목이 늘어나면 이 배열에 한 줄만 추가하면 됩니다.
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string, id: string }[] = [
    { field: 'title', label: '문의 제목', id: 'qa_title' },
    { field: 'content', label: '문의 내용', id: 'qa_content' },
    { field: 'answer', label: '답변 내용', id: 'qa_answer' },
    { field: 'pw', label: '게시글 비밀번호', id: 'password' }
  ];


  const validate = () => {
    const newErrors: FormErrors = {};
    let firstErrorId: string | null = null;

    for (const { field, label, id } of REQUIRED_FIELDS) {
      if (!String(input[field] ?? '').trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
        if (!firstErrorId) firstErrorId = id;
      }
    }

    setErrors(newErrors);

    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }

    return true;
  };
  
  // ==========================================
  // 3. API 저장 처리 (POST /qa/faq)
  // ==========================================
  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: FaqCRequest = {
        ano,
        type: input.type,
        title: input.title,
        content: input.content,
        answer: input.answer,
        cdate: getNowDate(),
        pw: input.pw,
        vseq: input.vseq,
        fileyn: input.fileyn
      };
      


      if (isEdit) {
        // FAQ 작성 (수정) API 호출
        await axiosInstance.put(`/qa/faq/${no}`, payload);
        // 수정: 이미 있는 bno로, 그동안 담아둔 업로드/삭제 예정 파일들을 실제로 반영
        if (attachRef.current?.hasPendingChanges()) {
          try {
            await attachRef.current.commit();
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
      } else {
        // FAQ 작성 (등록) API 호출
        const res = await axiosInstance.post('/qa/faq', payload);
        
        const newNo = res.data;

        if (newNo && attachRef.current?.hasPendingChanges()) {
          try {
            await attachRef.current.commit(Number(newNo));
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
      }

      setAlert({ message: isEdit ? 'FAQ가 수정되었습니다.' : 'FAQ가 등록되었습니다.', variant: 'success', onConfirm: goToList });

    } catch (error) {
      console.error('FAQ 저장 중 오류 발생:', error);// Axios 에러인지 확인

      if (axios.isAxiosError(error)) {
        const status = error.response?.status; // HTTP 상태 코드 (400, 401, 404, 500 등)
        const data = error.response?.data; // 백엔드가 보내준 JSON 데이터

        // ----------------------------------------------------
        // 1. HTTP 상태 코드(Status)에 따른 에러 처리
        // ----------------------------------------------------
        if (status === 400 || status === 401) {
          // 비밀번호 틀림 / 잘못된 입력값인 경우
          // const msg = data?.message || '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.';
          // alert(msg);

        } else if (status === 404) {
          // 존재하지 않는 글번호(no)인 경우
          setAlert({ message: '존재하지 않거나 이미 삭제된 FAQ입니다.', variant: 'error' });

        } else if (status === 500) {
          // 🚨 500 에러일 때: 백엔드 메시지에 "비밀번호"라는 단어가 포함되어 있는지 체크
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
          
        } else {
          // 기타 상태 코드 처리
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
        
      } else {
        // Axios 에러가 아닌 일반 자바스크립트 오류
        setAlert({ message: '알 수 없는 오류가 발생했습니다.' , variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? 'FAQ 수정' : 'FAQ 작성'}
        description={
          isEdit
            ? `No.${no} FAQ 항목을 수정합니다.`
            : '자주 묻는 질문을 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}  encType="multipart/form-data">
        <div className="card card_pad_lg form_page">
          {/* 태그 (접수 유형) */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_type">
              문의 유형<span className="req" title="필수 입력 요소">*</span>
            </label>

            <div className="form_control">
              <select
                id="qa_type"
                name='type'
                className="form_select"
                value={input.type}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              >
                {Object.entries(QA_TYPE_MAP).map(([status, {label}]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="form_hint">유형을 선택하지 않을 경우 기타유형으로 등록됩니다.</div>
            </div>
          </div>

          {/* 작성자 (readOnly) */}
          <div className="form_group">
            <label className="form_label" htmlFor="user_id">
              작성자 ID
            </label>
            <div className="form_control">
              <input
                type='text'
                id="user_id"
                name='ano'
                className="form_input"
                value={`${isEdit ? id : '등록할때 저장된 아이디 수정예정'} (No.${ano})`}
                readOnly
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>

          {/* 제목 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_title">
              문의 제목<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                type='text'
                id="qa_title"
                className={`form_input ${errors.title ? 'is_error' : ''}`}
                placeholder="FAQ 제목을 입력하세요"
                name='title'
                value={input.title}
                onChange={onChange}
              />
                {errors.title ? (
                  <div className="form_hint error">{errors.title}</div>
                ) : (
                  <div className="form_hint">제목은 200자 이내만 가능합니다. </div>
                )}
            </div>
          </div>

          {/* 내용 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_content">
              문의 내용<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <textarea
                id="qa_content"
                className={`form_textarea ${errors.content ? 'is_error' : ''}`}
                placeholder="FAQ 상세 내용을 입력하세요"
                value={input.content}
                name='content'
                onChange={onChange}
                style={{ minHeight: 220 }}
              />
              {errors.content ? (
                <div className="form_hint error">{errors.content}</div>
              ) : (
                <div className="form_hint">등록 후에도 관리자 목록에서 수정할 수 있습니다.</div>
              )}
            </div>
          </div>

          {/* 답변내용 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_answer">
              답변 내용<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <textarea
                id="qa_answer"
                className={`form_textarea ${errors.answer ? 'is_error' : ''}`}
                placeholder="FAQ 답변 내용을 입력하세요"
                name='answer'
                value={input.answer}
                onChange={onChange}
                style={{ minHeight: 220 }}
              />
              {errors.answer && <div className="form_hint error">{errors.answer}</div>}
            </div>
          </div>

          
          {/* 파일영역 */}
          <AttachUploader 
              ref={attachRef} 
              tname={ATTACH_BOARD_LABEL[0].table} 
              bno={isEdit ? Number(no) : undefined}
              onCountChange={(count) => {
                setInput((prev) => ({ ...prev, fileyn: count > 0 ? 'Y' : 'N' }))
              }}
          />

          {/* 게시글 출력순서 */}
          <div className="form_group">
            <label className="form_label" htmlFor="seq">
              출력순서
            </label>
            <div className="form_control">
              <input
                type='number'
                min='1'
                id="seq"
                name='vseq'
                className="form_input"
                value={input.vseq}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              />
              <div className="form_hint">출력순서 미지정시 등록일 순으로 노출됩니다.</div>
            </div>
          </div>

          {/* 게시글 비밀번호 */}
          <div className="form_group">
            <label className="form_label" htmlFor="password">
              게시글 비밀번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                type='password'
                id="password"
                name='pw'
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
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              취소
            </button>
            <button
              type="submit"
              className="btn btn_md btn_primary"
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>


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