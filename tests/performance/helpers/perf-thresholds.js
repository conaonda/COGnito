/**
 * 성능 임계값 두 단계 검증 헬퍼
 *
 * - warnMs: 이 시간을 초과하면 성능 경고 (테스트는 통과)
 * - failMs: 이 시간을 초과하면 기능 결함으로 판단 (테스트 실패)
 */
export function expectPerf(actualMs, warnMs, failMs, label = '') {
  const prefix = label ? `[${label}] ` : '';
  if (actualMs > failMs) {
    throw new Error(
      `${prefix}${actualMs.toFixed(0)}ms > 결함 임계값 ${failMs}ms — 기능 결함 의심`
    );
  }
  if (actualMs > warnMs) {
    console.warn(
      `⚠ PERF WARNING ${prefix}${actualMs.toFixed(0)}ms > 경고 임계값 ${warnMs}ms`
    );
  }
}

// 공통 임계값 상수
export const THRESHOLDS = {
  pan:        { warn: 3000,  fail: 15000 },
  zoomIn:     { warn: 10000, fail: 30000 },
  zoomOut:    { warn: 5000,  fail: 20000 },
  zoomMulti:  { warn: 15000, fail: 40000 },
  cogReady:   { warn: 5000,  fail: 30000 },
  loadingDuration: { warn: 5000, fail: 30000 },
  tileLoad:   { warn: 10000, fail: 30000 },
};
