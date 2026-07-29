#!/usr/bin/env python3
import os
import platform
import time
from pathlib import Path

import requests

API_URL = "https://uptime.phipi.io/api/report"
HOSTNAME = os.environ.get("UPTIME_HOSTNAME", platform.node()).strip().lower()
DEFAULT_KEY_FILES = (
    Path.home() / ".config" / "uptime-phipi-monitor" / "api-key",
    Path("/etc/uptime-phipi-monitor/api-key"),
)


def get_api_key() -> str:
    env_key = os.environ.get("UPTIME_API_KEY", "").strip()
    if env_key:
        return env_key

    key_file = os.environ.get("UPTIME_API_KEY_FILE", "").strip()
    if key_file:
        path = Path(key_file).expanduser()
        if path.exists():
            key = path.read_text(encoding="utf-8").strip()
            if key:
                return key

    for path in DEFAULT_KEY_FILES:
        if path.exists():
            key = path.read_text(encoding="utf-8").strip()
            if key:
                return key

    raise RuntimeError("Missing UPTIME_API_KEY or key file")


def get_uptime():
    with open('/proc/uptime') as f:
        return int(float(f.read().split()[0]))


def get_boot_time():
    return int(time.time() - get_uptime())


API_KEY = get_api_key()

while True:
    data = {
        "hostname": HOSTNAME,
        "uptime_seconds": get_uptime(),
        "boot_time": get_boot_time(),
        "kernel": platform.release(),
        "last_patch": "",
    }
    try:
        r = requests.post(API_URL, json=data, headers={"X-API-Key": API_KEY}, timeout=30)
        print(f"[{time.strftime('%H:%M:%S')}] {r.status_code} {r.json()}")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(300)  # Report every 5 minutes
