/**
 * API 호출 관련 유틸리티 함수들
 * ES6 모듈로 export하여 다른 스크립트에서 import 가능
 */

// API 호출 상태 관리
let isFetchingPrice = false

// 카카오 주가 조회 (여러 API 시도)
/**
 * 카카오 주가 조회 (여러 API 시도)
 * @returns {Promise<{price: number, history: Array, source: string, isEstimated?: boolean}>} 주가 정보 객체
 */
export async function fetchKakaoPrice() {
	// 이미 API 호출 중이면 스킵
	if (isFetchingPrice) {
		console.log('이미 API 호출 중이므로 스킵')
		return
	}

	console.log('팝업 활성화 - 주가 조회 시작...')
	isFetchingPrice = true

	// API 시도 순서 - KRX 공식 API를 최우선으로 사용
	const apiMethods = [
		{ func: () => fetchFromKRXOfficial(), name: 'KRX 한국거래소' },
		{ func: () => fetchFromKRXMarketData(), name: 'KRX 마켓데이터' },
		{ func: () => fetchFromYahooFinance(), name: 'Yahoo Finance' },
		{ func: () => fetchFromAlternativeAPI(), name: 'Yahoo Finance (대체)' },
		{ func: () => fetchFromNaverFinance(), name: '네이버 금융' },
	]

	for (let i = 0; i < apiMethods.length; i++) {
		try {
			console.log(`API ${i + 1} (${apiMethods[i].name}) 시도 중...`)
			const priceData = await apiMethods[i].func()

			if (priceData && priceData.price > 0) {
				const price = Math.round(priceData.price)
				console.log(`API ${i + 1} (${apiMethods[i].name}) 성공: ₩${price.toLocaleString()}`)

				// 히스토리 데이터 처리 (최근 5일만)
				let history = []
				if (priceData.history && priceData.history.length > 0) {
					history = priceData.history.slice(-5)
				} else {
					history = [
						{
							time: new Date(),
							price: price,
						},
					]
				}

				isFetchingPrice = false
				return { price, history, source: apiMethods[i].name }
			}
		} catch (error) {
			console.warn(`API ${i + 1} (${apiMethods[i].name}) 실패:`, error.message)
			continue // 다음 API 시도
		}
	}

	// 모든 API 실패 시 현재 시간 기준 실제 주가 추정
	console.error('모든 주가 API 실패, 추정값 사용')

	// 2024년 카카오 주가 범위를 고려한 현실적인 값
	const basePrice = 51400  // 2024년 카카오 주가 기준으로 업데이트
	const variation = Math.floor(Math.random() * 4000) - 2000 // ±2000원 변동
	const estimatedPrice = basePrice + variation
	console.log('추정 주가 사용:', estimatedPrice)

	const history = [
		{
			time: new Date(),
			price: estimatedPrice,
		},
	]

	isFetchingPrice = false
	return { price: estimatedPrice, history, source: '추정값', isEstimated: true }
}

/**
 * KRX 공식 API로 카카오 주가 조회 (최우선)
 * @returns {Promise<{price: number, history: Array}>} 주가 정보 객체
 */
export async function fetchFromKRXOfficial() {
	console.log('KRX 공식 API 시도...')

	// 타임아웃 설정
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

	try {
		// KRX 개별종목 시세 추이 API 사용
		const response = await fetch(
			'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
			{
				method: 'POST',
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
					'Cache-Control': 'no-cache',
					'X-Requested-With': 'XMLHttpRequest',
					'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101'
				},
			},
			{
				body: new URLSearchParams({
					bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
					isuCd: 'KR7035720002',  // 카카오 ISIN 코드
					strtDd: getDateString(-30),  // 30일 전부터
					endDd: getDateString(0),     // 오늘까지
					share: '1',
					money: '1'
				})
			}
		)

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`KRX API HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()
		console.log('KRX 공식 API 응답:', data)

		// KRX API 응답 데이터 파싱
		if (data.OutBlock_1 && data.OutBlock_1.length > 0) {
			const latestData = data.OutBlock_1[0]  // 가장 최근 데이터
			const price = parseInt(latestData.TDD_CLSPRC?.replace(/,/g, '') || latestData.CLSPRC?.replace(/,/g, ''))

			if (price && price > 0) {
				// 히스토리 데이터 생성 (최근 5일)
				const history = data.OutBlock_1.slice(0, 5).map(item => ({
					time: new Date(item.TRD_DD),
					price: parseInt(item.TDD_CLSPRC?.replace(/,/g, '') || item.CLSPRC?.replace(/,/g, ''))
				})).reverse()  // 시간순으로 정렬

				console.log('KRX 공식 API 히스토리:', history.length, '개 항목')
				return { price, history }
			}
		}

		throw new Error('KRX 공식 API: 유효한 가격 데이터 없음')
	} catch (error) {
		clearTimeout(timeoutId)
		throw error
	}
}

/**
 * KRX 마켓데이터 API로 카카오 주가 조회 (2순위)
 * @returns {Promise<{price: number, history: Array}>} 주가 정보 객체
 */
export async function fetchFromKRXMarketData() {
	console.log('KRX 마켓데이터 API 시도...')

	// 타임아웃 설정
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

	try {
		// KRX 전종목 시세 API 사용
		const response = await fetch(
			'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
			{
				method: 'POST',
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'ko-KR,ko;q=0.9',
					'X-Requested-With': 'XMLHttpRequest',
					'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101'
				},
				body: new URLSearchParams({
					bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
					mktId: 'STK',  // 주식시장
					trdDd: getDateString(0),  // 오늘 날짜
					isuCd: '035720',  // 카카오 종목코드
					isuCd2: 'KR7035720002'  // 카카오 ISIN 코드
				})
			}
		)

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`KRX 마켓데이터 HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()
		console.log('KRX 마켓데이터 API 응답:', data)

		// KRX 마켓데이터 응답 파싱
		if (data.output && data.output.length > 0) {
			const kakaoData = data.output.find(item => 
				item.ISU_SRT_CD === '035720' || 
				item.ISU_CD === 'KR7035720002' ||
				item.ISU_ABBRV === '카카오'
			)

			if (kakaoData) {
				const price = parseInt(kakaoData.TDD_CLSPRC?.replace(/,/g, '') || kakaoData.CLSPRC?.replace(/,/g, ''))

				if (price && price > 0) {
					return { price, history: [] }
				}
			}
		}

		throw new Error('KRX 마켓데이터: 카카오 데이터를 찾을 수 없음')
	} catch (error) {
		clearTimeout(timeoutId)
		throw error
	}
}

/**
 * 날짜 문자열 생성 헬퍼 함수
 * @param {number} dayOffset - 오늘로부터 며칠 전/후 (음수: 이전, 양수: 이후)
 * @returns {string} YYYYMMDD 형식의 날짜 문자열
 */
function getDateString(dayOffset) {
	const date = new Date()
	date.setDate(date.getDate() + dayOffset)
	return date.toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * Yahoo Finance API로 카카오 주가 조회
 * @returns {Promise<{price: number, history: Array}>} 주가 정보 객체
 */
export async function fetchFromYahooFinance() {
	console.log('Yahoo Finance API 시도...')

	// 타임아웃 설정
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

	try {
		// 더 나은 헤더와 옵션으로 요청
		const response = await fetch(
			'https://query1.finance.yahoo.com/v8/finance/chart/035720.KS?interval=1d&range=1mo',
			{
				method: 'GET',
				signal: controller.signal,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: 'application/json, text/plain, */*',
					'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
					'Cache-Control': 'no-cache',
				},
			}
		)

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()
		console.log('Yahoo Finance 응답:', data)

		if (data.chart?.result?.[0]?.meta) {
			const result = data.chart.result[0]
			const meta = result.meta
			const price = meta.regularMarketPrice || meta.previousClose

			if (price && price > 0) {
				// 히스토리 데이터도 함께 처리
				const timestamps = result.timestamp || []
				const prices = result.indicators?.quote?.[0]?.close || []

				let history = []
				if (timestamps.length > 0 && prices.length > 0) {
					history = timestamps.slice(-5).map((timestamp, index) => ({
						time: new Date(timestamp * 1000),
						price: prices[index] || price,
					}))
					console.log('Yahoo Finance 히스토리:', history.length, '개 항목 (최근 5일)')
				}

				return { price, history }
			}
		}

		throw new Error('Yahoo Finance: 유효한 가격 데이터 없음')
	} catch (error) {
		clearTimeout(timeoutId)
		throw error
	}
}

/**
 * 대체 Yahoo Finance API로 카카오 주가 조회
 * @returns {Promise<{price: number, history: Array}>} 주가 정보 객체
 */
export async function fetchFromAlternativeAPI() {
	console.log('대체 API 시도...')

	// Yahoo Finance quote 엔드포인트 시도
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
		throw new Error(`대체 API HTTP ${response.status}`)
	}

	const data = await response.json()
	console.log('대체 API 응답:', data)

	if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
		const price = data.quoteResponse.result[0].regularMarketPrice
		return { price, history: [] }
	}

	throw new Error('대체 API: 유효한 가격 데이터 없음')
}

/**
 * 네이버 금융 API로 카카오 주가 조회 (5순위)
 * @returns {Promise<{price: number, history: Array}>} 주가 정보 객체
 */
export async function fetchFromNaverFinance() {
	console.log('네이버 금융 API 시도...')

	// 타임아웃 설정
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

	try {
		// 네이버 금융 API 사용
		const response = await fetch(
			'https://polling.finance.naver.com/api/realtime/domestic/stock/035720',
			{
				method: 'GET',
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'ko-KR,ko;q=0.9',
					'Cache-Control': 'no-cache',
					'Referer': 'https://finance.naver.com/item/main.naver?code=035720'
				}
			}
		)

		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`네이버 금융 HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()
		console.log('네이버 금융 API 응답:', data)

		// 네이버 금융 응답 파싱
		if (data.datas && data.datas.length > 0) {
			const kakaoData = data.datas[0]
			const price = parseInt(kakaoData.nv?.replace(/,/g, '') || kakaoData.cv?.replace(/,/g, ''))

			if (price && price > 0) {
				return { price, history: [] }
			}
		}

		throw new Error('네이버 금융: 유효한 가격 데이터 없음')
	} catch (error) {
		clearTimeout(timeoutId)
		throw error
	}
}

/**
 * 목표 설정 및 보상 시뮬레이션 관련 유틸리티 함수들
 * ES6 모듈로 export하여 다른 스크립트에서 import 가능
 */

/**
 * 한국 주식 시장 운영 시간 체크
 * 평일 오전 9시 ~ 오후 3시 30분 (KST 기준)
 * @returns {boolean} 시장 운영 시간 여부
 */
export function isKoreanMarketOpen() {
	const now = new Date()
	
	// KST (UTC+9) 시간으로 변환
	const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
	const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
	const kstTime = new Date(utc + kstOffset)
	
	// 요일 체크 (0: 일요일, 1: 월요일, ..., 6: 토요일)
	const dayOfWeek = kstTime.getDay()
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		return false // 주말
	}
	
	// 시간 체크 (09:00 ~ 15:30)
	const hour = kstTime.getHours()
	const minute = kstTime.getMinutes()
	const currentTime = hour * 100 + minute // HHMM 형태로 변환
	
	const marketOpen = 900   // 09:00
	const marketClose = 1530 // 15:30
	
	return currentTime >= marketOpen && currentTime <= marketClose
}

/**
 * 시장 상태 메시지 반환
 * @returns {string} 시장 상태 설명
 */
export function getMarketStatusMessage() {
	const now = new Date()
	const kstOffset = 9 * 60 * 60 * 1000
	const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
	const kstTime = new Date(utc + kstOffset)
	
	const dayOfWeek = kstTime.getDay()
	const hour = kstTime.getHours()
	const minute = kstTime.getMinutes()
	
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		return '주말 - 한국 주식 시장 휴장'
	}
	
	const currentTime = hour * 100 + minute
	if (currentTime < 900) {
		return '장 시작 전 - 오전 9시에 개장'
	} else if (currentTime > 1530) {
		return '장 마감 - 다음 거래일 오전 9시에 개장'
	}
	
	return '장 운영 중'
}

/**
 * 카카오 주가 조회 (Yahoo Finance API)
 * @returns {Promise<Object|null>} 주가 정보 또는 null
 */
