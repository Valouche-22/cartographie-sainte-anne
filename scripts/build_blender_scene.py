import bpy
import bmesh
import json
import math
import os
from mathutils import Vector

# Toggle to easily enable/disable initiative extra details (zebra crossings, Y-motif NW, lampposts, etc.)
INCLUDE_EXTRA_DETAILS = True

# Paths
BASE_DIR = r"c:\Users\valen\Desktop\LPE"
SITE_JSON = os.path.join(BASE_DIR, "data", "geo", "site_model.json")
LANDMARKS_JSON = os.path.join(BASE_DIR, "data", "geo", "landmarks_model.json")
BLEND_OUT = os.path.join(BASE_DIR, "ecole_sainte_anne.blend")
GLB_OUT_ROOT = os.path.join(BASE_DIR, "ecole_sainte_anne.glb")
GLB_OUT_WEB = os.path.join(BASE_DIR, "web", "public", "models", "ecole_sainte_anne.glb")
RENDER_DIR = os.path.join(BASE_DIR, "renders")
os.makedirs(os.path.dirname(GLB_OUT_WEB), exist_ok=True)
os.makedirs(RENDER_DIR, exist_ok=True)

with open(SITE_JSON, "r", encoding="utf-8") as f:
    site = json.load(f)
with open(LANDMARKS_JSON, "r", encoding="utf-8") as f:
    landmarks = json.load(f)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

COL_NAMES = [
    "TERRAIN", "BATIMENTS", "CLASSES", "CANTINE",
    "PERISCOLAIRE", "COURS", "VEGETATION", "MOBILIER", "SIGNALISATION",
    "EGLISE_PORDIC", "STADE_LOUIS_AUFFRAY"
]
cols = {}
for name in COL_NAMES:
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    cols[name] = c

def link_obj(obj, col_name):
    cols[col_name].objects.link(obj)
    return obj

mats = {}
def get_mat(name, color, roughness=0.75, metallic=0.0):
    if name in mats:
        return mats[name]
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        bsdf = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    mats[name] = m
    return m

# Palette
MAT_GROUND = get_mat("Sol_Contexte", (0.76, 0.77, 0.74), roughness=0.92)
MAT_GRASS = get_mat("Herbe_Pelouse", (0.30, 0.43, 0.22), roughness=0.92)
MAT_GRAVEL = get_mat("Gravillons_Arbre", (0.74, 0.71, 0.65), roughness=0.94)
MAT_CURB = get_mat("Bordure_Beton", (0.64, 0.64, 0.62), roughness=0.86)
MAT_COUR = get_mat("Cour_Enrobe", (0.44, 0.45, 0.47), roughness=0.88)
MAT_COUR_EST = get_mat("Cour_Est_Sable", (0.65, 0.60, 0.53), roughness=0.90)
MAT_PREAU_SOL = get_mat("Sol_Preau_Beton", (0.55, 0.54, 0.52), roughness=0.85)
MAT_PARKING = get_mat("Parking_Asphalte", (0.36, 0.37, 0.39), roughness=0.86)
MAT_LINE_WHITE = get_mat("Marquage_Blanc", (0.95, 0.95, 0.93), roughness=0.58)
MAT_PLAY_RED = get_mat("Sol_Souple_Rouge", (0.68, 0.20, 0.19), roughness=0.82)
MAT_PLAY_YELLOW = get_mat("Jeu_Jaune", (0.90, 0.72, 0.18), roughness=0.50)
MAT_PLAY_BLUE = get_mat("Jeu_Bleu", (0.20, 0.48, 0.78), roughness=0.50)
MAT_PINGPONG = get_mat("Table_PingPong", (0.18, 0.44, 0.30), roughness=0.55)
MAT_ROAD = get_mat("Route_Asphalte", (0.27, 0.28, 0.30), roughness=0.85)

MAT_WALL_WHITE = get_mat("Facade_Enduit_Clair", (0.91, 0.90, 0.87), roughness=0.82)
MAT_WALL_CREAM = get_mat("Facade_Creme", (0.87, 0.84, 0.77), roughness=0.84)
MAT_WALL_SHED = get_mat("Facade_Cabanon_Beige", (0.85, 0.80, 0.70), roughness=0.82)
MAT_WALL_STONE = get_mat("Facade_Pierre_Grise", (0.68, 0.65, 0.60), roughness=0.88)
MAT_WALL_CANTINE = get_mat("Facade_Cantine", (0.86, 0.86, 0.85), roughness=0.78)
MAT_WALL_CANTINE_ACCENT = get_mat("Bandeau_Cantine_Bordeaux", (0.42, 0.14, 0.24), roughness=0.55)
MAT_WALL_PERI = get_mat("Facade_Periscolaire", (0.89, 0.90, 0.91), roughness=0.78)
MAT_WALL_BASE = get_mat("Soubassement_Gris", (0.48, 0.48, 0.47), roughness=0.88)
MAT_WALL_CONTEXT = get_mat("Contexte_Voisin", (0.82, 0.82, 0.80), roughness=0.90)

MAT_ROOF_FLAT_DARK = get_mat("Toit_Plat_Bitume", (0.15, 0.16, 0.18), roughness=0.78)
MAT_ROOF_FLAT_LIGHT = get_mat("Toit_Plat_Clair", (0.84, 0.82, 0.77), roughness=0.72)
MAT_ROOF_SHED = get_mat("Toit_Cabanon_Sable", (0.82, 0.76, 0.64), roughness=0.78)
MAT_ROOF_METAL = get_mat("Toit_Bac_Acier_Preau", (0.42, 0.48, 0.54), roughness=0.45, metallic=0.35)
MAT_ROOF_CANTINE_1 = get_mat("Toit_Cantine_Clair", (0.74, 0.73, 0.70), roughness=0.50, metallic=0.25)
MAT_ROOF_CANTINE_2 = get_mat("Toit_Cantine_Gris", (0.42, 0.44, 0.47), roughness=0.50, metallic=0.30)
MAT_ROOF_PERI = get_mat("Toit_Periscolaire_Zinc", (0.66, 0.69, 0.71), roughness=0.45, metallic=0.30)
MAT_ROOF_SLATE = get_mat("Toit_Ardoise_Bretonne", (0.17, 0.19, 0.23), roughness=0.62)
MAT_ROOF_ZINC = get_mat("Toit_Zinc_Clair", (0.68, 0.72, 0.68), roughness=0.42, metallic=0.35)
MAT_ROOF_CONTEXT = get_mat("Toit_Voisin", (0.56, 0.58, 0.60), roughness=0.85)

MAT_SKYLIGHT = get_mat("Lanterneau_Blanc", (0.91, 0.94, 0.97), roughness=0.18, metallic=0.10)
MAT_HVAC = get_mat("Equipement_Toit_Inox", (0.70, 0.72, 0.74), roughness=0.35, metallic=0.65)
MAT_WINDOW = get_mat("Vitrage_Fenetre", (0.15, 0.23, 0.34), roughness=0.08, metallic=0.28)
MAT_FRAME = get_mat("Menuiserie_Blanche", (0.94, 0.94, 0.92), roughness=0.42)

MAT_WOOD = get_mat("Bois_Banc", (0.48, 0.31, 0.17), roughness=0.72)
MAT_METAL_DARK = get_mat("Metal_Fonce", (0.22, 0.24, 0.27), roughness=0.42, metallic=0.62)
MAT_MESH_FENCE = get_mat("Grillage_Cour", (0.24, 0.33, 0.28), roughness=0.45, metallic=0.55)
MAT_GATE = get_mat("Portail_Bleu_Ardoise", (0.16, 0.28, 0.40), roughness=0.40, metallic=0.55)
MAT_PILLAR = get_mat("Pilier_Pierre", (0.78, 0.76, 0.72), roughness=0.82)
MAT_METAL_GOAL = get_mat("Metal_Buts_Blanc", (0.92, 0.93, 0.94), roughness=0.32, metallic=0.55)
MAT_TRUNK = get_mat("Tronc_Arbre", (0.27, 0.19, 0.12), roughness=0.92)
MAT_FOLIAGE_DARK = get_mat("Feuillage_Fonce", (0.10, 0.22, 0.13), roughness=0.88)
MAT_FOLIAGE_MID = get_mat("Feuillage_Moyen", (0.15, 0.30, 0.16), roughness=0.86)
MAT_FOLIAGE_LIGHT = get_mat("Feuillage_Clair", (0.21, 0.37, 0.19), roughness=0.85)
MAT_WALL_FENCE = get_mat("Muret_Cloture", (0.58, 0.56, 0.53), roughness=0.88)
MAT_SIGN = get_mat("Panneau_Ecole", (0.12, 0.28, 0.48), roughness=0.35)
MAT_LAMP_GLOW = get_mat("Luminaire_Verre", (0.96, 0.95, 0.88), roughness=0.15)
# Church & Stadium materials
MAT_GRANITE = get_mat("Granite_IleGrande", (0.76, 0.73, 0.67), roughness=0.86)
MAT_GRANITE_DARK = get_mat("Granite_Ombre", (0.56, 0.54, 0.50), roughness=0.88)
MAT_CHURCH_TRIM = get_mat("Granite_Taille_Clair", (0.84, 0.81, 0.74), roughness=0.80)
MAT_CHURCH_SPIRE = get_mat("Fleche_Granite_Clair", (0.81, 0.78, 0.72), roughness=0.82)
MAT_CHURCH_SLATE = get_mat("Ardoise_Eglise", (0.16, 0.19, 0.24), roughness=0.56)
MAT_CHURCH_RIDGE = get_mat("Faitage_Zinc_Eglise", (0.64, 0.67, 0.70), roughness=0.42, metallic=0.38)
MAT_CHURCH_GLASS = get_mat("Vitrail_Eglise", (0.12, 0.19, 0.32), roughness=0.14, metallic=0.25)
MAT_CHURCH_WOOD = get_mat("Portail_Chene_Eglise", (0.24, 0.15, 0.09), roughness=0.78)
MAT_CHURCH_CLOCK = get_mat("Cadran_Horloge_Eglise", (0.92, 0.90, 0.84), roughness=0.40)
MAT_PARVIS = get_mat("Parvis_Pave", (0.78, 0.74, 0.66), roughness=0.86)
MAT_PARVIS_ACCENT = get_mat("Parvis_Pave_Ocre", (0.70, 0.62, 0.51), roughness=0.86)
MAT_GARDEN_SOIL = get_mat("Terre_Jardiniere", (0.23, 0.18, 0.13), roughness=0.95)
MAT_FLOWER_ROSE = get_mat("Massif_Fleurs_Rose", (0.68, 0.25, 0.30), roughness=0.82)
MAT_FLOWER_GOLD = get_mat("Massif_Fleurs_Or", (0.78, 0.63, 0.22), roughness=0.82)
MAT_FOLIAGE_OLIVE = get_mat("Feuillage_Olive", (0.31, 0.38, 0.16), roughness=0.86)
MAT_PITCH_DARK = get_mat("Gazon_Stade_Fonce", (0.24, 0.42, 0.20), roughness=0.90)
MAT_PITCH_LIGHT = get_mat("Gazon_Stade_Clair", (0.34, 0.46, 0.25), roughness=0.90)
MAT_PRAIRIE_SEC = get_mat("Prairie_Herbe_Seche", (0.48, 0.49, 0.34), roughness=0.94)
MAT_TERRE_BATTUE = get_mat("Terre_Battue_Claire", (0.72, 0.67, 0.58), roughness=0.92)
MAT_TRACK_SAND = get_mat("Piste_Stabilise_Beige", (0.74, 0.70, 0.63), roughness=0.90)
MAT_PUMPTRACK = get_mat("Pumptrack_Enrobe", (0.20, 0.21, 0.23), roughness=0.82)
MAT_SKATEPARK = get_mat("Skatepark_Beton", (0.32, 0.34, 0.36), roughness=0.80)
MAT_SKATE_RAMP = get_mat("Skatepark_Module", (0.78, 0.79, 0.80), roughness=0.60)
MAT_TENNIS_GREEN = get_mat("Tennis_Contour_Vert", (0.26, 0.52, 0.34), roughness=0.84)
MAT_TENNIS_BLUE = get_mat("Tennis_Court_Bleu", (0.24, 0.44, 0.62), roughness=0.80)
MAT_DOME_WHITE = get_mat("Bulle_Tennis_Blanche", (0.93, 0.93, 0.90), roughness=0.55)
MAT_DOME_TEAL = get_mat("Bulle_Tennis_BleuVert", (0.14, 0.42, 0.45), roughness=0.55)
MAT_SPORT_WALL = get_mat("Complexe_Sportif_Bardage", (0.86, 0.87, 0.88), roughness=0.68)
MAT_SPORT_ACCENT = get_mat("Complexe_Sportif_Bleu", (0.18, 0.34, 0.52), roughness=0.55)
MAT_SPORT_ROOF = get_mat("Complexe_Sportif_Toit_GrisBleu", (0.44, 0.49, 0.55), roughness=0.48, metallic=0.35)
MAT_ARCHERY_ROOF = get_mat("Archers_Toit_Ardoise", (0.28, 0.34, 0.40), roughness=0.52, metallic=0.30)

GRID_DEG = 20.5

def rot_rect(cx, cy, lx, ly, deg):
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    hw, hh = lx / 2.0, ly / 2.0
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c) for dx, dy in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]]

def local_to_world(cx, cy, lx, ly, deg):
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    return (cx + lx * c - ly * s, cy + lx * s + ly * c)

def create_poly_mesh(name, pts, z0, z1, mat, col_name):
    if len(pts) < 3:
        return None
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, col_name)
    bm = bmesh.new()
    bottom_verts = [bm.verts.new((p[0], p[1], z0)) for p in pts]
    try:
        f_bot = bm.faces.new(bottom_verts)
    except ValueError:
        bm.free()
        bpy.data.objects.remove(obj, do_unlink=True)
        return None
    bm.normal_update()
    if f_bot.normal.z > 0:
        f_bot.normal_flip()
    res = bmesh.ops.extrude_face_region(bm, geom=[f_bot])
    extruded_verts = [e for e in res["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=extruded_verts, vec=(0, 0, z1 - z0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(mat)
    return obj

def create_box(name, loc, scale, mat, col_name, rot_z_deg=0.0, rot_x_deg=0.0, rot_y_deg=0.0, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = (math.radians(rot_x_deg), math.radians(rot_y_deg), math.radians(rot_z_deg))
    obj.data.materials.append(mat)
    scene.collection.objects.unlink(obj)
    link_obj(obj, col_name)
    if parent:
        obj.parent = parent
    return obj

def create_hipped_roof(name, pts, z_base, ridge_h, mat, col_name, overhang=0.25, taper=0.35):
    if len(pts) < 3:
        return None
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    exp_pts = []
    for px, py in pts:
        dx, dy = px - cx, py - cy
        d = math.hypot(dx, dy) or 1.0
        exp_pts.append((px + dx / d * overhang, py + dy / d * overhang))
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, col_name)
    bm = bmesh.new()
    base_verts = [bm.verts.new((p[0], p[1], z_base)) for p in exp_pts]
    try:
        f_bot = bm.faces.new(base_verts)
    except ValueError:
        bm.free()
        bpy.data.objects.remove(obj, do_unlink=True)
        return None
    bm.normal_update()
    if f_bot.normal.z > 0:
        f_bot.normal_flip()
    res1 = bmesh.ops.extrude_face_region(bm, geom=[f_bot])
    v1 = [e for e in res1["geom"] if isinstance(e, bmesh.types.BMVert)]
    f_top1 = [e for e in res1["geom"] if isinstance(e, bmesh.types.BMFace)]
    bmesh.ops.translate(bm, verts=v1, vec=(0, 0, 0.14))
    res2 = bmesh.ops.extrude_face_region(bm, geom=f_top1)
    v2 = [e for e in res2["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=v2, vec=(0, 0, ridge_h))
    for v in v2:
        v.co.x = cx + (v.co.x - cx) * taper
        v.co.y = cy + (v.co.y - cy) * taper
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(mat)
    return obj

def create_flat_roof(name, pts, z_base, mat_membrane, mat_parapet, col_name, roof_items=None):
    slab = create_poly_mesh(name, pts, z_base, z_base + 0.30, mat_membrane, col_name)
    if not slab:
        return None
    bm = bmesh.new()
    n = len(pts)
    for i in range(n):
        p1 = Vector((pts[i][0], pts[i][1], z_base + 0.22))
        p2 = Vector((pts[(i + 1) % n][0], pts[(i + 1) % n][1], z_base + 0.22))
        bm.faces.new([
            bm.verts.new(p1), bm.verts.new(p2),
            bm.verts.new(p2 + Vector((0, 0, 0.38))), bm.verts.new(p1 + Vector((0, 0, 0.38)))
        ])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.20)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    pmesh = bpy.data.meshes.new(f"{name}_Acrotere")
    pobj = bpy.data.objects.new(f"{name}_Acrotere", pmesh)
    link_obj(pobj, col_name)
    bm.to_mesh(pmesh)
    bm.free()
    pobj.data.materials.append(mat_parapet)
    pobj.parent = slab

    if roof_items:
        for idx, (sx, sy, sw, sl, sh, rot_d, mat_it) in enumerate(roof_items, 1):
            create_box(f"{name}_Detail_{idx}", (sx, sy, z_base + 0.30 + sh * 0.5), (sw, sl, sh), mat_it, col_name, rot_d, parent=slab)
    return slab

def add_facade_details(b_name, pts, z_base, height, col_name):
    create_poly_mesh(f"Soubassement_{b_name}", pts, z_base, z_base + 0.45, MAT_WALL_BASE, col_name)
    n = len(pts)
    n_floors = 2 if height >= 5.0 else 1
    win_mesh = bpy.data.meshes.new(f"Fenetres_{b_name}")
    win_obj = bpy.data.objects.new(f"Fenetres_{b_name}", win_mesh)
    link_obj(win_obj, col_name)
    bm_w = bmesh.new()

    frm_mesh = bpy.data.meshes.new(f"Menuiseries_{b_name}")
    frm_obj = bpy.data.objects.new(f"Menuiseries_{b_name}", frm_mesh)
    link_obj(frm_obj, col_name)
    bm_f = bmesh.new()

    signed_area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    ccw = signed_area > 0

    for i in range(n):
        p1 = Vector((pts[i][0], pts[i][1], 0))
        p2 = Vector((pts[(i + 1) % n][0], pts[(i + 1) % n][1], 0))
        edge = p2 - p1
        length = edge.length
        if length < 3.2:
            continue
        dir_v = edge.normalized()
        norm = Vector((dir_v.y, -dir_v.x, 0)) if ccw else Vector((-dir_v.y, dir_v.x, 0))
        count = max(1, int((length - 1.4) // 2.7))
        for k in range(count):
            t = (k + 0.5) / count
            pos_f = p1.lerp(p2, t) + norm * 0.04
            pos_w = p1.lerp(p2, t) + norm * 0.08
            for fl in range(n_floors):
                wz = z_base + 1.45 + fl * 2.55
                if wz + 0.8 > z_base + height - 0.35:
                    continue
                fw, fh = 0.80, 0.72
                bm_f.faces.new([
                    bm_f.verts.new(pos_f - dir_v * fw + Vector((0, 0, wz - fh))),
                    bm_f.verts.new(pos_f + dir_v * fw + Vector((0, 0, wz - fh))),
                    bm_f.verts.new(pos_f + dir_v * fw + Vector((0, 0, wz + fh))),
                    bm_f.verts.new(pos_f - dir_v * fw + Vector((0, 0, wz + fh))),
                ])
                gw, gh = 0.70, 0.62
                bm_w.faces.new([
                    bm_w.verts.new(pos_w - dir_v * gw + Vector((0, 0, wz - gh))),
                    bm_w.verts.new(pos_w + dir_v * gw + Vector((0, 0, wz - gh))),
                    bm_w.verts.new(pos_w + dir_v * gw + Vector((0, 0, wz + gh))),
                    bm_w.verts.new(pos_w - dir_v * gw + Vector((0, 0, wz + gh))),
                ])
    if len(bm_w.faces) > 0:
        bmesh.ops.solidify(bm_w, geom=bm_w.faces[:], thickness=0.05)
        bmesh.ops.recalc_face_normals(bm_w, faces=bm_w.faces)
        bm_w.to_mesh(win_mesh)
        win_obj.data.materials.append(MAT_WINDOW)
        bmesh.ops.solidify(bm_f, geom=bm_f.faces[:], thickness=0.06)
        bmesh.ops.recalc_face_normals(bm_f, faces=bm_f.faces)
        bm_f.to_mesh(frm_mesh)
        frm_obj.data.materials.append(MAT_FRAME)
    else:
        bpy.data.objects.remove(win_obj, do_unlink=True)
        bpy.data.objects.remove(frm_obj, do_unlink=True)
    bm_w.free()
    bm_f.free()

def add_detailed_bench(name, x, y, rot_deg, col_name="MOBILIER"):
    rad = math.radians(rot_deg)
    create_box(f"{name}_Assise", (x, y, 0.46), (2.0, 0.42, 0.08), MAT_WOOD, col_name, rot_deg)
    bx = x - math.sin(rad) * 0.20
    by = y + math.cos(rad) * 0.20
    create_box(f"{name}_Dossier", (bx, by, 0.74), (2.0, 0.07, 0.32), MAT_WOOD, col_name, rot_deg)
    for side in (-0.82, 0.82):
        lx = x + math.cos(rad) * side
        ly = y + math.sin(rad) * side
        create_box(f"{name}_Pied_{'G' if side < 0 else 'D'}", (lx, ly, 0.23), (0.08, 0.40, 0.44), MAT_METAL_DARK, col_name, rot_deg)

# Helper: realistic wire-mesh fence (posts + horizontal rails + vertical pickets)
def add_wire_fence(name, p_start, p_end, height=1.35, col_name="MOBILIER"):
    v1 = Vector((p_start[0], p_start[1], 0.05))
    v2 = Vector((p_end[0], p_end[1], 0.05))
    diff = v2 - v1
    length = diff.length
    ang = math.degrees(math.atan2(diff.y, diff.x))
    mid = (v1 + v2) * 0.5

    # Horizontal rails (bottom, middle, top)
    for rz in (0.18, height * 0.55, height):
        create_box(f"{name}_Lisse_{rz:.2f}", (mid.x, mid.y, 0.05 + rz), (length, 0.04, 0.04), MAT_MESH_FENCE, col_name, ang)

    # Vertical posts every ~2.4m + thin intermediate mesh bars every ~0.6m
    n_posts = max(2, int(length // 2.4) + 1)
    for i in range(n_posts):
        t = i / (n_posts - 1)
        p = v1.lerp(v2, t)
        create_box(f"{name}_Poteau_{i+1}", (p.x, p.y, 0.05 + height / 2), (0.08, 0.08, height + 0.06), MAT_MESH_FENCE, col_name, ang)

    n_bars = max(4, int(length // 0.65))
    for i in range(1, n_bars):
        t = i / n_bars
        p = v1.lerp(v2, t)
        create_box(f"{name}_Barreau_{i}", (p.x, p.y, 0.05 + height / 2), (0.02, 0.02, height - 0.12), MAT_MESH_FENCE, col_name, ang)

# ==========================================================
# 1. ALL IGN BUILDINGS (CUSTOM PREAUX + SEAMLESS E3 JOIN + BIKE SHED!)
# ==========================================================
all_ign = site.get("school_buildings", []) + site.get("nearby_buildings", [])
by_id = {b["id"]: b for b in all_ign}

SCHOOL_SPEC = {
    "batiment.34015557": ("Batiment_Principal_S1", "flat_dark", MAT_WALL_WHITE, 4.4, "BATIMENTS", [
        (-1.5, -4.0, 1.3, 1.3, 0.38, GRID_DEG, MAT_SKYLIGHT),
        (5.5, -13.0, 1.3, 1.3, 0.38, GRID_DEG, MAT_SKYLIGHT),
        (11.5, -10.5, 1.4, 1.4, 0.38, GRID_DEG, MAT_SKYLIGHT),
        (15.5, -13.5, 0.9, 0.9, 0.45, GRID_DEG, MAT_HVAC),
    ]),
    "batiment.34015560": ("Batiment_Sud_Maternelle_S2", "flat_light", MAT_WALL_WHITE, 4.1, "BATIMENTS", [
        (-7.0, -27.2, 6.2, 0.22, 0.12, 21.9, MAT_ROOF_ZINC),
        (-5.5, -31.0, 6.5, 0.22, 0.12, 21.9, MAT_ROOF_ZINC),
        (-4.0, -34.8, 6.5, 0.22, 0.12, 21.9, MAT_ROOF_ZINC),
        (-2.8, -38.0, 5.5, 0.22, 0.12, 21.9, MAT_ROOF_ZINC),
        (-8.8, -34.0, 0.9, 0.9, 0.34, 21.9, MAT_HVAC),
    ]),
    "batiment.11420630": ("Batiment_Nord_N1", "flat_dark", MAT_WALL_CREAM, 5.1, "BATIMENTS", [
        (-16.0, 36.5, 1.3, 1.3, 0.32, 18.1, MAT_SKYLIGHT),
        (-6.0, 39.2, 1.3, 1.3, 0.32, 18.1, MAT_SKYLIGHT),
    ]),
    "batiment.34015596": ("Batiment_Est_Principal_E2", "hip_slate", MAT_WALL_STONE, 5.2, "BATIMENTS", None),
    "batiment.34015558": ("Pavillon_Central_S4", "hip_zinc", MAT_WALL_WHITE, 4.1, "BATIMENTS", None),
    "batiment.34015559": ("Annexe_Sud_S5", "flat_light", MAT_WALL_WHITE, 4.1, "BATIMENTS", None),
    "batiment.34015556": ("Sas_Entree_S7", "flat_dark", MAT_WALL_WHITE, 4.2, "BATIMENTS", None),
    "batiment.34015597": ("Batiment_Cantine", "cantine_special", MAT_WALL_CANTINE, 3.5, "CANTINE", None),
}

# Custom-built IDs: E1 (Preau), E3 (seamless extension joined to Periscolaire!), Periscolaire, S6 (entry preau)
CUSTOM_IDS = set(SCHOOL_SPEC.keys()) | {"batiment.26311892", "batiment.15317836", "batiment.15318032", "batiment.34015628"}

# ==========================================================
# 2. TERRAIN (EXPANDED SO NO HORIZON EDGE IS VISIBLE IN PANORAMIC VIEW!), CLEAN ROADS, PARKING & GRASS
# ==========================================================
bpy.ops.mesh.primitive_plane_add(size=2000, location=(100, 40, -0.08))
terrain_base = bpy.context.active_object
terrain_base.name = "Terrain_Base"
terrain_base.data.materials.append(MAT_GROUND)
scene.collection.objects.unlink(terrain_base)
link_obj(terrain_base, "TERRAIN")

# Clean smooth roads from IGN wide network (connecting Church <-> School <-> Stade Louis Auffray!)
def build_road_mesh(name, pts, width=3.1, z_rd=-0.025):
    if len(pts) < 2:
        return
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, "TERRAIN")
    bm = bmesh.new()
    for i in range(len(pts) - 1):
        p1 = Vector((pts[i][0], pts[i][1], z_rd))
        p2 = Vector((pts[i + 1][0], pts[i + 1][1], z_rd))
        d = (p2 - p1)
        if d.length < 0.25:
            continue
        n = Vector((-d.y, d.x, 0)).normalized() * width
        bm.faces.new([bm.verts.new(p1 - n), bm.verts.new(p1 + n), bm.verts.new(p2 + n), bm.verts.new(p2 - n)])
        segs = 8
        center_v = bm.verts.new(p2)
        ring = [bm.verts.new(p2 + Vector((math.cos(2 * math.pi * k / segs) * width, math.sin(2 * math.pi * k / segs) * width, 0))) for k in range(segs)]
        for k in range(segs):
            bm.faces.new([center_v, ring[k], ring[(k + 1) % segs]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(MAT_ROAD)

for idx, r in enumerate(site.get("roads", [])):
    build_road_mesh(f"Route_Ecole_{idx}", r["pts"], width=3.1, z_rd=-0.024)

for idx, r in enumerate(landmarks.get("wide_roads", [])):
    w = 3.6 if any(k in (r.get("name") or "").lower() for k in ("coubertin", "gaulle", "gueret", "guéret", "sports")) else 2.8
    build_road_mesh(f"Route_Bourg_{idx}", r["pts"], width=w, z_rd=-0.032)

# Exact black-outline courtyard (with TWO open gate segments on Rue des Ecoles: seg 0->1 Main Gate, seg 3->4 Second Gate!)
BLACK_OUTLINE_POLY = [
    (-47.5, -20.0),  # 0: Left pillar of MAIN entrance gate (Rue des Ecoles)
    (-42.5, -24.5),  # 1: Right pillar of MAIN entrance gate
    (-35.5, -31.5),  # 2: Along S6 preau & SW grass corner
    (-24.5, -41.0),  # 3: Left pillar of SECOND gate (violet on user photo!)
    (-18.5, -46.0),  # 4: Right pillar of SECOND gate
    (-12.5, -50.5),  # 5: Along Rue des Ecoles (meets Cantine barrier)
    (3.5, -62.2),    # 6: Cantine SW corner
    (12.5, -67.2),   # 7: Cantine South corner
    (41.5, -56.8),   # 8: Cantine East edge
    (41.5, -63.5),   # 9: Around big Periscolaire tree
    (64.5, -62.5),   # 10: SE corner of Periscolaire courtyard
    (66.2, -49.5),   # 11: East corner of grass square along Rue des Sports
    (58.5, -4.0),    # 12: Along Rue des Sports
    (44.5, 37.5),    # 13: NE corner of E2
    (34.0, 34.0),    # 14: North edge of sandy esplanade
    (21.0, 21.0),    # 15: North of Preau E1
    (11.0, 23.5),    # 16: North edge of NW grass
    (6.2, 45.2),     # 17: NE corner of N1
    (-26.8, 38.5),   # 18: NW corner of N1
    (-23.5, 27.0),   # 19: SW corner of N1
    (-22.5, 16.5),   # 20: Around neighbor R+1
    (-32.5, 11.5),   # 21: West courtyard edge
    (-34.0, -5.0),   # 22: West indent
    (-47.5, -16.5),  # 23: Approaching entrance gate
]
create_poly_mesh("Cour_Complete_Enrobe", BLACK_OUTLINE_POLY, -0.01, 0.05, MAT_COUR, "COURS")

# Sandy East esplanade between Preau E1 and Grand Batiment Est E2
EAST_COUR_POLY = [(25.0, -8.0), (49.0, -3.0), (42.0, 34.0), (19.0, 16.0)]
create_poly_mesh("Cour_Est_Esplanade", EAST_COUR_POLY, 0.05, 0.062, MAT_COUR_EST, "COURS")

# Clean Cantine parking lot
PARKING_POLY = [(13.5, -67.8), (41.2, -57.5), (41.2, -64.2), (61.5, -64.0), (57.5, -70.5), (16.5, -70.5)]
create_poly_mesh("Parking_Cantine", PARKING_POLY, -0.01, 0.042, MAT_PARKING, "TERRAIN")
rad_p = math.radians(21.2)
for i in range(10):
    px = 16.5 + i * 2.5 * math.cos(rad_p)
    py = -67.2 + i * 2.5 * math.sin(rad_p)
    create_box(f"Parking_Ligne_{i+1}", (px, py, 0.050), (0.12, 3.8, 0.015), MAT_LINE_WHITE, "TERRAIN", rot_z_deg=21.2)

# Real grass spaces
GRASS_NW = [(-6.5, 21.5), (9.0, 23.0), (5.5, 36.2), (-8.5, 32.0)]
create_poly_mesh("Espace_Herbe_Nord", GRASS_NW, 0.05, 0.075, MAT_GRASS, "VEGETATION")

GRASS_PERI = [(51.0, -49.5), (65.2, -47.2), (63.8, -61.5), (53.0, -61.5)]
create_poly_mesh("Espace_Herbe_Periscolaire", GRASS_PERI, 0.05, 0.078, MAT_GRASS, "VEGETATION")

# SW grass lawn (green patch on user photo: right of S6 preau & wire fence, left of second gate!)
GRASS_SW = [(-35.2, -29.8), (-25.2, -39.2), (-21.8, -33.2), (-29.8, -26.5)]
create_poly_mesh("Espace_Herbe_SudOuest", GRASS_SW, 0.05, 0.078, MAT_GRASS, "VEGETATION")

# Gravel rectangle under big NW tree
GRAVEL_OUTER = rot_rect(-13.5, 20.5, 5.2, 4.4, 18.1)
create_poly_mesh("Bordure_Gravillons_Arbre_NO", GRAVEL_OUTER, 0.05, 0.095, MAT_CURB, "COURS")
GRAVEL_INNER = rot_rect(-13.5, 20.5, 4.8, 4.0, 18.1)
create_poly_mesh("Gravillons_Arbre_NO", GRAVEL_INNER, 0.05, 0.105, MAT_GRAVEL, "COURS")

# ==========================================================
# 3. PREAU DE L'ECOLE + SEAMLESS JOIN TO PERISCOLAIRE + BIKE SHED!
# ==========================================================

# A. PREAU DE L'ECOLE (extended South so E3 is SEAMLESSLY JOINED to Periscolaire — ZERO gap!)
# Preau spans from North end (22.0, 15.8) all the way to South end meeting Periscolaire at (32.5, -12.2) -> total length = 29.8m!
e1_deg = 20.5  # +X_local = East (OPEN side!), +Y_local = North
e1_cx, e1_cy = 27.3, 1.9
e1_depth = 9.4
e1_len = 29.6  # Extended seamlessly through E3 to touch Periscolaire!
e1_h = 3.35

# Floor slab under Preau
create_poly_mesh("Sol_Preau_Ecole", rot_rect(e1_cx, e1_cy, e1_depth, e1_len, e1_deg), 0.05, 0.10, MAT_PREAU_SOL, "COURS")
# Closed West back wall
wx, wy = local_to_world(e1_cx, e1_cy, -e1_depth / 2 + 0.15, 0, e1_deg)
create_box("Murs_Preau_Ecole_Fond", (wx, wy, 0.10 + e1_h / 2), (0.30, e1_len, e1_h), MAT_WALL_WHITE, "BATIMENTS", e1_deg)
# Closed North end wall
nx, ny = local_to_world(e1_cx, e1_cy, 0, e1_len / 2 - 0.15, e1_deg)
create_box("Murs_Preau_Ecole_Nord", (nx, ny, 0.10 + e1_h / 2), (e1_depth, 0.30, e1_h), MAT_WALL_WHITE, "BATIMENTS", e1_deg)
# Closed South section (the brown rectangle E3 area joined flush to Periscolaire!)
sx_e3, sy_e3 = local_to_world(e1_cx, e1_cy, 0, -e1_len / 2 + 3.1, e1_deg)
create_box("Murs_Preau_Jonction_Sud", (sx_e3, sy_e3, 0.10 + e1_h / 2), (e1_depth, 6.2, e1_h), MAT_WALL_WHITE, "BATIMENTS", e1_deg)

# Open East facade (facing Grand Batiment Est E2) along the North 23.4m section: 5 steel columns + top beam
for k in range(5):
    ly = -e1_len / 2 + 6.4 + k * ((e1_len - 7.4) / 4)
    px, py = local_to_world(e1_cx, e1_cy, e1_depth / 2 - 0.25, ly, e1_deg)
    create_box(f"Poteau_Preau_Ecole_{k+1}", (px, py, 0.10 + e1_h / 2), (0.22, 0.22, e1_h), MAT_METAL_DARK, "BATIMENTS", e1_deg)
bx, by = local_to_world(e1_cx, e1_cy, e1_depth / 2 - 0.25, 3.0, e1_deg)
create_box("Poutre_Preau_Ecole_Est", (bx, by, 0.10 + e1_h - 0.15), (0.28, e1_len - 6.0, 0.30), MAT_METAL_DARK, "BATIMENTS", e1_deg)

# Continuous 2-slope gabled metal roof covering BOTH Preau + joined E3 seamlessly to Periscolaire!
preau_roof_mesh = bpy.data.meshes.new("Toit_Preau_Ecole")
preau_roof_obj = bpy.data.objects.new("Toit_Preau_Ecole", preau_roof_mesh)
link_obj(preau_roof_obj, "BATIMENTS")
bm_r = bmesh.new()
z_eave = 0.10 + e1_h
z_ridge = z_eave + 1.45
hw_r = e1_depth / 2 + 0.35
hl_r = e1_len / 2 + 0.35
v_sw = bm_r.verts.new((-hw_r, -hl_r, z_eave))
v_se = bm_r.verts.new((hw_r, -hl_r, z_eave))
v_sr = bm_r.verts.new((0, -hl_r, z_ridge))
v_nw = bm_r.verts.new((-hw_r, hl_r, z_eave))
v_ne = bm_r.verts.new((hw_r, hl_r, z_eave))
v_nr = bm_r.verts.new((0, hl_r, z_ridge))
bm_r.faces.new([v_sw, v_nw, v_nr, v_sr])
bm_r.faces.new([v_sr, v_nr, v_ne, v_se])
bm_r.faces.new([v_sw, v_sr, v_se])
bm_r.faces.new([v_nw, v_ne, v_nr])
bm_r.faces.new([v_sw, v_se, v_ne, v_nw])
bmesh.ops.recalc_face_normals(bm_r, faces=bm_r.faces)
bm_r.to_mesh(preau_roof_mesh)
bm_r.free()
preau_roof_obj.location = (e1_cx, e1_cy, 0)
preau_roof_obj.rotation_euler = (0, 0, math.radians(e1_deg))
preau_roof_obj.data.materials.append(MAT_ROOF_METAL)

# 4 angled white chevron skylight bands (LOCAL coords of preau_roof_obj!)
slope_ang = math.degrees(math.atan2(1.45, hw_r))
for idx_sk, ly in enumerate([-4.5, 0.3, 5.1, 9.9], 1):
    create_box(f"Toit_Preau_Ecole_Lanterneau_E{idx_sk}", (hw_r * 0.48, ly, z_eave + 0.78), (hw_r * 0.78, 1.05, 0.14), MAT_SKYLIGHT, "BATIMENTS", rot_z_deg=0, rot_y_deg=slope_ang, parent=preau_roof_obj)
    create_box(f"Toit_Preau_Ecole_Lanterneau_W{idx_sk}", (-hw_r * 0.48, ly, z_eave + 0.78), (hw_r * 0.78, 1.05, 0.14), MAT_SKYLIGHT, "BATIMENTS", rot_z_deg=0, rot_y_deg=-slope_ang, parent=preau_roof_obj)

bx_p, by_p = local_to_world(e1_cx, e1_cy, -e1_depth / 2 + 0.9, 3.0, e1_deg)
add_detailed_bench("Banc_Preau_Ecole", bx_p, by_p, e1_deg - 90)


# B. PETIT CABANON (small brown square in user photo, tucked between S1 and South end of Preau E1!)
shed_cx, shed_cy = local_to_world(e1_cx, e1_cy, -(e1_depth / 2 + 2.1), -e1_len / 2 + 4.8, e1_deg)
shed_pts = rot_rect(shed_cx, shed_cy, 4.1, 4.3, e1_deg)
create_poly_mesh("Murs_Cabanon_Cour", shed_pts, 0.05, 2.75, MAT_WALL_SHED, "BATIMENTS")
create_flat_roof("Toit_Cabanon_Cour", shed_pts, 2.75, MAT_ROOF_SHED, MAT_WALL_SHED, "BATIMENTS")
# Double door on South/courtyard face of cabanon
sd_x, sd_y = local_to_world(shed_cx, shed_cy, 0.0, -2.18, e1_deg)
create_box("Porte_Cabanon_Cour", (sd_x, sd_y, 1.05), (1.7, 0.08, 1.95), MAT_METAL_DARK, "BATIMENTS", e1_deg)


# C. BATIMENT PERISCOLAIRE (FLUSH/COLLÉ against South end of Preau/E3!) + PREAU PERISCOLAIRE
peri_deg = 20.7
peri_cx, peri_cy = 44.5, -14.8
peri_len = 30.8   # Extended slightly West so it meets Preau/E3 completely flush with ZERO gap!
peri_wid = 9.2
peri_h = 4.6
peri_pts = rot_rect(peri_cx, peri_cy, peri_len, peri_wid, peri_deg)
create_poly_mesh("Murs_Batiment_Periscolaire", peri_pts, 0.05, 0.05 + peri_h, MAT_WALL_PERI, "PERISCOLAIRE")
add_facade_details("Batiment_Periscolaire", peri_pts, 0.05, peri_h, "PERISCOLAIRE")
create_flat_roof("Toit_Batiment_Periscolaire", peri_pts, 0.05 + peri_h, MAT_ROOF_PERI, MAT_WALL_PERI, "PERISCOLAIRE", [
    (*local_to_world(peri_cx, peri_cy, -5.0, 0.5, peri_deg), 1.0, 1.0, 0.36, peri_deg, MAT_HVAC),
    (*local_to_world(peri_cx, peri_cy, 6.0, -0.5, peri_deg), 1.0, 1.0, 0.36, peri_deg, MAT_HVAC),
])

# Preau Periscolaire (open shelter with 5 white translucent bands)
pp_len = 13.8
pp_wid = 4.4
pp_h = 3.1
pp_cx, pp_cy = local_to_world(peri_cx, peri_cy, -6.5, -(peri_wid / 2 + pp_wid / 2), peri_deg)
create_poly_mesh("Sol_Preau_Periscolaire", rot_rect(pp_cx, pp_cy, pp_len, pp_wid, peri_deg), 0.05, 0.09, MAT_PREAU_SOL, "PERISCOLAIRE")
for k in range(4):
    lx = -pp_len / 2 + 0.8 + k * ((pp_len - 1.6) / 3)
    cx_p, cy_p = local_to_world(pp_cx, pp_cy, lx, -pp_wid / 2 + 0.25, peri_deg)
    create_box(f"Poteau_Preau_Peri_{k+1}", (cx_p, cy_p, 0.09 + pp_h / 2), (0.20, 0.20, pp_h), MAT_METAL_DARK, "PERISCOLAIRE", peri_deg)
pp_roof_pts = rot_rect(pp_cx, pp_cy, pp_len + 0.3, pp_wid + 0.3, peri_deg)
pp_roof = create_poly_mesh("Toit_Preau_Periscolaire", pp_roof_pts, 0.09 + pp_h, 0.09 + pp_h + 0.26, MAT_ROOF_PERI, "PERISCOLAIRE")
for idx_s in range(5):
    lx = -pp_len / 2 + 1.5 + idx_s * ((pp_len - 3.0) / 4)
    sx, sy = local_to_world(pp_cx, pp_cy, lx, 0, peri_deg)
    create_box(f"Toit_Preau_Peri_Bande_{idx_s+1}", (sx, sy, 0.09 + pp_h + 0.30), (1.1, pp_wid - 0.5, 0.14), MAT_SKYLIGHT, "PERISCOLAIRE", peri_deg, parent=pp_roof)

for idx_b, lx in enumerate([2.5, 9.0], 1):
    bx, by = local_to_world(peri_cx, peri_cy, lx, -(peri_wid / 2 + 0.9), peri_deg)
    add_detailed_bench(f"Banc_Periscolaire_{idx_b}", bx, by, peri_deg)


# D. PETIT PREAU D'ENTREE S6 (to the right of main entrance gate)
s6_cx, s6_cy = -38.0, -25.2
s6_deg = -42.0
s6_len, s6_wid, s6_h = 6.2, 3.6, 2.5
create_poly_mesh("Sol_Preau_Entree_S6", rot_rect(s6_cx, s6_cy, s6_len, s6_wid, s6_deg), 0.05, 0.09, MAT_PREAU_SOL, "COURS")
bx6, by6 = local_to_world(s6_cx, s6_cy, 0, -s6_wid / 2 + 0.14, s6_deg)
create_box("Murs_Preau_Entree_S6_Fond", (bx6, by6, 0.09 + s6_h / 2), (s6_len, 0.25, s6_h), MAT_WALL_WHITE, "BATIMENTS", s6_deg)
for lx in (-s6_len / 2 + 0.35, 0.0, s6_len / 2 - 0.35):
    px6, py6 = local_to_world(s6_cx, s6_cy, lx, s6_wid / 2 - 0.22, s6_deg)
    create_box(f"Poteau_Preau_S6_{lx:.1f}", (px6, py6, 0.09 + s6_h / 2), (0.16, 0.16, s6_h), MAT_METAL_DARK, "BATIMENTS", s6_deg)
create_flat_roof("Toit_Preau_Entree_S6", rot_rect(s6_cx, s6_cy, s6_len + 0.3, s6_wid + 0.3, s6_deg), 0.09 + s6_h, MAT_ROOF_FLAT_LIGHT, MAT_WALL_WHITE, "BATIMENTS")


# ==========================================================
# 4. BUILD ALL OTHER REAL SCHOOL + CANTINE + CONTEXT BUILDINGS
# ==========================================================
for bid, (b_name, roof_type, wall_mat, default_h, col_name, roof_items) in SCHOOL_SPEC.items():
    b = by_id.get(bid)
    if not b:
        continue
    h = float(b.get("hauteur") or default_h)
    pts = b["pts"]
    create_poly_mesh(f"Murs_{b_name}", pts, 0.05, 0.05 + h, wall_mat, col_name)
    if b["area"] > 28:
        add_facade_details(b_name, pts, 0.05, h, col_name)

    z_top = 0.05 + h
    if roof_type == "flat_dark":
        create_flat_roof(f"Toit_{b_name}", pts, z_top, MAT_ROOF_FLAT_DARK, MAT_WALL_WHITE, col_name, roof_items)
    elif roof_type == "flat_light":
        create_flat_roof(f"Toit_{b_name}", pts, z_top, MAT_ROOF_FLAT_LIGHT, MAT_WALL_WHITE, col_name, roof_items)
    elif roof_type == "hip_slate":
        r_obj = create_hipped_roof(f"Toit_{b_name}", pts, z_top, 2.2, MAT_ROOF_SLATE, col_name, overhang=0.28, taper=0.35)
        if b_name == "Batiment_Est_Principal_E2" and r_obj:
            for idx_v, (vx, vy) in enumerate([(42.8, 25.0), (45.2, 18.5), (47.5, 12.0), (49.8, 5.5)], 1):
                create_box(f"Toit_E2_Velux_{idx_v}", (vx, vy, z_top + 1.3), (1.0, 1.2, 0.22), MAT_SKYLIGHT, col_name, 21.5, parent=r_obj)
    elif roof_type == "hip_zinc":
        create_hipped_roof(f"Toit_{b_name}", pts, z_top, 1.5, MAT_ROOF_ZINC, col_name, overhang=0.18, taper=0.12)
    elif roof_type == "cantine_special":
        # Clean solid Cantine roof deck (no internal parapet artifact cutting across the middle!)
        c_roof = create_poly_mesh(f"Toit_{b_name}", pts, z_top, z_top + 0.30, MAT_ROOF_FLAT_DARK, col_name)
        # Solid infill central technical block between North & South wings so NOTHING ever floats!
        center_deck_pts = rot_rect(21.5, -49.2, 26.5, 11.5, 21.2)
        create_poly_mesh("Murs_Cantine_Central_Tech", center_deck_pts, 0.05, z_top, MAT_WALL_CANTINE, col_name)
        cd = create_poly_mesh("Toit_Cantine_Dalle_Centrale", center_deck_pts, z_top, z_top + 0.30, MAT_ROOF_FLAT_DARK, col_name)
        if cd and c_roof: cd.parent = c_roof
        # North hall roof strictly seated on North wing walls
        hall_n = rot_rect(19.5, -42.6, 31.0, 6.4, 21.2)
        hn = create_hipped_roof("Toit_Cantine_Aile_Nord", hall_n, z_top + 0.28, 1.35, MAT_ROOF_CANTINE_1, col_name, overhang=0.05, taper=0.25)
        if hn and c_roof: hn.parent = c_roof
        # South hall roof strictly seated on South wing walls
        hall_s = rot_rect(23.5, -56.2, 27.5, 6.6, 21.2)
        hs = create_hipped_roof("Toit_Cantine_Aile_Sud", hall_s, z_top + 0.28, 1.30, MAT_ROOF_CANTINE_2, col_name, overhang=0.05, taper=0.25)
        if hs and c_roof: hs.parent = c_roof
        # Grounded central kitchen HVAC units + connecting ventilation duct strictly sitting on center_deck!
        duct_x, duct_y = 21.5, -49.4
        create_box("Toit_Cantine_Gaine_CVC", (duct_x, duct_y, z_top + 0.30 + 0.26), (17.5, 0.55, 0.52), MAT_HVAC, col_name, 21.2, parent=c_roof)
        for idx_h, (lx, sx, sy, sz) in enumerate([
            (-6.5, 3.2, 1.4, 0.85), (-1.2, 2.6, 1.5, 1.00), (4.2, 2.2, 1.4, 0.80), (8.2, 1.6, 1.4, 0.68)
        ], 1):
            hx, hy = local_to_world(duct_x, duct_y, lx, 0.0, 21.2)
            create_box(f"Toit_Cantine_CVC_{idx_h}", (hx, hy, z_top + 0.30 + sz / 2), (sx, sy, sz), MAT_HVAC, col_name, 21.2, parent=c_roof)

# S1 NE Pyramidal Zinc Pavilion
s1_pav_pts = [(1.7, 8.1), (13.4, 12.4), (16.5, 3.8), (4.8, -0.5)]
create_hipped_roof("Toit_Batiment_Principal_S1_Pavillon", s1_pav_pts, 4.45, 2.1, MAT_ROOF_ZINC, "BATIMENTS", overhang=0.02, taper=0.10)

# Context buildings
ctx_idx = 0
for b in all_ign:
    if b["id"] in CUSTOM_IDS:
        continue
    ctx_idx += 1
    h = float(b.get("hauteur") or 4.0)
    pts = b["pts"]
    create_poly_mesh(f"Contexte_Bat_{ctx_idx}", pts, 0.0, h, MAT_WALL_CONTEXT, "TERRAIN")
    create_hipped_roof(f"Contexte_Toit_{ctx_idx}", pts, h, min(1.6, h * 0.32), MAT_ROOF_CONTEXT, "TERRAIN", overhang=0.12, taper=0.45)

# ==========================================================
# 5. BROWN WIRE FENCE SEPARATING COURTS + RECALIBRATED FOOTBALL COURTS!
# ==========================================================
# Exact brown wire fence separating elementary court (football) from maternal court
add_wire_fence("Grillage_Separation_Cours", (-4.2, -13.2), (-34.8, -28.5), height=1.35, col_name="MOBILIER")

# Violet wire fences: perfectly straight perpendicular passage between Periscolaire & Cantine + North Cantine barrier!
p_peri_sw = local_to_world(peri_cx, peri_cy, -peri_len / 2 + 0.1, -peri_wid / 2, peri_deg)
p_cantine_corner = local_to_world(peri_cx, peri_cy, -peri_len / 2 + 0.1, -(peri_wid / 2 + 8.0), peri_deg)
# 1. Straight passage barrier (orange mark on user screenshot!) flush with Periscolaire West facade
add_wire_fence("Grillage_Perisco_Cantine_Est", p_peri_sw, p_cantine_corner, height=1.40, col_name="MOBILIER")
# 2. Long barrier running straight along North facade of Cantine all the way to Rue des Ecoles
add_wire_fence("Grillage_Cantine_Nord", p_cantine_corner, (-13.2, -49.2), height=1.40, col_name="MOBILIER")
# 3. Short T-branch linking Cantine barrier to Batiment Sud S2 SE corner
add_wire_fence("Grillage_Liaison_S2_Cantine", (-1.8, -44.6), (-3.8, -39.5), height=1.35, col_name="MOBILIER")

# Two Football Courts precisely aligned JUST NORTH (left on photo) of the brown wire fence & close to S1!
def add_detailed_football_court(name, cx, cy, length_ns, width_ew, rot_deg=-67.0):
    lw = 0.14
    z = 0.068
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, "COURS")
    bm = bmesh.new()

    def add_line(x0, y0, sx, sy):
        res = bmesh.ops.create_cube(bm, size=1.0)
        for v in res["verts"]:
            v.co.x = v.co.x * sx + x0
            v.co.y = v.co.y * sy + y0
            v.co.z = v.co.z * 0.015 + z

    add_line(0, width_ew / 2, length_ns, lw)
    add_line(0, -width_ew / 2, length_ns, lw)
    add_line(length_ns / 2, 0, lw, width_ew)
    add_line(-length_ns / 2, 0, lw, width_ew)
    add_line(0, 0, lw, width_ew)
    pb_w, pb_d = width_ew * 0.44, 1.85
    for side in (-1, 1):
        add_line(side * (length_ns / 2 - pb_d), 0, lw, pb_w)
        add_line(side * (length_ns / 2 - pb_d / 2), pb_w / 2, pb_d, lw)
        add_line(side * (length_ns / 2 - pb_d / 2), -pb_w / 2, pb_d, lw)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = (cx, cy, 0)
    obj.rotation_euler = (0, 0, math.radians(rot_deg))
    obj.data.materials.append(MAT_LINE_WHITE)

    rad = math.radians(rot_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    vx, vy = -math.sin(rad), math.cos(rad)
    for side in (-1, 1):
        gx = cx + side * (length_ns / 2) * ux
        gy = cy + side * (length_ns / 2) * uy
        gw, gh, gd = 2.4, 1.55, 0.85
        for ps in (-1, 1):
            create_box(f"{name}_But_{side}_{ps}_Poteau",
                       (gx + ps * (gw / 2) * vx, gy + ps * (gw / 2) * vy, gh / 2 + 0.05),
                       (0.09, 0.09, gh), MAT_METAL_GOAL, "MOBILIER", rot_deg)
            create_box(f"{name}_But_{side}_{ps}_Base",
                       (gx + ps * (gw / 2) * vx + side * (gd / 2) * ux, gy + ps * (gw / 2) * vy + side * (gd / 2) * uy, 0.09),
                       (gd, 0.08, 0.08), MAT_METAL_GOAL, "MOBILIER", rot_deg)
            create_box(f"{name}_But_{side}_{ps}_Arriere",
                       (gx + ps * (gw / 2) * vx + side * gd * ux, gy + ps * (gw / 2) * vy + side * gd * uy, gh / 2),
                       (0.07, 0.07, gh * 0.85), MAT_METAL_GOAL, "MOBILIER", rot_deg)
        create_box(f"{name}_But_{side}_Transversale",
                   (gx, gy, gh + 0.05), (0.09, gw + 0.09, 0.09), MAT_METAL_GOAL, "MOBILIER", rot_deg)

# Recalibrated right beside the brown fence & close to S1 West wall, matching photo proportions!
add_detailed_football_court("Terrain_Foot_Est", -14.8, -8.5, 14.8, 12.0, rot_deg=-67.0)
add_detailed_football_court("Terrain_Foot_Ouest", -28.0, -14.5, 13.8, 10.2, rot_deg=-67.0)

# Red soft-surface playground
create_box("Aire_Jeux_Sol_Souple_Rouge", (8.5, -31.8, 0.065), (6.0, 5.0, 0.03), MAT_PLAY_RED, "COURS", rot_z_deg=21.0)
create_box("Jeu_Enfant_Base", (8.5, -31.8, 0.75), (1.5, 1.5, 1.35), MAT_PLAY_BLUE, "MOBILIER", rot_z_deg=21.0)
create_box("Jeu_Enfant_Toit", (8.5, -31.8, 1.60), (1.8, 1.8, 0.32), MAT_PLAY_YELLOW, "MOBILIER", rot_z_deg=21.0)
create_box("Jeu_Enfant_Toboggan", (9.6, -31.4, 0.52), (1.3, 0.52, 0.14), MAT_PLAY_RED, "MOBILIER", rot_z_deg=21.0)

# Periscolaire courtyard games
create_box("Table_PingPong_Plateau", (58.5, -24.5, 0.78), (2.7, 1.5, 0.08), MAT_PINGPONG, "MOBILIER", rot_z_deg=20.7)
create_box("Table_PingPong_Pied", (58.5, -24.5, 0.40), (1.4, 0.9, 0.72), MAT_METAL_DARK, "MOBILIER", rot_z_deg=20.7)
create_box("Table_PingPong_Filet", (58.5, -24.5, 0.90), (0.04, 1.55, 0.16), MAT_LINE_WHITE, "MOBILIER", rot_z_deg=20.7)

bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=2.1, depth=0.02, location=(56.5, -34.0, 0.066))
t1 = bpy.context.active_object; t1.name = "Jeu_Sol_Cible_Ext"; t1.data.materials.append(MAT_LINE_WHITE); scene.collection.objects.unlink(t1); link_obj(t1, "PERISCOLAIRE")
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.4, depth=0.024, location=(56.5, -34.0, 0.068))
t2 = bpy.context.active_object; t2.name = "Jeu_Sol_Cible_Rouge"; t2.data.materials.append(MAT_PLAY_RED); scene.collection.objects.unlink(t2); link_obj(t2, "PERISCOLAIRE")
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.65, depth=0.028, location=(56.5, -34.0, 0.070))
t3 = bpy.context.active_object; t3.name = "Jeu_Sol_Cible_Centre"; t3.data.materials.append(MAT_LINE_WHITE); scene.collection.objects.unlink(t3); link_obj(t3, "PERISCOLAIRE")

for ang_y in (0, 120, 240):
    ry = math.radians(ang_y + 20)
    create_box(f"Jeu_Sol_Y_{ang_y}", (54.5 + 0.85 * math.cos(ry), -42.5 + 0.85 * math.sin(ry), 0.068), (1.9, 0.35, 0.015), MAT_LINE_WHITE, "PERISCOLAIRE", rot_z_deg=ang_y + 20)

create_box("Jeu_Sol_Damier", (47.5, -39.0, 0.068), (2.8, 2.8, 0.02), MAT_COUR_EST, "PERISCOLAIRE", rot_z_deg=20.7)

# ==========================================================
# 6. OPTIONAL INITIATIVE DETAILS (ALL PREFIXED Extra_* & EASY TO TOGGLE!)
# ==========================================================
if INCLUDE_EXTRA_DETAILS:
    # White painted Y-motif in NW courtyard (clearly visible in photo just below N1 & big NW tree)
    for ang_y in (0, 120, 240):
        ry = math.radians(ang_y - 10)
        create_box(f"Extra_Jeu_Sol_Y_NO_{ang_y}", (-21.0 + 0.8 * math.cos(ry), 21.5 + 0.8 * math.sin(ry), 0.066), (1.7, 0.32, 0.014), MAT_LINE_WHITE, "COURS", rot_z_deg=ang_y - 10)

# ==========================================================
# 7. INTERIOR ROOMS
# ==========================================================
CLASS_COLORS = [
    (0.36, 0.65, 0.88), (0.42, 0.74, 0.56), (0.92, 0.68, 0.34),
    (0.84, 0.45, 0.48), (0.62, 0.52, 0.86), (0.34, 0.76, 0.76),
    (0.88, 0.56, 0.72), (0.72, 0.78, 0.38), (0.48, 0.62, 0.88),
    (0.90, 0.54, 0.36),
]

def add_room_block(name, loc, size, rot_deg, color, col_name):
    m = get_mat(f"Mat_{name}", color, roughness=0.55)
    return create_box(name, (loc[0], loc[1], loc[2] + size[2] * 0.5), size, m, col_name, rot_deg)

rooms_spec = [
    ("Classe_01", (8.8, 5.8, 0.15), (6.5, 5.5, 2.6), GRID_DEG),
    ("Classe_02", (-0.5, -2.5, 0.15), (5.5, 5.2, 2.6), GRID_DEG),
    ("Classe_03", (8.5, -5.5, 0.15), (5.8, 5.2, 2.6), GRID_DEG),
    ("Classe_04", (15.0, -8.0, 0.15), (5.2, 5.0, 2.6), GRID_DEG),
    ("Classe_05", (11.5, -16.0, 0.15), (5.2, 4.5, 2.6), GRID_DEG),
    ("Classe_06", (-17.0, 35.8, 0.15), (7.8, 5.8, 2.8), 18.1),
    ("Classe_07", (-5.5, 39.2, 0.15), (7.8, 5.8, 2.8), 18.1),
    ("Classe_08", (45.2, 24.5, 0.15), (4.4, 6.6, 2.8), 21.5),
    ("Classe_09", (48.5, 13.5, 0.15), (4.4, 6.6, 2.8), 21.5),
    ("Classe_10", (52.0, 3.0, 0.15), (4.4, 5.6, 2.8), 21.5),
]
for idx, (rname, loc, size, rot) in enumerate(rooms_spec):
    add_room_block(rname, loc, size, rot, CLASS_COLORS[idx % len(CLASS_COLORS)], "CLASSES")

add_room_block("Salle_Cantine", (20.0, -43.5, 0.15), (24.0, 5.0, 2.0), 21.2, (0.28, 0.72, 0.42), "CANTINE")
add_room_block("Salle_Periscolaire", (peri_cx, peri_cy, 0.15), (24.0, 6.5, 2.6), peri_deg, (0.76, 0.36, 0.78), "PERISCOLAIRE")

# ==========================================================
# 8. TREES, BENCHES, PERIMETER WALL & MAIN ENTRANCE GATE
# ==========================================================
def add_realistic_tree(name, x, y, scale=1.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.28 * scale, depth=2.5 * scale, location=(x, y, 1.25 * scale))
    trunk = bpy.context.active_object
    trunk.name = f"{name}_Tronc"
    trunk.data.materials.append(MAT_TRUNK)
    scene.collection.objects.unlink(trunk)
    link_obj(trunk, "VEGETATION")

    offsets = [
        (0.0, 0.0, 3.9, 2.3, MAT_FOLIAGE_DARK),
        (1.1, 0.7, 3.3, 1.7, MAT_FOLIAGE_MID),
        (-1.0, 0.6, 3.4, 1.7, MAT_FOLIAGE_DARK),
        (0.5, -1.0, 3.2, 1.5, MAT_FOLIAGE_LIGHT),
        (-0.6, -0.8, 3.5, 1.4, MAT_FOLIAGE_MID),
    ]
    for i, (ox, oy, oz, rad, mat) in enumerate(offsets, 1):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=rad * scale,
            location=(x + ox * scale, y + oy * scale, oz * scale),
        )
        c = bpy.context.active_object
        c.name = f"{name}_Couronne_{i}"
        c.scale = (1.05, 0.95, 0.85)
        c.data.materials.append(mat)
        scene.collection.objects.unlink(c)
        link_obj(c, "VEGETATION")

REAL_TREES = [
    (-13.5, 20.5, 1.60),
    (15.2, 14.5, 0.82),
    (17.4, 11.8, 0.72),
    (-29.2, -33.2, 1.22),  # Moved into SW grass patch (green arrow on user photo!)
    (49.5, -61.5, 1.60),
]
for idx, (tx, ty, ts) in enumerate(REAL_TREES, 1):
    add_realistic_tree(f"Arbre_{idx:02d}", tx, ty, ts)

for idx, (sx, sy) in enumerate([(12.5, -29.5), (14.5, -24.5)], 1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.85, location=(sx, sy, 0.72))
    sh = bpy.context.active_object
    sh.name = f"Arbuste_{idx:02d}"
    sh.scale = (1.1, 1.0, 0.72)
    sh.data.materials.append(MAT_FOLIAGE_LIGHT)
    scene.collection.objects.unlink(sh)
    link_obj(sh, "VEGETATION")

add_detailed_bench("Banc_Nord_01", -15.5, 29.5, 18.1)
add_detailed_bench("Banc_Jeux_02", 2.5, -26.5, -69.0)
# The 2 benches in front of Batiment Principal S1 West facade (between S1 and football courts!)
add_detailed_bench("Banc_Principal_01", -9.3, -2.5, -69.5)
add_detailed_bench("Banc_Principal_02", -6.5, -9.8, -69.5)

# Perimeter wall (segments 0->1 MAIN gate and 3->4 SECOND gate left open!)
mesh_f = bpy.data.meshes.new("Cloture_Perimetrique")
obj_f = bpy.data.objects.new("Cloture_Perimetrique", mesh_f)
link_obj(obj_f, "MOBILIER")
bm_f = bmesh.new()
n_poly = len(BLACK_OUTLINE_POLY)
for i in range(n_poly):
    if i in (0, 3):  # Open for Main Gate (0->1) and Second Gate (3->4)!
        continue
    p1 = Vector((BLACK_OUTLINE_POLY[i][0], BLACK_OUTLINE_POLY[i][1], 0.05))
    p2 = Vector((BLACK_OUTLINE_POLY[(i + 1) % n_poly][0], BLACK_OUTLINE_POLY[(i + 1) % n_poly][1], 0.05))
    bm_f.faces.new([
        bm_f.verts.new(p1), bm_f.verts.new(p2),
        bm_f.verts.new(p2 + Vector((0, 0, 1.45))), bm_f.verts.new(p1 + Vector((0, 0, 1.45)))
    ])
bmesh.ops.solidify(bm_f, geom=bm_f.faces[:], thickness=0.20)
bm_f.to_mesh(mesh_f)
bm_f.free()
obj_f.data.materials.append(MAT_WALL_FENCE)

def add_entrance_gate(prefix, pt_a, pt_b, with_sign=False):
    g1 = Vector((pt_a[0], pt_a[1], 0.05))
    g2 = Vector((pt_b[0], pt_b[1], 0.05))
    g_dir = (g2 - g1)
    g_len = g_dir.length
    g_ang = math.degrees(math.atan2(g_dir.y, g_dir.x))
    g_mid = (g1 + g2) * 0.5
    create_box(f"{prefix}_Pilier_G", (g1.x, g1.y, 1.05), (0.52, 0.52, 2.0), MAT_PILLAR, "SIGNALISATION", g_ang)
    create_box(f"{prefix}_Pilier_D", (g2.x, g2.y, 1.05), (0.52, 0.52, 2.0), MAT_PILLAR, "SIGNALISATION", g_ang)
    create_box(f"{prefix}_Vantaux", (g_mid.x, g_mid.y, 0.95), (g_len - 0.55, 0.14, 1.75), MAT_GATE, "SIGNALISATION", g_ang)
    if with_sign:
        sign_pos = g1 + g_dir.normalized() * (-1.3)
        create_box("Panneau_Entree_Ecole_Sainte_Anne", (sign_pos.x, sign_pos.y, 1.75), (2.2, 0.16, 0.95), MAT_SIGN, "SIGNALISATION", g_ang)

add_entrance_gate("Portail_Principal", BLACK_OUTLINE_POLY[0], BLACK_OUTLINE_POLY[1], with_sign=True)
add_entrance_gate("Portail_Secondaire", BLACK_OUTLINE_POLY[3], BLACK_OUTLINE_POLY[4], with_sign=False)

# ==========================================================
# 9. EGLISE SAINT-PIERRE DE PORDIC (DETAILED NEO-GOTHIC ARCHITECTURE + PLACE DE L'EGLISE!)
# ==========================================================
ch = landmarks.get("church")
if ch:
    ch_cx, ch_cy = ch["centroid"]
    ch_ang = ch["angle_deg"]
    ch_pts = ch["pts"]
    ch_h_aisle = float(ch.get("hauteur") or 9.6)

    def ch_pt(u, v):
        return local_to_world(ch_cx, ch_cy, u, v, ch_ang)

    # Helper: crisp double-pitched gable roof (true Latin cross geometry with granite gables & zinc ridge!)
    def create_gable_roof(name, cx_r, cy_r, length_u, width_v, deg, z_eave, ridge_h, mat_roof, mat_gable, mat_ridge, col_name="EGLISE_PORDIC", overhang=0.35, gable_ends=(True, True)):
        hl = length_u / 2.0 + overhang
        hw = width_v / 2.0 + overhang
        mesh = bpy.data.meshes.new(name)
        obj = bpy.data.objects.new(name, mesh)
        link_obj(obj, col_name)
        bm = bmesh.new()
        v_fl = bm.verts.new((-hl, -hw, z_eave))
        v_fr = bm.verts.new((-hl,  hw, z_eave))
        v_ft = bm.verts.new((-hl,  0.0, z_eave + ridge_h))
        v_bl = bm.verts.new(( hl, -hw, z_eave))
        v_br = bm.verts.new(( hl,  hw, z_eave))
        v_bt = bm.verts.new(( hl,  0.0, z_eave + ridge_h))
        # Left & right roof slopes
        f1 = bm.faces.new([v_fl, v_bl, v_bt, v_ft]); f1.material_index = 0
        f2 = bm.faces.new([v_fr, v_ft, v_bt, v_br]); f2.material_index = 0
        # Underside soffit
        f_bot = bm.faces.new([v_fl, v_fr, v_br, v_bl]); f_bot.material_index = 0
        # Triangular gables at ends
        if gable_ends[0]:
            fg1 = bm.faces.new([v_fl, v_ft, v_fr]); fg1.material_index = 1
        if gable_ends[1]:
            fg2 = bm.faces.new([v_bl, v_br, v_bt]); fg2.material_index = 1
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh); bm.free()
        obj.location = (cx_r, cy_r, 0.0)
        obj.rotation_euler = (0.0, 0.0, math.radians(deg))
        obj.data.materials.append(mat_roof)
        obj.data.materials.append(mat_gable)
        # Bright zinc ridge cap along top
        create_box(f"{name}_Faitage", (cx_r, cy_r, z_eave + ridge_h + 0.14), (length_u + overhang * 1.9, 0.44, 0.30), mat_ridge, col_name, deg)
        # Granite gable coping rampants + finial cross on exposed gables
        slope_len = math.hypot(hw, ridge_h)
        slope_ang = math.degrees(math.atan2(ridge_h, hw))
        for idx_end, (u_sign, has_g) in enumerate([(-1, gable_ends[0]), (1, gable_ends[1])]):
            if not has_g:
                continue
            for side_v in (-1, 1):
                gx_l, gy_l = local_to_world(cx_r, cy_r, u_sign * (length_u / 2.0 + 0.18), side_v * (hw * 0.5), deg)
                create_box(f"{name}_Rampant_{idx_end}_{side_v}", (gx_l, gy_l, z_eave + ridge_h * 0.5 + 0.16), (0.55, slope_len + 0.25, 0.34), MAT_CHURCH_TRIM, col_name, rot_z_deg=deg, rot_x_deg=-side_v * slope_ang)
            fx_c, fy_c = local_to_world(cx_r, cy_r, u_sign * (length_u / 2.0 + 0.18), 0.0, deg)
            create_box(f"{name}_CroixPignon_Mat_{idx_end}", (fx_c, fy_c, z_eave + ridge_h + 0.85), (0.18, 0.18, 1.4), MAT_CHURCH_TRIM, col_name, deg)
            create_box(f"{name}_CroixPignon_Bar_{idx_end}", (fx_c, fy_c, z_eave + ridge_h + 1.12), (0.18, 0.78, 0.18), MAT_CHURCH_TRIM, col_name, deg)
        return obj

    # Helper: crisp lean-to slate roof for side aisles (appentis)
    def create_leanto_roof(name, u1, u2, v_inner, v_outer, z_high, z_low, mat_roof, col_name="EGLISE_PORDIC"):
        mesh = bpy.data.meshes.new(name)
        obj = bpy.data.objects.new(name, mesh)
        link_obj(obj, col_name)
        bm = bmesh.new()
        p00 = ch_pt(u1, v_inner); p10 = ch_pt(u2, v_inner)
        p01 = ch_pt(u1, v_outer); p11 = ch_pt(u2, v_outer)
        t = 0.28
        # Top & bottom faces for solid watertight slab
        vt = [bm.verts.new((p00[0], p00[1], z_high)), bm.verts.new((p10[0], p10[1], z_high)),
              bm.verts.new((p11[0], p11[1], z_low)), bm.verts.new((p01[0], p01[1], z_low))]
        vb = [bm.verts.new((p00[0], p00[1], z_high - t)), bm.verts.new((p10[0], p10[1], z_high - t)),
              bm.verts.new((p11[0], p11[1], z_low - t)), bm.verts.new((p01[0], p01[1], z_low - t))]
        bm.faces.new(vt)
        bm.faces.new(list(reversed(vb)))
        for i in range(4):
            ni = (i + 1) % 4
            bm.faces.new([vt[i], vb[i], vb[ni], vt[ni]])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh); bm.free()
        obj.data.materials.append(mat_roof)
        return obj

    # Helper: pointed gothic lancet window (carved granite frame + recessed dark stained glass + pointed arch top)
    def add_gothic_window(name, u, v, z_bot, width, height, normal_axis='v', side_sign=1, col_name="EGLISE_PORDIC"):
        wx, wy = ch_pt(u, v)
        rot_d = ch_ang if normal_axis == 'v' else ch_ang + 90.0
        # Stone frame surround
        create_box(f"{name}_Cadre", (wx, wy, z_bot + height * 0.46), (width + 0.34, 0.22, height * 0.92), MAT_CHURCH_TRIM, col_name, rot_d)
        # Recessed stained glass pane
        off_u = side_sign * 0.04 if normal_axis == 'u' else 0.0
        off_v = side_sign * 0.04 if normal_axis == 'v' else 0.0
        gx, gy = ch_pt(u + off_u, v + off_v)
        create_box(f"{name}_Verre", (gx, gy, z_bot + height * 0.45), (width, 0.24, height * 0.86), MAT_CHURCH_GLASS, col_name, rot_d)
        # Pointed gothic arch top (diamond rotated 45 deg in vertical plane)
        ax, ay = ch_pt(u + off_u * 1.1, v + off_v * 1.1)
        arch_s = width * 0.72
        create_box(f"{name}_Ogive", (ax, ay, z_bot + height * 0.88), (arch_s, 0.23, arch_s), MAT_CHURCH_GLASS, col_name, rot_z_deg=rot_d, rot_y_deg=45.0)
        # Central stone mullion (meneau) on wide windows
        if width >= 1.25:
            mx, my = ch_pt(u + off_u * 1.4, v + off_v * 1.4)
            create_box(f"{name}_Meneau", (mx, my, z_bot + height * 0.46), (0.14, 0.26, height * 0.88), MAT_CHURCH_TRIM, col_name, rot_d)

    # Helper: lush plaza tree with customizable foliage palette
    def add_plaza_tree(name, x, y, scale=1.0, mat_a=MAT_FOLIAGE_DARK, mat_b=MAT_FOLIAGE_MID, mat_c=MAT_FOLIAGE_LIGHT):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.26 * scale, depth=2.4 * scale, location=(x, y, 1.2 * scale))
        trunk = bpy.context.active_object; trunk.name = f"{name}_Tronc"; trunk.data.materials.append(MAT_TRUNK)
        scene.collection.objects.unlink(trunk); link_obj(trunk, "VEGETATION")
        for i, (ox, oy, oz, rad, mat) in enumerate([
            (0.0, 0.0, 3.8, 2.25, mat_a),
            (1.0, 0.7, 3.2, 1.65, mat_b),
            (-0.95, 0.6, 3.3, 1.60, mat_a),
            (0.5, -0.95, 3.1, 1.45, mat_c),
            (-0.55, -0.8, 3.4, 1.35, mat_b),
        ], 1):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad * scale, location=(x + ox * scale, y + oy * scale, oz * scale))
            c_obj = bpy.context.active_object; c_obj.name = f"{name}_Couronne_{i}"; c_obj.scale = (1.05, 0.95, 0.84)
            c_obj.data.materials.append(mat); scene.collection.objects.unlink(c_obj); link_obj(c_obj, "VEGETATION")

    # ----------------------------------------------------------
    # 9A. PLACE DE L'EGLISE, PARVIS, GRAND ESCALIER & JARDINIERES COURBES
    # ----------------------------------------------------------
    # Broad warm stone plaza wrapping the church and opening onto Place de l'Eglise in front
    plaza_uv = [
        (-52.0, -24.0), (-26.0, -25.0), (14.0, -19.5), (34.0, -14.5),
        (37.5, 0.0), (35.0, 14.5), (18.0, 20.0), (-22.0, 23.0), (-48.0, 20.0)
    ]
    create_poly_mesh("Parvis_Eglise_Saint_Pierre", [ch_pt(u, v) for u, v in plaza_uv], -0.02, 0.06, MAT_PARVIS, "EGLISE_PORDIC")

    # Raised stone parvis terrace directly under the church & West entrance (z=0.06 -> 0.54m)
    parvis_terr_uv = [(-30.2, -12.5), (33.5, -12.5), (33.5, 12.5), (-30.2, 12.5)]
    create_poly_mesh("Parvis_Terrasse_Eglise", [ch_pt(u, v) for u, v in parvis_terr_uv], 0.06, 0.42, MAT_CHURCH_TRIM, "EGLISE_PORDIC")

    # Warm ochre pedestrian walkway strip crossing Place de l'Eglise toward the central steps
    walk_cx, walk_cy = ch_pt(-38.8, 0.0)
    create_box("Parvis_Allee_Pietonne", (walk_cx, walk_cy, 0.068), (11.2, 5.4, 0.025), MAT_PARVIS_ACCENT, "EGLISE_PORDIC", ch_ang)

    # Wide central granite entrance staircase (6 steps leading up to the West portal!)
    for st_i in range(6):
        u_st = -33.0 + st_i * 0.48
        h_st = 0.08 + st_i * 0.065
        sx_st, sy_st = ch_pt(u_st, 0.0)
        create_box(f"Parvis_Escalier_Marche_{st_i+1}", (sx_st, sy_st, 0.06 + h_st * 0.5), (0.52, 5.0, h_st), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
    # Granite cheek walls flanking the central steps
    for side_s in (-1, 1):
        cx_w, cy_w = ch_pt(-31.6, side_s * 2.75)
        create_box(f"Parvis_Escalier_Muret_{side_s}", (cx_w, cy_w, 0.36), (3.4, 0.42, 0.62), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)

    # Two iconic symmetric curved stone planter beds flanking the steps (prominent on both Google Earth photos!)
    for side_p in (-1, 1):
        # Outer curved granite retaining wall + coping + dark garden soil + evergreen shrubs & warm floral touches
        p_uv = [
            (-32.8, side_p * 3.1),
            (-32.6, side_p * 5.8),
            (-31.9, side_p * 8.4),
            (-30.9, side_p * 10.6),
            (-29.2, side_p * 10.2),
            (-29.6, side_p * 7.6),
            (-30.0, side_p * 5.2),
            (-30.0, side_p * 3.1),
        ]
        if side_p < 0:
            p_uv = list(reversed(p_uv))
        create_poly_mesh(f"Parvis_Jardiniere_Muret_{side_p}", [ch_pt(u, v) for u, v in p_uv], 0.06, 0.62, MAT_CHURCH_TRIM, "EGLISE_PORDIC")
        # Inset dark soil bed slightly higher inside the retaining rim
        s_uv = [
            (-32.4, side_p * 3.5), (-32.2, side_p * 5.8), (-31.6, side_p * 8.1), (-30.8, side_p * 10.1),
            (-29.6, side_p * 9.8), (-30.0, side_p * 7.5), (-30.3, side_p * 5.2), (-30.3, side_p * 3.5),
        ]
        if side_p < 0:
            s_uv = list(reversed(s_uv))
        create_poly_mesh(f"Parvis_Jardiniere_Terre_{side_p}", [ch_pt(u, v) for u, v in s_uv], 0.56, 0.65, MAT_GARDEN_SOIL, "EGLISE_PORDIC")
        # Clipped decorative shrubs & flowers planted along the curved bed
        for k_sh, (u_sh, v_sh, rad_sh, mat_sh) in enumerate([
            (-31.4, 4.3, 0.58, MAT_FOLIAGE_DARK),
            (-31.2, 5.7, 0.50, MAT_FLOWER_ROSE),
            (-31.0, 7.0, 0.62, MAT_FOLIAGE_MID),
            (-30.6, 8.3, 0.48, MAT_FLOWER_GOLD),
            (-30.2, 9.4, 0.55, MAT_FOLIAGE_DARK),
        ], 1):
            shx, shy = ch_pt(u_sh, side_p * v_sh)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad_sh, location=(shx, shy, 0.82))
            sh_o = bpy.context.active_object; sh_o.name = f"Parvis_Massif_{side_p}_{k_sh}"
            sh_o.scale = (1.1, 1.0, 0.68); sh_o.data.materials.append(mat_sh)
            scene.collection.objects.unlink(sh_o); link_obj(sh_o, "VEGETATION")

    # Granite pedestrian bollards (bornes) framing the parvis plaza
    for bi, (bu, bv) in enumerate([
        (-34.2, -9.5), (-34.2, -6.2), (-34.2, -3.2), (-34.2, 3.2), (-34.2, 6.2), (-34.2, 9.5),
        (-31.5, -13.5), (-26.0, -14.2), (-31.5, 13.5), (-26.0, 14.2),
    ], 1):
        bx_b, by_b = ch_pt(bu, bv)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=0.78, location=(bx_b, by_b, 0.44))
        bol = bpy.context.active_object; bol.name = f"Parvis_Borne_{bi:02d}"; bol.data.materials.append(MAT_GRANITE_DARK)
        scene.collection.objects.unlink(bol); link_obj(bol, "EGLISE_PORDIC")

    # Wooden & metal benches on Place de l'Eglise
    for b_idx, (bu, bv, bang_off) in enumerate([
        (-35.2, -7.8, 90.0), (-35.2, 7.8, 90.0),
        (-25.0, -18.5, 0.0), (-15.0, -18.5, 0.0),
    ], 1):
        bx_bn, by_bn = ch_pt(bu, bv)
        add_detailed_bench(f"Banc_Eglise_{b_idx:02d}", bx_bn, by_bn, ch_ang + bang_off)

    # Clean white parking bay markings matching the Google Earth aerial photo!
    # North side parking bays (v ≈ +13.5, u = -21..-5)
    for k_pk in range(6):
        px_p, py_p = ch_pt(-21.0 + k_pk * 2.9, 13.8)
        create_box(f"Parking_Eglise_Nord_{k_pk+1}", (px_p, py_p, 0.072), (0.13, 4.4, 0.015), MAT_LINE_WHITE, "EGLISE_PORDIC", ch_ang)
    # South side parking bays (v ≈ -13.5, u = -16..-2)
    for k_pk in range(5):
        px_p, py_p = ch_pt(-16.0 + k_pk * 3.0, -13.5)
        create_box(f"Parking_Eglise_Sud_{k_pk+1}", (px_p, py_p, 0.072), (0.13, 4.4, 0.015), MAT_LINE_WHITE, "EGLISE_PORDIC", ch_ang)
    # Front square parking bays (Place de l'Eglise, u ≈ -45, v = -5..+5)
    for row_v in (-2.4, 2.4):
        for k_pk in range(5):
            px_p, py_p = ch_pt(-49.0 + k_pk * 2.6, row_v)
            create_box(f"Parking_Place_Eglise_{row_v}_{k_pk+1}", (px_p, py_p, 0.072), (0.13, 4.3, 0.015), MAT_LINE_WHITE, "EGLISE_PORDIC", ch_ang)

    # Semi-circular stepped stone amphitheater / theatre de verdure on the NW side (clearly visible left of church in 2nd photo!)
    amp_cx, amp_cy = ch_pt(-14.5, 29.0)
    # Stone semicircular paved stage floor
    amp_stage = []
    for i_a in range(13):
        a_r = math.radians(-115.0 + 180.0 * i_a / 12.0)
        amp_stage.append(local_to_world(amp_cx, amp_cy, 4.5 * math.cos(a_r), 4.5 * math.sin(a_r), ch_ang))
    create_poly_mesh("Theatre_Verdure_Scene", amp_stage, 0.02, 0.10, MAT_PARVIS, "EGLISE_PORDIC")
    # 5 concentric curved stone tiers rising smoothly toward the lush NW tree grove
    for tier in range(5):
        r_in = 4.6 + tier * 1.15
        r_out = r_in + 1.05
        z_t = 0.10 + (tier + 1) * 0.36
        t_pts_in, t_pts_out = [], []
        for i_a in range(13):
            a_r = math.radians(-15.0 + 170.0 * i_a / 12.0)
            t_pts_in.append(local_to_world(amp_cx, amp_cy, r_in * math.cos(a_r), r_in * math.sin(a_r), ch_ang))
            t_pts_out.append(local_to_world(amp_cx, amp_cy, r_out * math.cos(a_r), r_out * math.sin(a_r), ch_ang))
        ring_poly = t_pts_in + list(reversed(t_pts_out))
        mat_tier = MAT_CHURCH_TRIM if tier % 2 == 0 else MAT_GRANITE_DARK
        create_poly_mesh(f"Theatre_Verdure_Gradin_{tier+1}", ring_poly, 0.05, z_t, mat_tier, "EGLISE_PORDIC")

    # Small historic Breton granite calvaire cross near the NE side of the parvis
    cal_x, cal_y = ch_pt(23.0, 15.2)
    create_box("Calvaire_Eglise_Socle1", (cal_x, cal_y, 0.25), (1.8, 1.8, 0.40), MAT_GRANITE_DARK, "EGLISE_PORDIC", ch_ang)
    create_box("Calvaire_Eglise_Socle2", (cal_x, cal_y, 0.72), (1.1, 1.1, 0.56), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
    create_box("Calvaire_Eglise_Fut", (cal_x, cal_y, 2.35), (0.28, 0.28, 2.8), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
    create_box("Calvaire_Eglise_Bras", (cal_x, cal_y, 3.15), (0.26, 1.25, 0.26), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)

    # Exact ornamental plaza trees & NW mature grove matching both Google Earth photos!
    PLAZA_TREES = [
        # NW corner of parvis right beside the left curved planter
        ("Arbre_Eglise_Parvis_NO", -31.8, 13.0, 1.28, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT),
        # South-side tree cluster lining the square toward the row of town houses (mixing fresh green & warm olive!)
        ("Arbre_Eglise_Sud_01", -11.5, -16.8, 1.12, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT),
        ("Arbre_Eglise_Sud_02", -21.0, -16.8, 1.18, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT, MAT_FOLIAGE_OLIVE),
        ("Arbre_Eglise_Sud_03", -29.2, -16.5, 0.95, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT, MAT_FOLIAGE_OLIVE),
        ("Arbre_Eglise_Sud_04", -17.0, -22.2, 1.05, MAT_FOLIAGE_OLIVE, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT),
        ("Arbre_Eglise_Sud_05", -27.5, -22.8, 1.08, MAT_FOLIAGE_OLIVE, MAT_FOLIAGE_LIGHT, MAT_FOLIAGE_MID),
        ("Arbre_Eglise_Sud_06", -37.2, -23.8, 1.24, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT),
        # Dense mature dark-green grove hugging the NW amphitheater (cleanly beside the stone tiers, zero overlap!)
        ("Arbre_Eglise_Bosquet_01", -19.5, 22.8, 1.48, MAT_FOLIAGE_DARK, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID),
        ("Arbre_Eglise_Bosquet_02", -9.0, 23.2, 1.65, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_DARK),
        ("Arbre_Eglise_Bosquet_03", -1.2, 24.5, 1.50, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_MID),
        ("Arbre_Eglise_Bosquet_04", -25.8, 21.8, 1.20, MAT_FOLIAGE_DARK, MAT_FOLIAGE_MID, MAT_FOLIAGE_LIGHT),
    ]
    for tname, tu, tv, tscale, ma, mb, mc in PLAZA_TREES:
        tx_e, ty_e = ch_pt(tu, tv)
        add_plaza_tree(tname, tx_e, ty_e, tscale, ma, mb, mc)

    # ----------------------------------------------------------
    # 9B. ARCHITECTURE NEO-GOTHIQUE DE L'EGLISE SAINT-PIERRE
    # ----------------------------------------------------------
    # 1. Exact IGN 131-vertex granite base/aisle masonry body (up to z=9.6m) + darker granite plinth
    create_poly_mesh("Murs_Eglise_Soubassement", ch_pts, 0.35, 1.45, MAT_GRANITE_DARK, "EGLISE_PORDIC")
    create_poly_mesh("Murs_Eglise_Saint_Pierre_BasCotes", ch_pts, 1.40, ch_h_aisle, MAT_GRANITE, "EGLISE_PORDIC")

    # Clean lean-to slate roofs (appentis) on both North & South side aisles along the nave!
    for side_a in (-1, 1):
        create_leanto_roof(
            f"Toit_Eglise_BasCote_{side_a}",
            -25.2, 2.6,
            side_a * 4.9, side_a * 10.65,
            z_high=14.4, z_low=ch_h_aisle - 0.15,
            mat_roof=MAT_CHURCH_SLATE, col_name="EGLISE_PORDIC"
        )
        # Sloping stone West facade gablets closing the front of the side aisles!
        wgx, wgy = ch_pt(-25.0, side_a * 7.6)
        create_box(f"Facade_Eglise_BasCote_{side_a}", (wgx, wgy, ch_h_aisle + 1.0), (0.65, 5.2, 2.2), MAT_GRANITE, "EGLISE_PORDIC", ch_ang)
        # Small stone corner pinnacles atop the West outer corners of the side aisles
        px_c, py_c = ch_pt(-25.1, side_a * 10.2)
        create_box(f"Facade_Eglise_ContrefortOuest_{side_a}", (px_c, py_c, ch_h_aisle * 0.55), (1.3, 1.3, ch_h_aisle * 1.12), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.68, radius2=0.05, depth=3.4, location=(px_c, py_c, ch_h_aisle + 1.85))
        cp = bpy.context.active_object; cp.name = f"Facade_Eglise_ClochetonOuest_{side_a}"; cp.data.materials.append(MAT_CHURCH_SPIRE)
        scene.collection.objects.unlink(cp); link_obj(cp, "EGLISE_PORDIC")

    # 4 corner chapels / transept corner wings tucked cleanly into the 4 corners of the Latin cross (with solid granite walls underneath!)
    for c_idx, (cu1, cu2, cv_in, cv_out, ch_top) in enumerate([
        (-2.2, 2.5, 5.0, 13.4, 12.6),
        (-2.2, 2.5, -5.0, -13.4, 12.6),
        (13.5, 18.6, 5.0, 13.4, 12.6),
        (13.5, 18.6, -5.0, -13.4, 12.6),
    ], 1):
        ch_w_pts = [ch_pt(cu1, cv_in), ch_pt(cu2, cv_in), ch_pt(cu2, cv_out), ch_pt(cu1, cv_out)]
        if cv_out < 0:
            ch_w_pts = list(reversed(ch_w_pts))
        create_poly_mesh(f"Murs_Eglise_ChapelleAngle_{c_idx}", ch_w_pts, 0.40, ch_h_aisle, MAT_GRANITE, "EGLISE_PORDIC")
        create_leanto_roof(f"Toit_Eglise_ChapelleAngle_{c_idx}", cu1 - 0.15, cu2 + 0.15, cv_in, cv_out + (0.25 if cv_out > 0 else -0.25), z_high=ch_top, z_low=ch_h_aisle - 0.1, mat_roof=MAT_CHURCH_SLATE)
    # Side choir aisles (u = 19.5..26.5)
    for side_c in (-1, 1):
        create_leanto_roof(f"Toit_Eglise_ChoeurBas_{side_c}", 19.4, 26.8, side_c * 4.8, side_c * 9.8, z_high=13.5, z_low=ch_h_aisle - 0.1, mat_roof=MAT_CHURCH_SLATE)

    # 2. High central nave (u = -22.5 to +26.8, width 10.4m, eave 14.8m, crisp double-pitched gable roof to 21.8m!)
    nave_cx, nave_cy = ch_pt(2.15, 0.0)
    nave_pts = rot_rect(nave_cx, nave_cy, 49.3, 10.4, ch_ang)
    create_poly_mesh("Murs_Eglise_Nef_Centrale", nave_pts, 0.40, 14.8, MAT_GRANITE, "EGLISE_PORDIC")
    create_gable_roof("Toit_Eglise_Nef", nave_cx, nave_cy, 49.3, 10.4, ch_ang, z_eave=14.8, ridge_h=7.0,
                      mat_roof=MAT_CHURCH_SLATE, mat_gable=MAT_GRANITE, mat_ridge=MAT_CHURCH_RIDGE,
                      overhang=0.35, gable_ends=(False, True))

    # 3. Cross transept (u = +8.0, width 28.0m across, length 11.4m, exact same 21.8m ridge height -> crisp Latin cross!)
    tr_cx, tr_cy = ch_pt(8.0, 0.0)
    tr_pts = rot_rect(tr_cx, tr_cy, 11.4, 27.8, ch_ang)
    create_poly_mesh("Murs_Eglise_Transept", tr_pts, 0.40, 14.8, MAT_GRANITE, "EGLISE_PORDIC")
    create_gable_roof("Toit_Eglise_Transept", tr_cx, tr_cy, 27.8, 11.4, ch_ang + 90.0, z_eave=14.8, ridge_h=7.0,
                      mat_roof=MAT_CHURCH_SLATE, mat_gable=MAT_GRANITE, mat_ridge=MAT_CHURCH_RIDGE,
                      overhang=0.35, gable_ends=(True, True))

    # 4. Polygonal East apse / choir (u = +27.4) + cute SE polygonal sacristy turret (visible top-right of aerial photo!)
    ap_cx, ap_cy = ch_pt(27.2, 0.0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=5.0, depth=13.8, location=(ap_cx, ap_cy, 7.3))
    ap_obj = bpy.context.active_object; ap_obj.name = "Murs_Eglise_Abside"; ap_obj.data.materials.append(MAT_GRANITE)
    scene.collection.objects.unlink(ap_obj); link_obj(ap_obj, "EGLISE_PORDIC")
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=5.45, radius2=0.12, depth=6.4, location=(ap_cx, ap_cy, 14.2 + 3.2))
    ap_roof = bpy.context.active_object; ap_roof.name = "Toit_Eglise_Abside"; ap_roof.data.materials.append(MAT_CHURCH_SLATE)
    scene.collection.objects.unlink(ap_roof); link_obj(ap_roof, "EGLISE_PORDIC")
    # SE corner turret / sacristy apsidiole
    tur_x, tur_y = ch_pt(28.5, -6.5)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=2.6, depth=8.2, location=(tur_x, tur_y, 4.5))
    tur_o = bpy.context.active_object; tur_o.name = "Murs_Eglise_Tourelle_Chevet"; tur_o.data.materials.append(MAT_GRANITE)
    scene.collection.objects.unlink(tur_o); link_obj(tur_o, "EGLISE_PORDIC")
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=2.95, radius2=0.08, depth=3.6, location=(tur_x, tur_y, 8.6 + 1.8))
    tur_r = bpy.context.active_object; tur_r.name = "Toit_Eglise_Tourelle_Chevet"; tur_r.data.materials.append(MAT_CHURCH_SLATE)
    scene.collection.objects.unlink(tur_r); link_obj(tur_r, "EGLISE_PORDIC")

    # 5. Buttresses (contreforts) & Gothic Stained-Glass Windows along Nave, Side Aisles & Transepts!
    # Regular granite buttresses along North & South aisle walls + sloped stone caps
    for u_bt in (-20.0, -15.2, -10.4, -5.6, -1.0, 17.5, 22.8):
        for side_b in (-1, 1):
            v_wall = side_b * (10.35 if u_bt < 0 else 9.6)
            bx_c, by_c = ch_pt(u_bt, v_wall)
            create_box(f"Contrefort_Eglise_{u_bt}_{side_b}", (bx_c, by_c, 4.8), (0.92, 0.95, 8.8), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
            cx_cap, cy_cap = ch_pt(u_bt, v_wall + side_b * 0.15)
            create_box(f"Contrefort_Eglise_Pied_{u_bt}_{side_b}", (cx_cap, cy_cap, 2.2), (1.08, 1.15, 3.8), MAT_GRANITE_DARK, "EGLISE_PORDIC", ch_ang)

    # Lower side-aisle pointed lancet stained-glass windows (between buttresses!)
    for u_w in (-17.6, -12.8, -8.0, -3.3, 20.2):
        for side_w in (-1, 1):
            v_w = side_w * (10.32 if u_w < 0 else 9.6)
            add_gothic_window(f"Vitrail_BasCote_{u_w}_{side_w}", u_w, v_w, 3.1, 1.45, 4.3, normal_axis='v', side_sign=side_w)

    # Upper clerestory lancet windows along the high central nave
    for u_cw in (-17.6, -12.8, -8.0, -3.3, 18.0, 22.5):
        for side_w in (-1, 1):
            add_gothic_window(f"Vitrail_Nef_{u_cw}_{side_w}", u_cw, side_w * 5.22, 11.4, 1.25, 2.7, normal_axis='v', side_sign=side_w)

    # Monumental Transept Gable Windows (large triple-lancet + circular rose window on North & South transept ends!)
    for side_t in (-1, 1):
        add_gothic_window(f"Vitrail_Transept_Centre_{side_t}", 8.0, side_t * 13.95, 4.2, 2.1, 7.6, normal_axis='v', side_sign=side_t)
        add_gothic_window(f"Vitrail_Transept_G_{side_t}", 5.3, side_t * 13.95, 4.6, 1.25, 6.2, normal_axis='v', side_sign=side_t)
        add_gothic_window(f"Vitrail_Transept_D_{side_t}", 10.7, side_t * 13.95, 4.6, 1.25, 6.2, normal_axis='v', side_sign=side_t)
        # Rose window medallion in the triangular gable above the lancets
        rx_t, ry_t = ch_pt(8.0, side_t * 13.98)
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=1.45, depth=0.28, location=(rx_t, ry_t, 15.8), rotation=(math.radians(90), 0, math.radians(ch_ang)))
        r_fr = bpy.context.active_object; r_fr.name = f"Rosace_Transept_Cadre_{side_t}"; r_fr.data.materials.append(MAT_CHURCH_TRIM)
        scene.collection.objects.unlink(r_fr); link_obj(r_fr, "EGLISE_PORDIC")
        rx_g, ry_g = ch_pt(8.0, side_t * 14.04)
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=1.18, depth=0.26, location=(rx_g, ry_g, 15.8), rotation=(math.radians(90), 0, math.radians(ch_ang)))
        r_gl = bpy.context.active_object; r_gl.name = f"Rosace_Transept_Verre_{side_t}"; r_gl.data.materials.append(MAT_CHURCH_GLASS)
        scene.collection.objects.unlink(r_gl); link_obj(r_gl, "EGLISE_PORDIC")
        # Transept corner stepped buttresses
        for u_tb in (2.3, 13.7):
            tx_b, ty_b = ch_pt(u_tb, side_t * 13.95)
            create_box(f"Contrefort_Transept_{u_tb}_{side_t}", (tx_b, ty_b, 7.2), (1.15, 1.15, 13.8), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)

    # West facade side-aisle lancet windows (clearly visible flanking the tower in the 2nd photo!)
    for side_f in (-1, 1):
        add_gothic_window(f"Vitrail_FacadeOuest_{side_f}", -25.1, side_f * 7.4, 2.8, 1.45, 4.6, normal_axis='u', side_sign=-1)

    # 6. ICONIC 51.5M NEO-GOTHIC BELL TOWER, GOTHIC PORTAL, CLOCK, LUCARNES & OPENWORK SPIRE!
    tw_cx, tw_cy = ch_pt(-23.6, 0.0)
    # Main square granite tower shaft (8.0m x 8.0m up to z=26.2m)
    create_box("Clocher_Eglise_Tour", (tw_cx, tw_cy, 13.3), (8.0, 8.0, 26.2), MAT_GRANITE, "EGLISE_PORDIC", ch_ang)

    # 3 architectural stringcourse cornices dividing the tower into tiers (z=8.4m, 15.2m, 25.4m)
    for ci, (z_c, s_c, h_c) in enumerate([(8.4, 8.65, 0.45), (15.2, 8.65, 0.45), (25.5, 8.85, 0.65)], 1):
        create_box(f"Clocher_Corniche_{ci}", (tw_cx, tw_cy, z_c), (s_c, s_c, h_c), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)

    # Stepped corner buttresses on all 4 corners of the tower (3 tapering stages!)
    for bx_s in (-3.95, 3.95):
        for by_s in (-3.95, 3.95):
            cx_b, cy_b = local_to_world(tw_cx, tw_cy, bx_s, by_s, ch_ang)
            create_box(f"Clocher_Contrefort_Bas_{bx_s}_{by_s}", (cx_b, cy_b, 4.4), (1.55, 1.55, 8.4), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
            create_box(f"Clocher_Contrefort_Mil_{bx_s}_{by_s}", (cx_b, cy_b, 12.6), (1.30, 1.30, 8.2), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
            create_box(f"Clocher_Contrefort_Haut_{bx_s}_{by_s}", (cx_b, cy_b, 21.0), (1.05, 1.05, 8.6), MAT_GRANITE_DARK, "EGLISE_PORDIC", ch_ang)

    # Neo-gothic West main portal (recessed dark oak double doors + stone archivolts + sharp triangular gablet!)
    p_x, p_y = ch_pt(-27.7, 0.0)
    create_box("Portail_Eglise_Encadrement", (p_x, p_y, 2.9), (0.65, 3.6, 5.2), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
    pd_x, pd_y = ch_pt(-27.95, 0.0)
    create_box("Portail_Eglise_Portes_Chene", (pd_x, pd_y, 2.35), (0.28, 2.4, 3.9), MAT_CHURCH_WOOD, "EGLISE_PORDIC", ch_ang)
    # Pointed tympanum & triangular stone gablet (gable) over the portal
    pt_x, pt_y = ch_pt(-27.92, 0.0)
    create_box("Portail_Eglise_Tympan", (pt_x, pt_y, 4.35), (0.34, 1.75, 1.75), MAT_GRANITE_DARK, "EGLISE_PORDIC", rot_z_deg=ch_ang, rot_x_deg=45.0)
    pg_x, pg_y = ch_pt(-27.82, 0.0)
    create_box("Portail_Eglise_Gable", (pg_x, pg_y, 5.8), (0.52, 2.65, 2.65), MAT_CHURCH_TRIM, "EGLISE_PORDIC", rot_z_deg=ch_ang, rot_x_deg=45.0)

    # Tall gothic lancet window on tower middle tier (West facade, z=9.0 -> 14.5m)
    add_gothic_window("Clocher_Verriere_Ouest", -27.65, 0.0, 9.0, 1.85, 5.2, normal_axis='u', side_sign=-1)

    # Belfry chamber dark louvred lancet openings (abat-son) with granite frames on all 4 faces (z=18.2 -> 24.2m)
    for side in (-1, 1):
        add_gothic_window(f"Clocher_AbatSon_EW_{side}", -23.6 + side * 4.02, 0.0, 18.2, 2.15, 5.6, normal_axis='u', side_sign=side)
        add_gothic_window(f"Clocher_AbatSon_NS_{side}", -23.6, side * 4.02, 18.2, 2.15, 5.6, normal_axis='v', side_sign=side)

    # Tower clock faces on West & South faces (cleanly centered between middle cornice & belfry at z=16.75m!)
    for cl_name, cl_u, cl_v, cl_rot in [
        ("Horloge_Ouest", -27.72, 0.0, ch_ang + 90.0),
        ("Horloge_Sud", -23.6, -4.12, ch_ang),
    ]:
        clx, cly = ch_pt(cl_u, cl_v)
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.92, depth=0.20, location=(clx, cly, 16.75), rotation=(math.radians(90), 0, math.radians(cl_rot)))
        cl_rim = bpy.context.active_object; cl_rim.name = f"Clocher_{cl_name}_Cadre"; cl_rim.data.materials.append(MAT_METAL_DARK)
        scene.collection.objects.unlink(cl_rim); link_obj(cl_rim, "EGLISE_PORDIC")
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.76, depth=0.24, location=(clx, cly, 16.75), rotation=(math.radians(90), 0, math.radians(cl_rot)))
        cl_face = bpy.context.active_object; cl_face.name = f"Clocher_{cl_name}_Cadran"; cl_face.data.materials.append(MAT_CHURCH_CLOCK)
        scene.collection.objects.unlink(cl_face); link_obj(cl_face, "EGLISE_PORDIC")
        # Crisp dark clock hands
        create_box(f"Clocher_{cl_name}_Aiguille1", (clx, cly, 16.95), (0.08, 0.30, 0.45), MAT_METAL_DARK, "EGLISE_PORDIC", cl_rot)
        create_box(f"Clocher_{cl_name}_Aiguille2", (clx, cly, 16.75), (0.42, 0.30, 0.08), MAT_METAL_DARK, "EGLISE_PORDIC", cl_rot)

    # Gothic balustrade parapet gallery at z=26.4m
    create_box("Clocher_Galerie", (tw_cx, tw_cy, 26.45), (8.9, 8.9, 1.25), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)

    # 4 detailed corner pinnacles (clochetons d'angle: square plinth + octagonal spirelet, z=27.0 -> 35.0m)
    for px_s in (-3.75, 3.75):
        for py_s in (-3.75, 3.75):
            pcx, pcy = local_to_world(tw_cx, tw_cy, px_s, py_s, ch_ang)
            create_box(f"Clocher_Pinacle_Base_{px_s}_{py_s}", (pcx, pcy, 28.1), (1.35, 1.35, 2.2), MAT_CHURCH_TRIM, "EGLISE_PORDIC", ch_ang)
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.72, radius2=0.05, depth=6.4, location=(pcx, pcy, 29.2 + 3.2))
            pin = bpy.context.active_object; pin.name = f"Clocher_Pinacle_{px_s}_{py_s}"; pin.data.materials.append(MAT_CHURCH_SPIRE)
            scene.collection.objects.unlink(pin); link_obj(pin, "EGLISE_PORDIC")

    # 4 cardinal gothic lucarnes (gablets) around the base of the octagonal spire (signature Breton neo-gothic detail!)
    for l_idx, (lu_s, lv_s, l_rot) in enumerate([(-3.2, 0.0, ch_ang), (3.2, 0.0, ch_ang), (0.0, -3.2, ch_ang + 90.0), (0.0, 3.2, ch_ang + 90.0)], 1):
        lcx, lcy = local_to_world(tw_cx, tw_cy, lu_s, lv_s, ch_ang)
        create_box(f"Clocher_Lucarne_Base_{l_idx}", (lcx, lcy, 28.4), (0.95, 1.55, 2.8), MAT_CHURCH_TRIM, "EGLISE_PORDIC", l_rot)
        create_box(f"Clocher_Lucarne_Baie_{l_idx}", (lcx, lcy, 28.3), (1.05, 0.85, 2.0), MAT_CHURCH_GLASS, "EGLISE_PORDIC", l_rot)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.05, radius2=0.05, depth=2.6, location=(lcx, lcy, 31.0), rotation=(0, 0, math.radians(l_rot + 45.0)))
        lt = bpy.context.active_object; lt.name = f"Clocher_Lucarne_Coiffe_{l_idx}"; lt.data.materials.append(MAT_CHURCH_SPIRE)
        scene.collection.objects.unlink(lt); link_obj(lt, "EGLISE_PORDIC")

    # Tall slender octagonal stone spire (z=26.9 -> 49.8m) with horizontal stone decorative rings!
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=3.55, radius2=0.14, depth=23.0, location=(tw_cx, tw_cy, 26.9 + 11.5), rotation=(0, 0, math.radians(ch_ang + 22.5)))
    spire = bpy.context.active_object; spire.name = "Clocher_Eglise_Fleche"; spire.data.materials.append(MAT_CHURCH_SPIRE)
    scene.collection.objects.unlink(spire); link_obj(spire, "EGLISE_PORDIC")
    for ri, (z_r, rad_r) in enumerate([(33.0, 2.75), (39.0, 1.88), (44.8, 1.02)], 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=rad_r, depth=0.35, location=(tw_cx, tw_cy, z_r), rotation=(0, 0, math.radians(ch_ang + 22.5)))
        sr = bpy.context.active_object; sr.name = f"Clocher_Fleche_Anneau_{ri}"; sr.data.materials.append(MAT_CHURCH_TRIM)
        scene.collection.objects.unlink(sr); link_obj(sr, "EGLISE_PORDIC")

    # Summit wrought-iron cross culminating at ~51.8m!
    create_box("Clocher_Croix_Mat", (tw_cx, tw_cy, 50.8), (0.14, 0.14, 2.5), MAT_METAL_DARK, "EGLISE_PORDIC", ch_ang)
    create_box("Clocher_Croix_Barre", (tw_cx, tw_cy, 51.35), (0.14, 1.25, 0.14), MAT_METAL_DARK, "EGLISE_PORDIC", ch_ang)

# ==========================================================
# 10. COMPLEXE SPORTIF LOUIS AUFFRAY (STRICTLY INSIDE USER'S RED OUTLINE!)
# ==========================================================
# Complex local grid: East-West axis = -7.8 deg, North-South axis = +82.2 deg
COMP_DEG = -7.8

# Helper: vaulted barrel-arch roof with distinct dark-teal arched gable ends (exact match to Pordic tennis tunnels!)
def create_vaulted_hall(name, cx, cy, length_x, width_y, deg, wall_h, arch_h, mat_wall, mat_roof, mat_end_gable=None, mat_arch_rim=None, col_name="STADE_LOUIS_AUFFRAY"):
    pts = rot_rect(cx, cy, length_x, width_y, deg)
    create_poly_mesh(f"Murs_{name}", pts, 0.04, 0.04 + wall_h, mat_wall, col_name)
    mesh = bpy.data.meshes.new(f"Toit_{name}")
    obj = bpy.data.objects.new(f"Toit_{name}", mesh)
    link_obj(obj, col_name)
    bm = bmesh.new()
    n_arc = 16
    hl = length_x / 2.0 + 0.25
    hw = width_y / 2.0 + 0.25
    z0 = 0.04 + wall_h
    ring_a, ring_b = [], []
    for i in range(n_arc + 1):
        ang = math.pi * i / n_arc
        ly = -hw * math.cos(ang)
        lz = z0 + arch_h * math.sin(ang)
        ring_a.append(bm.verts.new((-hl, ly, lz)))
        ring_b.append(bm.verts.new((hl, ly, lz)))
    for i in range(n_arc):
        f_roof = bm.faces.new([ring_a[i], ring_a[i + 1], ring_b[i + 1], ring_b[i]])
        f_roof.material_index = 0
    f_end1 = bm.faces.new(list(reversed(ring_a)))
    f_end2 = bm.faces.new(ring_b)
    f_end1.material_index = 1
    f_end2.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh); bm.free()
    obj.location = (cx, cy, 0)
    obj.rotation_euler = (0, 0, math.radians(deg))
    obj.data.materials.append(mat_roof)
    obj.data.materials.append(mat_end_gable or mat_roof)
    # Optional teal curved rim around gable ends (signature look of the small covered tennis court!)
    if mat_arch_rim:
        rmesh = bpy.data.meshes.new(f"Arche_{name}")
        robj = bpy.data.objects.new(f"Arche_{name}", rmesh)
        link_obj(robj, col_name)
        bm_a = bmesh.new()
        for side in (-1, 1):
            x_in = side * (hl - 0.55)
            x_out = side * (hl + 0.12)
            r_in, r_out = [], []
            for i in range(n_arc + 1):
                ang = math.pi * i / n_arc
                ly = -(hw + 0.18) * math.cos(ang)
                lz = z0 + (arch_h + 0.22) * math.sin(ang)
                r_in.append(bm_a.verts.new((x_in, ly, lz)))
                r_out.append(bm_a.verts.new((x_out, ly, lz)))
            for i in range(n_arc):
                bm_a.faces.new([r_in[i], r_in[i + 1], r_out[i + 1], r_out[i]])
        bmesh.ops.recalc_face_normals(bm_a, faces=bm_a.faces)
        bm_a.to_mesh(rmesh); bm_a.free()
        robj.location = (cx, cy, 0)
        robj.rotation_euler = (0, 0, math.radians(deg))
        robj.data.materials.append(mat_arch_rim)

# A. SITE GROUND BASE INSIDE THE RED OUTLINE (clean boundary of Complexe Louis Auffray!)
COMPLEX_BASE_POLY = [
    (298.0, 22.0),   # NW corner above tennis courts
    (466.0, 12.0),   # NE corner behind baseball field (forest edge)
    (462.0, -138.0), # East corner behind skatepark
    (392.0, -140.0), # Steps down to Archery range East border
    (390.0, -236.0), # SE corner behind Archery hall
    (342.0, -256.0), # South end past athletics track
    (272.0, -222.0), # SW corner at Rue Pierre de Coubertin roundabout
    (292.0, -40.0),  # Along Rue Pierre de Coubertin
]
create_poly_mesh("Sol_Complexe_Louis_Auffray", COMPLEX_BASE_POLY, -0.01, 0.03, MAT_PRAIRIE_SEC, "STADE_LOUIS_AUFFRAY")

# B. POLE TENNIS (NW inside red outline): 2 BLUE outdoor courts on GREEN surround + white tunnel + large white vaulted hall!
# 1. Two outdoor blue/green tennis courts (long side parallel to Rue Pierre de Coubertin = COMP_DEG + 90!)
t_cx, t_cy = 327.0, 3.5
t_deg = COMP_DEG
create_poly_mesh("Stade_Tennis_Pourtour_Vert", rot_rect(t_cx, t_cy, 38.0, 33.0, t_deg), 0.03, 0.06, MAT_TENNIS_GREEN, "STADE_LOUIS_AUFFRAY")
court_deg = t_deg + 90.0  # Long axis parallel to Rue Pierre de Coubertin (matching Google Earth photo!)
for idx_tc, lx_off in enumerate([-8.2, 8.2], 1):
    cx_c, cy_c = local_to_world(t_cx, t_cy, lx_off, 0.0, t_deg)
    # Blue court playing surface (23.77m x 10.97m)
    create_box(f"Stade_Tennis_Court_Bleu_{idx_tc}", (cx_c, cy_c, 0.068), (24.0, 11.2, 0.02), MAT_TENNIS_BLUE, "STADE_LOUIS_AUFFRAY", court_deg)
    for lx_l, ly_l, sx, sy in [
        (0, 5.5, 24.0, 0.12), (0, -5.5, 24.0, 0.12), (12.0, 0, 0.12, 11.2), (-12.0, 0, 0.12, 11.2),
        (0, 4.1, 24.0, 0.10), (0, -4.1, 24.0, 0.10), (6.4, 0, 0.10, 8.2), (-6.4, 0, 0.10, 8.2), (0, 0, 12.8, 0.10),
    ]:
        wx, wy = local_to_world(cx_c, cy_c, lx_l, ly_l, court_deg)
        create_box(f"Stade_Tennis_Ligne_{idx_tc}_{lx_l}_{ly_l}", (wx, wy, 0.082), (sx, sy, 0.01), MAT_LINE_WHITE, "STADE_LOUIS_AUFFRAY", court_deg)
    create_box(f"Stade_Tennis_Filet_{idx_tc}", (cx_c, cy_c, 0.55), (0.08, 12.2, 0.95), MAT_LINE_WHITE, "STADE_LOUIS_AUFFRAY", court_deg)
# Wire fence surrounding the 2 outdoor tennis courts
t_corners = rot_rect(t_cx, t_cy, 38.2, 33.2, t_deg)
for i in range(4):
    add_wire_fence(f"Grillage_Tennis_{i+1}", t_corners[i], t_corners[(i + 1) % 4], height=2.6, col_name="STADE_LOUIS_AUFFRAY")

# 2. Covered white tennis tunnel (dark slate-teal gable ends + curved teal arch rim!)
create_vaulted_hall("Tunnel_Tennis_Couvert", 323.9, -23.7, 37.5, 18.8, -7.3, wall_h=3.6, arch_h=4.6,
                    mat_wall=MAT_ARCHERY_ROOF, mat_roof=MAT_DOME_WHITE, mat_end_gable=MAT_ARCHERY_ROOF, mat_arch_rim=MAT_DOME_TEAL)

# 3. Tennis club-house link (batiment.26311910) + low white annex on North side of big white hall
b_club = next((b for b in landmarks["stadium_buildings"] if b["id"] == "batiment.26311910"), None)
if b_club:
    create_poly_mesh("Murs_ClubHouse_Tennis", b_club["pts"], 0.04, 3.8, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
    create_flat_roof("Toit_ClubHouse_Tennis", b_club["pts"], 3.8, MAT_SPORT_ROOF, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
# Low white annex wing on North side of large white tennis hall (visible left of white dome on oblique photo!)
anx_x, anx_y = local_to_world(376.5, -19.5, -19.0, 9.0, -7.8)
anx_pts = rot_rect(anx_x, anx_y, 9.0, 18.5, -7.8)
create_poly_mesh("Murs_Annexe_Halle_Tennis", anx_pts, 0.04, 4.2, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
create_flat_roof("Toit_Annexe_Halle_Tennis", anx_pts, 4.2, MAT_DOME_WHITE, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")

# 4. Large white vaulted covered hall East of tennis (white gable + high white barrel arch!)
create_vaulted_hall("Halle_Couverte_Tennis", 376.5, -19.5, 38.5, 36.5, -7.8, wall_h=4.6, arch_h=5.8,
                    mat_wall=MAT_DOME_WHITE, mat_roof=MAT_DOME_WHITE, mat_end_gable=MAT_DOME_WHITE, mat_arch_rim=None)

# C. GRANDE PELOUSE VERTE (ZONE D'HERBE / BASEBALL / JEUX EXTERIEURS) + PETANQUE + SKATEPARK
LAWN_COMPLEX_POLY = [
    (346.0, 18.5),   # NW behind outdoor tennis courts
    (464.5, 12.0),   # NE forest edge
    (458.5, -90.0),  # East edge right up to boulodrome
    (386.0, -90.0),  # SW edge behind North gym
    (393.0, -40.0),  # Behind white vaulted tennis hall
    (346.0, -36.0),  # Along North side of white tennis hall
]
create_poly_mesh("Pelouse_Complexe_Nord", LAWN_COMPLEX_POLY, 0.03, 0.038, MAT_GRASS, "STADE_LOUIS_AUFFRAY")

bb_cx, bb_cy = 422.0, -68.0
for bname, lx, ly, rad in [
    ("Base_Marbre", -14.0, -14.0, 2.6),
    ("Base_1", 4.0, -14.0, 2.2),
    ("Base_2", 4.0, 4.0, 2.2),
    ("Base_3", -14.0, 4.0, 2.2),
    ("Monticule_Lanceur", -5.0, -5.0, 2.0),
]:
    bx, by = local_to_world(bb_cx, bb_cy, lx, ly, COMP_DEG)
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=rad, depth=0.04, location=(bx, by, 0.045))
    bo = bpy.context.active_object; bo.name = f"Baseball_{bname}"; bo.data.materials.append(MAT_TERRE_BATTUE)
    scene.collection.objects.unlink(bo); link_obj(bo, "STADE_LOUIS_AUFFRAY")

# 2. Boulodrome / Petanque gravel alleys
pet_cx, pet_cy = 422.0, -102.0
create_poly_mesh("Boulodrome_Petanque_Sol", rot_rect(pet_cx, pet_cy, 58.0, 17.0, COMP_DEG), 0.03, 0.07, MAT_TRACK_SAND, "STADE_LOUIS_AUFFRAY")
for ly_p in (-7.8, 0.0, 7.8):
    px_p, py_p = local_to_world(pet_cx, pet_cy, 0.0, ly_p, COMP_DEG)
    create_box(f"Boulodrome_Bordure_{ly_p}", (px_p, py_p, 0.14), (56.0, 0.25, 0.18), MAT_WOOD, "STADE_LOUIS_AUFFRAY", COMP_DEG)

# 3. Skatepark ("Skate parc")
sk_cx, sk_cy = 432.0, -124.0
create_poly_mesh("Skatepark_Dalle", rot_rect(sk_cx, sk_cy, 44.0, 15.0, COMP_DEG), 0.03, 0.08, MAT_SKATEPARK, "STADE_LOUIS_AUFFRAY")
for side in (-1, 1):
    rx, ry = local_to_world(sk_cx, sk_cy, side * 16.5, 0.0, COMP_DEG)
    create_box(f"Skatepark_QuarterPipe_{side}", (rx, ry, 0.85), (4.2, 8.5, 1.6), MAT_SKATE_RAMP, "STADE_LOUIS_AUFFRAY", COMP_DEG)
    rx2, ry2 = local_to_world(sk_cx, sk_cy, side * 13.5, 0.0, COMP_DEG)
    create_box(f"Skatepark_Rampe_{side}", (rx2, ry2, 0.45), (3.2, 8.5, 0.3), MAT_SKATE_RAMP, "STADE_LOUIS_AUFFRAY", rot_z_deg=COMP_DEG, rot_y_deg=side * -22)
create_box("Skatepark_Funbox", (sk_cx, sk_cy, 0.55), (6.5, 4.8, 1.0), MAT_SKATE_RAMP, "STADE_LOUIS_AUFFRAY", COMP_DEG)
rlx, rly = local_to_world(sk_cx, sk_cy, 0.0, 4.0, COMP_DEG)
create_box("Skatepark_Rail", (rlx, rly, 0.48), (6.0, 0.10, 0.10), MAT_METAL_DARK, "STADE_LOUIS_AUFFRAY", COMP_DEG)

# D. COMPLEXE SPORTIF "LOUIS AUFFRAY" — TRUE STEPPED MULTI-HEIGHT VOLUMETRY FROM OBLIQUE PHOTO!
# 1. North Hall stepped volumes (East tall gym 11.0m -> West mid hall 6.4m with white facade/windows -> Front dark entry porch 3.8m!)
gn_hi_x, gn_hi_y = local_to_world(352.0, -75.0, 11.0, 0.0, COMP_DEG)
gn_hi_pts = rot_rect(gn_hi_x, gn_hi_y, 24.0, 43.0, COMP_DEG)
create_poly_mesh("Murs_Complexe_Salle_Nord_Haute", gn_hi_pts, 0.04, 11.0, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
create_flat_roof("Toit_Complexe_Salle_Nord_Haute", gn_hi_pts, 11.0, MAT_SPORT_ROOF, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")

gn_lo_x, gn_lo_y = local_to_world(352.0, -75.0, -9.5, 0.0, COMP_DEG)
gn_lo_pts = rot_rect(gn_lo_x, gn_lo_y, 17.5, 43.0, COMP_DEG)
create_poly_mesh("Murs_Complexe_Salle_Nord_Basse", gn_lo_pts, 0.04, 6.2, MAT_WALL_WHITE, "STADE_LOUIS_AUFFRAY")
gn_lo_roof = create_flat_roof("Toit_Complexe_Salle_Nord_Basse", gn_lo_pts, 6.2, MAT_SPORT_ROOF, MAT_WALL_WHITE, "STADE_LOUIS_AUFFRAY")
# Row of dark windows along West white facade of North mid hall (very clear on oblique photo!)
for k in range(8):
    wx_n, wy_n = local_to_world(gn_lo_x, gn_lo_y, -8.82, -16.5 + k * 4.5, COMP_DEG)
    create_box(f"Complexe_Fenetre_Nord_{k+1}", (wx_n, wy_n, 3.0), (0.14, 2.2, 1.9), MAT_WINDOW, "STADE_LOUIS_AUFFRAY", COMP_DEG)
# Skylights on mid roof
for k in range(4):
    sx, sy = local_to_world(gn_lo_x, gn_lo_y, 0.0, -13.0 + k * 8.5, COMP_DEG)
    create_box(f"Complexe_Nord_Lanterneau_{k+1}", (sx, sy, 6.6), (1.8, 1.8, 0.30), MAT_SKYLIGHT, "STADE_LOUIS_AUFFRAY", COMP_DEG, parent=gn_lo_roof)
# Front entrance lobby protruding West toward parking (h=3.8m, dark fascia)
ent_x, ent_y = local_to_world(gn_lo_x, gn_lo_y, -12.0, -11.5, COMP_DEG)
ent_pts = rot_rect(ent_x, ent_y, 9.0, 18.0, COMP_DEG)
create_poly_mesh("Murs_Complexe_Hall_Entree", ent_pts, 0.04, 3.8, MAT_METAL_DARK, "STADE_LOUIS_AUFFRAY")
create_flat_roof("Toit_Complexe_Hall_Entree", ent_pts, 3.8, MAT_ROOF_FLAT_DARK, MAT_WALL_WHITE, "STADE_LOUIS_AUFFRAY")

# 2. South Hall stepped volumes (East tall black-roof gym 10.0m + lower SW wing 5.2m!)
gs_hi_x, gs_hi_y = local_to_world(358.0, -111.0, 6.0, 0.0, COMP_DEG)
gs_hi_pts = rot_rect(gs_hi_x, gs_hi_y, 35.0, 29.0, COMP_DEG)
create_poly_mesh("Murs_Complexe_Salle_Sud_Haute", gs_hi_pts, 0.04, 10.0, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
gs_roof = create_flat_roof("Toit_Complexe_Salle_Sud_Haute", gs_hi_pts, 10.0, MAT_ROOF_FLAT_DARK, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
for k in range(5):
    sx, sy = local_to_world(gs_hi_x, gs_hi_y, -11.0 + k * 5.5, 9.0, COMP_DEG)
    create_box(f"Complexe_Sud_Lanterneau_{k+1}", (sx, sy, 10.42), (1.5, 1.5, 0.30), MAT_SKYLIGHT, "STADE_LOUIS_AUFFRAY", COMP_DEG, parent=gs_roof)

gs_lo_x, gs_lo_y = local_to_world(358.0, -111.0, -20.0, -5.0, COMP_DEG)
gs_lo_pts = rot_rect(gs_lo_x, gs_lo_y, 18.5, 18.5, COMP_DEG)
create_poly_mesh("Murs_Complexe_Aile_SudOuest", gs_lo_pts, 0.04, 5.2, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
create_flat_roof("Toit_Complexe_Aile_SudOuest", gs_lo_pts, 5.2, MAT_ROOF_FLAT_DARK, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")

# 3. Complex front parking lot + central dark hedge + small SW service kiosk + 2 white flagpoles!
pk_cx, pk_cy = 310.0, -76.0
create_poly_mesh("Parking_Complexe_Louis_Auffray", rot_rect(pk_cx, pk_cy, 34.0, 44.0, COMP_DEG), 0.03, 0.065, MAT_PARKING, "STADE_LOUIS_AUFFRAY")
for row_x in (-11.0, 8.0):
    for j in range(12):
        px_l, py_l = local_to_world(pk_cx, pk_cy, row_x, -16.5 + j * 2.9, COMP_DEG)
        create_box(f"Parking_Stade_Ligne_{row_x}_{j}", (px_l, py_l, 0.076), (4.5, 0.14, 0.015), MAT_LINE_WHITE, "STADE_LOUIS_AUFFRAY", COMP_DEG)
hx_p, hy_p = local_to_world(pk_cx, pk_cy, -1.5, -2.0, COMP_DEG)
create_box("Parking_Stade_Haie_Centrale", (hx_p, hy_p, 0.65), (2.2, 28.0, 1.15), MAT_FOLIAGE_DARK, "STADE_LOUIS_AUFFRAY", COMP_DEG)
# Small square utility kiosk at SW corner of parking (clearly visible in oblique photo!)
kx, ky = local_to_world(pk_cx, pk_cy, -12.0, -24.5, COMP_DEG)
create_box("Kiosque_Parking_Stade", (kx, ky, 1.4), (4.2, 4.2, 2.7), MAT_WALL_CREAM, "STADE_LOUIS_AUFFRAY", COMP_DEG)
# 2 tall white flagpoles at complex entrance
for fi, fy_off in enumerate([-19.0, -15.5], 1):
    fx_p, fy_p = local_to_world(pk_cx, pk_cy, -14.0, fy_off, COMP_DEG)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.06, depth=6.5, location=(fx_p, fy_p, 3.3))
    fp = bpy.context.active_object; fp.name = f"Mat_Drapeau_Stade_{fi}"; fp.data.materials.append(MAT_LINE_WHITE)
    scene.collection.objects.unlink(fp); link_obj(fp, "STADE_LOUIS_AUFFRAY")

# E. CLEAN CLOSED OVAL ATHLETICS TRACK + SMOOTH PUMPTRACK + OPEN CITY-STADE (NO USELESS FENCE!) + ARCHERS
# Build a super clean closed stadium oval track centered on IGN terrain_de_sport.84229 (312, -189, ang=82.2 deg)!
ov_cx, ov_cy = 313.0, -189.0
ov_deg = 82.2
def stadium_oval_pts(cx, cy, straight_l, radius, deg, n_seg=20):
    pts_loc = []
    hl = straight_l / 2.0
    for i in range(n_seg + 1):
        a = -math.pi / 2 + math.pi * i / n_seg
        pts_loc.append((hl + radius * math.cos(a), radius * math.sin(a)))
    for i in range(n_seg + 1):
        a = math.pi / 2 + math.pi * i / n_seg
        pts_loc.append((-hl + radius * math.cos(a), radius * math.sin(a)))
    return [local_to_world(cx, cy, lx, ly, deg) for lx, ly in pts_loc]

track_outer = stadium_oval_pts(ov_cx, ov_cy, 52.0, 29.5, ov_deg)
track_inner = stadium_oval_pts(ov_cx, ov_cy, 52.0, 23.0, ov_deg)
create_poly_mesh("Stade_Piste_Athletisme_Ovale", track_outer, 0.03, 0.075, MAT_TRACK_SAND, "STADE_LOUIS_AUFFRAY")
create_poly_mesh("Stade_Piste_Pelouse_Interieure", track_inner, 0.075, 0.095, MAT_PRAIRIE_SEC, "STADE_LOUIS_AUFFRAY")
# Tangent 100m sprint straight extension on East side
spr_x, spr_y = local_to_world(ov_cx, ov_cy, 8.0, -26.2, ov_deg)
create_poly_mesh("Stade_Piste_LigneDroite", rot_rect(spr_x, spr_y, 76.0, 6.2, ov_deg), 0.03, 0.076, MAT_TRACK_SAND, "STADE_LOUIS_AUFFRAY")

# 2. PUMPTRACK DE PORDIC (rich sinuous dark asphalt track with earth embankments inside East/South half of oval!)
pt_waypoints = [
    (326.0, -156.0, 0.30), (333.0, -161.0, 0.62), (334.0, -171.0, 0.36), (333.0, -183.0, 0.70),
    (327.0, -192.0, 0.32), (319.0, -196.0, 0.64), (311.0, -203.0, 0.38), (310.0, -214.0, 0.78),
    (317.0, -223.0, 0.48), (327.0, -221.0, 0.36), (332.0, -212.0, 0.70), (328.0, -203.0, 0.34),
    (322.0, -191.0, 0.58), (324.0, -179.0, 0.36), (320.0, -167.0, 0.64), (321.0, -158.0, 0.32),
]
pm_mesh = bpy.data.meshes.new("Pumptrack_Pordic_Circuit")
pm_obj = bpy.data.objects.new("Pumptrack_Pordic_Circuit", pm_mesh)
link_obj(pm_obj, "STADE_LOUIS_AUFFRAY")
bm_p = bmesh.new()
n_wp = len(pt_waypoints)
hw_t = 1.45
ring_L, ring_R, base_L, base_R = [], [], [], []
for i in range(n_wp):
    p_prev = Vector(pt_waypoints[(i - 1) % n_wp])
    p_curr = Vector(pt_waypoints[i])
    p_next = Vector(pt_waypoints[(i + 1) % n_wp])
    t1 = Vector((p_curr.x - p_prev.x, p_curr.y - p_prev.y, 0)).normalized()
    t2 = Vector((p_next.x - p_curr.x, p_next.y - p_curr.y, 0)).normalized()
    tang = (t1 + t2).normalized()
    perp = Vector((-tang.y, tang.x, 0))
    ring_L.append(bm_p.verts.new((p_curr.x - perp.x * hw_t, p_curr.y - perp.y * hw_t, p_curr.z)))
    ring_R.append(bm_p.verts.new((p_curr.x + perp.x * hw_t, p_curr.y + perp.y * hw_t, p_curr.z)))
    base_L.append(bm_p.verts.new((p_curr.x - perp.x * hw_t * 1.65, p_curr.y - perp.y * hw_t * 1.65, 0.08)))
    base_R.append(bm_p.verts.new((p_curr.x + perp.x * hw_t * 1.65, p_curr.y + perp.y * hw_t * 1.65, 0.08)))
for i in range(n_wp):
    j = (i + 1) % n_wp
    f_top = bm_p.faces.new([ring_L[i], ring_R[i], ring_R[j], ring_L[j]])
    f_top.material_index = 0
    f_s1 = bm_p.faces.new([base_L[i], ring_L[i], ring_L[j], base_L[j]])
    f_s2 = bm_p.faces.new([ring_R[i], base_R[i], base_R[j], ring_R[j]])
    f_s1.material_index = 1
    f_s2.material_index = 1
bmesh.ops.recalc_face_normals(bm_p, faces=bm_p.faces)
bm_p.to_mesh(pm_mesh); bm_p.free()
pm_obj.data.materials.append(MAT_PUMPTRACK)
pm_obj.data.materials.append(MAT_TERRE_BATTUE)

# 3. City-Stade (NO useless wire fences! Clean multisport court with white lines + low end-boards & red goals/hoops!)
f_city = next((f for f in landmarks["sport_fields"] if f["id"] == "terrain_de_sport.84195"), None)
if f_city:
    ccx, ccy = f_city["centroid"]
    cang = f_city["angle_deg"]
    cl, cw = f_city["length"], f_city["width"]
    create_poly_mesh("City_Stade_Sol", f_city["pts"], 0.08, 0.13, MAT_PREAU_SOL, "STADE_LOUIS_AUFFRAY")
    # Crisp white court lines (perimeter + center line)
    for lx_c, ly_c, sx, sy in [(0, cw / 2 - 1.2, cl - 2.4, 0.14), (0, -(cw / 2 - 1.2), cl - 2.4, 0.14),
                               (cl / 2 - 1.2, 0, 0.14, cw - 2.4), (-(cl / 2 - 1.2), 0, 0.14, cw - 2.4),
                               (0, 0, 0.14, cw - 2.4)]:
        wx_c, wy_c = local_to_world(ccx, ccy, lx_c, ly_c, cang)
        create_box(f"City_Stade_Ligne_{lx_c}_{ly_c}", (wx_c, wy_c, 0.145), (sx, sy, 0.015), MAT_LINE_WHITE, "STADE_LOUIS_AUFFRAY", cang)
    # Low solid end-boards behind goals + 2 red goal/basketball hoop combos (open clean sides!)
    for side in (-1, 1):
        gx, gy = local_to_world(ccx, ccy, side * (cl / 2 - 1.0), 0.0, cang)
        create_box(f"City_Stade_Panneau_{side}", (gx, gy, 0.65), (0.16, cw - 2.5, 1.05), MAT_WALL_BASE, "STADE_LOUIS_AUFFRAY", cang)
        create_box(f"City_Stade_But_{side}", (gx, gy, 1.55), (0.65, 3.2, 2.8), MAT_PLAY_RED, "STADE_LOUIS_AUFFRAY", cang)

# 4. Small Red Kids Playground with iconic red rope pyramid (exact match to oblique photo!)
create_box("Complexe_Aire_Jeux_Rouge", (296.0, -135.0, 0.08), (7.2, 7.2, 0.04), MAT_PLAY_RED, "STADE_LOUIS_AUFFRAY", COMP_DEG)
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.2, radius2=0.08, depth=2.8, location=(296.0, -135.0, 1.5))
pyr = bpy.context.active_object; pyr.name = "Complexe_Jeu_Pyramide"; pyr.data.materials.append(MAT_PLAY_RED)
scene.collection.objects.unlink(pyr); link_obj(pyr, "STADE_LOUIS_AUFFRAY")

# 5. COMPAGNIE DES ARCHERS DE PORDIC (sand range + targets + slate-blue hall with teal open shooting bay!)
arch_range_pts = rot_rect(368.0, -182.0, 26.0, 68.0, COMP_DEG)
create_poly_mesh("Archers_Terrain_Tir", arch_range_pts, 0.03, 0.075, MAT_TERRE_BATTUE, "STADE_LOUIS_AUFFRAY")
arch_hall_pts = rot_rect(370.0, -225.0, 27.0, 7.5, COMP_DEG)
create_poly_mesh("Murs_Compagnie_Archers", arch_hall_pts, 0.04, 3.6, MAT_SPORT_WALL, "STADE_LOUIS_AUFFRAY")
create_hipped_roof("Toit_Compagnie_Archers", arch_hall_pts, 3.6, 1.2, MAT_ARCHERY_ROOF, "STADE_LOUIS_AUFFRAY", overhang=0.25, taper=0.20)
# Teal awning strip along the shooting bay facing the range (visible in oblique photo!)
aw_x, aw_y = local_to_world(370.0, -225.0, 0.0, 4.1, COMP_DEG)
create_box("Archers_Auvent_PasDeTir", (aw_x, aw_y, 2.3), (25.0, 1.1, 1.2), MAT_DOME_TEAL, "STADE_LOUIS_AUFFRAY", COMP_DEG)
for idx_t, (lx, ly) in enumerate([(-6, 18), (4, 18), (-4, 4), (6, 4), (0, -12)], 1):
    tx, ty = local_to_world(368.0, -182.0, lx, ly, COMP_DEG)
    create_box(f"Archers_Cible_{idx_t}", (tx, ty, 0.85), (1.3, 0.45, 1.4), MAT_PLAY_YELLOW, "STADE_LOUIS_AUFFRAY", COMP_DEG)

# F. FOREST TREE LINE BEHIND COMPLEX (East edge) + NEAT TREE ALLEE ALONG RUE PIERRE DE COUBERTIN (West edge!)
COMPLEX_TREES = [
    (472, 12, 2.3), (475, -2, 2.6), (473, -18, 2.4), (476, -34, 2.7),
    (472, -50, 2.2), (475, -66, 2.5), (474, -84, 2.6), (472, -102, 2.3),
    (474, -120, 2.5), (471, -136, 2.2), (484, -12, 2.5), (486, -44, 2.7),
    (485, -76, 2.6), (483, -110, 2.4),
]
for idx_ft, (tx, ty, ts) in enumerate(COMPLEX_TREES, 1):
    add_realistic_tree(f"Arbre_Lisiere_Stade_{idx_ft:02d}", tx, ty, ts)

# Neat avenue of small round ornamental trees lining Rue Pierre de Coubertin in front of complex (clearly visible in oblique photo!)
for k in range(18):
    t = k / 17.0
    ax = 290.0 - t * 23.0
    ay = -55.0 - t * 155.0
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.14, depth=2.0, location=(ax, ay, 1.0))
    tr = bpy.context.active_object; tr.name = f"Arbre_Allee_Coubertin_{k+1}_T"; tr.data.materials.append(MAT_TRUNK)
    scene.collection.objects.unlink(tr); link_obj(tr, "STADE_LOUIS_AUFFRAY")
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.55, location=(ax, ay, 2.9))
    cr = bpy.context.active_object; cr.name = f"Arbre_Allee_Coubertin_{k+1}_C"; cr.data.materials.append(MAT_FOLIAGE_DARK)
    scene.collection.objects.unlink(cr); link_obj(cr, "STADE_LOUIS_AUFFRAY")

# Extra town context buildings filling all surroundings around Church, School, Periscolaire & Louis Auffray Complex!
# Merged into just 2 optimized meshes (neutral light-grey walls + neutral grey roofs) for ultra-fast WebGL rendering!
WIDE_IGN_JSON = os.path.join(BASE_DIR, "data", "geo", "ign_bdtopo_wide.geojson")
STAD_IGN_JSON = os.path.join(BASE_DIR, "data", "geo", "ign_stadium_batiments.geojson")
LAT0_G, LON0_G = 48.5702417, -2.8158111
MPD_LAT = 111194.92664455873
MPD_LON = MPD_LAT * math.cos(math.radians(LAT0_G))

def pt_in_poly_2d(x, y, poly):
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

seen_ctx = set(CUSTOM_IDS) | {b["id"] for b in all_ign} | {sb["id"] for sb in landmarks.get("stadium_buildings", [])} | {"batiment.34015442"}

bm_ctx_walls = bmesh.new()
bm_ctx_roofs = bmesh.new()
ctx_added = 0

def append_neutral_building(pts, h):
    if len(pts) < 3:
        return False
    # Wall extrusion
    try:
        bot = [bm_ctx_walls.verts.new((p[0], p[1], 0.0)) for p in pts]
        f_bot = bm_ctx_walls.faces.new(bot)
    except ValueError:
        return False
    bm_ctx_walls.normal_update()
    if f_bot.normal.z > 0:
        f_bot.normal_flip()
    res = bmesh.ops.extrude_face_region(bm_ctx_walls, geom=[f_bot])
    ev = [e for e in res["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm_ctx_walls, verts=ev, vec=(0, 0, h))
    # Simple tapered hipped roof
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    try:
        rbot = [bm_ctx_roofs.verts.new((p[0], p[1], h)) for p in pts]
        rf_bot = bm_ctx_roofs.faces.new(rbot)
    except ValueError:
        return True
    bm_ctx_roofs.normal_update()
    if rf_bot.normal.z > 0:
        rf_bot.normal_flip()
    rres = bmesh.ops.extrude_face_region(bm_ctx_roofs, geom=[rf_bot])
    rv = [e for e in rres["geom"] if isinstance(e, bmesh.types.BMVert)]
    rh = min(1.6, h * 0.32)
    for v in rv:
        v.co.x = cx + (v.co.x - cx) * 0.45
        v.co.y = cy + (v.co.y - cy) * 0.45
        v.co.z = h + rh
    return True

for src_path in (WIDE_IGN_JSON, STAD_IGN_JSON):
    if not os.path.exists(src_path):
        continue
    with open(src_path, "r", encoding="utf-8") as f_ign:
        feats = json.load(f_ign).get("features", [])
    for ft in feats:
        fid = ft.get("id")
        if fid in seen_ctx:
            continue
        geom = ft.get("geometry", {})
        gtype = geom.get("type")
        if gtype == "Polygon":
            ring = geom["coordinates"][0]
        elif gtype == "MultiPolygon":
            ring = geom["coordinates"][0][0]
        else:
            continue
        pts = [((c[0] - LON0_G) * MPD_LON, (c[1] - LAT0_G) * MPD_LAT) for c in ring]
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts = pts[:-1]
        if len(pts) < 3:
            continue
        cx_b = sum(p[0] for p in pts) / len(pts)
        cy_b = sum(p[1] for p in pts) / len(pts)
        # Keep ALL neutral buildings across the full town horizon (especially filling the North / NW / NE background!)
        in_town_view = (-460 <= cx_b <= 540 and -300 <= cy_b <= 480)
        if not in_town_view:
            continue
        # Exclude anything inside our detailed active polygons (School/Perisco, Complex red outline, Church parvis)
        if pt_in_poly_2d(cx_b, cy_b, BLACK_OUTLINE_POLY) or pt_in_poly_2d(cx_b, cy_b, COMPLEX_BASE_POLY):
            continue
        if math.hypot(cx_b + 140.7, cy_b - 63.7) < 34.0:
            continue
        # Also skip small garden sheds (<12 m²) to keep the urban silhouette super clean
        xs_b, ys_b = [p[0] for p in pts], [p[1] for p in pts]
        if (max(xs_b) - min(xs_b)) * (max(ys_b) - min(ys_b)) < 16.0:
            continue
        seen_ctx.add(fid)
        h_b = float((ft.get("properties") or {}).get("hauteur") or 4.5)
        if append_neutral_building(pts, h_b):
            ctx_added += 1

bmesh.ops.recalc_face_normals(bm_ctx_walls, faces=bm_ctx_walls.faces)
bmesh.ops.recalc_face_normals(bm_ctx_roofs, faces=bm_ctx_roofs.faces)
m_cw = bpy.data.meshes.new("Contexte_Bourg_Murs")
o_cw = bpy.data.objects.new("Contexte_Bourg_Murs", m_cw)
link_obj(o_cw, "TERRAIN"); bm_ctx_walls.to_mesh(m_cw); bm_ctx_walls.free(); o_cw.data.materials.append(MAT_WALL_CONTEXT)
m_cr = bpy.data.meshes.new("Contexte_Bourg_Toits")
o_cr = bpy.data.objects.new("Contexte_Bourg_Toits", m_cr)
link_obj(o_cr, "TERRAIN"); bm_ctx_roofs.to_mesh(m_cr); bm_ctx_roofs.free(); o_cr.data.materials.append(MAT_ROOF_CONTEXT)
print(f"Merged {ctx_added} neutral surrounding town buildings into 2 optimized meshes!")

# ==========================================================
# 11. LIGHTING, SAVE, EXPORT GLB & VERIFICATION RENDERS
# ==========================================================
bpy.ops.object.light_add(type='SUN', location=(45, -55, 80))
sun = bpy.context.active_object
sun.name = "Soleil_Naturel"
sun.data.energy = 3.2
sun.rotation_euler = (math.radians(46), math.radians(15), math.radians(32))

world = bpy.data.worlds.new("Ciel_Bretagne")
scene.world = world
world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == 'BACKGROUND'), None)
if bg:
    bg.inputs["Color"].default_value = (0.70, 0.82, 0.95, 1.0)
    bg.inputs["Strength"].default_value = 0.85

bpy.ops.object.camera_add(location=(-235, 10, 62))
cam = bpy.context.active_object
cam.name = "Camera_Aerienne"
direction = Vector((-138, 63, 18)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
cam.data.clip_end = 2500.0
scene.camera = cam

bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
print(f"Saved BLEND: {BLEND_OUT}")

for out_path in (GLB_OUT_ROOT, GLB_OUT_WEB):
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )
    print(f"Exported GLB: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")

scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
# Render 1: Oblique hero view of Eglise Saint-Pierre & Place de l'Eglise (showing portal, steps, planters, amphitheater & trees!)
scene.render.filepath = os.path.join(RENDER_DIR, "vue_eglise.png")
cam.location = Vector((-252, 22, 46))
direction = Vector((-152, 60, 12)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.render.render(write_still=True)
print("Rendered vue_eglise.png")

# Render 2: High aerial view of Eglise Saint-Pierre & Place de l'Eglise (matching user's 1st photo!)
scene.render.filepath = os.path.join(RENDER_DIR, "vue_eglise_dessus.png")
cam.location = Vector((-152, 58, 128))
direction = Vector((-142, 64, 2)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.render.render(write_still=True)
print("Rendered vue_eglise_dessus.png")

# Render 3: Exact final panoramic framing requested by user (Church left, School center, Complex top-right, full background!)
scene.render.filepath = os.path.join(RENDER_DIR, "vue_bourg_complet.png")
cam.location = Vector((-192, -312, 166))
direction = Vector((86, -4, 6)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.render.render(write_still=True)
print("Rendered vue_bourg_complet.png")
