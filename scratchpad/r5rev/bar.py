from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
O=S+'/review-ui-icons-r5'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
sx=[14,266,518,770]
BG=(16,17,22,255)
fr=Image.open(f'{S}/staging/ui_icons/skill_slot_steel.png').convert('RGBA')
fa=Image.open(f'{S}/staging/ui_icons/skill_slot_steel_active.png').convert('RGBA')
bar=Image.new('RGBA',(4*60+8+4*60,64),BG)
# his slots 240x245 -> 56
for i,k in enumerate(ids):
    hs=ref.crop((sx[i],256,sx[i]+240,501)).resize((56,56),Image.LANCZOS)
    bar.paste(hs,(4+i*60,4))
    ic=Image.open(f'{S}/staging/ui_icons/{k}.png').convert('RGBA')
    s=Image.new('RGBA',(56,56),(15,17,22,255)); s.alpha_composite(ic,(6,6)); s.alpha_composite(fa if i==1 else fr)
    bar.alpha_composite(s,(4+4*60+8+i*60,4))
bar=bar.convert('RGB')
bar.save(f'{O}/bar-his-left-ours-right-1x.png')
for z in (2,3,4):
    bar.resize((bar.width*z,bar.height*z),Image.NEAREST).save(f'{O}/bar-his-left-ours-right-x{z}.png')
# 1600x900-like context: put the 1x bar in a 400x120 crop of dark screen, then upscale x2 for viewing (simulates seeing on screen)
