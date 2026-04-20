// API 유틸리티 함수들 import
import {
	fetchKakaoPrice as fetchKakaoPriceAPI,
	isKoreanMarketOpen,
	getMarketStatusMessage,
} from '../utils/api.util.js'
// 목표 및 시뮬레이션 유틸리티 함수들 import
import {
	updateSimulation,
	renderSimulation,
	addCustomTargetNew,
	loadCustomTarget,
	updateHeaderButton,
} from '../utils/goal.util.js'

// 전역 변수
let currentPrice = 0

// DOM 요소 가져오기
const elements = {
	// RSU 입력 및 표시
	rsuAmount: document.getElementById('rsuAmount'),
	rsuAmountDisplay: document.getElementById('rsuAmountDisplay'),
	avgPrice: document.getElementById('avgPrice'),
	avgPriceDisplay: document.getElementById('avgPriceDisplay'),

	// 자산 정보
	currentPrice: document.getElementById('currentPrice'),
	totalAsset: document.getElementById('totalAsset'),
	profitRate: document.getElementById('profitRate'),

	// 시뮬레이션
	simulationContainer: document.getElementById('simulationContainer'),
	addCustomTarget: document.getElementById('addCustomTarget'),

	// 버튼들
	editModeToggle: document.getElementById('editModeToggle'),
	saveDataBtn: document.getElementById('saveData'),
	cancelEditBtn: document.getElementById('cancelEdit'),
	refreshPriceBtn: document.getElementById('refreshPrice'),
	themeToggleBtn: document.getElementById('themeToggle'),

	// 버튼 그룹
	editModeButtons: document.getElementById('editModeButtons'),

	// 설정
	enableWidget: document.getElementById('enableWidget'),
	enableNotifications: document.getElementById('enableNotifications'),

	lastUpdate: document.getElementById('lastUpdate'),
}

// 수정 모드 상태
let isEditMode = false

// 목표 업데이트 콜백 설정
window.goalUpdateCallback = () => {
	updateDisplay()
}

// 알림 함수를 window에 노출
window.showNotification = showNotification

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
	// Chrome API 확인
	if (typeof chrome === 'undefined' || !chrome.storage) {
		console.error('Chrome API가 사용 불가능합니다!')
		alert('Chrome 확장 프로그램 환경에서만 동작합니다.')
		return
	}

	try {
		// 로딩 상태 표시
		showLoading(true)
		if (elements.currentPrice) {
			elements.currentPrice.textContent = '로딩중...'
		}

		// 1. 설정 로드
		await loadSettings()

		// 2. 저장된 RSU 데이터 로드 (초기값 135주, 37,150원 포함)
		await loadStoredData()

		// 3. 저장된 현재가 로드
		await loadStoredPrice()

		// 4. 이벤트 리스너 설정
		setupEventListeners()

		// 5. 커스텀 목표 로드
		await loadCustomTarget()

		// 6. 시뮬레이션 렌더링
		renderSimulation()

		// 7. 헤더 버튼 상태 업데이트
		updateHeaderButton()

		// 9. 저장된 데이터로 초기 화면 업데이트
		updateDisplay()

		// 10. 위젯에 현재 데이터 전송
		await updateWidgetWithCurrentData('팝업 초기화')

		// 11. 팝업 활성화 시 항상 최신 주가 조회 시작
		fetchKakaoPrice() // 비동기로 즉시 실행
	} catch (error) {
		console.error('초기화 중 오류:', error)
		showLoading(false)
		// 오류가 있어도 기본 화면은 표시
		updateDisplay()
	}
})

// 팝업 활성화/포커스 시 API 호출
document.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		fetchKakaoPrice()
	}
})

// 윈도우 포커스 시에도 API 호출
window.addEventListener('focus', () => {
	fetchKakaoPrice()
})

// 이벤트 리스너 설정
function setupEventListeners() {
	// 수정 모드 관련
	elements.editModeToggle.addEventListener('click', toggleEditMode)
	elements.saveDataBtn.addEventListener('click', () => {
		saveData()
		toggleEditMode() // 저장 후 수정 모드 해제
	})
	elements.cancelEditBtn.addEventListener('click', cancelEdit)

	// 기타 버튼들
	elements.refreshPriceBtn.addEventListener('click', refreshPrice)
	elements.themeToggleBtn.addEventListener('click', toggleTheme)

	// 입력 값 변경 시 실시간 업데이트 (수정 모드일 때만)
	elements.rsuAmount.addEventListener(
		'input',
		debounce(() => {
			if (isEditMode) {
				updateDisplay()
			}
		}, 300)
	)
	elements.avgPrice.addEventListener(
		'input',
		debounce(() => {
			if (isEditMode) {
				updateDisplay()
			}
		}, 300)
	)

	// 설정 변경
	elements.enableWidget.addEventListener('change', () => {
		saveSettings()
		updateWidgetStatus()
	})
	elements.enableNotifications.addEventListener('change', saveSettings)

	// 커스텀 목표 관련
	elements.addCustomTarget.addEventListener('click', addCustomTargetNew)
}

// 카카오 주가 조회 (API 유틸리티 사용)
async function fetchKakaoPrice(force = false) {
	try {
		// 한국 주식 시장 운영 시간 체크 (강제 모드가 아닐 때만)
		if (!force && !isKoreanMarketOpen()) {
			const statusMessage = getMarketStatusMessage()

			// 시장 시간 외에는 API 호출하지 않고 저장된 데이터만 표시
			showNotification(`📅 ${statusMessage}`)
			showLoading(false)
			updateDisplay()
			return
		}

		showLoading(true)

		const result = await fetchKakaoPriceAPI()

		if (result && result.price > 0) {
			currentPrice = result.price

			updatePriceDisplay()
			updateLastUpdate(result.source)

			// 현재가 자동 저장 (API 소스 정보 포함)
			await saveCurrentPrice(result.source)

			const now = new Date().toLocaleTimeString('ko-KR')
			const message = result.isEstimated
				? `API 연결 실패: 추정 가격 ₩${currentPrice.toLocaleString()} 사용`
				: `🔄 ${now} 주가 업데이트: ₩${currentPrice.toLocaleString()}`

			showNotification(message)

			showLoading(false)
			updateDisplay()
			return
		}
	} catch (error) {
		console.error('주가 조회 실패:', error)
		showNotification(`주가 조회 실패: ${error.message}`)
	}

	showLoading(false)
}

// 주가 표시 업데이트
function updatePriceDisplay() {
	if (elements.currentPrice) {
		if (currentPrice > 0) {
			elements.currentPrice.textContent = currentPrice.toLocaleString()

			// 평단가 대비 색상 적용
			const avgPrice = parseFloat(elements.avgPrice.value) || 0
			if (avgPrice > 0) {
				if (currentPrice > avgPrice) {
					elements.currentPrice.className = 'value positive'
				} else if (currentPrice < avgPrice) {
					elements.currentPrice.className = 'value negative'
				} else {
					elements.currentPrice.className = 'value'
				}
			} else {
				elements.currentPrice.className = 'value'
			}
		} else {
			elements.currentPrice.textContent = '조회중...'
			elements.currentPrice.className = 'value'
		}
	}
}

// 화면 표시 업데이트
function updateDisplay() {
	const rsuAmount = parseFloat(elements.rsuAmount.value) || 0
	const avgPrice = parseFloat(elements.avgPrice.value) || 0

	// RSU 수량 표시 업데이트
	if (elements.rsuAmountDisplay) {
		if (rsuAmount > 0) {
			elements.rsuAmountDisplay.textContent = rsuAmount.toLocaleString()
		} else {
			elements.rsuAmountDisplay.textContent = '미입력'
		}
	}

	// 평균 매입가 표시 업데이트
	if (elements.avgPriceDisplay) {
		if (avgPrice > 0) {
			elements.avgPriceDisplay.textContent = avgPrice.toLocaleString()
		} else {
			elements.avgPriceDisplay.textContent = '미입력'
		}
	}

	// 현재가 표시 업데이트 (0이면 빈값으로 표시)
	updatePriceDisplay()

	// 총 자산 계산 (현재가가 있을 때만)
	let totalAsset = 0
	if (currentPrice > 0) {
		totalAsset = rsuAmount * currentPrice
	}

	// 수익률 계산 (현재가, 매입가, 수량이 모두 있을 때만)
	let profitAmount = 0
	if (currentPrice > 0 && avgPrice > 0 && rsuAmount > 0) {
		const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
		profitAmount = rsuAmount * (currentPrice - avgPrice)

		if (elements.profitRate) {
			elements.profitRate.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(2)}`
			elements.profitRate.className = `value ${profitRate >= 0 ? 'positive' : 'negative'}`
		}
	} else {
		if (elements.profitRate) {
			if (currentPrice === 0) {
				elements.profitRate.textContent = '조회중...'
			} else if (avgPrice === 0) {
				elements.profitRate.textContent = '0.00'
			} else {
				elements.profitRate.textContent = '0.00'
			}
			elements.profitRate.className = 'value'
		}
	}

	// 총 자산과 수익금 통합 표시
	if (elements.totalAsset) {
		if (currentPrice > 0) {
			const sign = profitAmount >= 0 ? '+' : ''
			if (profitAmount !== 0) {
				elements.totalAsset.innerHTML = `${totalAsset.toLocaleString()}원<br><span class="profit-bracket">(${sign}${profitAmount.toLocaleString()}원)</span>`
			} else {
				elements.totalAsset.textContent = `${totalAsset.toLocaleString()}원`
			}
		} else {
			elements.totalAsset.textContent = '조회중...'
		}
	}

	// 보상 시뮬레이션 업데이트
	updateSimulation(totalAsset, rsuAmount)

	// 현재가 색상 업데이트 (평단가 입력 후 재계산)
	updatePriceDisplay()
}

// 데이터 저장
async function saveData() {
	const rsuAmount = parseFloat(elements.rsuAmount.value) || 0
	const avgPrice = parseFloat(elements.avgPrice.value) || 0

	const data = {
		rsuAmount: rsuAmount,
		avgPrice: avgPrice,
		lastSaved: new Date().toISOString(),
	}

	try {
		await chrome.storage.sync.set({ userData: data })
		showNotification(`데이터 저장 완료: ${rsuAmount}주, 평균매입가 ₩${avgPrice.toLocaleString()}`)

		// 현재가도 함께 저장
		await saveCurrentPrice()

		updateDisplay()

		// 위젯에 즉시 업데이트된 데이터 전송
		await updateWidgetWithCurrentData()

		// 저장 후 확인
		const verification = await chrome.storage.sync.get(['userData'])
	} catch (error) {
		console.error('저장 실패:', error)
		showNotification('저장에 실패했습니다: ' + error.message)

		// 로컬 스토리지로 폴백 시도
		try {
			await chrome.storage.local.set({ userData: data })
			showNotification('로컬 스토리지에 저장되었습니다.')
		} catch (localError) {
			console.error('로컬 저장도 실패:', localError)
		}
	}
}

// 현재가 저장
async function saveCurrentPrice(source = '') {
	if (currentPrice > 0) {
		try {
			// 히스토리에 현재 가격 추가 (최근 5일만 유지)
			const now = new Date()

			const priceData = {
				currentPrice,
				lastPriceUpdate: now.toISOString(),
				source: source, // API 소스 정보 추가
			}

			if (chrome.storage && chrome.storage.sync) {
				await chrome.storage.sync.set({ priceData })
			} else if (chrome.storage && chrome.storage.local) {
				await chrome.storage.local.set({ priceData })
			}

			// 위젯에 즉시 데이터 전송
			await updateWidgetWithCurrentData(source)
		} catch (error) {
			console.error('현재가 저장 실패:', error)
		}
	}
}

// 저장된 현재가 로드
async function loadStoredPrice() {
	try {
		let result
		if (chrome.storage && chrome.storage.sync) {
			result = await chrome.storage.sync.get(['priceData'])
		} else if (chrome.storage && chrome.storage.local) {
			result = await chrome.storage.local.get(['priceData'])
		}

		if (result && result.priceData) {
			const { currentPrice: savedPrice, lastPriceUpdate, source: savedSource } = result.priceData

			if (savedPrice > 0) {
				currentPrice = savedPrice

				// 마지막 업데이트 시간 표시 (API 소스 포함)
				if (lastPriceUpdate && elements.lastUpdate) {
					const updateTime = new Date(lastPriceUpdate)
					const timeStr = updateTime.toLocaleString('ko-KR')

					if (savedSource) {
						elements.lastUpdate.innerHTML = `${timeStr}<br/>(${savedSource} 제공)`
					} else {
						elements.lastUpdate.textContent = timeStr
					}
				}
			}
		}
	} catch (error) {
		console.error('저장된 현재가 로드 실패:', error)
	}
}

// 저장된 데이터 로드
async function loadStoredData() {
	try {
		// 먼저 sync 스토리지 시도
		let result = await chrome.storage.sync.get(['userData'])

		// sync에 데이터가 없으면 local 스토리지 확인
		if (!result.userData) {
			result = await chrome.storage.local.get(['userData'])
		}

		if (result.userData) {
			elements.rsuAmount.value = result.userData.rsuAmount || 135
			elements.avgPrice.value = result.userData.avgPrice || 37150
		} else {
			// 초기값 설정 (135주, 37,150원)
			elements.rsuAmount.value = 135
			elements.avgPrice.value = 37150
		}
	} catch (error) {
		console.error('데이터 로드 실패:', error)
		// 오류 시에도 초기값 설정
		elements.rsuAmount.value = 135
		elements.avgPrice.value = 37150
	}
}

// 설정 저장
async function saveSettings() {
	const settings = {
		enableWidget: elements.enableWidget.checked,
		enableNotifications: elements.enableNotifications.checked,
		theme: document.documentElement.getAttribute('data-theme') || 'light',
	}

	try {
		await chrome.storage.sync.set({ settings })

		// 배경 스크립트에 설정 변경 알림
		chrome.runtime.sendMessage({
			action: 'updateSettings',
			settings: settings,
		})
	} catch (error) {
		console.error('설정 저장 실패:', error)
	}
}

// 설정 로드
async function loadSettings() {
	try {
		const result = await chrome.storage.sync.get(['settings'])
		if (result.settings) {
			const settings = result.settings
			elements.enableWidget.checked = settings.enableWidget ?? true
			elements.enableNotifications.checked = settings.enableNotifications ?? true

			// 테마 적용
			if (settings.theme) {
				document.documentElement.setAttribute('data-theme', settings.theme)
				elements.themeToggleBtn.textContent = settings.theme === 'dark' ? '☀️' : '🌙'
			}
		}
	} catch (error) {
		console.error('설정 로드 실패:', error)
	}
}

// 테마 토글
function toggleTheme() {
	const currentTheme = document.documentElement.getAttribute('data-theme')
	const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

	document.documentElement.setAttribute('data-theme', newTheme)
	elements.themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙'

	saveSettings()
}

// 위젯 상태 업데이트
function updateWidgetStatus() {
	chrome.runtime.sendMessage({
		action: 'toggleWidget',
		enabled: elements.enableWidget.checked,
	})
}

// 새로고침
// 수정 모드 토글
function toggleEditMode() {
	isEditMode = !isEditMode

	if (isEditMode) {
		// 수정 모드 활성화
		// 표시 요소 숨기고 입력 요소 보이기
		elements.rsuAmountDisplay.classList.add('hidden')
		elements.avgPriceDisplay.classList.add('hidden')
		elements.rsuAmount.classList.remove('hidden')
		elements.avgPrice.classList.remove('hidden')

		// 버튼 그룹 변경 - 수정 버튼 숨기고 저장/취소 버튼 보이기
		elements.editModeToggle.parentElement.classList.add('hidden')
		elements.editModeButtons.classList.remove('hidden')

		// 입력 필드에 현재 값 설정
		if (!elements.rsuAmount.value) {
			elements.rsuAmount.focus()
		}
	} else {
		// 수정 모드 비활성화
		// 입력 요소 숨기고 표시 요소 보이기
		elements.rsuAmount.classList.add('hidden')
		elements.avgPrice.classList.add('hidden')
		elements.rsuAmountDisplay.classList.remove('hidden')
		elements.avgPriceDisplay.classList.remove('hidden')

		// 버튼 그룹 변경 - 저장/취소 버튼 숨기고 수정 버튼 보이기
		elements.editModeButtons.classList.add('hidden')
		elements.editModeToggle.parentElement.classList.remove('hidden')

		// 화면 업데이트
		updateDisplay()
	}
}

// 수정 취소
function cancelEdit() {
	// 저장된 데이터로 되돌리기
	loadStoredData().then(() => {
		toggleEditMode() // 수정 모드 해제
		updateDisplay() // 화면 업데이트
	})
}

// 수동 새로고침
async function refreshPrice() {
	// 새로운 API 요청 (시장 시간 무관하게 실행)
	await fetchKakaoPrice(true) // force=true로 시장 시간 체크 무시

	// Background 스크립트도 업데이트 요청
	try {
		await chrome.runtime.sendMessage({
			action: 'forceUpdate',
		})
	} catch (error) {
		console.warn('Background 업데이트 요청 실패:', error)
	}
}

// 마지막 업데이트 시간 표시
function updateLastUpdate(source = '') {
	const now = new Date()
	const timeStr = now.toLocaleString('ko-KR')

	if (source && elements.lastUpdate) {
		elements.lastUpdate.innerHTML = `${timeStr}<br/>(${source} 제공)`
	} else if (elements.lastUpdate) {
		elements.lastUpdate.textContent = timeStr
	}
}

// 로딩 상태 표시
function showLoading(show) {
	const container = document.querySelector('.container')
	if (show) {
		container.classList.add('loading')
	} else {
		container.classList.remove('loading')
	}
}

// 알림 표시
function showNotification(message) {
	// Chrome 알림 API 사용
	if (chrome.notifications) {
		chrome.notifications.create({
			type: 'basic',
			iconUrl: 'assets/icons/icon64.png',
			title: '영차영차',
			message: message,
		})
	}
}

// 디바운스 함수
function debounce(func, wait) {
	let timeout
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

// 위젯에 현재 데이터 전송
async function updateWidgetWithCurrentData(source = '') {
	try {
		const rsuAmount = parseFloat(elements.rsuAmount.value) || 0
		const avgPrice = parseFloat(elements.avgPrice.value) || 0

		const userData = {
			rsuAmount: rsuAmount,
			avgPrice: avgPrice,
			lastSaved: new Date().toISOString(),
		}

		// 설정 정보도 함께 전송
		const settingsResult = await chrome.storage.sync.get(['settings'])
		const settings = settingsResult.settings || { enableWidget: true }

		// 백그라운드 스크립트를 통해 위젯에 데이터 전송
		chrome.runtime.sendMessage({
			action: 'updateWidget',
			price: currentPrice,
			userData: userData,
			settings: settings,
			source: source,
		})
	} catch (error) {
		console.error('위젯 데이터 전송 실패:', error)
	}
}

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'priceUpdated') {
		currentPrice = request.price
		updatePriceDisplay()
		updateDisplay()

		// API 소스 정보가 있으면 마지막 업데이트 시간에 포함
		if (request.source) {
			updateLastUpdate(request.source)
		}

		// 위젯에도 업데이트된 가격 전송
		updateWidgetWithCurrentData(request.source)
	}
})

// 주기적 업데이트 (5분마다)
setInterval(
	async () => {
		if (document.visibilityState === 'visible' && isKoreanMarketOpen()) {
			await fetchKakaoPrice()
			updateDisplay()
		} else if (document.visibilityState === 'visible') {
			// 시장 시간 외에는 UI만 업데이트 (저장된 데이터로)
			updateDisplay()
		}
	},
	5 * 60 * 1000
)
