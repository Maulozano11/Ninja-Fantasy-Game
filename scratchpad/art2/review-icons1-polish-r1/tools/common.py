from PIL import Image
import numpy as np
REF='/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg'
ST='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
OUT='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-icons1-polish-r1/'
IDS=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
# my own boxes: inner window x0..x1 exclusive, measured from his dark inner lines
X0=[33,285,537,789]
def his_crop(i):
    im=Image.open(REF).convert('RGB')
    x=X0[i]
    return im.crop((x,276,x+201,482))
def box(im,n):
    return im.resize((n,n),Image.BOX)
def ours(i,two=False):
    return Image.open(ST+IDS[i]+('@2x' if two else '')+'.png').convert('RGBA')
def srgb2lin(c):
    c=c/255.0
    return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def oklab(a):
    l=srgb2lin(a[...,:3].astype(float))
    M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
    lms=l@M1.T
    lms=np.cbrt(lms)
    M2=np.array([[0.2104542553,0.7936177850,-0.0040720468],[1.9779984951,-2.4285922050,0.4505937099],[0.0259040371,0.7827717662,-0.8086757660]])
    return lms@M2.T
def zoom(im,k):
    return im.resize((im.width*k,im.height*k),Image.NEAREST)
