from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[1]
atlas=Image.new('RGBA',(192*8,128*6));frames={}
for n in range(1,47):
 im=Image.open(root/f'assets/saibaman-original/Saibaman {n}.png').convert('RGBA')
 key=im.getpixel((0,0))[:3]
 # A cor roxa uniforme é a chave de transparência do pacote.
 im.putdata([(r,g,b,0 if (r,g,b)==key else a) for r,g,b,a in im.getdata()])
 x=((n-1)%8)*192;y=((n-1)//8)*128;atlas.paste(im,(x,y))
 frames[str(n)]={'x':x,'y':y,'w':im.width,'h':im.height,'pivot':16 if n in [38,39,40] else im.width/2}
atlas.save(root/'assets/saibaman-atlas.png')
(root/'assets/saibaman-atlas.json').write_text(json.dumps(frames,indent=2)+'\n')
