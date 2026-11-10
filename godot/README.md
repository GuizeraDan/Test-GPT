# Kame Duel — Godot / Web

Primeira etapa da migração nativa. Regras e interface executam em GDScript; o navegador executa o export WebAssembly do Godot. A versão JavaScript e seu editor de sprites continuam disponíveis na raiz.

## Testar no navegador

Publicação: https://guizeradan.github.io/Test-GPT/godot/

O laboratório abre com Goku × Cell. Escolha a habilidade e clique em **Reproduzir**, ou clique em uma carta. Para os movimentos do Cell, selecione **Reproduzir → Inimigo**. Pausa, avanço, velocidade e reinício estão na barra superior. **Partida por turnos** inicia Goku × Vegeta com cartas e CPU.

O primeiro carregamento baixa cerca de 39 MB. Não abra o `index.html` exportado com `file://`: use a publicação ou um servidor HTTP.

## Desenvolver

Requisitos: Godot **4.6.3** (executável `godot` no PATH), Python 3 e curl para instalar os templates; Node.js 22+ para o servidor/testes existentes. Pillow só é necessário para reexportar os assets.

Todos os comandos abaixo partem da raiz do repositório:

```bash
# Instala apenas os templates oficiais Web sem threads (~20 MB).
python3 tools/setup_godot_web.py

# Importa o projeto e exporta o jogo; usa .toolchain/ para dados do Godot.
bash tools/build_godot_web.sh

# Abre o jogo em http://localhost:3000/godot/
npm start
```

Para editar no Godot: importe `godot/project.godot`, ou execute `godot --editor --path godot`. O editor visual normalmente abre como aplicativo; o fluxo deste ambiente é editar os fontes aqui, exportar e testar no navegador. O jogo Web não inclui o editor Godot.

O script de build encontra os templates em `.toolchain/share/`. Para exportar pelo editor gráfico usando os mesmos templates, abra-o com as variáveis abaixo. Alternativamente, instale os templates pela opção **Editor → Manage Export Templates** do próprio Godot.

```bash
export XDG_DATA_HOME="$PWD/.toolchain/share"
export XDG_CONFIG_HOME="$PWD/.toolchain/config"
export XDG_CACHE_HOME="$PWD/.toolchain/cache"
godot --editor --path godot
```

`tools/setup_godot_web.py` lê o diretório ZIP remoto do pacote oficial, baixa apenas os dois templates necessários e verifica tamanho e CRC. Não instala binários do motor. Cache, templates e export gerado ficam fora do Git da branch de desenvolvimento.

## Arquivos principais

- `scripts/main.gd`: interface, seleção, cartas, controle do laboratório e CPU.
- `scripts/battle_model.gd`: regras, turnos, recursos, defesas e dano.
- `scripts/arena.gd`: relógio, poses, deslocamentos, efeitos e eventos de impacto.
- `data/`: cartas, retângulos, pivôs e duração dos quadros.
- `assets/`: atlases nativos e cenário derivados das fontes existentes.
- `export_presets.cfg`: preset Web sem threads.
- [SPECs](../specs/README.md): comportamento esperado e limites da migração.

Para regenerar atlases depois de modificar os assets originais/exportados:

```bash
python3 tools/export_godot_assets.py
bash tools/build_godot_web.sh
```

O exportador usa os dados atuais de `app.js`, `game.js` e dos atlases na raiz. Não lê ajustes salvos no localStorage nem pacotes do editor anterior. Os originais não são alterados.

## Validar

```bash
npm test
node tools/test_godot_parity.mjs
godot --headless --path godot --script tests/test_model.gd
godot --headless --path godot --script tests/test_animations.gd
```

O primeiro teste Godot compara 128 cenários com o motor JavaScript. O segundo verifica 62 sequências e os contratos de pausa, avanço, reinício, forma e impactos. Execute a importação do build antes dos testes em um checkout novo.

Para testar o export real com Playwright Core instalado fora do projeto:

```bash
PLAYWRIGHT_CORE_PATH=/caminho/node_modules/playwright-core/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium node tools/test_godot_web.mjs
```

O teste abre seu próprio servidor local, usa `?test=1` e encerra servidor/navegador ao terminar. A ponte de automação não é ativada no endereço normal do jogo.

## Próximas etapas

Portar o editor de animação, importação/salvamento, Aang e Saibaman; revisar escalas, poses e tempos na arena; adaptar a interface para telas menores. Esses recursos continuam funcionando na versão anterior enquanto a migração avança.
