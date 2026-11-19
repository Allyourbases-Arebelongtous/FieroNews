import os
import subprocess
import glob
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_wmv_files():
    wmv_files = []
    for root, dirs, files in os.walk(BASE_DIR):
        for f in files:
            if f.lower().endswith(".wmv"):
                wmv_files.append(os.path.join(root, f))
    return wmv_files

def transcode_all():
    files = get_wmv_files()
    print(f"Found {len(files)} .wmv files to process.")
    
    total_orig_size = 0
    total_new_size = 0
    success_count = 0
    failed_files = []

    for idx, wmv_path in enumerate(files, 1):
        orig_size = os.path.getsize(wmv_path)
        total_orig_size += orig_size
        
        # Determine output mp4 path
        # If the file ended in something like .avi.WMV or .flv.WMV, clean it up or replace extension
        base_no_ext = re.sub(r'\.wmv$', '', wmv_path, flags=re.IGNORECASE)
        mp4_path = base_no_ext + ".mp4"
        
        print(f"[{idx}/{len(files)}] Transcoding: {os.path.basename(wmv_path)} ({orig_size / (1024*1024):.1f} MB)...")
        
        cmd = [
            "ffmpeg", "-y", "-i", wmv_path,
            "-c:v", "libx264", "-crf", "25", "-preset", "fast",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "96k",
            "-movflags", "+faststart",
            mp4_path
        ]
        
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and os.path.exists(mp4_path) and os.path.getsize(mp4_path) > 1000:
                new_size = os.path.getsize(mp4_path)
                total_new_size += new_size
                success_count += 1
                ratio = (1 - (new_size / orig_size)) * 100 if orig_size > 0 else 0
                print(f"   -> Done: {os.path.basename(mp4_path)} ({new_size / (1024*1024):.1f} MB, saved {ratio:.1f}%)")
                # Remove original WMV to save space in workspace
                os.remove(wmv_path)
            else:
                print(f"   -> FAILED: {os.path.basename(wmv_path)}")
                failed_files.append(wmv_path)
        except Exception as e:
            print(f"   -> ERROR on {os.path.basename(wmv_path)}: {e}")
            failed_files.append(wmv_path)

    print("\n" + "="*50)
    print(f"Transcoding Summary:")
    print(f"Total videos: {len(files)}")
    print(f"Successfully converted & compressed: {success_count}")
    print(f"Failures: {len(failed_files)}")
    print(f"Original size: {total_orig_size / (1024*1024*1024):.2f} GB")
    print(f"New MP4 size:  {total_new_size / (1024*1024*1024):.2f} GB")
    saved_gb = (total_orig_size - total_new_size) / (1024*1024*1024)
    print(f"Total Space Saved: {saved_gb:.2f} GB")
    print("="*50)

if __name__ == "__main__":
    transcode_all()
