import { test, expect } from '@playwright/test';

test.describe('첫 화면 로딩 성능 측정', () => {
  
  test('초기 페이지 로드 메트릭 측정', async ({ page }) => {
    await page.addInitScript(() => {
      window.perfMarks = {};
      
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          window.perfMarks[entry.name] = entry.startTime;
        });
      });
      paintObserver.observe({ type: 'paint', buffered: true });
      
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.perfMarks.largestContentfulPaint = entries[entries.length - 1]?.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    });
    
    const navigationStart = Date.now();
    
    await page.goto('', { waitUntil: 'domcontentloaded' });
    
    const pageLoadTime = Date.now() - navigationStart;
    
    const olMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {
          cogReadyTime: null,
          firstTileRenderedTime: null,
          mapInitializedTime: null
        };
        
        const startTime = performance.now();
        let checkCount = 0;
        
        const checkInterval = setInterval(() => {
          checkCount++;
          
          let cogSource = window.cogSource;
          if (!cogSource && window.olMap) {
            const layers = window.olMap.getLayers().getArray();
            for (const layer of layers) {
              if (layer.getSource && layer.getSource().getState) {
                cogSource = layer.getSource();
                break;
              }
            }
          }
          
          if (cogSource && !metrics.cogReadyTime && cogSource.getState() === 'ready') {
            metrics.cogReadyTime = performance.now() - startTime;
          }
          
          if (window.olMap && !metrics.firstTileRenderedTime && !window.__renderCompleteListening) {
            window.__renderCompleteListening = true;
            window.olMap.once('rendercomplete', () => {
              metrics.firstTileRenderedTime = performance.now() - startTime;
            });
            window.olMap.renderSync();
          }
          
          if (window.olMap && !metrics.mapInitializedTime) {
            const view = window.olMap.getView();
            const center = view.getCenter();
            if (center && center[0] !== 0 && center[1] !== 0) {
              metrics.mapInitializedTime = performance.now() - startTime;
            }
          }
          
          const isComplete = metrics.cogReadyTime && metrics.firstTileRenderedTime;
          const isTimeout = checkCount > 300;
          
          if (isComplete || isTimeout) {
            clearInterval(checkInterval);
            if (isTimeout) {
              metrics.timeout = true;
            }
            resolve(metrics);
          }
        }, 100);
      });
    });
    
    const navMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      
      return {
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        sslHandshake: nav.secureConnectionStart > 0 ? 
          nav.connectEnd - nav.secureConnectionStart : 0,
        ttfb: nav.responseStart - nav.requestStart,
        downloadTime: nav.responseEnd - nav.responseStart,
        domProcessing: nav.domComplete - nav.domInteractive,
        loadEvent: nav.loadEventEnd - nav.loadEventStart,
        totalLoadTime: nav.loadEventEnd - nav.startTime
      };
    });
    
    const perfObserverMetrics = await page.evaluate(() => window.perfMarks);
    
    const results = {
      testName: 'initial-page-load',
      timestamp: new Date().toISOString(),
      pageLoadTime,
      navigationMetrics: navMetrics,
      openLayersMetrics: olMetrics,
      performanceObserverMetrics: perfObserverMetrics
    };
    
    console.log('\n=== 첫 화면 로딩 성능 결과 ===');
    console.log(`페이지 로드 시간: ${pageLoadTime}ms`);
    console.log(`FCP: ${perfObserverMetrics['first-contentful-paint']?.toFixed(2)}ms`);
    console.log(`LCP: ${perfObserverMetrics['largestContentfulPaint']?.toFixed(2)}ms`);
    console.log(`COG Ready: ${olMetrics.cogReadyTime?.toFixed(2)}ms`);
    console.log(`First Tile Rendered: ${olMetrics.firstTileRenderedTime?.toFixed(2)}ms`);
    console.log(`TTFB: ${navMetrics?.ttfb?.toFixed(2)}ms`);
    console.log(`Total Load Time: ${navMetrics?.totalLoadTime?.toFixed(2)}ms`);
    
    expect(olMetrics.cogReadyTime).toBeTruthy();
    expect(olMetrics.cogReadyTime).toBeLessThan(30000);
    expect(olMetrics.timeout).toBeFalsy();
    
    if (navMetrics) {
      expect(navMetrics.totalLoadTime).toBeLessThan(15000);
    }
  });
  
  test('로딩 상태 변화 추적', async ({ page }) => {
    await page.addInitScript(() => {
      window.stateChanges = [];
    });
    
    const loadPromise = page.goto('');
    
    await page.waitForFunction(() => {
      const loadingEl = document.getElementById('loading');
      return loadingEl && loadingEl.classList.contains('active');
    }, { timeout: 5000 });
    
    const loadingShown = await page.evaluate(() => performance.now());
    
    await page.waitForFunction(() => {
      const loadingEl = document.getElementById('loading');
      return loadingEl && !loadingEl.classList.contains('active');
    }, { timeout: 30000 });
    
    const loadingHidden = await page.evaluate(() => performance.now());
    
    await loadPromise;
    
    console.log('\n=== 로딩 상태 변화 ===');
    console.log(`로딩 표시 시작: ${loadingShown.toFixed(2)}ms`);
    console.log(`로딩 표시 종료: ${loadingHidden.toFixed(2)}ms`);
    console.log(`로딩 표시 지속: ${(loadingHidden - loadingShown).toFixed(2)}ms`);
    
    expect(loadingHidden - loadingShown).toBeLessThan(30000);
  });
});
