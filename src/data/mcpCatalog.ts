/**
 * Eden AI MCP server catalogue, grouped into capability families for the
 * Bridge visualisation.
 *
 * The server publishes one tool per expert-model feature plus a few utility
 * tools, and clients discover the catalogue at runtime through `tools/list`
 * (every tool carries a JSON Schema). This file is therefore a snapshot for
 * presentation, not the contract: `snapshotDate` says when it was taken.
 *
 * Source: https://www.edenai.co/docs/v3/expert-models/mcp-server
 */

export const MCP_DOCS_URL = 'https://www.edenai.co/docs/v3/expert-models/mcp-server';
export const MCP_SERVER_URL = 'https://mcp.edenai.run/mcp';

export interface McpTool {
  /** Tool name as published by the server */
  name: string;
  /** Human-readable label for the site */
  label: string;
}

export interface McpFamily {
  id: string;
  name: string;
  /** Two-letter glyph, same convention as the capability nodes */
  glyph: string;
  /** Hex accent. Stays inside the cyan family, matching the capability nodes. */
  accent: string;
  tools: McpTool[];
}

export const mcpSnapshotDate = '2026-09';

export const mcpFamilies: McpFamily[] = [
  {
    id: 'vision',
    name: 'Vision',
    glyph: 'IM',
    accent: '#b6f6ff',
    tools: [
      { name: 'image_object_detection', label: 'object detection' },
      { name: 'image_face_detection', label: 'face detection' },
      { name: 'image_face_recognition', label: 'face recognition' },
      { name: 'image_face_compare', label: 'face compare' },
      { name: 'image_logo_detection', label: 'logo detection' },
      { name: 'image_explicit_content', label: 'explicit content' },
      { name: 'image_ai_detection', label: 'AI-image detection' },
      { name: 'image_deepfake_detection', label: 'deepfake detection' },
      { name: 'image_generation', label: 'image generation' },
      { name: 'image_background_removal', label: 'background removal' },
      { name: 'image_anonymization', label: 'anonymization' },
    ],
  },
  {
    id: 'ocr',
    name: 'OCR & documents',
    glyph: 'OC',
    accent: '#5cecff',
    tools: [
      { name: 'ocr', label: 'OCR' },
      { name: 'ocr_async', label: 'OCR, async' },
      { name: 'ocr_tables', label: 'table extraction' },
      { name: 'ocr_financial_parser', label: 'financial parser' },
      { name: 'ocr_identity_parser', label: 'identity parser' },
      { name: 'ocr_resume_parser', label: 'resume parser' },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    glyph: 'AU',
    accent: '#22d3f0',
    tools: [
      { name: 'audio_speech_to_text', label: 'speech-to-text' },
      { name: 'audio_tts', label: 'text-to-speech' },
    ],
  },
  {
    id: 'video',
    name: 'Video',
    glyph: 'VD',
    accent: '#3fdcf5',
    tools: [
      { name: 'video_deepfake_detection', label: 'deepfake detection' },
      { name: 'video_generation', label: 'video generation' },
    ],
  },
  {
    id: 'web',
    name: 'Web',
    glyph: 'WB',
    accent: '#d8fbff',
    tools: [
      { name: 'web_search', label: 'search' },
      { name: 'web_research', label: 'research' },
      { name: 'web_scraping', label: 'scraping' },
      { name: 'web_batch_scrape', label: 'batch scrape' },
      { name: 'web_crawl', label: 'crawl' },
      { name: 'web_map', label: 'site map' },
      { name: 'web_structured_extraction', label: 'structured extraction' },
    ],
  },
  {
    id: 'text',
    name: 'Text',
    glyph: 'TX',
    accent: '#8ff0ff',
    tools: [
      { name: 'text_moderation', label: 'moderation' },
      { name: 'text_ai_detection', label: 'AI-text detection' },
      { name: 'text_named_entity_recognition', label: 'entity recognition' },
      { name: 'text_topic_extraction', label: 'topic extraction' },
      { name: 'text_spell_check', label: 'spell check' },
      { name: 'text_plagia_detection', label: 'plagiarism detection' },
    ],
  },
  {
    id: 'translation',
    name: 'Translation',
    glyph: 'TR',
    accent: '#6ce4f7',
    tools: [
      { name: 'translation_automatic_translation', label: 'automatic translation' },
      { name: 'translation_document_translation', label: 'document translation' },
    ],
  },
  {
    id: 'utility',
    name: 'Utility',
    glyph: 'UT',
    accent: '#0a9bb8',
    tools: [
      { name: 'upload_file', label: 'upload file' },
      { name: 'check_job', label: 'check job' },
      { name: 'list_models', label: 'list models' },
    ],
  },
];

export const MCP_FAMILY_COUNT = mcpFamilies.length;
export const MCP_TOOL_COUNT = mcpFamilies.reduce((n, f) => n + f.tools.length, 0);
