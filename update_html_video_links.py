import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FUSION_DIR = os.path.join(BASE_DIR, "fusion")

count = 0
modified_files = 0

for root, dirs, files in os.walk(FUSION_DIR):
    for f in files:
        if f.lower().endswith((".html", ".htm", ".php")):
            filepath = os.path.join(root, f)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as file:
                content = file.read()
            
            # Replace .wmv links (case-insensitive) with .mp4
            new_content, n = re.subn(r'(\b[a-zA-Z0-9_\-\.\s%]+)\.wmv(\b|\?|\'|\"|&)', r'\1.mp4\2', content, flags=re.IGNORECASE)
            
            if n > 0:
                with open(filepath, "w", encoding="utf-8") as file:
                    file.write(new_content)
                count += n
                modified_files += 1

print(f"Updated {count} video links across {modified_files} HTML files to .mp4.")
