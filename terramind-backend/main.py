from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

# Allow your React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your React app
    allow_methods=["*"],
    allow_headers=["*"],
)

# This defines what data the frontend sends
class Coordinate(BaseModel):
    lat: str
    lng: str

class PolygonData(BaseModel):
    coordinates: List[Coordinate]

# Test endpoint — confirms backend is running
@app.get("/")
def root():
    return {"status": "TerraMind backend running"}

# Main endpoint — receives coordinates from the map
@app.post("/analyze")
def analyze(data: PolygonData):
    coords = data.coordinates
    
    # For now just return what we received
    # Next week this will call Google Earth Engine
    return {
        "message": "Coordinates received successfully",
        "vertex_count": len(coords),
        "first_point": {
            "lat": coords[0].lat,
            "lng": coords[0].lng
        },
        "status": "ready for GEE connection in week 3"
    }