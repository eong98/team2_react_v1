import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertModal, PageHeader } from '../../../components/ui';
import { axiosInstance, cutByByte, getByteLength, getNowDate, set_focus } from '../../../utils/Tool';
import { QA_TYPE_MAP, type QCRequest, type TabKey } from '../../../components/ts/QaType';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { useTab } from '../../../hooks/useTab';
import { usePaging } from '../../../hooks/usePaging';
import { NOTICE_TYPE_MAP, type NCRequest } from '../../../components/ts/NoticeType';

export default function NoticeForm() {
  const { no } = useParams<{ no: string }>(); // URL에 no가 있으면 수정 모드
  const { no: ano, id, grade } = GlobalStoreSession();
  const isEdit = Boolean(no);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  /* 에러타입 정의 */
  type FormErrors = Partial<Record<keyof NCRequest, string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const { goToList, navigateWithQuery } = usePaging({ basePath: '/dbms/notice' });

  // 뒤로 가기 (수정이면 상세로, 신규 작성이면 목록으로)
  const goBack = () => {
    if (isEdit) {
      navigateWithQuery(`../notice/${no}`);
    } else {
      goToList();
    }
  };

  const [input, setInput] = useState<NCRequest>({
    ano: ano,
    type: 3,
    title: '',
    content: '',
    cdate: '',
    pw: '',
    fixyn: 'N',
    fileyn: 'N',
    vmode: 'Y',
    vseq: 1
  });

  
  // 수정 모드일 때 기존 게시글 정보 조회
  const loadNotice = () => {
    axiosInstance
      .get(`/notice/${no}`, {
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
          fixyn: data.fixyn === 'Y' || data.fixyn === true ? 'Y' : 'N',
          fileyn: data.fileyn === 'Y' || data.fileyn === true ? 'Y' : 'N',
          vmode: data.vmode === 'Y' || data.vmode === true ? 'Y' : 'N',
          vseq: data.vseq
        }));
      })
      .catch((err) => console.error('게시물 상세 조회 실패:', err));
  };

  useEffect(() => {
    if (!isEdit) return;
    loadNotice();
  }, [isEdit, no]);

  // 입력 필드 변경
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue = type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 'Y' : 'N') : value;

    // 제목(title) 입력 필드인 경우 200바이트 제한 적용
    if (name === 'title' && typeof newValue === 'string') {
      if (getByteLength(newValue) > 200) {
        // 200 바이트 넘어가면 자동으로 200바이트까지 잘라서 설정
        newValue = cutByByte(newValue, 200);
      }
    }
    
    setInput((prev) => ({ ...prev, [name]: newValue }));

    // 에러 해제
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 필수 필드 정의
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string; id: string }[] = [
    { field: 'title', label: '공지사항 제목', id: 'notice_title' },
    { field: 'content', label: '공지사항 내용', id: 'notice_content' },
    { field: 'pw', label: '게시글 비밀번호', id: 'password' },
  ];

  // 유효성 검사: 필수 필드 전부 검사해서 전부 에러로 잡고, 포커스는 맨 첫 번째 오류 필드로만 이동
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

  // 저장 (등록 / 수정)
  const handleSave = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: NCRequest = {
        ano: ano,
        type: Number(input.type),
        title: input.title,
        content: input.content,
        cdate: getNowDate(),
        pw: input.pw,
        fixyn: input.fixyn,
        fileyn: input.fileyn,
        vmode: input.vmode,
        vseq: input.vseq,
      };

      if (isEdit) {
        await axiosInstance.put(`/notice/${no}`, payload);
      } else {
        await axiosInstance.post('/notice', payload);
      }

      setAlert({
        message: isEdit ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (error) {
      console.error('공지사항 저장 중 오류 발생:', error);

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
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 공지하세요.', variant: 'error' });
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
        title={isEdit ? '공지 수정' : '공지 작성'}
        description={
          isEdit
            ? `No.${no} 공지사항 항목을 수정합니다.`
            : '공지할 내용을 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg form_page">
        {/* 공지 유형 */}
        <div className="form_group">
          <label className="form_label" htmlFor="type">
            공지 유형<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <select
              id="type"
              name="type"
              className="form_select"
              value={input.type}
              onChange={onChange}
              style={{ maxWidth: 200 }}
            >
              {Object.entries(NOTICE_TYPE_MAP).map(([type, {label}]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
            <div className="form_hint">유형을 선택하지 않을 경우 신규유형으로 등록됩니다.</div>
          </div>
        </div>

        {/* 작성자 ID (읽기 전용) */}
        <div className="form_group">
          <label className="form_label" htmlFor="user_id">
            작성자 ID
          </label>
          <div className="form_control">
            <input
              type="text"
              id="user_id"
              name="ano"
              className="form_input"
              value={`${isEdit ? id : '등록할때 저장된 아이디 수정예정'}  (No.${ano})`}
              readOnly
              style={{ maxWidth: 200 }}
            />
          </div>
        </div>

        {/* 공지 제목 */}
        <div className="form_group">
          <label className="form_label" htmlFor="title">
            공지 제목<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <input
              type="text"
              id="title"
              className={`form_input ${errors.title ? 'is_error' : ''}`}
              placeholder="공지사항 제목을 입력하세요"
              name="title"
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

        {/* 공지 내용 */}
        <div className="form_group">
          <label className="form_label" htmlFor="content">
            공지 내용<span className="req" title="필수 입력 요소">*</span>
          </label>
          <div className="form_control">
            <textarea
              id="content"
              className={`form_textarea ${errors.content ? 'is_error' : ''}`}
              placeholder="공지사항 내용을 입력하세요"
              value={input.content}
              name="content"
              onChange={onChange}
              style={{ minHeight: 220 }}
            />
            {errors.content ? (
              <div className="form_hint error">{errors.content}</div>
            ) : (
              <div className="form_hint">등록 후에도 공지사항 목록에서 수정할 수 있습니다.</div>
            )}
          </div>
        </div>

        {/* 파일영역 */}
        <div className="form_group">
          <label className="form_label" htmlFor='file'>
            첨부파일<span className="req" title="필수 입력 요소">*</span>
          </label>
          
          <div className="form_control">
            <div className='file_area'>
              <label className="file_drop">
                <input type="file" className="sr_only_input" />
                <span className="file_upload" aria-hidden="true"></span>
                <span className="fd_text">
                  <b>클릭하거나 파일을 끌어다 놓으세요</b>
                  <br />
                  사업자등록증 · PDF, JPG (최대 10MB)
                </span>
              </label>

              {input.fileyn && (
                <div className='list_files'>
                  {/* 업로드된 파일 갯수 노출 */}

                  <div className='list'>
                    <div className='attach_row'>
                      <span className='ic' aria-hidden='true'>PDF</span>
                      <span className="fn">사업자등록증.pdf</span>
                      <span className="fs">1.2MB</span>
                      <button type="button" className="btn btn_xsm btn_del"><span className='hidden'>첨부파일 삭제</span></button>
                    </div>
                    <div className='attach_row'>
                      <span className='ic' aria-hidden='true'>PDF</span>
                      <span className="fn">사업자등록증.pdf</span>
                      <span className="fs">1.2MB</span>
                      <button type="button" className="btn btn_xsm btn_del"><span className='hidden'>첨부파일 삭제</span></button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errors.vmode && <div className="form_hint error">{errors.vmode}</div>}
          </div>
        </div>

        {/* 고정여부 설정 */}
        <div className="form_group">
          <div className="form_label">
            고정 여부<span className="req" title="필수 입력 요소">*</span>
          </div>
          
          <div className="form_control">
            <div className="form_check">
              <input
                type="checkbox"
                id="label_08"
                name="fixyn"
                checked={input.fixyn === 'Y'}
                onChange={onChange}
              />
              <label htmlFor="label_08" className="b_title">
                고정
              </label>
            </div>

            <div className="form_hint">최 상단에 해당 게시글을 고정시킵니다.</div>
          </div>
        </div>

        {/* 공개 여부 설정 */}
        <div className="form_group">
          <div className="form_label">
            공개 여부<span className="req" title="필수 입력 요소">*</span>
          </div>

          <div className="form_control">
            <div className="check_row">
              <div className="form_check">
                <input type="radio" id="Y" name="vmode" value='Y' checked={input.vmode === 'Y'} onChange={onChange} />
                <label htmlFor="Y" className="b_title">
                  공개
                </label>
              </div>

              <div className="form_check">
                <input type="radio" id="N" name="vmode" value='N' checked={input.vmode === 'N'} onChange={onChange} />
                <label htmlFor="N" className="b_title">
                  비공개
                </label>
              </div>
            </div>

            {errors.vmode && <div className="form_hint error">{errors.vmode}</div>}
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

        {/* 푸터 버튼 */}
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

      {/* 안내 알림 모달 */}
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