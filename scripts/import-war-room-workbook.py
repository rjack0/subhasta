"""Extract the supplied Camden/Vine workbook into a versioned JSON fixture.

This is intentionally a loss-minimizing import: sheet names, source row numbers,
headers, and raw cell values are retained so the case store can show provenance.
It does not decide whether a legal allegation is true.
"""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SHEET_CONFIG = {
    "Dashboard": 3,
    "Unit Matrix": 1,
    "Legal Fronts": 1,
    "Evidence Registry": 1,
    "Critical Clocks": 1,
    "Authorities": 1,
    "Property Facts": 1,
    "Read Me": 3,
}


def shared_strings(root):
    return ["".join(t.text or "" for t in item.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")) for item in root.findall("m:si", NS)]


def cell_value(cell, strings):
    kind = cell.attrib.get("t")
    if kind == "inlineStr":
        return "".join(t.text or "" for t in cell.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
    value = cell.find("m:v", NS)
    if value is None:
        return ""
    raw = value.text or ""
    if kind == "s":
        return strings[int(raw)]
    if kind == "b":
        return raw == "1"
    return raw


def row_values(row, strings):
    values = {}
    for cell in row.findall("m:c", NS):
        values[cell.attrib.get("r", "")] = cell_value(cell, strings)
    return values


def column_name(reference):
    letters = "".join(char for char in reference if char.isalpha())
    return letters or reference


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/rjack/Downloads/1540_Vine_Camden_Litigation_War_Room.xlsx")
    destination = Path(sys.argv[2] if len(sys.argv) > 2 else "fixtures/camden-1540-vine.json")
    with zipfile.ZipFile(source) as workbook:
        shared = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared = shared_strings(ET.fromstring(workbook.read("xl/sharedStrings.xml")))
        workbook_root = ET.fromstring(workbook.read("xl/workbook.xml"))
        sheets = {}
        for index, sheet in enumerate(workbook_root.find("m:sheets", NS), start=1):
            name = sheet.attrib["name"]
            xml = ET.fromstring(workbook.read(f"xl/worksheets/sheet{index}.xml"))
            rows = xml.findall(".//m:row", NS)
            configured_header = SHEET_CONFIG.get(name, 1)
            header_row = next((row for row in rows if int(row.attrib.get("r", "0")) == configured_header), rows[0])
            raw_headers = row_values(header_row, shared)
            headers = {}
            for reference, value in raw_headers.items():
                headers[column_name(reference)] = str(value or column_name(reference))
            records = []
            for row in rows:
                row_number = int(row.attrib.get("r", "0"))
                if row_number <= configured_header:
                    continue
                raw = row_values(row, shared)
                if not any(str(value).strip() for value in raw.values()):
                    continue
                records.append({"sourceRow": row_number, **{headers.get(column_name(column), column_name(column)): value for column, value in raw.items()}})
            sheets[name] = {"headerRow": configured_header, "headers": list(headers.values()), "rows": records}
    payload = {"sourceFile": str(source), "sourceWorkbook": source.name, "sheets": sheets}
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(destination), "sheets": {key: len(value["rows"]) for key, value in sheets.items()}}))


if __name__ == "__main__":
    main()
