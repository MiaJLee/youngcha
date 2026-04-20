// 백그라운드 서비스 워커
import { targets } from '../utils/goal.util.js'
import { fetchKakaoPrice, isKoreanMarketOpen } from '../utils/api.util.js'

// 전역 변수
let currentSettings = {}
let currentPrice = 0
let userData = {}

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
chrome.alarms.onAlarm.addListener(async alarm => {
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
			return true

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
		case 'notifyTargetAchieved':
			if (request.target) {
				chrome.notifications.create({
					type: 'basic',
					iconUrl: 'assets/icons/icon64.png',
					title: '목표 달성! 🎉',
					message: `${request.target.icon || '🎯'} ${request.target.name} 목표를 달성했습니다!\n축하합니다!`,
				})
			}
			break
	}
})

// 가격 조회 및 업데이트
// 장중에는 항상 fetch, 장 마감에는 캐시된 가격이 없을 때만 fetch (첫 노출 보장)
async function fetchAndUpdatePrice() {
	if (!isKoreanMarketOpen() && currentPrice > 0) {
		await updateIcon()
		return false
	}
	return await updatePriceFromSources()
}

// 강제 가격 조회 (시장 시간 무시)
async function fetchAndUpdatePriceForced() {
	return await updatePriceFromSources()
}

// 공용 업데이트 로직: fetchKakaoPrice 결과로 배지/위젯/팝업 갱신
async function updatePriceFromSources() {
	const result = await fetchKakaoPrice()
	if (!result || !result.price || result.price <= 0) return false

	const priceChanged = currentPrice !== result.price
	currentPrice = Math.round(result.price)

	await updateIcon()
	if (currentSettings.enableWidget) await updateWidget()

	if (priceChanged) {
		chrome.runtime
			.sendMessage({
				action: 'priceUpdated',
				price: currentPrice,
				source: result.source,
			})
			.catch(() => {})
	}

	return !result.isEstimated
}

// Chrome 기본 배지 사용 (색상 커스텀 없음)
async function updateIcon() {
	if (currentPrice === 0) return

	const priceText =
		currentPrice >= 1000 ? Math.round(currentPrice / 1000) + 'K' : currentPrice.toString()

	try {
		// 이전 버전이 커스텀 아이콘을 덮어썼을 수 있어 manifest 아이콘으로 복구
		await chrome.action
			.setIcon({
				path: {
					16: 'assets/icons/icon16.png',
					32: 'assets/icons/icon32.png',
					64: 'assets/icons/icon64.png',
					128: 'assets/icons/icon128.png',
				},
			})
			.catch(() => {})

		await chrome.action.setBadgeText({ text: priceText })
		await chrome.action.setTitle({
			title: `영차영차 - 현재가: ₩${currentPrice.toLocaleString()}`,
		})
	} catch (error) {
		console.error('배지 업데이트 실패:', error)
	}
}

// 위젯 업데이트 (tabs 권한 없이 작동)
async function updateWidget() {
	try {
		// 팝업이 열려있으면 가격 업데이트 알림
		chrome.runtime
			.sendMessage({
				action: 'priceUpdated',
				price: currentPrice,
				userData: userData,
				settings: currentSettings,
			})
			.catch(() => {
				// 팝업이 열려있지 않으면 무시
			})
	} catch (error) {
		console.error('위젯 업데이트 실패:', error)
	}
}

// 위젯 토글 (tabs 권한 없이 작동)
async function toggleWidget(enabled) {
	currentSettings.enableWidget = enabled

	try {
		// 팝업에만 설정 변경 알림
		chrome.runtime
			.sendMessage({
				action: 'widgetToggled',
				enabled: enabled,
			})
			.catch(() => {
				// 팝업이 열려있지 않으면 무시
			})
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

		// 커스텀 목표 로드
		const localResult = await chrome.storage.local.get(['customTarget'])
		if (localResult.customTarget) {
			targets.custom = localResult.customTarget
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

	// 로컬 스토리지 변경 감지 (커스텀 목표용)
	if (namespace === 'local') {
		if (changes.customTarget) {
			targets.custom = changes.customTarget.newValue || null

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

// 초기 실행
;(async () => {
	await loadSettings()
	await loadUserData()
	await fetchAndUpdatePrice()
})()
