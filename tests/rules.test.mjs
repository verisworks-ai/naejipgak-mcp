#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { evaluateEligibility, evaluateFirstPriority, evaluateFunding, evaluateSpecialSupply, explainRule, listRules, compareScenarios } from "../src/engine/evaluator.js";

const possible = evaluateFirstPriority({
  region_type: "speculative",
  subscription_months: 24,
  subscription_payments: 24,
  is_householder: true,
  is_homeless_household: true
});
assert.equal(possible.status, "possible");

const needsReview = evaluateFirstPriority({
  region_type: "speculative",
  subscription_months: 12,
  subscription_payments: 12,
  is_householder: false,
  is_homeless_household: true
});
assert.equal(needsReview.status, "needs_review");
assert.match(needsReview.reasons.join(" "), /세대주|24개월/);

const special = evaluateSpecialSupply({
  special_supply_type: "first_life",
  is_first_home_purchase: true,
  is_homeless_household: true,
  household_size: 2,
  monthly_income_krw: 9000000
});
assert.equal(special.status, "possible");

const funding = evaluateFunding({ price_krw: 600000000, cash_krw: 100000000 });
assert.equal(funding.status, "conditional");
assert.match(funding.reasons[0], /부족액/);

const all = evaluateEligibility({
  region_type: "metro",
  subscription_months: 12,
  subscription_payments: 12,
  is_householder: false,
  is_homeless_household: true,
  special_supply_type: "newlywed",
  is_married: true,
  household_size: 2,
  monthly_income_krw: 8000000,
  price_krw: 400000000,
  cash_krw: 300000000,
  official_source_checked: true,
  announcement_url: "https://example.go.kr/notice/2026-001",
  announcement_date: new Date().toISOString().slice(0, 10),
  income_basis_year: new Date().getFullYear(),
  asset_reviewed: true,
  extra_costs_reviewed: true
});
assert.equal(all.overall_status, "possible");
assert.equal(Boolean(all.checks.first_priority), true);
assert.equal(all.checks.advisory_conditions.status, "possible");
assert.equal(Boolean(listRules().special_supply.newlywed), true);
assert.equal(Boolean(listRules().advisory_conditions.conditions.official_source_checked), true);
assert.equal(explainRule("newlywed").status, "ok");
assert.equal(compareScenarios([{ id: "a", price_krw: 100000000, cash_krw: 80000000 }]).scenarios.length, 1);

const advisoryMissing = evaluateEligibility({
  region: "서울",
  special_supply_type: "newlywed",
  is_married: true,
  is_homeless_household: true,
  household_size: 2,
  monthly_income_krw: 7000000,
  price_krw: 600000000,
  cash_krw: 450000000
});
assert.equal(advisoryMissing.overall_status, "needs_review");
assert.equal(advisoryMissing.checks.advisory_conditions.status, "needs_review");
assert.match(advisoryMissing.checks.advisory_conditions.reasons.join(" "), /official_source_checked|공고문/);

const child = spawn(process.execPath, ["src/mcp-server.js"], { stdio: ["pipe", "pipe", "inherit"] });
const received = [];
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  for (const line of chunk.trim().split(/\n+/)) if (line) received.push(JSON.parse(line));
});
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "check_eligibility", arguments: { price_krw: 100000000, cash_krw: 80000000 } } }) + "\n");
for (let i = 0; i < 20 && received.length < 3; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
child.kill();
await once(child, "exit");

assert.equal(received.length, 3);
assert.equal(received[0].result.serverInfo.name, "naejipgak-mcp");
assert.deepEqual(received[1].result.tools.map((tool) => tool.name), ["check_eligibility", "explain_rule", "list_rules", "compare_scenarios"]);
const callPayload = JSON.parse(received[2].result.content[0].text);
assert.equal(callPayload.overall_status, "needs_review");

console.log(JSON.stringify({ passed: 15, checks: ["first-priority", "special-supply", "funding", "combined", "advisory-conditions", "rule-list", "rule-explain", "scenario-compare", "mcp-jsonrpc"] }, null, 2));
