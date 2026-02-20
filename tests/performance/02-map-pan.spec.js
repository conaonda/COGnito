import { test, expect } from '@playwright/test';
import { measurePan } from './helpers/measure-pan.js';

test.describe('지도 이동 (Pan) 성능 측정', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForFunction(() => {
      const loadingEl = document.getElementById('loading');
      return loadingEl && !loadingEl.classList.contains('active');
    }, { timeout: 30000 });
    
    await page.waitForTimeout(2000);
  });
  
  test('수평 이동 (Pan Right) 성능 측정', async ({ page }) => {
    const metrics = await measurePan(page, 'right', 300);
    
    console.log('\n=== 수평 이동 (오른쪽) 성능 ===');
    console.log(`드래그 소요: ${metrics.dragDuration.toFixed(2)}ms`);
    console.log(`렌더링 소요: ${metrics.renderDuration.toFixed(2)}ms`);
    console.log(`총 소요 시간: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`평균 FPS: ${metrics.fps.avg}`);
    console.log(`최소 FPS: ${metrics.fps.min}`);
    console.log(`최대 FPS: ${metrics.fps.max}`);
    
    expect(metrics.totalDuration).toBeLessThan(5000);
    expect(metrics.fps.avg).toBeGreaterThan(15);
  });

  test('수평 이동 (Pan Left) 성능 측정', async ({ page }) => {
    await measurePan(page, 'right', 200);
    await page.waitForTimeout(500);

    const metrics = await measurePan(page, 'left', 200);

    console.log('\n=== 수평 이동 (왼쪽) 성능 ===');
    console.log(`총 소요 시간: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`평균 FPS: ${metrics.fps.avg}`);

    expect(metrics.totalDuration).toBeLessThan(5000);
    expect(metrics.fps.avg).toBeGreaterThan(15);
  });

  test('수직 이동 (Pan Down) 성능 측정', async ({ page }) => {
    const metrics = await measurePan(page, 'down', 300);

    console.log('\n=== 수직 이동 (아래) 성능 ===');
    console.log(`총 소요 시간: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`평균 FPS: ${metrics.fps.avg}`);

    expect(metrics.totalDuration).toBeLessThan(5000);
    expect(metrics.fps.avg).toBeGreaterThan(15);
  });

  test('수직 이동 (Pan Up) 성능 측정', async ({ page }) => {
    await measurePan(page, 'down', 200);
    await page.waitForTimeout(500);

    const metrics = await measurePan(page, 'up', 200);

    console.log('\n=== 수직 이동 (위) 성능 ===');
    console.log(`총 소요 시간: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`평균 FPS: ${metrics.fps.avg}`);

    expect(metrics.totalDuration).toBeLessThan(5000);
  });

  test('대각선 이동 성능 측정', async ({ page }) => {
    const metrics = await measurePan(page, 'diagonal', 300, 300);

    console.log('\n=== 대각선 이동 성능 ===');
    console.log(`총 소요 시간: ${metrics.totalDuration.toFixed(2)}ms`);
    console.log(`평균 FPS: ${metrics.fps.avg}`);

    expect(metrics.totalDuration).toBeLessThan(6000);
  });
  
  test('이동 성능 일관성 테스트 (10회 반복)', async ({ page }) => {
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      const metrics = await measurePan(page, 'right', 200);
      results.push(metrics.totalDuration);
      
      await measurePan(page, 'left', 200);
      await page.waitForTimeout(500);
    }
    
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    const variance = results.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);
    
    console.log('\n=== 일관성 테스트 결과 (10회) ===');
    console.log(`평균: ${avg.toFixed(2)}ms`);
    console.log(`최소: ${min.toFixed(2)}ms`);
    console.log(`최대: ${max.toFixed(2)}ms`);
    console.log(`표준편차: ${stdDev.toFixed(2)}ms`);
    console.log(`변동계수: ${(stdDev / avg * 100).toFixed(2)}%`);
    
    expect(stdDev / avg).toBeLessThan(0.3);
  });
});
