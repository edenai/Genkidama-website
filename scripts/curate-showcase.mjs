#!/usr/bin/env node
/**
 * Curate the combined showcase results for the website.
 *
 * Reads the assembled benchmark folder from the comparison repository
 * (`results/raw/combined_showcase_v2`, built by that repository's
 * `scripts/build_combined_showcase.py`) and writes ONE presentation file:
 *
 *     src/data/experiments/showcase.json
 *
 * Nothing is typed by hand. Every aggregate is recomputed here from the
 * per-run evaluation rows with the same definitions as the comparison
 * repository's `benchmark/combined_showcase/analysis.py::summary_table`, and
 * then asserted against the numbers the analysis notebook
 * (`notebooks/combined_showcase_v2_analysis.ipynb`) printed when it was
 * executed, so a drift between the two sources fails this script instead of
 * reaching the page. Missing values stay `null`; they are never turned into
 * zero.
 *
 * The output is model-neutral: the arms (systems compared) are read from the
 * folder's manifest, every per-arm value is keyed by arm id, and comparisons
 * are stated relative to one reference arm (the native route). Adding a third
 * system later means adding its rows to the folder, one presentation entry to
 * ARM_PRESENTATION below and its expected values to the cross-check; nothing
 * else in the site needs to know the arm by name.
 *
 * Usage:
 *   node scripts/curate-showcase.mjs [path/to/combined_showcase_v2]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  process.argv[2] ??
    resolve(here, '../../Genkidama-project-comparisons/results/raw/combined_showcase_v2'),
);
// Folder name as the comparison repository names it (e.g. combined_showcase_v2);
// its notebook is `notebooks/<folder>_analysis.ipynb`.
const FOLDER = basename(SOURCE);
const OUT = resolve(here, '../src/data/experiments/showcase.json');

// Python's json module writes bare NaN for missing tiers; JSON has no NaN.
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/:\s*NaN\b/g, ': null'));
const readJsonl = (p) =>
  readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

const BENCHMARKS = ['mmmu_pro', 'spoken_squad'];
for (const f of ['manifest.json', 'full_run_context.json', 'selection.jsonl', ...BENCHMARKS.map((b) => `${b}/evaluation.jsonl`)]) {
  if (!existsSync(resolve(SOURCE, f))) {
    console.error(`missing ${f} under ${SOURCE}`);
    process.exit(1);
  }
}

const manifest = readJson(resolve(SOURCE, 'manifest.json'));
const context = readJson(resolve(SOURCE, 'full_run_context.json'));
const selection = readJsonl(resolve(SOURCE, 'selection.jsonl'));

// The systems compared, as the folder names them. Order is the manifest's.
const ARMS = manifest.arms;
// Same as analysis.py: which outcomes count as "scored".
const SCORED = { mmmu_pro: new Set(['correct', 'incorrect']), spoken_squad: new Set(['answered']) };

// Presentation only (names on the page). Anything not listed here falls back
// to the manifest's model label, so an unknown arm is still shown, never hidden.
const ARM_PRESENTATION = {
  deepseek_mcp: { label: 'DeepSeek + MCP', short: 'DeepSeek + MCP' },
  gemini_native: { label: 'Gemini native', short: 'Gemini' },
};

// ---------------------------------------------------------------------------
// Statistics helpers (null-safe: nulls are dropped, never zero-filled, except
// where the notebook explicitly fills zero and says so).
const nums = (xs) => xs.filter((v) => typeof v === 'number' && Number.isFinite(v));
const mean = (xs) => { const n = nums(xs); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
const sum = (xs) => nums(xs).reduce((a, b) => a + b, 0);
const median = (xs) => { const n = [...nums(xs)].sort((a, b) => a - b); if (!n.length) return null; const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; };
const quantile = (xs, q) => { const n = [...nums(xs)].sort((a, b) => a - b); if (!n.length) return null; const pos = (n.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos); return n[lo] + (n[hi] - n[lo]) * (pos - lo); };
const round = (v, d) => (v === null || v === undefined ? null : Number(v.toFixed(d)));
const div = (a, b) => (typeof a === 'number' && typeof b === 'number' && b !== 0 ? a / b : null);

// ---------------------------------------------------------------------------
function summariseArm(bench, sub) {
  const scoredRows = sub.filter((r) => SCORED[bench].has(r.outcome));
  const score = (r) => (bench === 'mmmu_pro' ? (r.outcome === 'correct' ? 1 : 0) : r.f1);
  const lat = (k) => sub.map((r) => (r[k] === null || r[k] === undefined ? null : r[k] / 1000));
  const out = {
    runs: sub.length,
    scored: scoredRows.length,
    // Benchmark's own metric over the scored runs, and over all runs with failures as 0 (both shown, as in the notebook).
    scoreOverScored: round(mean(scoredRows.map(score)), 4),
    scoreOverAllRuns: round(mean(sub.map((r) => (SCORED[bench].has(r.outcome) ? score(r) : 0))), 4),
    exactMatches: bench === 'mmmu_pro' ? sub.filter((r) => r.outcome === 'correct').length : sub.filter((r) => r.exact_match === true && SCORED[bench].has(r.outcome)).length,
    outcomes: Object.fromEntries([...new Set(sub.map((r) => r.outcome))].sort().map((o) => [o, sub.filter((r) => r.outcome === o).length])),
    // Latency and tokens are research measurements kept for the cross-check with the notebook;
    // the site does not present them as comparison metrics (performance and cost only).
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
    // Two cost fields, never summed into one headline: the gateway charge for the model
    // (the `cost` the Eden AI gateway reports with each response, summed over a run's rounds)
    // and the specialist-tool charge reported inside MCP tool results (one count per job).
    gatewayCostUsdMean: round(mean(sub.map((r) => r.gateway_cost_usd)), 5),
    gatewayCostUsdTotal: round(sum(sub.map((r) => r.gateway_cost_usd)), 4),
    runsWithGatewayCost: sub.filter((r) => typeof r.gateway_cost_usd === 'number').length,
    specialistToolCostUsdTotal: round(sum(sub.map((r) => r.specialist_tool_cost_usd)), 4),
    specialistToolCostUsdMean: round(mean(sub.map((r) => r.specialist_tool_cost_usd)), 5),
    runsWithSpecialistCost: sub.filter((r) => typeof r.specialist_tool_cost_usd === 'number').length,
    usdPer1kTokens: round(mean(sub.map((r) => (r.total_tokens ? r.gateway_cost_usd / r.total_tokens : null))) * 1000, 5),
    mcpUsageRate: round(mean(sub.map((r) => (r.mcp_used ? 1 : 0))), 4),
    meanToolCalls: round(mean(sub.map((r) => r.total_tool_calls ?? 0)), 2),
  };
  if (bench === 'spoken_squad') {
    const wer = sub.map((r) => r.wer);
    out.werMean = round(mean(wer), 4);
    out.werMedian = round(median(wer), 4);
    out.transcriptsWithWer = nums(wer).length;
    out.asrBaselineWerMean = round(mean(sub.map((r) => r.asr_baseline_wer)), 4);
    out.runsCallingSpeechTool = sub.filter((r) => r.speech_tool_called).length;
    out.speechToolErroringCalls = sum(sub.map((r) => r.speech_tool_errors));
  }
  return out;
}

function pairSamples(bench, rows, arms) {
  const idOf = (r) => r.task_id ?? r.qa_id;
  const ids = [...new Set(rows.map(idOf))];
  const byTier = Object.fromEntries(selection.filter((s) => s.benchmark === bench).map((s) => [s.id, s]));
  const pick = (r) => {
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
    const runs = {};
    for (const arm of arms) {
      const r = rows.find((x) => x.arm === arm && idOf(x) === id);
      if (r) runs[arm] = pick(r);
    }
    const sel = byTier[id];
    const first = rows.find((x) => idOf(x) === id);
    return {
      id,
      group: bench === 'mmmu_pro' ? first.domain : first.title,
      subject: bench === 'mmmu_pro' ? first.subject : undefined,
      audioDurationS: bench === 'spoken_squad' ? first.audio_duration_s : undefined,
      rank: sel?.rank ?? null,
      tier: sel?.tier ?? null,
      tierLabel: sel?.tier_label ?? null,
      runs,
    };
  }).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}

function toolUsage(sub) {
  const seqs = sub.map((r) => (r.tool_sequence?.length ? r.tool_sequence.join(' -> ') : '(no call)'));
  const counts = {};
  for (const s of seqs) counts[s] = (counts[s] ?? 0) + 1;
  const perTool = {};
  for (const r of sub) for (const t of r.tool_sequence ?? []) perTool[t] = (perTool[t] ?? 0) + 1;
  return {
    runs: sub.length,
    runsWithMcpCalls: sub.filter((r) => r.mcp_used).length,
    meanCallsPerRun: round(mean(sub.map((r) => r.total_tool_calls ?? 0)), 2),
    capabilityCalls: sum(sub.map((r) => r.capability_tool_calls)),
    utilityCalls: sum(sub.map((r) => r.utility_tool_calls)),
    toolExecutionErrors: sum(sub.map((r) => r.tool_execution_errors)),
    runsWithRecovery: sub.filter((r) => r.recovery_successful === true).length,
    callsPerTool: Object.fromEntries(Object.entries(perTool).sort((a, b) => b[1] - a[1])),
    topSequences: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sequence, runs]) => ({ sequence, runs })),
  };
}

// ---------------------------------------------------------------------------
const benchmarks = {};
const armMeta = {}; // arm -> { model, apiModelId, route, path, ... } from the run manifests
for (const bench of BENCHMARKS) {
  const rows = readJsonl(resolve(SOURCE, bench, 'evaluation.jsonl'));
  const bman = readJson(resolve(SOURCE, bench, 'manifest.json'));
  // Arms with rows in this benchmark, in manifest order. An arm that was not
  // run on a benchmark is simply absent here; the page shows what exists.
  const arms = ARMS.filter((a) => rows.some((r) => r.arm === a));
  const armRecords = (bman.arms ?? []).filter((a) => arms.includes(a.arm)).map((a) => ({
    arm: a.arm,
    model: a.label,
    apiModelId: a.api_model_id ?? null,
    route: a.route,
    path: a.offer_mcp_tools ? 'mcp' : 'native',
    offerMcpTools: !!a.offer_mcp_tools,
    inputModalities: a.input_modalities ?? null,
    delivery: a.description ?? null,
  }));
  for (const a of armRecords) armMeta[a.arm] ??= a;

  const summary = {};
  const usage = {};
  for (const arm of arms) {
    const sub = rows.filter((r) => r.arm === arm);
    summary[arm] = summariseArm(bench, sub);
    if (armRecords.find((a) => a.arm === arm)?.offerMcpTools) usage[arm] = toolUsage(sub);
  }
  const samples = pairSamples(bench, rows, arms);
  if (samples.length !== manifest.n_per_benchmark) throw new Error(`${bench}: ${samples.length} samples, expected ${manifest.n_per_benchmark}`);
  // The showcase folder is paired by construction (`both_arms_kept`): every selected task has every arm.
  for (const s of samples) for (const arm of arms) if (!s.runs[arm]) throw new Error(`${bench}: ${s.id} is missing arm ${arm}`);

  benchmarks[bench] = {
    title: bench === 'mmmu_pro' ? 'OCR / vision' : 'Speech',
    dataset: bench === 'mmmu_pro' ? 'MMMU-Pro Vision' : 'Spoken-SQuAD',
    modality: context[bench].modality,
    scoreDefinition: context[bench].score_definition,
    scoreMetric: bench === 'mmmu_pro' ? 'accuracy' : 'F1',
    sampleCount: samples.length,
    // Size of the random sample the source run was launched on (the complete
    // run's paired-task count can be smaller when some tasks never started).
    sampledTasks: bman.sample?.selected_n ?? null,
    datasetSource: bman.dataset?.repo_id ?? bman.dataset?.name ?? null,
    datasetRevision: bman.dataset?.revision ?? bman.dataset?.provenance?.github_commit ?? null,
    promptMode: bman.prompt?.mode ?? bman.prompt?.version ?? null,
    // The prompt as sent (MMMU-Pro's official CoT prompt; the speech template with its {question} slot).
    prompt: bman.prompt?.text ?? bman.prompt?.template ?? null,
    systemPrompt: bman.prompt?.system_prompt ?? null,
    policy: bman.policy ? { maxRounds: bman.policy.max_rounds, maxToolCalls: bman.policy.max_tool_calls } : null,
    mcpUrl: bman.mcp?.url ?? null,
    mcpToolCount: bman.mcp?.tool_count ?? null,
    // The catalogue as served to the MCP arm (snapshot in the run manifest).
    // On the slim endpoint it is a handful of direct tools plus
    // `search_tools` / `run_tool`, through which any other Eden AI tool is
    // reachable (the speech tool then appears as `run_tool(audio_speech_to_text)`).
    mcpToolNames: bman.mcp?.tool_names ?? null,
    arms: armRecords,
    tiers: (manifest.counts[bench].tiers ?? []).map((t) => ({ tier: Number.isFinite(t.tier) ? t.tier : null, label: t.tier_label, description: t.description, eligible: t.eligible, selected: t.selected })),
    fullRun: {
      pairedTasks: context[bench].paired_tasks,
      rows: context[bench].rows,
      perArm: context[bench].per_arm,
      pairMatrix: context[bench].pair_matrix,
      comparison: context[bench].comparison,
    },
    summary,
    toolUsage: usage,
    samples,
  };
}

// The reference arm for comparisons: the native route (no tools offered). The
// selection rules of the folder are stated relative to it as well.
const REFERENCE_ARM = ARMS.find((a) => armMeta[a]?.path === 'native');
if (!REFERENCE_ARM) throw new Error('no native (reference) arm found in the run manifests');

// Comparisons as the notebook defines them (ratio_table): arm ÷ reference on
// means; score difference on score-over-scored. Stated per arm so a further
// system gets its own entry against the same reference.
const comparisons = {};
for (const bench of Object.keys(benchmarks)) {
  const b = benchmarks[bench];
  const g = b.summary[REFERENCE_ARM];
  const versus = {};
  for (const arm of b.arms.map((a) => a.arm)) {
    if (arm === REFERENCE_ARM || !g) continue;
    const d = b.summary[arm];
    versus[arm] = {
      scoreDifference: round(d.scoreOverScored - g.scoreOverScored, 4),
      gatewayCostRatio: round(div(d.gatewayCostUsdMean, g.gatewayCostUsdMean), 2),
      totalCostRatioInclSpecialist: round(div(d.gatewayCostUsdTotal + d.specialistToolCostUsdTotal, g.gatewayCostUsdTotal), 2),
      // Research cross-check only (not presented as comparison metrics on the site).
      latencyRatio: round(div(d.latencyMeanS, g.latencyMeanS), 2),
      tokensRatio: round(div(d.totalTokensMean, g.totalTokensMean), 2),
      usdPer1kTokensRatio: round(div(d.usdPer1kTokens, g.usdPer1kTokens), 2),
    };
  }
  comparisons[bench] = { reference: REFERENCE_ARM, versus };
}

// ---------------------------------------------------------------------------
// Cross-check against the executed notebook (values copied from the rendered
// cross-benchmark summary, ratio, tool-usage and speech-tool tables of
// `notebooks/combined_showcase_v2_analysis.ipynb` on 2026-10-09). A mismatch
// means the folder changed since the notebook ran, or a definition drifted:
// stop and investigate.
const expected = {
  mmmu_pro: {
    deepseek_mcp: { runs: 50, scored: 50, scoreOverScored: 0.94, scoreOverAllRuns: 0.94, exactMatches: 47, latencyMeanS: 62.1, latencyMedianS: 29.9, modelLatencyMeanS: 52.1, toolLatencyMeanS: 9.1, roundsMean: 3.06, promptTokensMean: 10994, completionTokensMean: 3285, totalTokensMean: 14278, totalTokensSum: 713911, gatewayCostUsdMean: 0.00652, gatewayCostUsdTotal: 0.3261, specialistToolCostUsdTotal: 0.5059, usdPer1kTokens: 0.00043, mcpUsageRate: 1, meanToolCalls: 3.14 },
    gemini_native: { runs: 50, scored: 49, scoreOverScored: 0.8367, scoreOverAllRuns: 0.82, exactMatches: 41, latencyMeanS: 16.8, latencyMedianS: 13.3, modelLatencyMeanS: 16.8, toolLatencyMeanS: 0, roundsMean: 1, promptTokensMean: 1229, completionTokensMean: 1745, totalTokensMean: 2974, totalTokensSum: 148713, gatewayCostUsdMean: 0.00747, gatewayCostUsdTotal: 0.3733, specialistToolCostUsdTotal: 0, usdPer1kTokens: 0.00232, mcpUsageRate: 0, meanToolCalls: 0 },
  },
  spoken_squad: {
    deepseek_mcp: { runs: 50, scored: 50, scoreOverScored: 0.9812, scoreOverAllRuns: 0.9812, exactMatches: 47, latencyMeanS: 24.4, latencyMedianS: 21.9, modelLatencyMeanS: 15.8, toolLatencyMeanS: 7.4, roundsMean: 4.04, promptTokensMean: 14230, completionTokensMean: 413, totalTokensMean: 14643, totalTokensSum: 732149, gatewayCostUsdMean: 0.00469, gatewayCostUsdTotal: 0.2347, specialistToolCostUsdTotal: 0.389, usdPer1kTokens: 0.00031, mcpUsageRate: 1, meanToolCalls: 3.18, werMean: 0.0295, werMedian: 0.0224, transcriptsWithWer: 50, asrBaselineWerMean: 0.2532, runsCallingSpeechTool: 50, speechToolErroringCalls: 0 },
    gemini_native: { runs: 50, scored: 50, scoreOverScored: 0.955, scoreOverAllRuns: 0.955, exactMatches: 41, latencyMeanS: 6.7, latencyMedianS: 4.9, modelLatencyMeanS: 6.7, toolLatencyMeanS: 0, roundsMean: 1, promptTokensMean: 1840, completionTokensMean: 346, totalTokensMean: 2186, totalTokensSum: 109278, gatewayCostUsdMean: 0.00268, gatewayCostUsdTotal: 0.1338, specialistToolCostUsdTotal: 0, usdPer1kTokens: 0.00116, mcpUsageRate: 0, meanToolCalls: 0 },
  },
  // Notebook ratio table: DeepSeek + MCP relative to Gemini native.
  comparisons: {
    mmmu_pro: { deepseek_mcp: { scoreDifference: 0.1033, latencyRatio: 3.7, tokensRatio: 4.8, gatewayCostRatio: 0.87, usdPer1kTokensRatio: 0.19, totalCostRatioInclSpecialist: 2.23 } },
    spoken_squad: { deepseek_mcp: { scoreDifference: 0.0262, latencyRatio: 3.64, tokensRatio: 6.7, gatewayCostRatio: 1.75, usdPer1kTokensRatio: 0.27, totalCostRatioInclSpecialist: 4.66 } },
  },
  // DeepSeek + MCP tool usage per benchmark (notebook section 7).
  toolUsage: {
    mmmu_pro: { deepseek_mcp: { runs: 50, runsWithMcpCalls: 50, meanCallsPerRun: 3.14, capabilityCalls: 151, utilityCalls: 6, toolExecutionErrors: 1, runsWithRecovery: 1 } },
    spoken_squad: { deepseek_mcp: { runs: 50, runsWithMcpCalls: 50, meanCallsPerRun: 3.18, capabilityCalls: 102, utilityCalls: 57, toolExecutionErrors: 3, runsWithRecovery: 3 } },
  },
  // Complete source runs (notebook section 3, from full_run_context.json).
  fullRun: {
    mmmu_pro: { pairedTasks: 94, deepseek_better: 5, equal: 44, gemini_better: 0, deepseek_not_scored: 44, gemini_not_scored: 1 },
    spoken_squad: { pairedTasks: 100, deepseek_better: 8, equal: 77, gemini_better: 15, deepseek_not_scored: 0, gemini_not_scored: 0 },
  },
};
const problems = [];
const close = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 0.002 + 0.00001));
for (const bench of BENCHMARKS) {
  for (const [arm, vals] of Object.entries(expected[bench])) for (const [k, v] of Object.entries(vals)) if (!close(benchmarks[bench].summary[arm]?.[k], v)) problems.push(`${bench}.${arm}.${k}: computed ${benchmarks[bench].summary[arm]?.[k]} vs notebook ${v}`);
  for (const [arm, vals] of Object.entries(expected.comparisons[bench])) for (const [k, v] of Object.entries(vals)) if (!close(comparisons[bench].versus[arm]?.[k], v)) problems.push(`${bench}.comparison.${arm}.${k}: computed ${comparisons[bench].versus[arm]?.[k]} vs notebook ${v}`);
  for (const [arm, vals] of Object.entries(expected.toolUsage[bench])) for (const [k, v] of Object.entries(vals)) if (!close(benchmarks[bench].toolUsage[arm]?.[k], v)) problems.push(`${bench}.toolUsage.${arm}.${k}: computed ${benchmarks[bench].toolUsage[arm]?.[k]} vs notebook ${v}`);
  const { pairedTasks, ...cmp } = expected.fullRun[bench];
  if (!close(benchmarks[bench].fullRun.pairedTasks, pairedTasks)) problems.push(`${bench}.fullRun.pairedTasks: ${benchmarks[bench].fullRun.pairedTasks} vs notebook ${pairedTasks}`);
  for (const [k, v] of Object.entries(cmp)) if (!close(benchmarks[bench].fullRun.comparison[k], v)) problems.push(`${bench}.fullRun.comparison.${k}: ${benchmarks[bench].fullRun.comparison[k]} vs notebook ${v}`);
}
if (problems.length) {
  console.error('Cross-check against the notebook FAILED:\n  ' + problems.join('\n  '));
  process.exit(2);
}

const toolCount = benchmarks.mmmu_pro.mcpToolCount;
const arms = Object.fromEntries(
  ARMS.filter((a) => armMeta[a]).map((a) => {
    const m = armMeta[a];
    const pres = ARM_PRESENTATION[a] ?? { label: m.model, short: m.model };
    return [a, {
      ...pres,
      model: m.model,
      apiModelId: m.apiModelId,
      path: m.path,
      route: m.route,
      inputModalities: m.inputModalities,
      description: m.path === 'mcp'
        ? `text-only model + Eden AI MCP (${toolCount}-tool catalogue; any other Eden AI tool reachable through search_tools / run_tool); the model decides whether and what to call`
        : 'natively multimodal model; image or audio delivered as a native content part; no tools',
    }];
  }),
);

const out = {
  generatedAt: new Date().toISOString(),
  provenance: {
    folder: `results/raw/${FOLDER}`,
    repository: 'Genkidama-project-comparisons',
    assembledAt: manifest.created_at,
    codeCommit: manifest.sources.mmmu_pro.source_code_git_commit,
    notebook: `notebooks/${FOLDER}_analysis.ipynb`,
    sources: Object.fromEntries(Object.entries(manifest.sources).map(([k, v]) => [k, { runName: v.run_name, evaluatedAt: v.evaluated_at, evaluationRows: v.evaluation_rows, codeCommit: v.source_code_git_commit }])),
    curationScript: 'scripts/curate-showcase.mjs',
    crossCheckedAgainstNotebook: true,
  },
  nPerBenchmark: manifest.n_per_benchmark,
  referenceArm: REFERENCE_ARM,
  arms,
  selection: {
    note: manifest.selection_rules.note,
    tiers: manifest.selection_rules.tiers,
    excluded: manifest.selection_rules.excluded,
    orderWithinTier: manifest.selection_rules.order_within_tier,
  },
  benchmarks,
  comparisons,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB); cross-check against the notebook passed.`);
for (const bench of Object.keys(benchmarks)) {
  for (const arm of benchmarks[bench].arms.map((a) => a.arm)) {
    const s = benchmarks[bench].summary[arm];
    console.log(`${bench.padEnd(13)} ${arm.padEnd(14)} runs ${s.runs} scored ${s.scored} score ${s.scoreOverScored} | gateway $${s.gatewayCostUsdTotal} (mean $${s.gatewayCostUsdMean}) specialist $${s.specialistToolCostUsdTotal}`);
  }
}
