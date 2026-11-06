// The only module that touches Vite's glob. Content is bundled as raw text; data-load.ts parses and validates it. Every markdown file under data/ is loaded, so a file the loader does not recognize is reported rather than ignored. READMEs are authoring guides and stay out.
export const dataFiles: Readonly<Record<string, string>> = import.meta.glob<string>(['/data/**/*.md', '!/data/**/README.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
