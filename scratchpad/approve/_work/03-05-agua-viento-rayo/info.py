"""Spanish names, descriptions and per-element settings."""
ELEMS = {
    'water': dict(num='03', es='Agua', file='03-agua', accent=(120, 205, 255, 255), footer=[
        'Fíjate: la espuma de la punta del corte y la corona del géiser (fotogramas 3 y 4) tocan el borde de arriba y se ven cortadas;',
        'el anillo exterior del géiser roza el borde de abajo y la punta de un cristal de hielo toca el borde derecho.']),
    'wind': dict(num='04', es='Viento', file='04-viento', accent=(150, 232, 196, 255), footer=[
        'Fíjate: la punta del tornado se corta arriba en los fotogramas 5 y 6; sobre la hierba, el viento verde contrasta poco.']),
    'lightning': dict(num='05', es='Rayo', file='05-rayo', accent=(178, 196, 255, 255),
                      state='pulido sin terminar', gif_state='pulido sin terminar', footer=[
        'Sin terminar: el aliento se sale del sprite por arriba y por abajo (queda cortado en recto) y la aguja derecha del múltiple se corta;',
        'el rayo de la explosión nace a 1,3 m del suelo (por debajo de la cabeza del personaje) y varios arcos se cortan en los lados.']),
}
ROLE_ES = {
    'bolt': 'Proyectil', 'stream': 'Chorro', 'breath': 'Aliento', 'sphere': 'Esfera',
    'slash': 'Corte', 'multi': 'Múltiple', 'hit': 'Impacto', 'blast': 'Explosión',
    'wall': 'Muro', 'aura': 'Aura',
}
DESC = {
    'water': dict(bolt='bala de agua', stream='torrente', breath='abanico a presión', sphere='bomba de agua',
                  slash='ola en media luna', multi='fragmentos de hielo', hit='salpicadura', blast='géiser',
                  wall='muro de agua', aura='funda de agua'),
    'wind': dict(bolt='disco de viento', stream='cuchillas de aire en fila', breath='cono de ráfaga',
                 sphere='bola de aire comprimido', slash='doble cuchilla de aire', multi='hojas cortantes',
                 hit='cortes en X', blast='tornado', wall='muro de aire', aura='remolino'),
    'lightning': dict(bolt='bola de chispas', stream='rayo continuo', breath='cono de cinco rayos',
                      sphere='esfera de trueno', slash='media luna eléctrica', multi='agujas de trueno',
                      hit='estallido de chispas', blast='rayo que cae', wall='valla eléctrica',
                      aura='carga eléctrica'),
}
# key frame shown on the sheet: (anim, frame)
KEY = {
    'water': dict(hit=('hit', 2), blast=('blast', 4)),
    'wind': dict(hit=('hit', 3), blast=('blast', 4)),
    'lightning': dict(hit=('hit', 2), blast=('blast', 3)),
}
