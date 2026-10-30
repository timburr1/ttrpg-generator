// The only module that touches Vite's glob. Content is bundled as raw text; data-load.ts parses and validates it.
export const dataFiles: Readonly<Record<string, string>> = import.meta.glob<string>(['/data/quirks.md', '/data/names/**/*.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
