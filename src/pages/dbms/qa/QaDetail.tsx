import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertModal, ConfirmDeleteModal, PageHeader } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import axios from 'axios';
import { QA_STATUS_MAP, QA_TYPE_MAP, type QARequest, type QaTypes, type TabKey } from '../../../components/ts/QaType';

export default function QaDetail() {
  const { no } = useParams<{ no: string }>();
  // const { no:ano, id } = GlobalStoreSession();
  // const accessno = GlobalStoreSession((state) => state.no);
  // const grade = GlobalStoreSession((state) => state.grade);
  const navigate = useNavigate();
  const location = useLocation();
  const ano = 1;
  const grade = 1;

  // 목록에서 어느 탭에서 들어왔는지 확인하여 돌아갈 때 상태 전달
  const fromTab = (location.state as { tab?: TabKey })?.tab;

  const goBack = () => navigate('/dbms/qa', { state: { tab: fromTab } });

  const [qa, setQa] = useState<QaTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState<boolean>(false);


  const loadQa = () => {
    
    axiosInstance
      .get(`/qa/${no}`, {
        headers: {
          'accessNo': String(ano),
          'grade': String(grade),
        }
      })
      .then((res) => setQa(res.data))
      .then((res) => {
        console.log(res)
      })
      .catch((err) => {
        console.error('문의 상세 조회 실패:', err);
        setError('문의 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }

  /* 문의내용 상세 데이터 */
  useEffect(() => {
    
    if (!no) return;
    setLoading(true);
    setError(null);

    loadQa();


  }, [no, ano, grade, isEdit]);

  
    // ==========================================
    // 1. 폼 상태 관리 ('Y' / 'N' 반영)
    // ==========================================
    const [input, setInput] = useState<QARequest>({
      ano: ano,
      answer: ''
    });

  useEffect(() => {
    if (!isEdit) return;
    
    setInput((prev) => ({
      ...prev,
      answer: qa?.answer
    }));

  }, [isEdit]);

  // 유효성 검사 에러 메시지
  type FormErrors = Partial<Record<keyof QARequest, string>>;
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  
  // 💡 공통 onChange (체크박스를 'Y' / 'N'으로 변환)
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));

    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  
  // ==========================================
  // 2. 입력값 유효성 검사
  // ==========================================
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string; id: string }[] = [
    { field: 'answer', label: '답변', id: 'answer' },
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
  const handleEdit = () => {
    console.log(!isEdit && qa?.status === 2 && !!qa?.answer)
    if (!isEdit && qa?.status === 2 && !!qa?.answer) {
      console.log('1')
      setIsEdit(true);
    } else {
      console.log('2')
      handleSave();
    }
  }

  const handleSave = async () => {
    if (!validate() || submitting) return;

    setIsEdit(true);
    setSubmitting(true);
    try {
      const payload: QARequest = {
        ano,
        answer: input.answer
      };

      await axiosInstance.put(`/qa/reply/${no}`, payload);

      setAlert({
        message: isEdit ? '답변 내용이 수정되었습니다.' : '답변 내용이 등록되었습니다.',
        variant: 'success',
        onConfirm: () => setIsEdit(false)
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


  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="문의 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !qa) {
    return (
      <section className="view active">
        <PageHeader 
            title="문의 상세" 
            description={error ?? '등록한 문의와 답변 내용을 확인할 수 있습니다.'} 
            actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              ← 목록으로
            </button>
            }
        />

        
        <div className='qa_area'>
          <div className="card card_pad_lg">
            <div className='empty_row'>
              해당 문의를 찾을 수 없거나 권한이 없습니다.
            </div>
          </div>
        </div>
      </section>
    );
  }


  return (
    <section className="view active">
      <PageHeader
        title="문의 상세" 
        description='등록한 문의와 답변 내용을 확인할 수 있습니다.'
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />
      
      <div className='qa_area'>
        <div className="card card_pad_lg">
          <div className='card_header'>
            <p className="b_title">No.{qa.no}</p>
      
            {qa.vmode === 'Y' && (
              <span className='badge neutral'>
                <span className='lock' aria-hidden="true"></span>
                비밀글
              </span>
            )}
          </div>

          <div className='badge_area'>
            <span className={`badge ${QA_STATUS_MAP[qa.status].className}`}>{QA_STATUS_MAP[qa.status].label}</span>
            <span className={`badge ${QA_TYPE_MAP[qa.type].className}`}>{QA_TYPE_MAP[qa.type].label}</span>
          </div>

          <div className='title_area'>
            <h2 className='title md'>{qa.title}</h2>
            <p className="b_title">
              <span>작성자 No.{qa.mno}</span>
              <span className='right'>{qa.cdate}</span>
            </p>

          </div>

          <p className='card_contents'>
            {qa.content}
          </p>
        </div>

        <div className="card card_pad_lg">
          <h3 className='title sm'>답변</h3>

          <div className='answer_area'>
            {loading ? (
              <div className="empty_row">로딩중...</div>
            ) : !isEdit && qa?.status === 2 && !!qa?.answer ? (
              /* 1. 답변이 있고 / 수정 중이 아니면: 답변 조회 화면 노출 */
              <>
                <p className="cell_title">{qa.answer}</p>
                {qa.adate && (
                  <div className="cell_sub">
                    답변일 · {qa.adate}
                  </div>
                )}
              </>
            ) : (
              /* 2. 답변이 없거나 / 수정 중이면: 입력 Form 노출 */
              <div className="form_group">
                <label className="form_label" htmlFor="answer">
                  답변 내용<span className="req" title="필수 입력 요소">*</span>
                </label>

                <div className="form_control">
                  <textarea
                    id="answer"
                    className={`form_textarea ${errors.answer ? 'is_error' : ''}`}
                    placeholder="답변 내용을 입력하세요"
                    name="answer"
                    value={input.answer}
                    onChange={onChange}
                  />
                  {errors.answer && <div className="form_hint error">{errors.answer}</div>}
                </div>
              </div>
            )}

            
            <div className='form_page_footer'>
              <button type='button' className='btn btn_primary' onClick={handleEdit} disabled={submitting}>
                {!isEdit && qa?.status === 2 && !!qa?.answer ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>

      
      {/* 알림 모달 */}
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