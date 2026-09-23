/**
 * Narrative section index. Drives the top navigation, the left rail and the
 * section markers. Order is the reading order of the page.
 */
export interface NavSection {
  id: string;
  index: string;
  title: string;
  /** Short label for the rail */
  short: string;
}

export const sections: NavSection[] = [
  { id: 'idea', index: '01', title: 'The idea', short: 'Idea' },
  { id: 'gap', index: '02', title: 'The gap', short: 'Gap' },
  { id: 'bridge', index: '03', title: 'The bridge', short: 'Bridge' },
  { id: 'experiment', index: '04', title: 'The experiment', short: 'Experiment' },
  { id: 'next', index: '05', title: 'The next problem', short: 'Next' },
];

export const externalLinks = [
  { label: 'Eden AI', href: 'https://www.edenai.co', external: true },
  { label: 'MCP server', href: '#bridge', external: false },
];
