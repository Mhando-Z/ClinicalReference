import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { sourceMarkdown, supportsMarkdown } from "../app/lib/source-markdown.mjs";

function parsedText(block) {
  let text;
  const plain = node => node.type === "text" ? node.value : (node.children || []).map(plain).join("");
  Markdown({ children: sourceMarkdown(block), skipHtml: true, rehypePlugins: [() => tree => { text = plain(tree); }] });
  return text;
}

test("source punctuation, medical comparisons, HTML, links, and entities stay literal", () => {
  const text = 'Dose: <5 mg/kg; SpO2 >= 92%; a_b * 2; [reference](https://example.com); <script>alert(1)</script> &amp;';
  const block = { type: "paragraph", text, runs: [{ text }] };
  assert.equal(parsedText(block), text);
  const html = renderToStaticMarkup(createElement(Markdown, { skipHtml: true }, sourceMarkdown(block)));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<a "));
});

test("Word emphasis becomes Markdown emphasis without changing whitespace or wording", () => {
  const block = { type: "paragraph", text: "Give 5 mg orally", runs: [{ text: "Give " }, { text: "5 ", bold: true }, { text: "mg", bold: true }, { text: " orally", italic: true }] };
  assert.equal(parsedText(block), block.text);
  const html = renderToStaticMarkup(createElement(Markdown, {}, sourceMarkdown(block)));
  assert.ok(html.includes("<strong>5 mg</strong>"));
  assert.ok(html.includes("<em>orally</em>"));
});

test("headings become headings; superscripts and complex paragraphs use the original renderer", () => {
  assert.equal(sourceMarkdown({ type: "heading", level: 4, text: "Investigations" }), "### Investigations");
  assert.equal(supportsMarkdown({ type: "paragraph", text: "Na+", runs: [{ text: "+", vertical: "superscript" }] }), false);
  assert.equal(supportsMarkdown({ type: "paragraph", text: "Line one\nLine two" }), false);
  assert.equal(supportsMarkdown({ type: "paragraph", text: "S**medicine", runs: [{ text: "S", bold: true }, { text: "**medicine" }] }), false);
  assert.equal(supportsMarkdown({ type: "table" }), false);
});

test("every eligible narrative block keeps its exact visible source text through Markdown", async () => {
  const root = path.resolve("public/data");
  const catalog = JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
  let checked = 0;
  for (const entry of catalog.sections) {
    const section = JSON.parse(await fs.readFile(path.join(root, "sections", `${entry.id}.json`), "utf8"));
    for (const block of section.blocks) {
      if (supportsMarkdown(block)) {
        assert.equal(parsedText(block), block.text, block.id);
        checked++;
      }
    }
  }
  assert.ok(checked > 10000);
  console.log(`Markdown text fidelity verified for ${checked} source blocks.`);
});
