#!/usr/bin/env python3
"""
Integration and Unit Tests for ProcessShield SSH Agentless Lab Computer Monitoring
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error

# Add parent dir to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import ssh_crypto
import ssh_manager
import database

SERVER_BASE = "http://127.0.0.1:8082"

def api_post(endpoint, data):
    url = f"{SERVER_BASE}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 0, {"status": "error", "message": str(e)}

def api_get(endpoint):
    url = f"{SERVER_BASE}{endpoint}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 0, {"status": "error", "message": str(e)}

def run_tests():
    print("=" * 60)
    print(" ProcessShield SSH Agentless Automated Test Suite")
    print("=" * 60)

    # 1. Crypto verification
    print("\n[1] Testing Credential Vault (Fernet encryption)...")
    secret = "P@ssw0rdLab2026!"
    token = ssh_crypto.encrypt_secret(secret)
    decrypted = ssh_crypto.decrypt_secret(token)
    assert decrypted == secret, f"Crypto mismatch: {decrypted} != {secret}"
    assert token != secret, "Token is not encrypted"
    print(" [✓] Vault Encryption/Decryption verified successfully.")

    # 2. IP Validation
    print("\n[2] Testing IP address validation and sanitization...")
    assert ssh_manager.validate_ip("10.30.158.79") is True
    assert ssh_manager.validate_ip("192.168.1.100") is True
    assert ssh_manager.validate_ip("127.0.0.1") is True
    assert ssh_manager.validate_ip("999.999.999.999") is False
    assert ssh_manager.validate_ip("10.0.0.1; rm -rf /") is False
    assert ssh_manager.validate_ip("google.com") is False
    print(" [✓] IP validation rules verified.")

    # 3. Test API: Invalid IP rejection
    print("\n[3] Testing API: Rejection of invalid IP...")
    status, res = api_post("/api/ssh/test", {
        "ip": "invalid-ip-format",
        "username": "root"
    })
    assert status == 400 or res.get("status") == "error"
    print(f" [✓] Correctly rejected invalid IP: {res.get('message')}")

    # 4. Test API: Unreachable IP handling
    print("\n[4] Testing API: Unreachable host / timeout handling...")
    t0 = time.time()
    status, res = api_post("/api/ssh/test", {
        "ip": "192.0.2.1",  # RFC 5737 TEST-NET (non-routable)
        "port": 22,
        "username": "labuser",
        "auth_type": "password",
        "password": "dummy"
    })
    elapsed = time.time() - t0
    assert res.get("status") == "error", "Should report error for unreachable host"
    print(f" [✓] Gracefully handled unreachable host ({elapsed:.1f}s): {res.get('message')}")

    # 5. Database direct test: Register and retrieve SSH Node
    print("\n[5] Testing Database Persistence for SSH Nodes...")
    test_node_id = "test-node-lab01 (10.30.158.200)"
    database.register_ssh_node({
        "node_id": test_node_id,
        "hostname": "test-node-lab01",
        "ip": "10.30.158.200",
        "port": 22,
        "username": "labadmin",
        "auth_type": "password",
        "enc_secret": "EncryptedSecret123"
    })
    node_rec = database.get_ssh_node(test_node_id)
    assert node_rec is not None, "Failed to retrieve registered SSH node"
    assert node_rec["hostname"] == "test-node-lab01"
    assert node_rec["ip"] == "10.30.158.200"
    print(" [✓] SSH node registered in SQLite successfully.")

    # 6. Database software inventory for SSH Node
    print("\n[6] Testing Software Inventory Storage for SSH Node...")
    sample_software = [
        {"name": "python3", "version": "3.10.12-1", "package_manager": "dpkg", "category": "Development", "summary": "Python language"},
        {"name": "openssh-server", "version": "8.9p1-3", "package_manager": "dpkg", "category": "System", "summary": "SSH server"},
        {"name": "code", "version": "1.85.0", "package_manager": "snap", "category": "Development", "summary": "VS Code"}
    ]
    database.save_ssh_software(test_node_id, sample_software)
    saved_sw = database.get_ssh_software(test_node_id)
    assert len(saved_sw) == 3, f"Expected 3 packages, got {len(saved_sw)}"
    print(f" [✓] Successfully saved and retrieved {len(saved_sw)} software inventory records.")

    # 7. Test API: GET /api/ssh/nodes
    print("\n[7] Testing API: GET /api/ssh/nodes...")
    status, res = api_get("/api/ssh/nodes")
    assert status == 200
    assert "nodes" in res
    found = any(n["node_id"] == test_node_id for n in res["nodes"])
    assert found, "Test node not found in /api/ssh/nodes"
    # Ensure secrets are NOT leaked in response
    for n in res["nodes"]:
        assert "credential" not in n, "Security violation: credential leaked in API!"
        assert "password" not in n, "Security violation: password leaked in API!"
    print(" [✓] Sanitized SSH nodes list verified (no credentials leaked).")

    # 8. Test API: GET /api/software?node_id=...
    print("\n[8] Testing API: GET /api/software?node_id=...")
    status, res = api_get(f"/api/software?node_id={urllib.parse.quote(test_node_id)}")
    assert status == 200
    assert res.get("total_count") == 3
    assert len(res.get("packages", [])) == 3
    print(f" [✓] Node-specific software inventory retrieved successfully ({res['total_count']} packages).")

    # 9. Test API: POST /api/ssh/refresh
    print("\n[9] Testing API: POST /api/ssh/refresh...")
    status, res = api_post("/api/ssh/refresh", {"node_id": test_node_id})
    assert status == 200 or status == 500  # Will attempt SSH connection and handle connection error gracefully
    print(f" [✓] On-demand refresh endpoint responded: {res.get('status')} - {res.get('message')}")

    # 10. Test API: POST /api/ssh/remove
    print("\n[10] Testing API: POST /api/ssh/remove...")
    status, res = api_post("/api/ssh/remove", {"node_id": test_node_id})
    assert status == 200
    assert res.get("status") == "ok"
    node_after = database.get_ssh_node(test_node_id)
    assert node_after is None, "Node still exists in database after remove"
    print(" [✓] Node removed cleanly from database and fleet.")

    print("\n" + "=" * 60)
    print(" ALL 10 TESTS PASSED SUCCESSFULLY! ")
    print("=" * 60)

if __name__ == "__main__":
    import urllib.parse
    run_tests()
