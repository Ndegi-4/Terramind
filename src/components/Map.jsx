import { useState, useEffect } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"
import "@geoman-io/leaflet-geoman-free"
import L from "leaflet"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const BASEMAPS = {
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  },
  light: {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
}

function DrawingTools({ onPolygonDrawn }) {
  const map = useMap()

  useEffect(() => {
    if (!map.pm) return

    map.pm.addControls({
      position:         "topleft",
      drawMarker:       false,
      drawCircle:       false,
      drawCircleMarker: false,
      drawPolyline:     false,
      drawRectangle:    false,
      drawPolygon:      true,
      editMode:         true,
      dragMode:         false,
      cutPolygon:       false,
      removalMode:      true,
    })

    map.pm.setGlobalOptions({
      pathOptions: {
        color:       "#1D9E75",
        fillColor:   "#1D9E75",
        fillOpacity: 0.15,
        weight:      2,
      },
    })

    map.on("pm:create", (e) => {
      const points = e.layer.getLatLngs()[0]
      const coords = points.map((p) => ({
        lat: p.lat.toFixed(5),
        lng: p.lng.toFixed(5),
      }))
      onPolygonDrawn(coords)
    })

    map.on("pm:remove", () => {
      onPolygonDrawn([])
    })

    return () => {
      map.pm.removeControls()
      map.off("pm:create")
      map.off("pm:remove")
    }
  }, [map, onPolygonDrawn])

  return null
}

export default function Map() {
  const [activeLayer, setActiveLayer] = useState("dark")
  const [coords, setCoords] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    if (coords.length === 0) return
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coords })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ message: "Backend connection failed", error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* SIDEBAR */}
      <div style={{
        width: "280px",
        background: "#0d1420",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        fontFamily: "monospace",
        color: "#e8edf3",
        flexShrink: 0,
        overflowY: "auto",
      }}>

        <div style={{ fontSize: "20px", fontWeight: 700 }}>
          Terra<span style={{ color: "#1D9E75" }}>Mind</span>
        </div>

        <div style={{ fontSize: "11px", color: "#6b7a8d", letterSpacing: "0.08em" }}>
          WEEK 2 - BACKEND CONNECTION
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

        {/* Basemap switcher */}
        <div>
          <div style={{ fontSize: "11px", color: "#6b7a8d", marginBottom: "10px" }}>
            // BASEMAP
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(BASEMAPS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key)}
                style={{
                  background: activeLayer === key ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.03)",
                  border: activeLayer === key ? "1px solid rgba(29,158,117,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: activeLayer === key ? "#1D9E75" : "#6b7a8d",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                }}
              >
                <span style={{
                  width: "10px", height: "10px",
                  borderRadius: "50%",
                  background: key === "dark" ? "#333" : key === "light" ? "#ccc" : "#4a7c59",
                  border: "1px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }} />
                {layer.name}
                {activeLayer === key && (
                  <span style={{ marginLeft: "auto" }}>on</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

        {/* Instructions */}
        <div>
          <div style={{ fontSize: "11px", color: "#6b7a8d", marginBottom: "10px" }}>
            // HOW TO DRAW
          </div>
          <div style={{ fontSize: "12px", color: "#6b7a8d", lineHeight: 1.9 }}>
            1. Click the polygon tool<br />
            2. Click points on the map<br />
            3. Click first point to close<br />
            4. Click "analyze area" below
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

        {/* Coordinates */}
        <div>
          <div style={{ fontSize: "11px", color: "#6b7a8d", marginBottom: "10px" }}>
            // COORDINATES
          </div>

          {coords.length === 0 ? (
            <div style={{
              fontSize: "12px", color: "#6b7a8d",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px", padding: "16px",
              textAlign: "center", lineHeight: 1.8,
            }}>
              Draw a polygon on the<br />map to see coordinates
            </div>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(29,158,117,0.3)",
              borderRadius: "8px", padding: "12px",
              display: "flex", flexDirection: "column", gap: "6px",
            }}>
              <div style={{ fontSize: "12px", color: "#1D9E75", marginBottom: "4px" }}>
                {coords.length} vertices captured
              </div>
              {coords.map((c, i) => (
                <div key={i} style={{
                  fontSize: "11px", background: "#080c10",
                  borderRadius: "4px", padding: "6px 8px",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ color: "#1D9E75" }}>[{i}]</span>
                  <span>{c.lat}, {c.lng}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || coords.length === 0}
          style={{
            width: "100%",
            background: loading ? "#0f3d2e" : coords.length === 0 ? "rgba(255,255,255,0.05)" : "#1D9E75",
            color: loading ? "#3a7a60" : coords.length === 0 ? "#6b7a8d" : "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "13px",
            fontFamily: "monospace",
            cursor: (loading || coords.length === 0) ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "analyzing..." : "analyze area"}
        </button>

        {/* Result from backend */}
        {result && (
          <div style={{
            background: "#080c10",
            border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "11px",
            color: "#6b7a8d",
            lineHeight: 1.8,
          }}>
            <div style={{ color: "#1D9E75", marginBottom: "6px" }}>
              backend response
            </div>
            <div>{result.message}</div>
{result.vertex_count && <div>vertices: {result.vertex_count}</div>}
{result.ndvi_mean !== undefined && (
  <div style={{ color: "#1D9E75", marginTop: "4px" }}>
    NDVI: {result.ndvi_mean}
  </div>
)}
{result.area_ha !== undefined && (
  <div>area: {result.area_ha} ha</div>
)}
            {result.status && (
              <div style={{ color: "#534AB7", marginTop: "6px" }}>
                {result.status}
              </div>
            )}
            {result.error && (
              <div style={{ color: "#E24B4A", marginTop: "6px" }}>
                {result.error}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MAP */}
      <MapContainer
        center={[0.0236, 37.9062]}
        zoom={7}
        style={{ flex: 1, height: "100%" }}
      >
        <TileLayer
          key={activeLayer}
          url={BASEMAPS[activeLayer].url}
          attribution="© OpenStreetMap contributors © CARTO"
        />
        <DrawingTools onPolygonDrawn={setCoords} />
      </MapContainer>

    </div>
  )
}