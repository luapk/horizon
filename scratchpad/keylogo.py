import numpy as np
from PIL import Image, ImageFilter

src = "/root/.claude/uploads/97587b0f-060e-5062-b210-277ac6b99364/c7750a7e-25804.png"
im = Image.open(src).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
lum = 0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2]

# Flat-field: estimate the smooth background glow with a big blur, subtract it.
lum_img = Image.fromarray(np.clip(lum,0,255).astype(np.uint8))
bg_est = np.asarray(lum_img.filter(ImageFilter.GaussianBlur(70))).astype(np.float32)
detail = np.clip(lum - bg_est, 0, 255)
# keep the pure-white letters at full strength (they read ~255 even after subtraction near edges)
detail = np.maximum(detail, np.clip(lum-180,0,255))  # letters/line/dot core stay solid

lo, hi = 14.0, 130.0
alpha = np.clip((detail - lo)/(hi - lo), 0, 1) ** 0.9

out = np.zeros((*alpha.shape,4), np.uint8)
out[...,:3] = 255
out[...,3] = (alpha*255).astype(np.uint8)
img = Image.fromarray(out, "RGBA")
l,t,r,b = img.getbbox(); pad=16
img = img.crop((max(0,l-pad),max(0,t-pad),min(img.width,r+pad),min(img.height,b+pad)))
if img.width>1200:
    h=round(img.height*1200/img.width); img=img.resize((1200,h), Image.LANCZOS)
img.save("longview-logo.png"); print("keyed:", img.size)

# previews on gradient + on light band to check for residual haze
def grad(w,h,light=False):
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    base=np.zeros((h,w,3),np.float32); base[:]=(5,7,15) if not light else (150,140,180)
    def orb(cx,cy,rad,col,inten):
        d=np.sqrt((xx-cx)**2+(yy-cy)**2); m=np.clip(1-d/rad,0,1)**2*inten
        for i in range(3): base[...,i]+=m*col[i]
    if not light:
        orb(w*0.15,h*0.2,w*0.55,(143,184,255),0.24); orb(w*0.85,h*0.65,w*0.55,(179,157,255),0.22); orb(w*0.5,h*1.0,w*0.55,(242,166,201),0.18)
    return Image.fromarray(np.clip(base,0,255).astype(np.uint8)).convert("RGBA")
for name,light in [("logo_on_gradient.png",False),("logo_on_light.png",True)]:
    W,H=1200,260; bg=grad(W,H,light); s=(W*0.6)/img.width
    lg=img.resize((int(img.width*s),int(img.height*s)),Image.LANCZOS)
    bg.alpha_composite(lg,(int((W-lg.width)/2),int((H-lg.height)/2)))
    bg.convert("RGB").save(name)
print("previews saved")
