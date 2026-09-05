import os

workspace = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)"

EXCLUDE_DIRS = {
    'node_modules', '.git', '.next', '.expo', 'venv', '__pycache__', 
    'dist', 'build', '.idea', '.vscode', 'chrome_audit_profile', '.gemini'
}

BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svgz',
    '.wav', '.mp3', '.ogg', '.m4a', '.flac',
    '.db', '.sqlite', '.sqlite3', '.pyc', '.pyd', '.dll', '.exe',
    '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot'
}

CODE_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.sql'}
CONFIG_EXTENSIONS = {'.json', '.yml', '.yaml', '.toml', '.env', '.ini', '.cfg', '.mjs', '.bat', '.sh', '.ps1'}
DOC_EXTENSIONS = {'.md', '.txt'}

stats_by_module = {}
stats_by_category = {'Source Code': {'files': 0, 'lines': 0, 'code': 0, 'comments': 0, 'blanks': 0},
                     'Lockfiles': {'files': 0, 'lines': 0, 'code': 0, 'comments': 0, 'blanks': 0},
                     'Configs & Data': {'files': 0, 'lines': 0, 'code': 0, 'comments': 0, 'blanks': 0},
                     'Documentation': {'files': 0, 'lines': 0, 'code': 0, 'comments': 0, 'blanks': 0}}
stats_by_ext = {}
total_files = 0
total_lines = 0
total_code_lines = 0
total_blank_lines = 0
total_comment_lines = 0

for root, dirs, files in os.walk(workspace):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
    
    rel_path = os.path.relpath(root, workspace)
    module = rel_path.split(os.sep)[0] if rel_path != '.' else 'root'
    
    if module not in stats_by_module:
        stats_by_module[module] = {'files': 0, 'total_lines': 0, 'code_lines': 0, 'blank_lines': 0, 'comment_lines': 0}

    for f in files:
        _, ext = os.path.splitext(f)
        ext = ext.lower() if ext else '(no ext)'
        
        if ext in BINARY_EXTENSIONS or f.endswith('.tsbuildinfo'):
            continue
            
        filepath = os.path.join(root, f)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
        except Exception:
            continue
            
        file_total = len(lines)
        file_blank = 0
        file_comment = 0
        file_code = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                file_blank += 1
            elif stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                file_comment += 1
            else:
                file_code += 1

        total_files += 1
        total_lines += file_total
        total_blank_lines += file_blank
        total_comment_lines += file_comment
        total_code_lines += file_code

        stats_by_module[module]['files'] += 1
        stats_by_module[module]['total_lines'] += file_total
        stats_by_module[module]['code_lines'] += file_code
        stats_by_module[module]['blank_lines'] += file_blank
        stats_by_module[module]['comment_lines'] += file_comment

        if f.endswith('-lock.json') or f == 'package-lock.json':
            cat = 'Lockfiles'
        elif ext in CODE_EXTENSIONS:
            cat = 'Source Code'
        elif ext in CONFIG_EXTENSIONS:
            cat = 'Configs & Data'
        elif ext in DOC_EXTENSIONS:
            cat = 'Documentation'
        else:
            cat = 'Configs & Data'

        stats_by_category[cat]['files'] += 1
        stats_by_category[cat]['lines'] += file_total
        stats_by_category[cat]['code'] += file_code
        stats_by_category[cat]['comments'] += file_comment
        stats_by_category[cat]['blanks'] += file_blank

        if ext not in stats_by_ext:
            stats_by_ext[ext] = {'files': 0, 'total_lines': 0, 'code_lines': 0, 'cat': cat}
        stats_by_ext[ext]['files'] += 1
        stats_by_ext[ext]['total_lines'] += file_total
        stats_by_ext[ext]['code_lines'] += file_code

print("=== PROJECT TEXT & CODE SUMMARY ===")
print(f"Total Text Files Analyzed : {total_files:,}")
print(f"Total Lines               : {total_lines:,}")
print(f"  - Content/Code Lines    : {total_code_lines:,}")
print(f"  - Comment Lines         : {total_comment_lines:,}")
print(f"  - Blank Lines           : {total_blank_lines:,}")

print("\n=== BREAKDOWN BY CATEGORY ===")
print(f"{'Category':<18} | {'Files':>6} | {'Total Lines':>12} | {'Code/Content':>12} | {'Comments':>9} | {'Blanks':>8}")
print("-" * 75)
for cat, d in stats_by_category.items():
    print(f"{cat:<18} | {d['files']:>6,d} | {d['lines']:>12,d} | {d['code']:>12,d} | {d['comments']:>9,d} | {d['blanks']:>8,d}")

stats_by_module_source = {}
stats_by_module_total = {}

for root, dirs, files in os.walk(workspace):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
    
    rel_path = os.path.relpath(root, workspace)
    module = rel_path.split(os.sep)[0] if rel_path != '.' else 'root'
    
    if module not in stats_by_module_total:
        stats_by_module_total[module] = {'files': 0, 'total': 0, 'code': 0, 'comments': 0, 'blanks': 0}
        stats_by_module_source[module] = {'files': 0, 'total': 0, 'code': 0, 'comments': 0, 'blanks': 0}

    for f in files:
        _, ext = os.path.splitext(f)
        ext = ext.lower() if ext else '(no ext)'
        
        if ext in BINARY_EXTENSIONS or f.endswith('.tsbuildinfo'):
            continue
            
        filepath = os.path.join(root, f)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
        except Exception:
            continue
            
        file_total = len(lines)
        file_blank = 0
        file_comment = 0
        file_code = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                file_blank += 1
            elif stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                file_comment += 1
            else:
                file_code += 1

        is_lockfile = f.endswith('-lock.json') or f == 'package-lock.json'
        
        # Module total
        stats_by_module_total[module]['files'] += 1
        stats_by_module_total[module]['total'] += file_total
        stats_by_module_total[module]['code'] += file_code
        stats_by_module_total[module]['comments'] += file_comment
        stats_by_module_total[module]['blanks'] += file_blank

        # Module source (excluding lockfiles)
        if not is_lockfile:
            stats_by_module_source[module]['files'] += 1
            stats_by_module_source[module]['total'] += file_total
            stats_by_module_source[module]['code'] += file_code
            stats_by_module_source[module]['comments'] += file_comment
            stats_by_module_source[module]['blanks'] += file_blank

print("=== PURE HANDWRITTEN CODE & APPLICATION FILES (Excluding Lockfiles) ===")
print(f"{'Module / Subproject':<22} | {'Files':>6} | {'Total Lines':>12} | {'Code Lines':>12} | {'Comments':>9} | {'Blanks':>8}")
print("-" * 80)
total_src_files = 0
total_src_lines = 0
total_src_code = 0
total_src_comments = 0
total_src_blanks = 0

for mod, d in sorted(stats_by_module_source.items(), key=lambda x: x[1]['total'], reverse=True):
    total_src_files += d['files']
    total_src_lines += d['total']
    total_src_code += d['code']
    total_src_comments += d['comments']
    total_src_blanks += d['blanks']
    print(f"{mod:<22} | {d['files']:>6,d} | {d['total']:>12,d} | {d['code']:>12,d} | {d['comments']:>9,d} | {d['blanks']:>8,d}")
print("-" * 80)
print(f"{'TOTAL (Handwritten)':<22} | {total_src_files:>6,d} | {total_src_lines:>12,d} | {total_src_code:>12,d} | {total_src_comments:>9,d} | {total_src_blanks:>8,d}")

