import { test, expect } from '@playwright/test';

test.describe('FHD 뷰포트 타일 개수 검증', () => {

  test.use({ viewport: { width: 1920, height: 1080 } });

  test('FHD 뷰포트에서 타일 개수가 이론적 최대값 이내', async ({ page }) => {
    await page.goto('', { waitUntil: 'domcontentloaded' });

    // COG 소스가 ready 상태가 될 때까지 대기
    await page.waitForFunction(() => {
      return window.cogSource && window.cogSource.getState() === 'ready';
    }, { timeout: 30000 });

    // 렌더링 안정화 대기
    await page.waitForTimeout(2000);

    const tileInfo = await page.evaluate(() => {
      const map = window.olMap;
      const view = map.getView();
      const z = Math.round(view.getZoom());
      const mapSize = map.getSize();
      const extent = view.calculateExtent(mapSize);

      // COG 소스의 tileGrid 가져오기
      const cogSource = window.cogSource;
      if (!cogSource || !cogSource.tileGrid) {
        return { error: 'COG source or tileGrid not found' };
      }

      const tileGrid = cogSource.tileGrid;
      const resolutions = tileGrid.getResolutions();

      // view의 줌 레벨을 tileGrid의 유효 줌 범위로 변환
      const resolution = view.getResolution();
      const tileZ = tileGrid.getZForResolution(resolution);
      const tileSize = tileGrid.getTileSize(tileZ);
      const tileRange = tileGrid.getTileRangeForExtentAndZ(extent, tileZ);

      // tileSize는 숫자 또는 [width, height] 배열일 수 있음
      const tileSizeW = Array.isArray(tileSize) ? tileSize[0] : tileSize;
      const tileSizeH = Array.isArray(tileSize) ? tileSize[1] : tileSize;

      const tilesX = tileRange.maxX - tileRange.minX + 1;
      const tilesY = tileRange.maxY - tileRange.minY + 1;
      const totalTiles = tilesX * tilesY;

      // 이론적 최대 타일 개수 계산 (최악: 1px 어긋남)
      const theoreticalMaxX = Math.ceil(mapSize[0] / tileSizeW) + 1;
      const theoreticalMaxY = Math.ceil(mapSize[1] / tileSizeH) + 1;
      const theoreticalMax = theoreticalMaxX * theoreticalMaxY;

      return {
        viewZoom: z,
        tileZ,
        mapSize,
        extent,
        tileSize: [tileSizeW, tileSizeH],
        resolutions,
        tileRange: {
          minX: tileRange.minX,
          maxX: tileRange.maxX,
          minY: tileRange.minY,
          maxY: tileRange.maxY
        },
        tilesX,
        tilesY,
        totalTiles,
        theoreticalMaxX,
        theoreticalMaxY,
        theoreticalMax
      };
    });

    expect(tileInfo.error).toBeUndefined();

    console.log('\n=== FHD 뷰포트 타일 개수 검증 ===');
    console.log(`뷰포트: ${tileInfo.mapSize[0]}×${tileInfo.mapSize[1]}`);
    console.log(`뷰 줌: ${tileInfo.viewZoom}, 타일그리드 줌: ${tileInfo.tileZ}`);
    console.log(`타일 사이즈: ${tileInfo.tileSize[0]}×${tileInfo.tileSize[1]}`);
    console.log(`해상도 배열: [${tileInfo.resolutions.map(r => r.toFixed(4)).join(', ')}]`);
    console.log(`타일 범위: X[${tileInfo.tileRange.minX}..${tileInfo.tileRange.maxX}], Y[${tileInfo.tileRange.minY}..${tileInfo.tileRange.maxY}]`);
    console.log(`실제 타일 개수: ${tileInfo.tilesX} × ${tileInfo.tilesY} = ${tileInfo.totalTiles}`);
    console.log(`이론적 최대값: ${tileInfo.theoreticalMaxX} × ${tileInfo.theoreticalMaxY} = ${tileInfo.theoreticalMax}`);

    // 실제 타일 개수가 이론적 최대값 이내인지 검증
    expect(tileInfo.totalTiles).toBeLessThanOrEqual(tileInfo.theoreticalMax);
    expect(tileInfo.totalTiles).toBeGreaterThan(0);

    console.log(`\n✅ 타일 개수 ${tileInfo.totalTiles}개 ≤ 이론적 최대 ${tileInfo.theoreticalMax}개`);
  });
});
