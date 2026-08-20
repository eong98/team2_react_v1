import axios from 'axios';
import { axiosInstance } from '../../utils/Tool';

import type {
  Survey,
  SurveyAnalysis,
  SurveyResponse,
  SurveySaveRequest,
  SurveySubmitRequest,
} from './survey';

/**
 * H200 FastAPI 주소.
 * 설문 AI 분석 실행은 Spring이 아니라 FastAPI가 직접 담당한다.
 */
const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';

/**
 * 관리자 설문 목록 조회.
 * 등록된 전체 설문을 가져온다.
 */
export const getSurveys = async (): Promise<Survey[]> => {
  const response = await axiosInstance.get<Survey[]>('/api/surveys');
  return response.data;
};

/**
 * 설문 상세 조회.
 * 관리자 수정 화면과 사용자 설문 작성/조회 화면에서 사용한다.
 */
export const getSurvey = async (surveyNo: string | number): Promise<Survey> => {
  const response = await axiosInstance.get<Survey>(`/api/surveys/${surveyNo}`);
  return {
    ...response.data,
    questions: response.data.questions ?? [],
  };
};

/**
 * 관리자 설문 등록.
 * 설문 기본정보와 문항 목록을 Spring으로 전달한다.
 */
export const createSurvey = async (data: SurveySaveRequest) => {
  return axiosInstance.post('/api/surveys', data);
};

/**
 * 관리자 설문 수정.
 * 기존 설문의 기본정보와 문항을 수정한다.
 */
export const updateSurvey = async (
  surveyNo: string | number,
  data: SurveySaveRequest
) => {
  return axiosInstance.put(`/api/surveys/${surveyNo}`, data);
};

/**
 * 관리자 설문 삭제.
 */
export const deleteSurvey = async (surveyNo: string | number) => {
  return axiosInstance.delete(`/api/surveys/${surveyNo}`);
};

/**
 * 특정 설문의 전체 응답 목록 조회.
 * 관리자 설문 응답 관리 화면에서 사용한다.
 */
export const getSurveyResponses = async (
  surveyNo: string | number
): Promise<SurveyResponse[]> => {
  const response = await axiosInstance.get<SurveyResponse[]>(
    `/api/surveys/${surveyNo}/responses`
  );
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * 특정 설문 응답 상세 조회.
 * 관리자가 회원의 질문별 답변을 확인할 때 사용한다.
 */
export const getSurveyResponse = async (
  responseNo: number
): Promise<SurveyResponse> => {
  const response = await axiosInstance.get<SurveyResponse>(
    `/api/surveys/responses/${responseNo}`
  );
  return response.data;
};

/**
 * 관리자 설문 응답 확인 처리.
 * 관리자가 확인한 응답의 확인 상태를 변경한다.
 */
export const checkSurveyResponse = async (
  responseNo: number
): Promise<SurveyResponse> => {
  const response = await axiosInstance.patch<SurveyResponse>(
    `/api/surveys/responses/${responseNo}/check`
  );
  return response.data;
};

/**
 * 사용자 설문 최초 제출.
 * 아직 참여하지 않은 설문에 처음 응답할 때 사용한다.
 */
export const submitSurveyResponse = async (
  surveyNo: string | number,
  data: SurveySubmitRequest
) => {
  return axiosInstance.post(`/api/surveys/${surveyNo}/responses`, data);
};

/**
 * 로그인한 회원의 해당 설문 응답 조회.
 * 설문 참여 여부 확인, 기존 답변 조회, 내 응답 상세조회에서 사용한다.
 */
export const getMemberSurveyResponse = async (
  surveyNo: string | number,
  memberNo: number
): Promise<SurveyResponse> => {
  const response = await axiosInstance.get<SurveyResponse>(
    `/api/surveys/${surveyNo}/responses/member/${memberNo}`
  );
  return response.data;
};

/**
 * 로그인한 회원의 기존 설문 응답 수정.
 * 설문 진행 기간 중에만 수정할 수 있으며 기존 답변을 새로운 답변으로 교체한다.
 */
export const updateMemberSurveyResponse = async (
  surveyNo: string | number,
  memberNo: number,
  data: SurveySubmitRequest
): Promise<SurveyResponse> => {
  const response = await axiosInstance.put<SurveyResponse>(
    `/api/surveys/${surveyNo}/responses/member/${memberNo}`,
    data
  );
  return response.data;
};

/**
 * H200 FastAPI 설문 AI 분석 실행.
 * Python이 Oracle DB에서 설문 전체 응답을 조회하고 AI 분석 후 결과를 저장한다.
 * 관리자 화면에서는 설문 기간 종료 후에만 실행하도록 처리한다.
 */
export const analyzeSurvey = async (
  surveyNo: string | number
): Promise<SurveyAnalysis> => {
  const response = await axios.post<SurveyAnalysis>(
    `${FASTAPI_BASE_URL}/api/survey/${surveyNo}/analyze`
  );
  return response.data;
};

/**
 * 기존에 저장된 설문 AI 분석 결과 조회.
 * 분석 실행은 FastAPI가 담당하고 결과 조회는 Spring surveyanalysis API를 사용한다.
 */
export const getSurveyAnalysis = async (
  surveyNo: string | number
): Promise<SurveyAnalysis> => {
  const response = await axiosInstance.get<SurveyAnalysis>(
    `/api/survey-analysis/${surveyNo}`
  );
  return response.data;
};