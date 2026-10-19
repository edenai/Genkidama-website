/**
 * Plain-language descriptions of the MCP tools that appear in the execution
 * records (the `tool_sequence` of each run). Only tools the model actually
 * called are described; the full catalogue is never listed as if it were
 * used. Names are the server's tool names; `run_tool(x)` is how the record
 * spells a tool reached through the slim endpoint's `run_tool` utility.
 *
 * `kind`: a capability tool performs the task (reads the image, transcribes
 * the audio, searches the web); a utility tool is plumbing of the catalogue
 * (finding a tool, listing models, polling an asynchronous job).
 */
export interface ToolDescription {
  label: string;
  description: string;
  kind: 'capability' | 'utility';
}

export const toolDescriptions: Record<string, ToolDescription> = {
  ocr: { label: 'OCR', description: 'reads the text out of the uploaded screenshot', kind: 'capability' },
  web_search: { label: 'web search', description: 'searches the web for a query', kind: 'capability' },
  'run_tool(audio_speech_to_text)': { label: 'speech-to-text', description: 'transcribes the uploaded audio, as an asynchronous job started through run_tool', kind: 'capability' },
  audio_speech_to_text: { label: 'speech-to-text', description: 'transcribes the uploaded audio', kind: 'capability' },
  image_object_detection: { label: 'object detection', description: 'locates objects in the image, with boxes and labels', kind: 'capability' },
  search_tools: { label: 'search tools', description: 'finds a tool in the complete Eden AI catalogue by description', kind: 'utility' },
  run_tool: { label: 'run tool', description: 'runs a tool found through search tools', kind: 'utility' },
  check_job: { label: 'check job', description: 'polls an asynchronous job until its result is ready', kind: 'utility' },
  list_models: { label: 'list models', description: 'lists the providers available for a tool', kind: 'utility' },
  upload_file: { label: 'upload file', description: 'uploads a file to Eden AI (done by the harness, not the model)', kind: 'utility' },
};

/** Description for a recorded tool name, falling back to the raw name. */
export function describeTool(name: string): ToolDescription {
  return toolDescriptions[name] ?? { label: name, description: 'tool from the Eden AI catalogue', kind: 'capability' };
}
