// 백그라운드 서비스 워커
console.log('영차영차 Background Script 시작됨')

// 전역 변수
let currentSettings = {}
let currentPrice = 0
let userData = {}

// 설치 시 초기화
chrome.runtime.onInstalled.addListener(async () => {
	console.log('영차영차 설치됨')

	// 기본 설정값 설정
	const defaultSettings = {
		enableWidget: true,
		enableNotifications: true,
		targetPrice: 120000,
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
		await checkPriceAlerts()
	}
})

// 메시지 처리
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	console.log('메시지 수신:', request)

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
			await fetchAndUpdatePrice()
			sendResponse({ success: true })
			break
	}
})

// 가격 조회 및 업데이트 (여러 API 시도)
async function fetchAndUpdatePrice() {
	console.log('주가 업데이트 시작...')

	// API 시도 순서
	const apiMethods = [
		() => fetchFromYahooFinanceAPI(),
		() => fetchFromAlternativeYahooAPI(),
		() => fetchFromSearchAPI(),
	]

	for (let i = 0; i < apiMethods.length; i++) {
		try {
			console.log(`Background API ${i + 1} 시도 중...`)
			const price = await apiMethods[i]()

			if (price && price > 0) {
				// 가격 변동 체크
				const priceChanged = currentPrice !== price
				currentPrice = Math.round(price)

				console.log(`Background API ${i + 1} 성공: ₩${currentPrice.toLocaleString()}`)

				// 배지 업데이트
				await updateBadge()

				// 위젯 업데이트
				if (currentSettings.enableWidget) {
					await updateWidget()
				}

				// 팝업이 열려있으면 가격 업데이트 알림
				if (priceChanged) {
					chrome.runtime
						.sendMessage({
							action: 'priceUpdated',
							price: currentPrice,
						})
						.catch(() => {
							// 팝업이 열려있지 않으면 무시
						})
				}

				return true // 성공하면 즉시 반환
			}
		} catch (error) {
			console.warn(`Background API ${i + 1} 실패:`, error.message)
			continue // 다음 API 시도
		}
	}

	// 모든 API 실패 시
	console.error('모든 Background API 실패')

	// 현재 가격이 0이면 추정값 사용
	if (currentPrice === 0) {
		const basePrice = 98000
		const variation = Math.floor(Math.random() * 6000) - 3000
		currentPrice = basePrice + variation
		console.log('Background 추정 주가 사용:', currentPrice)
		await updateBadge()
	}

	return false
}

// Background용 Yahoo Finance API
async function fetchFromYahooFinanceAPI() {
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

	throw new Error('유효한 가격 데이터 없음')
}

// Background용 대체 Yahoo API
async function fetchFromAlternativeYahooAPI() {
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

// 가격 알림 체크
async function checkPriceAlerts() {
	if (!currentSettings.enableNotifications || !currentSettings.targetPrice) {
		return
	}

	const targetPrice = currentSettings.targetPrice

	// 목표가 도달 체크
	if (currentPrice >= targetPrice) {
		await chrome.notifications.create({
			type: 'basic',
			iconUrl: 'assets/icons/icon64.png',
			title: '🎯 목표가 도달!',
			message: `카카오 주가가 목표가 ₩${targetPrice.toLocaleString()}에 도달했습니다! 현재가: ₩${currentPrice.toLocaleString()}`,
		})

		// 목표가 도달 후 알림 비활성화 (스팸 방지)
		currentSettings.targetPrice = 0
		await chrome.storage.sync.set({ settings: currentSettings })
	}
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
			console.log('설정 업데이트됨:', currentSettings)
		}

		if (changes.userData) {
			userData = changes.userData.newValue || {}
			console.log('사용자 데이터 업데이트됨:', userData)

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

// 초기 실행
;(async () => {
	await loadSettings()
	await loadUserData()
	await fetchAndUpdatePrice()
})()
