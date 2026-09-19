import os
import sys
import datetime
import zipfile
import shutil

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKUP_ROOT = r'C:\Users\mihir\TradingView_Dashboard_Backups'
MAX_BACKUPS = 10

def make_zip_backup(target_src=None):
    src = target_src or SRC_DIR
    os.makedirs(BACKUP_ROOT, exist_ok=True)
    now_str = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    zip_name = f'tradingview_dashboard_backup_{now_str}.zip'
    zip_path = os.path.join(BACKUP_ROOT, zip_name)

    exclude_dirs = {
        'node_modules', '.git', 'catboost_info', '__pycache__', 
        '.pytest_cache', '.gemini', 'tmp'
    }
    exclude_exts = {'.zip', '.pyc', '.log'}

    file_count = 0
    total_uncompressed = 0

    print(f'[Backup] Creating standalone archive...')
    print(f'   Source: {src}')
    print(f'   Destination: {zip_path}')

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        restore_guide = (
            "====================================================================\n"
            "TradingView Dashboard - Full System Backup\n"
            f"Created on: {now_str}\n"
            "====================================================================\n\n"
            "TO RESTORE THIS PROJECT:\n"
            "1. Extract all contents of this ZIP to your preferred directory.\n"
            "2. Open terminal/PowerShell in the extracted directory.\n"
            "3. Install dependencies:\n"
            "   npm install\n"
            "   cd frontend\n"
            "   npm install\n"
            "   cd ..\n"
            "4. Start the backend server:\n"
            "   node backend/server.js\n"
            "5. Open http://localhost:3002 in your browser!\n"
        )
        zipf.writestr('RESTORE_INSTRUCTIONS.txt', restore_guide)

        for root, dirs, files in os.walk(src):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in exclude_exts:
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, src)
                try:
                    zipf.write(full_path, rel_path)
                    file_count += 1
                    total_uncompressed += os.path.getsize(full_path)
                except Exception as e:
                    print(f'   ⚠️ Skipped {rel_path}: {e}')

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    raw_size_mb = total_uncompressed / (1024 * 1024)

    print(f'[OK] Archive created successfully!')
    print(f'   Total files: {file_count}')
    print(f'   Raw size: {raw_size_mb:.2f} MB  ->  Compressed: {zip_size_mb:.2f} MB')
    print(f'   File saved: {zip_path}')

    rotate_old_backups()
    return zip_path

def rotate_old_backups():
    try:
        files = [
            os.path.join(BACKUP_ROOT, f) 
            for f in os.listdir(BACKUP_ROOT) 
            if f.startswith('tradingview_dashboard_backup_') and f.endswith('.zip')
        ]
        files.sort(key=os.path.getmtime)
        if len(files) > MAX_BACKUPS:
            to_remove = files[:-MAX_BACKUPS]
            for f in to_remove:
                os.remove(f)
                print(f'   [Rotate] Removed older backup: {os.path.basename(f)}')
    except Exception as e:
        print(f'   [Rotate Notice] {e}')

if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    make_zip_backup(root)
