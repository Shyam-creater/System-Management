"""
ProcessShield USB Guard Agent
- Detects USB storage insertion (Windows + Linux)
- Blanks the screen with a full-screen overlay (policy: alert_lock)
- Reports to the server via Socket.IO / REST and obeys remote unlock/lock commands
Run in the student's logged-in session (not as a Windows service).
"""
import ctypes
import getpass
import json
import os
import platform
import queue
import subprocess
import threading
import time
import tkinter as tk

try:
    import socketio
except ImportError:
    socketio = None

# ----------------------------- CONFIG --------------------------------------
SERVER_URL = os.getenv("PS_SERVER_URL", "http://127.0.0.1:5000")
NODE_ID = os.getenv("PS_NODE_ID", platform.node())
API_KEY = os.getenv("PS_API_KEY", os.getenv("AGENT_TOKEN", "ProcessShield-Secret-Token-2026"))
HEARTBEAT_SECONDS = 15
DEFAULT_MESSAGE = (
    "USB storage device detected.\n"
    "This computer is blocked.\n"
    "Please call the lab assistant."
)
IS_WIN = platform.system() == "Windows"
STATE_DIR = os.getenv("PROGRAMDATA") if IS_WIN else "/var/tmp"
LOCK_FILE = os.path.join(STATE_DIR or ".", "ps_usb_lock.json")
# ---------------------------------------------------------------------------

ui_q: "queue.Queue[tuple]" = queue.Queue()
pending: list = []          # events waiting to be sent while offline
pending_lock = threading.Lock()

state = {
    "locked": False,
    "policy": {"mode": "alert_lock", "message": DEFAULT_MESSAGE, "allowlist": []},
}

sio = socketio.Client(reconnection=True, reconnection_delay=2, reconnection_delay_max=15) if socketio else None


# ----------------------------- SERVER LINK ---------------------------------
def emit(event: str, payload: dict):
    """Send now via Socket.IO if connected, otherwise queue or send HTTP fallback."""
    if sio and sio.connected:
        try:
            sio.emit(event, payload)
            return
        except Exception:
            pass

    with pending_lock:
        pending.append((event, payload))

    # Also attempt HTTP fallback if socket.io is not connected
    try:
        if event == "usb:inserted":
            import urllib.request
            req = urllib.request.Request(
                f"{SERVER_URL}/api/usb/events",
                data=json.dumps({**payload, "nodeId": NODE_ID}).encode("utf-8"),
                headers={"Content-Type": "application/json", "X-Agent-Token": API_KEY}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                pass
    except Exception:
        pass


if sio:
    @sio.event
    def connect():
        print(f" [USB Guard] Connected to master server: {SERVER_URL}")
        with pending_lock:
            items = pending[:]
            pending.clear()
        for ev, pl in items:
            try:
                sio.emit(ev, pl)
            except Exception:
                pass

    @sio.event
    def disconnect():
        print(" [USB Guard] Disconnected from master server. Reconnecting...")

    @sio.on("policy:update")
    def on_policy(p):
        print(f" [USB Guard] Policy updated from server: mode={p.get('mode')}, allowlist_len={len(p.get('allowlist', []))}")
        state["policy"].update(p or {})

    @sio.on("cmd:lock")
    def on_cmd_lock(p=None):
        msg = (p or {}).get("message") or state["policy"].get("message") or DEFAULT_MESSAGE
        print(" [USB Guard] Received cmd:lock from server")
        ui_q.put(("lock", msg))

    @sio.on("cmd:unlock")
    def on_cmd_unlock(_=None):
        print(" [USB Guard] Received cmd:unlock from server")
        ui_q.put(("unlock", None))


def connect_loop(server_url=None, node_id=None, api_key=None):
    srv = server_url or SERVER_URL
    nid = node_id or NODE_ID
    key = api_key or API_KEY

    while True:
        if sio and not sio.connected:
            try:
                sio.connect(
                    srv,
                    auth={"role": "agent", "nodeId": nid, "apiKey": key},
                    transports=["websocket", "polling"],
                    wait_timeout=10,
                )
            except Exception as e:
                # Retry in 5s
                pass
        time.sleep(5)


def heartbeat_loop():
    while True:
        if sio and sio.connected:
            try:
                sio.emit("agent:heartbeat", {"locked": state["locked"]})
            except Exception:
                pass
        time.sleep(HEARTBEAT_SECONDS)


# ----------------------------- USB HANDLING --------------------------------
def handle_insert(dev: dict):
    pol = state["policy"]
    serial = (dev.get("serial") or "").strip().lower()
    allowed_list = [str(x).strip().lower() for x in pol.get("allowlist", [])]
    allowed = bool(serial) and serial in allowed_list
    mode = pol.get("mode", "alert_lock")

    action = "none"
    if mode != "off" and not allowed:
        action = "lock" if mode == "alert_lock" else "alert"

    print(f"\n [USB Guard] USB STORAGE INSERTED: {dev.get('model', 'Drive')} | Serial: {dev.get('serial')} | Mode: {mode} | Allowed: {allowed} | Action: {action}")

    if action == "lock":
        ui_q.put(("lock", pol.get("message") or DEFAULT_MESSAGE))

    emit(
        "usb:inserted",
        {
            **dev,
            "nodeId": NODE_ID,
            "user": getpass.getuser(),
            "action": action,
            "allowed": allowed,
            "mode": mode,
            "at": int(time.time() * 1000),
        },
    )


def handle_remove(dev: dict):
    print(f" [USB Guard] USB storage removed: Serial: {dev.get('serial', '')}")
    emit("usb:removed", {"serial": dev.get("serial", ""), "nodeId": NODE_ID})


# ---- Windows: poll removable drives every second ----
def _win_volume_info(drive: str):
    label = ctypes.create_unicode_buffer(261)
    fs = ctypes.create_unicode_buffer(261)
    serial = ctypes.c_uint32()
    ok = ctypes.windll.kernel32.GetVolumeInformationW(
        ctypes.c_wchar_p(drive), label, 261, ctypes.byref(serial), None, None, fs, 261
    )
    return (label.value, f"{serial.value:08X}") if ok else ("", "")


def _win_removable():
    import psutil

    found = {}
    for p in psutil.disk_partitions(all=False):
        opts = (p.opts or "").lower()
        if "removable" in opts or "cdrom" in opts:
            found[p.device] = p
    return found


def watch_windows():
    known: dict = {}
    while True:
        try:
            now = _win_removable()
            for drive in now.keys() - known.keys():
                label, serial = _win_volume_info(drive)
                handle_insert(
                    {"serial": serial, "label": label, "model": f"Removable drive {drive}", "vendor": ""}
                )
            for drive in known.keys() - now.keys():
                handle_remove({"serial": ""})
            known = now
        except Exception:
            pass
        time.sleep(1)


# ---- Linux: pyudev event monitor ----
def _linux_info(dev):
    return {
        "serial": dev.get("ID_SERIAL_SHORT") or dev.get("ID_SERIAL") or "",
        "vendor": (dev.get("ID_VENDOR") or "").replace("_", " "),
        "model": (dev.get("ID_MODEL") or "").replace("_", " "),
        "label": dev.get("ID_FS_LABEL") or "",
    }


def watch_linux():
    try:
        import pyudev
    except ImportError:
        print(" [USB Guard] Warning: pyudev not installed. Linux USB monitoring unavailable.")
        return

    ctx = pyudev.Context()
    for dev in ctx.list_devices(subsystem="block", DEVTYPE="disk"):
        if dev.get("ID_BUS") == "usb":
            handle_insert(_linux_info(dev))

    mon = pyudev.Monitor.from_netlink(ctx)
    mon.filter_by(subsystem="block", device_type="disk")
    for dev in iter(mon.poll, None):
        if dev.get("ID_BUS") != "usb":
            continue
        if dev.action == "add":
            handle_insert(_linux_info(dev))
        elif dev.action == "remove":
            handle_remove(_linux_info(dev))


# ----------------------------- OVERLAY (UI) --------------------------------
class Overlay:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.win = None

    def show(self, message: str):
        if self.win is not None:
            return
        w = tk.Toplevel(self.root)
        w.configure(bg="black", cursor="none")
        w.overrideredirect(True)
        w.geometry(f"{w.winfo_screenwidth()}x{w.winfo_screenheight()}+0+0")
        w.attributes("-topmost", True)
        tk.Label(
            w,
            text=message,
            fg="white",
            bg="black",
            font=("Arial", 28, "bold"),
            justify="center",
            wraplength=int(w.winfo_screenwidth() * 0.8)
        ).pack(expand=True)
        w.protocol("WM_DELETE_WINDOW", lambda: None)
        for seq in ("<Key>", "<Alt-F4>", "<Escape>", "<Button>", "<Control-Key>"):
            w.bind(seq, lambda e: "break")
        w.focus_force()
        try:
            w.grab_set()
        except tk.TclError:
            pass
        self.win = w
        state["locked"] = True
        self._save_lock(message)
        self._keep_on_top()
        print(" [USB Guard] Screen overlay displayed. Computer blocked.")

    def hide(self):
        if self.win is not None:
            try:
                self.win.destroy()
            finally:
                self.win = None
        state["locked"] = False
        try:
            if os.path.exists(LOCK_FILE):
                os.remove(LOCK_FILE)
        except Exception:
            pass
        emit("usb:unlocked", {"nodeId": NODE_ID})
        print(" [USB Guard] Screen overlay removed. Computer unlocked.")

    def _keep_on_top(self):
        if self.win is None:
            return
        try:
            self.win.lift()
            self.win.attributes("-topmost", True)
            self.win.focus_force()
        except tk.TclError:
            pass
        self.root.after(500, self._keep_on_top)

    @staticmethod
    def _save_lock(message: str):
        try:
            with open(LOCK_FILE, "w", encoding="utf-8") as f:
                json.dump({"message": message, "at": time.time()}, f)
        except OSError:
            pass


def run_usb_guard(server_url=None, node_id=None, api_key=None):
    global SERVER_URL, NODE_ID, API_KEY
    if server_url:
        SERVER_URL = server_url.rstrip("/")
    if node_id:
        NODE_ID = node_id
    if api_key:
        API_KEY = api_key

    root = tk.Tk()
    root.withdraw()
    overlay = Overlay(root)

    # Re-lock after agent restart if locked previously
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, encoding="utf-8") as f:
                saved = json.load(f)
                ui_q.put(("lock", saved.get("message", DEFAULT_MESSAGE)))
        except Exception:
            ui_q.put(("lock", DEFAULT_MESSAGE))

    threading.Thread(target=connect_loop, args=(SERVER_URL, NODE_ID, API_KEY), daemon=True).start()
    threading.Thread(target=heartbeat_loop, daemon=True).start()
    threading.Thread(target=watch_windows if IS_WIN else watch_linux, daemon=True).start()

    def pump():
        try:
            while True:
                cmd, arg = ui_q.get_nowait()
                if cmd == "lock":
                    overlay.show(arg)
                elif cmd == "unlock":
                    overlay.hide()
        except queue.Empty:
            pass
        root.after(200, pump)

    pump()
    root.mainloop()


def start_usb_guard_thread(server_url="http://127.0.0.1:5000", node_id=None, api_key=None):
    """Launch USB Guard in a daemon thread so it runs seamlessly inside agent.py"""
    t = threading.Thread(target=run_usb_guard, args=(server_url, node_id, api_key), daemon=True)
    t.start()
    return t


def trigger_simulated_usb(serial="TEST-USB-999", model="SanDisk Ultra USB 3.0", label="STUDENT_DRIVE"):
    """Helper to simulate USB storage plug-in for automated verification or testing"""
    handle_insert({"serial": serial, "model": model, "label": label, "vendor": "SanDisk"})


if __name__ == "__main__":
    print("=" * 65)
    print("      PROCESSSHIELD USB GUARD AGENT (Hardware & Screen Protection) ")
    print("=" * 65)
    print(f" [*] Target Server: {SERVER_URL}")
    print(f" [*] Monitored Node: {NODE_ID}")
    print(f" [*] OS Platform:    {'Windows' if IS_WIN else 'Linux'}")
    print("=" * 65)
    run_usb_guard()
