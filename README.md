# 스쿨 캘린더

학교 행사 일정 및 특별실 예약 통합 관리 시스템입니다.

## 📋 주요 기능

- **통합 일정 관리**: 행사와 특별실 예약을 하나의 캘린더에서 직관적으로 확인
- **구글 로그인**: 별도 회원가입 없이 학교/개인 구글 계정으로 로그인
- **권한 관리**:
  - **관리자**: 모든 일정 수정/삭제 가능, `ADMIN_EMAILS` 환경변수로 설정
  - **일반 사용자**: 본인이 작성한 일정만 수정/삭제 가능
  - **접근 제어**: 허용된 도메인(`ALLOWED_DOMAINS`) 또는 이메일(`ALLOWED_EMAILS`)만 접속 가능
- **실시간 데이터**: Google Sheets를 데이터베이스로 사용하여 엑셀처럼 데이터 관리 용이
- **작성자 실명 표시**: 로그인된 구글 프로필 이름을 바탕으로 작성자/수정자 실명 표시
- **공휴일 연동**: Google Calendar API를 통해 대한민국의 공휴일 자동 표시
- **설정 가능**: 환경 변수를 통해 학교 이름(`SCHOOL_NAME_KO`, `SCHOOL_NAME_EN`) 변경 가능

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: Google Sheets (via `googleapis`)
- **Auth**: Passport.js (Google OAuth 2.0)
- **Frontend**: EJS, Tailwind CSS, FullCalendar, SweetAlert2
- **Deployment**: Vercel, Render, or any Node.js hosting

## 🚀 설치 및 실행

상세한 설정 방법은 [SETUP.md](./SETUP.md) 파일을 참고해주세요.

1. **사전 준비**: Google Cloud Platform 프로젝트 생성, 서비스 계정 및 OAuth 키 발급
2. **환경 변수**: `.env` 파일 설정
   - `SCHOOL_NAME_KO`: 학교 이름 (한글, 기본값: 스쿨)
   - `SCHOOL_NAME_EN`: 학교 이름 (영문, 기본값: School)
   - 기타 인증 키 설정 (SETUP.md 참조)
3. **설치 및 실행**:

```bash
npm install
npm run dev
```

## 📁 프로젝트 구조

```
school-calendar/
├── lib/
│   └── sheets.js        # Google Sheets & Calendar API 연동 모듈
├── public/
│   ├── css/             # 스타일시트 (Tailwind)
│   └── js/              # 클라이언트 사이드 스크립트
├── views/
│   ├── index.ejs        # 메인 캘린더 페이지
│   └── login.ejs        # 로그인 페이지
├── server.js            # Express 서버 진입점
├── .env                 # 환경 변수 (비공개)
└── SETUP.md             # 상세 설정 가이드
```

## 📝 라이선스

This project is private software for internal use.
