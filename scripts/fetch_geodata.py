import json
import os
import ssl
import urllib.request
import urllib.parse

os.makedirs("data/geo", exist_ok=True)

LAT = 48.5702417
LON = -2.8158111

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(url, data=None, headers=None, timeout=30):
    req = urllib.request.Request(url, data=data, headers=headers or {"User-Agent": "LPE-SainteAnne-Pordic-3D/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))

# 1. OpenStreetMap Overpass API (radius 150m)
print("1. Fetching OpenStreetMap Overpass data...")
overpass_query = f"""
[out:json][timeout:25];
(
  node(around:150,{LAT},{LON});
  way(around:150,{LAT},{LON});
  relation(around:150,{LAT},{LON});
);
out body;
>;
out skel qt;
"""
try:
    osm_data = fetch_json(
        "https://overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": overpass_query}).encode("utf-8"),
    )
    with open("data/geo/osm_raw.json", "w", encoding="utf-8") as f:
        json.dump(osm_data, f, ensure_ascii=False, indent=2)
    print(f"   OSM elements: {len(osm_data.get('elements', []))}")
except Exception as e:
    print(f"   OSM error: {e}")

# 2. IGN Géoplateforme WFS - BD TOPO Batiment (lon,lat,lon,lat,CRS:84)
print("2. Fetching IGN BD TOPO Batiments (WFS)...")
dlat = 0.0012
dlon = 0.0018
bbox_lonlat = f"{LON - dlon},{LAT - dlat},{LON + dlon},{LAT + dlat},CRS:84"
wfs_url = (
    "https://data.geopf.fr/wfs/ows?"
    "service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=BDTOPO_V3:batiment"
    f"&bbox={bbox_lonlat}"
    "&outputFormat=application/json"
    "&srsName=CRS:84"
)
try:
    bdtopo_data = fetch_json(wfs_url)
    with open("data/geo/ign_bdtopo_batiments.geojson", "w", encoding="utf-8") as f:
        json.dump(bdtopo_data, f, ensure_ascii=False, indent=2)
    print(f"   IGN BD TOPO batiments: {len(bdtopo_data.get('features', []))}")
except Exception as e:
    print(f"   IGN BD TOPO error: {e}")

# 3. IGN Géoplateforme WFS - Cadastre Parcelles
print("3. Fetching IGN Cadastre Parcelles (WFS)...")
cad_url = (
    "https://data.geopf.fr/wfs/ows?"
    "service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle"
    f"&bbox={bbox_lonlat}"
    "&outputFormat=application/json"
    "&srsName=CRS:84"
)
try:
    cad_data = fetch_json(cad_url)
    with open("data/geo/ign_cadastre_parcelles.geojson", "w", encoding="utf-8") as f:
        json.dump(cad_data, f, ensure_ascii=False, indent=2)
    print(f"   IGN Cadastre parcelles: {len(cad_data.get('features', []))}")
except Exception as e:
    print(f"   IGN Cadastre error: {e}")
