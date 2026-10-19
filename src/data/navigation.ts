/**
 * Narrative section index. Drives the top navigation, the left rail, the
 * footer index and the section markers. Order is the reading order of the
 * page: Hero → Gap → Bridge → Experiments.
 */
export interface NavSection {
  id: string;
  index: string;
  title: string;
  /** Short label for the rail */
  short: string;
}

export const sections: NavSection[] = [
  { id: 'gap', index: '01', title: 'The gap', short: 'Gap' },
  { id: 'bridge', index: '02', title: 'The bridge', short: 'Bridge' },
  { id: 'experiments', index: '03', title: 'The experiments', short: 'Experiments' },
];

export const externalLinks = [
  { label: 'Eden AI', href: 'https://www.edenai.co', external: true },
  { label: 'MCP server', href: '#bridge', external: false },
];
