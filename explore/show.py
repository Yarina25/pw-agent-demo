# -*- coding: utf-8 -*-
"""按需打印 flows 结果摘要"""
import json
import sys

names = sys.argv[1:] or []
for name in names:
    with open(f"explore/flows/{name}.json", encoding="utf-8") as f:
        d = json.load(f)
    print(f"\n===== {name} | {d['url']}")
    print("H1/H2:", d.get("h1"), d.get("h2"))
    btns = [b["text"] for b in d.get("buttons", []) if b["text"]]
    print("BUTTONS:", " || ".join(btns[:20]))
    for i in d.get("inputs", []):
        print("INPUT:", i["tag"], i.get("type"), repr(i.get("placeholder")), i.get("options") or "")
    print("LINKS:", " || ".join(d.get("links", [])[:20]))
    for t in d.get("tables", []):
        print("TABLE:", t[:400])
    print("DIALOGS:", d.get("dialogs"))
    print("BODY:", d.get("bodyText", "")[:1600])
