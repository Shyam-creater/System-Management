#!/usr/bin/env python3
"""
ProcessShield Session Tracker
Monitors active student and user logins/logouts using psutil.users(),
syncs initial state with the Master Server, and reports login/logout events.
"""

import sys
import os
import time
import socket
import threading
import urllib.request
import urllib.error
import json
import psutil

SYSTEM_IGNORED_USERS = {
    'daemon', 'nobody', 'sys', 'bin', 'sshd', 'messagebus',
    'systemd-resolve', 'systemd-network', 'syslog'
}

class SessionTracker:
    def __init__(self, server_url="http://127.0.0.1:5000", node_id=None, interval=5, agent_token=None):
        self.server_url = server_url.rstrip("/")
        self.interval = interval
        self.agent_token = agent_token or os.environ.get("AGENT_TOKEN", "ProcessShield-Secret-Token-2026")
        self.hostname = socket.gethostname()
        self.node_id = node_id or self._detect_node_id()
        self.active_users = set()
        self.running = False
        self._lock = threading.Lock()

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

    def _post(self, endpoint, payload):
        url = f"{self.server_url}{endpoint}"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Token": self.agent_token,
                "X-ProcessShield-Key": "ProcessShield-OS-2026"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            # Silent fallback if server temporarily unreachable
            return None

    def get_logged_in_users(self):
        current_users = set()
        try:
            users = psutil.users()
            for u in users:
                name = u.name.strip()
                if name and name.lower() not in SYSTEM_IGNORED_USERS:
                    current_users.add(name)
        except Exception:
            pass

        # Fallback to os.getlogin() or whoami if psutil.users() is empty (common in some Windows/WSL environments)
        if not current_users:
            try:
                login_name = os.getlogin()
                if login_name and login_name.lower() not in SYSTEM_IGNORED_USERS:
                    current_users.add(login_name)
            except Exception:
                pass
            if not current_users and os.environ.get("USERNAME"):
                uname = os.environ.get("USERNAME")
                if uname and uname.lower() not in SYSTEM_IGNORED_USERS:
                    current_users.add(uname)
            elif not current_users and os.environ.get("USER"):
                uname = os.environ.get("USER")
                if uname and uname.lower() not in SYSTEM_IGNORED_USERS:
                    current_users.add(uname)

        return current_users

    def sync_sessions(self):
        current = self.get_logged_in_users()
        with self._lock:
            self.active_users = set(current)

        payload = {
            "nodeId": self.node_id,
            "users": list(current),
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        res = self._post("/api/sessions/sync", payload)
        if res:
            print(f"[SessionTracker] Synced with server: {len(current)} user(s) online ({', '.join(current) or 'None'}).")

    def track_once(self):
        current = self.get_logged_in_users()

        with self._lock:
            logged_in = current - self.active_users
            logged_out = self.active_users - current
            self.active_users = set(current)

        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        for username in logged_in:
            print(f"[SessionTracker] 🟢 User Login Detected: '{username}' on '{self.node_id}'")
            self._post("/api/sessions/event", {
                "nodeId": self.node_id,
                "event": "login",
                "username": username,
                "ts": ts
            })

        for username in logged_out:
            print(f"[SessionTracker] 🔴 User Logout Detected: '{username}' on '{self.node_id}'")
            self._post("/api/sessions/event", {
                "nodeId": self.node_id,
                "event": "logout",
                "username": username,
                "ts": ts
            })

    def run(self):
        print(f"[SessionTracker] Starting session monitoring for {self.node_id} -> {self.server_url}")
        self.running = True
        self.sync_sessions()

        while self.running:
            time.sleep(self.interval)
            try:
                self.track_once()
            except Exception as e:
                print(f"[SessionTracker] Error in loop: {e}")

    def stop(self):
        self.running = False

def start_session_tracker_thread(server_url="http://127.0.0.1:5000", node_id=None, interval=5, agent_token=None):
    tracker = SessionTracker(server_url=server_url, node_id=node_id, interval=interval, agent_token=agent_token)
    t = threading.Thread(target=tracker.run, daemon=True, name="SessionTrackerThread")
    t.start()
    return tracker

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ProcessShield Lab Session Tracker")
    parser.add_argument("--server", default="http://127.0.0.1:5000", help="Master Server URL")
    parser.add_argument("--interval", type=int, default=5, help="Check interval in seconds")
    parser.add_argument("--node-id", default=None, help="Custom node ID")
    parser.add_argument("--token", default=None, help="Agent security token")
    args = parser.parse_args()

    tracker = SessionTracker(server_url=args.server, node_id=args.node_id, interval=args.interval, agent_token=args.token)
    try:
        tracker.run()
    except KeyboardInterrupt:
        print("\n[SessionTracker] Stopped by user.")
