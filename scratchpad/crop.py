import numpy as np
from PIL import Image
img = Image.open("longview-logo.png")
a = np.asarray(img)[...,3].astype(np.float32)
col = a.sum(0); row = a.sum(1)
# keep rows/cols whose alpha mass exceeds 0.5% of the max — drops stray specks
cx = np.where(col > col.max()*0.02)[0]
ry = np.where(row > row.max()*0.02)[0]
pad = 10
l,r = max(0,cx.min()-pad), min(img.width, cx.max()+pad)
t,b = max(0,ry.min()-pad), min(img.height, ry.max()+pad)
tight = img.crop((l,t,r,b))
tight.save("longview-logo.png")
print("tight:", tight.size, "aspect %.2f" % (tight.width/tight.height))
import os; print("bytes:", os.path.getsize("longview-logo.png"))
