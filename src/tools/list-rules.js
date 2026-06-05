import { listRules } from "../engine/evaluator.js";

export const tool = {
  name: "list_rules",
  description: "지원하는 청약 판정 룰, 소득 기준 샘플, 출처 목록을 반환합니다.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false
  }
};

export function handler() {
  return listRules();
}
