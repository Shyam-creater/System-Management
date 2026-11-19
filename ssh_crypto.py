#!/usr/bin/env python3
"""
ProcessShield SSH Credential Vault & Cryptography Engine
Uses symmetric encryption (Fernet / AES-128-CBC + HMAC-SHA256) to securely
encrypt SSH passwords and private keys stored in the SQLite database.

Credentials are NEVER stored in plaintext.
The encryption key is stored in data/.ssh_vault.key with restricted 0600 permissions.
"""

import os
import stat
import base64
from cryptography.fernet import Fernet

VAULT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
KEY_FILE = os.path.join(VAULT_DIR, ".ssh_vault.key")

_fernet_instance = None

def _get_or_create_key() -> bytes:
    """Retrieves or creates the local master vault key with 0600 permissions."""
    os.makedirs(VAULT_DIR, exist_ok=True)
    if os.path.exists(KEY_FILE):
        try:
            with open(KEY_FILE, "rb") as f:
                key = f.read().strip()
                if key:
                    return key
        except Exception:
            pass

    # Generate new cryptographically secure key
    new_key = Fernet.generate_key()
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    mode = stat.S_IRUSR | stat.S_IWUSR  # 0600 permissions
    fd = os.open(KEY_FILE, flags, mode)
    with os.fdopen(fd, "wb") as f:
        f.write(new_key)
    return new_key

def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        key = _get_or_create_key()
        _fernet_instance = Fernet(key)
    return _fernet_instance

def encrypt_secret(plaintext: str) -> str:
    """
    Encrypts a plaintext string (password or private key text).
    Returns a URL-safe base64 encoded ciphertext string.
    """
    if not plaintext:
        return ""
    fernet = _get_fernet()
    token = fernet.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")

def decrypt_secret(ciphertext: str) -> str:
    """
    Decrypts a ciphertext string back to the original plaintext.
    Returns empty string if decryption fails or input is empty.
    """
    if not ciphertext:
        return ""
    fernet = _get_fernet()
    try:
        data = fernet.decrypt(ciphertext.encode("utf-8"))
        return data.decode("utf-8")
    except Exception as e:
        # Never log the secret content
        return ""
