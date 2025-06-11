// 컨텐츠 스크립트 - 위젯 주입 및 관리

// 위젯 인스턴스
let rsuWidget = null
let currentData = {
	price: 0,
	userData: {},
	settings: {},
}

// 위젯 스크립트 로드
async function loadWidgetScript() {
	try {
		const script = document.createElement('script')
		script.src = chrome.runtime.getURL('src/widget/widget.js')
		script.onload = () => initializeWidget()
		script.onerror = () => console.error('위젯 스크립트 로드 실패')
		document.head.appendChild(script)
	} catch (error) {
		console.error('위젯 스크립트 로드 중 오류:', error)
	}
}

// 위젯 초기화
async function initializeWidget() {
	try {
		// 기존 위젯이 있으면 제거
		const existingWidget = document.getElementById('rsu-tracker-widget')
		if (existingWidget) {
			existingWidget.remove()
		}
		
		// 설정 로드
		const result = await chrome.storage.sync.get(['settings', 'userData'])
		currentData.settings = result.settings || { enableWidget: true }
		currentData.userData = result.userData || {}

		// 위젯 표시 설정이 활성화되어 있으면 위젯 생성
		const shouldShowWidget = currentData.settings.enableWidget !== false
		
		if (shouldShowWidget) {
			// RSUWidget 클래스가 로드될 때까지 대기
			if (typeof RSUWidget !== 'undefined') {
				rsuWidget = new RSUWidget()
				await rsuWidget.create()
				
				// 초기 데이터 설정 (테마 포함)
				rsuWidget.updateData(currentData)
				
				// 테마가 있으면 명시적으로 설정
				if (currentData.settings && currentData.settings.theme) {
					rsuWidget.setTheme(currentData.settings.theme)
				}
			}
		}

		// 백그라운드에서 현재 가격 요청
		chrome.runtime.sendMessage({ action: 'getCurrentPrice' }, (response) => {
			if (response && response.price) {
				currentData.price = response.price
				if (rsuWidget) {
					rsuWidget.updateData({ price: currentData.price })
				}
			}
		})
	} catch (error) {
		console.error('위젯 초기화 실패:', error)
	}
}

// 위젯 표시
function showWidget() {
	if (!rsuWidget) {
		if (typeof RSUWidget !== 'undefined') {
			rsuWidget = new RSUWidget()
			rsuWidget.create().then(() => {
				// 초기 데이터와 테마 설정
				rsuWidget.updateData(currentData)
			})
		}
	} else {
		rsuWidget.show()
	}
}

// 위젯 숨기기
function hideWidget() {
	if (rsuWidget) {
		rsuWidget.hide()
	}
}

// 위젯 제거
function removeWidget() {
	if (rsuWidget) {
		rsuWidget.remove()
		rsuWidget = null
	}
}

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.action) {
		case 'updateWidget':
			// 데이터 업데이트
			if (request.price !== undefined) {
				currentData.price = request.price
			}
			if (request.userData) {
				currentData.userData = request.userData
			}
			if (request.settings) {
				currentData.settings = request.settings
			}
			
			// 위젯이 없으면 생성
			if (!rsuWidget && currentData.settings.enableWidget !== false) {
				showWidget()
			} else if (rsuWidget) {
				// 위젯 내용 업데이트 (테마 포함)
				rsuWidget.updateData(currentData)
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
	if (namespace === 'sync') {
		if (changes.settings) {
			const newSettings = changes.settings.newValue || {}
			currentData.settings = newSettings

			// 위젯 표시 설정 변경 처리
			if (newSettings.enableWidget === false) {
				hideWidget()
			} else if (newSettings.enableWidget === true) {
				showWidget()
			}

			// 테마 변경 처리
			if (rsuWidget && newSettings.theme) {
				rsuWidget.setTheme(newSettings.theme)
				// 전체 데이터도 함께 업데이트
				rsuWidget.updateData({ settings: newSettings })
			} else if (rsuWidget) {
				rsuWidget.updateData({ settings: newSettings })
			}
		}

		if (changes.userData) {
			currentData.userData = changes.userData.newValue || {}
			if (rsuWidget) {
				rsuWidget.updateData({ userData: currentData.userData })
			}
		}
	}
})

// 페이지 이벤트
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible' && rsuWidget && rsuWidget.isVisible) {
		// 페이지가 다시 보이면 데이터 업데이트 요청
		chrome.runtime.sendMessage({ action: 'getCurrentPrice' }, (response) => {
			if (response && response.price) {
				currentData.price = response.price
				rsuWidget.updateData({ price: currentData.price })
			}
		})
	}
})

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
	removeWidget()
})



// 초기화 실행
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', loadWidgetScript)
} else {
	setTimeout(loadWidgetScript, 100)
}
