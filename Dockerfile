# =====================================================================
# allimio React 프론트 이미지
#   1단계(build): Node로 TypeScript 검사 + Vite 빌드 → dist 생성
#   2단계(run)  : nginx가 dist 정적 파일만 내려줌 (Node는 최종 이미지에 안 들어감 → 이미지가 작고 안전)
# =====================================================================

# ---------- 1단계: 빌드 ----------
# slim(Debian, glibc) 사용: Vite 8(rolldown)의 네이티브 바이너리가 서버(Ubuntu)에서 검증된 환경과 같음
FROM node:22-slim AS build
WORKDIR /app

# package.json / lock 파일만 먼저 복사 → 의존성이 안 바뀌면 npm ci 레이어를 캐시로 재사용(빌드 속도↑)
COPY package.json package-lock.json ./
RUN npm ci

# 나머지 소스 복사 후 빌드 (tsc -b 에러가 있으면 여기서 실패 → 배포 중단)
COPY . .
RUN npm run build

# ---------- 2단계: 실행 ----------
FROM nginx:1.27-alpine
ENV TZ=Asia/Seoul

# SPA 라우팅 + 캐시 설정
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
