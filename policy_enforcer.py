#!/usr/bin/env python3
"""
ProcessShield Policy Enforcer
Monitors running processes against lab-specific and global policies (blocklist/allowlist).
Terminates disallowed applications and reports violations to the ProcessShield Master Server.
Protects core operating system processes and honours time windows and active days.
"""

import sys
import os
import time
import socket
import threading
import urllib.request
import urllib.parse
import urllib.error
import json
import psutil

# Core system processes that can NEVER be terminated under any policy
PROTECTED_PROCESSES = {
    'system', 'svchost.exe', 'explorer.exe', 'winlogon.exe', 'csrss.exe',
    'lsass.exe', 'services.exe', 'python.exe', 'python3.exe', 'python', 'python3',
    'systemd', 'init', 'xorg', 'gnome-shell', 'sshd', 'launchd', 'windowserver',
    'smss.exe', 'services.exe', 'taskhostw.exe', 'runtimebroker.exe'
}

DAY_MAP = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}

class PolicyEnforcer:
    def __init__(self, server_url="http://127.0.0.1:5000", node_id=None, is_simulated=False, agent_token=None, interval=5):
        self.server_url = server_url.rstrip("/")
        self.interval = interval
        self.is_simulated = is_simulated
        self.agent_token = agent_token or os.environ.get("AGENT_TOKEN", "ProcessShield-Secret-Token-2026")
        self.hostname = socket.gethostname()
        self.node_id = node_id or self._detect_node_id()
        self.policies = []
        self.last_policy_fetch = 0
        self.reported_violations = set()  # set of (pid, process_name)
        self.running = False
        self._thread = None
        self.own_pid = os.getpid()

    def _detect_node_id(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(('10.255.255.255', 1))
            ip = s.getsockname()[0]
            s.close()
        except Exception:
            ip = "127.0.0.1"
        return f"{self.hostname} ({ip})"

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "X-Agent-Token": self.agent_token,
            "X-ProcessShield-Key": "ProcessShield-OS-2026"
        }

    def fetch_policies(self):
        encoded_node = urllib.parse.quote(self.node_id)
        url = f"{self.server_url}/api/agent/policy/{encoded_node}"
        req = urllib.request.Request(url, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                self.policies = data.get("policies", [])
                self.last_policy_fetch = time.time()
                if self.policies:
                    names = [p.get('name') for p in self.policies]
                    print(f"[PolicyEnforcer] Loaded {len(self.policies)} active policy rule(s): {', '.join(names)}")
        except Exception as e:
            pass

    def is_policy_active(self, policy):
        if not policy.get("enabled", True):
            return False

        now = time.localtime()
        current_day = DAY_MAP.get(now.tm_wday, 'Mon')
        days = policy.get("days") or []
        if days and current_day not in days:
            return False

        active_from = policy.get("activeFrom")
        active_to = policy.get("activeTo")
        if active_from and active_to:
            current_time_str = time.strftime("%H:%M", now)
            if not (active_from <= current_time_str <= active_to):
                return False

        return True

    def report_violation(self, username, proc_name, action):
        payload = {
            "nodeId": self.node_id,
            "username": username or "unknown",
            "processName": proc_name,
            "action": action
        }
        url = f"{self.server_url}/api/violations"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                pass
        except Exception as e:
            pass

    def enforce_once(self):
        if self.is_simulated:
            return

        # Refresh policies every 60 seconds
        if time.time() - self.last_policy_fetch > 60 or not self.policies:
            self.fetch_policies()

        active_policies = [p for p in self.policies if self.is_policy_active(p)]
        if not active_policies:
            return

        current_pids = set()

        for proc in psutil.process_iter(['pid', 'name', 'username']):
            try:
                pid = proc.info['pid']
                current_pids.add(pid)
                name = (proc.info['name'] or '').strip()
                username = proc.info['username'] or 'user'
                lower_name = name.lower()

                # Safety checks: never kill agent itself, never kill PID < 100 on Unix, never kill protected OS processes
                if pid == self.own_pid:
                    continue
                if (sys.platform.startswith('linux') or sys.platform == 'darwin') and pid < 100:
                    continue
                if lower_name in PROTECTED_PROCESSES or name in PROTECTED_PROCESSES:
                    continue

                for pol in active_policies:
                    mode = pol.get("mode", "blocklist")
                    proc_names = [p.lower() for p in (pol.get("processNames") or [])]
                    action_type = pol.get("action", "alert_only")
                    violation_detected = False

                    if mode == "blocklist":
                        if lower_name in proc_names or any(lower_name == pn or lower_name.startswith(pn + ".") for pn in proc_names):
                            violation_detected = True
                    elif mode == "allowlist":
                        # In allowlist mode: if user app and not in allowed list
                        is_user = username and username.lower() not in ('system', 'root', 'nobody', 'daemon', 'localservice', 'networkservice')
                        if is_user and lower_name not in proc_names:
                            violation_detected = True

                    if violation_detected:
                        cache_key = (pid, lower_name)
                        if cache_key not in self.reported_violations:
                            self.reported_violations.add(cache_key)

                            final_action = "alerted"
                            if action_type == "kill":
                                print(f"[PolicyEnforcer] 🛑 VIOLATION: Terminating disallowed process '{name}' (PID: {pid}, User: {username}) under policy '{pol.get('name')}'")
                                try:
                                    proc.terminate()
                                    try:
                                        proc.wait(timeout=3)
                                    except psutil.TimeoutExpired:
                                        proc.kill()
                                    final_action = "killed"
                                except Exception as kill_err:
                                    print(f"[PolicyEnforcer] Kill error: {kill_err}")
                                    final_action = "alerted"
                            else:
                                print(f"[PolicyEnforcer] ⚠️ VIOLATION DETECTED: Disallowed process '{name}' (PID: {pid}, User: {username}) under policy '{pol.get('name')}'")
                                final_action = "alerted"

                            self.report_violation(username, name, final_action)

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        # Clean up stale PIDs from reported violations cache
        stale = [k for k in self.reported_violations if k[0] not in current_pids]
        for k in stale:
            self.reported_violations.discard(k)

    def _loop(self):
        # Initial policy fetch
        self.fetch_policies()
        while self.running:
            try:
                self.enforce_once()
            except Exception as e:
                pass
            time.sleep(self.interval)

    def start(self):
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="PolicyEnforcerThread")
        self._thread.start()
        print(f"[PolicyEnforcer] Process policy enforcer started for '{self.node_id}'")

    def stop(self):
        self.running = False


def start_policy_enforcer_thread(server_url="http://127.0.0.1:5000", node_id=None, is_simulated=False, interval=5):
    enforcer = PolicyEnforcer(server_url=server_url, node_id=node_id, is_simulated=is_simulated, interval=interval)
    enforcer.start()
    return enforcer

if __name__ == "__main__":
    server = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000"
    enforcer = PolicyEnforcer(server_url=server)
    enforcer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        enforcer.stop()
