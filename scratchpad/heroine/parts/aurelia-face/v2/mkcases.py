"""Write the cases files for many.mts."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
poses = [('idle', 0, 'quieta'), ('attack', 0, 'ataque 0'), ('attack', 1, 'ataque 1'), ('attack', 2, 'ataque 2'), ('cast', 0, 'conjuro'),
         ('hurt', 0, 'herida'), ('victory', 0, 'victoria'), ('charge', 0, 'carga'), ('walk', 0, 'caminar'), ('run', 0, 'correr'),
         ('crouch', 0, 'agachada'), ('sneak', 0, 'sigilo'), ('downed', 0, 'derribada'), ('sit', 0, 'sentada'), ('read', 0, 'leer'),
         ('lean', 0, 'apoyada'), ('train', 0, 'entrenar'), ('handsigns', 0, 'sellos'), ('throw', 0, 'lanzar'), ('pierce', 0, 'estocada')]
hair = {'hair': {'id': 'hair_ribbon', 'colors': ['#e8c27a', '#c8202c']}}
cases = [{'name': n, 'body': 'female', 'pose': p, 'frame': f, 'look': {'slots': hair}} for p, f, n in poses]
json.dump(cases, open(os.path.join(D, 'cases-poses.json'), 'w'))
bodies = []
for b, n in (('female', 'mujer'), ('slender', 'esbelta'), ('male', 'hombre'), ('bulky', 'robusto')):
    bodies.append({'name': n, 'body': b, 'pose': 'idle', 'frame': 0})
    bodies.append({'name': n + ' (leer)', 'body': b, 'pose': 'read', 'frame': 0})
    bodies.append({'name': n + ' (derribado)', 'body': b, 'pose': 'downed', 'frame': 0})
bodies.append({'name': 'cabeza Aiden', 'body': 'male', 'pose': 'idle', 'frame': 0, 'look': {'faceShape': 'valiant'}})
bodies.append({'name': 'cara suave', 'body': 'female', 'pose': 'idle', 'frame': 0, 'look': {'faceShape': 'soft'}})
bodies.append({'name': 'cara cuadrada', 'body': 'female', 'pose': 'idle', 'frame': 0, 'look': {'faceShape': 'square'}})
json.dump(bodies, open(os.path.join(D, 'cases-bodies.json'), 'w'))
colors = []
for c, n in (('#226ba3', 'su azul'), ('#3b82f6', 'azul'), ('#38bdf8', 'celeste'), ('#22c55e', 'verde'), ('#a16207', 'ámbar'),
             ('#5b3a29', 'marrón'), ('#6b7280', 'gris'), ('#d81b2a', 'rojo'), ('#7c3aed', 'violeta'), ('#e5e7eb', 'blanco')):
    colors.append({'name': n, 'body': 'female', 'pose': 'idle', 'frame': 0, 'look': {'eyeColor': c}})
for s, n in (('tomoe1', 'especial 1'), ('tomoe3', 'especial 3'), ('pinwheel', 'especial rueda'), ('pale', 'pálidos'), ('paleVeins', 'pálidos venas'), ('sage', 'sabio')):
    colors.append({'name': n, 'body': 'female', 'pose': 'idle', 'frame': 0, 'special': s})
json.dump(colors, open(os.path.join(D, 'cases-colors.json'), 'w'))
