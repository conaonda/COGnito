# Changelog

## [0.3.0](https://github.com/conaonda/COGnito/compare/COGnito-v1.0.0...COGnito-v0.3.0) (2026-02-26)


### Features

* ?mode= URL 파라미터로 리프로젝션 모드 전환 지원 ([3452338](https://github.com/conaonda/COGnito/commit/3452338e8e39dcebd632321362e4603640a1b04a))
* ?mode=image 뷰포트 단위 COG 렌더링 모드 추가 ([348268e](https://github.com/conaonda/COGnito/commit/348268e5858f663e85a8e695b8920b3092693d6a))
* ?tileSize= URL 파라미터로 타일 스케일업 크기 설정 지원 ([255e113](https://github.com/conaonda/COGnito/commit/255e113ce9655482622ed42e2ee346d5f4b80346))
* add PR preview deployment pipeline ([1c87bfd](https://github.com/conaonda/COGnito/commit/1c87bfd406a174d1de2e7ca9ce6d9d3be7e39dd8))
* add PR preview deployment pipeline ([b6bcbe0](https://github.com/conaonda/COGnito/commit/b6bcbe0f81be391793f5239bfdff585fda1690b7))
* COG bands 자동 감지로 외부 파라미터 의존 제거 ([1779a63](https://github.com/conaonda/COGnito/commit/1779a634072d9b109641a6be3b66f65e2eb8e383))
* COG 레이어에 extent 및 nodata 설정 추가 ([16da104](https://github.com/conaonda/COGnito/commit/16da104987b22872ffa8b2c88cd047471a2117cc))
* COG 레이어에 opacity 파라미터 추가 ([15b7c10](https://github.com/conaonda/COGnito/commit/15b7c10cfcea0f3a59f3aa3a2eb9e456fd720dbc))
* CORS 프록시 Worker 및 cross-origin COG URL 변환 추가 ([edc99b1](https://github.com/conaonda/COGnito/commit/edc99b1a8418a75305102db864bd1dc3da33f5bc))
* GitHub Pages 배포 설정 추가 (COGnito) ([e89b09a](https://github.com/conaonda/COGnito/commit/e89b09a83666d77df6392f71a124a436a4e7c44f))
* OSM 배경지도를 VersaTiles 벡터 배경지도로 교체 ([ce3dfda](https://github.com/conaonda/COGnito/commit/ce3dfda103cc9c5f49a70a797df164d9559fbf0b))
* readRasters JS 리샘플링 제거 → Canvas GPU 스케일링 전환 및 GeoTIFF.Pool 적용 ([bd44c68](https://github.com/conaonda/COGnito/commit/bd44c683952f770964da937dc8b52fe6c6649493))
* s3:// 프로토콜 URL을 HTTPS로 자동 변환 ([#66](https://github.com/conaonda/COGnito/issues/66)) ([73db039](https://github.com/conaonda/COGnito/commit/73db03913c7002e999e9bc03b1637a3bd627e0db)), closes [#51](https://github.com/conaonda/COGnito/issues/51)
* STAC 검색 결과 페이지네이션 지원 ([#77](https://github.com/conaonda/COGnito/issues/77)) ([094a1d4](https://github.com/conaonda/COGnito/commit/094a1d4e9b1588d6f33ebfb6d4a3cebfce6380cb)), closes [#52](https://github.com/conaonda/COGnito/issues/52)
* STAC 공간 검색 조건 상세화 (포함/교차 옵션) ([#67](https://github.com/conaonda/COGnito/issues/67)) ([2374971](https://github.com/conaonda/COGnito/commit/2374971632f341655ddbd5458f8f85380499ef4c)), closes [#54](https://github.com/conaonda/COGnito/issues/54)
* UI 헤더에 앱 버전 표시 ([28eae55](https://github.com/conaonda/COGnito/commit/28eae55f42620522714fb7b6a4d4b2f7f39fe181))
* UI 헤더에 앱 버전 표시 ([c98cc2d](https://github.com/conaonda/COGnito/commit/c98cc2dac12bd16a587e1b50713109f5b9cb4cef))
* URL 입력 UI 추가 및 render 파이프라인 파라미터 분리 ([b795144](https://github.com/conaonda/COGnito/commit/b79514478fa060159e5128ca483b05f6ca47fe3d))
* v0.2.0 인증 UI E2E 테스트 및 릴리스 설정 ([#20](https://github.com/conaonda/COGnito/issues/20)) ([90e851d](https://github.com/conaonda/COGnito/commit/90e851d48ea76d7fb5894ca51ee5d37037b14378))
* v0.3.0 카탈로그 고도화 ([cce8e1c](https://github.com/conaonda/COGnito/commit/cce8e1c42080ee7134d13219575f5f8642d1876a))
* v0.3.0 카탈로그 고도화 — 메타데이터, 태그, STAC, 필터링, 썸네일 ([f4c027b](https://github.com/conaonda/COGnito/commit/f4c027bab938064ab51da128ea498cf1da5fef66))
* v1.0.0 소셜 기능 + 버전 정합성 ([#87](https://github.com/conaonda/COGnito/issues/87)) ([267a0ee](https://github.com/conaonda/COGnito/commit/267a0eeae0f48863471ed8ef501eda052744f58e))
* viewer enhancement — band selection, colormap, min/max stretch, projection toggle ([151a88d](https://github.com/conaonda/COGnito/commit/151a88d61255b05ded8a158376878410c0c434cf))
* 로그인 모달 UX 개선 ([4d042e7](https://github.com/conaonda/COGnito/commit/4d042e77c7eceabfd8502bd495108486bb06aba1))
* 로그인 모달 UX 개선 ([#27](https://github.com/conaonda/COGnito/issues/27)) ([a48eef2](https://github.com/conaonda/COGnito/commit/a48eef2a2175951f854b68009e5d7524777110e7))
* 모바일 환경 영상 화질 제어 기능 추가 ([31f6a05](https://github.com/conaonda/COGnito/commit/31f6a053b6035358225a7d10367c33f75e69cadb))
* 모바일 환경 영상 화질 제어 기능 추가 ([5b3934c](https://github.com/conaonda/COGnito/commit/5b3934cfe65ca7b79eed3ca484fa13d53b22879b))
* 수동 COG 등록 + 카탈로그 UI + 뷰어 동적 메타데이터 ([ec564bf](https://github.com/conaonda/COGnito/commit/ec564bff4b253fe8cfe134c9fb40ac04ca61a28b))
* 수동 COG 등록, 카탈로그 UI, 뷰어 동적 메타데이터 ([aff9fc7](https://github.com/conaonda/COGnito/commit/aff9fc786a9f827efdffa8bb4dbcda7dfca310da))
* 영상 영역 공유 기능 및 STAC AOI 설정 기능 ([199234b](https://github.com/conaonda/COGnito/commit/199234b6dbce092a8d16ad7cc66ae298286008fb)), closes [#55](https://github.com/conaonda/COGnito/issues/55) [#70](https://github.com/conaonda/COGnito/issues/70)
* 영상 영역 공유 및 STAC AOI 설정 기능 ([a7fa64c](https://github.com/conaonda/COGnito/commit/a7fa64c59bc753147f27d5014c31cec6bb06f220))
* 테스트 그룹화/선택적 실행 및 Supabase 브랜딩 가이드 ([add8394](https://github.com/conaonda/COGnito/commit/add839408a50e7a2da8f611af74784280d7ead64))
* 테스트 그룹화/선택적 실행 및 Supabase 브랜딩 가이드 ([a12b349](https://github.com/conaonda/COGnito/commit/a12b3492658614033c5dfa26dd014ab69e1e9cd3)), closes [#53](https://github.com/conaonda/COGnito/issues/53) [#33](https://github.com/conaonda/COGnito/issues/33)


### Bug Fixes

* applyAffineBypass 타일 사이즈 per-zoom 적용 ([da5f3ca](https://github.com/conaonda/COGnito/commit/da5f3ca26642c6ae032900784873258e5f8e428f))
* Capella SAR COG 렌더링 실패 수정 및 진단 로그 추가 ([ea20091](https://github.com/conaonda/COGnito/commit/ea2009198c66cdc2054578d286ed1dfa89eac7cc))
* CI 환경에서 04-detailed-state 테스트 실패 수정 ([0f1e501](https://github.com/conaonda/COGnito/commit/0f1e50110c641e014a49fb64cb6aa6b4ec00d3cd))
* COG overview 선택 오류 수정 및 디바운싱 개선 ([08e82b6](https://github.com/conaonda/COGnito/commit/08e82b6652efb7802a5ae7f348ed6207d064dcd0))
* cog_images INSERT RLS 정책 수정 (auth.role → auth.uid) ([4e0dc8f](https://github.com/conaonda/COGnito/commit/4e0dc8fc9a89f3bfefe12a0a88a4fc132e2963ca))
* Navigator LockManager 타임아웃으로 인한 카탈로그 조회 실패 해결 ([77628b5](https://github.com/conaonda/COGnito/commit/77628b56a6bf20488ab92174f593b33a7d53748f))
* Navigator LockManager 타임아웃으로 인한 카탈로그 조회 실패 해결 ([d1725e5](https://github.com/conaonda/COGnito/commit/d1725e51f3cb331f6da7d1cf1b74ddf789b5bfe0)), closes [#62](https://github.com/conaonda/COGnito/issues/62)
* OAuth 콜백 후 URL 해시 제거하여 stale session 방지 ([959c6d8](https://github.com/conaonda/COGnito/commit/959c6d8e5ed6fc94f0e0180e72c7e45bab884579)), closes [#57](https://github.com/conaonda/COGnito/issues/57)
* Planetary Computer COG 에셋 SAS 토큰 서명 추가 ([#64](https://github.com/conaonda/COGnito/issues/64)) ([c5b503b](https://github.com/conaonda/COGnito/commit/c5b503b63282192da92652b1861f55ac5ba376e1)), closes [#60](https://github.com/conaonda/COGnito/issues/60)
* prevent duplicate Playwright test runs on PR branches ([f0ac94e](https://github.com/conaonda/COGnito/commit/f0ac94ed3cb1502c79350d54566a1edf8daa4368))
* README 뱃지를 shields.io 동적 뱃지로 교체 ([73323b1](https://github.com/conaonda/COGnito/commit/73323b1e7d8e272b59086c2661827398953d8fe3))
* README 뱃지를 shields.io 동적 뱃지로 교체 ([5737fbf](https://github.com/conaonda/COGnito/commit/5737fbfe0918fdbbd05e51aac1a623e434bd7edd)), closes [#38](https://github.com/conaonda/COGnito/issues/38)
* resolve remaining test failures in CI ([959bd05](https://github.com/conaonda/COGnito/commit/959bd05bfa72c8f920f28d8d6baa750de8d47a9a))
* source가 이미 ready일 때 로딩 표시가 사라지지 않는 문제 수정 ([90c1e0a](https://github.com/conaonda/COGnito/commit/90c1e0a4adc919b38284a3e98e8c9de6359a89d2))
* STAC 검색 결과 카탈로그 등록 시 로그인 검증 추가 ([ced012d](https://github.com/conaonda/COGnito/commit/ced012d2be0dfce68a19a8580cd385f078766618))
* STAC 검색 결과 카탈로그 등록 시 로그인 검증 추가 ([ba855e0](https://github.com/conaonda/COGnito/commit/ba855e0373c3853cba9b3c7c302269c8bb5379fb)), closes [#58](https://github.com/conaonda/COGnito/issues/58)
* STAC 에셋에서 s3:// 스킴 URL 필터링 ([3157e0d](https://github.com/conaonda/COGnito/commit/3157e0dbe1b7d8d17c014319065151b6b13ce85d))
* style.json을 public/으로 이동하여 GitHub Pages에서 404 수정 ([a72d7ed](https://github.com/conaonda/COGnito/commit/a72d7ed1a58d6254a75af7d8432ddf936047924b))
* Supabase auth flowType을 implicit으로 명시 ([14ef6d7](https://github.com/conaonda/COGnito/commit/14ef6d7dbef3894ce9d2bf94a7d7b02071545d35))
* Supabase auth flowType을 pkce로 변경 ([c952d51](https://github.com/conaonda/COGnito/commit/c952d51da053d9514cbfcdd3f62618d214054d4c))
* SW에서 cross-origin COG 요청 인터셉트 제외 ([434dbf8](https://github.com/conaonda/COGnito/commit/434dbf8b79561296af9b6c4f6846e9790ba60cd9))
* SW의 206 partial response 캐시 에러로 인한 COG 로드 실패 수정 ([c89a9b3](https://github.com/conaonda/COGnito/commit/c89a9b37f821886f45a84420816acb7dc1a2219b))
* **tests:** vite base '/COGnito/' 경로 불일치로 인한 전체 테스트 실패 수정 ([468ac40](https://github.com/conaonda/COGnito/commit/468ac40e4e9076e5b8cb1271dd0b050797f11bd3))
* v1.0 릴리스 전 보안 수정 및 코드 정리 ([ddbdaf3](https://github.com/conaonda/COGnito/commit/ddbdaf35da352771b2a00c38d3c3a23a603d2601))
* v1.0 릴리스 전 보안 수정 및 코드 정리 ([4c028e2](https://github.com/conaonda/COGnito/commit/4c028e21145ccd173eacaa17e225185f334b02e2))
* WebGL float 텍스처 지원 감지 시 EXT_color_buffer_float 확장 활성화 ([23b9a94](https://github.com/conaonda/COGnito/commit/23b9a947ede925097a4f34608c3e204485673b13))
* Worker에서 정적 assets 설정 제거 ([1fce396](https://github.com/conaonda/COGnito/commit/1fce3967729365c2aae5e731b8b676a01bf76a41))
* 로그인 모달 변경에 맞게 auth UI 테스트 업데이트 ([#34](https://github.com/conaonda/COGnito/issues/34)) ([842e229](https://github.com/conaonda/COGnito/commit/842e229eb52f84f3fb8c0a610f0b509f838d91ec))
* 로그인 모달 변경에 맞게 auth 테스트 수정 ([2bbc5f4](https://github.com/conaonda/COGnito/commit/2bbc5f4f98f2a7a638f1b70a6b8f5496a0b5817a))
* 로그인 버튼 배치 수정 및 앱 이름 COGnito로 변경 ([#24](https://github.com/conaonda/COGnito/issues/24)) ([09948b7](https://github.com/conaonda/COGnito/commit/09948b7365be04be7dc6a716d73f45a1b87de137))
* 로그인 후 COG 뷰어 상태 및 맵 뷰 유지 ([98651fd](https://github.com/conaonda/COGnito/commit/98651fd4db51daaa44f3419f8d01f05ec1b85a29))
* 로그인 후 COG 뷰어 상태 및 맵 뷰 유지 ([683dd9b](https://github.com/conaonda/COGnito/commit/683dd9bba34bc9e4ab351f1bcf76e18b2a77ed4b)), closes [#69](https://github.com/conaonda/COGnito/issues/69)
* 로그인 후 뷰 복원 시 fit 애니메이션 경합 해소 ([bbf8ac0](https://github.com/conaonda/COGnito/commit/bbf8ac01ee1871acd8dc18c6c39ac72d9b213ee3))
* 모바일 WebGL float 텍스처 미지원 시 Canvas 2D로 자동 폴백 ([e47ad2e](https://github.com/conaonda/COGnito/commit/e47ad2e7aecbde555c1f7ee4e0d24ad6415999de))
* 모바일 화질 토글 버튼이 보이지 않는 문제 수정 ([2395a48](https://github.com/conaonda/COGnito/commit/2395a4828ac6b06dfff9e11199f3469ab5ba3cbe))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([08dbab3](https://github.com/conaonda/COGnito/commit/08dbab38f74256aac9a6894e431227074e33842e))
* 모바일에서 WebGL 타일 파이프라인 대신 image 파이프라인 강제 사용 ([a3145c0](https://github.com/conaonda/COGnito/commit/a3145c0e5a9b5225b95932d21a40f8ae32fd49c2))
* 모바일에서 영상이 가려지는 문제 수정 ([4ad30a8](https://github.com/conaonda/COGnito/commit/4ad30a828ba3783af1f9b5251cf1e3510de42096))
* 배포 워크플로 안정화 및 preview 빌드 검증 추가 ([d14f144](https://github.com/conaonda/COGnito/commit/d14f14485787445585becfff09258019c36e2d0d))
* 영상 정보 패널에서 긴 파일명 오버플로우 수정 ([c186028](https://github.com/conaonda/COGnito/commit/c18602803c7533fa99f4acf6068aaf5aa68e4df5))
* 줌 아웃 시 COG overview 선택 오류 수정 및 디바운싱 개선 ([0bf1bf9](https://github.com/conaonda/COGnito/commit/0bf1bf9ddefee32914954b167b43e56603d343a8)), closes [#56](https://github.com/conaonda/COGnito/issues/56) [#68](https://github.com/conaonda/COGnito/issues/68)
* 테스트 안정성 개선 - window.map 충돌 및 성능 임계값 수정 ([228cc12](https://github.com/conaonda/COGnito/commit/228cc12748f39e60843db9f1b1d27d8515f55376))
* 프록시 경유 시 파일명과 URL이 프록시 주소로 표시되는 문제 수정 ([9ff5de2](https://github.com/conaonda/COGnito/commit/9ff5de2ad09b60a9b3af588c04e03a1504d1e341))
* 프록시가 필요한 호스트만 경유하도록 수정 및 에러 응답에 CORS 헤더 추가 ([6a87c6e](https://github.com/conaonda/COGnito/commit/6a87c6eeedc9ad546f41bc0136c27aa33f7e065e))
* 회원가입 인증 메일 리다이렉트 URL에 BASE_URL 추가 ([7775f5f](https://github.com/conaonda/COGnito/commit/7775f5f6d01accc20f55409ad494034e429ea9e0))
* 회전된 SAR GeoTIFF 위치/회전 오류 수정 ([6a1682c](https://github.com/conaonda/COGnito/commit/6a1682cb1a83004b48b46ba047d015a077b956ee))
* 회전된 SAR 영상 줌인 시 타일 누락 수정 ([aaf36bc](https://github.com/conaonda/COGnito/commit/aaf36bcb274f3d5438d1837915fae52f2f3d43f3))


### Performance Improvements

* COG HTTP 요청 횟수 감소를 위한 세 가지 전략 적용 ([3eb607c](https://github.com/conaonda/COGnito/commit/3eb607ce1c0b3eea06150d13f5146fcb0b4fd593))
* COG 헤더 중복 fetch 제거, preconnect 힌트, DOM 캐싱, 벤더 청크 분리 ([5a23586](https://github.com/conaonda/COGnito/commit/5a23586726528ec48d5848c8bc03d748ca73fb35))
* 아핀 변환 기반 UTM→3857 리프로젝션 우회로 Pan/Zoom FPS 개선 ([65d2bee](https://github.com/conaonda/COGnito/commit/65d2bee8962f664739423514ecab2624e4a62e1e))


### Miscellaneous Chores

* v0.3.0 릴리스 — 로드맵 마일스톤 완료에 따른 버전 범프 ([#73](https://github.com/conaonda/COGnito/issues/73)) ([9788115](https://github.com/conaonda/COGnito/commit/97881156e634c1f072cc645ed75a9922f266b641))
* v0.3.0 릴리스 — 로드맵 마일스톤 완료에 따른 버전 범프 ([#75](https://github.com/conaonda/COGnito/issues/75)) ([2854b76](https://github.com/conaonda/COGnito/commit/2854b76f35d47709362528b5b7e6d9268d2c0e64))

## [0.3.0](https://github.com/conaonda/COGnito/compare/COGnito-v0.3.0...COGnito-v0.3.0) (2026-02-24)


### Features

* STAC 검색 결과 페이지네이션 지원 ([#77](https://github.com/conaonda/COGnito/issues/77)) ([094a1d4](https://github.com/conaonda/COGnito/commit/094a1d4e9b1588d6f33ebfb6d4a3cebfce6380cb)), closes [#52](https://github.com/conaonda/COGnito/issues/52)


### Miscellaneous Chores

* v0.3.0 릴리스 — 로드맵 마일스톤 완료에 따른 버전 범프 ([#75](https://github.com/conaonda/COGnito/issues/75)) ([2854b76](https://github.com/conaonda/COGnito/commit/2854b76f35d47709362528b5b7e6d9268d2c0e64))

## [0.3.0](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.6...COGnito-v0.3.0) (2026-02-24)


### Miscellaneous Chores

* v0.3.0 릴리스 — 로드맵 마일스톤 완료에 따른 버전 범프 ([#73](https://github.com/conaonda/COGnito/issues/73)) ([9788115](https://github.com/conaonda/COGnito/commit/97881156e634c1f072cc645ed75a9922f266b641))

## [0.2.6](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.5...COGnito-v0.2.6) (2026-02-24)


### Features

* s3:// 프로토콜 URL을 HTTPS로 자동 변환 ([#66](https://github.com/conaonda/COGnito/issues/66)) ([73db039](https://github.com/conaonda/COGnito/commit/73db03913c7002e999e9bc03b1637a3bd627e0db)), closes [#51](https://github.com/conaonda/COGnito/issues/51)
* STAC 공간 검색 조건 상세화 (포함/교차 옵션) ([#67](https://github.com/conaonda/COGnito/issues/67)) ([2374971](https://github.com/conaonda/COGnito/commit/2374971632f341655ddbd5458f8f85380499ef4c)), closes [#54](https://github.com/conaonda/COGnito/issues/54)


### Bug Fixes

* Planetary Computer COG 에셋 SAS 토큰 서명 추가 ([#64](https://github.com/conaonda/COGnito/issues/64)) ([c5b503b](https://github.com/conaonda/COGnito/commit/c5b503b63282192da92652b1861f55ac5ba376e1)), closes [#60](https://github.com/conaonda/COGnito/issues/60)

## [0.2.5](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.4...COGnito-v0.2.5) (2026-02-24)


### Features

* CORS 프록시 Worker 및 cross-origin COG URL 변환 추가 ([edc99b1](https://github.com/conaonda/COGnito/commit/edc99b1a8418a75305102db864bd1dc3da33f5bc))
* v0.3.0 카탈로그 고도화 ([cce8e1c](https://github.com/conaonda/COGnito/commit/cce8e1c42080ee7134d13219575f5f8642d1876a))
* v0.3.0 카탈로그 고도화 — 메타데이터, 태그, STAC, 필터링, 썸네일 ([f4c027b](https://github.com/conaonda/COGnito/commit/f4c027bab938064ab51da128ea498cf1da5fef66))


### Bug Fixes

* cog_images INSERT RLS 정책 수정 (auth.role → auth.uid) ([4e0dc8f](https://github.com/conaonda/COGnito/commit/4e0dc8fc9a89f3bfefe12a0a88a4fc132e2963ca))
* Navigator LockManager 타임아웃으로 인한 카탈로그 조회 실패 해결 ([77628b5](https://github.com/conaonda/COGnito/commit/77628b56a6bf20488ab92174f593b33a7d53748f))
* Navigator LockManager 타임아웃으로 인한 카탈로그 조회 실패 해결 ([d1725e5](https://github.com/conaonda/COGnito/commit/d1725e51f3cb331f6da7d1cf1b74ddf789b5bfe0)), closes [#62](https://github.com/conaonda/COGnito/issues/62)
* OAuth 콜백 후 URL 해시 제거하여 stale session 방지 ([959c6d8](https://github.com/conaonda/COGnito/commit/959c6d8e5ed6fc94f0e0180e72c7e45bab884579)), closes [#57](https://github.com/conaonda/COGnito/issues/57)
* STAC 에셋에서 s3:// 스킴 URL 필터링 ([3157e0d](https://github.com/conaonda/COGnito/commit/3157e0dbe1b7d8d17c014319065151b6b13ce85d))
* Supabase auth flowType을 implicit으로 명시 ([14ef6d7](https://github.com/conaonda/COGnito/commit/14ef6d7dbef3894ce9d2bf94a7d7b02071545d35))
* Supabase auth flowType을 pkce로 변경 ([c952d51](https://github.com/conaonda/COGnito/commit/c952d51da053d9514cbfcdd3f62618d214054d4c))
* SW에서 cross-origin COG 요청 인터셉트 제외 ([434dbf8](https://github.com/conaonda/COGnito/commit/434dbf8b79561296af9b6c4f6846e9790ba60cd9))
* SW의 206 partial response 캐시 에러로 인한 COG 로드 실패 수정 ([c89a9b3](https://github.com/conaonda/COGnito/commit/c89a9b37f821886f45a84420816acb7dc1a2219b))
* Worker에서 정적 assets 설정 제거 ([1fce396](https://github.com/conaonda/COGnito/commit/1fce3967729365c2aae5e731b8b676a01bf76a41))
* 프록시 경유 시 파일명과 URL이 프록시 주소로 표시되는 문제 수정 ([9ff5de2](https://github.com/conaonda/COGnito/commit/9ff5de2ad09b60a9b3af588c04e03a1504d1e341))
* 프록시가 필요한 호스트만 경유하도록 수정 및 에러 응답에 CORS 헤더 추가 ([6a87c6e](https://github.com/conaonda/COGnito/commit/6a87c6eeedc9ad546f41bc0136c27aa33f7e065e))

## [0.2.4](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.3...COGnito-v0.2.4) (2026-02-22)


### Features

* 수동 COG 등록 + 카탈로그 UI + 뷰어 동적 메타데이터 ([ec564bf](https://github.com/conaonda/COGnito/commit/ec564bff4b253fe8cfe134c9fb40ac04ca61a28b))
* 수동 COG 등록, 카탈로그 UI, 뷰어 동적 메타데이터 ([aff9fc7](https://github.com/conaonda/COGnito/commit/aff9fc786a9f827efdffa8bb4dbcda7dfca310da))


### Bug Fixes

* 영상 정보 패널에서 긴 파일명 오버플로우 수정 ([c186028](https://github.com/conaonda/COGnito/commit/c18602803c7533fa99f4acf6068aaf5aa68e4df5))

## [0.2.3](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.2...COGnito-v0.2.3) (2026-02-22)


### Bug Fixes

* README 뱃지를 shields.io 동적 뱃지로 교체 ([73323b1](https://github.com/conaonda/COGnito/commit/73323b1e7d8e272b59086c2661827398953d8fe3))
* README 뱃지를 shields.io 동적 뱃지로 교체 ([5737fbf](https://github.com/conaonda/COGnito/commit/5737fbfe0918fdbbd05e51aac1a623e434bd7edd)), closes [#38](https://github.com/conaonda/COGnito/issues/38)

## [0.2.2](https://github.com/conaonda/COGnito/compare/COGnito-v0.2.1...COGnito-v0.2.2) (2026-02-22)


### Features

* 로그인 모달 UX 개선 ([4d042e7](https://github.com/conaonda/COGnito/commit/4d042e77c7eceabfd8502bd495108486bb06aba1))
* 로그인 모달 UX 개선 ([#27](https://github.com/conaonda/COGnito/issues/27)) ([a48eef2](https://github.com/conaonda/COGnito/commit/a48eef2a2175951f854b68009e5d7524777110e7))


### Bug Fixes

* 로그인 모달 변경에 맞게 auth UI 테스트 업데이트 ([#34](https://github.com/conaonda/COGnito/issues/34)) ([842e229](https://github.com/conaonda/COGnito/commit/842e229eb52f84f3fb8c0a610f0b509f838d91ec))
* 로그인 모달 변경에 맞게 auth 테스트 수정 ([2bbc5f4](https://github.com/conaonda/COGnito/commit/2bbc5f4f98f2a7a638f1b70a6b8f5496a0b5817a))
* 회원가입 인증 메일 리다이렉트 URL에 BASE_URL 추가 ([7775f5f](https://github.com/conaonda/COGnito/commit/7775f5f6d01accc20f55409ad494034e429ea9e0))

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
