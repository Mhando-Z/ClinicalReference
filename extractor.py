
"""Extract DOCX content into ordered, traceable website JSON. Standard library only."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "v": "urn:schemas-microsoft-com:vml",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}
W = "{" + NS["w"] + "}"
WORDS = ["TWENTY-SEVEN", "TWENTY-SIX", "TWENTY-FIVE", "TWENTY-FOUR", "TWENTY-THREE",
         "TWENTY-TWO", "TWENTY-ONE", "TWENTY", "NINETEEN", "EIGHTEEN", "SEVENTEEN",
         "SIXTEEN", "FIFTEEN", "FOURTEEN", "THIRTEEN", "TWELVE", "ELEVEN", "TEN",
         "NINE", "EIGHT", "SEVEN", "SIX", "FIVE", "FOUR", "THREE", "TWO", "ONE"]
CHAPTER = re.compile(r"^CHAPTER\s+(" + "|".join(WORDS) + r"|\d+)\b\s*[:.-]?\s*(.*)$")


def value(node, path, default=None):
    child = node.find(path, NS)
    return child.get(W + "val", default) if child is not None else default


def xml_text(node):
    """Keep tabs, breaks, special hyphens, and visible field-result text."""
    parts = []
    def visible_items(parent):
        yield parent
        for child in parent:
            if child.tag not in (W + "txbxContent", W + "del", W + "pPr", W + "rPr"):
                yield from visible_items(child)
    for item in visible_items(node):
        if item.tag == W + "t":
            parts.append(item.text or "")
        elif item.tag == W + "tab":
            parts.append("\t")
        elif item.tag in (W + "br", W + "cr"):
            if item.get(W + "type") != "page":
                parts.append("\n")
        elif item.tag == W + "noBreakHyphen":
            parts.append("\u2011")
        elif item.tag == W + "softHyphen":
            parts.append("\u00ad")
    return "".join(parts)


def inline_runs(node):
    for child in node:
        if child.tag in (W + "txbxContent", W + "del"):
            continue
        if child.tag == W + "r":
            yield child
        else:
            yield from inline_runs(child)


def enabled(run, prop):
    element = run.find("w:rPr/w:" + prop, NS)
    return element is not None and element.get(W + "val", "true") not in ("0", "false", "off")


class Extractor:
    def __init__(self, archive, output):
        self.archive = archive
        self.output = output
        self.counts = Counter()
        self.warnings = []
        self.used_media = set()
        self.relationships = {}
        for rel in ET.fromstring(archive.read("word/_rels/document.xml.rels")):
            if rel.get("TargetMode") != "External":
                self.relationships[rel.get("Id")] = rel.get("Target")
        self.media = {}
        for name in archive.namelist():
            if name.startswith("word/media/") and not name.endswith("/"):
                filename = PurePosixPath(name).name
                (output / "images").mkdir(parents=True, exist_ok=True)
                (output / "images" / filename).write_bytes(archive.read(name))
                self.media[name] = "/data/images/" + filename

    def paragraph(self, node, source_id):
        self.counts["paragraphs"] += 1
        style = value(node, "w:pPr/w:pStyle", "Normal")
        text = xml_text(node)
        runs = []
        for run in inline_runs(node):
            content = xml_text(run)
            if content:
                item = {"text": content}
                for prop, key in [("b", "bold"), ("i", "italic")]:
                    if enabled(run, prop):
                        item[key] = True
                vertical = value(run, "w:rPr/w:vertAlign")
                if vertical in ("superscript", "subscript"):
                    item["vertical"] = vertical
                runs.append(item)
        images = []
        for image in node.findall(".//a:blip", NS) + node.findall(".//v:imagedata", NS):
            rel_id = image.get("{" + NS["r"] + "}embed") or image.get("{" + NS["r"] + "}id")
            target = self.relationships.get(rel_id, "")
            name = "word/" + target.lstrip("/") if not target.startswith("/") else target.lstrip("/")
            if name in self.media:
                self.used_media.add(name)
                doc_props = node.find(".//wp:docPr", NS)
                alt = (doc_props.get("descr") or doc_props.get("name")) if doc_props is not None else "Document figure"
                images.append({"src": self.media[name], "alt": alt})
            else:
                self.warnings.append({"sourceId": source_id, "reason": "Unresolved image relationship", "relationship": rel_id})
        if not text.strip() and not images:
            self.counts["emptyParagraphs"] += 1
            return None
        self.counts["contentParagraphs"] += 1
        heading = re.fullmatch(r"Heading(\d+)", style, re.I)
        block = {"id": source_id, "type": "heading" if heading else "paragraph", "style": style, "text": text, "runs": runs}
        toc = re.fullmatch(r"TOC(\d+)", style, re.I)
        if toc:
            block["contentsEntry"] = True
            block["contentsLevel"] = int(toc.group(1))
        if heading:
            block["level"] = int(heading.group(1))
        if text.strip().upper() in ("AND", "OR", "AND/OR", "PLUS"):
            block["type"] = "paragraph"
            block["conjunction"] = True
        num_id = value(node, "w:pPr/w:numPr/w:numId")
        if style == "ListParagraph" or (num_id is not None and num_id != "0"):
            block["list"] = {"level": int(value(node, "w:pPr/w:numPr/w:ilvl", "0")), "numberingId": num_id}
        if images:
            block["images"] = images
        if "\ufffd" in text:
            self.warnings.append({"sourceId": source_id, "reason": "Replacement character already present in source text"})
        return block

    def table(self, node, source_id):
        self.counts["tables"] += 1
        rows = []
        active_merges = {}
        for row_index, row in enumerate(node.findall("w:tr", NS)):
            cells = []
            col = int(value(row, "w:trPr/w:gridBefore", "0"))
            for cell_index, cell in enumerate(row.findall("w:tc", NS)):
                colspan = int(value(cell, "w:tcPr/w:gridSpan", "1"))
                merge = cell.find("w:tcPr/w:vMerge", NS)
                continuation = merge is not None and merge.get(W + "val", "continue") != "restart"
                blocks = self.blocks(cell, f"{source_id}-r{row_index + 1}-c{cell_index + 1}")
                item = {"blocks": blocks, "colspan": colspan, "rowspan": 1, "column": col}
                if continuation and col in active_merges:
                    origin = active_merges[col]
                    origin["rowspan"] += 1
                    origin["blocks"].extend(blocks)
                else:
                    if continuation:
                        self.warnings.append({"sourceId": source_id, "reason": "Vertical table merge has no starting cell"})
                    cells.append(item)
                    if merge is not None:
                        active_merges[col] = item
                    else:
                        active_merges.pop(col, None)
                col += colspan
            rows.append({"cells": cells, "header": row.find("w:trPr/w:tblHeader", NS) is not None})
        return {"id": source_id, "type": "table", "rows": rows, "columns": len(node.findall("w:tblGrid/w:gridCol", NS))}

    def blocks(self, parent, prefix="body"):
        result = []
        for index, child in enumerate(parent):
            source_id = f"{prefix}-{index + 1:05d}"
            if child.tag == W + "p":
                block = self.paragraph(child, source_id)
                if block:
                    result.append(block)
                for textbox_index, textbox in enumerate(child.findall(".//w:txbxContent", NS)):
                    result.extend(self.blocks(textbox, f"{source_id}-textbox{textbox_index + 1}"))
            elif child.tag == W + "tbl":
                result.append(self.table(child, source_id))
            elif child.tag in (W + "sdt", W + "sdtContent", W + "customXml", W + "ins"):
                result.extend(self.blocks(child, source_id))
            elif child.tag not in (W + "sectPr", W + "tcPr", W + "sdtPr", W + "bookmarkStart", W + "bookmarkEnd"):
                self.warnings.append({"sourceId": source_id, "reason": "Unrendered body element", "element": child.tag.split("}")[-1]})
        return result


def block_text(block):
    if block["type"] == "table":
        return "\n".join(block_text(b) for row in block["rows"] for cell in row["cells"] for b in cell["blocks"])
    return block.get("text", "")


def walk_blocks(blocks):
    for block in blocks:
        yield block
        if block["type"] == "table":
            for row in block["rows"]:
                for cell in row["cells"]:
                    yield from walk_blocks(cell["blocks"])


def chapter_match(text):
    normalized = re.sub(r"\s*-\s*", "-", text.strip())
    return CHAPTER.match(normalized) if normalized.startswith("CHAPTER ") else None


def toc_title(text):
    return re.sub(r"\s*\t.*$", "", text.strip())


def title_key(text):
    return re.sub(r"[\s.:;]+$", "", re.sub(r"\s+", " ", text.strip())).casefold()


def compact_title(text):
    return re.sub(r"[^\w]+", "", text.casefold(), flags=re.UNICODE)


def matches_toc_heading(heading, entry):
    heading_key = compact_title(heading)
    entry_key = compact_title(entry)
    if not heading_key or not entry_key:
        return False
    return (
        heading_key == entry_key
        or heading_key.startswith(entry_key)
        or entry_key.startswith(heading_key)
    )


def build_sections(blocks):
    chapters = [{"id": "reference", "label": "Reference", "title": "Introduction & essential medicines"}]
    chapter = chapters[0]
    sections = []
    current = None
    awaiting_title = False
    toc_blocks = [block for block in blocks if block.get("contentsEntry")]
    body = [block for block in blocks if not block.get("contentsEntry")]

    toc_entries = [
        {
            "level": block["contentsLevel"],
            "title": toc_title(block.get("text", "")),
        }
        for block in blocks
        if block.get("contentsEntry") and block.get("contentsLevel")
    ]
    deepest_level = max((entry["level"] for entry in toc_entries), default=0)
    toc_stack = []
    deepest_entries = []
    for entry in toc_entries:
        toc_stack = toc_stack[: entry["level"] - 1]
        entry["parents"] = list(toc_stack)
        toc_stack.append(entry["title"])
        if entry["level"] == deepest_level:
            deepest_entries.append(entry)

    used_entries = set()
    targets = []
    for index, block in enumerate(body):
        if block["type"] != "heading":
            continue
        for entry_index, entry in enumerate(deepest_entries):
            if entry_index not in used_entries and matches_toc_heading(
                block.get("text", ""), entry["title"]
            ):
                targets.append((index, entry))
                used_entries.add(entry_index)
                break

    using_deepest = bool(targets)
    target_by_index = {index: entry for index, entry in targets}
    started_deepest = False
    processing_blocks = body if using_deepest else blocks
    for index, block in enumerate(processing_blocks):
        match = chapter_match(block.get("text", "")) if block["type"] != "table" and not block.get("contentsEntry") else None
        if match:
            chapter = {"id": "chapter-" + match.group(1).lower(), "label": "Chapter " + match.group(1).title(), "title": match.group(2).strip().capitalize() or "Chapter " + match.group(1).title()}
            chapters.append(chapter)
            awaiting_title = not bool(match.group(2).strip())
            current = None
        elif awaiting_title and block.get("text", "").strip():
            chapter["title"] = block["text"].strip().capitalize()
            awaiting_title = False

        toc_entry = target_by_index.get(index) if using_deepest else None
        if toc_entry:
            current = {
                "id": "section-" + block["id"],
                "title": block["text"].strip(),
                "chapterId": chapter["id"],
                "tocLevel": deepest_level,
                "tocPath": [*toc_entry["parents"], toc_entry["title"]],
                "blocks": [],
            }
            sections.append(current)
            started_deepest = True
        elif current is None or (not started_deepest and block["type"] == "heading" and block.get("level") == 2):
            title = block.get("text", "").strip() if block["type"] == "heading" and block.get("level") == 2 else (chapter["title"] if chapter["id"] != "reference" else "Document introduction")
            current = {"id": "section-" + block["id"], "title": title, "chapterId": chapter["id"], "blocks": []}
            sections.append(current)
        current["blocks"].append(block)
    if using_deepest and toc_blocks and sections:
        sections[0]["blocks"][0:0] = toc_blocks
    return chapters, sections


def extract(source, output):
    output.mkdir(parents=True, exist_ok=True)
    (output / "sections").mkdir(exist_ok=True)
    with ZipFile(source) as archive:
        extractor = Extractor(archive, output)
        root = ET.fromstring(archive.read("word/document.xml"))
        blocks = extractor.blocks(root.find("w:body", NS))
        chapters, sections = build_sections(blocks)
        chapter_lookup = {chapter["id"]: chapter for chapter in chapters}
        catalog = []
        search = []
        for section in sections:
            text = "\n".join(block_text(b) for b in section["blocks"])
            nested = list(walk_blocks(section["blocks"]))
            summary = next((b["text"].strip() for b in section["blocks"] if b["type"] == "paragraph" and len(b.get("text", "").strip()) > 65), "Browse the original text, tables, and figures in this section.")
            entry = {k: v for k, v in section.items() if k != "blocks"}
            entry.update({"excerpt": summary[:230], "wordCount": len(text.split()), "tableCount": sum(b["type"] == "table" for b in nested), "imageCount": sum(len(b.get("images", [])) for b in nested), "sourceStart": section["blocks"][0]["id"], "sourceEnd": section["blocks"][-1]["id"]})
            catalog.append(entry)
            search.append({"id": section["id"], "text": text})
            section["source"] = {"file": source.name, "chapter": chapter_lookup[section["chapterId"]]["title"], "start": entry["sourceStart"], "end": entry["sourceEnd"]}
            (output / "sections" / (section["id"] + ".json")).write_text(json.dumps(section, ensure_ascii=False), encoding="utf-8")
        metadata = {
            "title": "Standard Treatment Guidelines & National Essential Medicines List",
            "country": "Tanzania Mainland", "edition": "Seventh Edition · 2026",
            "publisher": "Ministry of Health, United Republic of Tanzania",
            "sourceFile": source.name, "sourceUrl": "/data/source.docx",
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "extractedAt": datetime.now(timezone.utc).isoformat(),
            "reviewStatus": "Extracted source content; clinical and layout review pending",
            "stats": {**dict(extractor.counts), "chapters": len(chapters) - 1, "sections": len(sections), "embeddedImages": len(extractor.media), "referencedImages": len(extractor.used_media), "words": sum(e["wordCount"] for e in catalog)},
        }
        extras = [n for n in archive.namelist() if re.match(r"word/(footnotes|endnotes|header\d*|footer\d*)\.xml$", n)]
        extra_content = []
        for name in extras:
            for p in ET.fromstring(archive.read(name)).findall(".//w:p", NS):
                text = xml_text(p)
                if text.strip():
                    extra_content.append({"part": name, "text": text})
        report = {
            "metadata": metadata, "warnings": extractor.warnings,
            "coverage": {"bodyBlocks": len(blocks), "assignedBlocks": sum(len(s["blocks"]) for s in sections), "unassignedBlocks": 0},
            "supplementaryText": extra_content,
            "limitations": [
                "Section boundaries are inferred from source headings and chapter markers; review is pending.",
                "Headers, footers, footnotes and endnotes are retained as supplementary report text rather than inserted into body content.",
                "Word-generated numbering is recorded as list metadata; automatic numbering labels are not reconstructed.",
                "Page references are not inferred from DOCX pagination. Use source block IDs to trace extracted passages.",
                "Text, tables and image assets are extracted; floating drawing placement, equations, text boxes and complex layout require comparison with the original DOCX.",
            ],
        }
        for filename, data in [("catalog.json", {"metadata": metadata, "chapters": chapters, "sections": catalog}), ("search-index.json", search), ("extraction-report.json", report)]:
            (output / filename).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        shutil.copyfile(source, output / "source.docx")
        # Remove only obsolete section files generated by this extractor. Never
        # recursively remove an output directory or touch unrelated files.
        expected_files = {s["id"] + ".json" for s in sections}
        for old in (output / "sections").iterdir():
            if old.is_file() and re.fullmatch(r"section-body-\d+(?:-\d+)*\.json", old.name) and old.name not in expected_files:
                old.unlink()
    print(json.dumps({"output": str(output), **metadata["stats"], "warnings": len(extractor.warnings), "unassignedBlocks": 0}, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("document", nargs="?", default="medical.docx", type=Path)
    parser.add_argument("--output", default="public/data", type=Path)
    args = parser.parse_args()
    extract(args.document.resolve(), args.output.resolve())
