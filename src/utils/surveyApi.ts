import { axiosInstance } from './Tool';
import type {
  Survey,
  SurveyResponse,
  SurveySaveRequest,
  SurveySubmitRequest,
} from './survey';

export const getSurveys = async (): Promise<Survey[]> => {
  const response = await axiosInstance.get<Survey[]>('/api/surveys');
  return response.data;
};

export const getSurvey = async (surveyNo: string | number): Promise<Survey> => {
  const response = await axiosInstance.get<Survey>(`/api/surveys/${surveyNo}`);
  return response.data;
};

export const createSurvey = async (data: SurveySaveRequest) => {
  return axiosInstance.post('/api/surveys', data);
};

export const updateSurvey = async (surveyNo: string | number, data: SurveySaveRequest) => {
  return axiosInstance.put(`/api/surveys/${surveyNo}`, data);
};

export const deleteSurvey = async (surveyNo: string | number) => {
  return axiosInstance.delete(`/api/surveys/${surveyNo}`);
};

export const getSurveyResponses = async (surveyNo: string | number): Promise<SurveyResponse[]> => {
  const response = await axiosInstance.get<SurveyResponse[]>(`/api/surveys/${surveyNo}/responses`);
  return Array.isArray(response.data) ? response.data : [];
};

export const getSurveyResponse = async (responseNo: number): Promise<SurveyResponse> => {
  const response = await axiosInstance.get<SurveyResponse>(`/api/surveys/responses/${responseNo}`);
  return response.data;
};

export const checkSurveyResponse = async (responseNo: number): Promise<SurveyResponse> => {
  const response = await axiosInstance.patch<SurveyResponse>(`/api/surveys/responses/${responseNo}/check`);
  return response.data;
};

export const submitSurveyResponse = async (surveyNo: string | number, data: SurveySubmitRequest) => {
  return axiosInstance.post(`/api/surveys/${surveyNo}/responses`, data);
};
