from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import socket
import requests
from pythonping import ping
from fastapi import Request

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/check-port")
def check_port(ip: str = Query(...), port: int = Query(...)):
    try:
        with socket.create_connection((ip, port), timeout=3):
            return {"status": "open"}
    except Exception:
        return {"status": "closed"}

@app.get("/ping")
def ping_host(ip: str = Query(...)):
    try:
        response = ping(ip, count=4, timeout=2)
        return {"reachable": response.success(), "avg_latency_ms": response.rtt_avg_ms}
    except Exception as e:
        return {"reachable": False, "error": str(e)}

@app.get("/geolocate")
def geolocate(ip: str = Query(...)):
    try:
        res = requests.get(f"http://ip-api.com/json/{ip}").json()
        return res
    except Exception as e:
        return {"error": str(e)}

@app.get("/my-ip")
def get_my_ip(request: Request):
    client_host = request.client.host
    return {"your_ip": client_host}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
