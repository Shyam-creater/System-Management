#!/usr/bin/env python3
"""
ProcessShield Agentless SSH Background Monitoring Engine
Maintains an autonomous background polling thread pool that queries registered
Ubuntu lab computers every 10 seconds, collects telemetry and process snapshots,
detects connection loss/resumption, and caches installed software catalogs.
"""

import time
import threading
import logging
from concurrent.futures import ThreadPoolExecutor

import database
import ssh_crypto
import ssh_manager

logger = logging.getLogger("ProcessShield.SSHMonitor")

# Lock to avoid concurrent overlapping polling of the same node
_active_polling = set()
_polling_lock = threading.Lock()

# Reference to master server FLEET_NODES and FLEET_LOCK
_fleet_nodes_ref = None
_fleet_lock_ref = None

_worker_thread = None
_running = False
_executor = ThreadPoolExecutor(max_workers=15, thread_name_prefix="SSHPollWorker")

def init_ssh_monitor(fleet_nodes: dict, fleet_lock: threading.Lock):
    """
    Initializes the SSH monitoring subsystem and links it with master server state.
    Loads registered SSH nodes from database and adds them to FLEET_NODES.
    """
    global _fleet_nodes_ref, _fleet_lock_ref, _running, _worker_thread
    _fleet_nodes_ref = fleet_nodes
    _fleet_lock_ref = fleet_lock

    # Preload registered SSH nodes into master server's FLEET_NODES
    nodes = database.get_all_ssh_nodes()
    with _fleet_lock_ref:
        for node in nodes:
            nid = node['node_id']
            if nid not in _fleet_nodes_ref:
                _fleet_nodes_ref[nid] = {
                    "node_id": nid,
                    "hostname": node['hostname'],
                    "ip": node['ip'],
                    "port": node.get('port', 22),
                    "username": node['username'],
                    "auth_type": node['auth_type'],
                    "is_simulated": False,
                    "is_ssh_agentless": True,
                    "system_type": "Ubuntu Linux (SSH Agentless)",
                    "cpu_percent": 0.0,
                    "ram_percent": 0.0,
                    "ram_used_gb": 0.0,
                    "ram_total_gb": 0.0,
                    "disk_percent": 0.0,
                    "disk_used_gb": 0.0,
                    "disk_total_gb": 0.0,
                    "process_count": 0,
                    "processes": [],
                    "health": "HEALTHY",
                    "status": node.get('last_status', 'ONLINE'),
                    "last_seen": node.get('last_polled', time.time()),
                    "last_seen_time": time.strftime("%H:%M:%S", time.localtime(node.get('last_polled', time.time()))),
                    "seconds_since_seen": time.time() - node.get('last_polled', time.time())
                }
            else:
                _fleet_nodes_ref[nid]['is_ssh_agentless'] = True

    if not _running:
        _running = True
        _worker_thread = threading.Thread(target=_background_polling_loop, daemon=True, name="SSHMonitorLoop")
        _worker_thread.start()
        print(f" [*] SSH Agentless Monitoring Engine started ({len(nodes)} lab computers registered).")

def stop_ssh_monitor():
    """Stops the background polling loop."""
    global _running
    _running = False

def evaluate_health(cpu_pct, ram_pct, disk_pct):
    """Evaluates health status and reasons based on resource thresholds."""
    reasons = []
    status = "HEALTHY"

    if cpu_pct >= 85.0:
        reasons.append(f"Severe CPU saturation ({int(cpu_pct)}%)")
        status = "CRITICAL"
    elif cpu_pct >= 70.0:
        reasons.append(f"Elevated CPU utilization ({int(cpu_pct)}%)")
        status = "WARNING"

    if ram_pct >= 90.0:
        reasons.append(f"Critically low RAM ({int(ram_pct)}%)")
        status = "CRITICAL"
    elif ram_pct >= 75.0:
        reasons.append(f"Elevated memory usage ({int(ram_pct)}%)")
        if status != "CRITICAL":
            status = "WARNING"

    if disk_pct >= 95.0:
        reasons.append(f"Disk space critical ({int(disk_pct)}%)")
        status = "CRITICAL"
    elif disk_pct >= 85.0:
        reasons.append(f"Disk space warning ({int(disk_pct)}%)")
        if status != "CRITICAL":
            status = "WARNING"

    if not reasons:
        reasons.append("Remote host operating within healthy parameters")

    return status, reasons

def poll_single_node(node_info: dict, force_software_scan: bool = False) -> dict:
    """
    Polls a single SSH node for telemetry, process snapshot, and software catalog.
    Thread-safe and guarded against overlapping execution.
    """
    node_id = node_info['node_id']
    ip = node_info['ip']

    with _polling_lock:
        if node_id in _active_polling:
            return {"status": "skipped", "message": "Already polling this node"}
        _active_polling.add(node_id)

    client = None
    try:
        # Decrypt secret
        auth_type = node_info.get('auth_type', 'password')
        enc_secret = node_info.get('enc_secret', '')
        raw_secret = ssh_crypto.decrypt_secret(enc_secret) if enc_secret else ''
        key_path = node_info.get('key_path', '')

        password = raw_secret if auth_type == 'password' else None
        key_data = raw_secret if auth_type == 'key' and not key_path else None

        client = ssh_manager.create_ssh_client(
            ip=ip,
            port=node_info.get('port', 22),
            username=node_info.get('username', 'ubuntu'),
            auth_type=auth_type,
            password=password,
            key_data=key_data,
            key_path=key_path,
            timeout=8
        )

        # 1. Collect telemetry & process snapshot
        telemetry = ssh_manager.collect_telemetry(client, timeout=10)
        now = time.time()
        time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
        time_short = time.strftime("%H:%M:%S", time.localtime(now))

        hostname = telemetry.get('hostname') or node_info.get('hostname', ip)
        sys_type = f"{telemetry.get('os', 'Ubuntu')} ({telemetry.get('cpu_model', 'x86_64')})"
        procs = telemetry.get('processes', [])

        cpu_val = telemetry.get('cpu_percent', 0.0)
        ram_val = telemetry.get('ram_percent', 0.0)
        disk_val = telemetry.get('disk_percent', 0.0)
        node_health, node_reasons = evaluate_health(cpu_val, ram_val, disk_val)

        # Upsert node registration
        node_record = {
            "node_id": node_id,
            "hostname": hostname,
            "ip": ip,
            "mac": telemetry.get('mac', ''),
            "interface": telemetry.get('interface', 'eth0'),
            "system_type": sys_type,
            "is_simulated": False,
            "health": node_health,
            "status": "ONLINE"
        }
        database.upsert_node(node_record)

        # Log telemetry record
        telemetry_payload = {
            "node_id": node_id,
            "hostname": hostname,
            "ip": ip,
            "mac": telemetry.get('mac', ''),
            "interface": telemetry.get('interface', 'eth0'),
            "system_type": sys_type,
            "is_simulated": False,
            "timestamp": now,
            "time_str": time_str,
            "cpu_percent": cpu_val,
            "ram_percent": ram_val,
            "ram_used_gb": telemetry.get('ram_used_gb', 0.0),
            "ram_total_gb": telemetry.get('ram_total_gb', 1.0),
            "disk_percent": disk_val,
            "disk_used_gb": telemetry.get('disk_used_gb', 0.0),
            "disk_total_gb": telemetry.get('disk_total_gb', 1.0),
            "gpu_name": telemetry.get('gpu_name', ''),
            "gpu_percent": telemetry.get('gpu_percent', 0.0),
            "gpu_mem_used_mb": telemetry.get('gpu_mem_used_mb', 0.0),
            "gpu_mem_total_mb": telemetry.get('gpu_mem_total_mb', 0.0),
            "process_count": telemetry.get('process_count', len(procs)),
            "processes": procs,
            "health": node_health,
            "health_reasons": node_reasons
        }
        database.log_telemetry(telemetry_payload)

        # Save processes snapshot
        if procs:
            database.save_process_snapshot(node_id, procs)

        # 2. Check software inventory scan
        last_sw_scan = node_info.get('last_software_scan', 0)
        sw_scanned = False
        if force_software_scan or last_sw_scan == 0 or (now - last_sw_scan > 7200):
            try:
                packages = ssh_manager.collect_installed_software(client, timeout=15)
                if packages:
                    database.save_ssh_software(node_id, packages)
                    sw_scanned = True
            except Exception as swe:
                print(f" [!] Software inventory scan failed for {ip}: {swe}")

        # Update database state
        database.update_ssh_node_poll(node_id, status='ONLINE', failures=0, software_scanned=sw_scanned)

        # Update in-memory FLEET_NODES
        if _fleet_nodes_ref is not None and _fleet_lock_ref is not None:
            with _fleet_lock_ref:
                _fleet_nodes_ref[node_id] = {
                    "node_id": node_id,
                    "hostname": hostname,
                    "ip": ip,
                    "mac": telemetry.get('mac', ''),
                    "interface": telemetry.get('interface', 'eth0'),
                    "is_simulated": False,
                    "is_ssh_agentless": True,
                    "system_type": sys_type,
                    "cpu_percent": telemetry.get('cpu_percent', 0.0),
                    "gpu_name": telemetry.get('gpu_name', ''),
                    "gpu_percent": telemetry.get('gpu_percent', 0.0),
                    "gpu_mem_used_mb": telemetry.get('gpu_mem_used_mb', 0.0),
                    "gpu_mem_total_mb": telemetry.get('gpu_mem_total_mb', 0.0),
                    "gpu_mem_percent": round((telemetry.get('gpu_mem_used_mb', 0.0) / max(1.0, telemetry.get('gpu_mem_total_mb', 1.0))) * 100.0, 1),
                    "ram_percent": telemetry.get('ram_percent', 0.0),
                    "ram_used_gb": telemetry.get('ram_used_gb', 0.0),
                    "ram_total_gb": telemetry.get('ram_total_gb', 1.0),
                    "disk_percent": telemetry.get('disk_percent', 0.0),
                    "disk_used_gb": telemetry.get('disk_used_gb', 0.0),
                    "disk_total_gb": telemetry.get('disk_total_gb', 1.0),
                    "process_count": telemetry.get('process_count', len(procs)),
                    "processes": procs,
                    "health": node_health,
                    "health_reasons": node_reasons,
                    "status": "ONLINE",
                    "last_seen": now,
                    "last_seen_time": time_short,
                    "seconds_since_seen": 0.0
                }

        return {"status": "ok", "node_id": node_id, "telemetry": telemetry_payload}

    except Exception as e:
        # Failure handling
        failures = node_info.get('consecutive_failures', 0) + 1
        new_status = 'OFFLINE' if failures >= 3 else 'ONLINE'
        new_health = 'CRITICAL' if failures >= 3 else 'WARNING'
        err_msg = str(e)

        database.update_ssh_node_poll(node_id, status=new_status, failures=failures)

        if _fleet_nodes_ref is not None and _fleet_lock_ref is not None:
            with _fleet_lock_ref:
                if node_id not in _fleet_nodes_ref:
                    _fleet_nodes_ref[node_id] = {
                        "node_id": node_id,
                        "hostname": node_info.get('hostname', ip),
                        "ip": ip,
                        "is_simulated": False,
                        "is_ssh_agentless": True,
                        "system_type": "Ubuntu Linux (SSH Agentless)",
                        "cpu_percent": 0.0,
                        "ram_percent": 0.0,
                        "ram_used_gb": 0.0,
                        "ram_total_gb": 0.0,
                        "disk_percent": 0.0,
                        "disk_used_gb": 0.0,
                        "disk_total_gb": 0.0,
                        "process_count": 0,
                        "processes": [],
                        "health": new_health,
                        "status": new_status,
                        "last_seen": time.time(),
                        "last_seen_time": time.strftime("%H:%M:%S"),
                        "seconds_since_seen": 0.0,
                        "health_reasons": [f"SSH Connection Failure: {err_msg}"]
                    }
                else:
                    _fleet_nodes_ref[node_id]['status'] = new_status
                    _fleet_nodes_ref[node_id]['health'] = new_health
                    _fleet_nodes_ref[node_id]['health_reasons'] = [f"SSH Connection Failure: {err_msg}"]

        if failures == 3:
            database.log_alert({
                "node_id": node_id,
                "timestamp": time.time(),
                "time_str": time.strftime("%Y-%m-%d %H:%M:%S"),
                "level": "CRITICAL",
                "message": f"Lab Computer {ip} went OFFLINE: repeated SSH connection failures ({err_msg})"
            })

        return {"status": "error", "node_id": node_id, "error": err_msg}

    finally:
        if client:
            try:
                client.close()
            except Exception:
                pass
        with _polling_lock:
            _active_polling.discard(node_id)

def _background_polling_loop():
    """Periodic daemon loop polling all active SSH nodes."""
    while _running:
        try:
            nodes = database.get_all_ssh_nodes()
            futures = []
            for node in nodes:
                if node.get('auto_poll', 1) == 1:
                    futures.append(_executor.submit(poll_single_node, node))

            # Wait briefly between rounds (cadence: 10s)
            time.sleep(10)
        except Exception as e:
            time.sleep(5)

def poll_node_now(node_id: str) -> dict:
    """Triggers an immediate on-demand poll for a specific node."""
    node = database.get_ssh_node(node_id)
    if not node:
        raise ValueError(f"SSH node '{node_id}' not found in database.")
    return poll_single_node(node, force_software_scan=False)

def rescan_node_software_now(node_id: str) -> list:
    """Forces an immediate software inventory rescan for an SSH node."""
    node = database.get_ssh_node(node_id)
    if not node:
        raise ValueError(f"SSH node '{node_id}' not found in database.")
    poll_single_node(node, force_software_scan=True)
    return database.get_ssh_software(node_id) or []
