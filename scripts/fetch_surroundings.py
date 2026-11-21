import json
import math
import os
import ssl
import urllib.request
import urllib.parse

os.makedirs("data/geo", exist_ok=True)

LAT0 = 48.5702417
LON0 = -2.8158111
METERS_PER_DEG_LAT = 111194.92664455873
METERS_PER_DEG_LON = METERS_PER_DEG_LAT * math.cos(math.radians(LAT0))

def to_local(lon, lat):
    return round((lon - LON0) * METERS_PER_DEG_LON, 2), round((lat - LAT0) * METERS_PER_DEG_LAT, 2)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(url, data=None, timeout=45):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "LPE-SainteAnne-Pordic-3D/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))

# 1. Targeted Overpass query (radius 800m): church, sports pitches/stadium, Rue Pierre de Coubertin, main roads
print("1. Fetching OSM surroundings (church, Stade Louis Auffray, roads)...")
q = f"""
[out:json][timeout:35];
(
  way(around:850,{LAT0},{LON0})["amenity"="place_of_worship"];
  way(around:850,{LAT0},{LON0})["building"="church"];
  relation(around:850,{LAT0},{LON0})["amenity"="place_of_worship"];
  way(around:850,{LAT0},{LON0})["leisure"~"pitch|stadium|sports_centre|track"];
  relation(around:850,{LAT0},{LON0})["leisure"~"pitch|stadium|sports_centre|track"];
  node(around:850,{LAT0},{LON0})["name"~"Auffray|Coubertin|Saint-Pierre|Église|Eglise",i];
  way(around:850,{LAT0},{LON0})["name"~"Auffray|Coubertin|Saint-Pierre|Église|Eglise",i];
  way(around:550,{LAT0},{LON0})["highway"~"residential|secondary|tertiary|unclassified|service|living_street"];
);
out body;
>;
out skel qt;
"""
try:
    osm = fetch_json("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode("utf-8"))
    with open("data/geo/osm_surroundings.json", "w", encoding="utf-8") as f:
        json.dump(osm, f, ensure_ascii=False, indent=2)
    nodes = {e["id"]: (e["lon"], e["lat"]) for e in osm["elements"] if e["type"] == "node"}
    print(f"   OSM elements: {len(osm['elements'])}")
    for e in osm["elements"]:
        tags = e.get("tags", {})
        if not tags or "highway" in tags and "Coubertin" not in tags.get("name", ""):
            continue
        if e["type"] == "way":
            pts = [to_local(*nodes[nid]) for nid in e.get("nodes", []) if nid in nodes]
            if pts:
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                print(f"   WAY {e['id']}: c=({cx:.1f},{cy:.1f}) span=({max(xs)-min(xs):.1f}x{max(ys)-min(ys):.1f}m) tags={tags}")
        elif e["type"] == "node" and tags:
            x, y = to_local(e["lon"], e["lat"])
            print(f"   NODE {e['id']}: ({x:.1f},{y:.1f}) tags={tags}")
except Exception as ex:
    print(f"   OSM error: {ex}")

# 2. IGN BD TOPO Batiments in wider bbox (covering church & stadium ~600m)
print("\n2. Fetching IGN BD TOPO wider buildings...")
dlat = 0.0045  # ~500m
dlon = 0.0075  # ~550m
bbox_lonlat = f"{LON0 - dlon},{LAT0 - dlat},{LON0 + dlon},{LAT0 + dlat},CRS:84"
wfs_url = (
    "https://data.geopf.fr/wfs/ows?"
    "service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=BDTOPO_V3:batiment"
    f"&bbox={bbox_lonlat}"
    "&outputFormat=application/json"
    "&srsName=CRS:84"
)
try:
    bdt = fetch_json(wfs_url)
    with open("data/geo/ign_bdtopo_wide.geojson", "w", encoding="utf-8") as f:
        json.dump(bdt, f, ensure_ascii=False, indent=2)
    feats = bdt.get("features", [])
    print(f"   IGN wide buildings: {len(feats)}")
    for ft in feats:
        p = ft.get("properties", {})
        u1 = p.get("usage_1") or ""
        nat = p.get("nature") or ""
        h = p.get("hauteur") or 0
        if "Religieux" in u1 or "Sportif" in u1 or "Église" in nat or "Eglise" in nat or "Tribune" in nat or (h and h >= 12):
            geom = ft["geometry"]
            ring = geom["coordinates"][0] if geom["type"] == "Polygon" else geom["coordinates"][0][0]
            pts = [to_local(c[0], c[1]) for c in ring]
            cx = sum(pt[0] for pt in pts) / len(pts)
            cy = sum(pt[1] for pt in pts) / len(pts)
            print(f"   IGN {ft.get('id')}: usage={u1}, nature={nat}, h={h}m, c=({cx:.1f},{cy:.1f}), n_pts={len(pts)}")
except Exception as ex:
    print(f"   IGN error: {ex}")
