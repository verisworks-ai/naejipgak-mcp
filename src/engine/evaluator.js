import specialSupplyRules from "../data/rules/special-supply.json" with { type: "json" };
import generalSupplyRules from "../data/rules/general-supply.json" with { type: "json" };
import incomeLimits from "../data/rules/income-limits.json" with { type: "json" };
import regulationAreaRules from "../data/rules/regulation-area.json" with { type: "json" };
import sources from "../data/sources.json" with { type: "json" };
import { ruleEvidence, disclaimer } from "./evidence.js";
import { normalizeApplicant } from "./normalizer.js";
import { officialApiStatus, publicApiReference } from "./official-api.js";
import { advisoryConditionReference, evaluateAdvisoryConditions } from "./advisory-conditions.js";

const LABELS = {
  is_married: "혼인 요건",
  is_first_home_purchase: "생애최초 요건",
  is_householder: "세대주 요건",
  is_homeless_household: "무주택 세대 요건",
};

function verdict(status, label, reasons, evidence = [], warnings = []) {
  return { status, label, reasons, evidence, warnings };
}

export function evaluateFirstPriority(input = {}) {
  const applicant = normalizeApplicant(input);
  const rule = regulationAreaRules[applicant.region_type] || regulationAreaRules.non_metro;
  const reasons = [];
  const evidence = [
    `지역 분류: ${rule.label}`,
    `청약통장 가입기간: ${applicant.subscription_months}개월 / 필요 ${rule.subscriptionMonths}개월`,
    `납입횟수: ${applicant.subscription_payments}회 / 필요 ${rule.subscriptionPayments}회`,
    ...ruleEvidence(rule),
  ];

  if (applicant.subscription_months < rule.subscriptionMonths) reasons.push(`청약통장 가입기간 ${rule.subscriptionMonths}개월 이상 필요`);
  if (applicant.subscription_payments < rule.subscriptionPayments) reasons.push(`청약통장 납입횟수 ${rule.subscriptionPayments}회 이상 필요`);
  if (rule.householderRequired && !applicant.is_householder) reasons.push("세대주 요건 확인 필요");
  if (rule.homelessRequired && !applicant.is_homeless_household) reasons.push("무주택 세대 요건 확인 필요");

  if (!reasons.length) return verdict("possible", "1순위 가능", [], evidence, ["공고별 세부 제한과 당첨자 선정 방식은 원문 공고가 우선합니다."]);
  if (reasons.some((reason) => /무주택|세대주/.test(reason))) return verdict("needs_review", "조건 확인 필요", reasons, evidence, ["세대 구성·주택 보유 이력은 기관 심사 기준으로 확인해야 합니다."]);
  return verdict("conditional", "보완 필요", reasons, evidence, []);
}

export function evaluateSpecialSupply(input = {}) {
  const applicant = normalizeApplicant(input);
  const rule = specialSupplyRules[applicant.special_supply_type];
  if (!rule) {
    return verdict("needs_review", "특별공급 유형 확인 필요", [`지원 유형을 확인할 수 없습니다: ${applicant.special_supply_type || "미입력"}`], [], ["지원 유형 예: newlywed, first_life, multi_child, elderly_parent"]);
  }

  const reasons = [];
  const evidence = [`유형: ${rule.label}`, `가구원 수: ${applicant.household_size_key}`, ...ruleEvidence(rule)];

  for (const key of rule.requiredBooleans || []) {
    if (!applicant[key]) reasons.push(`${LABELS[key] || key} 확인 필요`);
  }

  if (rule.minimumChildren && applicant.children_count < rule.minimumChildren) reasons.push(`자녀 수 ${rule.minimumChildren}명 이상 필요`);

  if (rule.incomeLimitPct) {
    const base = Number(incomeLimits.monthlyAverageIncomeBaseKrw[applicant.household_size_key] || 0);
    const limit = Math.round(base * rule.incomeLimitPct / 100);
    evidence.push(`소득 기준: 기준소득 ${base.toLocaleString("ko-KR")}원 × ${rule.incomeLimitPct}% = ${limit.toLocaleString("ko-KR")}원`);
    if (applicant.monthly_income_krw > 0 && applicant.monthly_income_krw > limit) reasons.push(`월평균소득이 추정 기준을 초과합니다 (${applicant.monthly_income_krw.toLocaleString("ko-KR")}원 > ${limit.toLocaleString("ko-KR")}원)`);
    if (applicant.monthly_income_krw <= 0) reasons.push("월평균소득 입력 필요");
  }

  if (!reasons.length) return verdict("possible", `${rule.label} 가능`, [], evidence, rule.notes || []);
  return verdict("needs_review", `${rule.label} 조건 확인 필요`, reasons, evidence, rule.notes || []);
}

export function evaluateFunding(input = {}) {
  const applicant = normalizeApplicant(input);
  const fundingRule = generalSupplyRules.funding;
  const contractRate = applicant.contract_rate || fundingRule.defaultContractRate;
  const middleRate = applicant.middle_payment_rate || fundingRule.defaultMiddlePaymentRate;
  const required = Math.round(applicant.price_krw * (contractRate + middleRate));
  const gap = Math.max(0, required - applicant.cash_krw);
  const evidence = [
    `분양가: ${applicant.price_krw.toLocaleString("ko-KR")}원`,
    `계약금+중도금 추정: ${Math.round((contractRate + middleRate) * 100)}%`,
    `보유 현금: ${applicant.cash_krw.toLocaleString("ko-KR")}원`,
    ...ruleEvidence(fundingRule),
  ];
  if (!applicant.price_krw) return verdict("needs_review", "분양가 입력 필요", ["price_krw를 입력해야 필요 현금을 계산할 수 있습니다."], evidence, []);
  if (gap === 0) return verdict("possible", "현금 여력 가능", [], evidence, ["대출 가능 여부, 중도금 이자, 옵션/취득세 등은 별도 확인이 필요합니다."]);
  return verdict("conditional", "추가 현금 필요", [`추정 부족액 ${gap.toLocaleString("ko-KR")}원`], evidence, ["실제 납부 일정과 대출 조건은 공고문·금융기관 심사가 우선합니다."]);
}

export function evaluateEligibility(input = {}) {
  const checks = {
    first_priority: evaluateFirstPriority(input),
    special_supply: evaluateSpecialSupply(input),
    funding: evaluateFunding(input),
    advisory_conditions: evaluateAdvisoryConditions(input),
  };
  const statuses = Object.values(checks).map((item) => item.status);
  const overall = statuses.includes("needs_review") ? "needs_review" : statuses.includes("conditional") ? "conditional" : "possible";
  const official_data = officialApiStatus(input);
  return {
    overall_status: overall,
    overall_label: overall === "possible" ? "가능" : overall === "conditional" ? "보완 필요" : "추가 확인 필요",
    data_basis: official_data.basis,
    official_data,
    checks,
    disclaimer: disclaimer(),
  };
}

export function listRules() {
  return {
    special_supply: specialSupplyRules,
    general_supply: generalSupplyRules,
    income_limits: incomeLimits,
    regulation_area: regulationAreaRules,
    official_api: publicApiReference(),
    advisory_conditions: advisoryConditionReference,
    sources,
  };
}

export function explainRule(ruleId) {
  const allRules = listRules();
  const id = String(ruleId || "").trim();
  if (!id) return { status: "needs_review", message: "rule_id를 입력하세요.", supported_rule_groups: Object.keys(allRules) };

  for (const [group, rules] of Object.entries(allRules)) {
    if (rules && typeof rules === "object" && Object.hasOwn(rules, id)) {
      return { status: "ok", group, rule_id: id, rule: rules[id] };
    }
  }

  if (Object.hasOwn(allRules, id)) return { status: "ok", group: id, rules: allRules[id] };
  return { status: "not_found", message: `지원하지 않는 rule_id: ${id}`, supported_rule_groups: Object.keys(allRules) };
}

export function compareScenarios(scenarios = []) {
  const items = Array.isArray(scenarios) ? scenarios : [];
  return {
    scenarios: items.map((scenario, index) => ({
      id: scenario.id || `scenario_${index + 1}`,
      input: scenario.input || scenario,
      result: evaluateEligibility(scenario.input || scenario),
    })),
    disclaimer: disclaimer(),
  };
}
