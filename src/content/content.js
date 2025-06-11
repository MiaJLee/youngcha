// 컨텐츠 스크립트 - 위젯 주입 및 관리
console.log('영차영차 Content Script 로드됨')

// 전역 변수
let widget = null
let isWidgetVisible = false
let currentData = {
	price: 0,
	userData: {},
	settings: {},
}

// 위젯이 이미 존재하는지 확인
if (document.getElementById('rsu-tracker-widget')) {
	console.log('위젯이 이미 존재함')
} else {
	// 초기화
	initialize()
}

async function initialize() {
	try {
		// 설정 로드
		const result = await chrome.storage.sync.get(['settings', 'userData'])
		currentData.settings = result.settings || {}
		currentData.userData = result.userData || {}

		// 위젯 표시 설정이 활성화되어 있으면 위젯 생성
		if (currentData.settings.enableWidget !== false) {
			createWidget()
		}

		// 백그라운드에서 현재 가격 요청
		chrome.runtime.sendMessage({ action: 'getCurrentPrice' }, (response) => {
			if (response && response.price) {
				currentData.price = response.price
				updateWidgetContent()
			}
		})
	} catch (error) {
		console.error('위젯 초기화 실패:', error)
	}
}

// 위젯 생성
function createWidget() {
	if (widget) return

	// 위젯 컨테이너 생성
	widget = document.createElement('div')
	widget.id = 'rsu-tracker-widget'
	widget.innerHTML = getWidgetHTML()

	// 스타일 적용
	const style = document.createElement('style')
	style.textContent = getWidgetCSS()
	document.head.appendChild(style)

	// DOM에 추가
	document.body.appendChild(widget)

	// 이벤트 리스너 추가
	setupWidgetEvents()

	isWidgetVisible = true
	console.log('위젯 생성됨')
}

// 위젯 HTML
function getWidgetHTML() {
	return `
        <div class="rsu-widget-container">
            <div class="rsu-widget-header">
                <span class="rsu-widget-title">📈 RSU</span>
                <div class="rsu-widget-controls">
                    <button class="rsu-widget-minimize" title="최소화">−</button>
                    <button class="rsu-widget-close" title="닫기">×</button>
                </div>
            </div>
            <div class="rsu-widget-content">
                <div class="rsu-widget-row">
                    <span class="rsu-widget-label">현재가:</span>
                    <span class="rsu-widget-value" id="widget-price">₩0</span>
                </div>
                <div class="rsu-widget-row">
                    <span class="rsu-widget-label">총 자산:</span>
                    <span class="rsu-widget-value highlight" id="widget-asset">₩0</span>
                </div>
                <div class="rsu-widget-row">
                    <span class="rsu-widget-label">수익률:</span>
                    <span class="rsu-widget-value" id="widget-profit">0%</span>
                </div>
                <div class="rsu-widget-progress">
                    <div class="rsu-widget-progress-label">🏎 테슬라까지</div>
                    <div class="rsu-widget-progress-bar">
                        <div class="rsu-widget-progress-fill" id="widget-tesla-progress"></div>
                    </div>
                    <div class="rsu-widget-progress-text" id="widget-tesla-percent">0%</div>
                </div>
            </div>
        </div>
    `
}

// 위젯 CSS
function getWidgetCSS() {
	return `
        #rsu-tracker-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            user-select: none;
            pointer-events: auto;
        }
        
        .rsu-widget-container {
            background: #ffffff;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            width: 250px;
            overflow: hidden;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .rsu-widget-container:hover {
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
            transform: translateY(-2px);
        }
        
        .rsu-widget-header {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }
        
        .rsu-widget-title {
            font-weight: 600;
            font-size: 13px;
        }
        
        .rsu-widget-controls {
            display: flex;
            gap: 4px;
        }
        
        .rsu-widget-minimize,
        .rsu-widget-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .rsu-widget-minimize:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .rsu-widget-close:hover {
            background-color: rgba(255, 0, 0, 0.3);
        }
        
        .rsu-widget-content {
            padding: 12px;
            background: #ffffff;
        }
        
        .rsu-widget-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            padding: 2px 0;
        }
        
        .rsu-widget-label {
            color: #666;
            font-size: 11px;
        }
        
        .rsu-widget-value {
            font-weight: 600;
            font-size: 11px;
            color: #333;
        }
        
        .rsu-widget-value.highlight {
            color: #007bff;
            font-size: 12px;
        }
        
        .rsu-widget-value.positive {
            color: #28a745;
        }
        
        .rsu-widget-value.negative {
            color: #dc3545;
        }
        
        .rsu-widget-progress {
            margin-top: 8px;
            padding: 6px 0;
            border-top: 1px solid #f0f0f0;
        }
        
        .rsu-widget-progress-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 4px;
        }
        
        .rsu-widget-progress-bar {
            background: #e9ecef;
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 2px;
        }
        
        .rsu-widget-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007bff, #28a745);
            transition: width 0.5s ease;
            border-radius: 3px;
        }
        
        .rsu-widget-progress-text {
            font-size: 10px;
            color: #007bff;
            font-weight: 600;
            text-align: right;
        }
        
        /* 다크 테마 지원 */
        @media (prefers-color-scheme: dark) {
            .rsu-widget-container {
                background: #2d2d2d;
                border-color: #404040;
            }
            
            .rsu-widget-content {
                background: #2d2d2d;
            }
            
            .rsu-widget-value {
                color: #ffffff;
            }
            
            .rsu-widget-label {
                color: #cccccc;
            }
            
            .rsu-widget-progress {
                border-top-color: #404040;
            }
            
            .rsu-widget-progress-label {
                color: #cccccc;
            }
        }
        
        /* 최소화 상태 */
        .rsu-widget-container.minimized .rsu-widget-content {
            display: none;
        }
        
        .rsu-widget-container.minimized {
            width: auto;
        }
        
        /* 애니메이션 */
        .rsu-widget-container {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* 드래그 가능 */
        .rsu-widget-container.dragging {
            cursor: grabbing;
            transform: rotate(5deg);
        }
    `
}

// 위젯 이벤트 설정
function setupWidgetEvents() {
	if (!widget) return

	// 닫기 버튼
	const closeBtn = widget.querySelector('.rsu-widget-close')
	closeBtn.addEventListener('click', () => {
		hideWidget()
		// 설정도 업데이트
		chrome.storage.sync.get(['settings'], (result) => {
			const settings = result.settings || {}
			settings.enableWidget = false
			chrome.storage.sync.set({ settings })
		})
	})

	// 최소화 버튼
	const minimizeBtn = widget.querySelector('.rsu-widget-minimize')
	minimizeBtn.addEventListener('click', () => {
		widget.querySelector('.rsu-widget-container').classList.toggle('minimized')
	})

	// 드래그 기능
	let isDragging = false
	let dragOffset = { x: 0, y: 0 }

	const header = widget.querySelector('.rsu-widget-header')
	const container = widget.querySelector('.rsu-widget-container')

	header.addEventListener('mousedown', (e) => {
		isDragging = true
		container.classList.add('dragging')

		const rect = widget.getBoundingClientRect()
		dragOffset.x = e.clientX - rect.left
		dragOffset.y = e.clientY - rect.top

		e.preventDefault()
	})

	document.addEventListener('mousemove', (e) => {
		if (!isDragging) return

		const x = e.clientX - dragOffset.x
		const y = e.clientY - dragOffset.y

		// 화면 경계 체크
		const maxX = window.innerWidth - widget.offsetWidth
		const maxY = window.innerHeight - widget.offsetHeight

		widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px'
		widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px'
		widget.style.right = 'auto'
		widget.style.bottom = 'auto'
	})

	document.addEventListener('mouseup', () => {
		if (isDragging) {
			isDragging = false
			container.classList.remove('dragging')
		}
	})

	// 더블클릭으로 위치 리셋
	header.addEventListener('dblclick', () => {
		widget.style.right = '20px'
		widget.style.bottom = '20px'
		widget.style.left = 'auto'
		widget.style.top = 'auto'
	})
}

// 위젯 내용 업데이트
function updateWidgetContent() {
	if (!widget || !isWidgetVisible) return

	const rsuAmount = currentData.userData.rsuAmount || 0
	const avgPrice = currentData.userData.avgPrice || 0
	const currentPrice = currentData.price || 0

	// 현재가 업데이트
	const priceElement = widget.querySelector('#widget-price')
	if (priceElement) {
		priceElement.textContent = `₩${currentPrice.toLocaleString()}`
	}

	// 총 자산 계산
	const totalAsset = rsuAmount * currentPrice
	const assetElement = widget.querySelector('#widget-asset')
	if (assetElement) {
		assetElement.textContent = `₩${totalAsset.toLocaleString()}`
	}

	// 수익률 계산
	const profitElement = widget.querySelector('#widget-profit')
	if (profitElement && avgPrice > 0) {
		const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
		profitElement.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(1)}%`
		profitElement.className = `rsu-widget-value ${profitRate >= 0 ? 'positive' : 'negative'}`
	}

	// 테슬라 진행률
	const teslaProgressElement = widget.querySelector('#widget-tesla-progress')
	const teslaPercentElement = widget.querySelector('#widget-tesla-percent')
	if (teslaProgressElement && teslaPercentElement) {
		const teslaTarget = 60000000 // 테슬라 목표 가격
		const teslaProgress = Math.min((totalAsset / teslaTarget) * 100, 100)

		teslaProgressElement.style.width = `${teslaProgress}%`
		teslaPercentElement.textContent = `${teslaProgress.toFixed(1)}%`
	}
}

// 위젯 표시
function showWidget() {
	if (!widget) {
		createWidget()
	} else {
		widget.style.display = 'block'
		isWidgetVisible = true
	}
	updateWidgetContent()
}

// 위젯 숨기기
function hideWidget() {
	if (widget) {
		widget.style.display = 'none'
		isWidgetVisible = false
	}
}

// 위젯 제거
function removeWidget() {
	if (widget) {
		widget.remove()
		widget = null
		isWidgetVisible = false
	}
}

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log('Content Script 메시지 수신:', request)

	switch (request.action) {
		case 'updateWidget':
			currentData.price = request.price
			currentData.userData = request.userData || {}
			currentData.settings = request.settings || {}
			updateWidgetContent()
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
	if (namespace === 'sync') {
		if (changes.settings) {
			currentData.settings = changes.settings.newValue || {}

			// 위젯 표시 설정 변경 처리
			if (changes.settings.newValue.enableWidget === false) {
				hideWidget()
			} else if (changes.settings.newValue.enableWidget === true) {
				showWidget()
			}
		}

		if (changes.userData) {
			currentData.userData = changes.userData.newValue || {}
			updateWidgetContent()
		}
	}
})

// 페이지 이벤트
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible' && isWidgetVisible) {
		// 페이지가 다시 보이면 데이터 업데이트 요청
		chrome.runtime.sendMessage({ action: 'getCurrentPrice' }, (response) => {
			if (response && response.price) {
				currentData.price = response.price
				updateWidgetContent()
			}
		})
	}
})

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
	removeWidget()
})
