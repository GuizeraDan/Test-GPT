"""Convert the current web atlases into a native Godot animation catalog."""
from pathlib import Path
import json,re,subprocess,shutil
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'godot';assets=ROOT/'assets'
source=(ROOT/'app.js').read_text()
def js_object(name,end):
 expr=source.split('const '+name+'=',1)[1].split(end,1)[0]
 return json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify('+expr+'))'],text=True))
goku=js_object('GOKU_CLIPS',';\nvar gokuAnimator')
cell=js_object('CELL_CLIPS',';\nvar cellArt')
cards=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CARDS} from './game.js';console.log(JSON.stringify(CARDS));"],cwd=ROOT,text=True))
(OUT/'data/cards.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2))
entries=[];clips={}
def add(key,im,duration=100,pivot=None,scale=1):
 im=im.convert('RGBA');index=len(entries);entries.append(im)
 return dict(index=index,duration=duration/1000,pivot=list(pivot or (im.width/2,im.height)),scale=scale)
def remove_border(im,threshold=244):
 im=im.copy().convert('RGBA');p=im.load();w,h=im.size;seen=set();q=deque()
 def visit(x,y):
  if not(0<=x<w and 0<=y<h) or (x,y) in seen:return
  seen.add((x,y))
  if min(p[x,y][:3])>=threshold:q.append((x,y))
 for x in range(w):visit(x,0);visit(x,h-1)
 for y in range(h):visit(0,y);visit(w-1,y)
 while q:
  x,y=q.popleft();p[x,y]=(*p[x,y][:3],0)
  for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:visit(a,b)
 return im
sheet=Image.open(assets/'goku-original.png');z=sheet.width/731
for key,frames in goku.items():
 clips[key]=[]
 for f in frames:
  x,y,w,h,ms=f[:5];im=remove_border(sheet.crop((round(x*z),round(y*z),round((x+w)*z),round((y+h)*z))))
  pivot=((f[5]-x)*z if len(f)>5 else im.width/2,im.height)
  clips[key].append(add(key,im,ms,pivot,3.85/z))
for key,prefix in [('idle','goku-idle-ase'),('ssjIdle','goku-ssj-idle-ase'),('beam','base-kame-ase'),('kienzan','kienzan-throw'),('disc','kienzan-disc'),('gogeta','gogeta-transform')]:
 meta=json.loads((assets/(prefix+'.json')).read_text());sheet=Image.open(assets/(prefix+'.png'));clips[key]=[]
 for f in meta['frames']:
  im=sheet.crop((f['x'],f['y'],f['x']+f['width'],f['y']+f['height']))
  clips[key].append(add(key,im,f['duration'],scale=2.53 if key!='gogeta' else 220/f['height']))
clips['gogetaIdle']=[clips['gogeta'][-1]]
rajada=remove_border(Image.open(assets/'rajada-action-original.jpg'),237);p=rajada.load()
for l,r,t,b in [(579,635,15,136),(873,946,12,137)]:
 for y in range(t,b):
  for x in range(l,r):
   red,g,blue,a=p[x,y]
   if 60<red<240 and g<135 and blue<135 and red>g*1.5 and red>blue*1.5:p[x,y]=(red,g,blue,0)
rects=[[30,0,110,151,120,80.5],[165,0,150,151,160,231.5],[335,0,135,151,100,384.5],[470,0,165,151,220,512.5],[640,0,125,151,100,683],[775,0,171,151,220,815]]
clips['blast']=[add('blast',rajada.crop((x,y,x+w,y+h)),ms,(anchor-x,h),1.027) for x,y,w,h,ms,anchor in rects]
for key in ['projectile','impact','muzzle']:
 im=Image.open(assets/f'ki-{key}-original.png').convert('RGBA');pixels=list(im.getdata());matte=pixels[0];im.putdata([(r,g,b,0 if (matte[3]>240 and max(abs(r-matte[0]),abs(g-matte[1]),abs(b-matte[2]))<40) or a<=8 else a) for r,g,b,a in pixels]);im=im.crop(im.getbbox());clips[key]=[add(key,im,100,scale=1)]
sheet=Image.open(assets/'goku-original.png');clips['beamFx']=[add('beamFx',remove_border(sheet.crop(tuple(round(v*z) for v in (303,674,563,765)))),500)]
sheet=Image.open(assets/'super-impact-original.png');clips['superImpact']=[]
for i,ms in enumerate([65,65,80,90,100,110,120,140,150,180]):
 x,y=i%5,i//5;im=sheet.crop((round(x*sheet.width/5),round(y*sheet.height/2),round((x+1)*sheet.width/5),round((y+1)*sheet.height/2)));clips['superImpact'].append(add('superImpact',im,ms))
sheet=Image.open(assets/'battle-atlas.png');clips['vegeta']=[]
for col in [1,2,3]:
 im=sheet.crop((col*sheet.width//4,sheet.height//2,(col+1)*sheet.width//4,sheet.height));clips['vegeta'].append(add('vegeta',im,250,scale=170/im.height))
# Pack cropped sprites with a small transparent gutter.
x=y=row=0;positions=[];width=2048
for im in entries:
 if x+im.width+2>width:x=0;y+=row+2;row=0
 positions.append([x,y,im.width,im.height]);x+=im.width+2;row=max(row,im.height)
atlas=Image.new('RGBA',(width,y+row))
for im,(x,y,w,h) in zip(entries,positions):atlas.paste(im,(x,y))
atlas.save(OUT/'assets/goku-atlas.png')
for frames in clips.values():
 for f in frames:
  if 'index' in f:f['rect']=positions[f.pop('index')]
(OUT/'data/goku.json').write_text(json.dumps(clips,separators=(',',':')))
shutil.copy2(assets/'cell-atlas.png',OUT/'assets/cell-atlas.png')
cellframes=json.loads((assets/'cell-atlas.json').read_text());result={}
for key,c in cell.items():
 result[key]={**c,'frames':[dict(rect=[f['x'],f['y'],f['w'],f['h']],pivot=[f['pivotX'],f['pivotY']],scale=.87,duration=c.get('ms',f['duration'])/1000) for n in c['frames'] for f in [cellframes[n]]]}
for key in ['projectile','073','114','115','121','122','123','124','153']:
 f=cellframes[key];result[key]={'name':key,'frames':[dict(rect=[f['x'],f['y'],f['w'],f['h']],pivot=[f['pivotX'],f['pivotY']],scale=1,duration=f['duration']/1000)]}
(OUT/'data/cell.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
scene=Image.open(assets/'temple-original.png').convert('RGBA');arch=scene.crop((0,0,368,273));arch.putdata([(r,g,b,0 if g>55 and g>r+25 and g>b+25 else a) for r,g,b,a in arch.getdata()]);background=scene.crop((369,0,625,255)).resize((1280,440),Image.Resampling.NEAREST);background.alpha_composite(arch.resize((1280,440),Image.Resampling.NEAREST));background.save(OUT/'assets/temple.png')
print('Godot: sprites, scene, Cell animations and card data exported')
