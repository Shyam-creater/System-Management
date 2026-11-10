"""
ProcessShield - Installed Software & Version Inventory Engine
Scans and reports all installed software applications, current versions,
publishers, installation paths, categories, and dates across Linux, Windows, and macOS.
Generates fully compliant OpenXML Excel (.xlsx) workbooks with zero third-party dependencies.
"""

import os
import sys
import glob
import json
import time
import socket
import shutil
import platform
import subprocess
import re
import io
import zipfile

_INVENTORY_CACHE = {
    "timestamp": 0.0,
    "packages": []
}

def clean_xml_str(val):
    """Sanitizes text for safe inclusion inside OpenXML sheet data."""
    if val is None:
        return ""
    s = str(val)
    # Remove control characters invalid in XML 1.0 (excluding \t, \n, \r)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
    return s

def _col_letter(col_idx):
    """Converts 1-based column index to Excel column letters (1->A, 26->Z, 27->AA)."""
    res = ""
    while col_idx > 0:
        col_idx, rem = divmod(col_idx - 1, 26)
        res = chr(65 + rem) + res
    return res

def scan_installed_software(force_refresh=False):
    """
    Scans the local operating system for all installed software, applications,
    and system packages with their installed versions, publishers, installation paths,
    categories, and install dates.
    
    Supports:
      - Linux: Desktop Applications (.desktop/XDG, AppImage), Canonical Snap, Flatpak, dpkg (Debian/Ubuntu), RPM (RHEL/Fedora).
      - Windows: Uninstall Registry (HKLM/HKCU 64-bit and 32-bit).
      - macOS: Application Bundles & system_profiler.
    """
    global _INVENTORY_CACHE
    now = time.time()
    if not force_refresh and _INVENTORY_CACHE["packages"] and (now - _INVENTORY_CACHE["timestamp"]) < 60.0:
        return _INVENTORY_CACHE["packages"]

    packages = []
    claimed_snap_names = set()
    claimed_dpkg_names = set()
    seen_app_signatures = set()

    sys_name = platform.system()

    if sys_name == "Linux":
        # -------------------------------------------------------------
        # 1. Index DPKG Packages (Debian / Ubuntu) for fast cross-referencing
        # -------------------------------------------------------------
        dpkg_map = {}
        if shutil.which("dpkg-query"):
            try:
                fmt = "${Package}\t${Version}\t${Architecture}\t${Maintainer}\t${Section}\t${binary:Summary}\n"
                res = subprocess.run(["dpkg-query", "-W", f"--showformat={fmt}"], capture_output=True, text=True, timeout=10)
                if res.returncode == 0:
                    for line in res.stdout.strip().splitlines():
                        p = line.split('\t')
                        if len(p) >= 2 and p[0].strip():
                            pkg_name = p[0].strip()
                            dpkg_map[pkg_name] = {
                                "package": pkg_name,
                                "version": p[1].strip(),
                                "arch": p[2].strip() if len(p) > 2 else "all",
                                "maintainer": p[3].strip() if len(p) > 3 and p[3].strip() else "Ubuntu / Debian Community",
                                "section": p[4].strip() if len(p) > 4 and p[4].strip() else "System",
                                "summary": p[5].strip() if len(p) > 5 and p[5].strip() else ""
                            }
            except Exception:
                pass

        # -------------------------------------------------------------
        # 2. Index Snap Packages (Canonical Snap)
        # -------------------------------------------------------------
        snap_map = {}
        if shutil.which("snap"):
            try:
                res = subprocess.run(["snap", "list"], capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    for line in res.stdout.strip().splitlines()[1:]:
                        parts = line.split()
                        if len(parts) >= 2:
                            s_name = parts[0].strip()
                            s_ver = parts[1].strip()
                            s_rev = parts[2].strip() if len(parts) > 2 else ""
                            s_pub = parts[4].strip() if len(parts) > 4 else "Canonical / Snap"
                            s_notes = parts[5].strip() if len(parts) > 5 else ""

                            snap_dir = f"/snap/{s_name}/{s_rev}" if s_rev else f"/snap/{s_name}/current"
                            mtime_str = "N/A"
                            if os.path.exists(snap_dir):
                                try:
                                    mtime_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(snap_dir)))
                                except Exception:
                                    pass

                            snap_map[s_name] = {
                                "name": s_name,
                                "version": s_ver,
                                "rev": s_rev,
                                "publisher": s_pub,
                                "notes": s_notes,
                                "date": mtime_str,
                                "path": f"/snap/bin/{s_name}"
                            }
            except Exception:
                pass

        # Offline fallback for Snap if daemon socket is blocked
        if not snap_map and os.path.exists("/var/lib/snapd/sequence"):
            try:
                for seq_file in glob.glob("/var/lib/snapd/sequence/*.json"):
                    s_name = os.path.splitext(os.path.basename(seq_file))[0]
                    try:
                        with open(seq_file, "r", encoding="utf-8") as f:
                            s_data = json.load(f)
                            cur_rev = s_data.get("current", "")
                            seq_items = s_data.get("sequence", [])
                            s_summary = "Snap Application"
                            s_pub = "Canonical / Community"
                            for item in seq_items:
                                if str(item.get("revision", "")) == str(cur_rev):
                                    s_summary = item.get("summary") or item.get("title") or s_summary
                                    contact = item.get("contact") or item.get("links", {}).get("contact", [""])[0]
                                    if contact:
                                        s_pub = contact
                                    break
                            snap_map[s_name] = {
                                "name": s_name,
                                "version": f"rev-{cur_rev}" if cur_rev else "installed",
                                "rev": str(cur_rev),
                                "publisher": s_pub,
                                "notes": "",
                                "date": "N/A",
                                "path": f"/snap/bin/{s_name}",
                                "summary": s_summary
                            }
                    except Exception:
                        pass
            except Exception:
                pass

        # -------------------------------------------------------------
        # 3. Discover Desktop & GUI Applications (.desktop files & AppImages)
        # -------------------------------------------------------------
        desktop_dirs = [
            "/usr/share/applications",
            "/usr/local/share/applications",
            os.path.expanduser("~/.local/share/applications"),
            "/var/lib/snapd/desktop/applications",
            "/var/lib/flatpak/exports/share/applications",
            os.path.expanduser("~/.local/share/flatpak/exports/share/applications")
        ]

        for d in desktop_dirs:
            if not os.path.exists(d):
                continue
            for f in glob.glob(os.path.join(d, "*.desktop")):
                try:
                    with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                        app_name, generic_name, exec_cmd, categories, comment, nodisplay = None, None, None, None, None, False
                        for line in fp:
                            line = line.strip()
                            if line.startswith("Name=") and not app_name:
                                app_name = line.split("=", 1)[1].strip()
                            elif line.startswith("GenericName=") and not generic_name:
                                generic_name = line.split("=", 1)[1].strip()
                            elif line.startswith("Exec=") and not exec_cmd:
                                exec_cmd = line.split("=", 1)[1].strip()
                            elif line.startswith("Categories=") and not categories:
                                categories = line.split("=", 1)[1].strip()
                            elif line.startswith("Comment=") and not comment:
                                comment = line.split("=", 1)[1].strip()
                            elif line == "NoDisplay=true":
                                nodisplay = True

                    if not app_name or nodisplay:
                        continue

                    # Filter helper URL handlers or secondary sub-actions
                    base_name = os.path.basename(f)
                    if "url-handler" in base_name or "handler" in base_name.lower():
                        continue

                    # Normalize signature to prevent duplicate desktop entries
                    sig = app_name.strip().lower()
                    if sig in seen_app_signatures:
                        continue

                    # Parse executable binary path
                    clean_bin = ""
                    if exec_cmd:
                        cmd_tokens = [tok for tok in exec_cmd.split() if not tok.startswith("%") and not tok.startswith("--force-user-env")]
                        if cmd_tokens:
                            clean_bin = cmd_tokens[0].strip().replace('"', '').replace("'", "")

                    bin_basename = os.path.basename(clean_bin) if clean_bin else ""

                    # Default metadata
                    version = "N/A"
                    publisher = "N/A"
                    install_path = clean_bin or "N/A"
                    install_date = "N/A"
                    source = "Desktop Application"
                    pkg_id = bin_basename or app_name.lower()

                    # 3A. Match against Snap packages
                    snap_id = None
                    if clean_bin.startswith("/snap/bin/"):
                        snap_id = bin_basename.split('.')[0]
                    elif "_" in base_name and base_name.endswith(".desktop"):
                        candidate = base_name.split("_")[0]
                        if candidate in snap_map:
                            snap_id = candidate

                    if snap_id and snap_id in snap_map:
                        s_info = snap_map[snap_id]
                        claimed_snap_names.add(snap_id)
                        source = "Snap Application"
                        publisher = s_info.get("publisher", "Canonical / Snap")
                        install_path = s_info.get("path", clean_bin)
                        install_date = s_info.get("date", "N/A")
                        pkg_id = snap_id

                        # Retrieve detailed version for well-known snap binaries
                        if snap_id == "code" or "visual studio" in app_name.lower():
                            try:
                                v_res = subprocess.run(["/snap/bin/code", "--version"], capture_output=True, text=True, timeout=2)
                                if v_res.returncode == 0 and v_res.stdout.strip():
                                    version = v_res.stdout.strip().splitlines()[0]
                                else:
                                    version = s_info.get("version", "N/A")
                            except Exception:
                                version = s_info.get("version", "N/A")
                            publisher = "Microsoft Corporation"
                        elif snap_id == "antigravity":
                            version = s_info.get("version", "2.29.0")
                            publisher = "Google LLC"
                        elif snap_id == "antigravity-ide-snap":
                            version = s_info.get("version", "2.6.0")
                            publisher = "Google LLC"
                        elif snap_id == "intellij-idea-community":
                            version = s_info.get("version", "N/A")
                            publisher = "JetBrains s.r.o."
                        elif snap_id == "firefox":
                            version = s_info.get("version", "N/A")
                            publisher = "Mozilla Corporation"
                        elif snap_id == "vlc":
                            version = s_info.get("version", "N/A")
                            publisher = "VideoLAN Organization"
                        else:
                            version = s_info.get("version", "N/A")

                    # 3B. Match AppImage binaries
                    elif clean_bin.endswith(".AppImage") or ".AppImage" in clean_bin:
                        source = "AppImage Application"
                        m = re.search(r'[\-_](\d+(?:\.\d+)+(?:[\-_][a-zA-Z0-9]+)?)', clean_bin)
                        if m:
                            version = m.group(1).replace('_', ' ')
                        if os.path.exists(clean_bin):
                            try:
                                install_date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(clean_bin)))
                            except Exception:
                                pass
                        if "arduino" in app_name.lower():
                            publisher = "Arduino LLC"

                    # 3C. Match DPKG packages
                    elif bin_basename in dpkg_map or clean_bin in dpkg_map:
                        dpkg_key = bin_basename if bin_basename in dpkg_map else clean_bin
                        d_info = dpkg_map[dpkg_key]
                        claimed_dpkg_names.add(dpkg_key)
                        version = d_info.get("version", "N/A")
                        publisher = d_info.get("maintainer", "Ubuntu / Debian Developers")
                        source = "System Package (dpkg/apt)"
                        pkg_id = dpkg_key

                        list_file = f"/var/lib/dpkg/info/{dpkg_key}.list"
                        if os.path.exists(list_file):
                            try:
                                install_date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(list_file)))
                            except Exception:
                                pass

                    # 3D. Binary on disk with version flag fallback
                    elif clean_bin and os.path.exists(clean_bin):
                        try:
                            install_date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(clean_bin)))
                        except Exception:
                            pass
                        # Try lightweight --version query
                        try:
                            v_res = subprocess.run([clean_bin, "--version"], capture_output=True, text=True, timeout=1.5)
                            if v_res.returncode == 0 and v_res.stdout.strip():
                                match = re.search(r'(\d+(?:\.\d+)+)', v_res.stdout.strip())
                                if match:
                                    version = match.group(1)
                        except Exception:
                            pass

                    # Clean Category description
                    cat_display = "General Application"
                    if categories:
                        cats = [c for c in categories.replace(';', ', ').split(',') if c.strip()]
                        if cats:
                            cat_display = "; ".join(cats)
                    elif generic_name:
                        cat_display = generic_name

                    seen_app_signatures.add(sig)
                    packages.append({
                        "name": app_name,
                        "version": version,
                        "publisher": publisher,
                        "category": cat_display,
                        "install_path": install_path,
                        "install_date": install_date,
                        "source": source,
                        "summary": comment or generic_name or app_name,
                        "package_id": pkg_id,
                        "architecture": platform.machine(),
                        "is_desktop_app": True
                    })
                except Exception:
                    pass

        # -------------------------------------------------------------
        # 4. Add Remaining Snap Packages not claimed by desktop files
        # -------------------------------------------------------------
        for s_name, s_info in snap_map.items():
            if s_name in claimed_snap_names:
                continue

            summary_text = s_info.get("summary") or f"Snap application package ({s_name})"
            packages.append({
                "name": s_name,
                "version": s_info.get("version", "N/A"),
                "publisher": s_info.get("publisher", "Canonical / Snap"),
                "category": "Snap Runtime / Service",
                "install_path": s_info.get("path", f"/snap/bin/{s_name}"),
                "install_date": s_info.get("date", "N/A"),
                "source": "Snap Package",
                "summary": summary_text,
                "package_id": s_name,
                "architecture": "snap"
            })

        # -------------------------------------------------------------
        # 5. Add Remaining Flatpak Packages
        # -------------------------------------------------------------
        if shutil.which("flatpak"):
            try:
                f_res = subprocess.run(["flatpak", "list", "--columns=name,application,version,branch,arch,origin"], capture_output=True, text=True, timeout=5)
                if f_res.returncode == 0:
                    for line in f_res.stdout.strip().splitlines():
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            f_name = parts[0].strip()
                            f_app_id = parts[1].strip()
                            f_ver = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "N/A"
                            f_origin = parts[5].strip() if len(parts) > 5 else "Flatpak Remote"
                            sig = f_name.lower()
                            if sig not in seen_app_signatures:
                                seen_app_signatures.add(sig)
                                packages.append({
                                    "name": f_name,
                                    "version": f_ver,
                                    "publisher": f_origin,
                                    "category": "Flatpak Application",
                                    "install_path": f"/var/lib/flatpak/app/{f_app_id}",
                                    "install_date": "N/A",
                                    "source": "Flatpak Package",
                                    "summary": f_app_id,
                                    "package_id": f_app_id,
                                    "architecture": parts[4].strip() if len(parts) > 4 else "all"
                                })
            except Exception:
                pass

        # -------------------------------------------------------------
        # 6. Add Remaining DPKG Packages
        # -------------------------------------------------------------
        for pkg_name, d_info in dpkg_map.items():
            if pkg_name in claimed_dpkg_names:
                continue

            sec = d_info.get("section", "System")
            cat = f"System ({sec.capitalize()})" if sec else "System Package"

            install_date = "N/A"
            list_file = f"/var/lib/dpkg/info/{pkg_name}.list"
            if os.path.exists(list_file):
                try:
                    install_date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(list_file)))
                except Exception:
                    pass

            packages.append({
                "name": pkg_name,
                "version": d_info.get("version", "N/A"),
                "publisher": d_info.get("maintainer", "Debian / Ubuntu Developers"),
                "category": cat,
                "install_path": f"/usr/bin/{pkg_name}" if os.path.exists(f"/usr/bin/{pkg_name}") else f"/usr/share/{pkg_name}",
                "install_date": install_date,
                "source": "System Package (dpkg/apt)",
                "summary": d_info.get("summary", ""),
                "package_id": pkg_name,
                "architecture": d_info.get("arch", "all")
            })

        # -------------------------------------------------------------
        # 7. RPM Packages (if running on RedHat / CentOS / Fedora / SUSE)
        # -------------------------------------------------------------
        if not packages and shutil.which("rpm"):
            try:
                res = subprocess.run(
                    ["rpm", "-qa", "--queryformat", "%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\t%{VENDOR}\t%{GROUP}\t%{INSTALLTIME:date}\t%{SUMMARY}\n"],
                    capture_output=True, text=True, timeout=10
                )
                if res.returncode == 0:
                    for line in res.stdout.strip().splitlines():
                        p = line.split('\t')
                        if len(p) >= 2 and p[0].strip():
                            packages.append({
                                "name": p[0].strip(),
                                "version": p[1].strip(),
                                "publisher": p[3].strip() if len(p) > 3 and p[3].strip() != "(none)" else "RedHat / Fedora Community",
                                "category": p[4].strip() if len(p) > 4 and p[4].strip() != "(none)" else "System Package",
                                "install_path": f"/usr/bin/{p[0].strip()}",
                                "install_date": p[5].strip() if len(p) > 5 else "N/A",
                                "source": "RPM Package",
                                "summary": p[6].strip() if len(p) > 6 else "",
                                "package_id": p[0].strip(),
                                "architecture": p[2].strip() if len(p) > 2 else "all"
                            })
            except Exception:
                pass

    elif sys_name == "Windows":
        # -------------------------------------------------------------
        # Windows Registry Software Detection
        # -------------------------------------------------------------
        try:
            import winreg
            uninstall_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
                (winreg.HKEY_LOCAL_MACHINE, r"Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
                (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall")
            ]
            seen_win_names = set()
            for hkey, subkey in uninstall_paths:
                try:
                    with winreg.OpenKey(hkey, subkey) as root_key:
                        num_subkeys = winreg.QueryInfoKey(root_key)[0]
                        for i in range(num_subkeys):
                            try:
                                key_name = winreg.EnumKey(root_key, i)
                                with winreg.OpenKey(root_key, key_name) as app_key:
                                    def _get_val(k, name):
                                        try:
                                            return winreg.QueryValueEx(k, name)[0]
                                        except Exception:
                                            return ""

                                    display_name = _get_val(app_key, "DisplayName")
                                    display_ver = _get_val(app_key, "DisplayVersion")
                                    publisher = _get_val(app_key, "Publisher")
                                    install_loc = _get_val(app_key, "InstallLocation")
                                    install_date = _get_val(app_key, "InstallDate")
                                    comments = _get_val(app_key, "Comments")

                                    if display_name and display_name.strip():
                                        sig = display_name.strip().lower()
                                        if sig not in seen_win_names:
                                            seen_win_names.add(sig)
                                            # Format install date YYYYMMDD -> YYYY-MM-DD
                                            date_fmt = install_date
                                            if install_date and len(install_date) == 8 and install_date.isdigit():
                                                date_fmt = f"{install_date[:4]}-{install_date[4:6]}-{install_date[6:]}"

                                            packages.append({
                                                "name": display_name.strip(),
                                                "version": display_ver.strip() if display_ver else "N/A",
                                                "publisher": publisher.strip() if publisher else "N/A",
                                                "category": "Windows Desktop Application",
                                                "install_path": install_loc.strip() if install_loc else "N/A",
                                                "install_date": date_fmt if date_fmt else "N/A",
                                                "source": "Windows Registry (Uninstall)",
                                                "summary": comments.strip() if comments else display_name.strip(),
                                                "package_id": key_name,
                                                "architecture": platform.machine()
                                            })
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass

    elif sys_name == "Darwin":
        # -------------------------------------------------------------
        # macOS Application Detection
        # -------------------------------------------------------------
        try:
            res = subprocess.run(["system_profiler", "SPApplicationsDataType", "-json"], capture_output=True, text=True, timeout=15)
            if res.returncode == 0:
                data = json.loads(res.stdout)
                for app in data.get("SPApplicationsDataType", []):
                    name = app.get("_name", "Unknown Application")
                    ver = app.get("version", "N/A")
                    path = app.get("path", "/Applications")
                    obtained = app.get("obtained_from", "Apple / Developer")
                    mtime_raw = app.get("lastModified")
                    date_str = "N/A"
                    if mtime_raw:
                        date_str = str(mtime_raw)
                    elif os.path.exists(path):
                        try:
                            date_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(path)))
                        except Exception:
                            pass

                    packages.append({
                        "name": name,
                        "version": ver if ver else "N/A",
                        "publisher": obtained,
                        "category": "macOS Application Bundle",
                        "install_path": path,
                        "install_date": date_str,
                        "source": "macOS Application",
                        "summary": f"Installed at {path}",
                        "package_id": os.path.basename(path),
                        "architecture": app.get("arch_kind", "Universal")
                    })
        except Exception:
            pass

    # Sort packages alphabetically by Application Name
    packages.sort(key=lambda x: x.get("name", "").lower())
    _INVENTORY_CACHE = {
        "timestamp": now,
        "packages": packages
    }
    return packages


def categorize_package(p):
    """
    Classifies a package into a clean high-level functional category
    for multi-sheet Excel generation and UI filtering.
    """
    src = (p.get("source") or "").lower()
    cat = (p.get("category") or "").lower()
    pth = (p.get("install_path") or "").lower()

    # 1. Desktop & GUI Applications (VS Code, Chrome, Antigravity, Arduino, etc.)
    if p.get("is_desktop_app") or "desktop" in src or "appimage" in src or ("snap" in src and "/snap/bin/" in pth and "runtime" not in cat):
        return "Desktop & GUI Apps"
    # 2. Canonical Snap Packages
    if "snap" in src:
        return "Snap Packages"
    # 3. Development, IDEs, Languages, Compilers
    if any(k in cat for k in ["devel", "ide", "editor", "python", "perl", "php", "java", "ruby", "rust", "golang", "vcs"]):
        return "Development & IDEs"
    # 4. Networking, Web, Communications
    if any(k in cat for k in ["net", "web", "mail", "comm", "http"]):
        return "Networking & Web"
    # 5. Desktop Environment, Graphics, Fonts, Audio/Video
    if any(k in cat for k in ["gnome", "x11", "graphics", "fonts", "sound", "video"]):
        return "Desktop & Multimedia"
    # 6. Shared Libraries & Subsystems
    if any(k in cat for k in ["libs", "libdevel", "kernel"]):
        return "Libraries & System Core"
    # 7. System Administration & Utilities
    return "Utilities & Admin"


def _build_sheet_xml(sheet_title, subtitle, items, columns, hostname, sys_str, now_str):
    """Builds a formatted OpenXML worksheet XML with navy blue headers and zebra striping."""
    sheet_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        '  <cols>'
    ]

    for col_idx, (col_name, col_width) in enumerate(columns, 1):
        sheet_lines.append(f'    <col min="{col_idx}" max="{col_idx}" width="{col_width}" customWidth="1"/>')
    sheet_lines.append('  </cols>')
    sheet_lines.append('  <sheetData>')

    # Row 1: Report Title Banner
    sheet_lines.append('    <row r="1" ht="26" customHeight="1">')
    sheet_lines.append(f'      <c r="A1" s="1" t="inlineStr"><is><t>{clean_xml_str(sheet_title)}</t></is></c>')
    sheet_lines.append('    </row>')

    # Metadata Rows
    metadata = [
        ("System Hostname", hostname),
        ("Operating System", sys_str),
        ("Report Generated At", now_str),
        ("Applications In This Category", f"{len(items):,} packages")
    ]
    if subtitle:
        metadata.insert(0, ("Category Scope", subtitle))

    for r_offset, (label, val) in enumerate(metadata, 2):
        sheet_lines.append(f'    <row r="{r_offset}">')
        sheet_lines.append(f'      <c r="A{r_offset}" s="2" t="inlineStr"><is><t>{clean_xml_str(label)}:</t></is></c>')
        sheet_lines.append(f'      <c r="B{r_offset}" s="3" t="inlineStr"><is><t>{clean_xml_str(val)}</t></is></c>')
        sheet_lines.append('    </row>')

    header_row_num = 2 + len(metadata) + 1
    sheet_lines.append(f'    <row r="{header_row_num - 1}" ht="10" customHeight="1"/>')

    # Column Headers (Navy Blue Background, White Bold Text)
    sheet_lines.append(f'    <row r="{header_row_num}" ht="24" customHeight="1">')
    for col_idx, (col_name, _) in enumerate(columns, 1):
        cell_ref = f"{_col_letter(col_idx)}{header_row_num}"
        sheet_lines.append(f'      <c r="{cell_ref}" s="4" t="inlineStr"><is><t>{clean_xml_str(col_name)}</t></is></c>')
    sheet_lines.append('    </row>')

    # Data Records
    for idx, p in enumerate(items, 1):
        row_num = header_row_num + idx
        is_odd = (idx % 2 == 1)
        cell_style = "6" if is_odd else "5"
        center_style = "8" if is_odd else "7"

        fields = [
            (str(idx), center_style),
            (p.get("name", "N/A"), cell_style),
            (p.get("version", "N/A"), cell_style),
            (p.get("publisher", "N/A"), cell_style),
            (p.get("category", "Application"), cell_style),
            (p.get("install_path", "N/A"), cell_style),
            (p.get("install_date", "N/A"), center_style),
            (p.get("source", "N/A"), cell_style),
            (p.get("summary", ""), cell_style)
        ]

        sheet_lines.append(f'    <row r="{row_num}">')
        for col_idx, (cell_val, style_id) in enumerate(fields, 1):
            cell_ref = f"{_col_letter(col_idx)}{row_num}"
            sheet_lines.append(f'      <c r="{cell_ref}" s="{style_id}" t="inlineStr"><is><t>{clean_xml_str(cell_val)}</t></is></c>')
        sheet_lines.append('    </row>')

    sheet_lines.append('  </sheetData>')
    sheet_lines.append('</worksheet>')
    return "\n".join(sheet_lines)


def _build_summary_sheet_xml(category_data, hostname, sys_str, now_str, total_count):
    """Builds the Executive Summary Worksheet with a category breakdown table."""
    summary_cols = [
        ("#", 6),
        ("Worksheet Tab Name", 26),
        ("Category Classification", 32),
        ("Package Count", 16),
        ("% of Total", 14),
        ("Key Installed Applications / Highlights", 52)
    ]

    sheet_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        '  <cols>'
    ]
    for col_idx, (_, col_width) in enumerate(summary_cols, 1):
        sheet_lines.append(f'    <col min="{col_idx}" max="{col_idx}" width="{col_width}" customWidth="1"/>')
    sheet_lines.append('  </cols>')
    sheet_lines.append('  <sheetData>')

    # Title
    sheet_lines.append('    <row r="1" ht="26" customHeight="1">')
    sheet_lines.append('      <c r="A1" s="1" t="inlineStr"><is><t>ProcessShield - Installed Software &amp; Version Inventory (Category Overview)</t></is></c>')
    sheet_lines.append('    </row>')

    # Metadata
    meta = [
        ("System Hostname", hostname),
        ("Operating System", sys_str),
        ("Audit Generation Date", now_str),
        ("Total Software Packages Detected", f"{total_count:,} applications across {len(category_data)} categories"),
        ("Workbook Structure", "Organized by dedicated category worksheets (see tabs below)")
    ]
    for r_offset, (label, val) in enumerate(meta, 2):
        sheet_lines.append(f'    <row r="{r_offset}">')
        sheet_lines.append(f'      <c r="A{r_offset}" s="2" t="inlineStr"><is><t>{clean_xml_str(label)}:</t></is></c>')
        sheet_lines.append(f'      <c r="B{r_offset}" s="3" t="inlineStr"><is><t>{clean_xml_str(val)}</t></is></c>')
        sheet_lines.append('    </row>')

    header_row_num = 2 + len(meta) + 1
    sheet_lines.append(f'    <row r="{header_row_num - 1}" ht="10" customHeight="1"/>')

    # Header Row
    sheet_lines.append(f'    <row r="{header_row_num}" ht="24" customHeight="1">')
    for col_idx, (col_name, _) in enumerate(summary_cols, 1):
        cell_ref = f"{_col_letter(col_idx)}{header_row_num}"
        sheet_lines.append(f'      <c r="{cell_ref}" s="4" t="inlineStr"><is><t>{clean_xml_str(col_name)}</t></is></c>')
    sheet_lines.append('    </row>')

    # Data Rows
    for idx, (cat_name, cat_desc, items) in enumerate(category_data, 1):
        row_num = header_row_num + idx
        is_odd = (idx % 2 == 1)
        cell_style = "6" if is_odd else "5"
        center_style = "8" if is_odd else "7"

        pct_str = f"{(len(items) / total_count * 100):.1f}%" if total_count > 0 else "0.0%"
        samples = ", ".join(p.get("name", "") for p in items[:5] if p.get("name"))
        if len(items) > 5:
            samples += f", ... (+{len(items) - 5} more)"

        fields = [
            (str(idx), center_style),
            (cat_name, cell_style),
            (cat_desc, cell_style),
            (f"{len(items):,} packages", center_style),
            (pct_str, center_style),
            (samples, cell_style)
        ]

        sheet_lines.append(f'    <row r="{row_num}">')
        for col_idx, (cell_val, style_id) in enumerate(fields, 1):
            cell_ref = f"{_col_letter(col_idx)}{row_num}"
            sheet_lines.append(f'      <c r="{cell_ref}" s="{style_id}" t="inlineStr"><is><t>{clean_xml_str(cell_val)}</t></is></c>')
        sheet_lines.append('    </row>')

    # Total Summary Row
    total_row_num = header_row_num + len(category_data) + 1
    sheet_lines.append(f'    <row r="{total_row_num}" ht="22" customHeight="1">')
    sheet_lines.append(f'      <c r="A{total_row_num}" s="2" t="inlineStr"><is><t>TOTAL</t></is></c>')
    sheet_lines.append(f'      <c r="B{total_row_num}" s="2" t="inlineStr"><is><t>All Categories Combined</t></is></c>')
    sheet_lines.append(f'      <c r="C{total_row_num}" s="2" t="inlineStr"><is><t>Complete Fleet Inventory</t></is></c>')
    sheet_lines.append(f'      <c r="D{total_row_num}" s="2" t="inlineStr"><is><t>{total_count:,} packages</t></is></c>')
    sheet_lines.append(f'      <c r="E{total_row_num}" s="2" t="inlineStr"><is><t>100.0%</t></is></c>')
    sheet_lines.append(f'      <c r="F{total_row_num}" s="3" t="inlineStr"><is><t>See dedicated category tabs for full audit details</t></is></c>')
    sheet_lines.append('    </row>')

    sheet_lines.append('  </sheetData>')
    sheet_lines.append('</worksheet>')
    return "\n".join(sheet_lines)


def generate_software_xlsx(packages=None, hostname=None, sys_type=None):
    """
    Compiles an OpenXML Excel workbook (.xlsx) strictly adhering to ISO/IEC 29500 (OpenXML)
    organized by category worksheets:
      - Sheet 1: Executive Summary & Category Breakdown
      - Sheet 2: Desktop & GUI Apps (Visual Studio Code, Chrome, Antigravity, Arduino IDE, etc.)
      - Sheet 3: Development & IDEs (Compilers, SDKs, Python, Java, Git, IDEs)
      - Sheet 4: Snap Packages (Canonical Snap application packages)
      - Sheet 5: Utilities & Administration (System tools, daemons, core utilities)
      - Sheet 6: Networking & Web (Web servers, clients, networking protocols)
      - Sheet 7: Desktop & Multimedia (GNOME, X11, fonts, audio, video)
      - Sheet 8: Libraries & System Core (Shared libraries, kernel subsystems)
      - Sheet 9: All Software (Master consolidated list)
    
    Zero third-party dependencies required.
    """
    if packages is None:
        packages = scan_installed_software()

    host = hostname or socket.gethostname()
    sys_str = sys_type or f"{platform.system()} {platform.release()} ({platform.machine()})"
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    # Group packages by category
    from collections import defaultdict
    cat_map = defaultdict(list)
    for p in packages:
        cat_map[categorize_package(p)].append(p)

    # Category definitions: (Sheet Name, Subtitle / Description)
    category_defs = [
        ("Desktop & GUI Apps", "User-facing desktop applications, IDEs, web browsers, and productivity tools"),
        ("Development & IDEs", "Software development kits, compilers, interpreters, debuggers, and language runtimes"),
        ("Snap Packages", "Canonical Snap runtime packages, content snaps, and isolated services"),
        ("Utilities & Admin", "System administration commands, shell utilities, monitoring, and core tools"),
        ("Networking & Web", "Network clients, daemons, web servers, protocol analyzers, and remote access tools"),
        ("Desktop & Multimedia", "Desktop environment components (GNOME/X11), audio, video, graphics, and fonts"),
        ("Libraries & System Core", "Shared system libraries (glibc, libssl), device drivers, and kernel modules")
    ]

    # Standard data table columns
    data_columns = [
        ("#", 8),
        ("Software / Application Name", 34),
        ("Currently Installed Version", 22),
        ("Publisher / Vendor", 30),
        ("Software Category", 26),
        ("Installation Path / Executable", 38),
        ("Installation Date", 22),
        ("Package Manager / Source", 24),
        ("Description / Summary", 46)
    ]

    # Prepare sheet list: (Sheet Tab Name, Sheet XML Content)
    worksheets = []

    # 1. Sheet 1: Executive Summary Overview
    summary_cat_data = []
    for cat_name, cat_desc in category_defs:
        items = cat_map.get(cat_name, [])
        summary_cat_data.append((cat_name, cat_desc, items))

    # Add Master to summary table
    summary_cat_data.append(("All Software (Master)", "Complete consolidated master software inventory across all categories", packages))

    summary_xml = _build_summary_sheet_xml(summary_cat_data, host, sys_str, now_str, len(packages))
    worksheets.append(("Executive Summary", summary_xml))

    # 2. Sheets 2..8: Individual Category Sheets
    for cat_name, cat_desc in category_defs:
        items = cat_map.get(cat_name, [])
        sheet_xml = _build_sheet_xml(
            f"ProcessShield - {cat_name}",
            cat_desc,
            items,
            data_columns,
            host,
            sys_str,
            now_str
        )
        worksheets.append((cat_name, sheet_xml))

    # 3. Final Sheet: Master Consolidated Sheet
    master_xml = _build_sheet_xml(
        "ProcessShield - All Software Inventory (Master)",
        "Consolidated master inventory containing all installed software applications and packages",
        packages,
        data_columns,
        host,
        sys_str,
        now_str
    )
    worksheets.append(("All Software (Master)", master_xml))

    # Styles XML
    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF1F4E78"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF333333"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF555555"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="9">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: title font -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 2: meta label -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 3: meta val -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <!-- 4: table header (navy background, white text, bold, border) -->
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 5: data cell even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 6: data cell odd (zebra) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 7: data cell center even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 8: data cell center odd (zebra) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>"""

    # Assemble Multi-Sheet ZIP Package
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml
        content_types_lines = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '  <Default Extension="xml" ContentType="application/xml"/>',
            '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
            '  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        ]
        for i in range(1, len(worksheets) + 1):
            content_types_lines.append(f'  <Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
        content_types_lines.append('</Types>')
        z.writestr("[Content_Types].xml", "\n".join(content_types_lines))

        # _rels/.rels
        z.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")

        # xl/_rels/workbook.xml.rels
        workbook_rels_lines = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        ]
        for i in range(1, len(worksheets) + 1):
            workbook_rels_lines.append(f'  <Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>')
        styles_rid = len(worksheets) + 1
        workbook_rels_lines.append(f'  <Relationship Id="rId{styles_rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>')
        workbook_rels_lines.append('</Relationships>')
        z.writestr("xl/_rels/workbook.xml.rels", "\n".join(workbook_rels_lines))

        # xl/workbook.xml
        workbook_lines = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
            '  <sheets>'
        ]
        for i, (tab_name, _) in enumerate(worksheets, 1):
            # Ensure tab_name is <= 31 chars
            safe_name = clean_xml_str(tab_name[:31])
            workbook_lines.append(f'    <sheet name="{safe_name}" sheetId="{i}" r:id="rId{i}"/>')
        workbook_lines.append('  </sheets>')
        workbook_lines.append('</workbook>')
        z.writestr("xl/workbook.xml", "\n".join(workbook_lines))

        # xl/styles.xml
        z.writestr("xl/styles.xml", styles_xml)

        # xl/worksheets/sheet{i}.xml
        for i, (_, sheet_xml) in enumerate(worksheets, 1):
            z.writestr(f"xl/worksheets/sheet{i}.xml", sheet_xml)

    return zip_buffer.getvalue()


def export_software_csv(packages=None, hostname=None):
    """
    Generates an Excel-compatible CSV string with UTF-8 BOM containing
    all installed software applications, versions, publishers, categories, and paths.
    """
    import csv
    if packages is None:
        packages = scan_installed_software()

    output = io.StringIO()
    writer = csv.writer(output)

    host = hostname or socket.gethostname()
    sys_type = f"{platform.system()} {platform.release()} ({platform.machine()})"
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    # Metadata Header
    writer.writerow(["ProcessShield - Installed Software & Version Inventory Audit Report"])
    writer.writerow(["System Hostname", host])
    writer.writerow(["Operating System", sys_type])
    writer.writerow(["Report Generated", now_str])
    writer.writerow(["Total Installed Software", len(packages)])
    writer.writerow([])

    # Table Header
    writer.writerow([
        "#",
        "Software / Application Name",
        "Currently Installed Version",
        "Publisher / Vendor",
        "Software Category",
        "Installation Path / Executable",
        "Installation Date",
        "Package Manager / Source",
        "Description / Summary"
    ])

    for idx, p in enumerate(packages, 1):
        writer.writerow([
            idx,
            p.get("name", "N/A"),
            p.get("version", "N/A"),
            p.get("publisher", "N/A"),
            p.get("category", "Application"),
            p.get("install_path", "N/A"),
            p.get("install_date", "N/A"),
            p.get("source", "N/A"),
            p.get("summary", "")
        ])

    return "\ufeff" + output.getvalue()
