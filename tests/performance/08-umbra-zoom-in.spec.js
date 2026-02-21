import { test, expect } from '@playwright/test';

const UMBRA_URL = 'https://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/Tanna%20Island,%20Vanuatu/9c76a918-9247-42bf-b9f6-3b4f672bc148/2023-02-12-21-33-56_UMBRA-04/2023-02-12-21-33-56_UMBRA-04_GEC.tif';

test.describe('Umbra SAR GEC 줌인 타일 표시 검증', () => {

  test('줌인 3회 후 모든 타일이 정상 표시되어야 함', async ({ page }) => {
    const encodedUrl = encodeURIComponent(UMBRA_URL);
    await page.goto(`?url=${encodedUrl}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForFunction(
      () => window.cogSource && window.cogSource.getState() === 'ready',
      { timeout: 60000 }
    );

    // 로딩 인디케이터 사라질 때까지 대기 (view.fit 및 타일 로딩 완료 보장)
    await page.waitForFunction(
      () => !document.getElementById('loading').classList.contains('active'),
      { timeout: 30000 }
    );
    await page.waitForTimeout(1000);

    // 초기 상태 확인
    const initialPixels = await readCenterPixels(page);
    console.log('초기 alpha%:', initialPixels.pctAlpha);
    expect(Number(initialPixels.pctAlpha)).toBeGreaterThan(50);

    // 줌인 3회
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const view = window.olMap.getView();
        view.animate({ zoom: view.getZoom() + 1, duration: 300 });
      });
      await page.waitForFunction(
        () => !window.olMap.getView().getAnimating(),
        { timeout: 5000 }
      );
    }

    // 타일 로딩 + 렌더링 완료 대기
    await page.waitForFunction(() => {
      return new Promise(resolve => {
        const map = window.olMap;
        map.once('rendercomplete', () => resolve(true));
        map.renderSync();
        setTimeout(() => resolve(true), 15000);
      });
    }, { timeout: 20000 });

    // 줌인 후 캔버스 분석
    const afterZoomIn = await readCenterPixels(page);
    console.log('줌인 3회 후 alpha%:', afterZoomIn.pctAlpha, 'rgb%:', afterZoomIn.pctRGB);

    await page.screenshot({ path: 'test-results/umbra-after-zoomin.png' });

    // 줌인 후에도 중앙 영역에 가시적 픽셀이 충분해야 함 (50% 이상)
    expect(
      Number(afterZoomIn.pctAlpha),
      '줌인 3회 후 중앙 영역에 타일이 표시되어야 함'
    ).toBeGreaterThan(50);
  });
});

async function readCenterPixels(page) {
  return page.evaluate(() => {
    if (window.olMap) window.olMap.renderSync();
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const w = canvas.width, h = canvas.height;
      if (w === 0 || h === 0) continue;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) continue;

      const readW = 100, readH = 100;
      const startX = Math.floor((w - readW) / 2);
      const startY = Math.floor((h - readH) / 2);
      const tmp = document.createElement('canvas');
      tmp.width = readW; tmp.height = readH;
      const ctx2d = tmp.getContext('2d');
      ctx2d.drawImage(canvas, startX, startY, readW, readH, 0, 0, readW, readH);
      const pixels = ctx2d.getImageData(0, 0, readW, readH).data;

      let nonZeroAlpha = 0, nonBlackRGB = 0;
      const total = readW * readH;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) nonZeroAlpha++;
        if (pixels[i] > 5 || pixels[i + 1] > 5 || pixels[i + 2] > 5) nonBlackRGB++;
      }
      return {
        pctAlpha: ((nonZeroAlpha / total) * 100).toFixed(1),
        pctRGB: ((nonBlackRGB / total) * 100).toFixed(1),
      };
    }
    return { pctAlpha: '0', pctRGB: '0' };
  });
}
