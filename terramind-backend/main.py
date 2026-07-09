import ee
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

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
    start_date: str = "2024-01-01"
    end_date: str   = "2024-12-31"

# Dynamic World class definitions
DW_CLASSES = {
    0: {"name": "Water",              "color": "#378ADD"},
    1: {"name": "Trees (forest)",     "color": "#1D9E75"},
    2: {"name": "Grass",              "color": "#C9D96A"},
    3: {"name": "Flooded vegetation", "color": "#6AB8D4"},
    4: {"name": "Crops",              "color": "#E8C84A"},
    5: {"name": "Shrub & scrub",      "color": "#94C97A"},
    6: {"name": "Built-up (urban)",   "color": "#E87A4A"},
    7: {"name": "Bare soil",          "color": "#C8A882"},
    8: {"name": "Snow & ice",         "color": "#FFFFFF"},
}

@app.get("/")
def root():
    return {"status": "TerraMind backend running"}

@app.post("/analyze")
def analyze(data: PolygonData):
    try:
        print(f"Received dates: {data.start_date} to {data.end_date}")

        # Build geometry
        coords_list = [[float(c.lng), float(c.lat)] for c in data.coordinates]
        geometry = ee.Geometry.Polygon([coords_list])

        # ── NDVI from Sentinel-2 ─────────────────────────────
        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(data.start_date, data.end_date)
            .filterBounds(geometry)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
            .median()
            .clip(geometry)
        )

        ndvi  = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        # ── Land cover from Dynamic World ────────────────────
        dynamic_world = (
            ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
            .filterDate(data.start_date, data.end_date)
            .filterBounds(geometry)
            .select("label")
            .mode()
            .clip(geometry)
        )

        # Get histogram of all classes in one call
        histogram = dynamic_world.reduceRegion(
            reducer=ee.Reducer.frequencyHistogram(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo().get("label", {})

        # Calculate total pixels from histogram
        total_pixels = sum(histogram.values()) or 1

        # Build land cover result from histogram
        land_cover_result = []

        for class_value, class_info in DW_CLASSES.items():
            pixel_count = histogram.get(str(class_value), 0)
            percentage  = round((pixel_count / total_pixels) * 100, 1)

            if percentage > 0:
                land_cover_result.append({
                    "class_value": class_value,
                    "name":        class_info["name"],
                    "color":       class_info["color"],
                    "percentage":  percentage,
                })

        # Sort after loop finishes — NOT inside it
        land_cover_result.sort(key=lambda x: x["percentage"], reverse=True)

        # Area in hectares
        area_ha = round(geometry.area().getInfo() / 10000, 2)

        return {
            "message":      "Real satellite analysis complete",
            "vertex_count": len(data.coordinates),
            "ndvi_mean":    round(stats.get("NDVI", 0), 4),
            "area_ha":      area_ha,
            "date_range":   f"{data.start_date} to {data.end_date}",
            "land_cover":   land_cover_result,
            "status":       f"GEE queried: {data.start_date} to {data.end_date}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))