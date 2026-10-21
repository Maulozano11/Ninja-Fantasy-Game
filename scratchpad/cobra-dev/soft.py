import numpy as np
from hsv import hsv
LUMA=np.array([0.3,0.55,0.15])
def ramp(x,a,b): return np.clip((x-a)/(b-a),0,1)
def soft_counts(rgb, m, split=32.0):
    h,s,_=hsv(rgb); lum=rgb@LUMA
    hr=np.where(h>=180,h-360,h)  # -180..180
    sat=ramp(s,0.3,0.5)
    red=sat*ramp(hr,-36,-24)*ramp(-hr,-split-6,-split+6)*ramp(lum,10,20)
    och=sat*ramp(h,split-6,split+6)*ramp(-h,-56,-44)*ramp(lum,20,30)
    return float(red[m].sum()), float(och[m].sum())
