# 📈 Kakao RSU Value Tracker

카카오 RSU(Restricted Stock Unit) 실시간 자산 조회 및 동기부여 크롬 익스텐션

## 🎯 주요 기능

### 📊 실시간 자산 관리

- 카카오 주식 실시간 가격 조회
- RSU 보유 수량 기반 총 자산 계산
- 매입가 대비 수익률 자동 계산
- 수익금 실시간 표시

### 🎮 동기부여 시뮬레이션

- 테슬라 Model 3 구매까지 필요한 목표가 계산
- 진행률 바를 통한 시각적 동기부여
- 커스텀 목표 설정 기능

### 🔔 스마트 알림

- 목표가 도달 시 자동 알림
- 익스텐션 배지에 현재가 표시
- 주기적 자동 업데이트 (10분 간격)

### 🎨 위젯 & UI

- 모든 웹페이지에 고정 위젯 표시
- 드래그 앤 드롭으로 위치 조정 가능
- 최소화/닫기 기능
- 라이트/다크 테마 지원
- 반응형 디자인

## 🚀 설치 방법

### 개발자 모드로 설치

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 이 프로젝트 폴더 선택

### Chrome Web Store (예정)

- 추후 Chrome Web Store에 배포 예정

## 🔧 사용 방법

### 1. 초기 설정

1. 익스텐션 아이콘 클릭하여 팝업 열기
2. RSU 보유 수량 입력
3. 평균 매입가 입력 (선택사항)
4. "저장" 버튼 클릭

### 2. 위젯 사용

- 모든 웹페이지 우측 하단에 위젯 자동 표시
- 위젯 헤더를 드래그하여 위치 이동
- 최소화 버튼(-) 클릭으로 축소/확장
- 닫기 버튼(×) 클릭으로 위젯 숨기기

### 3. 설정 관리

- 위젯 표시/숨김 설정
- 알림 활성화/비활성화
- 목표 주가 설정
- 테마 변경 (라이트/다크)

## 🛠 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+ Modules), HTML5, CSS3
- **Architecture**: ES6 Import/Export, Modular Design
- **Charts**: Custom Canvas-based Charts
- **API**: KRX 공식 API 우선, Yahoo Finance API, 네이버 금융 API (Multi-endpoint fallback)
- **Storage**: Chrome Storage API
- **Notifications**: Chrome Notifications API
- **Permissions**: Storage, Notifications, Alarms, ActiveTab

### 🏗 모듈 구조

```javascript
// ES6 모듈 시스템 사용
import { fetchKakaoPrice } from '../utils/api.util.js'
import { targets, updateSimulation, renderSimulation } from '../utils/goal.util.js'

// API 유틸리티 함수들 export
export async function fetchKakaoPrice() { ... }
export async function fetchFromYahooFinance() { ... }

// 목표 설정 및 시뮬레이션 함수들 export  
export const targets = { flight: {...}, tesla: {...}, custom: null }
export function updateSimulation(totalAsset, rsuAmount) { ... }
export function renderSimulation() { ... }
```

## 📦 프로젝트 구조

```
youngcha/
├── manifest.json              # 확장 프로그램 메니페스트
├── package.json               # 프로젝트 설정 및 스크립트
├── README.md                  # 프로젝트 문서
├── INSTALL.md                 # 설치 가이드
│
├── src/                       # 소스 코드
│   ├── popup/                 # 팝업 관련 파일들
│   │   ├── popup.html        # 팝업 UI
│   │   ├── popup.js          # 팝업 로직  
│   │   └── popup.css         # 팝업 스타일
│   │
│   ├── background/            # 백그라운드 스크립트
│   │   └── background.js     # 서비스 워커
│   │
│   ├── content/               # 컨텐츠 스크립트
│   │   └── content.js        # 위젯 및 페이지 인젝션
│   │
│   └── utils/                 # 유틸리티 함수들
│       ├── api.util.js       # API 호출 관련 함수
│       └── goal.util.js      # 목표 설정 및 시뮬레이션 함수
│
├── assets/                    # 정적 자산
│   └── icons/                 # 아이콘 파일들
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon64.png
│       └── icon128.png
│
└── tests/                     # 테스트 파일
    └── test_calculation.js   # 계산 로직 테스트
```

## 🔑 주요 API

### 주가 조회 (API 우선순위)

```javascript
// 1순위: KRX 공식 API (한국거래소)
const krxResponse = await fetch('http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
	method: 'POST',
	body: new URLSearchParams({
		bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
		isuCd: 'KR7035720002'  // 카카오 ISIN 코드
	})
})

// 2순위: KRX 마켓데이터 API (백업)
// 3순위: Yahoo Finance API (백업)
const yahooResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/035720.KS')

// 4순위: 네이버 금융 API (백업)
const naverResponse = await fetch('https://polling.finance.naver.com/api/realtime/domestic/stock/035720')
```

### 목표가 계산

```javascript
function calculateRequiredPrice(targetAmount, rsuAmount) {
	return Math.ceil(targetAmount / rsuAmount)
}
```

### 수익률 계산

```javascript
const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
```

### 목표 시뮬레이션 (goal.util.js)

```javascript
// 목표 객체 정의
export const targets = {
	flight: { icon: '🛩', name: '유럽 왕복 일등석 항공권', price: 12000000, id: 'flight' },
	tesla: { icon: '🏎', name: '테슬라 Model 3', price: 60000000, id: 'tesla' },
	custom: null // 사용자 정의 목표
}

// 시뮬레이션 업데이트
export function updateSimulation(totalAsset, rsuAmount) {
	// 각 목표별 진행률 및 필요 주가 계산
}

// 커스텀 목표 관리
export async function saveCustomTargetInline(targetId) {
	// Chrome storage에 사용자 목표 저장
}
```

## ⚙️ 설정 항목

| 설정        | 설명                    | 기본값 |
| ----------- | ----------------------- | ------ |
| RSU 수량    | 보유한 RSU 주식 수량    | 0      |
| 평균 매입가 | 수익률 계산용 매입가    | 0      |
| 위젯 표시   | 브라우저 위젯 표시 여부 | true   |
| 알림 활성화 | 목표가 도달 알림        | true   |
| 목표 주가   | 알림용 목표 주가        | 0      |
| 테마        | UI 테마 (light/dark)    | light  |

## 🎯 시뮬레이션 목표

### 기본 목표 상품

- **테슬라 Model 3**: ₩60,000,000
- **iPhone 15 Pro**: ₩1,550,000

### 계산 공식

```
필요 주가 = 목표 금액 ÷ RSU 수량
진행률 = (현재 자산 ÷ 목표 금액) × 100
```

## 🔄 업데이트 주기

- **실시간**: 팝업 열람 시
- **자동**: 10분마다 백그라운드 업데이트
- **수동**: 새로고침 버튼 또는 우클릭 메뉴

## 🐛 알려진 이슈

1. 주식 시장 종료 시간에는 이전 종가 표시
2. 네트워크 오류 시 테스트 데이터 사용
3. 일부 웹사이트에서 위젯 CSS 충돌 가능성

## 🚀 향후 계획

### v2.0 예정 기능

- [ ] 다중 종목 지원 (NAVER, Apple 등)
- [ ] 배당금 계산 기능
- [ ] 포트폴리오 다양화 제안
- [ ] 주가 예측 AI 모델 연동
- [ ] 소셜 기능 (목표 공유)
- [ ] 모바일 앱 버전

### 기술적 개선사항

- [ ] TypeScript 마이그레이션
- [ ] React 기반 UI 리팩토링
- [ ] PWA 지원
- [ ] 오프라인 모드
- [ ] 성능 최적화

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 👨‍💻 개발자

**mia.ow**

- 기획 및 개발
- 피드백: [이메일 주소]

## 🤝 기여 방법

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## ⚠️ 주의사항

- 이 익스텐션은 투자 조언을 제공하지 않습니다
- 주가 정보는 참고용이며, 실제 거래 시 공식 채널 확인 필요
- RSU 행사 시점, 세금 등은 별도 고려 필요
- 개인정보는 로컬에만 저장되며 외부 전송되지 않습니다

## 🔗 관련 링크

- [Chrome Extension 개발 가이드](https://developer.chrome.com/docs/extensions/)
- [Yahoo Finance API](https://finance.yahoo.com/)
- [Chart.js 문서](https://www.chartjs.org/docs/)
- [카카오 주식 정보](https://finance.yahoo.com/quote/035720.KS)

---

**📈 매일 확인하는 RSU 자산으로 더 큰 동기부여를 받아보세요!**

## 📁 디렉토리/파일별 설명

- **src/content/content.js**: 모든 웹페이지에 삽입되는 고정 위젯 및 글래스모피즘 UI, 실시간 자산 표시, 드래그/최소화/닫기 등 위젯 인터랙션 담당
- **src/utils/api.util.js**: 카카오/야후/네이버 등 다양한 API로부터 주가를 가져오는 함수들
- **src/utils/goal.util.js**: 목표(테슬라, 커스텀 등) 관리 및 진행률 계산, 시뮬레이션 로직
- **src/background/background.js**: 서비스 워커, 주기적 데이터 fetch, 알림, 스토리지 동기화 등 백그라운드 처리
- **src/popup/popup.html**: 확장 프로그램 팝업의 UI 구조
- **src/popup/popup.js**: 팝업의 상태 관리, 사용자 입력 처리, 데이터 저장/불러오기
- **src/popup/popup.css**: 팝업 전용 스타일
- **assets/icons/**: 확장 프로그램 및 위젯에 사용되는 아이콘 이미지
- **tests/test_calculation.js**: 자산/수익률/목표 계산 등 핵심 로직 테스트
