import ee
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Initialize Earth Engine with your project
ee.Initialize(project="terramind-500019")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Coordinate(BaseModel):
    lat: str
    lng: str

class PolygonData(BaseModel):
    coordinates: List[Coordinate]

@app.get("/")
def root():
    return {"status": "TerraMind backend running"}

@app.post("/analyze")
def analyze(data: PolygonData):
    try:
        # Convert coordinates to [lng, lat] format GEE expects
        coords_list = [[float(c.lng), float(c.lat)] for c in data.coordinates]

        # Build the polygon
        geometry = ee.Geometry.Polygon([coords_list])

        # Get cloud-free Sentinel-2 imagery for 2024
        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate("2024-01-01", "2024-12-31")
            .filterBounds(geometry)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
            .median()
            .clip(geometry)
        )

        # Calculate NDVI
        ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")

        # Get mean NDVI over the polygon
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        # Calculate area in hectares
        area_ha = round(geometry.area().getInfo() / 10000, 2)

        return {
            "message": "Real satellite analysis complete",
            "vertex_count": len(data.coordinates),
            "ndvi_mean": round(stats.get("NDVI", 0), 4),
            "area_ha": area_ha,
            "status": "connected to Google Earth Engine"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))