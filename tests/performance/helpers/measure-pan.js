/**
 * Shared pan measurement helper.
 * Extracted from 02-map-pan.spec.js — full version with dragDuration/renderDuration.
 */
export async function measurePan(page, direction, distance, distanceY = 0) {
  const viewport = page.viewportSize();
  const centerX = viewport ? viewport.width / 2 : 400;
  const centerY = viewport ? viewport.height / 2 : 300;

  let endX = centerX;
  let endY = centerY;

  switch (direction) {
    case 'right':
      endX += distance;
      break;
    case 'left':
      endX -= distance;
      break;
    case 'down':
      endY += distance;
      break;
    case 'up':
      endY -= distance;
      break;
    case 'diagonal':
      endX += distance;
      endY += distanceY;
      break;
  }

  // FPS 측정 시작
  await page.evaluate(() => {
    window.__fpsData = [];
    window.__fpsLastTime = performance.now();
    window.__fpsFrameCount = 0;
    window.__fpsMeasuring = true;

    function countFrame() {
      if (!window.__fpsMeasuring) return;
      const now = performance.now();
      const delta = now - window.__fpsLastTime;
      if (delta >= 100) {
        window.__fpsData.push(Math.round((window.__fpsFrameCount * 1000) / delta));
        window.__fpsFrameCount = 0;
        window.__fpsLastTime = now;
      }
      window.__fpsFrameCount++;
      requestAnimationFrame(countFrame);
    }
    requestAnimationFrame(countFrame);
  });

  const startTime = await page.evaluate(() => performance.now());

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();

  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = centerX + (endX - centerX) * (i / steps);
    const y = centerY + (endY - centerY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }

  await page.mouse.up();
  const endTime = await page.evaluate(() => performance.now());

  // 팬 후 타일 로드 대기 (rendercomplete 이벤트 기반, 5초 fallback)
  await page.waitForFunction(() => {
    return new Promise(resolve => {
      const map = window.olMap;
      if (!map) { resolve(true); return; }
      map.once('rendercomplete', () => resolve(true));
      map.renderSync();
      setTimeout(() => resolve(true), 5000);
    });
  }, { timeout: 10000 });
  const renderCompleteTime = await page.evaluate(() => performance.now());

  const fpsData = await page.evaluate(() => {
    window.__fpsMeasuring = false;
    return window.__fpsData || [];
  });

  return {
    dragDuration: endTime - startTime,
    renderDuration: renderCompleteTime - endTime,
    totalDuration: renderCompleteTime - startTime,
    fps: {
      data: fpsData,
      avg: fpsData.length > 0 ?
        Math.round(fpsData.reduce((a, b) => a + b, 0) / fpsData.length) : 0,
      min: fpsData.length > 0 ? Math.min(...fpsData) : 0,
      max: fpsData.length > 0 ? Math.max(...fpsData) : 0
    }
  };
}
