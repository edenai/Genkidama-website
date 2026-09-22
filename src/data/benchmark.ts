/**
 * Benchmark data layer — SCHEMA + PLACEHOLDER SHELL.
 *
 * The final site will load real measurements from a benchmark comparing
 * Gemini Pro and DeepSeek Pro under identical scenarios (same prompts, same
 * assets, same MCP catalogue). Nothing in this file is a result. Every metric
 * in the placeholder dataset is `null`, and components render skeleton states
 * for null values. When real data arrives, replace `benchmarkPlaceholder`
 * with a loader (JSON import, content collection or fetch) that returns a
 * `BenchmarkDataset` with `status: 'live'`.
 */
import type { CapabilityNode } from './capabilities';

export type ModelId = 'gemini-pro' | 'deepseek-pro';

export interface ModelInfo {
  id: ModelId;
  name: string;
  /** Short label for charts */
  short: string;
  /** Modalities the model handles natively (binary inputs) */
  nativeModalities: string[];
  /** Whether it uses MCP specialists for non-native modalities */
  usesMcp: boolean;
  /** CSS custom property carrying the series color */
  seriesVar: string;
}

export const models: Record<ModelId, ModelInfo> = {
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    short: 'Gemini',
    nativeModalities: ['text', 'image', 'audio', 'video', 'pdf'],
    usesMcp: false,
    seriesVar: '--series-native',
  },
  'deepseek-pro': {
    id: 'deepseek-pro',
    name: 'DeepSeek Pro',
    short: 'DeepSeek',
    nativeModalities: ['text'],
    usesMcp: true,
    seriesVar: '--series-mcp',
  },
};

/** Scenario-level measurements. `null` = not yet measured. */
export interface ScenarioMetrics {
  finalAnswerAgreement: number | null; // 0..1
  groundTruthAgreement: number | null; // 0..1
  mcpCalls: number | null;
  toolFailures: number | null;
  recovered: number | null;
  latencyMs: number | null;
  modelLatencyMs: number | null;
  toolLatencyMs: number | null;
  tokens: number | null;
  gatewayCostUsd: number | null;
  expertToolCostUsd: number | null;
}

export type MetricKey = keyof ScenarioMetrics;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
  format: 'percent' | 'count' | 'ms' | 'usd' | 'tokens';
  description: string;
}

export const metricDefinitions: MetricDefinition[] = [
  { key: 'finalAnswerAgreement', label: 'Final-answer agreement', unit: '%', format: 'percent', description: 'Do both models land on the same final answer?' },
  { key: 'groundTruthAgreement', label: 'Ground-truth agreement', unit: '%', format: 'percent', description: 'Agreement with the annotated reference answer.' },
  { key: 'mcpCalls', label: 'MCP calls', unit: '', format: 'count', description: 'Tool calls routed through the MCP server.' },
  { key: 'toolFailures', label: 'Tool failures', unit: '', format: 'count', description: 'Calls that returned an error.' },
  { key: 'recovered', label: 'Recovery', unit: '', format: 'count', description: 'Failures the model recovered from.' },
  { key: 'latencyMs', label: 'Latency', unit: 'ms', format: 'ms', description: 'End-to-end wall clock.' },
  { key: 'modelLatencyMs', label: 'Model latency', unit: 'ms', format: 'ms', description: 'Time spent inside the model.' },
  { key: 'toolLatencyMs', label: 'Tool latency', unit: 'ms', format: 'ms', description: 'Time spent inside specialist tools.' },
  { key: 'tokens', label: 'Tokens', unit: '', format: 'tokens', description: 'Total tokens consumed.' },
  { key: 'gatewayCostUsd', label: 'Gateway cost', unit: '$', format: 'usd', description: 'Model + routing cost.' },
  { key: 'expertToolCostUsd', label: 'Expert-tool cost', unit: '$', format: 'usd', description: 'Specialist tool cost.' },
];

export interface ToolPathStep {
  kind: 'model' | 'mcp' | 'tool' | 'result' | 'native';
  label: string;
}

export interface ScenarioRun {
  model: ModelId;
  metrics: ScenarioMetrics;
  toolPath: ToolPathStep[];
}

export interface Scenario {
  id: string;
  name: string;
  capability: CapabilityNode['id'];
  /** Asset descriptors, e.g. "receipt-014.jpg" */
  assets: string[];
  prompt: string;
  runs: Record<ModelId, ScenarioRun>;
}

export interface BenchmarkDataset {
  version: string;
  generatedAt: string | null;
  status: 'placeholder' | 'live';
  models: Record<ModelId, ModelInfo>;
  scenarios: Scenario[];
}

const emptyMetrics = (): ScenarioMetrics => ({
  finalAnswerAgreement: null,
  groundTruthAgreement: null,
  mcpCalls: null,
  toolFailures: null,
  recovered: null,
  latencyMs: null,
  modelLatencyMs: null,
  toolLatencyMs: null,
  tokens: null,
  gatewayCostUsd: null,
  expertToolCostUsd: null,
});

const nativePath = (): ToolPathStep[] => [
  { kind: 'model', label: 'Gemini' },
  { kind: 'native', label: 'native input' },
  { kind: 'result', label: 'answer' },
];

const mcpPath = (tool: string): ToolPathStep[] => [
  { kind: 'model', label: 'DeepSeek' },
  { kind: 'mcp', label: 'MCP' },
  { kind: 'tool', label: tool },
  { kind: 'model', label: 'DeepSeek' },
  { kind: 'result', label: 'answer' },
];

const shell = (id: string, name: string, capability: string, tool: string, assets: string[], prompt: string): Scenario => ({
  id,
  name,
  capability,
  assets,
  prompt,
  runs: {
    'gemini-pro': { model: 'gemini-pro', metrics: emptyMetrics(), toolPath: nativePath() },
    'deepseek-pro': { model: 'deepseek-pro', metrics: emptyMetrics(), toolPath: mcpPath(tool) },
  },
});

/** Scenario shells only. Metrics are intentionally null until the data pass. */
export const benchmarkPlaceholder: BenchmarkDataset = {
  version: '0.0.0-placeholder',
  generatedAt: null,
  status: 'placeholder',
  models,
  scenarios: [
    shell('s01', 'Receipt total', 'ocr', 'eden.ocr.extract', ['receipt-*.jpg'], 'What is the total amount on this receipt?'),
    shell('s02', 'Chart reading', 'image', 'eden.image.describe', ['chart-*.png'], 'Which series peaks first?'),
    shell('s03', 'Meeting transcript', 'speech', 'eden.speech.transcribe', ['meeting-*.wav'], 'List the action items.'),
    shell('s04', 'Invoice fields', 'documents', 'eden.document.parse', ['invoice-*.pdf'], 'Extract vendor, date and due amount.'),
    shell('s05', 'Video scene', 'video', 'eden.video.analyze', ['clip-*.mp4'], 'When does the speaker change slides?'),
    shell('s06', 'Live page', 'web', 'eden.web.fetch', ['url-*'], 'Summarise the current status page.'),
  ],
};

export const formatMetric = (def: MetricDefinition, v: number | null): string => {
  if (v === null || Number.isNaN(v)) return '—';
  switch (def.format) {
    case 'percent': return `${(v * 100).toFixed(1)}%`;
    case 'ms': return `${Math.round(v).toLocaleString('en-US')} ms`;
    case 'usd': return `$${v.toFixed(4)}`;
    case 'tokens': return v.toLocaleString('en-US');
    default: return String(v);
  }
};
