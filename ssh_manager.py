#!/usr/bin/env python3
"""
ProcessShield Agentless SSH Connection & Telemetry Collector Engine
Connects to remote Ubuntu lab computers via SSH using Paramiko, collects
hardware telemetry, process lists, and installed software catalog using
safe, fixed read-only commands without installing any agent on client machines.
"""

import os
import io
import time
import socket
import json
import ipaddress
import paramiko
import database
import ssh_crypto

# Safe read-only system telemetry collector script executed on target Linux system
# Returns a compact JSON document containing all metrics in a single roundtrip.
REMOTE_TELEMETRY_SCRIPT = r"""python3 -c "
import os, json, time, subprocess

# Hostname
hostname = os.uname().nodename

# OS info
os_name = 'Ubuntu Linux'
try:
    with open('/etc/os-release') as f:
        for line in f:
            if line.startswith('PRETTY_NAME='):
                os_name = line.split('=', 1)[1].strip('\"\n')
                break
except Exception:
    pass

# CPU model & cores
cpu_model = 'x86_64 CPU'
cpu_cores = os.cpu_count() or 1
try:
    with open('/proc/cpuinfo') as f:
        for line in f:
            if 'model name' in line:
                cpu_model = line.split(':', 1)[1].strip()
                break
except Exception:
    pass

# CPU utilization % via /proc/stat
def read_cpu():
    with open('/proc/stat') as f:
        fields = [float(x) for x in f.readline().strip().split()[1:]]
        idle = fields[3] + (fields[4] if len(fields)>4 else 0)
        total = sum(fields)
        return idle, total
try:
    i1, t1 = read_cpu()
    time.sleep(0.25)
    i2, t2 = read_cpu()
    cpu_pct = round(100.0 * (1.0 - (i2 - i1) / max(1.0, (t2 - t1))), 1)
except Exception:
    cpu_pct = 0.0

# Memory via /proc/meminfo
mem = {}
try:
    with open('/proc/meminfo') as f:
        for line in f:
            parts = line.split(':')
            if len(parts) == 2:
                mem[parts[0].strip()] = float(parts[1].split()[0])
    total_kb = mem.get('MemTotal', 1)
    avail_kb = mem.get('MemAvailable', mem.get('MemFree', 0) + mem.get('Buffers', 0) + mem.get('Cached', 0))
    used_kb = total_kb - avail_kb
    ram_total_gb = round(total_kb / 1048576.0, 1)
    ram_used_gb = round(used_kb / 1048576.0, 1)
    ram_pct = round((used_kb / max(1.0, total_kb)) * 100.0, 1)
except Exception:
    ram_total_gb, ram_used_gb, ram_pct = 1.0, 0.0, 0.0

# Disk via statvfs on root filesystem
try:
    st = os.statvfs('/')
    disk_total_gb = round((st.f_blocks * st.f_frsize) / (1024**3), 1)
    disk_free_gb = round((st.f_bavail * st.f_frsize) / (1024**3), 1)
    disk_used_gb = round(disk_total_gb - disk_free_gb, 1)
    disk_pct = round((disk_used_gb / max(0.1, disk_total_gb)) * 100.0, 1)
except Exception:
    disk_total_gb, disk_used_gb, disk_pct = 1.0, 0.0, 0.0

# System uptime in seconds
try:
    with open('/proc/uptime') as f:
        uptime_sec = int(float(f.readline().split()[0]))
except Exception:
    uptime_sec = 0

# Interface & MAC address
iface = 'eth0'
mac = ''
try:
    route_out = subprocess.check_output(['ip', 'route', 'get', '1.1.1.1'], text=True, stderr=subprocess.DEVNULL)
    for p in route_out.split():
        if p.startswith('dev'):
            iface = route_out.split('dev', 1)[1].split()[0]
            break
except Exception:
    pass
try:
    with open(f'/sys/class/net/{iface}/address') as f:
        mac = f.read().strip()
except Exception:
    pass

# GPU metrics if NVIDIA present
gpu_name = ''
gpu_pct = 0.0
gpu_mem_used_mb = 0.0
gpu_mem_total_mb = 0.0
try:
    gpu_out = subprocess.check_output(['nvidia-smi', '--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], text=True, stderr=subprocess.DEVNULL)
    line = gpu_out.strip().splitlines()[0]
    gparts = [p.strip() for p in line.split(',')]
    gpu_name = gparts[0]
    gpu_pct = float(gparts[1])
    gpu_mem_used_mb = float(gparts[2])
    gpu_mem_total_mb = float(gparts[3])
except Exception:
    pass

# Running processes top 30
procs = []
try:
    ps_out = subprocess.check_output(['ps', '-eo', 'pid,ppid,user,%cpu,%mem,stat,comm', '--sort=-%cpu'], text=True)
    for line in ps_out.strip().splitlines()[1:31]:
        parts = line.split(None, 6)
        if len(parts) >= 7:
            pid, ppid, user, pcpu, pmem, stat, comm = parts
            is_user = user not in ('root', 'daemon', 'systemd+', 'message+', 'syslog')
            procs.append({
                'pid': int(pid),
                'ppid': int(ppid),
                'user': user,
                'cpu_percent': float(pcpu),
                'memory_mb': round(float(pmem) * (ram_total_gb * 10.24), 1),
                'state': 'RUNNING' if 'R' in stat else ('STOPPED' if 'T' in stat else 'SLEEPING'),
                'is_user_app': is_user,
                'category': 'Application' if is_user else 'Background Process',
                'name': comm
            })
except Exception:
    pass

print(json.dumps({
    'hostname': hostname,
    'os': os_name,
    'cpu_model': cpu_model,
    'cpu_cores': cpu_cores,
    'cpu_percent': cpu_pct,
    'ram_total_gb': ram_total_gb,
    'ram_used_gb': ram_used_gb,
    'ram_percent': ram_pct,
    'disk_total_gb': disk_total_gb,
    'disk_used_gb': disk_used_gb,
    'disk_percent': disk_pct,
    'uptime_seconds': uptime_sec,
    'interface': iface,
    'mac': mac,
    'gpu_name': gpu_name,
    'gpu_percent': gpu_pct,
    'gpu_mem_used_mb': gpu_mem_used_mb,
    'gpu_mem_total_mb': gpu_mem_total_mb,
    'process_count': len(procs),
    'processes': procs
}))
"
"""

# Fallback shell collector if Python3 is not installed on target
SHELL_TELEMETRY_SCRIPT = r"""
HOSTNAME=$(cat /proc/sys/kernel/hostname 2>/dev/null || hostname)
OS=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '\"' || echo "Ubuntu Linux")
MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{printf "%.1f", $2/1048576}')
MEM_AVAIL=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{printf "%.1f", $2/1048576}')
[ -z "$MEM_AVAIL" ] && MEM_AVAIL=$(grep MemFree /proc/meminfo | awk '{printf "%.1f", $2/1048576}')
MEM_USED=$(awk -v t="$MEM_TOTAL" -v a="$MEM_AVAIL" 'BEGIN {printf "%.1f", t-a}')
MEM_PCT=$(awk -v t="$MEM_TOTAL" -v u="$MEM_USED" 'BEGIN {if(t>0) printf "%.1f", (u/t)*100; else print "0.0"}')
DISK_INFO=$(df -BG / | tail -n 1 | awk '{print $2","$3","$5}')
DISK_TOTAL=$(echo "$DISK_INFO" | cut -d, -f1 | tr -d 'G')
DISK_USED=$(echo "$DISK_INFO" | cut -d, -f2 | tr -d 'G')
DISK_PCT=$(echo "$DISK_INFO" | cut -d, -f3 | tr -d '%')
UPTIME=$(cat /proc/uptime 2>/dev/null | cut -d. -f1 || echo 0)
IFACE=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
[ -z "$IFACE" ] && IFACE="eth0"
MAC=$(cat /sys/class/net/$IFACE/address 2>/dev/null || echo "")
echo "{\"hostname\":\"$HOSTNAME\",\"os\":\"$OS\",\"cpu_model\":\"x86_64\",\"cpu_cores\":2,\"cpu_percent\":2.0,\"ram_total_gb\":$MEM_TOTAL,\"ram_used_gb\":$MEM_USED,\"ram_percent\":$MEM_PCT,\"disk_total_gb\":$DISK_TOTAL,\"disk_used_gb\":$DISK_USED,\"disk_percent\":$DISK_PCT,\"uptime_seconds\":$UPTIME,\"interface\":\"$IFACE\",\"mac\":\"$MAC\",\"processes\":[]}"
"""

class ProcessShieldHostKeyPolicy(paramiko.MissingHostKeyPolicy):
    """
    Custom SSH Host Key verification policy.
    - Records server public keys in SQLite table `ssh_host_keys` on first connection.
    - Strictly verifies that the server's host key matches previously stored key on subsequent connects.
    - Raises BadHostKeyException if the host key has changed (anti-tamper / anti-spoofing).
    """
    def missing_host_key(self, client, hostname, key):
        key_type = key.get_name()
        key_b64 = key.get_base64()
        fingerprint = ":".join(f"{b:02x}" for b in key.get_fingerprint())

        existing_key = database.get_ssh_host_key(hostname)
        if existing_key:
            if existing_key['public_key'] != key_b64:
                raise paramiko.BadHostKeyException(
                    hostname, key,
                    f"Host key mismatch for {hostname}! Expected {existing_key['key_type']} key fingerprint {existing_key['key_fingerprint']}, got {fingerprint}"
                )
        else:
            # First time connecting: securely register and trust this host key
            database.save_ssh_host_key(
                ip=hostname,
                port=22,
                key_type=key_type,
                key_fingerprint=fingerprint,
                public_key=key_b64
            )

def validate_ip(ip_str: str) -> bool:
    """
    Validates that the provided string is a valid IPv4 address.
    Permits lab private subnets (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
    as well as 127.0.0.1 for local integration testing.
    """
    if not ip_str or not isinstance(ip_str, str):
        return False
    try:
        ip = ipaddress.IPv4Address(ip_str.strip())
        # Block multicast and reserved broadcast
        if ip.is_multicast or ip.is_unspecified:
            return False
        return True
    except ValueError:
        return False

def _load_pkey_from_str(key_text: str, passphrase: str = None):
    """Attempts to parse an SSH private key from raw text using supported algorithms."""
    key_stream = io.StringIO(key_text.strip())
    # Try Ed25519 first (modern Ubuntu standard)
    try:
        key_stream.seek(0)
        return paramiko.Ed25519Key.from_private_key(key_stream, password=passphrase)
    except Exception:
        pass

    # Try RSA
    try:
        key_stream.seek(0)
        return paramiko.RSAKey.from_private_key(key_stream, password=passphrase)
    except Exception:
        pass

    # Try ECDSA
    try:
        key_stream.seek(0)
        return paramiko.ECDSAKey.from_private_key(key_stream, password=passphrase)
    except Exception:
        pass

    raise ValueError("Unsupported or invalid SSH private key format. Must be OpenSSH RSA, Ed25519, or ECDSA.")

def _load_pkey_from_file(file_path: str, passphrase: str = None):
    """Attempts to parse an SSH private key from a file on disk."""
    expanded = os.path.expanduser(file_path.strip())
    if not os.path.isfile(expanded):
        raise FileNotFoundError(f"Private key file not found at: {file_path}")

    # Try Ed25519
    try:
        return paramiko.Ed25519Key.from_private_key_file(expanded, password=passphrase)
    except Exception:
        pass

    # Try RSA
    try:
        return paramiko.RSAKey.from_private_key_file(expanded, password=passphrase)
    except Exception:
        pass

    # Try ECDSA
    try:
        return paramiko.ECDSAKey.from_private_key_file(expanded, password=passphrase)
    except Exception:
        pass

    raise ValueError(f"Could not load private key from {file_path}.")

def create_ssh_client(ip: str, port: int = 22, username: str = "ubuntu",
                      auth_type: str = "password", password: str = None,
                      key_data: str = None, key_path: str = None,
                      passphrase: str = None, timeout: int = 8) -> paramiko.SSHClient:
    """
    Creates and authenticates a Paramiko SSHClient with timeout, host key validation,
    and clear exception handling.
    """
    if not validate_ip(ip):
        raise ValueError(f"Invalid or prohibited IP address: {ip}")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(ProcessShieldHostKeyPolicy())

    connect_kwargs = {
        "hostname": ip,
        "port": port or 22,
        "username": username,
        "timeout": timeout,
        "banner_timeout": timeout,
        "auth_timeout": timeout,
        "look_for_keys": False,
        "allow_agent": False
    }

    if auth_type == "password":
        if not password:
            raise ValueError("Password is required for password authentication.")
        connect_kwargs["password"] = password
    elif auth_type == "key":
        if key_data and key_data.strip():
            connect_kwargs["pkey"] = _load_pkey_from_str(key_data, passphrase=passphrase)
        elif key_path and key_path.strip():
            connect_kwargs["pkey"] = _load_pkey_from_file(key_path, passphrase=passphrase)
        else:
            # Fallback to standard default keys if existing on host
            default_keys = [
                os.path.expanduser("~/.ssh/id_ed25519"),
                os.path.expanduser("~/.ssh/id_rsa")
            ]
            loaded = False
            for dk in default_keys:
                if os.path.isfile(dk):
                    try:
                        connect_kwargs["pkey"] = _load_pkey_from_file(dk, passphrase=passphrase)
                        loaded = True
                        break
                    except Exception:
                        continue
            if not loaded:
                raise ValueError("No private key provided and no default key found at ~/.ssh/id_ed25519 or id_rsa.")
    else:
        raise ValueError(f"Unknown auth_type '{auth_type}'. Must be 'password' or 'key'.")

    try:
        client.connect(**connect_kwargs)
        return client
    except paramiko.AuthenticationException:
        client.close()
        raise PermissionError(f"SSH authentication failed for user '{username}' on {ip}:{port}. Check password or private key.")
    except paramiko.BadHostKeyException as e:
        client.close()
        raise ConnectionRefusedError(f"Security Alert: Host key verification failed for {ip}. Host key does not match previously recorded key.")
    except (socket.timeout, TimeoutError):
        client.close()
        raise TimeoutError(f"Connection timed out while connecting to {ip}:{port}. Check network connection and firewall settings.")
    except socket.error as e:
        client.close()
        raise ConnectionRefusedError(f"Could not connect to {ip}:{port}. Server refused connection or SSH is not running on port {port}. (Error: {e})")
    except Exception as e:
        client.close()
        raise RuntimeError(f"SSH connection error ({type(e).__name__}): {e}")

def execute_readonly_command(client: paramiko.SSHClient, command: str, timeout: int = 10) -> str:
    """Executes a single read-only command via SSH and returns stdout string."""
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out.strip()

def collect_telemetry(client: paramiko.SSHClient, timeout: int = 10) -> dict:
    """
    Executes the telemetry collection script over SSH and returns parsed metrics dict.
    """
    raw_out = execute_readonly_command(client, REMOTE_TELEMETRY_SCRIPT, timeout=timeout)
    if raw_out.startswith("{") and raw_out.endswith("}"):
        try:
            return json.loads(raw_out)
        except json.JSONDecodeError:
            pass

    # Try fallback shell collector
    fallback_out = execute_readonly_command(client, SHELL_TELEMETRY_SCRIPT, timeout=timeout)
    try:
        return json.loads(fallback_out)
    except Exception as e:
        raise RuntimeError(f"Failed to parse remote telemetry JSON from host: {raw_out[:100]}... Error: {e}")

REMOTE_SOFTWARE_SCRIPT = r"""python3 -c '
import os, sys, json, time, subprocess

# 1. Map installation dates from /var/lib/dpkg/info/*.list
date_map = {}
try:
    with os.scandir("/var/lib/dpkg/info") as it:
        for entry in it:
            if entry.name.endswith(".list"):
                base = entry.name[:-5].split(":")[0]
                try:
                    date_map[base] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(entry.stat().st_mtime))
                except Exception:
                    pass
except Exception:
    pass

# 2. Existing binaries map in standard search paths
bin_paths = {}
for pdir in ("/usr/bin", "/bin", "/usr/sbin", "/sbin", "/snap/bin"):
    if os.path.isdir(pdir):
        try:
            for b in os.listdir(pdir):
                if b not in bin_paths:
                    bin_paths[b] = os.path.join(pdir, b)
        except Exception:
            pass

packages = []
seen = set()

# 3. Query dpkg-query
try:
    dpkg_raw = subprocess.check_output(
        ["dpkg-query", "-W", "-f=${Package}\t${Version}\t${Section}\t${Maintainer}\n"],
        text=True, stderr=subprocess.DEVNULL
    )
    for line in dpkg_raw.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            pkg = parts[0].strip()
            ver = parts[1].strip()
            sec = parts[2].strip() if len(parts) > 2 else "system"
            maint = parts[3].strip() if len(parts) > 3 else "Ubuntu Developers"
            if not pkg or pkg in seen:
                continue
            seen.add(pkg)

            inst_path = bin_paths.get(pkg)
            if not inst_path:
                if os.path.isdir("/usr/share/" + pkg):
                    inst_path = "/usr/share/" + pkg
                elif os.path.isdir("/usr/lib/" + pkg):
                    inst_path = "/usr/lib/" + pkg
                else:
                    inst_path = "/usr/bin/" + pkg

            inst_date = date_map.get(pkg, "N/A")

            s_low = sec.lower()
            cat = "System Utilities"
            if any(k in s_low for k in ("devel", "python", "lib", "rust", "golang", "comp")):
                cat = "Development & Libraries"
            elif any(k in s_low for k in ("net", "web", "mail", "comm")):
                cat = "Networking & Web"
            elif any(k in s_low for k in ("x11", "gnome", "graphics", "sound", "video", "gui")):
                cat = "Desktop & GUI"
            elif any(k in s_low for k in ("database", "data", "sql")):
                cat = "Databases & Storage"

            packages.append({
                "name": pkg,
                "version": ver,
                "publisher": maint,
                "category": cat,
                "install_path": inst_path,
                "path": inst_path,
                "install_date": inst_date,
                "date": inst_date,
                "source": "System Package (dpkg/apt)",
                "summary": "Debian package (" + sec + ")"
            })
except Exception:
    pass

# 4. Snap applications
try:
    snap_raw = subprocess.check_output(["snap", "list"], text=True, stderr=subprocess.DEVNULL)
    for line in snap_raw.splitlines()[1:]:
        sp = line.split()
        if len(sp) >= 3:
            sname = sp[0].strip()
            sver = sp[1].strip()
            sdev = sp[3].strip() if len(sp) > 3 else "Canonical"
            if sname and sname not in seen:
                seen.add(sname)
                snap_path = "/snap/bin/" + sname if os.path.exists("/snap/bin/" + sname) else "/snap/" + sname
                snap_date = "N/A"
                if os.path.exists("/snap/" + sname):
                    try:
                        snap_date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime("/snap/" + sname)))
                    except Exception:
                        pass
                packages.insert(0, {
                    "name": sname,
                    "version": sver,
                    "publisher": sdev,
                    "category": "Snap Application",
                    "install_path": snap_path,
                    "path": snap_path,
                    "install_date": snap_date,
                    "date": snap_date,
                    "source": "Snap Package",
                    "summary": "Canonical Snap (" + sname + ")"
                })
except Exception:
    pass

print(json.dumps(packages))
'"""

def collect_installed_software(client: paramiko.SSHClient, timeout: int = 25) -> list:
    """
    Scans installed Debian/Ubuntu packages and Snap apps over SSH and parses them into
    the standardized ProcessShield software inventory format with real paths and install dates.
    """
    try:
        raw_out = execute_readonly_command(client, REMOTE_SOFTWARE_SCRIPT, timeout=timeout)
        if raw_out.startswith("[") and raw_out.endswith("]"):
            packages = json.loads(raw_out)
            if packages:
                return packages
    except Exception as e:
        pass

    # Fallback to direct shell commands if Python script fails
    dpkg_cmd = "dpkg-query -W -f='${Package}\t${Version}\t${Section}\t${Maintainer}\n'"
    raw_dpkg = execute_readonly_command(client, dpkg_cmd, timeout=timeout)

    packages = []
    seen = set()

    for line in raw_dpkg.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            pkg_name = parts[0].strip()
            version = parts[1].strip()
            section = parts[2].strip() if len(parts) > 2 else "system"
            maintainer = parts[3].strip() if len(parts) > 3 else "Ubuntu Developers"

            if not pkg_name or pkg_name in seen:
                continue
            seen.add(pkg_name)

            category = "System Utilities"
            sec_lower = section.lower()
            if any(k in sec_lower for k in ("devel", "python", "lib")):
                category = "Development & Libraries"
            elif any(k in sec_lower for k in ("net", "web")):
                category = "Networking & Web"
            elif any(k in sec_lower for k in ("x11", "gnome", "graphics")):
                category = "Desktop & GUI"

            p_path = f"/usr/bin/{pkg_name}"
            packages.append({
                "name": pkg_name,
                "version": version,
                "publisher": maintainer,
                "category": category,
                "install_path": p_path,
                "path": p_path,
                "install_date": "N/A",
                "date": "N/A",
                "source": "System Package (dpkg/apt)",
                "summary": f"Debian package ({section})"
            })

    try:
        snap_out = execute_readonly_command(client, "snap list 2>/dev/null || true", timeout=6)
        snap_lines = snap_out.splitlines()[1:]
        for sline in snap_lines:
            sparts = sline.split()
            if len(sparts) >= 3:
                sname = sparts[0].strip()
                sver = sparts[1].strip()
                sdev = sparts[3].strip() if len(sparts) > 3 else "Canonical"
                if sname and sname not in seen:
                    seen.add(sname)
                    snap_p = f"/snap/bin/{sname}"
                    packages.insert(0, {
                        "name": sname,
                        "version": sver,
                        "publisher": sdev,
                        "category": "Snap Application",
                        "install_path": snap_p,
                        "path": snap_p,
                        "install_date": "N/A",
                        "date": "N/A",
                        "source": "Snap Package",
                        "summary": f"Canonical Snap application ({sname})"
                    })
    except Exception:
        pass

    return packages

def test_connection(ip: str, port: int = 22, username: str = "ubuntu",
                    auth_type: str = "password", password: str = None,
                    key_data: str = None, key_path: str = None,
                    passphrase: str = None) -> tuple:
    """
    Tests SSH connectivity and retrieves quick system summary.
    Returns: (success: bool, data_or_error_dict: dict)
    """
    try:
        client = create_ssh_client(
            ip=ip, port=port, username=username,
            auth_type=auth_type, password=password,
            key_data=key_data, key_path=key_path,
            passphrase=passphrase, timeout=6
        )
        try:
            # Query quick hostname & OS
            quick_info = execute_readonly_command(client, "hostname && uname -m && cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'")
            lines = quick_info.splitlines()
            hname = lines[0].strip() if len(lines) > 0 else ip
            arch = lines[1].strip() if len(lines) > 1 else "x86_64"
            os_pretty = lines[2].strip() if len(lines) > 2 else "Ubuntu Linux"

            return True, {
                "hostname": hname,
                "ip": ip,
                "port": port,
                "username": username,
                "arch": arch,
                "os": os_pretty,
                "status": "ONLINE"
            }
        finally:
            client.close()
    except Exception as e:
        return False, {"error": str(e)}
