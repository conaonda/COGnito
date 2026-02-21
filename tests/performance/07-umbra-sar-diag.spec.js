import { test, expect } from '@playwright/test';

const UMBRA_URL = 'https://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/Tanna%20Island,%20Vanuatu/9c76a918-9247-42bf-b9f6-3b4f672bc148/2023-02-12-21-33-56_UMBRA-04/2023-02-12-21-33-56_UMBRA-04_GEC.tif';

test.describe('Umbra SAR GEC 초기 뷰 진단', () => {

  test('초기 로딩 후 캔버스 가시성 및 줌아웃 비교', async ({ page }) => {
    const diagLogs = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('[DIAG]')) {
        diagLogs.push(text);
      }
    });

    // Umbra SAR URL로 페이지 로드
    const encodedUrl = encodeURIComponent(UMBRA_URL);
    await page.goto(`?url=${encodedUrl}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // COG 소스 준비 완료 대기
    await page.waitForFunction(() => window.cogSource && window.cogSource.getState() === 'ready', { timeout: 60000 });
    // 타일 렌더링 완료 대기
    await page.waitForFunction(() => {
      return new Promise(resolve => {
        const map = window.olMap;
        if (!map) { resolve(true); return; }
        map.once('rendercomplete', () => resolve(true));
        map.renderSync();
        setTimeout(() => resolve(true), 10000);
      });
    }, { timeout: 15000 });

    // 1. 콘솔 진단 로그 수집
    console.log('\n=== [DIAG] 콘솔 로그 ===');
    diagLogs.forEach(l => console.log(l));

    // 2. 스크린샷 기반 픽셀 분석 (WebGL 캔버스도 포함)
    const initialScreenshot = await page.screenshot();

    // 3. 페이지 내부에서 WebGL readPixels로 직접 확인
    const initialAnalysis = await page.evaluate(() => {
      const map = window.olMap;
      if (!map) return { error: 'no map' };
      map.renderSync();

      const view = map.getView();
      const viewState = {
        zoom: view.getZoom(),
        resolution: view.getResolution(),
        center: view.getCenter(),
      };

      // WebGL 캔버스에서 readPixels
      const canvases = document.querySelectorAll('canvas');
      const results = [];
      for (const canvas of canvases) {
        const w = canvas.width, h = canvas.height;
        if (w === 0 || h === 0) continue;

        // WebGL context 확인
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (gl) {
          // drawImage를 2D 캔버스로 복사하여 픽셀 읽기 (preserveDrawingBuffer 불필요)
          const readW = 100, readH = 100;
          const startX = Math.floor((w - readW) / 2);
          const startY = Math.floor((h - readH) / 2);
          const tmp = document.createElement('canvas');
          tmp.width = readW; tmp.height = readH;
          const ctx2d = tmp.getContext('2d');
          ctx2d.drawImage(canvas, startX, startY, readW, readH, 0, 0, readW, readH);
          const pixels = ctx2d.getImageData(0, 0, readW, readH).data;

          let nonZeroAlpha = 0;
          let nonBlackRGB = 0;
          const total = readW * readH;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0) nonZeroAlpha++;
            if (pixels[i] > 5 || pixels[i + 1] > 5 || pixels[i + 2] > 5) nonBlackRGB++;
          }
          results.push({
            type: 'webgl',
            size: [w, h],
            readArea: [readW, readH],
            nonZeroAlpha,
            nonBlackRGB,
            total,
            pctAlpha: ((nonZeroAlpha / total) * 100).toFixed(1),
            pctRGB: ((nonBlackRGB / total) * 100).toFixed(1),
            // 중앙 픽셀 샘플 5개
            samplePixels: Array.from({ length: 5 }, (_, idx) => {
              const offset = (idx * 200 + 5000) * 4;
              return [pixels[offset] || 0, pixels[offset + 1] || 0, pixels[offset + 2] || 0, pixels[offset + 3] || 0];
            })
          });
          continue;
        }

        // 2D context fallback
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        let nonBlack = 0;
        const total2 = w * h;
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a > 0 && (r > 5 || g > 5 || b > 5)) nonBlack++;
        }
        results.push({
          type: '2d',
          size: [w, h],
          sampledPixels: Math.floor(total2 / 10),
          nonBlack,
          pctVisible: ((nonBlack / Math.floor(total2 / 10)) * 100).toFixed(1),
        });
      }

      // 타일 그리드 정보
      const cogSrc = window.cogSource;
      let tileGridInfo = null;
      if (cogSrc && cogSrc.tileGrid) {
        const tg = cogSrc.tileGrid;
        const vr = view.getResolution();
        const selZ = tg.getZForResolution(vr);
        tileGridInfo = {
          selectedZ: selZ,
          resolutionAtZ: tg.getResolution(selZ),
          allResolutions: tg.getResolutions(),
        };
      }

      // 소스 타일 데이터 확인
      let tileDataInfo = null;
      if (cogSrc) {
        try {
          const tg = cogSrc.tileGrid;
          const vr = view.getResolution();
          const selZ = tg.getZForResolution(vr);
          const tile = cogSrc.getTile(selZ, 0, 0);
          if (tile && tile.getData) {
            const data = tile.getData();
            if (data) {
              const len = data.length;
              let nonZero = 0;
              let min = Infinity, max = -Infinity;
              for (let i = 0; i < len; i++) {
                if (data[i] !== 0) nonZero++;
                if (data[i] < min) min = data[i];
                if (data[i] > max) max = data[i];
              }
              tileDataInfo = { length: len, nonZero, min, max, state: tile.getState() };
            } else {
              tileDataInfo = { error: 'no data', state: tile.getState() };
            }
          } else {
            tileDataInfo = { error: 'no tile or getData' };
          }
        } catch (e) {
          tileDataInfo = { error: e.message };
        }
      }

      return { viewState, canvases: results, tileGridInfo, tileDataInfo };
    });

    console.log('\n=== 초기 상태 (view.fit 후) ===');
    console.log('View:', JSON.stringify(initialAnalysis.viewState, null, 2));
    console.log('TileGrid:', JSON.stringify(initialAnalysis.tileGridInfo, null, 2));
    console.log('TileData:', JSON.stringify(initialAnalysis.tileDataInfo, null, 2));
    console.log('Canvas 분석:');
    initialAnalysis.canvases?.forEach((c, i) => {
      if (c.type === 'webgl') {
        console.log(`  canvas[${i}] WebGL ${c.size[0]}x${c.size[1]}: alpha=${c.pctAlpha}% rgb=${c.pctRGB}% samples=${JSON.stringify(c.samplePixels)}`);
      } else {
        console.log(`  canvas[${i}] 2D ${c.size[0]}x${c.size[1]}: visible=${c.pctVisible}%`);
      }
    });

    // 4. 스크린샷 - 초기 상태
    await page.screenshot({ path: 'test-results/umbra-initial.png' });

    // 5. 줌아웃 3회
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const map = window.olMap;
        const view = map.getView();
        const currentZoom = view.getZoom();
        view.animate({ zoom: currentZoom - 1, duration: 300 });
      });
      // 줌 애니메이션 완료 대기
      await page.waitForFunction(() => !window.olMap.getView().getAnimating(), { timeout: 5000 });
      // 타일 렌더링 완료 대기
      await page.waitForFunction(() => {
        return new Promise(resolve => {
          const map = window.olMap;
          if (!map) { resolve(true); return; }
          map.once('rendercomplete', () => resolve(true));
          map.renderSync();
          setTimeout(() => resolve(true), 5000);
        });
      }, { timeout: 10000 });
    }

    // 6. 줌아웃 후 상태 분석
    const afterZoomOut = await page.evaluate(() => {
      const map = window.olMap;
      map.renderSync();
      const view = map.getView();
      const viewState = {
        zoom: view.getZoom(),
        resolution: view.getResolution(),
      };

      const canvases = document.querySelectorAll('canvas');
      const results = [];
      for (const canvas of canvases) {
        const w = canvas.width, h = canvas.height;
        if (w === 0 || h === 0) continue;

        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (gl) {
          const readW = 100, readH = 100;
          const startX = Math.floor((w - readW) / 2);
          const startY = Math.floor((h - readH) / 2);
          const tmp = document.createElement('canvas');
          tmp.width = readW; tmp.height = readH;
          const ctx2d = tmp.getContext('2d');
          ctx2d.drawImage(canvas, startX, startY, readW, readH, 0, 0, readW, readH);
          const pixels = ctx2d.getImageData(0, 0, readW, readH).data;

          let nonZeroAlpha = 0;
          let nonBlackRGB = 0;
          const total = readW * readH;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0) nonZeroAlpha++;
            if (pixels[i] > 5 || pixels[i + 1] > 5 || pixels[i + 2] > 5) nonBlackRGB++;
          }
          results.push({
            type: 'webgl',
            size: [w, h],
            nonZeroAlpha,
            nonBlackRGB,
            total,
            pctAlpha: ((nonZeroAlpha / total) * 100).toFixed(1),
            pctRGB: ((nonBlackRGB / total) * 100).toFixed(1),
            samplePixels: Array.from({ length: 5 }, (_, idx) => {
              const offset = (idx * 200 + 5000) * 4;
              return [pixels[offset] || 0, pixels[offset + 1] || 0, pixels[offset + 2] || 0, pixels[offset + 3] || 0];
            })
          });
          continue;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        let nonBlack = 0;
        const total2 = w * h;
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a > 0 && (r > 5 || g > 5 || b > 5)) nonBlack++;
        }
        results.push({
          type: '2d',
          size: [w, h],
          sampledPixels: Math.floor(total2 / 10),
          nonBlack,
          pctVisible: ((nonBlack / Math.floor(total2 / 10)) * 100).toFixed(1),
        });
      }

      return { viewState, canvases: results };
    });

    console.log('\n=== 줌아웃 3회 후 ===');
    console.log('View:', JSON.stringify(afterZoomOut.viewState, null, 2));
    console.log('Canvas 분석:');
    afterZoomOut.canvases?.forEach((c, i) => {
      if (c.type === 'webgl') {
        console.log(`  canvas[${i}] WebGL ${c.size[0]}x${c.size[1]}: alpha=${c.pctAlpha}% rgb=${c.pctRGB}% samples=${JSON.stringify(c.samplePixels)}`);
      } else {
        console.log(`  canvas[${i}] 2D ${c.size[0]}x${c.size[1]}: visible=${c.pctVisible}%`);
      }
    });

    // 7. 스크린샷 - 줌아웃 후
    await page.screenshot({ path: 'test-results/umbra-after-zoomout.png' });

    // 8. 추가 [DIAG] 로그
    console.log('\n=== 줌아웃 후 추가 [DIAG] 로그 ===');
    diagLogs.forEach(l => console.log(l));

    // 초기 로딩 후 캔버스에 가시적 픽셀이 존재해야 함
    const webglCanvas = initialAnalysis.canvases?.find(c => c.type === 'webgl');
    expect(webglCanvas, 'WebGL 캔버스가 존재해야 함').toBeTruthy();
    expect(Number(webglCanvas.pctAlpha), '알파 > 0인 픽셀이 있어야 함').toBeGreaterThan(0);
  });
});
