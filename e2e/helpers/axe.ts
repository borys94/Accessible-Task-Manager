// axe runs only the rules that carry at least one of these tags; the sets do not overlap
// (rule counts as of axe-core 4.13)
export const AXE_TAGS = [
  'wcag2a', // WCAG 2.0 level A (62 rules): alt text, link/button names, form labels, page lang, ARIA validity
  'wcag2aa', // WCAG 2.0 level AA (3 rules): colour contrast, zoom not blocked by meta viewport, valid lang on parts of the page
  'wcag21a', // WCAG 2.1 level A (1 rule): visible label is part of the accessible name (2.5.3 Label in Name)
  'wcag21aa', // WCAG 2.1 level AA (3 rules): orientation lock, autocomplete purpose, text spacing
  'wcag22a', // WCAG 2.2 level A (0 rules yet): picked up automatically when axe adds them
  'wcag22aa', // WCAG 2.2 level AA (1 rule): target size of interactive elements (2.5.8), off by default
  'best-practice', // not WCAG (30 rules): landmarks, single h1, heading order, unique landmark names
];
