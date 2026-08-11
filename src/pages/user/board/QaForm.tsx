import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance, getNowDate } from '../../../utils/Tool';
import { QA_TYPE_OPTIONS, type FaqCRequest, type QaTypes, type QCRequest } from '../../user/board/QaType';

export default function QaForm() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);
  const location = useLocation();
  const fromTab = (location.state as { tab?: 'mine' | 'faq' })?.tab;

  // 작성자 관리자 번호 (로그인 스토어나 Context에서 가져오거나 설정)
  const mno = 1;

  const qaLoad = () => {
    axiosInstance.get(`/qa/${no}`)
      .then((result) => result.data)
      .then((data) => {
        console.log(data)
        setInput((prev) => ({
          ...prev,
          mno: mno,
          type: data.type,
          title: data.title,
          content: data.content,
          // cdate: data.cdate,
          // pw: data.pw,
          vmode: data.vmode

        }))
      })
      .catch((err) => console.error('게시물 상세 조회 실패:', err));
  }
  


  useEffect(() => {
    if (!isEdit) return;



    
  }, [isEdit, no]);

  // ==========================================
  // 1. 폼 상태 관리
  // ==========================================
  const [input, setInput] = useState<QCRequest>({
    mno: mno,
    type: 0,
    title: '',
    content: '',
    cdate: '',
    pw: '',
    vmode: 'N'
  });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  // // 유효성 검사 에러 메시지
  // const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  // const [submitting, setSubmitting] = useState<boolean>(false);

  const goBack = () => navigate('/user/qa');

  // ==========================================
  // 2. 입력값 유효성 검사
  // ==========================================
  // const validate = () => {
  //   const newErrors: { title?: string; content?: string } = {};
  //   if (!title.trim()) newErrors.title = '제목을 입력해주세요.';
  //   if (!content.trim()) newErrors.content = '내용을 입력해주세요.';
    
  //   setErrors(newErrors);
  //   return Object.keys(newErrors).length === 0;
  // };

  // ==========================================
  // 3. API 저장 처리 (POST /api/qa/faq)
  // ==========================================
  const handleSave = async () => {
    // if (!validate() || submitting) return;

    // setSubmitting(true);
    try {
      const payload: QCRequest = {
        mno,
        type: input.type,
        title: input.title,
        content: input.content,
        cdate: getNowDate(),
        pw: input.pw,
        vmode: input.vmode
      };

      if (isEdit) {
        // TODO: 수정 API 연동 필요시 (예: PUT /api/qa/faq/{no})
        // await axiosInstance.put(`/api/qa/faq/${no}`, payload);
      } else {
        // 8. FAQ 작성 (등록) API 호출
        await axiosInstance.post('/qa', payload);
      }

      alert(isEdit ? '문의가 수정되었습니다.' : '문의가 등록되었습니다.');
      goBack();
    } catch (error) {
      console.error('문의 저장 중 오류 발생:', error);
      alert('저장 중 오류가 발생했습니다.');
    } 
  };

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '문의 수정' : '문의 작성'}
        description={
          isEdit
            ? `No.${no} 문의사항 항목을 수정합니다.`
            : '1:1문의를 등록합니다.'
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
            유형<span className="req" title="필수 입력 요소">*</span>
          </label>

          <div className="form_control">
            <select
              id="label_01"
              name='type'
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
          </div>
        </div>

        {/* 작성자 (readOnly) */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_02">
            작성자 ID
          </label>
          <div className="form_control">
            <input
              type='text'
              id="label_02"
              name='mno'
              className="form_input"
              value={`Admin (No.${mno})`}
              readOnly
              style={{ maxWidth: 200 }}
            />
          </div>
        </div>

        {/* 제목 */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_03">
            제목<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <input
              type='text'
              id="label_03"
              // className={`form_input ${errors.title ? 'is_invalid' : ''}`}
              className={`form_input`}
              placeholder="FAQ 제목을 입력하세요"
              name='title'
              value={input.title}
              onChange={onChange}
            />
            {/* {errors.title && <div className="form_hint error">{errors.title}</div>} */}
          </div>
        </div>

        {/* 내용 */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_04">
            내용<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <textarea
              id="label_04"
              className={`form_textarea`}
              // className={`form_textarea ${errors.content ? 'is_invalid' : ''}`}
              placeholder="FAQ 상세 내용을 입력하세요"
              value={input.content}
              name='content'
              onChange={onChange}
              style={{ minHeight: 220 }}
            />
            {/* {errors.content ? (
              <div className="form_hint error">{errors.content}</div>
            ) : (
              <div className="form_hint">등록 후에도 관리자 목록에서 수정할 수 있습니다.</div>
            )} */}
          </div>
        </div>

        {/* 답변내용 */}
        <div className="form_group">
          <label className="form_label" htmlFor="label_05">
            답변내용<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <textarea
              id="label_05"
              className={`form_textarea`}
              // className={`form_textarea ${errors.content ? 'is_invalid' : ''}`}
              placeholder="FAQ 답변 내용을 입력하세요"
              name='answer'
              value={input.answer}
              onChange={onChange}
              style={{ minHeight: 220 }}
            />
            {/* {errors.content ? (
              <div className="form_hint error">{errors.content}</div>
            ) : (
              <div className="form_hint">등록 후에도 관리자 목록에서 수정할 수 있습니다.</div>
            )} */}
          </div>
        </div>

        {/* 게시글 비밀번호 */}
        <div className="form_group">
          <label className="form_label" htmlFor="password">
            비밀번호
          </label>
          <div className="form_control">
            <input
              type='password'
              id="password"
              name='pw'
              className="form_input"
              value={input.pw}
              onChange={onChange}
              style={{ maxWidth: 200 }}
            />
          </div>
        </div>

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
            // disabled={submitting}
          >
            저장
            {/* {submitting ? '저장 중...' : '저장'} */}
          </button>
        </div>
      </div>
    </section>
  );
}