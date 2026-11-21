import json, math

with open("data/geo/site_model.json", "r", encoding="utf-8") as f:
    s = json.load(f)

IDS = [
    "batiment.34015557", # S1 Principal
    "batiment.34015560", # S2 Sud
    "batiment.34015558", # S4 Pavillon
    "batiment.34015559", # S5 Annexe
    "batiment.11420630", # N1 Nord
    "batiment.26311892", # E1 Est inter
    "batiment.34015596", # E2 Grand Est
    "batiment.15317836", # E3 Sud-Est
    "batiment.34015597", # Cantine
    "batiment.15318032", # Periscolaire
]
all_b = {b["id"]: b for b in s["school_buildings"] + s["nearby_buildings"]}

for bid in IDS:
    b = all_b[bid]
    pts = b["pts"]
    # Find longest edge to get exact building orientation angle!
    best_len = 0
    best_ang = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        if L > best_len:
            best_len = L
            best_ang = math.degrees(math.atan2(dy, dx))
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{bid} | h={b['hauteur']} | c=({b['centroid'][0]:.1f},{b['centroid'][1]:.1f}) | ang={best_ang:6.1f}deg (L={best_len:.1f}m)")
    print(f"   pts = {[(round(p[0],1), round(p[1],1)) for p in pts]}")
