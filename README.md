# naejipgak-mcp

> Korean README first. English README follows below.

내집각 청약 조건 확인용 로컬 우선 MCP 서버입니다. MCP 클라이언트(Claude Desktop, Codex, Hermes, Gemini, Cursor 등)가 `check_eligibility` 같은 도구를 호출하면, 이 서버가 청약 1순위·특별공급·소득조건·자금 여력·공식근거 확인 여부를 JSON으로 판정합니다.

기본 모드는 **번들 룰(bundled_rules)** 입니다. 즉, DB·로그인·호스팅 서버·API 키 없이 로컬에서 바로 실행됩니다. KOSIS 키가 있으면 **KOSIS 공식 통계 근거를 사용하는 구조**로 설정할 수 있습니다.

---

## 1. 이 MCP의 사용 구조

```text
사용자 / AI 에이전트
  ↓ MCP tool call
MCP 클라이언트
  예: Claude Desktop, Codex, Hermes, Gemini, Cursor
  ↓ stdio JSON-RPC
naejipgak-mcp
  src/mcp-server.js
  ↓
도구 레이어
  check_eligibility
  explain_rule
  list_rules
  compare_scenarios
  ↓
판정 엔진
  src/engine/evaluator.js
  src/engine/normalizer.js
  src/engine/advisory-conditions.js
  src/engine/official-api.js
  ↓
룰 데이터 / 공식근거 상태
  src/data/rules/*.json
  KOSIS_API_KEY / KOSIS_USER_STATS_ID 선택 사용
  ↓
결과 JSON
  overall_status
  data_basis
  official_data
  checks.first_priority
  checks.special_supply
  checks.funding
  checks.advisory_conditions
```

핵심은 이 서버가 “청약 조건 계산 도구”로 MCP에 붙는다는 점입니다. AI가 임의로 답하는 것이 아니라, 입력값을 정규화한 뒤 룰 엔진 결과를 받아 설명합니다.

---

## 2. 제공 MCP 도구

```text
check_eligibility
  - 1순위, 특별공급, 소득조건, 자금 여력, 공식근거 확인 여부를 한 번에 판정

explain_rule
  - 지원하는 특정 룰 또는 룰 그룹 설명

list_rules
  - 현재 번들 룰, 소득 기준표, 출처, KOSIS 설정 메타데이터 확인

compare_scenarios
  - 여러 신청자 시나리오를 나란히 비교
```

---

## 3. KOSIS 키가 필요한 이유

소득조건 확인에는 보통 “도시근로자 가구원수별 월평균소득” 같은 공식 통계 기준이 필요합니다. 이 값은 연도와 공고 기준에 따라 달라질 수 있으므로, 운영 용도에서는 KOSIS 또는 공고문 원문 기준 확인이 필요합니다.

이 패키지는 두 단계로 동작합니다.

```text
기본값: bundled_rules
  - 패키지에 포함된 투명한 샘플/기준 룰로 판정
  - API 키 불필요
  - OSS 리뷰와 로컬 테스트에 적합

선택값: kosis 또는 public_api
  - 사용자가 직접 발급받은 KOSIS API 키와 userStatsId 설정
  - 결과의 official_data에 KOSIS 설정 상태 기록
  - 키 값은 응답에 포함하지 않음
```

현재 구현 상태:

```text
완료
  - KOSIS 키/userStatsId 설정 여부 감지
  - data_basis: "kosis" 또는 "public_api" 요청 처리
  - 키 누락 시 번들 룰 fallback
  - 소득조건 판정 로직 자체는 번들 income-limits.json 기준으로 동작

다음 단계
  - KOSIS statisticsData.do 실제 호출
  - userStatsId 등록 URL 기반 행 조회
  - 가구원수별 소득 기준 행 파싱
  - KOSIS 값으로 income-limits 갱신/override
```

---

## 4. KOSIS 설정

KOSIS 국가통계포털 OpenAPI에서 API 키를 발급받고, 사용할 통계표/URL을 등록해 `userStatsId`를 확보합니다.

```bash
export KOSIS_API_KEY="<your-kosis-api-key>"
export KOSIS_USER_STATS_ID="<your-kosis-user-stats-id>"

# 선택: 기본 endpoint를 바꿔야 할 때만 사용
export KOSIS_BASE_URL="https://kosis.kr/openapi/statisticsData.do"
```

이전 호환 환경변수도 일부 지원합니다.

```bash
export NAEJIPGAK_PUBLIC_DATA_API_KEY="<legacy-key>"
export NAEJIPGAK_PUBLIC_DATA_BASE_URL="<legacy-base-url>"
```

요청 예시:

```json
{
  "data_basis": "kosis",
  "region": "서울",
  "region_type": "speculative",
  "subscription_months": 30,
  "subscription_payments": 30,
  "is_householder": true,
  "is_homeless_household": true,
  "special_supply_type": "newlywed",
  "is_married": true,
  "household_size": 2,
  "monthly_income_krw": 7000000,
  "price_krw": 600000000,
  "cash_krw": 450000000,
  "official_source_checked": true,
  "announcement_url": "https://example.go.kr/notice/2026-001",
  "announcement_date": "2026-06-05",
  "income_basis_year": 2026,
  "asset_reviewed": true,
  "extra_costs_reviewed": true
}
```

응답 일부 예시:

```json
{
  "overall_status": "possible",
  "data_basis": "kosis",
  "official_data": {
    "active": true,
    "provider": "KOSIS 국가통계포털 OpenAPI(statisticsData.do)",
    "api_key_env": "KOSIS_API_KEY",
    "api_key_configured": true,
    "user_stats_id_env": "KOSIS_USER_STATS_ID",
    "user_stats_id_configured": true
  }
}
```

---

## 5. 설치 / 로컬 실행

```bash
npm install
npm test
npm run mcp
```

패키지 실행:

```bash
npx naejipgak-mcp
```

---

## 6. MCP 클라이언트 설정 예시

이 서버는 표준 MCP stdio JSON-RPC 서버라서 특정 AI 서비스에 종속되지 않습니다. Node.js 20+가 있고 MCP stdio 서버를 등록할 수 있는 클라이언트라면 같은 방식으로 붙일 수 있습니다.

```text
검증 대상 클라이언트 범주
- Claude / Claude Desktop: mcpServers stdio 설정
- Hermes Agent: mcp_servers stdio 설정
- Codex CLI: MCP stdio 서버 등록을 지원하는 환경
- Gemini CLI: MCP stdio 서버 등록을 지원하는 환경
```

주의: 각 클라이언트의 설정 파일 위치와 키 이름은 버전에 따라 다를 수 있습니다. 공통 핵심은 `command`와 `args`로 이 서버의 stdio 엔트리포인트를 실행하고, 필요한 경우 `env`에 KOSIS 값을 명시하는 것입니다.

Claude Desktop 예시:

```json
{
  "mcpServers": {
    "naejipgak": {
      "command": "node",
      "args": ["/absolute/path/to/naejipgak-mcp/src/mcp-server.js"],
      "env": {
        "KOSIS_API_KEY": "<your-kosis-api-key>",
        "KOSIS_USER_STATS_ID": "<your-kosis-user-stats-id>"
      }
    }
  }
}
```

공개 배포/로컬 패키지 설치 후에는 다음처럼 단순화할 수 있습니다.

```json
{
  "mcpServers": {
    "naejipgak": {
      "command": "npx",
      "args": ["naejipgak-mcp"],
      "env": {
        "KOSIS_API_KEY": "<your-kosis-api-key>",
        "KOSIS_USER_STATS_ID": "<your-kosis-user-stats-id>"
      }
    }
  }
}
```

---

## 7. 프로젝트 구조

```text
naejipgak-mcp/
├─ src/
│  ├─ mcp-server.js                  MCP stdio JSON-RPC 서버
│  ├─ tools/                         MCP tool 정의/핸들러
│  │  ├─ check-eligibility.js
│  │  ├─ explain-rule.js
│  │  ├─ list-rules.js
│  │  └─ compare-scenarios.js
│  ├─ engine/                        판정 엔진
│  │  ├─ evaluator.js                1순위/특공/자금/소득 판정
│  │  ├─ normalizer.js               입력값 정규화
│  │  ├─ evidence.js                 근거/면책 문구
│  │  ├─ official-api.js             KOSIS 설정 상태 확인
│  │  └─ advisory-conditions.js      공식공고/자산/추가비용 확인 가드
│  └─ data/
│     ├─ rules/
│     │  ├─ special-supply.json
│     │  ├─ general-supply.json
│     │  ├─ income-limits.json       소득조건 번들 기준
│     │  └─ regulation-area.json
│     └─ sources.json
├─ examples/
│  ├─ claude-desktop-config.json
│  └─ sample-inputs.json
├─ README.md
├─ LICENSE
├─ SECURITY.md
└─ package.json
```

---

## 8. 중요 고지

이 패키지는 의사결정 보조용 로컬 룰 엔진입니다. 최종 청약 자격, 소득·자산 기준, 대출 가능 여부, 당첨자 선정은 최신 입주자모집공고문과 기관 심사가 우선합니다.

---

# English README

Local-first MCP server for Korean housing subscription eligibility checks.

This package lets an MCP client call deterministic tools such as `check_eligibility`. The server evaluates first-priority conditions, special-supply conditions, income thresholds, funding readiness, and official-source advisory checks, then returns structured JSON.

By default it runs with transparent bundled rules and requires no database, hosted backend, login session, or API key. If the user has KOSIS credentials, the server can record that an official KOSIS data basis is available for the local workflow.

---

## 1. How this MCP is used

```text
User / AI agent
  ↓ MCP tool call
MCP client
  e.g. Claude Desktop, Codex/Hermes, Cursor
  ↓ stdio JSON-RPC
naejipgak-mcp
  src/mcp-server.js
  ↓
Tool layer
  check_eligibility
  explain_rule
  list_rules
  compare_scenarios
  ↓
Rule engine
  src/engine/evaluator.js
  src/engine/normalizer.js
  src/engine/advisory-conditions.js
  src/engine/official-api.js
  ↓
Rule data / official-data status
  src/data/rules/*.json
  optional KOSIS_API_KEY / KOSIS_USER_STATS_ID
  ↓
Result JSON
```

The intended pattern is: the AI does not guess the eligibility result. It passes applicant facts to the MCP tool and explains the returned rule-engine result.

---

## 2. MCP tools

```text
check_eligibility
  - Evaluates first-priority, special supply, income, funding, and advisory checks.

explain_rule
  - Explains a supported rule or rule group.

list_rules
  - Lists bundled rules, income thresholds, source references, and KOSIS metadata.

compare_scenarios
  - Compares multiple applicant scenarios side by side.
```

---

## 3. Why KOSIS credentials matter

Income eligibility often depends on official statistics such as average monthly income by household size. These values can change by year and by announcement, so production use should verify the latest official announcement and/or KOSIS statistics.

```text
Default: bundled_rules
  - Uses transparent bundled rules included in this package.
  - No API key required.
  - Suitable for OSS review and local testing.

Optional: kosis or public_api
  - Uses user-owned KOSIS API key and userStatsId configuration.
  - Records KOSIS availability in official_data.
  - Never includes the API key value in MCP responses.
```

Current implementation status:

```text
Implemented
  - Detect KOSIS_API_KEY and KOSIS_USER_STATS_ID.
  - Accept data_basis: "kosis" or "public_api".
  - Fall back to bundled rules if credentials are missing.
  - Evaluate income conditions using bundled income-limits.json.

Next step
  - Add live KOSIS statisticsData.do fetch.
  - Read rows through registered userStatsId.
  - Parse household-size income rows.
  - Override or refresh bundled income limits from KOSIS data.
```

---

## 4. KOSIS configuration

Get an API key from KOSIS OpenAPI and register the target statistics URL/table to obtain `userStatsId`.

```bash
export KOSIS_API_KEY="<your-kosis-api-key>"
export KOSIS_USER_STATS_ID="<your-kosis-user-stats-id>"

# Optional endpoint override
export KOSIS_BASE_URL="https://kosis.kr/openapi/statisticsData.do"
```

Example MCP arguments:

```json
{
  "data_basis": "kosis",
  "region": "서울",
  "region_type": "speculative",
  "subscription_months": 30,
  "subscription_payments": 30,
  "is_householder": true,
  "is_homeless_household": true,
  "special_supply_type": "newlywed",
  "is_married": true,
  "household_size": 2,
  "monthly_income_krw": 7000000,
  "price_krw": 600000000,
  "cash_krw": 450000000,
  "official_source_checked": true,
  "announcement_date": "2026-06-05",
  "income_basis_year": 2026,
  "asset_reviewed": true,
  "extra_costs_reviewed": true
}
```

---

## 5. Install and run locally

```bash
npm install
npm test
npm run mcp
```

Package-style execution:

```bash
npx naejipgak-mcp
```

---

## 6. MCP client example

This package is a standard MCP stdio JSON-RPC server and is not tied to a single AI vendor. Any client that can register an MCP stdio server can launch the same `node src/mcp-server.js` or `npx naejipgak-mcp` entrypoint.

```text
Client categories checked
- Claude / Claude Desktop: mcpServers stdio configuration
- Hermes Agent: mcp_servers stdio configuration
- Codex CLI: environments that support MCP stdio server registration
- Gemini CLI: environments that support MCP stdio server registration
```

Exact config paths and field names can vary by client version. The shared requirement is to launch the stdio command/args and pass optional KOSIS values through `env` only when needed.

```json
{
  "mcpServers": {
    "naejipgak": {
      "command": "node",
      "args": ["/absolute/path/to/naejipgak-mcp/src/mcp-server.js"],
      "env": {
        "KOSIS_API_KEY": "<your-kosis-api-key>",
        "KOSIS_USER_STATS_ID": "<your-kosis-user-stats-id>"
      }
    }
  }
}
```

After publishing or installing the package:

```json
{
  "mcpServers": {
    "naejipgak": {
      "command": "npx",
      "args": ["naejipgak-mcp"],
      "env": {
        "KOSIS_API_KEY": "<your-kosis-api-key>",
        "KOSIS_USER_STATS_ID": "<your-kosis-user-stats-id>"
      }
    }
  }
}
```

---

## 7. Disclaimer

This package is a local decision-support rule engine. Final eligibility, income/asset thresholds, loan feasibility, and winner selection are determined by the latest official announcement and agency review.
