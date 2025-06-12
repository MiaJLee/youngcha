// 함수 기반 위젯 시스템

// 위젯 상태 관리
let widgetData = {
    isVisible: false,
    widget: null,
    currentPrice: 0,
    userData: {
        rsuAmount: 0,
        avgPrice: 0
    },
    settings: {
        enableWidget: true,
        theme: 'light'
    }
};

// 위젯 HTML 생성
function createWidgetHTML() {
    return `
        <div id="rsu-tracker-widget" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 280px;
            background: #ffffff;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 999999;
            color: #333333;
            transition: all 0.3s ease;
        ">
            <div id="widget-header" style="
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
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
                        border: 1px solid #e9ecef;
                        color: #6c757d;
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
                        border: 1px solid #e9ecef;
                        color: #6c757d;
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
                    <span style="color: #6c757d; font-size: 12px;">현재가</span>
                    <span id="widget-price" style="font-weight: 600; color: #333333;">₩0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px;">총 자산</span>
                    <span id="widget-asset" style="font-weight: 600; color: #28a745;">₩0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="color: #6c757d; font-size: 12px;">수익률</span>
                    <span id="widget-profit" style="font-weight: 600;">0%</span>
                </div>
                <div id="widget-progress-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9ecef;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #6c757d; font-size: 12px;">테슬라까지</span>
                        <span id="widget-tesla-percent" style="font-size: 12px; font-weight: 600; color: #007bff;">0%</span>
                    </div>
                    <div id="widget-progress-container" style="
                        background: #e9ecef; 
                        height: 8px; 
                        border-radius: 4px; 
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="widget-tesla-progress" style="
                            height: 100%;
                            background: #007bff;
                            width: 0%;
                            transition: width 0.5s ease;
                            border-radius: 4px;
                        "></div>
                        <div id="widget-tesla-emoji" style="
                            position: absolute;
                            top: 50%;
                            transform: translateY(-50%);
                            font-size: 14px;
                            transition: left 0.5s ease;
                            left: 0%;
                        ">🚗</div>
                    </div>
                </div>
            </div>
            <div id="widget-minimized" style="
                display: none;
                padding: 8px 16px;
                background: #f8f9fa;
                border-radius: 12px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <div id="widget-progress-container-mini" style="
                        background: #e9ecef; 
                        height: 6px; 
                        border-radius: 3px; 
                        overflow: hidden;
                        position: relative;
                        flex: 1;
                        min-width: 120px;
                    ">
                        <div id="widget-tesla-progress-mini" style="
                            height: 100%;
                            background: #007bff;
                            width: 0%;
                            transition: width 0.5s ease;
                            border-radius: 3px;
                        "></div>
                        <div id="widget-tesla-emoji-mini" style="
                            position: absolute;
                            top: 50%;
                            transform: translateY(-50%);
                            font-size: 12px;
                            transition: left 0.5s ease;
                            left: 0%;
                        ">🚗</div>
                    </div>
                    <span id="widget-tesla-percent-mini" style="
                        font-size: 11px; 
                        font-weight: 600; 
                        color: #007bff;
                        min-width: 35px;
                    ">0%</span>
                </div>
                <button id="widget-maximize" style="
                    background: none;
                    border: none;
                    color: #6c757d;
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
    `;
}

// 위젯 생성
function createWidget() {
    // 기존 위젯 제거
    const existingWidget = document.getElementById('rsu-tracker-widget');
    if (existingWidget) {
        existingWidget.remove();
    }
    
    // HTML 추가
    document.body.insertAdjacentHTML('beforeend', createWidgetHTML());
    
    widgetData.widget = document.getElementById('rsu-tracker-widget');
    
    // 이벤트 설정
    setupWidgetEvents();
    
    // 초기 업데이트
    updateWidgetContent();
}

// 위젯 이벤트 설정
function setupWidgetEvents() {
    const widget = widgetData.widget;
    if (!widget) return;
    
    // 닫기 버튼
    const closeBtn = widget.querySelector('#widget-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideWidget();
            // 설정 업데이트
            chrome.storage.sync.get(['settings'], (result) => {
                const settings = result.settings || {};
                settings.enableWidget = false;
                chrome.storage.sync.set({ settings });
            });
        });
    }
    
    // 최소화 버튼
    const minimizeBtn = widget.querySelector('#widget-minimize');
    const maximizeBtn = widget.querySelector('#widget-maximize');
    const content = widget.querySelector('#widget-content');
    const minimized = widget.querySelector('#widget-minimized');
    const header = widget.querySelector('#widget-header');
    
    if (minimizeBtn && content && minimized && header) {
        minimizeBtn.addEventListener('click', () => {
            content.style.display = 'none';
            header.style.display = 'none';
            minimized.style.display = 'flex';
            widget.style.height = '30px';
            // 최소화 모드에서도 진행률 업데이트
            updateProgressBars();
        });
    }
    
    // 최대화 버튼
    if (maximizeBtn && content && minimized && header) {
        maximizeBtn.addEventListener('click', () => {
            content.style.display = 'block';
            header.style.display = 'flex';
            minimized.style.display = 'none';
            widget.style.height = 'auto';
        });
    }
    
    // 드래그 기능
    setupDragEvents();
}

// 드래그 기능
function setupDragEvents() {
    const widget = widgetData.widget;
    const header = widget.querySelector('#widget-header');
    const minimized = widget.querySelector('#widget-minimized');
    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // 일반 헤더 드래그
    if (header) {
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // 버튼 클릭은 제외
            
            isDragging = true;
            const rect = widget.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        });
    }
    
    // 최소화 모드 드래그
    if (minimized) {
        minimized.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // 버튼 클릭은 제외
            
            isDragging = true;
            const rect = widget.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        });
    }
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - widget.offsetWidth;
        const maxY = window.innerHeight - widget.offsetHeight;
        
        widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// 프로그레스바 및 이모지 위치 업데이트
function updateProgressBars() {
    const widget = widgetData.widget;
    if (!widget) return;
    
    const { currentPrice, userData } = widgetData;
    const { rsuAmount = 0 } = userData;
    const totalAsset = rsuAmount * currentPrice;
    const teslaPrice = 160000000; // 1억 6천만원
    const progress = Math.min((totalAsset / teslaPrice) * 100, 100);
    
    // 일반 모드 프로그레스바
    const progressFill = widget.querySelector('#widget-tesla-progress');
    const progressText = widget.querySelector('#widget-tesla-percent');
    const progressEmoji = widget.querySelector('#widget-tesla-emoji');
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${progress.toFixed(1)}%`;
    }
    
    if (progressEmoji) {
        // 이모지를 진행률 끝에 위치 (최소 10px, 최대 95%)
        const emojiPosition = Math.max(10, Math.min(progress * 0.95, 95));
        progressEmoji.style.left = `${emojiPosition}%`;
    }
    
    // 최소화 모드 프로그레스바
    const progressFillMini = widget.querySelector('#widget-tesla-progress-mini');
    const progressTextMini = widget.querySelector('#widget-tesla-percent-mini');
    const progressEmojiMini = widget.querySelector('#widget-tesla-emoji-mini');
    
    if (progressFillMini) {
        progressFillMini.style.width = `${progress}%`;
    }
    
    if (progressTextMini) {
        progressTextMini.textContent = `${progress.toFixed(1)}%`;
    }
    
    if (progressEmojiMini) {
        // 이모지를 진행률 끝에 위치 (최소 8px, 최대 95%)
        const emojiPositionMini = Math.max(8, Math.min(progress * 0.95, 95));
        progressEmojiMini.style.left = `${emojiPositionMini}%`;
    }
}

// 위젯 내용 업데이트
function updateWidgetContent() {
    const widget = widgetData.widget;
    if (!widget || !widgetData.isVisible) return;
    
    const { currentPrice, userData } = widgetData;
    const { rsuAmount = 0, avgPrice = 0 } = userData;
    
    // 현재가
    const priceElement = widget.querySelector('#widget-price');
    if (priceElement) {
        priceElement.textContent = `₩${currentPrice.toLocaleString()}`;
    }
    
    // 총 자산
    const totalAsset = rsuAmount * currentPrice;
    const assetElement = widget.querySelector('#widget-asset');
    if (assetElement) {
        assetElement.textContent = `₩${totalAsset.toLocaleString()}`;
    }
    
    // 수익률
    const profitElement = widget.querySelector('#widget-profit');
    if (profitElement && avgPrice > 0) {
        const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100;
        profitElement.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(1)}%`;
        profitElement.style.color = profitRate >= 0 ? '#28a745' : '#dc3545';
    }
    
    // 프로그레스바 업데이트
    updateProgressBars();
}

// 위젯 표시
function showWidget() {
    if (!widgetData.widget) {
        createWidget();
    }
    if (widgetData.widget) {
        widgetData.widget.style.display = 'block';
        widgetData.isVisible = true;
        updateWidgetContent();
    }
}

// 위젯 숨기기
function hideWidget() {
    if (widgetData.widget) {
        widgetData.widget.style.display = 'none';
        widgetData.isVisible = false;
    }
}

// 위젯 제거
function removeWidget() {
    if (widgetData.widget) {
        widgetData.widget.remove();
        widgetData.widget = null;
        widgetData.isVisible = false;
    }
}

// 데이터 업데이트
function updateWidgetData(data) {
    if (data.price !== undefined) {
        widgetData.currentPrice = data.price;
    }
    if (data.userData) {
        widgetData.userData = { ...widgetData.userData, ...data.userData };
    }
    if (data.settings) {
        widgetData.settings = { ...widgetData.settings, ...data.settings };
    }
    
    updateWidgetContent();
}

// 백그라운드 스크립트와 통신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'updateWidget':
            updateWidgetData(request);
            if (!widgetData.widget && widgetData.settings.enableWidget !== false) {
                showWidget();
            }
            break;
        case 'showWidget':
            showWidget();
            break;
        case 'hideWidget':
            hideWidget();
            break;
        case 'removeWidget':
            removeWidget();
            break;
    }
});

// 스토리지 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.settings) {
            const newSettings = changes.settings.newValue || {};
            widgetData.settings = { ...widgetData.settings, ...newSettings };
            
            if (newSettings.enableWidget === false) {
                hideWidget();
            } else if (newSettings.enableWidget === true) {
                showWidget();
            }
        }
        
        if (changes.userData) {
            widgetData.userData = { ...widgetData.userData, ...changes.userData.newValue };
            updateWidgetContent();
        }
    }
});

// 초기화
async function initializeWidget() {
    try {
        // 설정 및 데이터 로드
        const result = await chrome.storage.sync.get(['settings', 'userData']);
        
        widgetData.settings = result.settings || { enableWidget: true };
        widgetData.userData = result.userData || {};
        
        // 위젯 표시 설정이 활성화되어 있으면 위젯 생성
        if (widgetData.settings.enableWidget !== false) {
            showWidget();
        }
        
        // 현재 가격 요청
        chrome.runtime.sendMessage({ action: 'getCurrentPrice' }, (response) => {
            if (response && response.price) {
                widgetData.currentPrice = response.price;
                updateWidgetContent();
            }
        });
        
    } catch (error) {
        console.error('위젯 초기화 실패:', error);
    }
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
    setTimeout(initializeWidget, 100);
} 