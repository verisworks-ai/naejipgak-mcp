const KOSIS_API_KEY_ENV = "KOSIS_API_KEY";
const KOSIS_USER_STATS_ID_ENV = "KOSIS_USER_STATS_ID";
const KOSIS_BASE_URL_ENV = "KOSIS_BASE_URL";

const LEGACY_PUBLIC_DATA_API_KEY_ENV = "NAEJIPGAK_PUBLIC_DATA_API_KEY";
const LEGACY_PUBLIC_DATA_BASE_URL_ENV = "NAEJIPGAK_PUBLIC_DATA_BASE_URL";

const DEFAULT_KOSIS_BASE_URL = "https://kosis.kr/openapi/statisticsData.do";

function envValue(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

export function officialApiStatus(options = {}) {
  const requested = options.data_basis === "public_api" || options.data_basis === "kosis" || options.use_official_api === true;
  const apiKey = envValue(KOSIS_API_KEY_ENV, LEGACY_PUBLIC_DATA_API_KEY_ENV);
  const userStatsId = envValue(KOSIS_USER_STATS_ID_ENV);
  const hasKey = Boolean(apiKey);
  const hasUserStatsId = Boolean(userStatsId);
  const active = requested && hasKey && hasUserStatsId;

  return {
    basis: active ? "kosis" : "bundled_rules",
    requested,
    active,
    provider: "KOSIS 국가통계포털 OpenAPI(statisticsData.do)",
    api_key_env: KOSIS_API_KEY_ENV,
    api_key_configured: hasKey,
    user_stats_id_env: KOSIS_USER_STATS_ID_ENV,
    user_stats_id_configured: hasUserStatsId,
    base_url_env: KOSIS_BASE_URL_ENV,
    base_url_configured: Boolean(envValue(KOSIS_BASE_URL_ENV, LEGACY_PUBLIC_DATA_BASE_URL_ENV)),
    default_base_url: DEFAULT_KOSIS_BASE_URL,
    legacy_env_supported: [LEGACY_PUBLIC_DATA_API_KEY_ENV, LEGACY_PUBLIC_DATA_BASE_URL_ENV],
    warnings: active
      ? ["KOSIS API 키와 userStatsId가 로컬 환경변수에 설정되어 있습니다. 키 값은 결과에 포함하지 않습니다."]
      : requested
        ? [`KOSIS 기준을 요청했지만 ${KOSIS_API_KEY_ENV} 또는 ${KOSIS_USER_STATS_ID_ENV} 환경변수가 없어 번들 룰 기준으로 판정했습니다.`]
        : ["기본값은 패키지에 포함된 투명한 번들 룰 기준입니다. KOSIS 키와 userStatsId가 있으면 data_basis=kosis 또는 public_api로 요청할 수 있습니다."]
  };
}

export function publicApiReference() {
  return {
    supported: true,
    provider: "KOSIS 국가통계포털 OpenAPI(statisticsData.do)",
    key_env: KOSIS_API_KEY_ENV,
    user_stats_id_env: KOSIS_USER_STATS_ID_ENV,
    base_url_env: KOSIS_BASE_URL_ENV,
    default_base_url: DEFAULT_KOSIS_BASE_URL,
    intended_use: "개인이 KOSIS OpenAPI 키와 등록 URL(userStatsId)을 발급받아 도시근로자 월평균소득 등 소득조건의 공식 통계 근거를 로컬에서 확인",
    privacy: "API 키는 로컬 환경변수에서만 읽고 MCP 응답에는 키 값을 포함하지 않습니다.",
    fallback: "키 또는 userStatsId가 없거나 KOSIS/public_api 모드를 요청하지 않으면 번들 룰로 판정합니다.",
    note: "현재 MCP는 KOSIS 설정 상태를 판정 결과에 기록하고, 실제 소득 기준 판정은 번들 룰을 사용합니다. 실시간 KOSIS 행 조회/파싱은 다음 단계 provider에서 연결합니다."
  };
}
