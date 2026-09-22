/**
 * Capability catalogue.
 *
 * A capability is something a model may or may not natively possess and which
 * Eden AI's MCP server can expose as a specialist tool. The same records drive:
 *   - the WebGL capability nodes (layout hints, accent, energy)
 *   - the capability matrix in "02 / THE GAP"
 *   - the architecture diagram and tool-call trace
 *
 * Positions are NOT stored here. Only layout hints (azimuth / elevation on the
 * outer shell) are, so the scene can lay nodes out for any camera and so a
 * later benchmark layer can drive `energy` per node from real data.
 */

export type CapabilityCategory = 'vision' | 'audio' | 'document' | 'web' | 'language';

export interface NativeSupport {
  /** A text-only model (e.g. DeepSeek-class) */
  textModel: boolean;
  /** A natively multimodal model (e.g. Gemini-class) */
  multimodalModel: boolean;
}

export interface CapabilityNode {
  id: string;
  /** Display name, uppercase in labels */
  name: string;
  /** Two-letter glyph used in nodes and traces */
  glyph: string;
  /** Zero-padded index printed next to the node */
  index: string;
  category: CapabilityCategory;
  /** Hex accent. Stays inside the cyan family; only luminance/temperature varies. */
  accent: string;
  /** Layout hints on the outer shell, in radians */
  azimuth: number;
  elevation: number;
  /** Baseline energy 0..1. Benchmark data will overwrite this at runtime. */
  energy: number;
  native: NativeSupport;
  /** Example MCP tool name (placeholder naming) */
  tool: string;
  /** Placeholder copy */
  description: string;
}

const TAU = Math.PI * 2;

export const capabilities: CapabilityNode[] = [
  {
    id: 'ocr',
    name: 'OCR',
    glyph: 'OC',
    index: '01',
    category: 'document',
    accent: '#5cecff',
    azimuth: TAU * (0 / 8),
    elevation: 0.18,
    energy: 0.6,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.ocr.extract',
    description: 'Read text out of scanned pages, receipts and screenshots.',
  },
  {
    id: 'image',
    name: 'Image',
    glyph: 'IM',
    index: '02',
    category: 'vision',
    accent: '#b6f6ff',
    azimuth: TAU * (1 / 8),
    elevation: -0.22,
    energy: 0.55,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.image.describe',
    description: 'Describe, detect, classify and compare images.',
  },
  {
    id: 'audio',
    name: 'Audio',
    glyph: 'AU',
    index: '03',
    category: 'audio',
    accent: '#22d3f0',
    azimuth: TAU * (2 / 8),
    elevation: 0.3,
    energy: 0.45,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.audio.analyze',
    description: 'Classify sounds, segment speakers, detect events.',
  },
  {
    id: 'speech',
    name: 'Speech',
    glyph: 'SP',
    index: '04',
    category: 'audio',
    accent: '#8ff0ff',
    azimuth: TAU * (3 / 8),
    elevation: -0.1,
    energy: 0.5,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.speech.transcribe',
    description: 'Turn spoken audio into timestamped text.',
  },
  {
    id: 'video',
    name: 'Video',
    glyph: 'VD',
    index: '05',
    category: 'vision',
    accent: '#3fdcf5',
    azimuth: TAU * (4 / 8),
    elevation: 0.26,
    energy: 0.35,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.video.analyze',
    description: 'Extract scenes, objects and text from moving images.',
  },
  {
    id: 'web',
    name: 'Web',
    glyph: 'WB',
    index: '06',
    category: 'web',
    accent: '#d8fbff',
    azimuth: TAU * (5 / 8),
    elevation: -0.3,
    energy: 0.5,
    native: { textModel: false, multimodalModel: false },
    tool: 'eden.web.fetch',
    description: 'Fetch and read live pages the model has never seen.',
  },
  {
    id: 'translation',
    name: 'Translation',
    glyph: 'TR',
    index: '07',
    category: 'language',
    accent: '#6ce4f7',
    azimuth: TAU * (6 / 8),
    elevation: 0.08,
    energy: 0.4,
    native: { textModel: true, multimodalModel: true },
    tool: 'eden.text.translate',
    description: 'Specialist translation for long or low-resource languages.',
  },
  {
    id: 'documents',
    name: 'Documents',
    glyph: 'DC',
    index: '08',
    category: 'document',
    accent: '#a5f2ff',
    azimuth: TAU * (7 / 8),
    elevation: -0.16,
    energy: 0.6,
    native: { textModel: false, multimodalModel: true },
    tool: 'eden.document.parse',
    description: 'Parse invoices, forms and PDFs into structured fields.',
  },
];

export const capabilityById = (id: string): CapabilityNode | undefined =>
  capabilities.find((c) => c.id === id);

export const CAPABILITY_COUNT = capabilities.length;
