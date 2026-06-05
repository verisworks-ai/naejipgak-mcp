import { explainRule } from "../engine/evaluator.js";

export const tool = {
  name: "explain_rule",
  description: "지원 룰 또는 룰 그룹의 설명, 기준값, 근거 키를 반환합니다.",
  inputSchema: {
    type: "object",
    properties: {
      rule_id: {
        type: "string",
        description: "예: newlywed, first_life, first_priority, funding, special_supply, regulation_area"
      }
    },
    required: ["rule_id"],
    additionalProperties: false
  }
};

export function handler(args = {}) {
  return explainRule(args.rule_id);
}
