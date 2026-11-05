from pathlib import Path
import base64
root=Path(__file__).parent
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
game=(root/'game.js').read_text().replace('export ','')
app=(root/'app.js').read_text().split('\n',1)[1]
html=html.replace('<link rel="stylesheet" href="/style.css">','<style>'+css+'</style>')
html=html.replace('<script type="module" src="/app.js"></script>','<script>'+game+'\n'+app+'</script>')
html=html.replace('href="/"','href="#"')
for image in (root/'assets').glob('*.png'):
    html=html.replace('/assets/'+image.name,'data:image/png;base64,'+base64.b64encode(image.read_bytes()).decode())
(root/'Kame-Duel.html').write_text(html)
print('HTML independente atualizado')
