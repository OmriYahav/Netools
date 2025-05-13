from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, IPvAnyAddress, ValidationError
import socket
import requests
from pythonping import ping
from ipwhois import IPWhois
import ipaddress
import logging

# Logging
logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="IP Tools API",
    description="Check IPs, Ports, Geolocation, Ping, and WHOIS info",
    version="1.0.0"
)

# CORS settings — for production, change "*" to allowed domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g., ["https://your-frontend.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Validation helpers
# ----------------------------
def validate_ip(ip: str) -> str:
    try:
        return str(IPvAnyAddress(ip))
    except ValidationError:
        raise HTTPException(status_code=400, detail="Invalid IP address")

def validate_port(port: int) -> int:
    if not (1 <= port <= 65535):
        raise HTTPException(status_code=400, detail="Port must be between 1 and 65535")
    return port

# ----------------------------
# API Endpoints
# ----------------------------

@app.get("/check-port", tags=["Network Tools"])
def check_port(ip: str = Query(...), port: int = Query(...)):
    ip = validate_ip(ip)
    port = validate_port(port)
    try:
        with socket.create_connection((ip, port), timeout=3):
            return {"status": "open"}
    except socket.timeout:
        return {"status": "closed", "reason": "Connection to port timed out"}
    except socket.gaierror:
        return {"status": "error", "reason": "DNS resolution failed or host not found"}
    except ConnectionRefusedError:
        return {"status": "closed", "reason": "Connection refused by target host"}
    except Exception as e:
        logger.error(f"Port check failed for {ip}:{port}: {e}")
        return {"status": "error", "reason": f"Unhandled error: {str(e)}"}

@app.get("/ping", tags=["Network Tools"])
async def ping_host(ip: str = Query(...)):
    ip = validate_ip(ip)
    try:
        response = await run_in_threadpool(ping, ip, count=4, timeout=2)
        return {
            "reachable": response.success(),
            "avg_latency_ms": response.rtt_avg_ms
        }
    except Exception as e:
        logger.error(f"Ping failed for {ip}: {e}")
        raise HTTPException(status_code=504, detail=f"Ping failed: {str(e)}")

@app.get("/geolocate", tags=["IP Info"])
def geolocate(ip: str = Query(...)):
    ip = validate_ip(ip)
    try:
        res = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        res.raise_for_status()
        return res.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Geolocation request timed out")
    except Exception as e:
        logger.error(f"Geolocation failed for {ip}: {e}")
        raise HTTPException(status_code=502, detail=f"Geolocation failed: {str(e)}")

@app.get("/whois", tags=["IP Info"])
def whois_lookup(ip: str = Query(...)):
    ip = validate_ip(ip)

    # 🛡️ Skip WHOIS for private IPs
    if ipaddress.ip_address(ip).is_private:
        return {
            "error": "Private IPs do not have WHOIS information",
            "note": "RFC1918 addresses are reserved for internal use"
        }

    try:
        obj = IPWhois(ip)
        res = obj.lookup_rdap()

        emails = []

        # Defensive parsing of RDAP data
        for obj_data in res.get("objects", {}).values():
            contact = obj_data.get("contact", {})
            email_field = contact.get("email")

            # Email may be a list of dicts or None
            if isinstance(email_field, list):
                for email_obj in email_field:
                    email = email_obj.get("value") or email_obj.get("email")
                    if email:
                        emails.append(email)

        return {
            "asn": res.get("asn"),
            "network_name": res.get("network", {}).get("name", "N/A"),
            "org": res.get("objects", {}).get(list(res["objects"].keys())[0], {}).get("contact", {}).get("name", "N/A"),
            "country": res.get("network", {}).get("country", "N/A"),
            "emails": list(set(emails))
        }

    except Exception as e:
        logger.error(f"WHOIS lookup failed for {ip}: {e}")
        raise HTTPException(status_code=502, detail=f"WHOIS lookup failed: {str(e)}")

@app.get("/my-ip", tags=["Utility"])
def get_my_ip(request: Request):
    return {"your_ip": request.client.host}

# Optional if running with `python main.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
