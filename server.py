import http.server
import socketserver
import urllib.parse
import json
import os
import re

PORT = 8530
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "2017", "PFFCDVOL2", "PFFCD VOL 2", "Data")

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

# Cache in-memory: forum_id -> list of thread dicts
_SUM_CACHE = {}

def load_forum_summary(forum_id):
    if forum_id in _SUM_CACHE:
        return _SUM_CACHE[forum_id]
    
    meta = next((f for f in FORUM_METADATA if f["id"] == forum_id), None)
    if not meta:
        return []
    
    sum_path = os.path.join(DATA_DIR, meta["sum_file"])
    if not os.path.exists(sum_path):
        return []
    
    threads = []
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
    _SUM_CACHE[forum_id] = threads
    return threads

def parse_thread_file(forum_id, thread_file):
    meta = next((f for f in FORUM_METADATA if f["id"] == forum_id), None)
    if not meta:
        return None
    
    thread_path = os.path.join(DATA_DIR, meta["data_dir"], thread_file)
    if not os.path.exists(thread_path):
        return None
    
    lines = []
    with open(thread_path, "r", encoding="latin1", errors="ignore") as f:
        lines = f.readlines()
        
    if not lines:
        return None
        
    header_parts = lines[0].strip().split("||")
    title = header_parts[4] if len(header_parts) > 4 else "Untitled Thread"
    author = header_parts[3] if len(header_parts) > 3 else "Unknown"
    
    posts = []
    for line in lines[1:]:
        if not line.startswith("Z||"):
            continue
        p = line.strip().split("||")
        if len(p) >= 7:
            raw_body = p[6]
            
            # Rewrite image and smiley URLs to local paths
            # 1. PFF Uploads: http://www.fiero.nl/uploads/... -> /2017/PFFCDVOL2/PFFCD%20VOL%202/uploads/...
            raw_body = re.sub(
                r'https?://(?:www\.)?fiero\.nl/uploads/([^\s"\'<>]+)',
                r'/2017/PFFCDVOL2/PFFCD%20VOL%202/uploads/\1',
                raw_body,
                flags=re.IGNORECASE
            )
            # 2. PFF Forum Images & Smilies: http://www.fiero.nl/forum/(smilies/)?... -> /2017/PFFCDVOL2/PFFCD%20VOL%202/Images/...
            raw_body = re.sub(
                r'https?://(?:www\.)?fiero\.nl/forum/(?:smilies/)?([^\s"\'<>]+)',
                r'/2017/PFFCDVOL2/PFFCD%20VOL%202/Images/\1',
                raw_body,
                flags=re.IGNORECASE
            )
            
            posts.append({
                "id": p[1],
                "author": p[2],
                "date": p[3],
                "time": p[4],
                "body": raw_body,
                "status": p[8] if len(p) > 8 else "Member",
                "icon": p[9] if len(p) > 9 else "1"
            })
            
    return {
        "forum_id": forum_id,
        "forum_name": meta["name"],
        "thread_file": thread_file,
        "title": title,
        "author": author,
        "post_count": len(posts),
        "posts": posts
    }

class FieroArchiveHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        
        # API: /api/forums
        if path == "/api/forums":
            forums_info = []
            for m in FORUM_METADATA:
                threads = load_forum_summary(m["id"])
                forums_info.append({
                    "id": m["id"],
                    "name": m["name"],
                    "desc": m["desc"],
                    "thread_count": len(threads)
                })
            self._send_json(forums_info)
            return

        # API: /api/threads?forum=...&page=...&limit=...&q=...
        if path == "/api/threads":
            forum_id = query.get("forum", ["Forum1"])[0]
            page = int(query.get("page", ["1"])[0])
            limit = int(query.get("limit", ["40"])[0])
            search_query = query.get("q", [""])[0].strip().lower()
            
            threads = load_forum_summary(forum_id)
            if search_query:
                filtered = [
                    t for t in threads
                    if search_query in t["title"].lower() or search_query in t["author"].lower()
                ]
            else:
                filtered = threads
                
            total_items = len(filtered)
            total_pages = max(1, (total_items + limit - 1) // limit)
            page = max(1, min(page, total_pages))
            
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            page_items = filtered[start_idx:end_idx]
            
            self._send_json({
                "forum_id": forum_id,
                "total": total_items,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "threads": page_items
            })
            return

        # API: /api/thread?forum=...&id=...
        if path == "/api/thread":
            forum_id = query.get("forum", ["Forum1"])[0]
            thread_id = query.get("id", [""])[0]
            
            data = parse_thread_file(forum_id, thread_id)
            if not data:
                self.send_error(404, "Thread not found")
                return
            self._send_json(data)
            return

        # Fallback to standard static file server
        super().do_GET()

    def _send_json(self, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

def run():
    print(f"Starting Fiero News & PFF Archive Server on http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    with socketserver.TCPServer(("", PORT), FieroArchiveHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run()
