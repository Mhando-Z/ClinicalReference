import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve("out");
const dataRoot = path.join(root, "data");
const readJson = async (file) =>
  JSON.parse(await fs.readFile(path.join(dataRoot, file), "utf8"));
const catalog = await readJson("catalog.json");
const search = await readJson("search-index.json");
const report = await readJson("extraction-report.json");
const html = await fs.readFile(path.join(root, "index.html"), "utf8");
assert.ok(
  html.includes("Guidelines, made accessible"),
  "Library is pre-rendered",
);
assert.equal(catalog.sections.length, 341);
assert.equal(catalog.chapters.length, 28);
assert.equal(new Set(catalog.chapters.map((c) => c.id)).size, 28);
assert.equal(search.length, catalog.sections.length);
assert.equal(report.coverage.unassignedBlocks, 0);
const source = await fs.readFile(path.join(dataRoot, "source.docx"));
assert.equal(
  crypto.createHash("sha256").update(source).digest("hex"),
  catalog.metadata.sha256,
);
const imagePaths = new Set();
let tables = 0;
const blockIds = new Set();
function inspect(blocks) {
  for (const block of blocks) {
    assert.ok(!blockIds.has(block.id), `Duplicate source block ${block.id}`);
    blockIds.add(block.id);
    for (const image of block.images || []) imagePaths.add(image.src);
    if (block.type === "table") {
      tables++;
      for (const row of block.rows)
        for (const cell of row.cells) inspect(cell.blocks);
    }
  }
}
for (const entry of catalog.sections) {
  await fs.access(path.join(root, "sections", entry.id, "index.html"));
  const section = await readJson(`sections/${entry.id}.json`);
  assert.equal(section.id, entry.id);
  assert.equal(section.chapterId, entry.chapterId);
  assert.ok(search.some((s) => s.id === entry.id));
  inspect(section.blocks);
}
for (const chapter of catalog.chapters)
  await fs.access(path.join(root, "chapters", chapter.id, "index.html"));
for (const route of ["chapters", "saved", "recent", "source"])
  await fs.access(path.join(root, route, "index.html"));
assert.equal(tables, 547);
assert.equal(imagePaths.size, 53);
for (const url of imagePaths) await fs.access(path.join(root, url.slice(1)));
for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+)/g)) {
  await fs.access(path.join(root, decodeURIComponent(match[1]).slice(1)));
}
console.log(
  `Export verified: ${catalog.sections.length} sections, ${tables} tables, ${imagePaths.size} images, original DOCX hash, and page assets.`,
);
