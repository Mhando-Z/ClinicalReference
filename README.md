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

- Chapter navigation and full-text search, including text inside tables.
- Source sections loaded individually, instead of loading the full document into the reader.
- Original paragraphs, inline bold/italic, superscripts/subscripts, figures, and tables with merged cells.
- Markdown rendering for narrative paragraphs and headings, with grouped bullet lists and clearer subsection spacing. Source punctuation is escaped before formatting; merged tables, superscripts/subscripts, complex multiline text, and emphasis changes inside words retain their dedicated source renderer. Markdown is derived from the existing JSON at render time; no re-extraction is needed for this formatting change.
- Saved sections stored locally in the browser, scoped to this document's hash.
- Linkable sections and subsection headings; browser back/forward navigation.
- Responsive navigation, keyboard search shortcut (`/`), reduced-motion support, and print styles.
- Light/dark theme toggle in the top bar. The first visit follows your system preference; your selection is remembered in this browser. Document figures retain their original colors and printing uses a light background.
- Standalone OR appears as a divider and AND as a vertical connector; AND/OR and PLUS retain their source wording. These markers do not regroup or rewrite the treatments around them.
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
npm.cmd run build
npm.cmd run verify:export
npm.cmd run start
```

The build statically exports the site to `out/`, suitable for a static web host. `npm.cmd run start` serves the production build locally. No database, API key, or AI service is required. Dependencies are resolved in `package-lock.json`; use `npm.cmd ci` to reproduce the installation.

`npm.cmd run test:browser` tests the production export with Playwright using an installed Microsoft Edge browser. It covers chapter browsing, source reading, table rendering, search, bookmarks, source details, mobile navigation, and section URLs. Screenshots are written under `test-results/`. Build first and stop any other server on port 3000 before running the browser tests.

## Content fidelity and review

This first version presents extracted source text, not generated clinical summaries. Clinical and layout review is pending. Heading styles in the supplied document are inconsistent, so chapter detection handles unstyled chapter markers and topic boundaries use Heading 2. Treatment conjunctions such as AND/OR remain in their surrounding sections. The contents list is retained without creating duplicate chapters.

Tables inside Word textboxes are extracted near their containing paragraph. Exact floating-object placement is not reproduced. Headers, footers, footnotes, and endnotes are retained as supplementary text in the extraction report. Word's automatic list labels are not reconstructed; list metadata is retained and the reader uses bullets. Page numbers are not inferred. Some text already has encoding artifacts in the source; extraction does not guess corrections. Review these differences against the original before relying on the website during clinical care.

The static output includes the original document and extracted content. Hosting access should match the intended audience. This project has no authentication or patient-record functionality.
