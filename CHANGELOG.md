# Changelog

## [0.2.1](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.0...COGnito-v0.2.1) (2026-02-22)


### Bug Fixes

* 로그인 버튼 배치 수정 및 앱 이름 COGnito로 변경 ([#24](https://github.com/conaonda/COGnito/issues/24)) ([09948b7](https://github.com/conaonda/COGnito/commit/09948b7365be04be7dc6a716d73f45a1b87de137))

## [0.2.0](https://github.com/conaonda/COGnito/compare/COGnito-v0.1.2...COGnito-v0.2.0) (2026-02-22)


### Features

* v0.2.0 BaaS 인프라 + 소셜 로그인 구현 ([#19](https://github.com/conaonda/COGnito/issues/19)) ([33ecabc](https://github.com/conaonda/COGnito/commit/33ecabc62f328dd88021e7e3fe74809ee01cf1c8))
  - Supabase 클라이언트 싱글턴 (환경변수 미설정 시 graceful degradation)
  - GitHub/Google OAuth 소셜 로그인
  - 헤더 내 인증 UI (로그인 버튼, 아바타+이름+로그아웃)
  - DB 스키마 마이그레이션 (profiles, cog\_images, likes, watchlists, watchlist\_items)
  - Supabase 설정 자동화 스크립트 (npm run setup)
* v0.2.0 인증 UI E2E 테스트 및 릴리스 설정 ([#20](https://github.com/conaonda/COGnito/issues/20)) ([90e851d](https://github.com/conaonda/COGnito/commit/90e851d48ea76d7fb5894ca51ee5d37037b14378))


### Bug Fixes

* style.json 폰트명 수정 (noto\_sans\_regular → Noto Sans Regular, 40곳) ([#19](https://github.com/conaonda/COGnito/issues/19)) ([22b87da](https://github.com/conaonda/COGnito/commit/22b87da))


## [0.1.2](https://github.com/conaonda/COGnito/compare/COGnito-v0.1.1...COGnito-v0.1.2) (2026-02-21)


### Features

* ?mode= URL 파라미터로 리프로젝션 모드 전환 지원 ([3452338](https://github.com/conaonda/COGnito/commit/3452338e8e39dcebd632321362e4603640a1b04a))
* ?mode=image 뷰포트 단위 COG 렌더링 모드 추가 ([348268e](https://github.com/conaonda/COGnito/commit/348268e5858f663e85a8e695b8920b3092693d6a))
* ?tileSize= URL 파라미터로 타일 스케일업 크기 설정 지원 ([255e113](https://github.com/conaonda/COGnito/commit/255e113ce9655482622ed42e2ee346d5f4b80346))
* add PR preview deployment pipeline ([1c87bfd](https://github.com/conaonda/COGnito/commit/1c87bfd406a174d1de2e7ca9ce6d9d3be7e39dd8))
* add PR preview deployment pipeline ([b6bcbe0](https://github.com/conaonda/COGnito/commit/b6bcbe0f81be391793f5239bfdff585fda1690b7))
* COG bands 자동 감지로 외부 파라미터 의존 제거 ([1779a63](https://github.com/conaonda/COGnito/commit/1779a634072d9b109641a6be3b66f65e2eb8e383))
* COG 레이어에 extent 및 nodata 설정 추가 ([16da104](https://github.com/conaonda/COGnito/commit/16da104987b22872ffa8b2c88cd047471a2117cc))
* COG 레이어에 opacity 파라미터 추가 ([15b7c10](https://github.com/conaonda/COGnito/commit/15b7c10cfcea0f3a59f3aa3a2eb9e456fd720dbc))
* GitHub Pages 배포 설정 추가 (COGnito) ([e89b09a](https://github.com/conaonda/COGnito/commit/e89b09a83666d77df6392f71a124a436a4e7c44f))
* OSM 배경지도를 VersaTiles 벡터 배경지도로 교체 ([ce3dfda](https://github.com/conaonda/COGnito/commit/ce3dfda103cc9c5f49a70a797df164d9559fbf0b))
* readRasters JS 리샘플링 제거 → Canvas GPU 스케일링 전환 및 GeoTIFF.Pool 적용 ([bd44c68](https://github.com/conaonda/COGnito/commit/bd44c683952f770964da937dc8b52fe6c6649493))
* UI 헤더에 앱 버전 표시 ([28eae55](https://github.com/conaonda/COGnito/commit/28eae55f42620522714fb7b6a4d4b2f7f39fe181))
* UI 헤더에 앱 버전 표시 ([c98cc2d](https://github.com/conaonda/COGnito/commit/c98cc2dac12bd16a587e1b50713109f5b9cb4cef))
* URL 입력 UI 추가 및 render 파이프라인 파라미터 분리 ([b795144](https://github.com/conaonda/COGnito/commit/b79514478fa060159e5128ca483b05f6ca47fe3d))
* 모바일 환경 영상 화질 제어 기능 추가 ([31f6a05](https://github.com/conaonda/COGnito/commit/31f6a053b6035358225a7d10367c33f75e69cadb))
* 모바일 환경 영상 화질 제어 기능 추가 ([5b3934c](https://github.com/conaonda/COGnito/commit/5b3934cfe65ca7b79eed3ca484fa13d53b22879b))


### Bug Fixes

* applyAffineBypass 타일 사이즈 per-zoom 적용 ([da5f3ca](https://github.com/conaonda/COGnito/commit/da5f3ca26642c6ae032900784873258e5f8e428f))
* Capella SAR COG 렌더링 실패 수정 및 진단 로그 추가 ([ea20091](https://github.com/conaonda/COGnito/commit/ea2009198c66cdc2054578d286ed1dfa89eac7cc))
* CI 환경에서 04-detailed-state 테스트 실패 수정 ([0f1e501](https://github.com/conaonda/COGnito/commit/0f1e50110c641e014a49fb64cb6aa6b4ec00d3cd))
* prevent duplicate Playwright test runs on PR branches ([f0ac94e](https://github.com/conaonda/COGnito/commit/f0ac94ed3cb1502c79350d54566a1edf8daa4368))
* resolve remaining test failures in CI ([959bd05](https://github.com/conaonda/COGnito/commit/959bd05bfa72c8f920f28d8d6baa750de8d47a9a))
* source가 이미 ready일 때 로딩 표시가 사라지지 않는 문제 수정 ([90c1e0a](https://github.com/conaonda/COGnito/commit/90c1e0a4adc919b38284a3e98e8c9de6359a89d2))
* style.json을 public/으로 이동하여 GitHub Pages에서 404 수정 ([a72d7ed](https://github.com/conaonda/COGnito/commit/a72d7ed1a58d6254a75af7d8432ddf936047924b))
* **tests:** vite base '/COGnito/' 경로 불일치로 인한 전체 테스트 실패 수정 ([468ac40](https://github.com/conaonda/COGnito/commit/468ac40e4e9076e5b8cb1271dd0b050797f11bd3))
* WebGL float 텍스처 지원 감지 시 EXT_color_buffer_float 확장 활성화 ([23b9a94](https://github.com/conaonda/COGnito/commit/23b9a947ede925097a4f34608c3e204485673b13))
* 모바일 WebGL float 텍스처 미지원 시 Canvas 2D로 자동 폴백 ([e47ad2e](https://github.com/conaonda/COGnito/commit/e47ad2e7aecbde555c1f7ee4e0d24ad6415999de))
* 모바일 화질 토글 버튼이 보이지 않는 문제 수정 ([2395a48](https://github.com/conaonda/COGnito/commit/2395a4828ac6b06dfff9e11199f3469ab5ba3cbe))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([08dbab3](https://github.com/conaonda/COGnito/commit/08dbab38f74256aac9a6894e431227074e33842e))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([a3145c0](https://github.com/conaonda/COGnito/commit/a3145c0e5a9b5225b95932d21a40f8ae32fd49c2))
* 모바일에서 영상이 가려지는 문제 수정 ([4ad30a8](https://github.com/conaonda/COGnito/commit/4ad30a828ba3783af1f9b5251cf1e3510de42096))
* 배포 워크플로 안정화 및 preview 빌드 검증 추가 ([d14f144](https://github.com/conaonda/COGnito/commit/d14f14485787445585becfff09258019c36e2d0d))
* 테스트 안정성 개선 - window.map 충돌 및 성능 임계값 수정 ([228cc12](https://github.com/conaonda/COGnito/commit/228cc12748f39e60843db9f1b1d27d8515f55376))
* 회전된 SAR GeoTIFF 위치/회전 오류 수정 ([6a1682c](https://github.com/conaonda/COGnito/commit/6a1682cb1a83004b48b46ba047d015a077b956ee))
* 회전된 SAR 영상 줌인 시 타일 누락 수정 ([aaf36bc](https://github.com/conaonda/COGnito/commit/aaf36bcb274f3d5438d1837915fae52f2f3d43f3))


### Performance Improvements

* COG HTTP 요청 횟수 감소를 위한 세 가지 전략 적용 ([3eb607c](https://github.com/conaonda/COGnito/commit/3eb607ce1c0b3eea06150d13f5146fcb0b4fd593))
* COG 헤더 중복 fetch 제거, preconnect 힌트, DOM 캐싱, 벤더 청크 분리 ([5a23586](https://github.com/conaonda/COGnito/commit/5a23586726528ec48d5848c8bc03d748ca73fb35))
* 아핀 변환 기반 UTM→3857 리프로젝션 우회로 Pan/Zoom FPS 개선 ([65d2bee](https://github.com/conaonda/COGnito/commit/65d2bee8962f664739423514ecab2624e4a62e1e))

## [0.1.1](https://github.com/conaonda/COGnito/compare/cog-viewer-openlayers-v0.1.0...cog-viewer-openlayers-v0.1.1) (2026-02-21)


### Features

* ?mode= URL 파라미터로 리프로젝션 모드 전환 지원 ([3452338](https://github.com/conaonda/COGnito/commit/3452338e8e39dcebd632321362e4603640a1b04a))
* ?mode=image 뷰포트 단위 COG 렌더링 모드 추가 ([348268e](https://github.com/conaonda/COGnito/commit/348268e5858f663e85a8e695b8920b3092693d6a))
* ?tileSize= URL 파라미터로 타일 스케일업 크기 설정 지원 ([255e113](https://github.com/conaonda/COGnito/commit/255e113ce9655482622ed42e2ee346d5f4b80346))
* add PR preview deployment pipeline ([1c87bfd](https://github.com/conaonda/COGnito/commit/1c87bfd406a174d1de2e7ca9ce6d9d3be7e39dd8))
* add PR preview deployment pipeline ([b6bcbe0](https://github.com/conaonda/COGnito/commit/b6bcbe0f81be391793f5239bfdff585fda1690b7))
* COG bands 자동 감지로 외부 파라미터 의존 제거 ([1779a63](https://github.com/conaonda/COGnito/commit/1779a634072d9b109641a6be3b66f65e2eb8e383))
* COG 레이어에 extent 및 nodata 설정 추가 ([16da104](https://github.com/conaonda/COGnito/commit/16da104987b22872ffa8b2c88cd047471a2117cc))
* COG 레이어에 opacity 파라미터 추가 ([15b7c10](https://github.com/conaonda/COGnito/commit/15b7c10cfcea0f3a59f3aa3a2eb9e456fd720dbc))
* GitHub Pages 배포 설정 추가 (COGnito) ([e89b09a](https://github.com/conaonda/COGnito/commit/e89b09a83666d77df6392f71a124a436a4e7c44f))
* OSM 배경지도를 VersaTiles 벡터 배경지도로 교체 ([ce3dfda](https://github.com/conaonda/COGnito/commit/ce3dfda103cc9c5f49a70a797df164d9559fbf0b))
* readRasters JS 리샘플링 제거 → Canvas GPU 스케일링 전환 및 GeoTIFF.Pool 적용 ([bd44c68](https://github.com/conaonda/COGnito/commit/bd44c683952f770964da937dc8b52fe6c6649493))
* UI 헤더에 앱 버전 표시 ([28eae55](https://github.com/conaonda/COGnito/commit/28eae55f42620522714fb7b6a4d4b2f7f39fe181))
* UI 헤더에 앱 버전 표시 ([c98cc2d](https://github.com/conaonda/COGnito/commit/c98cc2dac12bd16a587e1b50713109f5b9cb4cef))
* URL 입력 UI 추가 및 render 파이프라인 파라미터 분리 ([b795144](https://github.com/conaonda/COGnito/commit/b79514478fa060159e5128ca483b05f6ca47fe3d))
* 모바일 환경 영상 화질 제어 기능 추가 ([31f6a05](https://github.com/conaonda/COGnito/commit/31f6a053b6035358225a7d10367c33f75e69cadb))
* 모바일 환경 영상 화질 제어 기능 추가 ([5b3934c](https://github.com/conaonda/COGnito/commit/5b3934cfe65ca7b79eed3ca484fa13d53b22879b))


### Bug Fixes

* applyAffineBypass 타일 사이즈 per-zoom 적용 ([da5f3ca](https://github.com/conaonda/COGnito/commit/da5f3ca26642c6ae032900784873258e5f8e428f))
* Capella SAR COG 렌더링 실패 수정 및 진단 로그 추가 ([ea20091](https://github.com/conaonda/COGnito/commit/ea2009198c66cdc2054578d286ed1dfa89eac7cc))
* CI 환경에서 04-detailed-state 테스트 실패 수정 ([0f1e501](https://github.com/conaonda/COGnito/commit/0f1e50110c641e014a49fb64cb6aa6b4ec00d3cd))
* prevent duplicate Playwright test runs on PR branches ([f0ac94e](https://github.com/conaonda/COGnito/commit/f0ac94ed3cb1502c79350d54566a1edf8daa4368))
* resolve remaining test failures in CI ([959bd05](https://github.com/conaonda/COGnito/commit/959bd05bfa72c8f920f28d8d6baa750de8d47a9a))
* source가 이미 ready일 때 로딩 표시가 사라지지 않는 문제 수정 ([90c1e0a](https://github.com/conaonda/COGnito/commit/90c1e0a4adc919b38284a3e98e8c9de6359a89d2))
* style.json을 public/으로 이동하여 GitHub Pages에서 404 수정 ([a72d7ed](https://github.com/conaonda/COGnito/commit/a72d7ed1a58d6254a75af7d8432ddf936047924b))
* **tests:** vite base '/COGnito/' 경로 불일치로 인한 전체 테스트 실패 수정 ([468ac40](https://github.com/conaonda/COGnito/commit/468ac40e4e9076e5b8cb1271dd0b050797f11bd3))
* WebGL float 텍스처 지원 감지 시 EXT_color_buffer_float 확장 활성화 ([23b9a94](https://github.com/conaonda/COGnito/commit/23b9a947ede925097a4f34608c3e204485673b13))
* 모바일 WebGL float 텍스처 미지원 시 Canvas 2D로 자동 폴백 ([e47ad2e](https://github.com/conaonda/COGnito/commit/e47ad2e7aecbde555c1f7ee4e0d24ad6415999de))
* 모바일 화질 토글 버튼이 보이지 않는 문제 수정 ([2395a48](https://github.com/conaonda/COGnito/commit/2395a4828ac6b06dfff9e11199f3469ab5ba3cbe))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([08dbab3](https://github.com/conaonda/COGnito/commit/08dbab38f74256aac9a6894e431227074e33842e))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([a3145c0](https://github.com/conaonda/COGnito/commit/a3145c0e5a9b5225b95932d21a40f8ae32fd49c2))
* 모바일에서 영상이 가려지는 문제 수정 ([4ad30a8](https://github.com/conaonda/COGnito/commit/4ad30a828ba3783af1f9b5251cf1e3510de42096))
* 배포 워크플로 안정화 및 preview 빌드 검증 추가 ([d14f144](https://github.com/conaonda/COGnito/commit/d14f14485787445585becfff09258019c36e2d0d))
* 테스트 안정성 개선 - window.map 충돌 및 성능 임계값 수정 ([228cc12](https://github.com/conaonda/COGnito/commit/228cc12748f39e60843db9f1b1d27d8515f55376))
* 회전된 SAR GeoTIFF 위치/회전 오류 수정 ([6a1682c](https://github.com/conaonda/COGnito/commit/6a1682cb1a83004b48b46ba047d015a077b956ee))
* 회전된 SAR 영상 줌인 시 타일 누락 수정 ([aaf36bc](https://github.com/conaonda/COGnito/commit/aaf36bcb274f3d5438d1837915fae52f2f3d43f3))


### Performance Improvements

* COG HTTP 요청 횟수 감소를 위한 세 가지 전략 적용 ([3eb607c](https://github.com/conaonda/COGnito/commit/3eb607ce1c0b3eea06150d13f5146fcb0b4fd593))
* COG 헤더 중복 fetch 제거, preconnect 힌트, DOM 캐싱, 벤더 청크 분리 ([5a23586](https://github.com/conaonda/COGnito/commit/5a23586726528ec48d5848c8bc03d748ca73fb35))
* 아핀 변환 기반 UTM→3857 리프로젝션 우회로 Pan/Zoom FPS 개선 ([65d2bee](https://github.com/conaonda/COGnito/commit/65d2bee8962f664739423514ecab2624e4a62e1e))
