#!/usr/bin/env python3
"""
ProcessShield Command Executor
Polls master server for pending remote commands (shutdown, restart, lock, logoff, message, cancel_shutdown)
and executes them safely using strict argument arrays without shell injection.
"""

import sys
import os
import time
import re
import socket
import threading
import subprocess
import urllib.request
import urllib.error
import json

class CommandExecutor:
    def __init__(self, server_url="http://127.0.0.1:5000", node_id=None, is_simulated=False, agent_token=None, interval=5):
        self.server_url = server_url.rstrip("/")
        self.interval = interval
        self.is_simulated = is_simulated
        self.agent_token = agent_token or os.environ.get("AGENT_TOKEN", "ProcessShield-Secret-Token-2026")
        self.hostname = socket.gethostname()
        self.node_id = node_id or self._detect_node_id()
        self.running = False
        self._thread = None
        self.platform = sys.platform  # 'win32', 'linux', 'darwin'

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

    def _get(self, endpoint):
        url = f"{self.server_url}{endpoint}"
        req = urllib.request.Request(url, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            return None

    def _post(self, endpoint, payload):
        url = f"{self.server_url}{endpoint}"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            return None

    def sanitize_text(self, text):
        if not text:
            return ""
        # Strip control characters and cap at 200 chars
        clean = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', str(text)).strip()
        return clean[:200]

    def execute_command(self, cmd):
        cmd_id = cmd.get("_id") or cmd.get("id")
        cmd_type = cmd.get("type")
        payload = cmd.get("payload") or {}

        if self.is_simulated:
            print(f"[CommandExecutor] (Simulated) Acking command '{cmd_type}' for node '{self.node_id}'")
            self._post(f"/api/agent/commands/{cmd_id}/ack", {
                "status": "done",
                "result": "simulated"
            })
            return

        delay_sec = int(payload.get("delaySec", 60))
        delay_min = max(1, (delay_sec + 59) // 60)
        text = self.sanitize_text(payload.get("text", "Notice: ProcessShield Lab Management"))

        args = None

        try:
            if cmd_type == "shutdown":
                if self.platform == "win32":
                    args = ["shutdown", "/s", "/t", str(delay_sec)]
                elif self.platform.startswith("linux"):
                    args = ["shutdown", "-h", f"+{delay_min}"]
                elif self.platform == "darwin":
                    args = ["shutdown", "-h", f"+{delay_min}"]

            elif cmd_type == "restart":
                if self.platform == "win32":
                    args = ["shutdown", "/r", "/t", str(delay_sec)]
                elif self.platform.startswith("linux"):
                    args = ["shutdown", "-r", f"+{delay_min}"]
                elif self.platform == "darwin":
                    args = ["shutdown", "-r", f"+{delay_min}"]

            elif cmd_type == "cancel_shutdown":
                if self.platform == "win32":
                    args = ["shutdown", "/a"]
                elif self.platform.startswith("linux"):
                    args = ["shutdown", "-c"]
                elif self.platform == "darwin":
                    args = ["killall", "shutdown"]

            elif cmd_type == "lock":
                if self.platform == "win32":
                    args = ["rundll32.exe", "user32.dll,LockWorkStation"]
                elif self.platform.startswith("linux"):
                    args = ["loginctl", "lock-sessions"]
                elif self.platform == "darwin":
                    args = ["pmset", "displaysleepnow"]

            elif cmd_type == "logoff":
                if self.platform == "win32":
                    args = ["shutdown", "/l"]
                elif self.platform.startswith("linux"):
                    current_user = os.environ.get("USER", "root")
                    args = ["loginctl", "terminate-user", current_user]
                elif self.platform == "darwin":
                    args = ["launchctl", "bootout", f"user/{os.getuid()}"]

            elif cmd_type == "message":
                if self.platform == "win32":
                    args = ["msg", "*", text]
                elif self.platform.startswith("linux"):
                    args = ["wall", text]
                elif self.platform == "darwin":
                    args = ["osascript", "-e", f'display notification "{text}" with title "ProcessShield Lab Admin"']

            if not args:
                raise ValueError(f"Unsupported command '{cmd_type}' on platform '{self.platform}'")

            print(f"[CommandExecutor] ⚡ Executing command: {' '.join(args)}")
            res = subprocess.run(args, shell=False, capture_output=True, text=True, timeout=15)
            
            if res.returncode == 0:
                result_str = f"Success: {res.stdout.strip() or 'Command executed'}"
                self._post(f"/api/agent/commands/{cmd_id}/ack", {
                    "status": "done",
                    "result": result_str[:200]
                })
            else:
                err_str = f"Exit code {res.returncode}: {res.stderr.strip() or res.stdout.strip()}"
                print(f"[CommandExecutor] ⚠️ Command warning/error: {err_str}")
                self._post(f"/api/agent/commands/{cmd_id}/ack", {
                    "status": "done" if "already in progress" in err_str.lower() else "failed",
                    "result": err_str[:200]
                })

        except Exception as e:
            print(f"[CommandExecutor] ❌ Execution failed: {e}")
            self._post(f"/api/agent/commands/{cmd_id}/ack", {
                "status": "failed",
                "result": str(e)[:200]
            })

    def poll_once(self):
        encoded_node = urllib.parse.quote(self.node_id) if hasattr(urllib, 'parse') else self.node_id
        import urllib.parse
        encoded_node = urllib.parse.quote(self.node_id)
        res = self._get(f"/api/agent/commands/{encoded_node}")
        if res and isinstance(res, dict) and "commands" in res:
            for cmd in res["commands"]:
                self.execute_command(cmd)

    def _loop(self):
        while self.running:
            try:
                self.poll_once()
            except Exception as e:
                pass
            time.sleep(self.interval)

    def start(self):
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="CommandExecutorThread")
        self._thread.start()
        print(f"[CommandExecutor] Remote command executor started for '{self.node_id}' (polling every {self.interval}s)")

    def stop(self):
        self.running = False


def start_command_executor_thread(server_url="http://127.0.0.1:5000", node_id=None, is_simulated=False, interval=5):
    executor = CommandExecutor(server_url=server_url, node_id=node_id, is_simulated=is_simulated, interval=interval)
    executor.start()
    return executor

if __name__ == "__main__":
    server = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000"
    executor = CommandExecutor(server_url=server)
    executor.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        executor.stop()
