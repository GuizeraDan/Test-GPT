"""Recorta a folha enviada, preservando arte, pivôs e branco interno dos sprites."""
from pathlib import Path
from collections import deque
import json
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'assets/gogeta-original.png').convert('RGBA')
# Limites entre as nove poses; todos os pés compartilham a mesma linha.
bounds=[0,183,400,690,959,1213,1480,1718,2012,2172]
pivots=[95,299,547,811,1066,1335,1600,1864,2102]
times=[140,160,200,200,180,180,160,240,280]
atlas=Image.new('RGBA',(360*9,360))
for i,(left,right) in enumerate(zip(bounds,bounds[1:])):
    crop=source.crop((left,190,right,539));w,h=crop.size;px=crop.load();seen=set();queue=deque()
    def add(x,y):
        if not(0<=x<w and 0<=y<h) or (x,y) in seen:return
        seen.add((x,y));r,g,b,a=px[x,y]
        if min(r,g,b)>=230 and max(r,g,b)-min(r,g,b)<=20:queue.append((x,y))
    for x in range(w):add(x,0);add(x,h-1)
    for y in range(h):add(0,y);add(w-1,y)
    while queue:
        x,y=queue.popleft();px[x,y]=(0,0,0,0)
        add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1)
    atlas.paste(crop,(i*360+180-(pivots[i]-left),350-h))
atlas.save(root/'assets/gogeta-transform.png')
metadata={'source':'gogeta-original.png','width':360,'height':360,'columns':9,'rows':1,'frames':[{'index':i,'x':i*360,'y':0,'width':360,'height':360,'duration':ms} for i,ms in enumerate(times)]}
(root/'assets/gogeta-transform.json').write_text(json.dumps(metadata,indent=2)+'\n')
