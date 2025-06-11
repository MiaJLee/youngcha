// 전역 변수
let currentPrice = 0
// priceChart 변수 제거 - 자체 차트 구현으로 변경
let priceHistory = []

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

	// 차트
	priceChartCanvas: document.getElementById('priceChart'),

	// 버튼들
	editModeToggle: document.getElementById('editModeToggle'),
	saveDataBtn: document.getElementById('saveData'),
	cancelEditBtn: document.getElementById('cancelEdit'),
	refreshPriceBtn: document.getElementById('refreshPrice'),
	themeToggleBtn: document.getElementById('themeToggle'),

	// 버튼 그룹
	// normalModeButtons 제거 - 개별 버튼으로 변경
	editModeButtons: document.getElementById('editModeButtons'),

	// 설정
	enableWidget: document.getElementById('enableWidget'),
	enableNotifications: document.getElementById('enableNotifications'),
	targetPrice: document.getElementById('targetPrice'),
	lastUpdate: document.getElementById('lastUpdate'),
}

// 수정 모드 상태
let isEditMode = false

// 목표 상품 정의
const targets = {
	flight: {
		icon: '🛩',
		name: '유럽 왕복 일등석 항공권',
		price: 12000000,
		id: 'flight',
	},
	tesla: {
		icon: '🏎',
		name: '테슬라 Model 3',
		price: 60000000,
		id: 'tesla',
	},
	custom: null, // 커스텀 목표 (사용자가 설정)
}

// 커스텀 목표 이모지 선택 옵션
const customEmojis = ['🎯', '⭐', '🎁', '🏆', '💎']

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
	console.log('팝업 로드 시작')

	// Chrome API 확인
	if (typeof chrome === 'undefined' || !chrome.storage) {
		console.error('Chrome API가 사용 불가능합니다!')
		alert('Chrome 확장 프로그램 환경에서만 동작합니다.')
		return
	}

	console.log('Chrome API 사용 가능')

	try {
		// 로딩 상태 표시
		showLoading(true)
		if (elements.currentPrice) {
			elements.currentPrice.textContent = '로딩중...'
		}

		// 1. 설정 로드
		await loadSettings()
		console.log('설정 로드 완료')

		// 2. 저장된 RSU 데이터 로드 (초기값 135주, 37,150원 포함)
		await loadStoredData()
		console.log('RSU 데이터 로드 완료')

		// 3. 저장된 현재가 로드
		await loadStoredPrice()
		console.log('저장된 현재가 로드 완료')

		// 4. 이벤트 리스너 설정
		setupEventListeners()
		console.log('이벤트 리스너 설정 완료')

		// 5. 커스텀 목표 로드
		await loadCustomTarget()
		console.log('커스텀 목표 로드 완료')

		// 6. 시뮬레이션 렌더링
		renderSimulation()
		console.log('시뮬레이션 렌더링 완료')

		// 7. 헤더 버튼 상태 업데이트
		updateHeaderButton()
		console.log('헤더 버튼 업데이트 완료')

		// 8. 차트 초기화
		initializeChart()
		console.log('차트 초기화 완료')

		// 9. 저장된 데이터로 초기 화면 업데이트
		updateDisplay()
		console.log('초기 화면 업데이트 완료')

		// 10. 팝업 활성화 시 항상 최신 주가 조회 시작
		console.log('팝업 활성화됨 - 실시간 주가 조회 시작')
		fetchKakaoPrice() // 비동기로 즉시 실행
		console.log('주가 조회 API 호출됨')
	} catch (error) {
		console.error('초기화 중 오류:', error)
		showLoading(false)
		// 오류가 있어도 기본 화면은 표시
		updateDisplay()
	}

	console.log('팝업 초기화 완료')
})

// 팝업 활성화/포커스 시 API 호출
document.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		console.log('팝업이 다시 보임 - 주가 API 재호출')
		fetchKakaoPrice()
	}
})

// 윈도우 포커스 시에도 API 호출
window.addEventListener('focus', () => {
	console.log('팝업 포커스됨 - 주가 API 호출')
	fetchKakaoPrice()
})

// 이벤트 리스너 설정
function setupEventListeners() {
	// 수정 모드 관련
	elements.editModeToggle.addEventListener('click', toggleEditMode)
	elements.saveDataBtn.addEventListener('click', () => {
		console.log('저장 버튼 클릭됨')
		console.log('현재 입력값:', {
			rsuAmount: elements.rsuAmount.value,
			avgPrice: elements.avgPrice.value,
		})
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
	elements.targetPrice.addEventListener('input', debounce(saveSettings, 500))

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
async function fetchKakaoPrice() {
	try {
		showLoading(true)

		const result = await window.apiUtils.fetchKakaoPrice()

		if (result && result.price > 0) {
			currentPrice = result.price
			console.log(`주가 조회 성공: ₩${currentPrice.toLocaleString()}`)

			// 히스토리 데이터 처리
			if (result.history && result.history.length > 0) {
				priceHistory = result.history
			} else {
				priceHistory = [
					{
						time: new Date(),
						price: currentPrice,
					},
				]
			}

			updatePriceDisplay()
			updateChart()
			updateLastUpdate()

			// 현재가 자동 저장
			await saveCurrentPrice()

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

	console.log('화면 업데이트:', {
		rsuAmount,
		avgPrice,
		currentPrice,
		isEditMode,
		elements: {
			rsuAmountValue: elements.rsuAmount?.value,
			avgPriceValue: elements.avgPrice?.value,
		},
	})

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

	console.log('총 자산 계산:', { rsuAmount, currentPrice, totalAsset })

	// 수익률 계산 (현재가, 매입가, 수량이 모두 있을 때만)
	let profitAmount = 0
	if (currentPrice > 0 && avgPrice > 0 && rsuAmount > 0) {
		const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
		profitAmount = rsuAmount * (currentPrice - avgPrice)

		console.log('수익률 계산:', {
			currentPrice,
			avgPrice,
			profitRate,
			profitAmount,
		})

		if (elements.profitRate) {
			elements.profitRate.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(2)}`
			elements.profitRate.className = `value ${profitRate >= 0 ? 'positive' : 'negative'}`
		}
	} else {
		console.log('수익률 계산 생략:', { currentPrice, avgPrice, rsuAmount })

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
		console.log('총 자산 표시 업데이트:', elements.totalAsset.textContent)
	}

	// 보상 시뮬레이션 업데이트
	updateSimulation(totalAsset, rsuAmount)

	// 현재가 색상 업데이트 (평단가 입력 후 재계산)
	updatePriceDisplay()

	console.log('화면 업데이트 완료')
}

// 보상 시뮬레이션 업데이트 (동적 버전)
function updateSimulation(totalAsset, rsuAmount) {
	for (const [key, target] of Object.entries(targets)) {
		if (!target) continue

		const progress = Math.min((totalAsset / target.price) * 100, 100)
		const required = rsuAmount > 0 ? Math.ceil(target.price / rsuAmount) : 0

		const progressElement = document.getElementById(`${target.id}Progress`)
		const percentElement = document.getElementById(`${target.id}Percent`)
		const requiredElement = document.getElementById(`${target.id}Required`)

		if (progressElement) progressElement.style.width = `${progress}%`
		if (percentElement) percentElement.textContent = `${progress.toFixed(1)}%`
		if (requiredElement) requiredElement.textContent = `목표가: ₩${required.toLocaleString()}`
	}
}

// 간단한 자체 차트 초기화 (Chart.js 대신)
function initializeChart() {
	try {
		console.log('자체 차트 초기화 시작')

		// 캔버스 요소 확인
		if (!elements.priceChartCanvas) {
			console.error('차트 캔버스 요소를 찾을 수 없습니다!')
			return
		}

		console.log('차트 요소 확인됨:', elements.priceChartCanvas)

		// 캔버스 크기 설정
		const canvas = elements.priceChartCanvas
		const container = canvas.parentElement
		const rect = container.getBoundingClientRect()
		canvas.width = rect.width || 300
		canvas.height = 200

		// 초기 차트 그리기
		drawChart()

		console.log('자체 차트 초기화 완료')
	} catch (error) {
		console.error('차트 초기화 실패:', error)

		// 오류 메시지를 차트 컨테이너에 표시
		if (elements.priceChartCanvas && elements.priceChartCanvas.parentElement) {
			elements.priceChartCanvas.parentElement.innerHTML = `
				<div style="text-align: center; padding: 20px; color: #666;">
					📊 차트 로딩 중...<br>
					<small>잠시만 기다려주세요</small>
				</div>
			`
		}
	}
}

// 간단한 라인 차트 그리기 함수
function drawChart() {
	const canvas = elements.priceChartCanvas
	if (!canvas) return

	const ctx = canvas.getContext('2d')
	const width = canvas.width
	const height = canvas.height

	// 캔버스 초기화
	ctx.clearRect(0, 0, width, height)

	// 배경 설정
	ctx.fillStyle =
		getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#ffffff'
	ctx.fillRect(0, 0, width, height)

	// 데이터 준비 (최근 5일만)
	let data = []
	let labels = []

	if (priceHistory.length > 0) {
		// 최근 5일 데이터만 사용
		const recentHistory = priceHistory.slice(-5)
		data = recentHistory.map((item) => item.price)
		labels = recentHistory.map((item) =>
			item.time.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
		)
	} else if (currentPrice > 0) {
		data = [currentPrice]
		labels = ['현재']
	} else {
		// 기본 예시 데이터 (최근 5일)
		data = [95000, 98000, 96000, 99000, 97000]
		labels = ['월', '화', '수', '목', '금']
	}

	if (data.length === 0) return

	// 차트 영역 설정
	const padding = 40
	const chartWidth = width - padding * 2
	const chartHeight = height - padding * 2

	// 데이터 범위 계산
	const minValue = Math.min(...data) * 0.995
	const maxValue = Math.max(...data) * 1.005
	const valueRange = maxValue - minValue || 1000

	// 격자 그리기
	ctx.strokeStyle =
		getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0'
	ctx.lineWidth = 1

	// 가로 격자선 (Y축)
	for (let i = 0; i <= 4; i++) {
		const y = padding + (chartHeight / 4) * i
		ctx.beginPath()
		ctx.moveTo(padding, y)
		ctx.lineTo(width - padding, y)
		ctx.stroke()

		// Y축 라벨
		const value = maxValue - (valueRange / 4) * i
		ctx.fillStyle =
			getComputedStyle(document.documentElement).getPropertyValue('--secondary-color') || '#666'
		ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
		ctx.textAlign = 'right'
		ctx.fillText('₩' + Math.round(value).toLocaleString(), padding - 5, y + 3)
	}

	// 라인 차트 그리기
	if (data.length > 0) {
		const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2

		// 라인 그리기
		ctx.strokeStyle =
			getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff'
		ctx.lineWidth = 2
		ctx.beginPath()

		for (let i = 0; i < data.length; i++) {
			const x = padding + stepX * i
			const y = padding + chartHeight - ((data[i] - minValue) / valueRange) * chartHeight

			if (i === 0) {
				ctx.moveTo(x, y)
			} else {
				ctx.lineTo(x, y)
			}
		}
		ctx.stroke()

		// 영역 채우기
		if (data.length > 1) {
			ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
			ctx.beginPath()
			ctx.moveTo(padding, height - padding)

			for (let i = 0; i < data.length; i++) {
				const x = padding + stepX * i
				const y = padding + chartHeight - ((data[i] - minValue) / valueRange) * chartHeight
				ctx.lineTo(x, y)
			}

			ctx.lineTo(padding + stepX * (data.length - 1), height - padding)
			ctx.closePath()
			ctx.fill()
		}

		// 포인트 그리기
		ctx.fillStyle =
			getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff'
		for (let i = 0; i < data.length; i++) {
			const x = padding + stepX * i
			const y = padding + chartHeight - ((data[i] - minValue) / valueRange) * chartHeight

			ctx.beginPath()
			ctx.arc(x, y, 3, 0, 2 * Math.PI)
			ctx.fill()
		}

		// X축 라벨
		ctx.fillStyle =
			getComputedStyle(document.documentElement).getPropertyValue('--secondary-color') || '#666'
		ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
		ctx.textAlign = 'center'

		for (let i = 0; i < labels.length; i++) {
			const x = padding + stepX * i
			ctx.fillText(labels[i], x, height - padding + 15)
		}
	}

	// 차트 제목
	ctx.fillStyle =
		getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333'
	ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
	ctx.textAlign = 'left'
	ctx.fillText('카카오 주가 변동', padding, 20)

	console.log('차트 그리기 완료:', {
		dataLength: data.length,
		minValue: Math.round(minValue),
		maxValue: Math.round(maxValue),
	})
}

// 차트 업데이트 (자체 구현)
function updateChart() {
	try {
		console.log('차트 업데이트 시작:', {
			historyLength: priceHistory.length,
			currentPrice,
		})

		// 데이터가 없으면 현재가로라도 표시
		if (priceHistory.length === 0 && currentPrice > 0) {
			priceHistory = [
				{
					time: new Date(),
					price: currentPrice,
				},
			]
			console.log('현재가로 히스토리 생성:', priceHistory)
		}

		// 차트 다시 그리기
		drawChart()

		console.log('차트 업데이트 완료')
	} catch (error) {
		console.error('차트 업데이트 실패:', error)
	}
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

	console.log('저장할 데이터:', data)

	try {
		await chrome.storage.sync.set({ userData: data })
		console.log('데이터 저장 성공')
		showNotification(`데이터 저장 완료: ${rsuAmount}주, 평균매입가 ₩${avgPrice.toLocaleString()}`)

		// 현재가도 함께 저장
		await saveCurrentPrice()

		updateDisplay()

		// 저장 후 확인
		const verification = await chrome.storage.sync.get(['userData'])
		console.log('저장 확인:', verification.userData)
	} catch (error) {
		console.error('저장 실패:', error)
		showNotification('저장에 실패했습니다: ' + error.message)

		// 로컬 스토리지로 폴백 시도
		try {
			await chrome.storage.local.set({ userData: data })
			console.log('로컬 스토리지에 저장됨')
			showNotification('로컬 스토리지에 저장되었습니다.')
		} catch (localError) {
			console.error('로컬 저장도 실패:', localError)
		}
	}
}

// 현재가 저장
async function saveCurrentPrice() {
	if (currentPrice > 0) {
		try {
			// 히스토리에 현재 가격 추가 (최근 5일만 유지)
			const now = new Date()

			// 오늘 데이터가 이미 있는지 확인
			const today = now.toDateString()
			const existingTodayIndex = priceHistory.findIndex((item) => item.time.toDateString() === today)

			if (existingTodayIndex >= 0) {
				// 오늘 데이터 업데이트
				priceHistory[existingTodayIndex] = { time: now, price: currentPrice }
			} else {
				// 새로운 일자 데이터 추가
				priceHistory.push({ time: now, price: currentPrice })
			}

			// 최근 5일만 유지
			priceHistory = priceHistory.slice(-5)

			const priceData = {
				currentPrice,
				lastPriceUpdate: now.toISOString(),
				priceHistory: priceHistory.map((item) => ({
					time: item.time.toISOString(),
					price: item.price,
				})),
			}

			console.log('현재가 및 히스토리 저장:', {
				currentPrice,
				historyLength: priceHistory.length,
			})

			if (chrome.storage && chrome.storage.sync) {
				await chrome.storage.sync.set({ priceData })
			} else if (chrome.storage && chrome.storage.local) {
				await chrome.storage.local.set({ priceData })
			}

			console.log('현재가 저장 완료')
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
			const {
				currentPrice: savedPrice,
				lastPriceUpdate,
				priceHistory: savedHistory,
			} = result.priceData

			if (savedPrice > 0) {
				currentPrice = savedPrice

				// 히스토리 데이터 복원 (최근 5일만)
				if (savedHistory && savedHistory.length > 0) {
					priceHistory = savedHistory.slice(-5).map((item) => ({
						time: new Date(item.time),
						price: item.price,
					}))
					console.log('저장된 히스토리 로드:', priceHistory.length, '개 항목')
				}

				console.log('저장된 현재가 로드:', {
					price: currentPrice,
					lastUpdate: lastPriceUpdate,
					historyLength: priceHistory.length,
				})

				// 마지막 업데이트 시간 표시
				if (lastPriceUpdate && elements.lastUpdate) {
					const updateTime = new Date(lastPriceUpdate)
					elements.lastUpdate.textContent = updateTime.toLocaleString('ko-KR')
				}
			}
		} else {
			console.log('저장된 현재가 없음')
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
			console.log('저장된 데이터 로드됨:', result.userData)
		} else {
			// 초기값 설정 (135주, 37,150원)
			elements.rsuAmount.value = 135
			elements.avgPrice.value = 37150
			console.log('초기값 설정됨: RSU 135주, 매입가 37,150원')
		}
	} catch (error) {
		console.error('데이터 로드 실패:', error)
		// 오류 시에도 초기값 설정
		elements.rsuAmount.value = 135
		elements.avgPrice.value = 37150
		console.log('오류로 인한 초기값 설정')
	}
}

// 설정 저장
async function saveSettings() {
	const settings = {
		enableWidget: elements.enableWidget.checked,
		enableNotifications: elements.enableNotifications.checked,
		targetPrice: parseFloat(elements.targetPrice.value) || 0,
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
			elements.targetPrice.value = settings.targetPrice || ''

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
	console.log('수정 모드 토글:', isEditMode)

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

		console.log('수정 모드 활성화됨')
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

		console.log('수정 모드 비활성화됨')
	}
}

// 수정 취소
function cancelEdit() {
	console.log('수정 취소')

	// 저장된 데이터로 되돌리기
	loadStoredData().then(() => {
		toggleEditMode() // 수정 모드 해제
		updateDisplay() // 화면 업데이트
	})
}

// 수동 새로고침
async function refreshPrice() {
	console.log('수동 새로고침 시작...')

	// 새로운 API 요청
	await fetchKakaoPrice()

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
function updateLastUpdate() {
	const now = new Date()
	elements.lastUpdate.textContent = now.toLocaleTimeString('ko-KR')
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
	// 간단한 토스트 알림 (실제로는 Chrome API 사용)
	console.log('알림:', message)

	// Chrome 알림 API 사용
	if (chrome.notifications) {
		chrome.notifications.create({
			type: 'basic',
			iconUrl: 'icons/icon64.png',
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

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'priceUpdated') {
		currentPrice = request.price
		updatePriceDisplay()
		updateDisplay()
	}
})

// 주기적 업데이트 (5분마다)
setInterval(async () => {
	if (document.visibilityState === 'visible') {
		await fetchKakaoPrice()
		updateDisplay()
	}
}, 5 * 60 * 1000)

// 시뮬레이션 동적 렌더링
function renderSimulation() {
	const container = elements.simulationContainer
	if (!container) return

	container.innerHTML = ''

	// 커스텀 목표를 먼저 렌더링 (있는 경우)
	if (targets.custom) {
		renderTargetItem(targets.custom, true)
	}

	// 나머지 targets 객체 순회하여 시뮬레이션 아이템 생성
	for (const [key, target] of Object.entries(targets)) {
		if (!target || key === 'custom') continue // custom은 이미 렌더링했으므로 건너뛰기
		renderTargetItem(target, false)
	}
}

// 개별 타겟 아이템 렌더링
function renderTargetItem(target, isCustom) {
	const container = elements.simulationContainer
	const targetItem = document.createElement('div')
	targetItem.className = 'target-item'
	targetItem.id = `target-${target.id}`

	const displayName = target.icon ? `${target.icon} ${target.name}` : target.name

	targetItem.innerHTML = `
		<div class="target-info">
			<span class="target-name">${displayName}</span>
			<span class="target-price">₩${target.price.toLocaleString()}</span>
		</div>
		<div class="progress-info">
			<div class="progress-bar">
				<div id="${target.id}Progress" class="progress-fill"></div>
			</div>
			<span id="${target.id}Percent" class="progress-text">0%</span>
		</div>
		<span id="${target.id}Required" class="required-price">목표가: ₩0</span>
	`

	container.appendChild(targetItem)
}

// 커스텀 목표 인라인 수정
function editCustomTargetInline(targetId) {
	const targetItem = document.getElementById(`target-${targetId}`)
	if (!targetItem || !targets.custom) return

	// 현재 값들
	const currentIcon = targets.custom.icon || '🎯'
	const currentName = targets.custom.name || ''
	const currentPrice = targets.custom.price || 1000000

	// 이모지 라디오 버튼 생성
	const emojiRadios = customEmojis
		.map(
			(emoji) =>
				`<label class="emoji-option ${emoji === currentIcon ? 'selected' : ''}">
			<input type="radio" name="customEmoji" value="${emoji}" ${emoji === currentIcon ? 'checked' : ''}>
			<span class="emoji-display">${emoji}</span>
		</label>`
		)
		.join('')

	// 수정 모드 HTML로 교체
	targetItem.innerHTML = `
		<div class="target-info editing">
			<div class="inline-edit-group">
				<div class="emoji-selector">
					<label class="form-label">아이콘 선택:</label>
					<div class="emoji-options">
						${emojiRadios}
					</div>
				</div>
				<div class="input-row">
					<input type="text" id="editTargetName" value="${currentName}" placeholder="목표 상품명" maxlength="20">
				</div>
				<div class="input-row">
					<input type="number" id="editTargetPrice" value="${currentPrice}" placeholder="목표 금액" min="1">
				</div>
			</div>
			<div class="inline-edit-buttons">
				<button class="btn-save-inline" id="saveCustomInline" title="저장">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<button class="btn-cancel-inline" id="cancelCustomInline" title="취소">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<button class="btn-delete-inline" id="deleteCustomInline" title="삭제">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>
		</div>
		<div class="progress-info">
			<div class="progress-bar">
				<div id="${targetId}Progress" class="progress-fill"></div>
			</div>
			<span id="${targetId}Percent" class="progress-text">0%</span>
		</div>
		<span id="${targetId}Required" class="required-price">목표가: ₩0</span>
	`

	// 이벤트 리스너 추가
	setupInlineEditListeners(targetId)

	// 첫 번째 입력 필드에 포커스
	document.getElementById('editTargetName').focus()
}

// 인라인 수정 이벤트 리스너 설정
function setupInlineEditListeners(targetId) {
	// 저장 버튼
	const saveBtn = document.getElementById('saveCustomInline')
	if (saveBtn) {
		saveBtn.addEventListener('click', () => saveCustomTargetInline(targetId))
	}

	// 취소 버튼
	const cancelBtn = document.getElementById('cancelCustomInline')
	if (cancelBtn) {
		cancelBtn.addEventListener('click', () => cancelCustomTargetInline(targetId))
	}

	// 삭제 버튼
	const deleteBtn = document.getElementById('deleteCustomInline')
	if (deleteBtn) {
		deleteBtn.addEventListener('click', () => removeCustomTarget())
	}

	// 이모지 라디오 버튼 시각적 효과
	const radioInputs = document.querySelectorAll('input[name="customEmoji"]')
	radioInputs.forEach((input) => {
		input.addEventListener('change', () => {
			// 모든 라벨에서 selected 클래스 제거
			document.querySelectorAll('.emoji-option').forEach((label) => {
				label.classList.remove('selected')
			})
			// 선택된 라벨에 selected 클래스 추가
			if (input.checked) {
				input.closest('.emoji-option').classList.add('selected')
			}
		})
	})
}

// 인라인 수정 저장
async function saveCustomTargetInline(targetId) {
	const nameInput = document.getElementById('editTargetName')
	const priceInput = document.getElementById('editTargetPrice')
	const selectedEmoji = document.querySelector('input[name="customEmoji"]:checked')

	if (!nameInput || !priceInput || !selectedEmoji) {
		alert('모든 항목을 입력해주세요.')
		return
	}

	const name = nameInput.value.trim()
	const price = parseInt(priceInput.value)
	const icon = selectedEmoji.value

	if (!name || !price || price <= 0) {
		alert('상품명과 올바른 금액을 입력해주세요.')
		return
	}

	targets.custom = {
		icon: icon,
		name: name,
		price: price,
		id: 'custom',
	}

	try {
		// Chrome storage에 저장
		await chrome.storage.local.set({ customTarget: targets.custom })
		console.log('커스텀 목표 수정 완료:', targets.custom)

		// UI 업데이트
		renderSimulation()
		updateHeaderButton()
		updateDisplay()

		showNotification(`커스텀 목표 "${name}" 수정 완료!`)
	} catch (error) {
		console.error('커스텀 목표 수정 실패:', error)
		alert('저장에 실패했습니다. 다시 시도해주세요.')
	}
}

// 인라인 수정 취소
function cancelCustomTargetInline(targetId) {
	// 수정 모드를 취소하고 원래 상태로 복원
	renderSimulation()
}

// 새로운 커스텀 목표 추가
function addCustomTargetNew() {
	if (targets.custom) {
		// 이미 커스텀 목표가 있으면 수정 모드로
		editCustomTargetInline('custom')
	} else {
		// 새로 추가하는 경우 - 임시 객체 생성
		targets.custom = {
			icon: '🎯',
			name: '새 목표',
			price: 1000000,
			id: 'custom',
		}

		// UI 업데이트 후 바로 수정 모드로
		renderSimulation()
		updateHeaderButton()
		editCustomTargetInline('custom')
	}
}

// 커스텀 목표 로드
async function loadCustomTarget() {
	try {
		const result = await chrome.storage.local.get(['customTarget'])
		if (result.customTarget) {
			targets.custom = result.customTarget
			console.log('커스텀 목표 로드 완료:', targets.custom)
		}
	} catch (error) {
		console.error('커스텀 목표 로드 실패:', error)
	}
}

// 커스텀 목표 제거
async function removeCustomTarget() {
	if (confirm('커스텀 목표를 삭제하시겠습니까?')) {
		targets.custom = null

		try {
			await chrome.storage.local.remove(['customTarget'])
			console.log('커스텀 목표 삭제 완료')

			// UI 업데이트
			renderSimulation()
			updateHeaderButton()
			updateDisplay()

			showNotification('커스텀 목표가 삭제되었습니다.')
		} catch (error) {
			console.error('커스텀 목표 삭제 실패:', error)
			alert('삭제에 실패했습니다. 다시 시도해주세요.')
		}
	}
}

// 헤더 버튼 상태 업데이트
function updateHeaderButton() {
	const button = elements.addCustomTarget
	if (!button) return

	if (targets.custom) {
		// 커스텀 목표가 있으면 수정 버튼으로 변경
		button.innerHTML = `
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`
		button.title = '목표 수정하기'
	} else {
		// 커스텀 목표가 없으면 추가 버튼으로 변경
		button.innerHTML = `
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`
		button.title = '내 목표 추가하기'
	}
}
