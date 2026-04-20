/**
 * 카카오 주가 조회 공용 유틸리티
 * - 시장 운영 시간 체크
 * - Yahoo Finance / 네이버 금융 API 호출
 * - Yahoo 응답 stale 여부 판정 + 자동 fallback
 */

const KAKAO_TICKER = '035720.KS'
const KAKAO_CODE = '035720'

let isFetchingPrice = false

/**
 * 한국 주식 시장 운영 시간 체크 (평일 09:00 ~ 15:30 KST)
 * @returns {boolean}
 */
export function isKoreanMarketOpen() {
	const kstTime = toKstDate(new Date())
	const dayOfWeek = kstTime.getDay()
	if (dayOfWeek === 0 || dayOfWeek === 6) return false

	const currentTime = kstTime.getHours() * 100 + kstTime.getMinutes()
	return currentTime >= 900 && currentTime <= 1530
}

/**
 * 시장 상태 메시지
 * @returns {string}
 */
export function getMarketStatusMessage() {
	const kstTime = toKstDate(new Date())
	const dayOfWeek = kstTime.getDay()
	if (dayOfWeek === 0 || dayOfWeek === 6) return '주말 - 한국 주식 시장 휴장'

	const currentTime = kstTime.getHours() * 100 + kstTime.getMinutes()
	if (currentTime < 900) return '장 시작 전 - 오전 9시에 개장'
	if (currentTime > 1530) return '장 마감 - 다음 거래일 오전 9시에 개장'
	return '장 운영 중'
}

function toKstDate(date) {
	const kstOffset = 9 * 60 * 60 * 1000
	const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000
	return new Date(utc + kstOffset)
}

/**
 * Yahoo Finance 응답이 stale 상태인지 판정
 * 장중인데 (1) 당일 일봉 집계(High/Low/Volume)가 전부 0 또는
 * (2) regularMarketTime이 30분 이상 지난 경우 stale
 * @param {Object} meta - Yahoo meta 객체 (chart.result[0].meta 또는 v7 quote result)
 * @returns {boolean}
 */
export function isYahooDataStale(meta) {
	if (!meta) return true
	if (!isKoreanMarketOpen()) return false

	if (
		meta.regularMarketVolume === 0 &&
		meta.regularMarketDayHigh === 0 &&
		meta.regularMarketDayLow === 0
	) {
		return true
	}

	if (meta.regularMarketTime) {
		const ageMin = (Date.now() - meta.regularMarketTime * 1000) / 60000
		if (ageMin > 30) return true
	}

	return false
}

/**
 * 카카오 주가 조회 (Yahoo 우선, stale 감지 시 네이버로 자동 fallback)
 * @returns {Promise<{price: number, history: Array, source: string, isEstimated?: boolean}>}
 */
export async function fetchKakaoPrice() {
	if (isFetchingPrice) return
	isFetchingPrice = true

	const apiMethods = [
		{ func: fetchFromYahooFinance, name: 'Yahoo Finance' },
		{ func: fetchFromYahooFinanceQuote, name: 'Yahoo Finance' },
		{ func: fetchFromNaverFinance, name: 'Naver' },
	]

	for (const method of apiMethods) {
		try {
			const priceData = await method.func()
			if (priceData && priceData.price > 0) {
				const price = Math.round(priceData.price)
				const history =
					priceData.history && priceData.history.length > 0
						? priceData.history.slice(-5)
						: [{ time: new Date(), price }]

				isFetchingPrice = false
				return { price, history, source: method.name }
			}
		} catch (error) {
			console.warn(`[${method.name}] 실패:`, error.message)
		}
	}

	// 모든 소스 실패 시 추정값 (비상용)
	console.error('모든 주가 API 실패, 추정값 사용')
	const basePrice = 51400
	const variation = Math.floor(Math.random() * 4000) - 2000
	const estimatedPrice = basePrice + variation

	isFetchingPrice = false
	return {
		price: estimatedPrice,
		history: [{ time: new Date(), price: estimatedPrice }],
		source: '추정값',
		isEstimated: true,
	}
}

/**
 * Yahoo Finance chart API (1순위)
 * @returns {Promise<{price: number, history: Array}>}
 */
export async function fetchFromYahooFinance() {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 10000)

	try {
		const response = await fetch(
			`https://query1.finance.yahoo.com/v8/finance/chart/${KAKAO_TICKER}?interval=1d&range=1mo`,
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

		if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

		const data = await response.json()
		const result = data.chart?.result?.[0]
		const meta = result?.meta
		if (!meta) throw new Error('Yahoo Finance chart: meta 없음')

		if (isYahooDataStale(meta)) {
			throw new Error('Yahoo Finance chart: 피드가 stale 상태')
		}

		const price = meta.regularMarketPrice || meta.previousClose
		if (!price || price <= 0) throw new Error('Yahoo Finance chart: 유효한 가격 없음')

		const timestamps = result.timestamp || []
		const prices = result.indicators?.quote?.[0]?.close || []
		const history =
			timestamps.length > 0 && prices.length > 0
				? timestamps.slice(-5).map((ts, i) => ({
						time: new Date(ts * 1000),
						price: prices[i] || price,
					}))
				: []

		return { price, history }
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Yahoo Finance v7 quote API (2순위 fallback)
 * @returns {Promise<{price: number, history: Array}>}
 */
export async function fetchFromYahooFinanceQuote() {
	const response = await fetch(
		`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${KAKAO_TICKER}`,
		{
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
				Accept: 'application/json',
			},
		}
	)

	if (!response.ok) throw new Error(`Yahoo quote HTTP ${response.status}`)

	const data = await response.json()
	const quote = data.quoteResponse?.result?.[0]
	if (!quote?.regularMarketPrice) throw new Error('Yahoo quote: 유효한 가격 없음')

	if (isYahooDataStale(quote)) {
		throw new Error('Yahoo quote: 피드가 stale 상태')
	}

	return { price: quote.regularMarketPrice, history: [] }
}

/**
 * 네이버 금융 API (최종 fallback, KRX 도메스틱 피드)
 * @returns {Promise<{price: number, history: Array}>}
 */
export async function fetchFromNaverFinance() {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000)

	try {
		const response = await fetch(
			`https://polling.finance.naver.com/api/realtime/domestic/stock/${KAKAO_CODE}`,
			{
				method: 'GET',
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					Accept: 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'ko-KR,ko;q=0.9',
					'Cache-Control': 'no-cache',
					Referer: `https://finance.naver.com/item/main.naver?code=${KAKAO_CODE}`,
				},
			}
		)

		if (!response.ok) throw new Error(`네이버 금융 HTTP ${response.status}`)

		const data = await response.json()
		const kakaoData = data.datas?.[0]
		if (!kakaoData) throw new Error('네이버 금융: datas 없음')

		const raw = kakaoData.closePriceRaw || kakaoData.nv?.replace(/,/g, '') || kakaoData.cv?.replace(/,/g, '')
		const price = parseInt(raw, 10)
		if (!price || price <= 0) throw new Error('네이버 금융: 유효한 가격 없음')

		return { price, history: [] }
	} finally {
		clearTimeout(timeoutId)
	}
}
