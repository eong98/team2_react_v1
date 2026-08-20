import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { GlobalStoreSession } from '../../../store/LoginStore';
import { AlertModal, PageHeader } from '../../../components/ui';
import type { SurveyQuestionForm } from '../../../components/ts/survey';
import {
  createEmptyQuestion,
  parseQuestionType,
  toInputDate,
  toServerEndDate,
  toServerStartDate,
} from '../../../components/ts/survey';
import { createSurvey, getSurvey, updateSurvey } from '../../../components/ts/surveyApi';

import './SurveyForm.css';

interface QuestionErrors {
  qtext?: string;
  options?: Record<number, string>;
}

interface FieldErrors {
  title?: string;
  startDate?: string;
  endDate?: string;
  questions: Record<number, QuestionErrors>;
}

export default function SurveyForm() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const isEdit = Boolean(no);
  const managerNo = GlobalStoreSession((state) => state.no);

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestionForm[]>([createEmptyQuestion(1)]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({ questions: {} });
  const [alert, setAlert] = useState<{
    message: string;
    variant?: 'success' | 'error';
    onConfirm?: () => void;
  } | null>(null);

  // 수정 데이터 조회
  useEffect(() => {
    if (!isEdit || !no) return;

    const loadSurvey = async () => {
      try {
        setLoading(true);
        const survey = await getSurvey(no);

        setTitle(survey.title ?? '');
        setDetail(survey.detail ?? '');
        setStartDate(toInputDate(survey.startDate));
        setEndDate(toInputDate(survey.endDate));

        const loadedQuestions: SurveyQuestionForm[] = (survey.questions ?? []).map(
          (question: any, index: number) => ({
            no: question.no,
            surveyNo: question.surveyNo,
            qtext: question.qtext ?? '',
            qtype: parseQuestionType(question.qtype ?? 'TEXT'),
            qoptions: question.qoptions ? question.qoptions.split('|') : [],
            requiredYn: question.requiredYn === 'N' ? 'N' : 'Y',
            seqNo: question.seqNo ?? index + 1,
          })
        );

        setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [createEmptyQuestion(1)]);
      } catch (error: any) {
        console.error(error);
        setAlert({
          message: error.response?.data?.message ?? '설문 정보를 불러오지 못했습니다.',
          variant: 'error',
          onConfirm: () => navigate('/dbms/survey'),
        });
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [isEdit, no, navigate]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setErrors((prev) => ({
      ...prev,
      startDate: undefined,
      endDate:
        prev.endDate === '설문 종료일은 시작일보다 빠를 수 없습니다.'
          ? undefined
          : prev.endDate,
    }));
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: undefined }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setAlert({ message: '설문 문항은 한 개 이상 필요합니다.', variant: 'error' });
      return;
    }

    setQuestions((prev) =>
      prev
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, questionIndex) => ({ ...question, seqNo: questionIndex + 1 }))
    );
    setErrors((prev) => ({ ...prev, questions: {} }));
  };

  const changeQuestionText = (index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((question, questionIndex) =>
        questionIndex === index ? { ...question, qtext: value } : question
      )
    );

    setErrors((prev) => ({
      ...prev,
      questions: {
        ...prev.questions,
        [index]: { ...prev.questions[index], qtext: undefined },
      },
    }));
  };

  const changeQuestionType = (index: number, value: string) => {
    const qtype = parseQuestionType(value);

    setQuestions((prev) =>
      prev.map((question, questionIndex) => {
        if (questionIndex !== index) return question;

        const isChoice = qtype === 'SINGLE' || qtype === 'MULTIPLE';
        return {
          ...question,
          qtype,
          qoptions: isChoice ? (question.qoptions.length > 0 ? question.qoptions : ['']) : [],
        };
      })
    );

    setErrors((prev) => ({
      ...prev,
      questions: {
        ...prev.questions,
        [index]: { ...prev.questions[index], options: undefined },
      },
    }));
  };

  const changeRequired = (index: number, checked: boolean) => {
    setQuestions((prev) =>
      prev.map((question, questionIndex) =>
        questionIndex === index
          ? { ...question, requiredYn: checked ? 'Y' : 'N' }
          : question
      )
    );
  };

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? { ...question, qoptions: [...question.qoptions, ''] }
          : question
      )
    );
  };

  const changeOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              qoptions: question.qoptions.map((option, currentIndex) =>
                currentIndex === optionIndex ? value : option
              ),
            }
          : question
      )
    );

    setErrors((prev) => {
      const currentQuestion = prev.questions[questionIndex];
      if (!currentQuestion?.options) return prev;

      const nextOptions = { ...currentQuestion.options };
      delete nextOptions[optionIndex];

      return {
        ...prev,
        questions: {
          ...prev.questions,
          [questionIndex]: {
            ...currentQuestion,
            options: Object.keys(nextOptions).length > 0 ? nextOptions : undefined,
          },
        },
      };
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              qoptions: question.qoptions.filter(
                (_, currentIndex) => currentIndex !== optionIndex
              ),
            }
          : question
      )
    );

    setErrors((prev) => ({
      ...prev,
      questions: {
        ...prev.questions,
        [questionIndex]: { ...prev.questions[questionIndex], options: undefined },
      },
    }));
  };

  // 필수 입력 검증
  const validateForm = () => {
    const nextErrors: FieldErrors = { questions: {} };
    let valid = true;

    if (!title.trim()) {
      nextErrors.title = '설문 제목을 입력해주세요.';
      valid = false;
    }

    if (!startDate) {
      nextErrors.startDate = '설문 시작일을 선택해주세요.';
      valid = false;
    }

    if (!endDate) {
      nextErrors.endDate = '설문 종료일을 선택해주세요.';
      valid = false;
    }

    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = '설문 종료일은 시작일보다 빠를 수 없습니다.';
      valid = false;
    }

    questions.forEach((question, questionIndex) => {
      const questionErrors: QuestionErrors = {};

      if (!question.qtext.trim()) {
        questionErrors.qtext = '질문 내용을 입력해주세요.';
        valid = false;
      }

      if (question.qtype === 'SINGLE' || question.qtype === 'MULTIPLE') {
        const optionErrors: Record<number, string> = {};

        if (question.qoptions.length === 0) {
          optionErrors[0] = '선택지를 한 개 이상 추가해주세요.';
          valid = false;
        }

        question.qoptions.forEach((option, optionIndex) => {
          if (!option.trim()) {
            optionErrors[optionIndex] = '선택지를 입력해주세요.';
            valid = false;
          }
        });

        if (Object.keys(optionErrors).length > 0) {
          questionErrors.options = optionErrors;
        }
      }

      if (Object.keys(questionErrors).length > 0) {
        nextErrors.questions[questionIndex] = questionErrors;
      }
    });

    setErrors(nextErrors);
    return valid;
  };

  // 설문 등록/수정
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const serverData = {
      managerNo,
      title: title.trim(),
      detail: detail.trim(),
      startDate: toServerStartDate(startDate),
      endDate: toServerEndDate(endDate),
      questions: questions.map((question, index) => {
        let qoptions: string | null = null;

        if (question.qtype === 'SINGLE' || question.qtype === 'MULTIPLE') {
          qoptions = question.qoptions.map((option) => option.trim()).filter(Boolean).join('|');
        }

        return {
          qtext: question.qtext.trim(),
          qtype: question.qtype,
          qoptions,
          requiredYn: question.requiredYn,
          seqNo: index + 1,
        };
      }),
    };

    try {
      setSaving(true);

      if (isEdit && no) {
        await updateSurvey(no, serverData);
        setAlert({
          message: '설문이 수정되었습니다.',
          variant: 'success',
          onConfirm: () => navigate('/dbms/survey'),
        });
      } else {
        await createSurvey(serverData);
        setAlert({
          message: '설문이 등록되었습니다.',
          variant: 'success',
          onConfirm: () => navigate('/dbms/survey'),
        });
      }
    } catch (error: any) {
      console.error(error);
      setAlert({
        message: error.response?.data?.message ?? '설문 저장 중 오류가 발생했습니다.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const goList = () => navigate('/dbms/survey');

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="설문 관리" description="설문 정보를 불러오는 중입니다." />
        <div className="card card_pad_lg">데이터를 불러오는 중입니다.</div>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '설문 수정' : '설문 작성'}
        description={
          isEdit
            ? '등록된 설문 기본정보와 문항을 수정합니다.'
            : '점주에게 제공할 설문과 문항을 작성합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goList}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg form_page">
        <div className="survey_form_section_title">설문 기본정보</div>

        <div className="field_row">
          <div className="field_label">작성자</div>
          <div className="field_control">
            <input
              type="text"
              className="form_input survey_writer_input"
              value={`관리자 ${managerNo}`}
              disabled
            />
            <div className="field_hint">현재 로그인한 관리자 회원번호입니다.</div>
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">
            제목<span className="req">*</span>
          </div>
          <div className="field_control">
            <input
              type="text"
              className={`form_input ${errors.title ? 'is_error' : ''}`}
              placeholder="설문 제목을 입력하세요."
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
            {errors.title && <div className="form_hint error">{errors.title}</div>}
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">설명</div>
          <div className="field_control">
            <textarea
              className="form_textarea survey_detail"
              placeholder="설문 안내 내용을 입력하세요."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
        </div>

        <div className="field_row">
          <div className="field_label">
            설문 기간<span className="req">*</span>
          </div>

          <div className="field_control">
            <div className="survey_date_grid">
              <div className="survey_date_item">
                <div className="field_hint survey_input_label">시작일</div>
                <input
                  type="date"
                  className={`form_input survey_date_input ${
                    errors.startDate ? 'is_error' : ''
                  }`}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
                {errors.startDate && (
                  <div className="form_hint error">{errors.startDate}</div>
                )}
              </div>

              <div className="survey_date_item">
                <div className="field_hint survey_input_label">종료일</div>
                <input
                  type="date"
                  className={`form_input survey_date_input ${
                    errors.endDate ? 'is_error' : ''
                  }`}
                  min={startDate}
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
                {errors.endDate && <div className="form_hint error">{errors.endDate}</div>}
              </div>
            </div>

            {!errors.startDate && !errors.endDate && (
              <div className="field_hint survey_date_hint">
                시작일과 종료일을 달력에서 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card_pad_lg form_page survey_question_section">
        <div className="survey_question_header">
          <div>
            <div className="survey_form_section_title">설문 문항</div>
            <div className="field_hint">답변 유형과 필수 여부를 설정할 수 있습니다.</div>
          </div>

          <button type="button" className="btn btn_md btn_primary" onClick={addQuestion}>
            + 질문 추가
          </button>
        </div>

        <div className="survey_question_list">
          {questions.map((question, questionIndex) => {
            const questionError = errors.questions[questionIndex];

            return (
              <div className="survey_question_card" key={questionIndex}>
                <div className="survey_question_card_head">
                  <div className="survey_question_number">질문 {questionIndex + 1}</div>
                  <button
                    type="button"
                    className="btn btn_sm btn_ghost"
                    onClick={() => removeQuestion(questionIndex)}
                  >
                    삭제
                  </button>
                </div>

                <div className="field_row">
                  <div className="field_label">
                    질문<span className="req">*</span>
                  </div>

                  <div className="field_control">
                    <input
                      type="text"
                      className={`form_input ${questionError?.qtext ? 'is_error' : ''}`}
                      placeholder="질문 내용을 입력하세요."
                      value={question.qtext}
                      onChange={(e) => changeQuestionText(questionIndex, e.target.value)}
                    />
                    {questionError?.qtext && (
                      <div className="form_hint error">{questionError.qtext}</div>
                    )}
                  </div>
                </div>

                <div className="field_row">
                  <div className="field_label">답변 유형</div>
                  <div className="field_control">
                    <select
                      className="form_select survey_type_select"
                      value={question.qtype}
                      onChange={(e) => changeQuestionType(questionIndex, e.target.value)}
                    >
                      <option value="TEXT">주관식</option>
                      <option value="SCORE">만족도</option>
                      <option value="SINGLE">단일 선택</option>
                      <option value="MULTIPLE">복수 선택</option>
                    </select>
                  </div>
                </div>

                <div className="field_row">
                  <div className="field_label">필수 여부</div>
                  <div className="field_control">
                    <label className="survey_required_check">
                      <input
                        type="checkbox"
                        checked={question.requiredYn === 'Y'}
                        onChange={(e) => changeRequired(questionIndex, e.target.checked)}
                      />
                      <span>필수 응답 문항</span>
                    </label>
                  </div>
                </div>

                {(question.qtype === 'SINGLE' || question.qtype === 'MULTIPLE') && (
                  <div className="field_row">
                    <div className="field_label">
                      선택지<span className="req">*</span>
                    </div>

                    <div className="field_control">
                      <div className="survey_option_list">
                        {question.qoptions.map((option, optionIndex) => {
                          const optionError = questionError?.options?.[optionIndex];

                          return (
                            <div className="survey_option_row" key={optionIndex}>
                              <span className="survey_option_number">{optionIndex + 1}</span>

                              <div style={{ flex: 1 }}>
                                <input
                                  type="text"
                                  className={`form_input ${optionError ? 'is_error' : ''}`}
                                  placeholder={`선택지 ${optionIndex + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    changeOption(questionIndex, optionIndex, e.target.value)
                                  }
                                />
                                {optionError && (
                                  <div className="form_hint error">{optionError}</div>
                                )}
                              </div>

                              <button
                                type="button"
                                className="btn btn_sm btn_ghost"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                              >
                                삭제
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {question.qoptions.length === 0 && questionError?.options?.[0] && (
                        <div className="form_hint error">{questionError.options[0]}</div>
                      )}

                      <button
                        type="button"
                        className="btn btn_sm btn_ghost survey_option_add"
                        onClick={() => addOption(questionIndex)}
                      >
                        + 선택지 추가
                      </button>
                    </div>
                  </div>
                )}

                {question.qtype === 'SCORE' && (
                  <div className="survey_satisfaction_preview">
                    <div className="field_hint survey_satisfaction_title">
                      점주 화면 만족도 선택 예시
                    </div>

                    <div className="survey_satisfaction_list">
                      {['매우 불만족', '불만족', '보통', '만족', '매우 만족'].map((label) => (
                        <div className="survey_satisfaction_item" key={label}>
                          <span className="survey_satisfaction_circle" />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="field_hint survey_satisfaction_hint">
                      내부 저장값은 1 ~ 5로 처리됩니다.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="survey_question_add_bottom">
          <button type="button" className="btn btn_md btn_primary" onClick={addQuestion}>
            + 질문 추가
          </button>
        </div>

        <div className="form_page_footer">
          <button
            type="button"
            className="btn btn_md btn_ghost"
            onClick={goList}
            disabled={saving}
          >
            취소
          </button>

          <button
            type="button"
            className="btn btn_md btn_primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '저장 중...' : isEdit ? '설문 수정' : '설문 등록'}
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