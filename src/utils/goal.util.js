/**
 * 목표 설정 및 보상 시뮬레이션 관련 유틸리티 함수들
 * ES6 모듈로 export하여 다른 스크립트에서 import 가능
 */

// 목표 상품 정의
export const targets = {
	flight: {
		icon: '🛩',
		name: '유럽 왕복 일등석 항공권',
		price: 12000000,
		id: 'flight',
	},
	tesla: {
		icon: '🏎',
		name: '테슬라 Model 3',
		price: 51990000,
		id: 'tesla',
	},
	custom: null, // 커스텀 목표 (사용자가 설정)
}

// 커스텀 목표 이모지 선택 옵션
export const customEmojis = ['⛱️', '⭐', '🎁', '🏆', '💎']

/**
 * 현재 목표 가져오기 (custom 우선, 없으면 tesla)
 * @returns {Object} 현재 목표 객체
 */
export function getCurrentTarget() {
	if (targets.custom) {
		return targets.custom;
	}
	return targets.tesla;
}

/**
 * 보상 시뮬레이션 업데이트
 * @param {number} totalAsset - 총 자산
 * @param {number} rsuAmount - RSU 수량
 */
export function updateSimulation(totalAsset, rsuAmount) {
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

/**
 * 시뮬레이션 동적 렌더링
 */
export function renderSimulation() {
	const simulationContainer = document.getElementById('simulationContainer')
	if (!simulationContainer) return

	simulationContainer.innerHTML = ''

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

/**
 * 개별 타겟 아이템 렌더링
 * @param {Object} target - 목표 객체
 * @param {boolean} isCustom - 커스텀 목표 여부
 */
export function renderTargetItem(target, isCustom) {
	const simulationContainer = document.getElementById('simulationContainer')
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

	simulationContainer.appendChild(targetItem)
}

/**
 * 커스텀 목표 인라인 수정
 * @param {string} targetId - 타겟 ID
 */
export function editCustomTargetInline(targetId) {
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

/**
 * 인라인 수정 이벤트 리스너 설정
 * @param {string} targetId - 타겟 ID
 */
export function setupInlineEditListeners(targetId) {
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
	radioInputs.forEach(input => {
		input.addEventListener('change', () => {
			// 모든 라벨에서 selected 클래스 제거
			document.querySelectorAll('.emoji-option').forEach(label => {
				label.classList.remove('selected')
			})
			// 선택된 라벨에 selected 클래스 추가
			if (input.checked) {
				input.closest('.emoji-option').classList.add('selected')
			}
		})
	})
}

/**
 * 인라인 수정 저장
 * @param {string} targetId - 타겟 ID
 */
export async function saveCustomTargetInline(targetId) {
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
		id: 'custom'
	}

	try {
		// Chrome storage에 저장
		await chrome.storage.local.set({ customTarget: targets.custom })

		// UI 업데이트
		renderSimulation()
		updateHeaderButton()
		
		// 외부 함수 호출 (popup.js에서 전달받아야 함)
		if (window.goalUpdateCallback) {
			window.goalUpdateCallback()
		}

		// 알림 표시
		if (window.showNotification) {
			window.showNotification(`커스텀 목표 "${name}" 수정 완료!`)
		}
	} catch (error) {
		console.error('커스텀 목표 수정 실패:', error)
		alert('저장에 실패했습니다. 다시 시도해주세요.')
	}
}

/**
 * 인라인 수정 취소
 * @param {string} targetId - 타겟 ID
 */
export function cancelCustomTargetInline(targetId) {
	// 수정 모드를 취소하고 원래 상태로 복원
	renderSimulation()
}

/**
 * 새로운 커스텀 목표 추가
 */
export function addCustomTargetNew() {
	if (targets.custom) {
		// 이미 커스텀 목표가 있으면 수정 모드로
		editCustomTargetInline('custom')
	} else {
		// 새로 추가하는 경우 - 임시 객체 생성
		targets.custom = {
			icon: '🎯',
			name: '새 목표',
			price: 1000000,
			id: 'custom'
		}

		// UI 업데이트 후 바로 수정 모드로
		renderSimulation()
		updateHeaderButton()
		editCustomTargetInline('custom')
	}
}

/**
 * 커스텀 목표 로드
 */
export async function loadCustomTarget() {
	try {
		const result = await chrome.storage.local.get(['customTarget'])
		if (result.customTarget) {
			targets.custom = result.customTarget
		}
	} catch (error) {
		console.error('커스텀 목표 로드 실패:', error)
	}
}

/**
 * 커스텀 목표 제거
 */
export async function removeCustomTarget() {
	if (confirm('커스텀 목표를 삭제하시겠습니까?')) {
		targets.custom = null

		try {
			await chrome.storage.local.remove(['customTarget'])

			// UI 업데이트
			renderSimulation()
			updateHeaderButton()
			
			// 외부 함수 호출
			if (window.goalUpdateCallback) {
				window.goalUpdateCallback()
			}

			// 알림 표시
			if (window.showNotification) {
				window.showNotification('커스텀 목표가 삭제되었습니다.')
			}
		} catch (error) {
			console.error('커스텀 목표 삭제 실패:', error)
			alert('삭제에 실패했습니다. 다시 시도해주세요.')
		}
	}
}

/**
 * 헤더 버튼 상태 업데이트
 */
export function updateHeaderButton() {
	const button = document.getElementById('addCustomTarget')
	if (!button) return

	if (targets.custom) {
		// 커스텀 목표가 있으면 수정 버튼으로 변경 ("지금 카카오 주식은?" 섹션과 동일한 아이콘)
		button.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M18.5 2.50005C18.8978 2.10223 19.4374 1.87873 20 1.87873C20.5626 1.87873 21.1022 2.10223 21.5 2.50005C21.8978 2.89787 22.1213 3.43745 22.1213 4.00005C22.1213 4.56266 21.8978 5.10223 21.5 5.50005L12 15L8 16L9 12L18.5 2.50005Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`
		button.title = "목표 수정하기"
	} else {
		// 커스텀 목표가 없으면 추가 버튼으로 변경
		button.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`
		button.title = "내 목표 추가하기"
	}
} 