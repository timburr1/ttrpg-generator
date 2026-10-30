import { expect, it } from 'vitest';
import { dataFiles } from './data-files';
import { dataLoad } from './data-load';

// Loads the real data/ folder exactly as the page does. A failure prints every problem with its file and line.
it('loads the real content files without problems', () => {
  expect(() => dataLoad(dataFiles)).not.toThrow();
});
