import sys
from PIL import Image
d, anim, bg = sys.argv[1], sys.argv[2], sys.argv[3]
ims = [Image.open(f'{d}/f-{anim}{i}-{bg}.png').convert('RGB') for i in range(6)]
ims = [im.resize((im.width // 2, im.height // 2), Image.NEAREST) for im in ims]
ims[0].save(f'{d}/prev-{anim}.gif', save_all=True, append_images=ims[1:], duration=83, loop=0)
