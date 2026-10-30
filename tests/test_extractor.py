"""Regression checks for medical text fidelity, merged tables and chapter boundaries."""

import json
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from extractor import Extractor, NS, build_sections, chapter_match, xml_text


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        archive_path = self.root / "fixture.docx"
        with ZipFile(archive_path, "w") as archive:
            archive.writestr("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />')
        self.archive = ZipFile(archive_path)
        self.addCleanup(self.archive.close)
        self.extractor = Extractor(self.archive, self.root)

    def node(self, xml):
        return ET.fromstring(f'<w:body xmlns:w="{NS["w"]}">{xml}</w:body>')

    def test_preserves_dose_symbols_breaks_and_superscript(self):
        parent = self.node('<w:p><w:r><w:t>Dose: 0.5 mg/kg ≤ 5 mg</w:t><w:br/><w:t>Na</w:t></w:r><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>+</w:t></w:r></w:p>')
        block = self.extractor.blocks(parent)[0]
        self.assertEqual(block["text"], "Dose: 0.5 mg/kg ≤ 5 mg\nNa+")
        self.assertEqual(block["runs"][1]["vertical"], "superscript")
        self.assertEqual("".join(run["text"] for run in block["runs"]), block["text"])

    def test_preserves_horizontal_and_vertical_table_merges(self):
        parent = self.node('''<w:tbl><w:tblGrid><w:gridCol/><w:gridCol/><w:gridCol/></w:tblGrid>
          <w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/><w:vMerge w:val="restart"/></w:tcPr><w:p><w:r><w:t>Medicine</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Dose</w:t></w:r></w:p></w:tc></w:tr>
          <w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/><w:vMerge/></w:tcPr><w:p/></w:tc><w:tc><w:p><w:r><w:t>5 mg</w:t></w:r></w:p></w:tc></w:tr></w:tbl>''')
        table = self.extractor.blocks(parent)[0]
        self.assertEqual(table["rows"][0]["cells"][0]["colspan"], 2)
        self.assertEqual(table["rows"][0]["cells"][0]["rowspan"], 2)
        self.assertEqual(len(table["rows"][1]["cells"]), 1)
        self.assertEqual(table["rows"][1]["cells"][0]["blocks"][0]["text"], "5 mg")

    def test_textbox_tables_are_extracted_once_without_flattening(self):
        parent = self.node('''<w:p><w:r><w:t>Before</w:t></w:r><w:r><w:pict><w:txbxContent><w:tbl><w:tr><w:tc><w:p><w:r><w:t>10 mg</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:txbxContent></w:pict></w:r></w:p>''')
        blocks = self.extractor.blocks(parent)
        self.assertEqual([block["type"] for block in blocks], ["paragraph", "table"])
        self.assertEqual(blocks[0]["text"], "Before")
        self.assertEqual(blocks[1]["rows"][0]["cells"][0]["blocks"][0]["text"], "10 mg")
        self.assertEqual(self.extractor.counts["tables"], 1)

    def test_contents_and_treatment_conjunctions_do_not_create_chapters(self):
        parent = self.node('''<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:t>CHAPTER ONE</w:t></w:r></w:p>
          <w:p><w:r><w:t>CHAPTER ONE</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>EMERGENCY CONDITIONS</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Cardiac arrest</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>OR</w:t></w:r></w:p>''')
        blocks = self.extractor.blocks(parent)
        chapters, sections = build_sections(blocks)
        self.assertEqual(len(chapters), 2)
        self.assertEqual(chapters[1]["title"], "Emergency conditions")
        self.assertEqual(len(sections), 3)
        self.assertEqual(sections[-1]["blocks"][-1]["type"], "paragraph")
        self.assertEqual(sum(len(s["blocks"]) for s in sections), len(blocks))

    def test_chapter_spacing_variants(self):
        self.assertEqual(chapter_match("CHAPTER TWENTY - TWO MALIGNANT DISEASE CONDITIONS").group(1), "TWENTY-TWO")
        self.assertIsNone(chapter_match("Chapter Two: Anaesthesia"))


class RealDocumentCoverageTests(unittest.TestCase):
    @unittest.skipUnless(Path("public/data/catalog.json").exists(), "Run python extractor.py first")
    def test_generated_data_matches_source_counts_and_all_sections_exist(self):
        catalog = json.loads(Path("public/data/catalog.json").read_text(encoding="utf8"))
        chapters = catalog["chapters"]
        self.assertEqual(len(chapters), 28)
        self.assertEqual(len({c["id"] for c in chapters}), 28)
        self.assertEqual(catalog["metadata"]["stats"]["tables"], 547)
        self.assertEqual(catalog["metadata"]["stats"]["referencedImages"], 53)
        all_text = []
        for entry in catalog["sections"]:
            section = json.loads((Path("public/data/sections") / (entry["id"] + ".json")).read_text(encoding="utf8"))
            self.assertTrue(section["blocks"])
            self.assertIn(entry["chapterId"], {c["id"] for c in chapters})
            from extractor import walk_blocks
            for block in walk_blocks(section["blocks"]):
                if block["type"] != "table":
                    self.assertEqual("".join(r["text"] for r in block["runs"]), block["text"], block["id"])
                    all_text.append(block["text"])
        # Every source text character, including the contents list and textboxes,
        # must survive extraction (tabs and line breaks may be inserted).
        with ZipFile("medical.docx") as archive:
            body = ET.fromstring(archive.read("word/document.xml")).find("w:body", NS)
            source_text = "".join(t.text or "" for t in body.findall(".//w:t", NS))
        strip_space = lambda s: "".join(s.split())
        from collections import Counter
        self.assertEqual(Counter(strip_space(source_text)), Counter(strip_space("".join(all_text))))


if __name__ == "__main__":
    unittest.main()
