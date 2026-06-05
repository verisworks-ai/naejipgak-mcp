import sources from "../data/sources.json" with { type: "json" };

export function resolveEvidence(keys = []) {
  return keys
    .map((key) => sources[key] ? { key, ...sources[key] } : null)
    .filter(Boolean);
}

export function ruleEvidence(rule = {}) {
  return resolveEvidence(rule.evidenceKeys || []);
}

export function disclaimer() {
  return "이 결과는 로컬 룰 기반 보조 판별입니다. 최종 자격, 소득, 대출, 당첨 가능 여부는 공식 공고문과 기관 심사가 우선합니다.";
}
