import { compareScenarios } from "../engine/evaluator.js";

export const tool = {
  name: "compare_scenarios",
  description: "여러 청약 조건 시나리오를 같은 룰로 판정해 비교합니다.",
  inputSchema: {
    type: "object",
    properties: {
      scenarios: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true
        }
      }
    },
    required: ["scenarios"],
    additionalProperties: false
  }
};

export function handler(args = {}) {
  return compareScenarios(args.scenarios || []);
}
