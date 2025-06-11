class RSUWidget {
    constructor() {
        this.widget = null;
        this.isVisible = false;
        this.currentData = {
            price: 0,
            userData: {
                rsuAmount: 0,
                avgPrice: 0
            }
        };
    }

    // 위젯 생성
    async create() {
        if (this.widget) {
            return;
        }

        try {
            // CSS 로드
            await this.loadCSS();
            
            // HTML 로드
            const html = await this.loadHTML();
            
            // 위젯 생성
            this.widget = document.createElement('div');
            this.widget.id = 'rsu-tracker-widget';
            this.widget.innerHTML = html;
            
            document.body.appendChild(this.widget);
            
            // 이벤트 설정
            this.setupEvents();
            
            // 초기 테마 설정
            if (this.currentData.settings && this.currentData.settings.theme) {
                this.setTheme(this.currentData.settings.theme);
            }
            
            // 위젯 생성 후 자동으로 표시
            this.show();
            
        } catch (error) {
            console.error('위젯 생성 중 오류:', error);
        }
    }

    // 위젯 존재 여부 확인
    exists() {
        const existingWidget = document.getElementById('rsu-tracker-widget');
        if (existingWidget) {
            this.widget = existingWidget;
            return true;
        }
        return false;
    }

    // 위젯 활성 여부 확인
    isActive() {
        const widget = document.getElementById('rsu-tracker-widget');
        if (widget) {
            this.widget = widget;
            return true;
        }
        return false;
    }

    // HTML 로드
    async loadHTML() {
        try {
            const response = await fetch(chrome.runtime.getURL('src/widget/widget.html'));
            return await response.text();
        } catch (error) {
            console.error('위젯 HTML 로드 실패:', error);
            throw new Error('위젯 HTML을 로드할 수 없습니다.');
        }
    }

    // CSS 로드
    async loadCSS() {
        // 기존 스타일 제거
        const existingStyle = document.getElementById('rsu-widget-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'rsu-widget-style';
        
        try {
            const response = await fetch(chrome.runtime.getURL('src/widget/widget.css'));
            style.textContent = await response.text();
        } catch (error) {
            console.error('위젯 CSS 로드 실패:', error);
            throw new Error('위젯 CSS를 로드할 수 없습니다.');
        }
        
        document.head.appendChild(style);
    }

    // 이벤트 설정
    setupEvents() {
        if (!this.widget) return;

        // 닫기 버튼
        const closeBtn = this.widget.querySelector('.rsu-widget-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
                // 설정도 업데이트
                chrome.storage.sync.get(['settings'], (result) => {
                    const settings = result.settings || {};
                    settings.enableWidget = false;
                    chrome.storage.sync.set({ settings });
                });
            });
        }

        // 최소화 버튼
        const minimizeBtn = this.widget.querySelector('.rsu-widget-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                const container = this.widget.querySelector('.rsu-widget-container');
                if (container) {
                    const isMinimized = container.classList.contains('minimized');
                    
                    // 상태 토글
                    container.classList.toggle('minimized');
                    
                    // 버튼 제목 변경
                    if (isMinimized) {
                        // 최대화 → 최소화
                        minimizeBtn.title = '최소화';
                    } else {
                        // 최소화 → 최대화
                        minimizeBtn.title = '최대화';
                    }
                }
            });
        }

        // 드래그 기능
        this.setupDragEvents();
    }

    // 드래그 기능 설정
    setupDragEvents() {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        const header = this.widget.querySelector('.rsu-widget-header');
        const container = this.widget.querySelector('.rsu-widget-container');

        if (!header || !container) return;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            container.classList.add('dragging');

            const rect = this.widget.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            // 화면 경계 체크
            const maxX = window.innerWidth - this.widget.offsetWidth;
            const maxY = window.innerHeight - this.widget.offsetHeight;

            this.widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            this.widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('dragging');
            }
        });

        // 더블클릭으로 위치 리셋
        header.addEventListener('dblclick', () => {
            this.widget.style.right = '20px';
            this.widget.style.bottom = '20px';
            this.widget.style.left = 'auto';
            this.widget.style.top = 'auto';
        });
    }

    // 위젯 내용 업데이트
    updateContent() {
        if (!this.widget || !this.isVisible) return;

        const rsuAmount = this.currentData.userData.rsuAmount || 0;
        const avgPrice = this.currentData.userData.avgPrice || 0;
        const currentPrice = this.currentData.price || 0;

        // 현재가 업데이트
        const priceElement = this.widget.querySelector('#widget-price');
        if (priceElement) {
            priceElement.textContent = `₩${currentPrice.toLocaleString()}`;
        }

        // 총 자산 계산
        const totalAsset = rsuAmount * currentPrice;
        const assetElement = this.widget.querySelector('#widget-asset');
        if (assetElement) {
            assetElement.textContent = `₩${totalAsset.toLocaleString()}`;
        }

        // 수익률 계산
        const profitElement = this.widget.querySelector('#widget-profit');
        if (profitElement && avgPrice > 0) {
            const profitRate = ((currentPrice - avgPrice) / avgPrice) * 100;
            profitElement.textContent = `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(1)}%`;
            profitElement.className = `rsu-widget-value ${profitRate >= 0 ? 'positive' : 'negative'}`;
        }

        // 테슬라 진행률 업데이트
        this.updateTeslaProgress(totalAsset);
    }

    // 테슬라 진행률 업데이트
    updateTeslaProgress(totalAsset) {
        const teslaPrice = 160000000; // 1억 6천만원
        const progress = Math.min((totalAsset / teslaPrice) * 100, 100);

        const progressFill = this.widget.querySelector('#widget-tesla-progress');
        const progressText = this.widget.querySelector('#widget-tesla-percent');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress.toFixed(1)}%`;
        }
    }

    // 위젯 표시
    show() {
        if (this.widget) {
            this.widget.style.display = 'block';
            this.isVisible = true;
            this.updateContent();
        }
    }

    // 위젯 숨기기
    hide() {
        if (this.widget) {
            this.widget.style.display = 'none';
            this.isVisible = false;
        }
    }

    // 위젯 제거
    remove() {
        if (this.widget) {
            this.widget.remove();
            this.widget = null;
            this.isVisible = false;
        }
    }

    // 데이터 업데이트
    updateData(data) {
        this.currentData = { ...this.currentData, ...data };
        this.updateContent();
        
        // 테마 설정이 포함된 경우 테마 적용
        if (data.settings && data.settings.theme) {
            this.setTheme(data.settings.theme);
        }
    }

    // 데이터만 업데이트 (위젯 표시는 변경하지 않음)
    updateDataOnly(data) {
        this.currentData = { ...this.currentData, ...data };
        if (this.isVisible) {
            this.updateContent();
        }
        
        // 테마 설정이 포함된 경우 테마 적용
        if (data.settings && data.settings.theme) {
            this.setTheme(data.settings.theme);
        }
    }

    // 테마 설정
    setTheme(theme) {
        if (this.widget) {
            this.widget.setAttribute('data-theme', theme);
            this.widget.className = `widget-theme-${theme}`;
        }
    }

    // 현재 테마 가져오기
    getTheme() {
        return this.widget ? this.widget.getAttribute('data-theme') : null;
    }
} 