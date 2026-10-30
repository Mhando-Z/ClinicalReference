# Clinical Reference

A local Next.js website for browsing and searching `medical.docx`, Tanzania's Standard Treatment Guidelines and National Essential Medicines List (seventh edition, 2026).

## Run

Requirements: Python 3.10+ and Node.js 20.9+.

```powershell
python extractor.py
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. On Windows, `npm.cmd` works when PowerShell's execution policy blocks `npm.ps1`. On other systems use `npm`.

## Features

- Dedicated App Router pages for the library (`/`), chapter directory (`/chapters/`), individual chapters (`/chapters/<id>/`), saved sections (`/saved/`), reading history (`/recent/`), source details (`/source/`), and individual sections (`/sections/<id>/`). Direct links and page refreshes work in the static export. Existing section hash links redirect to the corresponding route.
- Full-text search, including text inside tables, with title relevance ranking, highlighted matching passages, suggested searches, chapter and content filters, sorting, pagination, and grid/list views. Search, filters, sort, and page number are saved in the URL and restored when returning from a section. Failed full-text requests offer a retry and fall back to title/preview matches.
- Source sections are prerendered as individual pages, instead of loading the full document into the reader.
- All visual styling uses Tailwind utility classes in the components. `app/tailwind.css` contains only Tailwind's import and the dark variant configuration; there is no custom global stylesheet or component CSS.
- Original paragraphs, inline bold/italic, superscripts/subscripts, figures, and tables with merged cells.
- Markdown rendering for narrative paragraphs and headings, with grouped bullet lists and clearer subsection spacing. Source punctuation is escaped before formatting; merged tables, superscripts/subscripts, complex multiline text, and emphasis changes inside words retain their dedicated source renderer. Markdown is derived from the existing JSON at render time; no re-extraction is needed for this formatting change.
- Saved sections stored locally in the browser, scoped to this document's hash.
- A local reading history of the last 20 sections, with a clear-history action.
- Linkable sections and subsection headings; browser back/forward navigation.
- Responsive navigation with a modal mobile menu, keyboard search shortcuts (`/` and `Ctrl/Cmd+K`), reduced-motion support, adjustable reading size, copy-link feedback, heading anchors, previous/next sections, and a print action with Tailwind print utilities.
- Light/dark theme toggle in the top bar. The first visit follows your system preference; your selection is remembered in this browser. Document figures retain their original colors and printing uses a light background.
- Standalone AND, OR, and AND/OR labels are hidden in the reader. Inline wording, PLUS, the extracted JSON, and the original downloadable document are retained.
- Original DOCX download, source block identifiers, and an extraction report.

## Data pipeline

The extractor uses only Python's standard library. It does not send content to an external service.

```text
medical.docx
  → extractor.py
  → public/data/catalog.json              # chapters, section metadata, source hash
  → public/data/search-index.json         # full text, fetched when searching
  → public/data/sections/<section-id>.json # ordered source blocks
  → public/data/images/                   # original embedded media
  → public/data/extraction-report.json    # coverage, warnings, supplementary text
  → public/data/source.docx               # original document for download
```

Re-run `python extractor.py` when the document changes. Restart the development server or rebuild afterward to refresh the catalog loaded by the page. Custom input/output paths are available with `python extractor.py path/to/document.docx --output public/data`. The website's title and edition metadata currently target the supplied Tanzania document; adjust that metadata if importing a different publication. The website expects the output at `public/data`.

## Validation and production

```powershell
npm.cmd run test:extractor
npm.cmd run test:markdown
npm.cmd run test:search
npm.cmd run build
npm.cmd run verify:export
npm.cmd run start
```

The build statically exports the site to `out/`, suitable for a static web host. `npm.cmd run start` serves the production build locally. No database, API key, or AI service is required. Dependencies are resolved in `package-lock.json`; use `npm.cmd ci` to reproduce the installation.

`npm.cmd run test:browser` tests the production export with Playwright using an installed Microsoft Edge browser. It covers direct routes, chapter browsing, source reading, table rendering, search and retry, filter restoration, pagination, bookmarks, history, source details, mobile navigation, reader preferences, theme persistence, print layout, and section URLs. Screenshots are written under `test-results/`. Build first. Tests start an isolated server on port 3100; override with `PLAYWRIGHT_PORT` if needed.

## Content fidelity and review

The library presents extracted source text, not generated clinical summaries. Clinical and layout review is pending. Heading styles in the supplied document are inconsistent, so chapter detection handles unstyled chapter markers and topic boundaries use Heading 2. Standalone AND/OR labels are suppressed only in the reader; refer to the original document for treatment relationships. The contents list is retained without creating duplicate chapters.

Tables inside Word textboxes are extracted near their containing paragraph. Exact floating-object placement is not reproduced. Headers, footers, footnotes, and endnotes are retained as supplementary text in the extraction report. Word's automatic list labels are not reconstructed; list metadata is retained and the reader uses bullets. Page numbers are not inferred. Some text already has encoding artifacts in the source; extraction does not guess corrections. Review these differences against the original before relying on the website during clinical care.

The static output includes the original document and extracted content. Hosting access should match the intended audience. This project has no authentication or patient-record functionality.
