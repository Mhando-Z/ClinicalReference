import assert from "node:assert/strict";
import test from "node:test";
import { findSections, searchExcerpt } from "../app/lib/search.mjs";
import { isStandaloneOperator } from "../app/lib/source-visibility.mjs";

const chapters = [
  { id: "chapter-one", title: "Emergency conditions" },
  { id: "chapter-two", title: "Infections" },
];
const sections = [
  {
    id: "first",
    title: "Malaria",
    chapterId: "chapter-two",
    excerpt: "Diagnosis and care",
    tableCount: 1,
    imageCount: 0,
    wordCount: 800,
  },
  {
    id: "second",
    title: "General care",
    chapterId: "chapter-one",
    excerpt: "Emergency assessment",
    tableCount: 0,
    imageCount: 1,
    wordCount: 100,
  },
  {
    id: "third",
    title: "Complications",
    chapterId: "chapter-two",
    excerpt: "Diagnosis",
    tableCount: 2,
    imageCount: 0,
    wordCount: 400,
  },
];
const index = {
  first: "Malaria treatment",
  second: "A table cell mentioning malaria and artemether",
  third: "Artemether in malaria management",
};
const find = (options = {}) =>
  findSections({ sections, chapters, index, ...options }).map(
    (entry) => entry.id,
  );

test("full-text search matches terms beyond previews and ranks title matches first", () => {
  assert.deepEqual(find({ query: "  MALARIA  " }), [
    "first",
    "second",
    "third",
  ]);
  assert.deepEqual(find({ query: "malaria artemether" }), ["second", "third"]);
  assert.deepEqual(find({ query: "[unmatched]" }), []);
});
test("chapter, content, saved, and recent filters combine with search", () => {
  assert.deepEqual(
    find({ query: "malaria", chapter: "chapter-two", content: "tables" }),
    ["first", "third"],
  );
  assert.deepEqual(find({ content: "figures" }), ["second"]);
  assert.deepEqual(find({ ids: ["third", "first"], sort: "recent" }), [
    "third",
    "first",
  ]);
  assert.deepEqual(find({ ids: [] }), []);
  assert.deepEqual(find({ sort: "shortest" }), ["second", "third", "first"]);
});
test("search excerpts surface the matching passage instead of an unrelated preview", () => {
  assert.match(searchExcerpt(sections[1], "artemether", index), /artemether/);
  assert.equal(searchExcerpt(sections[0], "", index), sections[0].excerpt);
});
test("only standalone AND/OR labels are hidden", () => {
  for (const text of ["AND", " OR ", "And", "AND / OR", "AND/OR"])
    assert.equal(isStandaloneOperator(text), true, text);
  for (const text of [
    "PLUS",
    "Give A and B",
    "A OR B",
    "Oral treatment",
    "",
    "AND THEN",
  ])
    assert.equal(isStandaloneOperator(text), false, text);
});
