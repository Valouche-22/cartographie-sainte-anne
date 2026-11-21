import json
import math
import os
import ssl
import urllib.request
import urllib.parse

LAT0 = 48.5702417
LON0 = -2.8158111
METERS_PER_DEG_LAT = 111194.92664455873
METERS_PER_DEG_LON = METERS_PER_DEG_LAT * math.cos(math.radians(LAT0))

def to_local(lon, lat):
    return round((lon - LON0) * METERS_PER_DEG_LON, 2), round((lat - LAT0) * METERS_PER_DEG_LAT, 2)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(url, data=None, timeout=30):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "LPE-SainteAnne-Pordic-3D/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))

# Bounding box covering from Church (-230, +160) to beyond Stade Louis Auffray (+580, -260)
lon_min = LON0 - 250 / METERS_PER_DEG_LON
lon_max = LON0 + 600 / METERS_PER_DEG_LON
lat_min = LAT0 - 270 / METERS_PER_DEG_LAT
lat_max = LAT0 + 180 / METERS_PER_DEG_LAT
bbox = f"{lon_min:.6f},{lat_min:.6f},{lon_max:.6f},{lat_max:.6f},CRS:84"

# 1. IGN BD TOPO Terrains de sport
print("1. Fetching IGN BD TOPO terrains de sport...")
url_sport = (
    "https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature"
    f"&typeNames=BDTOPO_V3:terrain_de_sport&bbox={bbox}&outputFormat=application/json&srsName=CRS:84"
)
try:
    ts = fetch_json(url_sport)
    with open("data/geo/ign_terrains_sport.geojson", "w", encoding="utf-8") as f:
        json.dump(ts, f, ensure_ascii=False, indent=2)
    feats = ts.get("features", [])
    print(f"   IGN terrains_de_sport: {len(feats)}")
    for ft in feats:
        p = ft.get("properties", {})
        geom = ft["geometry"]
        gtype = geom["type"]
        if gtype == "Polygon":
            ring = geom["coordinates"][0]
        elif gtype == "MultiPolygon":
            ring = geom["coordinates"][0][0]
        else:
            continue
        pts = [to_local(c[0], c[1]) for c in ring]
        xs, ys = [q[0] for q in pts], [q[1] for q in pts]
        cx, cy = sum(xs)/len(xs), sum(ys)/len(ys)
        print(f"   SPORT {ft.get('id')}: nature={p.get('nature')}, det={p.get('nature_detaillee')}, c=({cx:.1f},{cy:.1f}), span=({max(xs)-min(xs):.1f}x{max(ys)-min(ys):.1f}m)")
except Exception as e:
    print("   IGN sport error:", e)

# 2. IGN BD TOPO Buildings around Stade Louis Auffray (extend East to +600m)
print("\n2. Fetching IGN BD TOPO buildings in East stadium zone...")
bbox_east = f"{LON0 + 250 / METERS_PER_DEG_LON:.6f},{lat_min:.6f},{lon_max:.6f},{LAT0 + 80 / METERS_PER_DEG_LAT:.6f},CRS:84"
url_eb = (
    "https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature"
    f"&typeNames=BDTOPO_V3:batiment&bbox={bbox_east}&outputFormat=application/json&srsName=CRS:84"
)
try:
    eb = fetch_json(url_eb)
    with open("data/geo/ign_stadium_batiments.geojson", "w", encoding="utf-8") as f:
        json.dump(eb, f, ensure_ascii=False, indent=2)
    feats = eb.get("features", [])
    print(f"   IGN stadium-zone buildings: {len(feats)}")
    for ft in feats:
        p = ft.get("properties", {})
        geom = ft["geometry"]
        ring = geom["coordinates"][0] if geom["type"] == "Polygon" else geom["coordinates"][0][0]
        pts = [to_local(c[0], c[1]) for c in ring]
        xs, ys = [q[0] for q in pts], [q[1] for q in pts]
        cx, cy = sum(xs)/len(xs), sum(ys)/len(ys)
        area_approx = (max(xs)-min(xs)) * (max(ys)-min(ys))
        if p.get("usage_1") == "Sportif" or area_approx > 200:
            print(f"   EBAT {ft.get('id')}: usage={p.get('usage_1')}, nat={p.get('nature')}, h={p.get('hauteur')}m, c=({cx:.1f},{cy:.1f}), span=({max(xs)-min(xs):.1f}x{max(ys)-min(ys):.1f}m)")
except Exception as e:
    print("   IGN east bat error:", e)

# 3. IGN BD TOPO Troncons de route (connecting Church -> School -> Stade Louis Auffray)
print("\n3. Fetching IGN BD TOPO roads connecting Church, School & Stadium...")
url_rd = (
    "https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature"
    f"&typeNames=BDTOPO_V3:troncon_de_route&bbox={bbox}&outputFormat=application/json&srsName=CRS:84"
)
try:
    rd = fetch_json(url_rd)
    with open("data/geo/ign_wide_roads.geojson", "w", encoding="utf-8") as f:
        json.dump(rd, f, ensure_ascii=False, indent=2)
    feats = rd.get("features", [])
    print(f"   IGN roads: {len(feats)}")
    names = sorted(set((f["properties"].get("nom_voie_ban_gauche") or f["properties"].get("nom_collaboratif_gauche") or "") for f in feats))
    print("   Key streets:", [n for n in names if any(k in n.lower() for k in ("coubertin", "école", "ecole", "sport", "église", "eglise", "fournier", "mairie", "place", "gabriel"))])
except Exception as e:
    print("   IGN roads error:", e)
