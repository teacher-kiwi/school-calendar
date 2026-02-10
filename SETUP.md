# 스쿨 캘린더 설정 가이드

실행을 위해서는 **Google Cloud Platform (GCP)** 설정이 필요합니다.

## 1. 사전 준비

- Node.js v18 이상 설치
- Google Cloud Platform 프로젝트 생성

## 2. Google Cloud 설정

### 2.1 Google Sheets API 설정

1. [GCP 콘솔](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **라이브러리** 이동
3. `Google Sheets API` 검색 후 **사용** 클릭 (구글 스프레드시트 연동)
4. `Google Calendar API` 검색 후 **사용** 클릭 (공휴일 정보 조회용)

### 2.2 서비스 계정 (Service Account) 생성

1. **API 및 서비스** > **사용자 인증 정보** > **사용자 인증 정보 만들기** > **서비스 계정**
2. 계정 이름 입력 (예: `majang-calendar-bot`) 후 생성
3. 생성된 서비스 계정 클릭 > **키** 탭 > **키 추가** > **새 키 만들기** > **JSON**
4. 다운로드된 JSON 파일을 열어 `client_email`과 `private_key`를 확인합니다.
5. **중요**: `client_email` 주소를 복사하여, 데이터를 저장할 **구글 스프레드시트의 '공유' 버튼을 눌러 편집자 권한으로 추가**합니다.

## 3. 구글 스프레드시트 준비

자동 생성 스크립트가 없으므로, 사용할 스프레드시트의 첫 번째 행(Header)을 다음과 같이 직접 설정해야 합니다.
**시트 이름**: `events` (반드시 이 이름이어야 함)

| A   | B     | C    | D    | E        | F           | G        | H           | I         | J         | K            | L          | M          |
| --- | ----- | ---- | ---- | -------- | ----------- | -------- | ----------- | --------- | --------- | ------------ | ---------- | ---------- |
| id  | title | date | time | location | description | category | creatorName | createdBy | createdAt | modifierName | modifiedBy | modifiedAt |

> **주의**: 컬럼 순서가 중요합니다. 위 순서대로 A열부터 M열까지 입력해주세요.

### 2.3 OAuth 2.0 클라이언트 ID 생성

1. **API 및 서비스** > **OAuth 동의 화면** 설정 (내부 사용자 전용으로 설정 추천)
2. **사용자 인증 정보** > **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 승인된 리디렉션 URI 추가:
   - 로컬 개발용: `http://localhost:3000/auth/google/callback`
   - 배포용: `https://your-app-url.com/auth/google/callback`
5. 생성된 `클라이언트 ID`와 `클라이언트 보안 비밀`을 확인합니다.

## 4. 환경 변수 설정

프로젝트 루트의 `.env` 파일을 열고 정보를 입력합니다. (없을 경우 `.env.example`을 복사하여 생성)

```bash
# 서버 포트
PORT=3000
# 세션 암호화 키 (임의의 문자열)
SESSION_SECRET=your_complex_secret_key

# OAuth 2.0 정보 (2.3 단계)
GOOGLE_CLIENT_ID=XXXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=XXXXX
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# 구글 시트 정보
SPREADSHEET_ID=구글_스프레드시트_URL_중간의_ID_부분
# 서비스 계정 정보 (2.2 단계)
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 관리자 및 접근 제어
ADMIN_EMAILS=teacher@school.kr,admin@school.kr
ALLOWED_EMAILS=guest@gmail.com,parent@naver.com
ALLOWED_DOMAINS=school.kr,student.school.kr
```

## 4. 실행 방법

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

## 5. 배포 (Vercel 예시)

1. `vercel.json` 파일 생성 (이미 포함됨)
2. Vercel 대시보드에서 새 프로젝트 생성
3. GitHub 리포지토리 연결
4. **Environment Variables** 설정에 `.env` 내용을 모두 추가
5. 배포 완료

---

## 6. 파일 구조

- `server.js`: 메인 서버 파일
- `lib/sheets.js`: 구글 시트 연동 모듈
- `views/`: EJS 템플릿 (HTML)
- `public/`: 정적 파일 (CSS, JS)
