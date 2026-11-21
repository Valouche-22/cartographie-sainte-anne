import json
import math

LAT0 = 48.5702417
LON0 = -2.8158111
METERS_PER_DEG_LAT = 111194.92664455873
METERS_PER_DEG_LON = METERS_PER_DEG_LAT * math.cos(math.radians(LAT0))

def to_local(lon, lat):
    return round((lon - LON0) * METERS_PER_DEG_LON, 2), round((lat - LAT0) * METERS_PER_DEG_LAT, 2)

def poly_pts(geom):
    ring = geom["coordinates"][0] if geom["type"] == "Polygon" else geom["coordinates"][0][0]
    pts = [to_local(c[0], c[1]) for c in ring]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts

def pca_axis(pts):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    sxx = sum((p[0] - cx) ** 2 for p in pts)
    syy = sum((p[1] - cy) ** 2 for p in pts)
    sxy = sum((p[0] - cx) * (p[1] - cy) for p in pts)
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux
    lu = [((p[0] - cx) * ux + (p[1] - cy) * uy) for p in pts]
    lv = [((p[0] - cx) * vx + (p[1] - cy) * vy) for p in pts]
    return cx, cy, math.degrees(ang), max(lu) - min(lu), max(lv) - min(lv), min(lu), max(lu)

# 1. Inspect Church
with open("data/geo/ign_bdtopo_wide.geojson", encoding="utf-8") as f:
    wide_b = json.load(f)["features"]

church = None
context_extra = []
for ft in wide_b:
    fid = ft.get("id")
    p = ft.get("properties", {})
    pts = poly_pts(ft["geometry"])
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    if fid == "batiment.34015442":
        cx, cy, ang, L, W, umin, umax = pca_axis(pts)
        # Ensure +u points East (towards apse), -u points West (towards bell tower)
        if math.cos(math.radians(ang)) < 0:
            ang += 180.0
            cx, cy, _, L, W, umin, umax = pca_axis(pts)
        rad = math.radians(ang)
        ux, uy = math.cos(rad), math.sin(rad)
        lu = [((q[0] - cx) * ux + (q[1] - cy) * uy) for q in pts]
        church = {
            "id": fid,
            "hauteur": p.get("hauteur") or 9.8,
            "centroid": [round(cx, 2), round(cy, 2)],
            "angle_deg": round(ang, 2),
            "length": round(max(lu) - min(lu), 2),
            "width": round(W, 2),
            "umin": round(min(lu), 2),
            "umax": round(max(lu), 2),
            "pts": pts,
        }
        print(f"CHURCH: c={church['centroid']}, ang={church['angle_deg']}deg, L={church['length']}m, W={church['width']}m, u=[{church['umin']},{church['umax']}]")
    else:
        # Keep surrounding town buildings between Church & School and around Church (within 110m of church)
        d_school = math.hypot(cx, cy)
        d_church = math.hypot(cx + 140.9, cy - 63.7)
        if d_school >= 85 and (d_church < 95 or (-160 < cx < 300 and -120 < cy < 110 and (p.get("hauteur") or 0) >= 3.5)):
            # Simplify polygon lightly if huge
            context_extra.append({
                "id": fid,
                "hauteur": p.get("hauteur") or 4.5,
                "usage": p.get("usage_1"),
                "centroid": [round(cx, 1), round(cy, 1)],
                "pts": pts,
            })

# 2. Inspect Stadium buildings & pitches
with open("data/geo/ign_stadium_batiments.geojson", encoding="utf-8") as f:
    eb_feats = json.load(f)["features"]

stadium_buildings = []
for ft in eb_feats:
    p = ft.get("properties", {})
    pts = poly_pts(ft["geometry"])
    cx, cy, ang, L, W, _, _ = pca_axis(pts)
    if p.get("usage_1") == "Sportif" or (295 < cx < 460 and -220 < cy < 30):
        stadium_buildings.append({
            "id": ft.get("id"),
            "usage": p.get("usage_1"),
            "hauteur": p.get("hauteur") or 5.0,
            "centroid": [round(cx, 2), round(cy, 2)],
            "angle_deg": round(ang, 2),
            "length": round(L, 2),
            "width": round(W, 2),
            "pts": pts,
        })
        print(f"STADIUM BLDG {ft.get('id')}: usage={p.get('usage_1')}, h={p.get('hauteur')}m, c=({cx:.1f},{cy:.1f}), L={L:.1f}xW={W:.1f}m, ang={ang:.1f}deg")

with open("data/geo/ign_terrains_sport.geojson", encoding="utf-8") as f:
    ts_feats = json.load(f)["features"]

sport_fields = []
for ft in ts_feats:
    p = ft.get("properties", {})
    pts = poly_pts(ft["geometry"])
    cx, cy, ang, L, W, _, _ = pca_axis(pts)
    sport_fields.append({
        "id": ft.get("id"),
        "nature": p.get("nature"),
        "detail": p.get("nature_detaillee"),
        "centroid": [round(cx, 2), round(cy, 2)],
        "angle_deg": round(ang, 2),
        "length": round(L, 2),
        "width": round(W, 2),
        "pts": pts,
    })
    print(f"FIELD {ft.get('id')}: {p.get('nature')} ({p.get('nature_detaillee')}), c=({cx:.1f},{cy:.1f}), L={L:.1f}xW={W:.1f}m, ang={ang:.1f}deg")

# 3. Inspect Rue Pierre de Coubertin & major roads
with open("data/geo/ign_wide_roads.geojson", encoding="utf-8") as f:
    rd_feats = json.load(f)["features"]

wide_roads = []
for ft in rd_feats:
    p = ft.get("properties", {})
    name = p.get("nom_voie_ban_gauche") or p.get("nom_collaboratif_gauche") or ""
    nat = p.get("nature") or ""
    geom = ft["geometry"]
    if geom["type"] == "LineString":
        lines = [geom["coordinates"]]
    elif geom["type"] == "MultiLineString":
        lines = geom["coordinates"]
    else:
        continue
    for line in lines:
        pts = [to_local(c[0], c[1]) for c in line]
        # Keep roads within our extended scene bounds: x in [-230, 500], y in [-310, 160]
        if any(-230 <= q[0] <= 500 and -310 <= q[1] <= 160 for q in pts):
            if nat not in ("Sentier", "Escalier"):
                wide_roads.append({"name": name, "nature": nat, "pts": pts})
                if "coubertin" in name.lower():
                    print(f"COUBERTIN ROAD: {pts[0]} -> {pts[-1]} ({len(pts)} pts)")

out = {
    "church": church,
    "stadium_buildings": stadium_buildings,
    "sport_fields": sport_fields,
    "wide_roads": wide_roads,
    "context_extra": context_extra[:140],  # Keep scene light for WebGL!
}
with open("data/geo/landmarks_model.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\nSaved data/geo/landmarks_model.json (context_extra={len(out['context_extra'])}, roads={len(wide_roads)})")
