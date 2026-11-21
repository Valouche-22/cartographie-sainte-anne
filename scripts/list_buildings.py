import json
with open("data/geo/site_model.json", "r", encoding="utf-8") as f:
    s = json.load(f)

all_b = s["school_buildings"] + s["nearby_buildings"]
for i, b in enumerate(all_b):
    if b["dist"] > 72:
        continue
    xs = [p[0] for p in b["pts"]]
    ys = [p[1] for p in b["pts"]]
    print(f"{i:2d} | osm={str(b['in_school']):5s} | area={b['area']:6.1f} | h={str(b['hauteur']):4s} | c=({b['centroid'][0]:6.1f},{b['centroid'][1]:6.1f}) | x=[{min(xs):5.1f},{max(xs):5.1f}] y=[{min(ys):5.1f},{max(ys):5.1f}] | {b['id']}")
