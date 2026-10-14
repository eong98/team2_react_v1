import { axiosInstance } from '../../utils/Tool';

/**
 * H200 FastAPI 주소.
 * AI 이슈맵 / 원본 도면은 Spring(9102)이 아니라 H200 FastAPI(11200)를 직접 호출한다.
 * (getIP()는 접속한 웹서버 주소라서 웹서버가 가비아일 때 H200이 아닌 곳을 가리키므로 쓰지 않는다.)
 */
const FASTAPI_BASE_URL = 'http://139.150.91.194:11200';
// const FASTAPI_BASE_URL = 'http://localhost:11200';


// ========================================
// 알림 타입
// ========================================

export interface NotificationItem {
    no: number;
    cino: number;
    mno: number;

    audiono?: number | null;

    atitle: string;
    content?: string | null;

    priority?: string | null;

    status: string;

    cdate: string;

    lang?: string | null;
    little?: string | null;
    field?: string | null;

    readyn: 'Y' | 'N';

    aimapno?: number | null;
}


// ========================================
// AI 이슈맵 타입
// ========================================

export interface AiIssueMap {
    no: number;
    smno: number | null;
    cino: number | null;

    xpos: number | null;
    ypos: number | null;

    color: string | null;

    fsaved: string | null;

    status: number;

    err: string | null;

    cdate: string;
}


// ========================================
// 회원별 알림 목록 조회
// GET /api/notifications/member/{mno}
// Java : 9102
// ========================================

export const getNotificationList = async (
    mno: number
): Promise<NotificationItem[]> => {

    const response = await axiosInstance.get<NotificationItem[]>(
        `/api/notifications/member/${mno}`
    );

    return response.data;
};


// ========================================
// 알림 상세 조회
// GET /api/notifications/{no}/member/{mno}
// Java : 9102
// ========================================

export const getNotificationDetail = async (
    no: number,
    mno: number
): Promise<NotificationItem> => {

    const response = await axiosInstance.get<NotificationItem>(
        `/api/notifications/${no}/member/${mno}`
    );

    return response.data;
};


// ========================================
// 안 읽은 알림 개수 조회
// GET /api/notifications/member/{mno}/unread-count
// Java : 9102
// ========================================

export const getUnreadNotificationCount = async (
    mno: number
): Promise<number> => {

    const response = await axiosInstance.get<number>(
        `/api/notifications/member/${mno}/unread-count`
    );

    return response.data;
};


// ========================================
// 알림 읽음 처리
// PATCH /api/notifications/{no}/member/{mno}/read
// Java : 9102
// ========================================

export const readNotification = async (
    no: number,
    mno: number
): Promise<void> => {

    await axiosInstance.patch(
        `/api/notifications/${no}/member/${mno}/read`
    );
};


// ========================================
// AI 이슈맵 정보 조회
// GET /api/aiissuemap/{no}
// FastAPI : H200 (11200)
// ========================================

export const getAiIssueMap = async (
    aimapno: number
): Promise<AiIssueMap> => {

    const response = await fetch(
        `${FASTAPI_BASE_URL}/api/aiissuemap/${aimapno}`
    );

    if (!response.ok) {
        throw new Error('AI 이슈맵 정보를 불러오지 못했습니다.');
    }

    return response.json();
};


// ========================================
// AI 이슈맵 이미지 URL
// GET /api/aiissuemap/image/{filename}
// FastAPI : H200 (11200)
// ========================================

export const getAiIssueMapImageUrl = (
    filename: string
): string => {

    return `${FASTAPI_BASE_URL}/api/aiissuemap/image/${encodeURIComponent(filename)}`;
};


// ========================================
// 원본 매장 도면 파일 URL
// GET /api/shopmap/file/{filename}
// FastAPI : H200 (11200)
// ========================================

export const getShopMapFileUrl = (
    filename: string
): string => {

    return `${FASTAPI_BASE_URL}/api/shopmap/file/${encodeURIComponent(filename)}`;
};


// ========================================
// 읽음 여부
// ========================================

export const isReadNotification = (
    notification: NotificationItem
): boolean => {

    return notification.readyn === 'Y';
};


// ========================================
// AI 도면 존재 여부
// ========================================

export const hasAiMap = (
    notification: NotificationItem
): boolean => {

    return notification.aimapno !== null
        && notification.aimapno !== undefined;
};


// ========================================
// 중요도 표시
// ========================================

export const getPriorityLabel = (
    priority?: string | null
): string => {

    if (!priority) {
        return '-';
    }

    switch (priority.toUpperCase()) {

        case 'LOW':
            return '낮음';

        case 'NORMAL':
        case 'MEDIUM':
            return '보통';

        case 'HIGH':
            return '높음';

        case 'EMERGENCY':
        case 'CRITICAL':
            return '긴급';

        default:
            return priority;
    }
};


// ========================================
// 알림 상태 표시
// ========================================

export const getStatusLabel = (
    status: string
): string => {

    switch (status) {

        case 'READY':
            return '대기';

        case 'SENDING':
            return '발송 중';

        case 'SENT':
            return '발송 완료';

        case 'FAILED':
            return '발송 실패';

        case 'CANCELLED':
            return '취소';

        default:
            return status;
    }
};


// ========================================
// 날짜 표시
// ========================================

export const formatNotificationDate = (
    cdate: string
): string => {

    if (!cdate) {
        return '-';
    }

    return cdate;
};