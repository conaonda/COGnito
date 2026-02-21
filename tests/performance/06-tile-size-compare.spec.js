import { test, expect } from '@playwright/test';
import { measurePan } from './helpers/measure-pan.js';

test.describe('타일 사이즈 256 vs 512 성능 비교', () => {

  test.use({ viewport: { width: 1920, height: 1080 } });

  test('tileSize 256 vs 512 비교', async ({ browser }) => {
    const results = {};

    for (const tileSize of [256, 512]) {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      const page = await context.newPage();

      // 페이지 로드
      await page.goto(`?tileSize=${tileSize}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        return window.cogSource && window.cogSource.getState() === 'ready';
      }, { timeout: 30000 });
      await page.waitForTimeout(2000);

      // 타일 정보 수집
      const tileInfo = await page.evaluate(() => {
        const map = window.map;
        const view = map.getView();
        const mapSize = map.getSize();
        const extent = view.calculateExtent(mapSize);
        const cogSource = window.cogSource;
        const tileGrid = cogSource.tileGrid;
        const resolution = view.getResolution();
        const tileZ = tileGrid.getZForResolution(resolution);
        const ts = tileGrid.getTileSize(tileZ);
        const tileSizeW = Array.isArray(ts) ? ts[0] : ts;
        const tileSizeH = Array.isArray(ts) ? ts[1] : ts;
        const tileRange = tileGrid.getTileRangeForExtentAndZ(extent, tileZ);
        const tilesX = tileRange.maxX - tileRange.minX + 1;
        const tilesY = tileRange.maxY - tileRange.minY + 1;
        return {
          tileSize: [tileSizeW, tileSizeH],
          tilesX,
          tilesY,
          totalTiles: tilesX * tilesY
        };
      });

      // Pan 성능 측정 (5회 반복 평균)
      const panDurations = [];
      const fpsValues = [];

      for (let i = 0; i < 5; i++) {
        const metrics = await measurePan(page, 'right', 300);
        panDurations.push(metrics.totalDuration);
        fpsValues.push(metrics.fps.avg);

        // 원위치 복귀
        await measurePan(page, 'left', 300);
        await page.waitForTimeout(500);
      }

      const avgPanDuration = panDurations.reduce((a, b) => a + b, 0) / panDurations.length;
      const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;

      // 줌 인 성능 측정
      const zoomStart = await page.evaluate(() => performance.now());
      await page.evaluate(() => {
        const view = window.map.getView();
        view.animate({ zoom: view.getZoom() + 2, duration: 500 });
      });
      // 줌 애니메이션 완료 대기
      await page.waitForFunction(() => !window.map.getView().getAnimating(), { timeout: 5000 });
      // 타일 로딩 대기 (rendercomplete 이벤트 기반, fallback 10초)
      await page.waitForFunction(() => {
        return new Promise(resolve => {
          const map = window.map;
          if (!map) { resolve(true); return; }
          map.once('rendercomplete', () => resolve(true));
          map.renderSync();
          setTimeout(() => resolve(true), 10000);
        });
      }, { timeout: 15000 });
      const zoomEnd = await page.evaluate(() => performance.now());
      const zoomDuration = zoomEnd - zoomStart;

      results[tileSize] = {
        tileInfo,
        panDurations,
        avgPanDuration,
        avgFps,
        zoomDuration
      };

      await context.close();
    }

    // 결과 출력
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║        타일 사이즈 256 vs 512 성능 비교 결과            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');

    console.log(`║  항목              │  256px        │  512px        ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');

    const r256 = results[256];
    const r512 = results[512];

    console.log(`║  타일 사이즈       │  ${pad(r256.tileInfo.tileSize.join('×'))} │  ${pad(r512.tileInfo.tileSize.join('×'))} ║`);
    console.log(`║  타일 개수         │  ${pad(String(r256.tileInfo.totalTiles))} │  ${pad(String(r512.tileInfo.totalTiles))} ║`);
    console.log(`║  타일 그리드       │  ${pad(`${r256.tileInfo.tilesX}×${r256.tileInfo.tilesY}`)} │  ${pad(`${r512.tileInfo.tilesX}×${r512.tileInfo.tilesY}`)} ║`);
    console.log(`║  Pan 평균 (5회)    │  ${pad(r256.avgPanDuration.toFixed(0) + 'ms')} │  ${pad(r512.avgPanDuration.toFixed(0) + 'ms')} ║`);
    console.log(`║  Pan 평균 FPS      │  ${pad(r256.avgFps.toFixed(0) + ' fps')} │  ${pad(r512.avgFps.toFixed(0) + ' fps')} ║`);
    console.log(`║  Zoom +2 소요      │  ${pad(r256.zoomDuration.toFixed(0) + 'ms')} │  ${pad(r512.zoomDuration.toFixed(0) + 'ms')} ║`);

    console.log('╠══════════════════════════════════════════════════════════╣');

    const tileDelta = ((r512.tileInfo.totalTiles - r256.tileInfo.totalTiles) / r256.tileInfo.totalTiles * 100).toFixed(0);
    const panDelta = ((r512.avgPanDuration - r256.avgPanDuration) / r256.avgPanDuration * 100).toFixed(0);
    const fpsDelta = ((r512.avgFps - r256.avgFps) / r256.avgFps * 100).toFixed(0);
    const zoomDelta = ((r512.zoomDuration - r256.zoomDuration) / r256.zoomDuration * 100).toFixed(0);

    console.log(`║  타일 수 변화      │  512 vs 256: ${tileDelta}%${' '.repeat(Math.max(0, 23 - tileDelta.length))}║`);
    console.log(`║  Pan 시간 변화     │  512 vs 256: ${panDelta}%${' '.repeat(Math.max(0, 23 - panDelta.length))}║`);
    console.log(`║  FPS 변화          │  512 vs 256: +${fpsDelta}%${' '.repeat(Math.max(0, 22 - fpsDelta.length))}║`);
    console.log(`║  Zoom 시간 변화    │  512 vs 256: ${zoomDelta}%${' '.repeat(Math.max(0, 23 - zoomDelta.length))}║`);

    console.log('╚══════════════════════════════════════════════════════════╝');

    // 기본 검증: 두 설정 모두 정상 동작
    expect(r256.tileInfo.totalTiles).toBeGreaterThan(0);
    expect(r512.tileInfo.totalTiles).toBeGreaterThan(0);

    // 512가 타일 수가 적어야 함
    expect(r512.tileInfo.totalTiles).toBeLessThan(r256.tileInfo.totalTiles);
  });
});

function pad(str, len = 13) {
  return (str + ' '.repeat(len)).slice(0, len);
}
