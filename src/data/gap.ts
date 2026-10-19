/**
 * "01 / THE GAP": the breadth of what Eden AI's MCP server puts in reach,
 * shown by capability family rather than by tool.
 *
 * Families, tool names and counts come from the catalogue snapshot in
 * data/mcpCatalog.ts (the source of truth); this file only adds, per family,
 * a few example tools to show, and how far each model configuration reaches
 * on its own. The utility family (upload, job polling, model listing) is
 * plumbing rather than a capability and is left out.
 *
 * Reach values are qualified on purpose. `partial` means the model covers a
 * part of the family by itself (it sees the image, hears the speech, can
 * translate by prompting), which is not the same as the dedicated, scored
 * services the tools provide; `note` says what the part is. MCP itself
 * performs none of these: it is the access path, and the connected tool
 * returns the task-specific result.
 *
 * This list is independent of data/capabilities.ts, which drives the scene's
 * eight nodes and must keep its count.
 */
import { mcpFamilies, type McpFamily, type McpTool } from './mcpCatalog';

export type Reach = 'native' | 'partial' | 'absent';

interface GapFamilyInput {
  /** Family id in the catalogue */
  id: string;
  /** Tool names (from the catalogue) shown as examples */
  examples: string[];
  textModel: Reach;
  multimodalModel: Reach;
  /** What the models cover on their own, in a few words */
  note: string;
}

const input: GapFamilyInput[] = [
  { id: 'ocr', examples: ['ocr', 'ocr_tables', 'ocr_financial_parser', 'ocr_identity_parser'], textModel: 'absent', multimodalModel: 'partial', note: 'a multimodal model reads the page; typed fields are tools' },
  { id: 'vision', examples: ['image_object_detection', 'image_face_detection', 'image_deepfake_detection', 'image_explicit_content'], textModel: 'absent', multimodalModel: 'partial', note: 'a multimodal model sees the image; verdicts and scores are tools' },
  { id: 'audio', examples: ['audio_speech_to_text', 'audio_tts'], textModel: 'absent', multimodalModel: 'partial', note: 'a multimodal model hears speech; it cannot produce it' },
  { id: 'video', examples: ['video_deepfake_detection', 'video_generation'], textModel: 'absent', multimodalModel: 'partial', note: 'a multimodal model watches video; no verdict, no generation' },
  { id: 'web', examples: ['web_search', 'web_scraping', 'web_crawl', 'web_structured_extraction'], textModel: 'absent', multimodalModel: 'absent', note: 'no model reaches live pages on its own' },
  { id: 'text', examples: ['text_moderation', 'text_ai_detection', 'text_named_entity_recognition', 'text_plagia_detection'], textModel: 'partial', multimodalModel: 'partial', note: 'any model can try by prompting; no scores, no reference databases' },
  { id: 'translation', examples: ['translation_automatic_translation', 'translation_document_translation'], textModel: 'partial', multimodalModel: 'partial', note: 'any model translates by prompting; not whole documents with layout' },
];

export interface GapFamily extends McpFamily {
  exampleTools: McpTool[];
  /** Tools in the family beyond the examples shown */
  more: number;
  textModel: Reach;
  multimodalModel: Reach;
  note: string;
}

export const gapFamilies: GapFamily[] = input.map((g) => {
  const family = mcpFamilies.find((f) => f.id === g.id);
  if (!family) throw new Error(`gap: unknown catalogue family ${g.id}`);
  const exampleTools = g.examples.map((name) => {
    const tool = family.tools.find((t) => t.name === name);
    if (!tool) throw new Error(`gap: ${name} is not in the ${g.id} family of the catalogue`);
    return tool;
  });
  return { ...family, exampleTools, more: family.tools.length - exampleTools.length, textModel: g.textModel, multimodalModel: g.multimodalModel, note: g.note };
});

export const GAP_TOOL_COUNT = gapFamilies.reduce((n, f) => n + f.tools.length, 0);
