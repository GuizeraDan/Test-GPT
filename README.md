# Kame Duel
Protótipo de batalha de cartas por turnos para navegador, em português. Sem dependências externas de execução.

## Baixar pelo GitHub
No repositório, clique em **Code → Download ZIP**, extraia o arquivo e abra `Laboratorio.html` para testar animações, ou `Kame-Duel.html` para jogar a partida. O HTML não precisa de servidor nem de instalação. Não abra o arquivo dentro do ZIP: extraia a pasta primeiro.

## Jogar sem instalar nada
Abra `Kame-Duel.html` no Chrome, Firefox ou Edge. Ele contém o jogo e as imagens incorporadas. Para ver seu código, abra o HTML em um editor de texto, como VS Code.

## Editar o projeto
Extraia o ZIP e abra a pasta no VS Code. Os arquivos principais são:

- `game.js`: cartas, custos, dano, turnos, baralho e decisões da CPU.
- `app.js`: interface, sequência das habilidades, seleção dos quadros e efeitos. A constante `BEAM_HEIGHT` controla a altura dos feixes; `super` é o Super Kamehameha.
- `style.css`: HUDs, arena, cartas e animações CSS.
- `index.html`: estrutura da tela e cenário SVG.
- `assets/`: sprites e folhas originais.
- `game.test.js`: testes das regras.
- `server.mjs`: servidor local.
- `build-standalone.py`: gera o HTML independente a partir dos arquivos acima.

Para desenvolver, instale Node.js 22 ou posterior e execute, no terminal do VS Code, dentro da pasta:

```sh
npm start
```

Abra `http://localhost:3000` no navegador. Não é necessário executar npm install. A porta pode ser alterada com a variável `PORT`.

Para testar as regras:

```sh
npm test
```

Para atualizar a versão de arquivo único depois de editar os fontes, instale Python 3 e execute:

```sh
python build-standalone.py
```

## Regras atuais
Cada jogador tem 100 de vida, até 8 ki e 2 ações por turno. No início de cada novo turno, recebe 2 ki e compra até 2 cartas (limite de 7 na mão). Escudo dura até o próximo turno; reação é consumida pelo próximo ataque. Super Saiyajin adiciona 8 de dano e consome 1 ki por turno.

| Carta | Ki | Ações | Efeito base |
| --- | --- | --- | --- |
| Combo de golpes | 1 | 2 | 12 de dano |
| Rajada de ki | 2 | 1 | 4 × 5 = 20 de dano |
| Kamehameha | 4 | 2 | 50 de dano |
| Super Kamehameha | 8 | 2 | 80 de dano |
| Concentrar ki | 0 | 1 | +2 ki |
| Postura defensiva | 1 | 1 | 18 de escudo |
| Reflexo veloz | 1 | 1 | Reduz próximo ataque em 15 |
| Super Saiyajin | 4 | 1 | Ativa transformação |

## Animações e sprites
Goku usa quadros de `assets/goku-original.png`, folha enviada pelo usuário, com créditos visíveis a Que / Ultimate LSW. O PNG original fica intacto; o jogo seleciona os quadros em Canvas e aplica transparência ao branco conectado às bordas. Vegeta usa o atlas da versão anterior.

A opção “Testar sprites” permite visualizar sequências separadamente e importar outras poses para experimentar na sessão. O combo aproxima o atacante do alvo e apresenta oito impactos visuais; o dano é aplicado uma única vez. Reiniciar cancela animações pendentes.

Super Kamehameha usa preparação, transformação visual, disparo e recuperação. Sua transformação visual não ativa a carta Super Saiyajin. O Kamehameha comum na forma base usa a nova sequência sem transformação. O feixe preserva suas extremidades e estende o centro até o alvo. As alturas são 105 px para o comum e 195 px para o Super.

Sem multiplayer, áudio, salvamento de partidas ou equipes nesta versão. As artes fornecidas e os personagens não constituem uma licença de distribuição comercial.

## Cenário do templo
A folha fornecida pelo usuário está em `assets/temple-original.png` (ShadeDBZ). O jogo combina o céu com o templo em Canvas, removendo o verde durante a renderização. A arquitetura é desenhada uma única vez, sem repetição de fatias de teto e piso. Em telas estreitas, o enquadramento central recorta as laterais. O arquivo original permanece intacto.

Aura: Goku usa o efeito presente nos sprites originais, sem a antiga aura geométrica ou anéis CSS sobrepostos. Sua postura SSJ usa a pose com aura dourada da folha. Vegeta mantém um brilho provisório suave, atrás do personagem, alinhado aos pés.

A área de desenho de Goku tem espaço vertical adicional para os quadros altos de aura. A escala do pixel e o alinhamento dos pés são preservados.

Rajada de Ki: quatro projéteis e quatro impactos de 5 de dano (20 total), com vida e defesas atualizadas por acerto. A reação é consumida no primeiro impacto; o escudo absorve o dano restante até acabar. O bônus SSJ de +8 é distribuído entre os quatro disparos (+2 cada). O projétil e o impacto usam os PNGs originais enviados no ZIP. O fundo de cada imagem é removido durante a renderização; os originais ficam intactos em assets. São imagens estáticas animadas pelo jogo, sem quadros adicionais inventados.

Super Kamehameha: o impacto reproduz os 10 quadros (5 colunas × 2 linhas) de `assets/super-impact-original.png`, folha fornecida pelo usuário. O efeito começa quando o feixe atinge o alvo e termina na fumaça. O dano é aplicado uma única vez. O arquivo original permanece intacto; o resíduo de alfa muito baixo é removido na renderização para evitar uma caixa escura sobre a arena. Reiniciar cancela o efeito.

## Laboratório de animações
Abra `Laboratorio.html` para testar todas as oito cartas sem esperar turnos nem acumular ki. Também pode usar o botão “Laboratório de animações” no jogo. A versão web usa `/laboratorio.html` ou `/#lab`.

Selecione habilidade, personagem, forma inicial e defesa do alvo. Clique em Reproduzir ou em uma carta. O alvo e os recursos são restaurados antes de cada teste. Há velocidades de 0,25× a 2×, pausa/continuação, avanço de 1/60 de segundo da simulação, repetição automática e limpeza do teste. Os controles sincronizam temporizadores, sprites, explosões e animações do navegador. A partida normal conserva suas regras. Vegeta ainda usa o atlas provisório.

“Testar sprites” abre a prévia das sequências individuais do Goku. Para interromper e recomeçar a habilidade inteira, use “Limpar teste”. O laboratório é para inspeção visual e não salva alterações nas cartas ou no código.

Rajada refeita com os arquivos “Rajada.zip” e “Projétil de Fogo Pixelado Brilhante.zip”: Goku base usa os seis quadros da nova folha JPG, com o clarão nativo integrado às poses de emissão. A nova arte PNG transparente é usada exclusivamente no projétil em voo. Os pivôs dos quadros são alinhados aos pés; o Canvas foi ampliado horizontalmente para evitar cortes no clarão. O arquivo original de cada arte é preservado. O SSJ e Vegeta mantêm seus conjuntos de poses anteriores com emissão separada. Mantidos quatro impactos de 5, custo de 2 ki e 1 ação.


Kamehameha na forma base: nova animação de oito poses desenhada a partir das referências do usuário, em `assets/base-kame-atlas.png`. Goku permanece de cabelo preto durante preparação, carga azul, disparo e recuperação. A técnica na forma base não apresenta transformação temporária. Mantidos 4 ki, 2 ações e 50 de dano base. A carta usa uma pose nova; o laboratório inclui a sequência completa e as fases separadas. A forma SSJ e o Super Kamehameha preservam suas sequências anteriores.

## Kamehameha base em Aseprite
A animação atual vem de `assets/Kamehameha.ase`, arquivo original do usuário. Seus nove quadros RGBA de 64 × 64 e os tempos de 100 ms são exportados sem redesenho para `base-kame-ase.png` e `base-kame-ase.json`. O jogo usa os seis primeiros quadros na carga e os três últimos no disparo; a pose final é sustentada enquanto o feixe está ativo. A pose final é encerrada antes do retorno à postura neutra. A prévia completa reproduz os nove tempos originais. Custo e dano permanecem 4 ki, 2 ações e 50 de dano base.

Para atualizar os exports após editar o arquivo no Aseprite, use Python 3 com Pillow: `python tools/export_aseprite.py assets/Kamehameha.ase assets/base-kame-ase`. Depois execute `python build-standalone.py`. O arquivo ASE original permanece incluído para edição. Os demais personagens, a Rajada e o Super Kamehameha não são alterados por esta troca.

## Postura neutra
Goku base usa `assets/Idle.ase`: 20 quadros RGBA de 64 × 64, com 100 ms cada, repetidos em um ciclo de 2 segundos. A postura é retomada após as habilidades e pode ser inspecionada em “Testar sprites → Postura · Idle.ase”. A postura SSJ usa o arquivo dedicado descrito abaixo. O original e os exports `goku-idle-ase.png` / `goku-idle-ase.json` estão incluídos. Para atualizar os exports após editar: `python tools/export_aseprite.py assets/Idle.ase assets/goku-idle-ase`, seguido de `python build-standalone.py`.

## Postura Super Saiyajin
Enquanto está transformado, Goku usa `assets/Idle SSJ.ase`: 12 quadros RGBA de 64 × 64 com 100 ms cada, em um ciclo de 1,2 segundo. Os efeitos de aura vêm do arquivo; não há uma aura CSS adicional. A sequência é retomada após as habilidades na forma SSJ e aparece em “Testar sprites → Postura SSJ”. A postura base e a animação de entrada na transformação permanecem as anteriores. Para reexportar após editar: `python tools/export_aseprite.py "assets/Idle SSJ.ase" assets/goku-ssj-idle-ase`, depois `python build-standalone.py`.

### Gogeta Super Sayajin (teste)

A carta custa 4 ki e 1 ação, concede +8 de dano e mantém o custo de 1 ki por turno. Está no baralho e no laboratório, que agora contém 10 cartas. Pode substituir a forma SSJ sem acumular bônus.

A transformação reproduz as 9 poses da folha enviada; a última vira a postura final. A folha não inclui ataques próprios: Gogeta mantém essa postura durante os efeitos das técnicas. Use “Forma inicial → Gogeta Super Sayajin” para testar as demais cartas nessa forma, ou “Testar sprites → Gogeta Super Sayajin” para inspecionar os quadros. Pausa, avanço e velocidade também funcionam na transformação.

O original está em `assets/gogeta-original.png`. `python tools/export_gogeta.py` reproduz os recortes, remove o branco conectado às bordas e alinha os pés sem redesenhar a arte.

### Kienzan

Habilidade de 3 ki, 2 ações e 40 de dano base. Disponível no baralho e no laboratório. `Kienzan Throw.ase` fornece os 9 quadros de lançamento do Goku base; `Kienzan.ase` fornece os 2 quadros do disco giratório, com 100 ms por quadro em ambos. São lançados 3 discos em sequência. Cada tiro reinicia os nove quadros completos: preparação, formação do disco sobre a cabeça e arremesso. Em cada ciclo, o disco sai no sétimo quadro. Os 40 de dano totais são aplicados uma única vez no terceiro impacto, respeitando defesas e o bônus das transformações. O custo continua em 3 ki e 2 ações por carta. Nas outras formas e em Vegeta, o disco acompanha as poses já existentes.

Os originais estão em `assets/`. Para refazer as exportações:

```bash
python tools/export_aseprite.py assets/Kienzan.ase assets/kienzan-disc
python tools/export_aseprite.py "assets/Kienzan Throw.ase" assets/kienzan-throw
```

### Saibaman · laboratório visual

O laboratório abre com **Oponente → Saibaman** e **Animar → Oponente**. Selecione uma das 18 animações e clique em Reproduzir. Pausa, avanço, velocidade, repetição e limpar teste funcionam também neste modo. Não há novas cartas nem dano de gameplay: o objetivo é inspecionar as animações. Use **Animar → Goku** para testar cartas contra o inimigo selecionado. **Oponente → Vegeta** restaura o adversário anterior.

O pacote contém 46 PNGs numerados e um arquivo vazio de crédito a thekrillmaster. Os nomes abaixo são interpretações visuais, pois não há metadados de ações ou duração. As sequências e tempos ajustáveis ficam em `SAIBA_CLIPS`, em `app.js`. Os originais são preservados em `assets/saibaman-original/`; `python tools/export_saibaman.py` gera o atlas transparente.

| Sequência | Sprites originais |
|---|---|
| Idle / respiração sutil | 1 |
| Rastejar e avanço | 2, 3, 7 |
| Salto | 4, 5, 6, 8 |
| Soco | 9, 10 |
| Chutes | 11–14 |
| Garras | 15–17 |
| Esquiva | 18–19 |
| Reação a dano e queda | 20–25 |
| Disparo de ki e projétil | 26–29 |
| Carga de ki com aura | 30–32 |
| Raio de energia | 33–36 |
| Jato de ácido | 37–40 |
| Autodestruição, explosão e fumaça | 41–46 |

O canvas espelha a arte uma única vez para enfrentar o jogador à esquerda. O espelhamento herdado do elemento Vegeta é desativado neste modo. Os golpes físicos aproximam o inimigo do jogador; os efeitos também apontam para a esquerda.
