# -*- coding: utf-8 -*-
"""打印各页面探索结果的精简摘要"""
import glob
import json
import os

for path in sorted(glob.glob("explore/nav/*.json")):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    print(f"\n=== {d['label']} | {d['url']}")
    print("H1:", " / ".join(d.get("h1", [])))
    print("H2:", " / ".join(d.get("h2", [])))
    btns = [b["text"] for b in d.get("buttons", []) if b["text"]]
    print("BUTTONS:", " | ".join(btns))
    for i in d.get("inputs", []):
        opts = f" options={i.get('options')}" if i.get("options") else ""
        print(f"INPUT: {i['tag']} type={i.get('type')} ph={i.get('placeholder')!r}{opts}")
    for t in d.get("tableText", []):
        print("TABLE:", t[:300])
    print("BODY:", d.get("bodyText", "")[:1000])
    if d.get("dialogs"):
        print("DIALOG:", d["dialogs"][0][:300])
