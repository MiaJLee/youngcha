// RSU 계산 테스트 스크립트
// 콘솔에서 실행하여 계산 로직 확인

function testRSUCalculation() {
	// 테스트 데이터
	const rsuAmount = 135 // 주
	const avgPrice = 37150 // 원
	const currentPrice = 98000 // 원 (예시)

	console.log('=== RSU 자산 계산 테스트 ===')
	console.log(`RSU 보유량: ${rsuAmount}주`)
	console.log(`평균 매입가: ₩${avgPrice.toLocaleString()}`)
	console.log(`현재 주가: ₩${currentPrice.toLocaleString()}`)
	console.log('')

	// 총 자산 계산
	const totalAsset = rsuAmount * currentPrice
	console.log(
		`총 자산: ${rsuAmount} × ₩${currentPrice.toLocaleString()} = ₩${totalAsset.toLocaleString()}`
	)

	// 수익률 계산
	const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
	const profitAmount = rsuAmount * (currentPrice - avgPrice)

	console.log(
		`수익률: ((₩${currentPrice.toLocaleString()} - ₩${avgPrice.toLocaleString()}) / ₩${avgPrice.toLocaleString()}) × 100 = ${profitRate.toFixed(
			2
		)}%`
	)
	console.log(
		`수익금: ${rsuAmount} × (₩${currentPrice.toLocaleString()} - ₩${avgPrice.toLocaleString()}) = ₩${profitAmount.toLocaleString()}`
	)

	// 목표 계산
	const teslaTarget = 60000000
	const iphoneTarget = 1550000

	const teslaProgress = (totalAsset / teslaTarget) * 100
	const teslaRequired = Math.ceil(teslaTarget / rsuAmount)

	const iphoneProgress = (totalAsset / iphoneTarget) * 100
	const iphoneRequired = Math.ceil(iphoneTarget / rsuAmount)

	console.log('')
	console.log('=== 목표 달성률 ===')
	console.log(
		`테슬라 Model 3 (₩${teslaTarget.toLocaleString()}): ${teslaProgress.toFixed(
			1
		)}% (목표가: ₩${teslaRequired.toLocaleString()})`
	)
	console.log(
		`iPhone 15 Pro (₩${iphoneTarget.toLocaleString()}): ${iphoneProgress.toFixed(
			1
		)}% (목표가: ₩${iphoneRequired.toLocaleString()})`
	)

	return {
		totalAsset,
		profitRate,
		profitAmount,
		teslaProgress,
		iphoneProgress,
	}
}

// 콘솔에서 testRSUCalculation() 실행
