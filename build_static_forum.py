import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "2017", "PFFCDVOL2", "PFFCD VOL 2", "Data")
OUTPUT_DIR = os.path.join(BASE_DIR, "fusion", "forum", "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

FORUM_METADATA = [
    {
        "id": "Forum1",
        "name": "General Fiero Discussion",
        "desc": "General questions, stories, discussions, and topics about Pontiac Fieros.",
        "sum_file": "Forum1.sum",
        "data_dir": "Forum1"
    },
    {
        "id": "Forum2",
        "name": "Technical Section",
        "desc": "Engines, engine swaps, suspensions, electrical, brakes, and troubleshooting.",
        "sum_file": "Forum2.sum",
        "data_dir": "Forum2"
    },
    {
        "id": "Forum6",
        "name": "The Mall & General Chat",
        "desc": "Buy, sell, trade Fiero parts, accessories, and community banter.",
        "sum_file": "Forum6.sum",
        "data_dir": "Forum6"
    },
    {
        "id": "Forum7",
        "name": "Announcements & CD Help",
        "desc": "Pennock's Fiero Forum news, announcements, and CD documentation.",
        "sum_file": "Forum7.sum",
        "data_dir": "Forum7"
    },
    {
        "id": "Archive-000001",
        "name": "Archive Volume 1 (1999 - 2001)",
        "desc": "Historical discussions and early Fiero forum knowledge base.",
        "sum_file": "Archive-000001.sum",
        "data_dir": "Archive-000001"
    },
    {
        "id": "Archive-000002",
        "name": "Archive Volume 2 (2001 - 2002)",
        "desc": "Expanded archives of technical guides, member projects, and meetups.",
        "sum_file": "Archive-000002.sum",
        "data_dir": "Archive-000002"
    }
]

forums_summary = []

for meta in FORUM_METADATA:
    sum_path = os.path.join(DATA_DIR, meta["sum_file"])
    threads = []
    if os.path.exists(sum_path):
        with open(sum_path, "r", encoding="latin1", errors="ignore") as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) >= 6:
                    threads.append({
                        "file": parts[0],
                        "replies": int(parts[1]) if parts[1].isdigit() else 0,
                        "author": parts[2],
                        "title": parts[3],
                        "icon": parts[4] if len(parts) > 4 else "1",
                        "date": parts[5] if len(parts) > 5 else "",
                        "time": parts[6] if len(parts) > 6 else ""
                    })
    
    forum_entry = {
        "id": meta["id"],
        "name": meta["name"],
        "desc": meta["desc"],
        "total_threads": len(threads)
    }
    forums_summary.append(forum_entry)
    
    # Save individual forum threads JSON
    out_thread_file = os.path.join(OUTPUT_DIR, f"threads_{meta['id']}.json")
    with open(out_thread_file, "w", encoding="utf-8") as f:
        json.dump(threads, f, separators=(',', ':'))
    
    print(f"Generated {out_thread_file}: {len(threads)} threads ({os.path.getsize(out_thread_file) / 1024:.1f} KB)")

# Save forums.json
forums_json_path = os.path.join(OUTPUT_DIR, "forums.json")
with open(forums_json_path, "w", encoding="utf-8") as f:
    json.dump(forums_summary, f, indent=2)

print(f"Generated {forums_json_path}")
