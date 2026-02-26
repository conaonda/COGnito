# Plan: 뷰어 강화 (viewer-enhancement)

## 목표

COG 뷰어에 밴드 선택, 컬러맵, Min/Max 스트레치 슬라이더, 투영 모드 토글을 추가하여 사용자가 영상 시각화를 직접 제어할 수 있게 한다.

## 배경

현재 뷰어는 밴드 자동 감지(RGB/Gray)와 자동 Min/Max 스트레치만 지원. 다중 밴드 위성영상(4~12밴드)에서 사용자가 원하는 밴드 조합이나 컬러맵을 선택할 수 없음.

## 기능 범위

### F1. 밴드 선택 UI
- R/G/B 채널에 임의 밴드 매핑 (예: NIR-R-G → 식생 강조)
- 단일 밴드 선택 시 그레이스케일/컬러맵 적용
- COG 로드 시 총 밴드 수 감지 → 드롭다운 옵션 동적 생성

### F2. 컬러맵 적용
- 단일 밴드 모드에서 컬러맵 선택: Grayscale, Viridis, Inferno, Plasma
- WebGL: `buildStyle()` 확장 (색상 표현식에 LUT 적용)
- Canvas: `fillPixelData()` 확장 (픽셀별 LUT 룩업)

### F3. Min/Max 스트레치 슬라이더
- 현재 자동 계산된 min/max를 슬라이더로 조정
- 실시간 미리보기 (WebGL: `layer.setStyle()`, Canvas: 리렌더)
- "자동" 버튼으로 원래 통계값 복원

### F4. 투영 모드 토글
- Affine ↔ Reproject 런타임 전환
- 현재는 URL 파라미터(`?mode=affine`)로만 설정 가능 → UI 버튼 추가
- 전환 시 COG 재로드 필요 (기존 `loadCOG` 호출)

## 기술 제약

| 제약 | 영향 | 대응 |
|------|------|------|
| WebGL style 표현식에 LUT 배열 불가 | 컬러맵 구현 복잡 | 조건부 색상 보간 또는 palette source 활용 |
| Canvas 파이프라인은 CPU 기반 | 컬러맵 적용 시 성능 저하 가능 | LUT 배열 직접 룩업 (단순, 빠름) |
| 투영 모드 변경 시 COG 재로드 필요 | UX 지연 | 로딩 인디케이터 표시 |
| OpenLayers WebGLTileLayer style 변경 | `setStyle()` 호출로 가능 | 밴드 변경은 source 재생성 필요 |

## 구현 우선순위

1. **F3. Min/Max 스트레치** — 기존 stats 활용, 가장 적은 변경으로 가장 큰 효과
2. **F1. 밴드 선택** — detectBands 확장, source 재생성 필요
3. **F4. 투영 모드 토글** — loadCOG 재호출로 단순 구현
4. **F2. 컬러맵** — WebGL LUT 구현이 복잡, 마지막

## 수정 파일 예상

| 파일 | 변경 내용 |
|------|----------|
| `src/cogLayer.js` | buildStyle 확장, min/max override, 밴드 동적 선택 |
| `src/cogImageLayer.js` | fillPixelData 확장, 밴드/컬러맵 파라미터 |
| `src/main.js` | 뷰어 컨트롤 이벤트 리스너, loadCOG 파라미터 확장 |
| `src/colormap.js` (신규) | 컬러맵 LUT 정의 (viridis, inferno, plasma) |
| `index.html` | 컨트롤 패널 UI (밴드 드롭다운, 슬라이더, 버튼) + CSS |

## 검증 기준

- [ ] 다중 밴드 COG 로드 → 밴드 선택 드롭다운에 밴드 수만큼 옵션 표시
- [ ] R=4, G=3, B=2 선택 → 영상 색상 변경 확인
- [ ] 단일 밴드 + Viridis 컬러맵 → 컬러 영상 표시
- [ ] Min/Max 슬라이더 조작 → 실시간 밝기/대비 변경
- [ ] 투영 모드 토글 → Affine ↔ Reproject 전환 확인
- [ ] 모바일(Canvas 파이프라인)에서도 동일 기능 동작
