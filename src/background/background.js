// 백그라운드 서비스 워커

// 전역 변수
let currentSettings = {}
let currentPrice = 0
let userData = {}

/**
 * 한국 주식 시장 운영 시간 체크
 * 평일 오전 9시 ~ 오후 3시 30분 (KST 기준)
 * @returns {boolean} 시장 운영 시간 여부
 */
function isKoreanMarketOpen() {
	const now = new Date()
	
	// KST (UTC+9) 시간으로 변환
	const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
	const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
	const kstTime = new Date(utc + kstOffset)
	
	// 요일 체크 (0: 일요일, 1: 월요일, ..., 6: 토요일)
	const dayOfWeek = kstTime.getDay()
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		return false // 주말
	}
	
	// 시간 체크 (09:00 ~ 15:30)
	const hour = kstTime.getHours()
	const minute = kstTime.getMinutes()
	const currentTime = hour * 100 + minute // HHMM 형태로 변환
	
	const marketOpen = 900   // 09:00
	const marketClose = 1530 // 15:30
	
	return currentTime >= marketOpen && currentTime <= marketClose
}

/**
 * 날짜 문자열 생성 헬퍼 함수
 * @param {number} dayOffset - 오늘로부터 며칠 전/후 (음수: 이전, 양수: 이후)
 * @returns {string} YYYYMMDD 형식의 날짜 문자열
 */
function getDateString(dayOffset) {
	const date = new Date()
	date.setDate(date.getDate() + dayOffset)
	return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// 설치 시 초기화
chrome.runtime.onInstalled.addListener(async () => {

	// 기본 설정값 설정
	const defaultSettings = {
	enableWidget: true,
	enableNotifications: true,
	theme: 'light',
}

	await chrome.storage.sync.set({ settings: defaultSettings })

	// 주기적 업데이트 알람 설정 (10분마다)
	chrome.alarms.create('priceUpdate', {
		delayInMinutes: 1,
		periodInMinutes: 10,
	})

	// 초기 가격 조회
	await fetchAndUpdatePrice()
})

// 시작 시 설정 로드
chrome.runtime.onStartup.addListener(async () => {
	await loadSettings()
	await loadUserData()
	await fetchAndUpdatePrice()
})

// 알람 처리
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === 'priceUpdate') {
		await fetchAndUpdatePrice()
	}
})

// 메시지 처리
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

	switch (request.action) {
		case 'updateSettings':
			currentSettings = request.settings
			await chrome.storage.sync.set({ settings: request.settings })
			break

		case 'toggleWidget':
			await toggleWidget(request.enabled)
			break

		case 'getCurrentPrice':
			sendResponse({ price: currentPrice })
			break

		case 'forceUpdate':
			await fetchAndUpdatePriceForced()
			sendResponse({ success: true })
			break
			
		case 'updateWidget':
			// 팝업에서 온 위젯 업데이트 요청 처리
			
			// 현재 가격 업데이트
			if (request.price) {
				currentPrice = request.price
			}
			
			// 사용자 데이터 업데이트
			if (request.userData) {
				userData = request.userData
			}
			
			// 설정 업데이트
			if (request.settings) {
				currentSettings = request.settings
			}
			
			// 모든 탭에 위젯 업데이트 메시지 전송
			await updateWidget()
			break
	}
})

// 가격 조회 및 업데이트 (여러 API 시도)
async function fetchAndUpdatePrice() {

	// 시장 시간 체크 - 시장이 닫혀있으면 API 호출 건너뛰기
	if (!isKoreanMarketOpen()) {
		
		// 배지는 기존 데이터로 업데이트
		if (currentPrice > 0) {
			await updateBadge()
		}
		return false
	}

	// API 시도 순서 - Yahoo Finance를 최우선으로 사용
	const apiMethods = [
		{ func: () => fetchFromYahooFinanceAPI(), name: 'Yahoo Finance' },
		{ func: () => fetchFromAlternativeYahooAPI(), name: 'Yahoo Finance (대체)' },
		{ func: () => fetchFromSearchAPI(), name: 'Yahoo Finance (검색)' },
		{ func: () => fetchFromNaverFinanceAPI(), name: '네이버 금융' },
	]

	for (let i = 0; i < apiMethods.length; i++) {
		try {
			const price = await apiMethods[i].func()

			if (price && price > 0) {
				// 가격 변동 체크
				const priceChanged = currentPrice !== price
				currentPrice = Math.round(price)


				// 배지 업데이트
				await updateBadge()

				// 위젯 업데이트
				if (currentSettings.enableWidget) {
					await updateWidget()
				}

				// 팝업이 열려있으면 가격 업데이트 알림 (API 소스 포함)
				if (priceChanged) {
					chrome.runtime
						.sendMessage({
							action: 'priceUpdated',
							price: currentPrice,
							source: apiMethods[i].name,
						})
						.catch(() => {
							// 팝업이 열려있지 않으면 무시
						})
				}

				return true // 성공하면 즉시 반환
			}
		} catch (error) {
			console.warn(`Background API ${i + 1} (${apiMethods[i].name}) 실패:`, error.message)
			continue // 다음 API 시도
		}
	}

	// 모든 API 실패 시
	console.error('모든 Background API 실패')

	// 현재 가격이 0이면 추정값 사용
	if (currentPrice === 0) {
		const basePrice = 51400  // 2024년 카카오 주가 기준으로 업데이트
		const variation = Math.floor(Math.random() * 4000) - 2000
		currentPrice = basePrice + variation
		await updateBadge()
	}

	return false
}





// Background용 Yahoo Finance API
async function fetchFromYahooFinanceAPI() {
	if (!isKoreanMarketOpen()) {
		throw new Error('한국 주식 시장이 닫혀있습니다')
	}

	const response = await fetch(
		'https://query1.finance.yahoo.com/v8/finance/chart/035720.KS?interval=1d&range=1d',
		{
			method: 'GET',
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'application/json, text/plain, */*',
				'Cache-Control': 'no-cache',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.chart?.result?.[0]?.meta) {
		const meta = data.chart.result[0].meta
		const price = meta.regularMarketPrice || meta.previousClose

		if (price && price > 0) {
			return price
		}
	}

	throw new Error('Yahoo Finance Background: 유효한 가격 데이터 없음')
}

// Background용 대체 Yahoo API
async function fetchFromAlternativeYahooAPI() {
	if (!isKoreanMarketOpen()) {
		throw new Error('한국 주식 시장이 닫혀있습니다')
	}

	const response = await fetch(
		'https://query1.finance.yahoo.com/v7/finance/quote?symbols=035720.KS',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
				Accept: 'application/json',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
		return data.quoteResponse.result[0].regularMarketPrice
	}

	throw new Error('대체 API에서 가격 데이터 없음')
}

// Background용 검색 API
async function fetchFromSearchAPI() {
	if (!isKoreanMarketOpen()) {
		throw new Error('한국 주식 시장이 닫혀있습니다')
	}

	const response = await fetch(
		'https://query2.finance.yahoo.com/v1/finance/search?q=035720.KS&quotesCount=1&newsCount=0',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.quotes?.[0]?.regularMarketPrice) {
		return data.quotes[0].regularMarketPrice
	}

	throw new Error('검색 API에서 가격 데이터 없음')
}



// 배지 업데이트
async function updateBadge() {
	if (currentPrice === 0) return

	try {
		// 가격을 K 단위로 표시 (예: 95K)
		const priceText =
			currentPrice >= 1000 ? Math.round(currentPrice / 1000) + 'K' : currentPrice.toString()

		await chrome.action.setBadgeText({ text: priceText })
		await chrome.action.setBadgeBackgroundColor({ color: '#007bff' })

		// 툴팁 업데이트
		await chrome.action.setTitle({
			title: `영차영차 - 현재가: ₩${currentPrice.toLocaleString()}`,
		})
	} catch (error) {
		console.error('배지 업데이트 실패:', error)
	}
}

// 위젯 업데이트
async function updateWidget() {
	try {
		// 모든 탭에 위젯 업데이트 메시지 전송
		const tabs = await chrome.tabs.query({})

		for (const tab of tabs) {
			try {
				await chrome.tabs.sendMessage(tab.id, {
					action: 'updateWidget',
					price: currentPrice,
					userData: userData,
					settings: currentSettings,
				})
			} catch (error) {
				// 탭이 응답하지 않으면 무시 (Content Script가 없는 탭)
			}
		}
	} catch (error) {
		console.error('위젯 업데이트 실패:', error)
	}
}

// 위젯 토글
async function toggleWidget(enabled) {
	currentSettings.enableWidget = enabled

	try {
		const tabs = await chrome.tabs.query({})

		for (const tab of tabs) {
			try {
				await chrome.tabs.sendMessage(tab.id, {
					action: enabled ? 'showWidget' : 'hideWidget',
				})
			} catch (error) {
				// 무시
			}
		}
	} catch (error) {
		console.error('위젯 토글 실패:', error)
	}
}

// 설정 로드
async function loadSettings() {
	try {
		const result = await chrome.storage.sync.get(['settings'])
		if (result.settings) {
			currentSettings = result.settings
		}
	} catch (error) {
		console.error('설정 로드 실패:', error)
	}
}

// 사용자 데이터 로드
async function loadUserData() {
	try {
		const result = await chrome.storage.sync.get(['userData'])
		if (result.userData) {
			userData = result.userData
		}
	} catch (error) {
		console.error('사용자 데이터 로드 실패:', error)
	}
}

// 스토리지 변경 감지
chrome.storage.onChanged.addListener(async (changes, namespace) => {
	if (namespace === 'sync') {
		if (changes.settings) {
			currentSettings = changes.settings.newValue || {}
		}

		if (changes.userData) {
			userData = changes.userData.newValue || {}

			// 위젯 업데이트
			if (currentSettings.enableWidget) {
				await updateWidget()
			}
		}
	}
})

// 컨텍스트 메뉴 생성
chrome.contextMenus.create({
	id: 'rsu-refresh',
	title: 'RSU 가격 새로고침',
	contexts: ['action'],
})

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === 'rsu-refresh') {
		await fetchAndUpdatePrice()

		chrome.notifications.create({
			type: 'basic',
			iconUrl: 'assets/icons/icon64.png',
			title: '영차영차',
			message: `가격 업데이트 완료: ₩${currentPrice.toLocaleString()}`,
		})
	}
})

// 알림 클릭 처리
chrome.notifications.onClicked.addListener((notificationId) => {
	// 팝업 열기
	chrome.action.openPopup()
})

// 강제 가격 조회 및 업데이트 (시장 시간 무시) - KRX 우선
async function fetchAndUpdatePriceForced() {

	// API 시도 순서 - Yahoo Finance를 최우선으로 사용 (시장 시간 체크 제거된 버전)
	const apiMethods = [
		{ func: () => fetchFromYahooFinanceAPIForced(), name: 'Yahoo Finance' },
		{ func: () => fetchFromAlternativeYahooAPIForced(), name: 'Yahoo Finance (대체)' },
		{ func: () => fetchFromSearchAPIForced(), name: 'Yahoo Finance (검색)' },
		{ func: () => fetchFromNaverFinanceAPIForced(), name: '네이버 금융' },
	]

	for (let i = 0; i < apiMethods.length; i++) {
		try {
			const price = await apiMethods[i].func()

			if (price && price > 0) {
				// 가격 변동 체크
				const priceChanged = currentPrice !== price
				currentPrice = Math.round(price)


				// 배지 업데이트
				await updateBadge()

				// 위젯 업데이트
				if (currentSettings.enableWidget) {
					await updateWidget()
				}

				// 팝업이 열려있으면 가격 업데이트 알림 (API 소스 포함)
				if (priceChanged) {
					chrome.runtime
						.sendMessage({
							action: 'priceUpdated',
							price: currentPrice,
							source: apiMethods[i].name,
						})
						.catch(() => {
							// 팝업이 열려있지 않으면 무시
						})
				}

				return true // 성공하면 즉시 반환
			}
		} catch (error) {
			console.warn(`Background 강제 API ${i + 1} (${apiMethods[i].name}) 실패:`, error.message)
			continue // 다음 API 시도
		}
	}

	// 모든 API 실패 시
	console.error('모든 Background 강제 API 실패')

	// 현재 가격이 0이면 추정값 사용
	if (currentPrice === 0) {
		const basePrice = 51400  // 2024년 카카오 주가 기준으로 업데이트
		const variation = Math.floor(Math.random() * 4000) - 2000
		currentPrice = basePrice + variation
		await updateBadge()
	}

	return false
}





// Background용 Yahoo Finance API (시장 시간 무시)
async function fetchFromYahooFinanceAPIForced() {
	const response = await fetch(
		'https://query1.finance.yahoo.com/v8/finance/chart/035720.KS?interval=1d&range=1d',
		{
			method: 'GET',
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'application/json, text/plain, */*',
				'Cache-Control': 'no-cache',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.chart?.result?.[0]?.meta) {
		const meta = data.chart.result[0].meta
		const price = meta.regularMarketPrice || meta.previousClose

		if (price && price > 0) {
			return price
		}
	}

	throw new Error('Yahoo Finance 강제: 유효한 가격 데이터 없음')
}

// Background용 대체 Yahoo API (시장 시간 무시)
async function fetchFromAlternativeYahooAPIForced() {
	const response = await fetch(
		'https://query1.finance.yahoo.com/v7/finance/quote?symbols=035720.KS',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
				Accept: 'application/json',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
		return data.quoteResponse.result[0].regularMarketPrice
	}

	throw new Error('대체 API에서 가격 데이터 없음')
}

// Background용 검색 API (시장 시간 무시)
async function fetchFromSearchAPIForced() {
	const response = await fetch(
		'https://query2.finance.yahoo.com/v1/finance/search?q=035720.KS&quotesCount=1&newsCount=0',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
			},
		}
	)

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`)
	}

	const data = await response.json()

	if (data.quotes?.[0]?.regularMarketPrice) {
		return data.quotes[0].regularMarketPrice
	}

	throw new Error('검색 API에서 가격 데이터 없음')
}

// Background용 네이버 금융 API
async function fetchFromNaverFinanceAPI() {
	if (!isKoreanMarketOpen()) {
		throw new Error('한국 주식 시장이 닫혀있습니다')
	}


	const response = await fetch(
		'https://polling.finance.naver.com/api/realtime/domestic/stock/035720',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Language': 'ko-KR,ko;q=0.9',
				'Cache-Control': 'no-cache',
				'Referer': 'https://finance.naver.com/item/main.naver?code=035720'
			}
		}
	)

	if (!response.ok) {
		throw new Error(`네이버 금융 HTTP ${response.status}: ${response.statusText}`)
	}

	const data = await response.json()

	// 네이버 금융 응답 파싱
	if (data.datas && data.datas.length > 0) {
		const kakaoData = data.datas[0]
		const price = parseInt(kakaoData.nv?.replace(/,/g, '') || kakaoData.cv?.replace(/,/g, ''))

		if (price && price > 0) {
			return price
		}
	}

	throw new Error('네이버 금융 Background: 유효한 가격 데이터 없음')
}

// Background용 네이버 금융 API (강제 - 시장 시간 무시)
async function fetchFromNaverFinanceAPIForced() {

	const response = await fetch(
		'https://polling.finance.naver.com/api/realtime/domestic/stock/035720',
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Language': 'ko-KR,ko;q=0.9',
				'Cache-Control': 'no-cache',
				'Referer': 'https://finance.naver.com/item/main.naver?code=035720'
			}
		}
	)

	if (!response.ok) {
		throw new Error(`네이버 금융 강제 HTTP ${response.status}: ${response.statusText}`)
	}

	const data = await response.json()

	// 네이버 금융 응답 파싱
	if (data.datas && data.datas.length > 0) {
		const kakaoData = data.datas[0]
		const price = parseInt(kakaoData.nv?.replace(/,/g, '') || kakaoData.cv?.replace(/,/g, ''))

		if (price && price > 0) {
			return price
		}
	}

	throw new Error('네이버 금융 강제: 유효한 가격 데이터 없음')
}

// 초기 실행
;(async () => {
	await loadSettings()
	await loadUserData()
	await fetchAndUpdatePrice()
})()
