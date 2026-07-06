#!/usr/bin/env node
/**
 * naejipgak-mcp CLI — non-MCP surface for quick eligibility checks.
 * Usage:
 *   echo '{"region_type":"metro","subscription_months":15}' | npx naejipgak-mcp-check
 *   npx naejipgak-mcp-check --list-rules
 *   npx naejipgak-mcp-check --explain general_supply
 */
import { evaluateEligibility } from '../src/engine/evaluator.js';
import { listRules, explainRule } from '../src/engine/evaluator.js';

const args = process.argv.slice(2);

if (args.includes('--list-rules')) {
  process.stdout.write(JSON.stringify(listRules(), null, 2) + '\n');
  process.exit(0);
}

const explainIdx = args.indexOf('--explain');
if (explainIdx !== -1) {
  const ruleId = args[explainIdx + 1];
  process.stdout.write(JSON.stringify(explainRule(ruleId || ''), null, 2) + '\n');
  process.exit(0);
}

// Default: read JSON from stdin or --input='{...}'
const inputArg = args.find((a) => a.startsWith('--input='));
let input;
if (inputArg) {
  try {
    input = JSON.parse(inputArg.replace('--input=', ''));
  } catch {
    process.stderr.write('Error: --input must be valid JSON\n');
    process.exit(1);
  }
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) {
    process.stderr.write([
      'Usage:',
      '  echo \'{"region_type":"metro","subscription_months":15}\' | naejipgak-mcp-check',
      '  naejipgak-mcp-check --input=\'{"region_type":"metro",...}\'',
      '  naejipgak-mcp-check --list-rules',
      '  naejipgak-mcp-check --explain general_supply',
    ].join('\n') + '\n');
    process.exit(1);
  }
  try {
    input = JSON.parse(raw);
  } catch {
    process.stderr.write('Error: stdin must be valid JSON\n');
    process.exit(1);
  }
}

const result = evaluateEligibility(input);
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(result.overall_status === 'possible' ? 0 : 1);
