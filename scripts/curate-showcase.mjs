#!/usr/bin/env node
/**
 * Curate the combined showcase results for the website.
 *
 * Reads the assembled benchmark folder from the comparison repository
 * (`results/raw/combined_showcase_v1`, built by that repository's
 * `scripts/build_combined_showcase.py`) and writes ONE presentation file:
 *
 *     src/data/experiments/showcase.json
 *
 * Nothing is typed by hand. Every aggregate is recomputed here from the
 * per-run evaluation rows with the same definitions as the comparison
 * repository's `benchmark/combined_showcase/analysis.py::summary_table`, and
 * then asserted against the numbers the analysis notebook
 * (`notebooks/combined_showcase_analysis.ipynb`) printed when it was executed,
 * so a drift between the two sources fails this script instead of reaching
 * the page. Missing values stay `null`; they are never turned into zero.
 *
 * Usage:
 *   node scripts/curate-showcase.mjs [path/to/combined_showcase_v1]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  process.argv[2] ??
    resolve(here, '../../Genkidama-project-comparisons/results/raw/combined_showcase_v1'),
);
const OUT = resolve(here, '../src/data/experiments/showcase.json');

// Python's json module writes bare NaN for missing tiers; JSON has no NaN.
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/:\s*NaN\b/g, ': null'));
const readJsonl = (p) =>
  readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

for (const f of ['manifest.json', 'full_run_context.json', 'selection.jsonl', 'mmmu_pro/evaluation.jsonl', 'spoken_squad/evaluation.jsonl']) {
  if (!existsSync(resolve(SOURCE, f))) {
    console.error(`missing ${f} under ${SOURCE}`);
    process.exit(1);
  }
}

const manifest = readJson(resolve(SOURCE, 'manifest.json'));
const context = readJson(resolve(SOURCE, 'full_run_context.json'));
const selection = readJsonl(resolve(SOURCE, 'selection.jsonl'));

const ARMS = ['deepseek_mcp', 'gemini_native'];
// Same as analysis.py: which outcomes count as "scored".
const SCORED = { mmmu_pro: new Set(['correct', 'incorrect']), spoken_squad: new Set(['answered']) };

// ---------------------------------------------------------------------------
// Statistics helpers (null-safe: nulls are dropped, never zero-filled, except
// where the notebook explicitly fills zero and says so).
const nums = (xs) => xs.filter((v) => typeof v === 'number' && Number.isFinite(v));
const mean = (xs) => { const n = nums(xs); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
const sum = (xs) => nums(xs).reduce((a, b) => a + b, 0);
const median = (xs) => { const n = [...nums(xs)].sort((a, b) => a - b); if (!n.length) return null; const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; };
const quantile = (xs, q) => { const n = [...nums(xs)].sort((a, b) => a - b); if (!n.length) return null; const pos = (n.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos); return n[lo] + (n[hi] - n[lo]) * (pos - lo); };
const round = (v, d) => (v === null || v === undefined ? null : Number(v.toFixed(d)));

// ---------------------------------------------------------------------------
function summarise(bench, rows) {
  const out = {};
  for (const arm of ARMS) {
    const sub = rows.filter((r) => r.arm === arm);
    const scoredRows = sub.filter((r) => SCORED[bench].has(r.outcome));
    const score = (r) => (bench === 'mmmu_pro' ? (r.outcome === 'correct' ? 1 : 0) : r.f1);
    const lat = (k) => sub.map((r) => (r[k] === null || r[k] === undefined ? null : r[k] / 1000));
    out[arm] = {
      runs: sub.length,
      scored: scoredRows.length,
      // Benchmark's own metric over the scored runs, and over all runs with failures as 0 (both shown, as in the notebook).
      scoreOverScored: round(mean(scoredRows.map(score)), 4),
      scoreOverAllRuns: round(mean(sub.map((r) => (SCORED[bench].has(r.outcome) ? score(r) : 0))), 4),
      exactMatches: bench === 'mmmu_pro' ? sub.filter((r) => r.outcome === 'correct').length : sub.filter((r) => r.exact_match === true && SCORED[bench].has(r.outcome)).length,
      outcomes: Object.fromEntries([...new Set(sub.map((r) => r.outcome))].sort().map((o) => [o, sub.filter((r) => r.outcome === o).length])),
      // Latency: total wall-clock per run; model and tool components are separate recorded quantities (tool = 0 where no tool ran, as the notebook does for the mean).
      latencyMeanS: round(mean(lat('total_latency_ms')), 1),
      latencyMedianS: round(median(lat('total_latency_ms')), 1),
      latencyP95S: round(quantile(lat('total_latency_ms'), 0.95), 1),
      modelLatencyMeanS: round(mean(lat('model_latency_ms')), 1),
      toolLatencyMeanS: round(mean(lat('tool_latency_ms').map((v) => v ?? 0)), 1),
      roundsMean: round(mean(sub.map((r) => r.rounds)), 2),
      promptTokensMean: round(mean(sub.map((r) => r.prompt_tokens)), 0),
      completionTokensMean: round(mean(sub.map((r) => r.completion_tokens)), 0),
      totalTokensMean: round(mean(sub.map((r) => r.total_tokens)), 0),
      totalTokensMedian: round(median(sub.map((r) => r.total_tokens)), 0),
      totalTokensSum: sum(sub.map((r) => r.total_tokens)),
      // Two cost fields, never summed into one headline: the gateway charge for the model, and the specialist-tool charge reported inside MCP results.
      gatewayCostUsdMean: round(mean(sub.map((r) => r.gateway_cost_usd)), 5),
      gatewayCostUsdTotal: round(sum(sub.map((r) => r.gateway_cost_usd)), 4),
      specialistToolCostUsdTotal: round(sum(sub.map((r) => r.specialist_tool_cost_usd)), 4),
      runsWithSpecialistCost: sub.filter((r) => typeof r.specialist_tool_cost_usd === 'number').length,
      usdPer1kTokens: round(mean(sub.map((r) => (r.total_tokens ? r.gateway_cost_usd / r.total_tokens : null))) * 1000, 5),
      mcpUsageRate: round(mean(sub.map((r) => (r.mcp_used ? 1 : 0))), 4),
      meanToolCalls: round(mean(sub.map((r) => r.total_tool_calls ?? 0)), 2),
    };
    if (bench === 'spoken_squad') {
      const wer = sub.map((r) => r.wer);
      out[arm].werMean = round(mean(wer), 4);
      out[arm].werMedian = round(median(wer), 4);
      out[arm].transcriptsWithWer = nums(wer).length;
      out[arm].asrBaselineWerMean = round(mean(sub.map((r) => r.asr_baseline_wer)), 4);
      out[arm].runsCallingSpeechTool = sub.filter((r) => r.speech_tool_called).length;
      out[arm].speechToolErroringCalls = sum(sub.map((r) => r.speech_tool_errors));
    }
  }
  return out;
}

function pairSamples(bench, rows) {
  const ids = [...new Set(rows.map((r) => (bench === 'mmmu_pro' ? r.task_id : r.qa_id)))];
  const byTier = Object.fromEntries(selection.filter((s) => s.benchmark === bench).map((s) => [s.id, s]));
  const pick = (r) => {
    if (!r) return null;
    const base = {
      outcome: r.outcome,
      score: bench === 'mmmu_pro' ? (SCORED[bench].has(r.outcome) ? (r.outcome === 'correct' ? 1 : 0) : null) : (SCORED[bench].has(r.outcome) ? r.f1 : null),
      latencyS: round(r.total_latency_ms / 1000, 2),
      modelLatencyS: r.model_latency_ms === null ? null : round(r.model_latency_ms / 1000, 2),
      toolLatencyS: r.tool_latency_ms === null || r.tool_latency_ms === undefined ? null : round(r.tool_latency_ms / 1000, 2),
      promptTokens: r.prompt_tokens,
      completionTokens: r.completion_tokens,
      totalTokens: r.total_tokens,
      gatewayCostUsd: r.gateway_cost_usd === null ? null : round(r.gateway_cost_usd, 6),
      specialistToolCostUsd: r.specialist_tool_cost_usd === null || r.specialist_tool_cost_usd === undefined ? null : round(r.specialist_tool_cost_usd, 6),
      toolCalls: r.total_tool_calls ?? 0,
      toolSequence: r.tool_sequence ?? [],
      rounds: r.rounds,
    };
    if (bench === 'spoken_squad') Object.assign(base, { exactMatch: r.exact_match, f1: r.f1 === null ? null : round(r.f1, 4), wer: r.wer === null || r.wer === undefined ? null : round(r.wer, 4) });
    return base;
  };
  return ids.map((id) => {
    const d = rows.find((r) => r.arm === 'deepseek_mcp' && (r.task_id ?? r.qa_id) === id);
    const g = rows.find((r) => r.arm === 'gemini_native' && (r.task_id ?? r.qa_id) === id);
    const sel = byTier[id];
    const first = d ?? g;
    return {
      id,
      group: bench === 'mmmu_pro' ? first.domain : first.title,
      subject: bench === 'mmmu_pro' ? first.subject : undefined,
      audioDurationS: bench === 'spoken_squad' ? first.audio_duration_s : undefined,
      rank: sel?.rank ?? null,
      tier: sel?.tier ?? null,
      tierLabel: sel?.tier_label ?? null,
      deepseek_mcp: pick(d),
      gemini_native: pick(g),
    };
  }).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}

function toolUsage(rows) {
  const d = rows.filter((r) => r.arm === 'deepseek_mcp');
  const seqs = d.map((r) => (r.tool_sequence?.length ? r.tool_sequence.join(' -> ') : '(no call)'));
  const counts = {};
  for (const s of seqs) counts[s] = (counts[s] ?? 0) + 1;
  const perTool = {};
  for (const r of d) for (const t of r.tool_sequence ?? []) perTool[t] = (perTool[t] ?? 0) + 1;
  return {
    runs: d.length,
    runsWithMcpCalls: d.filter((r) => r.mcp_used).length,
    meanCallsPerRun: round(mean(d.map((r) => r.total_tool_calls ?? 0)), 2),
    capabilityCalls: sum(d.map((r) => r.capability_tool_calls)),
    utilityCalls: sum(d.map((r) => r.utility_tool_calls)),
    toolExecutionErrors: sum(d.map((r) => r.tool_execution_errors)),
    runsWithRecovery: d.filter((r) => r.recovery_successful === true).length,
    callsPerTool: Object.fromEntries(Object.entries(perTool).sort((a, b) => b[1] - a[1])),
    topSequences: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sequence, runs]) => ({ sequence, runs })),
  };
}

// ---------------------------------------------------------------------------
const benchmarks = {};
for (const bench of ['mmmu_pro', 'spoken_squad']) {
  const rows = readJsonl(resolve(SOURCE, bench, 'evaluation.jsonl'));
  const bman = readJson(resolve(SOURCE, bench, 'manifest.json'));
  const summary = summarise(bench, rows);
  const samples = pairSamples(bench, rows);
  if (samples.length !== manifest.n_per_benchmark) throw new Error(`${bench}: ${samples.length} samples, expected ${manifest.n_per_benchmark}`);
  for (const s of samples) if (!s.deepseek_mcp || !s.gemini_native) throw new Error(`${bench}: ${s.id} is missing an arm`);
  benchmarks[bench] = {
    title: bench === 'mmmu_pro' ? 'OCR / vision' : 'Speech',
    dataset: bench === 'mmmu_pro' ? 'MMMU-Pro Vision' : 'Spoken-SQuAD',
    modality: context[bench].modality,
    scoreDefinition: context[bench].score_definition,
    scoreMetric: bench === 'mmmu_pro' ? 'accuracy' : 'F1',
    sampleCount: samples.length,
    datasetSource: bman.dataset?.repo_id ?? bman.dataset?.name ?? null,
    datasetRevision: bman.dataset?.revision ?? bman.dataset?.provenance?.github_commit ?? null,
    promptMode: bman.prompt?.mode ?? bman.prompt?.version ?? null,
    policy: bman.policy ? { maxRounds: bman.policy.max_rounds, maxToolCalls: bman.policy.max_tool_calls } : null,
    mcpToolCount: bman.mcp?.tool_count ?? null,
    arms: (bman.arms ?? []).map((a) => ({ arm: a.arm, model: a.label, route: a.route, offerMcpTools: !!a.offer_mcp_tools, delivery: a.delivery ?? a.description ?? null })),
    tiers: (manifest.counts[bench].tiers ?? []).map((t) => ({ tier: Number.isFinite(t.tier) ? t.tier : null, label: t.tier_label, description: t.description, eligible: t.eligible, selected: t.selected })),
    fullRun: {
      pairedTasks: context[bench].paired_tasks,
      rows: context[bench].rows,
      perArm: context[bench].per_arm,
      pairMatrix: context[bench].pair_matrix,
      comparison: context[bench].comparison,
    },
    summary,
    toolUsage: toolUsage(rows),
    samples,
  };
}

// Ratios as the notebook defines them (ratio_table): DeepSeek+MCP / Gemini on means; score difference on score-over-scored.
const ratios = {};
for (const bench of Object.keys(benchmarks)) {
  const d = benchmarks[bench].summary.deepseek_mcp, g = benchmarks[bench].summary.gemini_native;
  ratios[bench] = {
    scoreDifference: round(d.scoreOverScored - g.scoreOverScored, 4),
    latencyRatio: round(d.latencyMeanS / g.latencyMeanS, 2),
    tokensRatio: round(d.totalTokensMean / g.totalTokensMean, 2),
    gatewayCostRatio: round(d.gatewayCostUsdMean / g.gatewayCostUsdMean, 2),
    usdPer1kTokensRatio: round(d.usdPer1kTokens / g.usdPer1kTokens, 2),
    totalCostRatioInclSpecialist: round((d.gatewayCostUsdTotal + d.specialistToolCostUsdTotal) / g.gatewayCostUsdTotal, 2),
  };
}

// ---------------------------------------------------------------------------
// Cross-check against the executed notebook (values copied from its rendered
// summary tables on 2026-10-02). A mismatch means the folder changed since
// the notebook ran, or a definition drifted: stop and investigate.
const expected = {
  mmmu_pro: {
    deepseek_mcp: { runs: 50, scored: 50, scoreOverScored: 0.98, scoreOverAllRuns: 0.98, latencyMeanS: 111.4, latencyMedianS: 55.0, modelLatencyMeanS: 92.8, toolLatencyMeanS: 14.2, roundsMean: 3.68, promptTokensMean: 52324, completionTokensMean: 4517, totalTokensMean: 56840, totalTokensSum: 2842020, gatewayCostUsdMean: 0.02291, gatewayCostUsdTotal: 1.1457, specialistToolCostUsdTotal: 0.817, usdPer1kTokens: 0.00038, mcpUsageRate: 1, meanToolCalls: 4.22 },
    gemini_native: { runs: 50, scored: 45, scoreOverScored: 0.9778, scoreOverAllRuns: 0.88, latencyMeanS: 9.1, latencyMedianS: 7.8, modelLatencyMeanS: 9.1, toolLatencyMeanS: 0, roundsMean: 1, promptTokensMean: 1228, completionTokensMean: 1559, totalTokensMean: 2892, totalTokensSum: 144621, gatewayCostUsdMean: 0.00677, gatewayCostUsdTotal: 0.3383, specialistToolCostUsdTotal: 0, usdPer1kTokens: 0.00218, mcpUsageRate: 0, meanToolCalls: 0 },
  },
  spoken_squad: {
    deepseek_mcp: { runs: 50, scored: 50, scoreOverScored: 0.9712, scoreOverAllRuns: 0.9712, exactMatches: 46, latencyMeanS: 19.7, latencyMedianS: 18.9, modelLatencyMeanS: 11.2, toolLatencyMeanS: 7.1, roundsMean: 3, promptTokensMean: 32805, completionTokensMean: 230, totalTokensMean: 33035, totalTokensSum: 1651741, gatewayCostUsdMean: 0.00424, gatewayCostUsdTotal: 0.2122, specialistToolCostUsdTotal: 0.3179, usdPer1kTokens: 0.00013, mcpUsageRate: 1, meanToolCalls: 2, werMean: 0.0256, werMedian: 0.0173, asrBaselineWerMean: 0.2423 },
    gemini_native: { runs: 50, scored: 50, scoreOverScored: 0.9237, scoreOverAllRuns: 0.9237, exactMatches: 41, latencyMeanS: 3.3, latencyMedianS: 2.9, modelLatencyMeanS: 3.3, toolLatencyMeanS: 0, roundsMean: 1, promptTokensMean: 1747, completionTokensMean: 203, totalTokensMean: 1950, totalTokensSum: 97519, gatewayCostUsdMean: 0.00207, gatewayCostUsdTotal: 0.1036, specialistToolCostUsdTotal: 0, usdPer1kTokens: 0.00105, mcpUsageRate: 0, meanToolCalls: 0 },
  },
  ratios: {
    mmmu_pro: { scoreDifference: 0.0022, latencyRatio: 12.24, tokensRatio: 19.65, gatewayCostRatio: 3.38, usdPer1kTokensRatio: 0.17, totalCostRatioInclSpecialist: 5.8 },
    spoken_squad: { scoreDifference: 0.0475, latencyRatio: 5.97, tokensRatio: 16.94, gatewayCostRatio: 2.05, usdPer1kTokensRatio: 0.12, totalCostRatioInclSpecialist: 5.12 },
  },
};
const problems = [];
const close = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 0.002 + 0.00001));
for (const bench of ['mmmu_pro', 'spoken_squad']) {
  for (const arm of ARMS) for (const [k, v] of Object.entries(expected[bench][arm])) if (!close(benchmarks[bench].summary[arm][k], v)) problems.push(`${bench}.${arm}.${k}: computed ${benchmarks[bench].summary[arm][k]} vs notebook ${v}`);
  for (const [k, v] of Object.entries(expected.ratios[bench])) if (!close(ratios[bench][k], v)) problems.push(`${bench}.ratio.${k}: computed ${ratios[bench][k]} vs notebook ${v}`);
}
if (problems.length) {
  console.error('Cross-check against the notebook FAILED:\n  ' + problems.join('\n  '));
  process.exit(2);
}

const out = {
  generatedAt: new Date().toISOString(),
  provenance: {
    folder: 'results/raw/combined_showcase_v1',
    repository: 'Genkidama-project-comparisons',
    assembledAt: manifest.created_at,
    codeCommit: manifest.sources.mmmu_pro.source_code_git_commit,
    notebook: 'notebooks/combined_showcase_analysis.ipynb',
    sources: Object.fromEntries(Object.entries(manifest.sources).map(([k, v]) => [k, { runName: v.run_name, evaluatedAt: v.evaluated_at, evaluationRows: v.evaluation_rows }])),
    curationScript: 'scripts/curate-showcase.mjs',
    crossCheckedAgainstNotebook: true,
  },
  nPerBenchmark: manifest.n_per_benchmark,
  arms: {
    deepseek_mcp: { label: 'DeepSeek + MCP', short: 'DeepSeek + MCP', model: benchmarks.mmmu_pro.arms.find((a) => a.arm === 'deepseek_mcp')?.model ?? null, description: 'text-only model + the complete Eden AI MCP catalogue; the model decides whether and what to call' },
    gemini_native: { label: 'Gemini native', short: 'Gemini', model: benchmarks.mmmu_pro.arms.find((a) => a.arm === 'gemini_native')?.model ?? null, description: 'natively multimodal model; image or audio delivered as a native content part; no tools' },
  },
  selection: {
    note: manifest.selection_rules.note,
    tiers: manifest.selection_rules.tiers,
    excluded: manifest.selection_rules.excluded,
    orderWithinTier: manifest.selection_rules.order_within_tier,
  },
  benchmarks,
  ratios,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB); cross-check against the notebook passed.`);
for (const bench of Object.keys(benchmarks)) {
  for (const arm of ARMS) {
    const s = benchmarks[bench].summary[arm];
    console.log(`${bench.padEnd(13)} ${arm.padEnd(14)} runs ${s.runs} scored ${s.scored} score ${s.scoreOverScored} | lat mean ${s.latencyMeanS}s med ${s.latencyMedianS}s | tokens mean ${s.totalTokensMean} | gateway $${s.gatewayCostUsdTotal} specialist $${s.specialistToolCostUsdTotal}`);
  }
}
