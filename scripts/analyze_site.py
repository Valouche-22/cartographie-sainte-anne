import json
import math
import os

LAT0 = 48.5702417
LON0 = -2.8158111

# Local metric projection (tangent plane at LAT0, LON0)
METERS_PER_DEG_LAT = 111194.92664455873
METERS_PER_DEG_LON = METERS_PER_DEG_LAT * math.cos(math.radians(LAT0))

def to_local(lon, lat):
    x = (lon - LON0) * METERS_PER_DEG_LON
    y = (lat - LAT0) * METERS_PER_DEG_LAT
    return round(x, 3), round(y, 3)

def polygon_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) * 0.5

def polygon_centroid(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return sum(xs) / len(xs), sum(ys) / len(ys)

def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside

# Load OSM
with open("data/geo/osm_raw.json", "r", encoding="utf-8") as f:
    osm = json.load(f)

nodes = {el["id"]: (el["lon"], el["lat"]) for el in osm["elements"] if el["type"] == "node"}
ways = [el for el in osm["elements"] if el["type"] == "way"]

school_polys = []
roads = []
footways = []
barriers = []
leisures = []

for w in ways:
    tags = w.get("tags", {})
    pts = [to_local(*nodes[nid]) for nid in w.get("nodes", []) if nid in nodes]
    if len(pts) < 2:
        continue
    if tags.get("amenity") == "school" or "Sainte-Anne" in tags.get("name", ""):
        school_polys.append({"id": w["id"], "tags": tags, "pts": pts})
    elif "highway" in tags:
        hw = tags["highway"]
        if hw in ("footway", "path", "steps", "pedestrian"):
            footways.append({"id": w["id"], "tags": tags, "pts": pts})
        else:
            roads.append({"id": w["id"], "tags": tags, "pts": pts})
    elif "barrier" in tags:
        barriers.append({"id": w["id"], "tags": tags, "pts": pts})
    elif "leisure" in tags or "landuse" in tags:
        leisures.append({"id": w["id"], "tags": tags, "pts": pts})

print(f"=== OSM SCHOOL POLYGONS ({len(school_polys)}) ===")
for sp in school_polys:
    c = polygon_centroid(sp["pts"])
    a = polygon_area(sp["pts"])
    print(f"  Way {sp['id']}: tags={sp['tags']}, area={a:.1f}m2, centroid=({c[0]:.1f}, {c[1]:.1f})")

print(f"\n=== OSM ROADS NEARBY ({len(roads)}) ===")
for r in roads:
    name = r["tags"].get("name", "")
    hw = r["tags"].get("highway", "")
    min_d = min(math.hypot(p[0], p[1]) for p in r["pts"])
    if min_d < 90:
        print(f"  Way {r['id']}: {hw} '{name}', min_dist={min_d:.1f}m")

# Load IGN BD TOPO Batiments
with open("data/geo/ign_bdtopo_batiments.geojson", "r", encoding="utf-8") as f:
    bdtopo = json.load(f)

school_poly_pts = school_polys[0]["pts"] if school_polys else None

print("\n=== IGN BD TOPO BUILDINGS WITHIN 85m ===")
school_buildings = []
nearby_buildings = []

for feat in bdtopo.get("features", []):
    props = feat.get("properties", {})
    geom = feat.get("geometry", {})
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    rings = []
    if gtype == "Polygon":
        rings = [coords[0]]
    elif gtype == "MultiPolygon":
        rings = [poly[0] for poly in coords]
    if not rings:
        continue
    pts = [to_local(c[0], c[1]) for c in rings[0]]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    cx, cy = polygon_centroid(pts)
    dist = math.hypot(cx, cy)
    area = polygon_area(pts)
    in_school = point_in_poly(cx, cy, school_poly_pts) if school_poly_pts else (dist < 55)
    b_info = {
        "id": feat.get("id") or props.get("cleabs"),
        "usage_1": props.get("usage_1"),
        "usage_2": props.get("usage_2"),
        "nature": props.get("nature"),
        "hauteur": props.get("hauteur"),
        "nb_etages": props.get("nombre_d_etages"),
        "murs": props.get("materiaux_des_murs"),
        "toit": props.get("materiaux_de_la_toiture"),
        "z_sol": props.get("altitude_minimale_sol"),
        "z_toit": props.get("altitude_maximale_toit"),
        "centroid": [round(cx, 2), round(cy, 2)],
        "dist": round(dist, 1),
        "area": round(area, 1),
        "pts": pts,
        "in_school": in_school,
    }
    if in_school:
        school_buildings.append(b_info)
    elif dist < 90:
        nearby_buildings.append(b_info)

print(f"\n--- SCHOOL BUILDINGS ({len(school_buildings)}) ---")
for i, b in enumerate(sorted(school_buildings, key=lambda x: -x["area"]), 1):
    print(f"  S{i}: area={b['area']}m2, h={b['hauteur']}m, etages={b['nb_etages']}, "
          f"usage={b['usage_1']}, murs={b['murs']}, toit={b['toit']}, "
          f"center={b['centroid']}, dist={b['dist']}m")

print(f"\n--- NEARBY CONTEXT BUILDINGS (<90m) ({len(nearby_buildings)}) ---")
for b in sorted(nearby_buildings, key=lambda x: x["dist"])[:15]:
    print(f"  N: area={b['area']}m2, h={b['hauteur']}m, usage={b['usage_1']}, center={b['centroid']}, dist={b['dist']}m")

# Load IGN Cadastre Parcelles
with open("data/geo/ign_cadastre_parcelles.geojson", "r", encoding="utf-8") as f:
    cad = json.load(f)

school_parcelles = []
for feat in cad.get("features", []):
    props = feat.get("properties", {})
    geom = feat.get("geometry", {})
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        ring = coords[0]
    elif gtype == "MultiPolygon":
        ring = coords[0][0]
    else:
        continue
    pts = [to_local(c[0], c[1]) for c in ring]
    cx, cy = polygon_centroid(pts)
    if point_in_poly(0, 0, pts) or (school_poly_pts and point_in_poly(cx, cy, school_poly_pts)):
        school_parcelles.append({
            "section": props.get("section"),
            "numero": props.get("numero"),
            "contenance": props.get("contenance"),
            "pts": pts,
        })

print(f"\n=== SCHOOL CADASTRE PARCELLES ({len(school_parcelles)}) ===")
for p in school_parcelles:
    print(f"  Section {p['section']} n°{p['numero']} ({p['contenance']} m²)")

site_model = {
    "origin": {"lat": LAT0, "lon": LON0, "elevation_m": 104.39},
    "school_boundary": school_polys[0]["pts"] if school_polys else [],
    "school_tags": school_polys[0]["tags"] if school_polys else {},
    "school_parcelles": school_parcelles,
    "school_buildings": sorted(school_buildings, key=lambda x: -x["area"]),
    "nearby_buildings": [b for b in nearby_buildings if b["dist"] < 85],
    "roads": [r for r in roads if min(math.hypot(p[0], p[1]) for p in r["pts"]) < 95],
    "footways": [fw for fw in footways if min(math.hypot(p[0], p[1]) for p in fw["pts"]) < 90],
}
with open("data/geo/site_model.json", "w", encoding="utf-8") as f:
    json.dump(site_model, f, ensure_ascii=False, indent=2)
print("\nSaved data/geo/site_model.json")
