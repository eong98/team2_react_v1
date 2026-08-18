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
 *
 * 설문 AI 분석 실행은 Spring이 아니라
 * FastAPI가 직접 담당한다.
 */
const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';


export const getSurveys = async (): Promise<Survey[]> => {
  const response = await axiosInstance.get<Survey[]>('/api/surveys');
  return response.data;
};


export const getSurvey = async (
  surveyNo: string | number
): Promise<Survey> => {
  const response = await axiosInstance.get<Survey>(
    `/api/surveys/${surveyNo}`
  );

  return {
    ...response.data,
    questions: response.data.questions ?? [],
  };
};


export const createSurvey = async (
  data: SurveySaveRequest
) => {
  return axiosInstance.post(
    '/api/surveys',
    data
  );
};


export const updateSurvey = async (
  surveyNo: string | number,
  data: SurveySaveRequest
) => {
  return axiosInstance.put(
    `/api/surveys/${surveyNo}`,
    data
  );
};


export const deleteSurvey = async (
  surveyNo: string | number
) => {
  return axiosInstance.delete(
    `/api/surveys/${surveyNo}`
  );
};


export const getSurveyResponses = async (
  surveyNo: string | number
): Promise<SurveyResponse[]> => {
  const response = await axiosInstance.get<SurveyResponse[]>(
    `/api/surveys/${surveyNo}/responses`
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
};


export const getSurveyResponse = async (
  responseNo: number
): Promise<SurveyResponse> => {
  const response = await axiosInstance.get<SurveyResponse>(
    `/api/surveys/responses/${responseNo}`
  );

  return response.data;
};


export const checkSurveyResponse = async (
  responseNo: number
): Promise<SurveyResponse> => {
  const response = await axiosInstance.patch<SurveyResponse>(
    `/api/surveys/responses/${responseNo}/check`
  );

  return response.data;
};


export const submitSurveyResponse = async (
  surveyNo: string | number,
  data: SurveySubmitRequest
) => {
  return axiosInstance.post(
    `/api/surveys/${surveyNo}/responses`,
    data
  );
};


/**
 * 로그인한 회원의 해당 설문 응답 조회.
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
 * FastAPI 설문 AI 분석 실행.
 *
 * Python이 Oracle DB에서 해당 설문의 전체 응답을 직접 조회하고,
 * gemma4:26b로 점수/감정/요약 분석 후
 * SURVEYANALYSIS에 결과를 저장한다.
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
 *
 * 조회는 Spring surveyanalysis 패키지를 사용한다.
 */
export const getSurveyAnalysis = async (
  surveyNo: string | number
): Promise<SurveyAnalysis> => {
  const response = await axiosInstance.get<SurveyAnalysis>(
    `/api/survey-analysis/${surveyNo}`
  );

  return response.data;
};