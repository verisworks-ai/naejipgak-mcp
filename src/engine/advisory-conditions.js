import { normalizeApplicant } from "./normalizer.js";
import { officialApiStatus } from "./official-api.js";

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthsBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export const advisoryConditionReference = {
  purpose: "Codex가 청약 조건 판별 전에 추가 확인이 필요하다고 판단한 사전 안전 조건입니다.",
  effect: "critical 조건이 남아 있으면 전체 판정은 needs_review가 됩니다.",
  conditions: {
    official_source_checked: "최신 입주자모집공고문 또는 공식기관 기준 확인 여부",
    public_api_basis: "public_api 요청 시 개인 공공데이터포털/공식기관 API 키 설정 여부",
    announcement_freshness: "공고일/개정일 기준이 너무 오래되었거나 누락되지 않았는지",
    region_specific_rules: "지역/규제지역 분류가 명시 또는 충분히 추론 가능한지",
    income_basis_year: "월평균소득 입력 시 적용 기준연도/기준표 확인 여부",
    asset_and_debt_review: "특별공급·공공분양에서 자산/부채/차량 등 별도 심사 항목 확인 여부",
    funding_extra_costs: "분양가 외 옵션, 취득세, 중도금 이자, 대출 제한 등 추가 자금 확인 여부"
  }
};

export function evaluateAdvisoryConditions(input = {}) {
  const applicant = normalizeApplicant(input);
  const official = officialApiStatus(input);
  const issues = [];
  const evidence = [];

  const officialSourceChecked = input.official_source_checked === true || input.officialSourceChecked === true;
  if (!officialSourceChecked) {
    issues.push({
      id: "official_source_checked",
      severity: "critical",
      message: "최신 입주자모집공고문 또는 공식기관 기준 확인 여부를 official_source_checked=true로 명시해야 합니다."
    });
  } else {
    evidence.push("최신 공식 출처 확인 여부: 확인됨");
  }

  if (official.requested && !official.active) {
    issues.push({
      id: "public_api_key_missing",
      severity: "warning",
      message: `${official.api_key_env} 환경변수가 없어 public_api 요청이 번들 룰 기준으로 대체되었습니다.`
    });
  }
  if (official.active) evidence.push("개인 공공/OpenAPI 키 설정 확인: 활성");

  const announcementDateValue = input.announcement_date ?? input.announcementDate ?? input.notice_date ?? input.noticeDate;
  if (!hasValue(input.announcement_url ?? input.announcementUrl ?? input.notice_url ?? input.noticeUrl) && !hasValue(input.announcement_id ?? input.announcementId ?? input.notice_id ?? input.noticeId)) {
    issues.push({
      id: "announcement_reference_missing",
      severity: "critical",
      message: "공고문 URL 또는 공고 ID가 없어 공고별 예외 조건을 확인할 수 없습니다."
    });
  }
  if (!hasValue(announcementDateValue)) {
    issues.push({
      id: "announcement_date_missing",
      severity: "warning",
      message: "공고일/기준일이 없어 기준 최신성을 확인할 수 없습니다."
    });
  } else {
    const announcementDate = toDate(announcementDateValue);
    if (!announcementDate) {
      issues.push({ id: "announcement_date_invalid", severity: "warning", message: "공고일/기준일 날짜 형식을 해석할 수 없습니다." });
    } else {
      const ageMonths = monthsBetween(announcementDate, new Date());
      evidence.push(`공고 기준일: ${announcementDate.toISOString().slice(0, 10)} (${ageMonths}개월 경과)`);
      if (ageMonths > 12) {
        issues.push({ id: "announcement_date_stale", severity: "warning", message: "공고 기준일이 12개월을 초과해 최신 기준 재확인이 필요합니다." });
      }
    }
  }

  if (!hasValue(input.region) && !hasValue(input.region_type ?? input.regionType)) {
    issues.push({ id: "region_missing", severity: "critical", message: "지역 또는 region_type이 없어 지역별 청약 기준을 판별할 수 없습니다." });
  } else if (!hasValue(input.region_type ?? input.regionType)) {
    issues.push({ id: "region_type_inferred", severity: "warning", message: `region_type이 없어 입력 지역에서 '${applicant.region_type}'로 추론했습니다. 규제지역 여부를 명시 확인하세요.` });
  }

  if (applicant.monthly_income_krw > 0 && !hasValue(input.income_basis_year ?? input.incomeBasisYear)) {
    issues.push({ id: "income_basis_year_missing", severity: "warning", message: "월평균소득을 입력했지만 적용 소득 기준연도/income_basis_year가 없어 기준표 재확인이 필요합니다." });
  }

  if (["newlywed", "first_life", "multi_child", "elderly_parent"].includes(applicant.special_supply_type)) {
    if (!hasValue(input.asset_krw ?? input.assetKrw) && !hasValue(input.asset_reviewed ?? input.assetReviewed)) {
      issues.push({ id: "asset_review_missing", severity: "warning", message: "특별공급은 자산/차량/부채 등 별도 심사 항목이 있을 수 있어 asset_krw 또는 asset_reviewed=true 확인이 필요합니다." });
    }
  }

  if (applicant.price_krw > 0 && !input.extra_costs_reviewed && !input.extraCostsReviewed) {
    issues.push({ id: "funding_extra_costs_missing", severity: "warning", message: "분양가 외 옵션, 취득세, 중도금 이자, 대출 제한을 extra_costs_reviewed=true로 별도 확인하세요." });
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return {
    status: criticalCount ? "needs_review" : warningCount ? "conditional" : "possible",
    label: criticalCount ? "공식 기준 추가 확인 필요" : warningCount ? "보완 확인 권장" : "사전 확인 조건 충족",
    reasons: issues.map((issue) => issue.message),
    issues,
    evidence,
    warnings: ["이 항목은 법적 판정이 아니라 판정 누락을 줄이기 위한 사전 점검 조건입니다."]
  };
}
