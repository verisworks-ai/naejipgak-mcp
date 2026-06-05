#!/usr/bin/env node
import { tool as checkEligibilityTool, handler as checkEligibility } from "./tools/check-eligibility.js";
import { tool as explainRuleTool, handler as explainRule } from "./tools/explain-rule.js";
import { tool as listRulesTool, handler as listRules } from "./tools/list-rules.js";
import { tool as compareScenariosTool, handler as compareScenarios } from "./tools/compare-scenarios.js";

const SERVER = {
  name: "naejipgak-mcp",
  version: "0.1.0"
};

const registry = new Map([
  [checkEligibilityTool.name, { definition: checkEligibilityTool, handler: checkEligibility }],
  [explainRuleTool.name, { definition: explainRuleTool, handler: explainRule }],
  [listRulesTool.name, { definition: listRulesTool, handler: listRules }],
  [compareScenariosTool.name, { definition: compareScenariosTool, handler: compareScenarios }]
]);

function textContent(data) {
  return [{ type: "text", text: JSON.stringify(data, null, 2) }];
}

function callTool(name, args = {}) {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Unknown tool: ${name}`);
  return { content: textContent(entry.handler(args)) };
}

function response(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function errorResponse(id, error) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code: -32000, message: String(error?.message || error) }
  });
}

function handle(message) {
  const { id, method, params = {} } = message;
  if (method === "initialize") {
    return response(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER
    });
  }
  if (method === "notifications/initialized") return null;
  if (method === "tools/list") return response(id, { tools: [...registry.values()].map((entry) => entry.definition) });
  if (method === "tools/call") return response(id, callTool(params.name, params.arguments || {}));
  return errorResponse(id, new Error(`Unsupported method: ${method}`));
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    try {
      const out = handle(JSON.parse(line));
      if (out) process.stdout.write(`${out}\n`);
    } catch (error) {
      process.stdout.write(`${errorResponse(null, error)}\n`);
    }
  }
});
