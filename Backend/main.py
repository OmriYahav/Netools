from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, IPvAnyAddress, ValidationError
import socket
import requests
from pythonping import ping
from ipwhois import IPWhois
import socket

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_ip(ip: str):
    try:
        return str(IPvAnyAddress(ip))
    except ValidationError:
        raise HTTPException(status_code=400, detail="Invalid IP address")

def validate_port(port: int):
    if not (1 <= port <= 65535):
        raise HTTPException(status_code=400, detail="Port must be between 1 and 65535")
    return port

@app.get("/check-port")
def check_port(ip: str = Query(...), port: int = Query(...)):
    ip = validate_ip(ip)
    port = validate_port(port)
    try:
        with socket.create_connection((ip, port), timeout=3):
            return {"status": "open"}
    except socket.timeout:
        raise HTTPException(status_code=504, detail="Connection to port timed out")
    except socket.gaierror:
        raise HTTPException(status_code=502, detail="DNS resolution failed or host not found")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Connection failed: {str(e)}")

@app.get("/ping")
def ping_host(ip: str = Query(...)):
    ip = validate_ip(ip)
    try:
        response = ping(ip, count=4, timeout=2)
        return {
            "reachable": response.success(),
            "avg_latency_ms": response.rtt_avg_ms
        }
    except Exception as e:
        raise HTTPException(status_code=504, detail=f"Ping failed: {str(e)}")

@app.get("/geolocate")
def geolocate(ip: str = Query(...)):
    ip = validate_ip(ip)
    try:
        res = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        res.raise_for_status()
        return res.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Geolocation request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geolocation failed: {str(e)}")

@app.get("/whois")
def whois_lookup(ip: str = Query(...)):
    ip = validate_ip(ip)
    try:
        obj = IPWhois(ip)
        res = obj.lookup_rdap()
        return {
            "asn": res.get("asn"),
            "network_name": res.get("network", {}).get("name"),
            "org": res.get("objects", {}).get(list(res["objects"].keys())[0], {}).get("contact", {}).get("name", "N/A"),
            "country": res.get("network", {}).get("country", "N/A"),
            "emails": list(set(
                v.get("email") for obj in res["objects"].values()
                for v in obj.get("contact", {}).get("email", []) if v.get("email")
            )),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WHOIS lookup failed: {str(e)}")

@app.get("/my-ip")
def get_my_ip(request: Request):
    return {"your_ip": request.client.host}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
