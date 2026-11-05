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

Kamehameha e Super Kamehameha usam preparação, transformação visual, disparo e recuperação. A transformação visual da técnica não ativa a carta Super Saiyajin. O feixe preserva suas extremidades e estende o centro até o alvo. As alturas são 105 px para o comum e 195 px para o Super.

Sem multiplayer, áudio, salvamento de partidas ou equipes nesta versão. As artes fornecidas e os personagens não constituem uma licença de distribuição comercial.

## Cenário do templo
A folha fornecida pelo usuário está em `assets/temple-original.png` (ShadeDBZ). O jogo combina o céu com o templo em Canvas, removendo o verde durante a renderização. A arquitetura é desenhada uma única vez, sem repetição de fatias de teto e piso. Em telas estreitas, o enquadramento central recorta as laterais. O arquivo original permanece intacto.

Aura: Goku usa o efeito presente nos sprites originais, sem a antiga aura geométrica ou anéis CSS sobrepostos. Sua postura SSJ usa a pose com aura dourada da folha. Vegeta mantém um brilho provisório suave, atrás do personagem, alinhado aos pés.

A área de desenho de Goku tem espaço vertical adicional para os quadros altos de aura. A escala do pixel e o alinhamento dos pés são preservados.

Rajada de Ki: quatro projéteis e quatro impactos de 5 de dano (20 total), com vida e defesas atualizadas por acerto. A reação é consumida no primeiro impacto; o escudo absorve o dano restante até acabar. O bônus SSJ de +8 é distribuído entre os quatro disparos (+2 cada). O projétil e o impacto usam os PNGs originais enviados no ZIP. O fundo roxo é removido durante a renderização; os originais ficam intactos em assets. São imagens estáticas animadas pelo jogo, sem quadros adicionais inventados.

Super Kamehameha: o impacto reproduz os 10 quadros (5 colunas × 2 linhas) de `assets/super-impact-original.png`, folha fornecida pelo usuário. O efeito começa quando o feixe atinge o alvo e termina na fumaça. O dano é aplicado uma única vez. O arquivo original permanece intacto; o resíduo de alfa muito baixo é removido na renderização para evitar uma caixa escura sobre a arena. Reiniciar cancela o efeito.

## Laboratório de animações
Abra `Laboratorio.html` para testar todas as oito cartas sem esperar turnos nem acumular ki. Também pode usar o botão “Laboratório de animações” no jogo. A versão web usa `/laboratorio.html` ou `/#lab`.

Selecione habilidade, personagem, forma inicial e defesa do alvo. Clique em Reproduzir ou em uma carta. O alvo e os recursos são restaurados antes de cada teste. Há velocidades de 0,25× a 2×, pausa/continuação, avanço de 1/60 de segundo da simulação, repetição automática e limpeza do teste. Os controles sincronizam temporizadores, sprites, explosões e animações do navegador. A partida normal conserva suas regras. Vegeta ainda usa o atlas provisório.

“Testar sprites” abre a prévia das sequências individuais do Goku. Para interromper e recomeçar a habilidade inteira, use “Limpar teste”. O laboratório é para inspeção visual e não salva alterações nas cartas ou no código.
