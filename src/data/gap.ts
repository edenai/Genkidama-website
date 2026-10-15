/**
 * Rows of "02 / THE GAP".
 *
 * What a text-only model and a natively multimodal model can do on their own,
 * and what becomes reachable once Eden AI's MCP server is in reach. Two
 * groups: perceiving the input (native to a multimodal model, out of reach
 * for a text-only one) and specialist services that no model provides as a
 * built-in capability. MCP itself performs none of these; it is the access
 * path, and the connected tool returns the task-specific result.
 *
 * Every `tool` is a tool name the Eden AI MCP server publishes (the full
 * catalogue is in data/mcpCatalog.ts). Reach values are qualified on purpose:
 * `partial` means the model may approximate the task by prompting, with
 * model-dependent results, which is not the same as a dedicated, scored
 * service. Accents stay inside the cyan family of the capability nodes.
 *
 * This list is independent of data/capabilities.ts, which drives the scene's
 * eight nodes and must keep its count.
 */

export type Reach = 'native' | 'partial' | 'absent';

export interface GapRow {
  id: string;
  name: string;
  /** Two-letter glyph, same convention as the capability nodes */
  glyph: string;
  accent: string;
  /** MCP tool name(s) that provide the capability */
  tools: string[];
  /** What the tool returns, in a few words */
  note: string;
  textModel: Reach;
  multimodalModel: Reach;
}

export interface GapGroup {
  id: string;
  title: string;
  rows: GapRow[];
}

export const gapGroups: GapGroup[] = [
  {
    id: 'perceive',
    title: 'perceive the input',
    rows: [
      {
        id: 'ocr',
        name: 'OCR',
        glyph: 'OC',
        accent: '#5cecff',
        tools: ['ocr'],
        note: 'text out of scans, screenshots and photos',
        textModel: 'absent',
        multimodalModel: 'native',
      },
      {
        id: 'image',
        name: 'Image understanding',
        glyph: 'IM',
        accent: '#b6f6ff',
        tools: ['image_object_detection'],
        note: 'objects located, with boxes and labels',
        textModel: 'absent',
        multimodalModel: 'native',
      },
      {
        id: 'speech',
        name: 'Speech',
        glyph: 'SP',
        accent: '#8ff0ff',
        tools: ['audio_speech_to_text'],
        note: 'a transcript the model can quote',
        textModel: 'absent',
        multimodalModel: 'native',
      },
    ],
  },
  {
    id: 'services',
    title: 'beyond perception · specialist services',
    rows: [
      {
        id: 'ai-detection',
        name: 'AI-image detection',
        glyph: 'AI',
        accent: '#a5f2ff',
        tools: ['image_ai_detection'],
        note: 'a score: was this image generated',
        textModel: 'absent',
        multimodalModel: 'absent',
      },
      {
        id: 'deepfake',
        name: 'Deepfake detection',
        glyph: 'DF',
        accent: '#3fdcf5',
        tools: ['image_deepfake_detection', 'video_deepfake_detection'],
        note: 'image or video · verdict and confidence',
        textModel: 'absent',
        multimodalModel: 'absent',
      },
      {
        id: 'moderation',
        name: 'Explicit-content moderation',
        glyph: 'XC',
        accent: '#22d3f0',
        tools: ['image_explicit_content'],
        note: 'scored categories, not a judgement call',
        textModel: 'absent',
        multimodalModel: 'partial',
      },
      {
        id: 'anonymisation',
        name: 'Face anonymisation',
        glyph: 'FA',
        accent: '#6ce4f7',
        tools: ['image_anonymization'],
        note: 'faces blurred, the image returned',
        textModel: 'absent',
        multimodalModel: 'partial',
      },
      {
        id: 'tts',
        name: 'Text-to-speech',
        glyph: 'TS',
        accent: '#5cecff',
        tools: ['audio_tts'],
        note: 'an audio file, in a chosen voice',
        textModel: 'absent',
        multimodalModel: 'partial',
      },
      {
        id: 'web',
        name: 'Web search & extraction',
        glyph: 'WB',
        accent: '#d8fbff',
        tools: ['web_search', 'web_structured_extraction'],
        note: 'live pages, structured fields out',
        textModel: 'absent',
        multimodalModel: 'absent',
      },
      {
        id: 'parsers',
        name: 'Financial & identity parsing',
        glyph: 'DC',
        accent: '#a5f2ff',
        tools: ['ocr_financial_parser', 'ocr_identity_parser'],
        note: 'typed fields from invoices and ID documents',
        textModel: 'absent',
        multimodalModel: 'partial',
      },
    ],
  },
];

export const GAP_ROW_COUNT = gapGroups.reduce((n, g) => n + g.rows.length, 0);
