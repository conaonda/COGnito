# PDCA Completion Changelog

> This file documents all completed PDCA cycles and their deliverables.
>
> **Last Updated**: 2026-02-26
> **Project**: COGnito v1.1.0

---

## [2026-02-26] - v1.1 미해결 이슈 일괄 조치 (v1.1-issues)

### Summary
v1.1.0 릴리스 후 남은 5개 GitHub 이슈(#92, #93, #94, #95, #97) 일괄 조치. 접근성, 상태 관리, 캐싱, 썸네일, 테스트 커버리지 개선.

### Fixed
- #92: UI 디자인 일관성 — 뷰어 컨트롤 패널 내 11개 interactive 요소에 aria-label 추가, label[for] 속성 추가
- #93: 영상/URL/메타 일관성 — loadCOG() race condition 방지 (모듈 레벨 버전 카운터 + stale 응답 체크, 로딩 실패 시 전역 상태 초기화)
- #95: 카탈로그 썸네일 — 이미지 alt 텍스트 추가, loading="lazy" 속성 추가, onerror 핸들러로 깨진 이미지 숨김

### Changed
- #94: COG HTTP 캐싱 — 캐시 설정 상수화 (GEOTIFF_BLOCK_SIZE=524288, GEOTIFF_CACHE_SIZE=500) in src/cogLayer.js, src/cogImageLayer.js

### Added
- #97: 테스트 커버리지 — vitest + @vitest/coverage-v8 devDependency 추가
- #97: package.json 스크립트 — test:unit, test:unit:coverage
- #97: vitest.config.js 생성 (v8 provider, src/**/*.js 커버리지)
- #97: .github/workflows/deploy.yml CI 단계 추가 — Run unit tests with coverage
- #97: colormap 모듈 유닛 테스트 (tests/unit/colormap.test.js)

### Quality Metrics
- Design Match Rate: 100% (42/42 items)
- Issues Resolved: 5/5
- Files Modified: 7 (index.html, src/main.js, src/cogLayer.js, src/cogImageLayer.js, src/catalogUI.js, package.json, deploy.yml)
- Files Created: 2 (vitest.config.js, tests/unit/colormap.test.js)

### Related Documents
- Plan: [docs/01-plan/features/v1.1-issues.plan.md](./features/v1.1-issues.plan.md)
- Design: [docs/02-design/features/v1.1-issues.design.md](./features/v1.1-issues.design.md)
- Analysis: [docs/03-analysis/v1.1-issues.analysis.md](./features/v1.1-issues.analysis.md)
- Report: [docs/04-report/features/v1.1-issues.report.md](./features/v1.1-issues.report.md)

### Status
- All issues resolved
- Analysis match rate: 100%
- Ready for next release or feature

---

## [2026-02-26] - Viewer Enhancement v1.0.0

### Summary
Completed comprehensive viewer enhancement feature adding interactive controls for band selection, colormap support, min/max stretch adjustment, and projection mode toggling.

### Added
- Band Selection UI (F1): RGB/single-band mode with dynamic dropdowns, supports up to 12+ bands
- Colormap Support (F2): Viridis, Inferno, Plasma colormaps with WebGL (16-stop interpolation) and Canvas (LUT lookup) support
- Min/Max Stretch Slider (F3): Real-time brightness/contrast adjustment with reset-to-auto functionality
- Projection Mode Toggle (F4): Runtime switching between Affine and Reproject modes
- New module: `src/viewerControls.js` (250+ lines) — control panel DOM and event management
- New module: `src/colormap.js` (100+ lines) — colormap LUT library with interpolation
- Control panel UI: `index.html` section with responsive layout and styling

### Changed
- `src/cogLayer.js`: Exported buildStyle, getTotalBands, createCOGSource functions
- `src/cogImageLayer.js`: Added setStats(), setColormap(), getBandInfo(), getStats() methods with proper state management
- `src/main.js`: Refactored PROJECTION_MODE from const to let, integrated viewer control event handlers
- Event propagation: Switched from CustomEvent to direct callback invocation for simpler architecture

### Fixed
- Canvas pipeline stats array immutability issue
- Band range validation (1 to totalBands bounds)
- Control state management across COG load/unload cycles

### Performance
- Min/Max adjustment: ~10-30ms per operation (negligible)
- Band change: Single full COG reload (~200-500ms)
- Colormap LUT lookup: <5ms per pixel (Canvas)

### Quality Metrics
- Design Match Rate: 94% (33/37 items exact match, 3/37 functionally equivalent alternatives, 1/37 omitted but functionally replaced)
- Code Quality: High modularity, clear separation of concerns
- Test Coverage: Ready for E2E testing on all 4 sub-features

### Related Documents
- Plan: [docs/01-plan/features/viewer-enhancement.plan.md](./features/viewer-enhancement.plan.md)
- Design: [docs/02-design/features/viewer-enhancement.design.md](./features/viewer-enhancement.design.md)
- Analysis: [docs/03-analysis/viewer-enhancement.analysis.md](./features/viewer-enhancement.analysis.md)
- Report: [docs/04-report/features/viewer-enhancement.report.md](./features/viewer-enhancement.report.md)

### Status
- PR #91 merged to main
- Branch: feat/viewer-enhancement (merged)
- Commit: [feat: viewer enhancement — band selection, colormap, min/max stretch, projection toggle]

---

## Future Cycles

### Planned Features
1. **Advanced Band Math** (Priority: High, ~2-3 weeks)
   - NDVI (Normalized Difference Vegetation Index)
   - EVI (Enhanced Vegetation Index)
   - Custom band arithmetic expressions
   - Builds on band selection UI

2. **Histogram & Distribution Analysis** (Priority: Medium, ~1-2 weeks)
   - Band histogram visualization
   - Per-band statistics display
   - Pairs well with min/max stretch

3. **Layer Blending Modes** (Priority: Low, ~1 week)
   - Multiply, Screen, Overlay modes for multi-COG visualization
   - Future enhancement

4. **Mobile Touch Optimization** (Priority: Medium, ~1 week)
   - Improved slider/dropdown UX on touch devices
   - Responsive control panel refinement

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-26 | Initial changelog created, viewer-enhancement v1.0.0 entry |
