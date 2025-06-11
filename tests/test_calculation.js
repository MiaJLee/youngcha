// RSU 계산 테스트 스크립트
// 콘솔에서 실행하여 계산 로직 확인
function testRSUCalculation() {
	// 테스트 데이터
	const rsuAmount = 135 // 주
	const avgPrice = 37150 // 원
	const currentPrice = 98000 // 원 (예시)

	// 총 자산 계산
	const totalAsset = rsuAmount * currentPrice

	// 수익률 계산
	const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100
	const profitAmount = rsuAmount * (currentPrice - avgPrice)

	// 목표 계산
	const teslaTarget = 60000000

	const teslaProgress = (totalAsset / teslaTarget) * 100
	const teslaRequired = Math.ceil(teslaTarget / rsuAmount)

	return {
		totalAsset,
		profitRate,
		profitAmount,
		teslaProgress,
		iphoneProgress,
	}
}

// 콘솔에서 testRSUCalculation() 실행
