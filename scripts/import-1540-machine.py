"""Loss-minimizing importer for the newer 1540 N. Vine litigation machine workbook."""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def value(cell, strings):
    kind = cell.attrib.get("t")
    if kind == "inlineStr":
        return "".join(t.text or "" for t in cell.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
    raw = cell.find("m:v", NS)
    if raw is None:
        return ""
    text = raw.text or ""
    return strings[int(text)] if kind == "s" else text


def column(reference):
    return "".join(char for char in reference if char.isalpha())


def row_values(row, strings):
    return {column(cell.attrib.get("r", "")): value(cell, strings) for cell in row.findall("m:c", NS)}


def header_index(rows, name):
    if name == "Dashboard":
        return next((index for index, row in enumerate(rows) if "Property" in row and "Unit Matrix" in row), 0)
    return 0


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/rjack/Downloads/1540_N_Vine_Litigation_War_Room.xlsx")
    destination = Path(sys.argv[2] if len(sys.argv) > 2 else "fixtures/camden-1540-vine-machine.json")
    with zipfile.ZipFile(source) as workbook:
        strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            strings = ["".join(item.itertext()) for item in root.findall("m:si", NS)]
        workbook_root = ET.fromstring(workbook.read("xl/workbook.xml"))
        rel_root = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
        rels = {item.attrib["Id"]: item.attrib["Target"].lstrip("/") for item in rel_root}
        sheets = {}
        for sheet in workbook_root.find("m:sheets", NS):
            name = sheet.attrib["name"]
            target = rels[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
            if not target.startswith("xl/"):
                target = "xl/" + target
            sheet_root = ET.fromstring(workbook.read(target))
            raw_rows = [row_values(row, strings) for row in sheet_root.findall(".//m:sheetData/m:row", NS)]
            header = header_index(raw_rows, name)
            header_values = raw_rows[header] if raw_rows else {}
            headers = {key: str(item or key) for key, item in header_values.items()}
            records = []
            for index, raw in enumerate(raw_rows):
                if index <= header:
                    continue
                if not any(str(item).strip() for item in raw.values()):
                    continue
                records.append({"sourceRow": index + 1, **{headers.get(key, key): item for key, item in raw.items()}})
            sheets[name] = {"headerRow": header + 1, "headers": list(headers.values()), "rows": records}
    payload = {
        "schemaVersion": 1,
        "sourceFile": str(source),
        "sourceWorkbook": source.name,
        "researchState": "2026-08-18",
        "handlingRule": "CONFIRMED, ALLEGED, INFERENCE, and UNKNOWN remain distinct; raw rows are not legal conclusions.",
        "sheets": sheets,
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(destination), "sheets": {key: len(value["rows"]) for key, value in sheets.items()}}))


if __name__ == "__main__":
    main()
