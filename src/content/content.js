// 함수 기반 위젯 시스템

// 목표 객체 (goal.util.js와 동일한 구조)
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
		price: 41990000,
		id: 'tesla',
	},
	custom: null, // 커스텀 목표 (사용자가 설정)
}

// 현재 목표 가져오기 (custom 우선, 없으면 tesla)
function getCurrentTarget() {
	if (targets.custom) {
		return targets.custom
	}
	return targets.tesla
}

// 위젯 상태 관리
const widgetData = {
	isVisible: false,
	widget: null,
	currentPrice: 0,
	userData: {
		rsuAmount: 135, // 기본값 설정
		avgPrice: 37150, // 기본값 설정
	},
	settings: {
		enableWidget: true,
		theme: 'light',
		enableNotifications: true, // 알림 활성화 여부(기본값 true, 실제 설정에 따라 변경됨)
	},
	notifiedTargets: {}, // 목표별 알림 여부 기록
	isMinimized: false, // 최소화 상태 저장
	widgetPosition: null, // 위젯 위치(left, top) 저장
}

// 위젯 HTML 생성
function createWidgetHTML() {
	const { currentPrice, userData } = widgetData
	const { rsuAmount = 135, avgPrice = 37150 } = userData
	const totalAsset = rsuAmount * currentPrice
	let profitRate = 0
	let profitColor = '#333333'
	if (avgPrice > 0 && currentPrice > 0) {
		profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
		profitColor = profitRate >= 0 ? '#28a745' : '#dc3545'
	}
	const currentTarget = getCurrentTarget()
	const targetPrice = currentTarget.price
	const progress = Math.min((totalAsset / targetPrice) * 100, 100)

	return `
        <div id="rsu-tracker-widget" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 250px;
            background: rgba(255,255,255,0.4);
            border: 1px solid rgba(233,236,239,0.5);
            border-radius: 12px;
            box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 999999;
            color: #333333;
            transition: all 0.3s ease;
        ">
            <div id="widget-header" style="
                padding: 12px 16px;
                border-bottom: 1px solid rgba(233,236,239,0.5);
                border-radius: 12px 12px 0 0;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="font-weight: 600; font-size: 14px; color: #333333;">🐜 영차영차 카카오</div>
                <div style="display: flex; gap: 6px;">
                    <button id="widget-minimize" style="
                        background: none;
                        border: 1px solid rgba(233,236,239,0.5);
                        color: #495057;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                    " title="최소화">−</button>
                    <button id="widget-close" style="
                        background: none;
                        border: 1px solid rgba(233,236,239,0.5);
                        color: #495057;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                    " title="닫기">×</button>
                </div>
            </div>
            <div id="widget-content" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #495057; font-size: 12px;">현재가</span>
                    <span id="widget-price" style="font-weight: 600; color: #333333;">₩${currentPrice.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #495057; font-size: 12px;">나의 RSU</span>
                    <span id="widget-asset" style="font-weight: 600; color: #28a745;">₩${totalAsset.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="color: #495057; font-size: 12px;">수익률</span>
                    <span id="widget-profit" style="font-weight: 600; color: ${profitColor};">${profitRate > 0 ? '+' : ''}${profitRate.toFixed(1)}%</span>
                </div>
                <div id="widget-progress-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(233,236,239,0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span id="widget-target-label" style="color: #495057; font-size: 12px;">🎯 목표까지</span>
                        <span id="widget-target-percent" style="font-size: 12px; font-weight: 600; color: #007bff;">${progress.toFixed(1)}%</span>
                    </div>
                    <div id="widget-progress-container" style="
                        background: #e9ecef; 
                        height: 8px; 
                        border-radius: 4px; 
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="widget-target-progress" style="
                            height: 100%;
                            background: #007bff;
                            width: ${progress}%;
                            transition: width 0.5s ease;
                            border-radius: 4px;
                        "></div>
                    </div>
                </div>
            </div>
            <div id="widget-minimized" style="
                display: none;
                padding: 8px 16px;
                background: #f8f9fa;
                border-radius: 12px;
                height: 30px;
                align-items: center;
                justify-content: space-between;
            ">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <div id="widget-target-emoji-mini" style="
                        font-size: 16px;
                        line-height: 1;
                        flex-shrink: 0;
                    ">🎯</div>
                    <div id="widget-progress-container-mini" style="
                        background: #e9ecef; 
                        height: 6px; 
                        border-radius: 3px; 
                        overflow: hidden;
                        position: relative;
                        flex: 1;
                        min-width: 100px;
                    ">
                        <div id="widget-target-progress-mini" style="
                            height: 100%;
                            background: #007bff;
                            width: ${progress}%;
                            transition: width 0.5s ease;
                            border-radius: 3px;
                        "></div>
                    </div>
                    <span id="widget-target-percent-mini" style="
                        font-size: 11px; 
                        font-weight: 600; 
                        color: #007bff;
                        min-width: 35px;
                        flex-shrink: 0;
                    ">${progress.toFixed(1)}%</span>
                </div>
                <button id="widget-maximize" style="
                    background: none;
                    border: none;
                    color: #495057;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 8px;
                " title="최대화">+</button>
            </div>
        </div>
    `
}

// 위젯 생성
function createWidget() {
	// 기존 위젯 제거
	const existingWidget = document.getElementById('rsu-tracker-widget')
	if (existingWidget) {
		existingWidget.remove()
	}

	// HTML 추가
	document.body.insertAdjacentHTML('beforeend', createWidgetHTML())

	widgetData.widget = document.getElementById('rsu-tracker-widget')

	// 위젯이 DOM에서 제거되지 않도록 보호
	if (widgetData.widget) {
		widgetData.widget.setAttribute('data-widget-protected', 'true')

		// 위젯이 제거되는 것을 감지하고 복원
		const widgetObserver = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.removedNodes.forEach(node => {
					if (
						node === widgetData.widget ||
						(node.nodeType === Node.ELEMENT_NODE &&
							node.querySelector &&
							node.querySelector('#rsu-tracker-widget'))
					) {
						// 위젯이 제거되었으면 복원
						if (widgetData.settings.enableWidget !== false) {
							setTimeout(() => {
								if (!document.getElementById('rsu-tracker-widget')) {
									createWidget()
								}
							}, 50)
						}
					}
				})
			})
		})

		widgetObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	}

	// 위치 복원
	chrome.storage.sync.get(['widgetPosition'], result => {
		if (result.widgetPosition && widgetData.widget) {
			widgetData.widget.style.left = result.widgetPosition.left
			widgetData.widget.style.top = result.widgetPosition.top
			widgetData.widget.style.right = 'auto'
			widgetData.widget.style.bottom = 'auto'
		}
	})

	// 이벤트 설정
	setupWidgetEvents()

	// 초기 업데이트
	updateWidgetContent()
	// 최소화 상태 복원
	chrome.storage.sync.get(['widgetMinimized'], result => {
		if (result.widgetMinimized) {
			minimizeWidget()
		} else {
			maximizeWidget()
		}
	})
}

// 위젯 이벤트 설정
function setupWidgetEvents() {
	const widget = widgetData.widget

	if (!widget) return

	// 닫기 버튼
	const closeBtn = widget.querySelector('#widget-close')
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			hideWidget()
			// 설정 업데이트
			chrome.storage.sync.get(['settings'], result => {
				const settings = result.settings || {}
				settings.enableWidget = false
				chrome.storage.sync.set({ settings })
			})
		})
	}

	// 최소화 버튼
	const minimizeBtn = widget.querySelector('#widget-minimize')
	const maximizeBtn = widget.querySelector('#widget-maximize')
	const content = widget.querySelector('#widget-content')
	const minimized = widget.querySelector('#widget-minimized')
	const header = widget.querySelector('#widget-header')

	if (minimizeBtn && content && minimized && header) {
		minimizeBtn.addEventListener('click', () => {
			minimizeWidget()
		})
	}

	// 최대화 버튼
	if (maximizeBtn && content && minimized && header) {
		maximizeBtn.addEventListener('click', () => {
			maximizeWidget()
		})
	}

	// 드래그 기능
	setupDragEvents()
}

// 드래그 기능
function setupDragEvents() {
	const widget = widgetData.widget
	const header = widget.querySelector('#widget-header')
	const minimized = widget.querySelector('#widget-minimized')

	let isDragging = false
	const dragOffset = { x: 0, y: 0 }

	// 일반 헤더 드래그
	if (header) {
		header.addEventListener('mousedown', e => {
			if (e.target.tagName === 'BUTTON') return // 버튼 클릭은 제외

			isDragging = true
			const rect = widget.getBoundingClientRect()
			dragOffset.x = e.clientX - rect.left
			dragOffset.y = e.clientY - rect.top
			e.preventDefault()
		})
	}

	// 최소화 모드 드래그
	if (minimized) {
		minimized.addEventListener('mousedown', e => {
			if (e.target.tagName === 'BUTTON') return // 버튼 클릭은 제외

			isDragging = true
			const rect = widget.getBoundingClientRect()
			dragOffset.x = e.clientX - rect.left
			dragOffset.y = e.clientY - rect.top
			e.preventDefault()
		})
	}

	document.addEventListener('mousemove', e => {
		if (!isDragging) return

		const x = e.clientX - dragOffset.x
		const y = e.clientY - dragOffset.y

		const maxX = window.innerWidth - widget.offsetWidth
		const maxY = window.innerHeight - widget.offsetHeight

		widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px'
		widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px'
		widget.style.right = 'auto'
		widget.style.bottom = 'auto'
	})

	document.addEventListener('mouseup', () => {
		if (isDragging && widget) {
			// 위치 저장
			chrome.storage.sync.set({
				widgetPosition: {
					left: widget.style.left,
					top: widget.style.top,
				},
			})
		}
		isDragging = false
	})
}

// 프로그레스바 및 이모지 위치 업데이트
function updateProgressBars() {
	const widget = widgetData.widget
	if (!widget) return

	const { currentPrice, userData } = widgetData
	const { rsuAmount = 0 } = userData
	const totalAsset = rsuAmount * currentPrice

	// 현재 목표 가져오기
	const currentTarget = getCurrentTarget()
	const targetPrice = currentTarget.price
	const progress = Math.min((totalAsset / targetPrice) * 100, 100)

	// 확장 모드: 목표 라벨에 이모지 포함
	const targetLabel = widget.querySelector('#widget-target-label')
	if (targetLabel) {
		const emoji = currentTarget.icon || '🎯'
		const name = currentTarget.name || '목표'
		targetLabel.textContent = `${emoji} ${name}까지`
	}

	// 일반 모드 프로그레스바 (이모지 제거)
	const progressFill = widget.querySelector('#widget-target-progress')
	const progressText = widget.querySelector('#widget-target-percent')

	if (progressFill) {
		progressFill.style.width = `${progress}%`
	}

	if (progressText) {
		progressText.textContent = `${progress.toFixed(1)}%`
	}

	// 최소화 모드: 프로그레스바 왼쪽에 이모지 표시
	const progressFillMini = widget.querySelector('#widget-target-progress-mini')
	const progressTextMini = widget.querySelector('#widget-target-percent-mini')
	const progressEmojiMini = widget.querySelector('#widget-target-emoji-mini')

	if (progressFillMini) {
		progressFillMini.style.width = `${progress}%`
	}

	if (progressTextMini) {
		progressTextMini.textContent = `${progress.toFixed(1)}%`
	}

	if (progressEmojiMini) {
		// 현재 목표의 아이콘 사용 (크기 16px로 증가)
		progressEmojiMini.textContent = currentTarget.icon || '🎯'
	}
}

// 위젯 내용 업데이트
function updateWidgetContent() {
	const widget = widgetData.widget
	if (!widget || !widgetData.isVisible) return

	const { currentPrice, userData } = widgetData
	const { rsuAmount = 0, avgPrice = 0 } = userData

	// 현재가
	const priceElement = widget.querySelector('#widget-price')
	if (priceElement) {
		priceElement.textContent = `₩${currentPrice.toLocaleString()}`
		priceElement.style.color = '#333333' // 요청에 따라 검정색으로 변경
	}

	// 총 자산
	const totalAsset = rsuAmount * currentPrice
	const assetElement = widget.querySelector('#widget-asset')
	if (assetElement) {
		assetElement.textContent = `₩${totalAsset.toLocaleString()}`
	}

	// 수익률
	const profitElement = widget.querySelector('#widget-profit')
	if (profitElement && avgPrice > 0) {
		const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
		profitElement.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(1)}%`
		profitElement.style.color = profitRate >= 0 ? '#28a745' : '#dc3545'
	}

	// 프로그레스바 업데이트
	updateProgressBars()
	// 목표 달성 알림 체크
	checkTargetAchievement()
}

// 위젯 표시
function showWidget() {
	if (!widgetData.widget) {
		createWidget()
	}
	if (widgetData.widget) {
		widgetData.widget.style.display = 'block'
		widgetData.isVisible = true
		updateWidgetContent()
	}
}

// 위젯 숨기기
function hideWidget() {
	if (widgetData.widget) {
		widgetData.widget.style.display = 'none'
		widgetData.isVisible = false
	}
}

// 위젯 제거
function removeWidget() {
	if (widgetData.widget) {
		widgetData.widget.remove()
		widgetData.widget = null
		widgetData.isVisible = false
	}
}

// 데이터 업데이트
function updateWidgetData(data) {
	if (data.price !== undefined) {
		widgetData.currentPrice = data.price
	}
	if (data.userData) {
		widgetData.userData = { ...widgetData.userData, ...data.userData }
	}
	if (data.settings) {
		widgetData.settings = { ...widgetData.settings, ...data.settings }
	}

	updateWidgetContent()
}

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.action) {
		case 'updateWidget':
			updateWidgetData(request)
			if (!widgetData.widget && widgetData.settings.enableWidget !== false) {
				showWidget()
			}
			break
		case 'showWidget':
			showWidget()
			break
		case 'hideWidget':
			hideWidget()
			break
		case 'removeWidget':
			removeWidget()
			break
	}
})

// 스토리지 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === 'sync' || namespace === 'local') {
		if (changes.settings) {
			const newSettings = changes.settings.newValue || {}
			widgetData.settings = { ...widgetData.settings, ...newSettings }

			if (newSettings.enableWidget === false) {
				hideWidget()
			} else if (newSettings.enableWidget === true) {
				showWidget()
			}
		}

		if (changes.userData) {
			widgetData.userData = { ...widgetData.userData, ...changes.userData.newValue }
			updateWidgetContent()
		}

		// 커스텀 목표 변경 감지
		if (changes.customTarget) {
			targets.custom = changes.customTarget.newValue
			updateWidgetContent()
		}

		// 가격 데이터 변경 감지
		if (changes.priceData) {
			const newPriceData = changes.priceData.newValue || {}
			if (newPriceData.currentPrice) {
				widgetData.currentPrice = newPriceData.currentPrice
				updateWidgetContent()
			}
		}
	}
})

// 초기화
async function initializeWidget() {
	try {
		// 설정 및 데이터 로드
		const result = await chrome.storage.sync.get(['settings', 'userData', 'priceData'])
		const localResult = await chrome.storage.local.get(['customTarget', 'lastPrice'])

		// 설정 로드
		widgetData.settings = result.settings || { enableWidget: true }

		// 사용자 데이터 로드 (기본값 유지)
		widgetData.userData = {
			rsuAmount: 135, // 기본값
			avgPrice: 37150, // 기본값
			...result.userData, // 저장된 값으로 덮어쓰기
		}

		// 커스텀 목표 로드
		if (localResult.customTarget) {
			targets.custom = localResult.customTarget
		}

		// 저장된 마지막 가격 로드
		if (result.priceData.currentPrice) {
			widgetData.currentPrice = result.priceData.currentPrice
		}

		// 위젯 표시 설정이 활성화되어 있으면 위젯 생성
		if (widgetData.settings.enableWidget !== false) {
			updateWidgetContent()
			showWidget()
		}
	} catch (error) {
		console.error('위젯 초기화 실패:', error)
		// 오류가 있어도 기본값으로 위젯 표시
		if (widgetData.settings.enableWidget !== false) {
			showWidget()
		}
	}
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeWidget)
} else {
	initializeWidget()
}

// 탭 visibility 변화 감지 (위젯 유지)
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') {
		// 탭이 다시 보일 때 위젯 상태 복원
		if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
			showWidget()
		}
		// 위젯이 있지만 숨겨져 있다면 다시 표시
		if (widgetData.widget && widgetData.isVisible) {
			widgetData.widget.style.display = 'block'
		}
	}
})

// 페이지 포커스 시 위젯 상태 확인
window.addEventListener('focus', () => {
	if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
		showWidget()
	}
})

// SPA 페이지 이동 감지 (위젯 유지)
let currentUrl = window.location.href

// URL 변경 감지
const observer = new MutationObserver(() => {
	if (window.location.href !== currentUrl) {
		currentUrl = window.location.href
		// URL이 변경되어도 위젯 유지
		if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
			setTimeout(() => {
				showWidget()
			}, 100)
		}
	}
})

// DOM 변경 감지 시작
observer.observe(document.body, {
	childList: true,
	subtree: true,
})

// popstate 이벤트 (브라우저 뒤로가기/앞으로가기)
window.addEventListener('popstate', () => {
	setTimeout(() => {
		if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
			showWidget()
		}
	}, 100)
})

// pushstate/replacestate 이벤트 감지 (SPA 라우팅)
const originalPushState = history.pushState
const originalReplaceState = history.replaceState

history.pushState = function (...args) {
	originalPushState.apply(history, args)
	setTimeout(() => {
		if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
			showWidget()
		}
	}, 100)
}

history.replaceState = function (...args) {
	originalReplaceState.apply(history, args)
	setTimeout(() => {
		if (widgetData.settings.enableWidget !== false && !widgetData.widget) {
			showWidget()
		}
	}, 100)
}

// 주기적으로 위젯 상태 확인 (30초마다)
setInterval(() => {
	if (document.visibilityState === 'visible' && widgetData.settings.enableWidget !== false) {
		if (!widgetData.widget) {
			showWidget()
		} else if (widgetData.isVisible && widgetData.widget.style.display === 'none') {
			widgetData.widget.style.display = 'block'
		}
	}
}, 30000) // 30초마다

// 목표 달성 알림 체크 함수
function checkTargetAchievement() {
	if (!widgetData.settings.enableNotifications) return
	const { currentPrice, userData } = widgetData
	const { rsuAmount = 0 } = userData
	const totalAsset = rsuAmount * currentPrice
	// 모든 목표에 대해 체크
	Object.values(targets).forEach(target => {
		if (!target || !target.price || !target.name) return
		const progress = (totalAsset / target.price) * 100
		if (progress >= 100 && !widgetData.notifiedTargets[target.id]) {
			// background.js로 알림 요청 메시지 전송
			chrome.runtime.sendMessage({
				action: 'notifyTargetAchieved',
				target: {
					id: target.id,
					name: target.name,
					icon: target.icon,
				},
			})
			widgetData.notifiedTargets[target.id] = true
		}
		// 100% 미만으로 떨어지면 다시 알림 가능하도록 초기화
		if (progress < 100) {
			widgetData.notifiedTargets[target.id] = false
		}
	})
}

// 최소화/최대화 함수 분리
function minimizeWidget() {
	const widget = widgetData.widget
	if (!widget) return
	const content = widget.querySelector('#widget-content')
	const minimized = widget.querySelector('#widget-minimized')
	const header = widget.querySelector('#widget-header')
	if (content && minimized && header) {
		content.style.display = 'none'
		header.style.display = 'none'
		minimized.style.display = 'flex'
		widget.style.height = '30px'
		widgetData.isMinimized = true
		chrome.storage.sync.set({ widgetMinimized: true })
		updateProgressBars()
	}
}

function maximizeWidget() {
	const widget = widgetData.widget
	if (!widget) return
	const content = widget.querySelector('#widget-content')
	const minimized = widget.querySelector('#widget-minimized')
	const header = widget.querySelector('#widget-header')
	if (content && minimized && header) {
		content.style.display = 'block'
		header.style.display = 'flex'
		minimized.style.display = 'none'
		widget.style.height = 'auto'
		widgetData.isMinimized = false
		chrome.storage.sync.set({ widgetMinimized: false })
	}
}
