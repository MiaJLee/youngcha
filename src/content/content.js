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
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            z-index: 999999;
            color: #333;
        ">
            <div style="
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="font-weight: 600; font-size: 14px;">🐜 카카오 RSU</div>
                <div style="display: flex; gap: 8px;">
                    <button id="widget-minimize" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    " title="최소화">−</button>
                    <button id="widget-close" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    " title="닫기">×</button>
                </div>
            </div>
            <div id="widget-content" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #666; font-size: 12px;">현재가</span>
                    <span id="widget-price" style="font-weight: 600; color: #2196F3;">₩0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #666; font-size: 12px;">총 자산</span>
                    <span id="widget-asset" style="font-weight: 600; color: #4CAF50;">₩0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="color: #666; font-size: 12px;">수익률</span>
                    <span id="widget-profit" style="font-weight: 600;">0%</span>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #666; font-size: 12px;">🚗 테슬라까지</span>
                        <span id="widget-tesla-percent" style="font-size: 12px; font-weight: 600;">0%</span>
                    </div>
                    <div style="background: #f5f5f5; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div id="widget-tesla-progress" style="
                            height: 100%;
                            background: linear-gradient(90deg, #4CAF50, #2196F3);
                            width: 0%;
                            transition: width 0.5s ease;
                        "></div>
                    </div>
                </div>
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
    const content = widget.querySelector('#widget-content');
    if (minimizeBtn && content) {
        minimizeBtn.addEventListener('click', () => {
            const isMinimized = content.style.display === 'none';
            content.style.display = isMinimized ? 'block' : 'none';
            minimizeBtn.textContent = isMinimized ? '−' : '+';
            minimizeBtn.title = isMinimized ? '최소화' : '최대화';
        });
    }
    
    // 드래그 기능
    setupDragEvents();
}

// 드래그 기능
function setupDragEvents() {
    const widget = widgetData.widget;
    const header = widget.querySelector('div'); // 첫 번째 div (헤더)
    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return; // 버튼 클릭은 제외
        
        isDragging = true;
        const rect = widget.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
    });
    
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
        profitElement.style.color = profitRate >= 0 ? '#4CAF50' : '#f44336';
    }
    
    // 테슬라 진행률
    const teslaPrice = 160000000; // 1억 6천만원
    const progress = Math.min((totalAsset / teslaPrice) * 100, 100);
    
    const progressFill = widget.querySelector('#widget-tesla-progress');
    const progressText = widget.querySelector('#widget-tesla-percent');
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${progress.toFixed(1)}%`;
    }
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