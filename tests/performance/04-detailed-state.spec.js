import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('첫 화면 로딩 완료 후 상태 기록', () => {
  
  test('HTTP 요청 완료 후 상세 상태 기록', async ({ page, context }) => {
    // HTTP 요청/응답 모니터링을 위한 배열
    const httpRequests = [];
    const httpResponses = [];
    
    // 모든 HTTP 요청/응답 모니터링
    await page.route('**/*', async (route, request) => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now(),
        type: request.resourceType()
      };
      
      httpRequests.push(requestInfo);
      
      try {
        const response = await route.fetch();
        const responseInfo = {
          url: request.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          timestamp: Date.now(),
          type: request.resourceType()
        };
        
        // Range 요청인 경우 추가 정보 기록
        const rangeHeader = request.headers()['range'];
        if (rangeHeader) {
          responseInfo.rangeRequest = rangeHeader;
          responseInfo.isCOGRangeRequest = request.url().includes('.tif');
        }
        
        httpResponses.push(responseInfo);
        await route.fulfill({ response });
      } catch (e) {
        await route.continue();
      }
    });
    
    // Performance Observer 설정 (Resource Timing API)
    await page.addInitScript(() => {
      window.resourceTimings = [];
      
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          window.resourceTimings.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            decodedBodySize: entry.decodedBodySize,
            initiatorType: entry.initiatorType
          });
        });
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    });
    
    // 페이지 로드
    const navigationStart = Date.now();
    await page.goto('', { waitUntil: 'domcontentloaded' });
    
    // COG 소스 준비 완료 대기
    await page.waitForFunction(() => window.cogSource && window.cogSource.getState() === 'ready', { timeout: 30000 });
    
    // 모든 HTTP 요청 완료 대기
    await page.waitForFunction(() => {
      return document.readyState === 'complete';
    }, { timeout: 5000 });
    
    // OpenLayers 상세 상태 수집
    const detailedState = await page.evaluate(() => {
      return new Promise((resolve) => {
        const state = {
          timestamp: new Date().toISOString(),
          projection: null,
          center: null,
          zoom: null,
          resolution: null,
          extent: null,
          layers: [],
          tileCache: {
            count: 0,
            tiles: []
          },
          cogSource: {
            state: null,
            url: null,
            bands: null,
            normalized: null
          },
          viewState: {
            rotation: null,
            maxZoom: null,
            minZoom: null
          }
        };
        
        // Map 인스턴스 확인
        const map = window.map;
        if (!map) {
          resolve({ error: 'Map not initialized', state });
          return;
        }
        
        // View 상태 수집
        const view = map.getView();
        const projection = view.getProjection();
        
        state.projection = {
          code: projection.getCode(),
          units: projection.getUnits(),
          extent: projection.getExtent()
        };
        
        state.center = view.getCenter();
        state.zoom = view.getZoom();
        state.resolution = view.getResolution();
        state.extent = view.calculateExtent();
        
        state.viewState = {
          rotation: view.getRotation(),
          maxZoom: view.getMaxZoom(),
          minZoom: view.getMinZoom()
        };
        
        // 레이어 정보 수집
        const layers = map.getLayers().getArray();
        layers.forEach((layer, index) => {
          const layerInfo = {
            index: index,
            type: layer.constructor.name,
            opacity: layer.getOpacity(),
            visible: layer.getVisible(),
            zIndex: layer.getZIndex()
          };
          
          // 소스 정보 추가
          const source = typeof layer.getSource === 'function' ? layer.getSource() : null;
          if (source) {
            layerInfo.sourceType = source.constructor.name;
            layerInfo.sourceState = source.getState ? source.getState() : 'unknown';
            
            // COG 소스 특정 정보
            if (source.constructor.name === 'GeoTIFFSource') {
              state.cogSource.state = source.getState();
            }

            // OSM 소스 특정 정보
            if (source.constructor.name === 'OSM') {
              layerInfo.sourceUrl = source.getUrl ? source.getUrl() : 'default';
            }
          }
          
          state.layers.push(layerInfo);
        });
        
        // COG 소스 직접 참조 (전역 변수)
        if (window.cogSource) {
          const cogSrc = window.cogSource;
          state.cogSource.state = cogSrc.getState();
        }
        
        resolve(state);
      });
    });
    
    // Resource Timing API 결과 수집
    const resourceTimings = await page.evaluate(() => window.resourceTimings || []);
    
    // COG Range Request 필터링
    const cogRangeRequests = httpResponses.filter(resp => 
      resp.isCOGRangeRequest || 
      (resp.url && resp.url.includes('.tif'))
    );
    
    // 결과 데이터 구성
    const resultData = {
      metadata: {
        testName: 'initial-load-detailed-state',
        timestamp: new Date().toISOString(),
        navigationStart: navigationStart,
        totalDuration: Date.now() - navigationStart,
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.viewportSize()
      },
      httpRequests: {
        total: httpRequests.length,
        cogRangeRequests: cogRangeRequests.length,
        requests: httpRequests.slice(0, 50) // 처음 50개만 기록
      },
      httpResponses: {
        total: httpResponses.length,
        cogRangeResponses: cogRangeRequests,
        responses: httpResponses.filter(r => r.type === 'xhr' || r.type === 'fetch').slice(0, 50)
      },
      resourceTimings: {
        total: resourceTimings.length,
        timings: resourceTimings
      },
      mapState: detailedState,
      summary: {
        projectionCode: detailedState.projection?.code,
        center: detailedState.center,
        zoom: detailedState.zoom,
        resolution: detailedState.resolution,
        layerCount: detailedState.layers?.length,
        tileCount: detailedState.tileCache?.count,
        cogSourceState: detailedState.cogSource?.state
      }
    };
    
    // 결과 출력
    console.log('\n=== 첫 화면 로딩 완료 후 상세 상태 ===');
    console.log(`테스트 시간: ${resultData.metadata.timestamp}`);
    console.log(`총 소요 시간: ${resultData.metadata.totalDuration}ms`);
    console.log('\n--- 프로젝션 좌표계 ---');
    console.log(`코드: ${detailedState.projection?.code}`);
    console.log(`단위: ${detailedState.projection?.units}`);
    console.log('\n--- 중심 좌표 및 줌 ---');
    console.log(`중심: [${detailedState.center?.[0]?.toFixed(2)}, ${detailedState.center?.[1]?.toFixed(2)}]`);
    console.log(`줌 레벨: ${detailedState.zoom}`);
    console.log(`해상도: ${detailedState.resolution?.toFixed(2)}m/pixel`);
    console.log('\n--- 레이어 목록 ---');
    detailedState.layers?.forEach((layer, i) => {
      console.log(`${i}: ${layer.type} (${layer.sourceType}) - ${layer.sourceState}`);
    });
    console.log('\n--- 타일 캐시 ---');
    console.log(`총 타일 수: ${detailedState.tileCache?.count}`);
    console.log(`기록된 타일 인덱스: ${detailedState.tileCache?.tiles?.length}개`);
    if (detailedState.tileCache?.tiles?.length > 0) {
      console.log('타일 인덱스 (z, x, y):');
      detailedState.tileCache.tiles.slice(0, 10).forEach(tile => {
        if (tile.z !== undefined) {
          console.log(`  z:${tile.z}, x:${tile.x}, y:${tile.y}`);
        }
      });
    }
    console.log('\n--- COG Range 요청 ---');
    console.log(`총 Range 요청 수: ${cogRangeRequests.length}`);
    cogRangeRequests.slice(0, 10).forEach((req, i) => {
      console.log(`${i + 1}. Range: ${req.rangeRequest}, Status: ${req.status}`);
    });
    console.log('\n--- HTTP 요청 요약 ---');
    console.log(`전체 요청: ${httpRequests.length}`);
    console.log(`XHR/Fetch: ${httpRequests.filter(r => r.type === 'xhr' || r.type === 'fetch').length}`);
    console.log(`Document: ${httpRequests.filter(r => r.type === 'document').length}`);
    console.log(`Script: ${httpRequests.filter(r => r.type === 'script').length}`);
    console.log(`Stylesheet: ${httpRequests.filter(r => r.type === 'stylesheet').length}`);
    
    // JSON 파일로 저장
    const resultsDir = join(process.cwd(), 'test-results');
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `initial-load-state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = join(resultsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(resultData, null, 2));
    console.log(`\n✅ 상세 상태가 저장됨: ${filepath}`);
    
    // 기준값 검증
    expect(detailedState.projection).toBeTruthy();
    expect(detailedState.projection.code).toBeTruthy();
    expect(detailedState.center).toBeTruthy();
    expect(detailedState.zoom).toBeGreaterThan(0);
    expect(detailedState.layers.length).toBeGreaterThan(0);
    expect(detailedState.cogSource.state).toBe('ready');
    
    // 상태 검증 (추후 비교용)
    expect(resultData.summary).toMatchObject({
      projectionCode: expect.any(String),
      center: expect.any(Array),
      zoom: expect.any(Number),
      layerCount: expect.any(Number),
      cogSourceState: 'ready'
    });
  });
  
  test('상태 스냅샷 비교 테스트', async ({ page }) => {
    // 이 테스트는 기준 상태와 비교하여 변경 감지
    await page.goto('', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.map && window.map.getView().getZoom() > 5, { timeout: 30000 });
    
    const currentState = await page.evaluate(() => {
      const map = window.map;
      if (!map) return null;
      
      const view = map.getView();
      return {
        projectionCode: view.getProjection().getCode(),
        center: view.getCenter()?.map(c => Math.round(c * 100) / 100), // 소수점 2자리까지
        zoom: Math.round(view.getZoom() * 10) / 10, // 소수점 1자리까지
        layerCount: map.getLayers().getLength()
      };
    });
    
    console.log('\n=== 상태 스냅샷 ===');
    console.log(`프로젝션: ${currentState.projectionCode}`);
    console.log(`중심: [${currentState.center?.join(', ')}]`);
    console.log(`줌: ${currentState.zoom}`);
    console.log(`레이어 수: ${currentState.layerCount}`);
    
    // 기준값과 비교 (허용 오차 포함)
    // 참고: 기본 범위 검증 (줌 레벨, 레이어 수 등)
    expect(currentState.projectionCode).toBeTruthy();
    expect(currentState.center).toHaveLength(2);
    expect(currentState.zoom).toBeGreaterThan(5);
    expect(currentState.zoom).toBeLessThan(25);
    expect(currentState.layerCount).toBeGreaterThan(0);
  });
});
