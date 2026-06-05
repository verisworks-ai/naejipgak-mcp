import { evaluateEligibility } from "../engine/evaluator.js";

export const tool = {
  name: "check_eligibility",
  description: "청약 1순위, 특별공급, 자금 여력을 로컬 룰로 보조 판정합니다.",
  inputSchema: {
    type: "object",
    properties: {
      region: { type: "string", description: "예: 서울, 경기, 부산" },
      region_type: { type: "string", enum: ["speculative", "metro", "non_metro"] },
      subscription_months: { type: "number" },
      subscription_payments: { type: "number" },
      is_householder: { type: "boolean" },
      is_homeless_household: { type: "boolean" },
      special_supply_type: { type: "string", enum: ["newlywed", "first_life", "multi_child", "elderly_parent"] },
      household_size: { type: "number" },
      monthly_income_krw: { type: "number" },
      price_krw: { type: "number" },
      cash_krw: { type: "number" },
      official_source_checked: { type: "boolean", description: "최신 입주자모집공고문/공식기관 기준을 확인했으면 true" },
      announcement_url: { type: "string", description: "공고문 또는 공식 기준 URL" },
      announcement_id: { type: "string", description: "공고 ID/주택명 등 추적 가능한 식별자" },
      announcement_date: { type: "string", description: "공고일 또는 기준일, 예: 2026-06-05" },
      income_basis_year: { type: "number", description: "월평균소득 기준표 적용 연도" },
      asset_krw: { type: "number", description: "특별공급 자산 심사용 추정 자산액" },
      asset_reviewed: { type: "boolean", description: "자산/차량/부채 등 별도 심사 항목을 확인했으면 true" },
      extra_costs_reviewed: { type: "boolean", description: "옵션, 취득세, 중도금 이자, 대출 제한 등 추가 자금 항목 확인 여부" },
      data_basis: {
        type: "string",
        enum: ["bundled_rules", "kosis", "public_api"],
        description: "기본값은 bundled_rules입니다. kosis 또는 public_api를 요청하면 로컬 KOSIS_API_KEY/KOSIS_USER_STATS_ID 설정 여부를 확인해 공식 통계 기준 사용 가능 상태를 함께 반환합니다."
      }
    },
    additionalProperties: true
  }
};

export function handler(args = {}) {
  return evaluateEligibility(args);
}
