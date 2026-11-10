# Projeto e migração

## Objetivo

Desenvolver o jogo em Godot e continuar testando pelo navegador. O editor e os comandos de exportação executam no ambiente de desenvolvimento; o navegador executa o jogo exportado em WebAssembly. Esta etapa não transforma o editor Godot em um serviço de edição online.

## Decisões

- Godot **4.6.3**, GDScript, renderizador Compatibility.
- Export Web sem threads e sem GDExtension, adequado a hospedagem estática sem cabeçalhos de isolamento entre origens.
- Sem service worker nesta fase, para evitar versões antigas presas no cache durante os testes.
- Cena principal `godot/scenes/main.tscn`; interface nativa montada por `scripts/main.gd`.
- `scripts/battle_model.gd`: estado e regras, sem dependência de desenho.
- `scripts/arena.gd`: sprites, poses, deslocamento, efeitos e eventos de impacto.
- `data/cards.json`, `data/goku.json`, `data/cell.json`: dados e metadados de animação.
- Assets originais continuam em `assets/` na raiz. Atlases nativos derivados ficam em `godot/assets/`.
- Viewport de referência 1280 × 900; arena usa coordenadas 1280 × 440. Primeiro alvo: navegador desktop em paisagem.

## Fluxo de trabalho

1. Definir a alteração na SPEC correspondente.
2. Alterar os scripts/catálogos Godot; reexportar os assets somente se as fontes mudarem.
3. Rodar os testes de regras e os de animação pertinentes.
4. Exportar Web e testar no navegador.
5. Publicar o export em `/godot/`, mantendo a versão anterior disponível.

O build contém HTML, JavaScript de inicialização do Godot, WASM e PCK. O JavaScript de inicialização não contém as regras do jogo. A ponte `?test=1` é somente um controle opt-in de automação de testes.

## Limites desta etapa

O Studio de sprites, seus pacotes JSON personalizados e o salvamento da versão anterior ainda não são lidos pelo Godot. Os atlases nativos usam os assets do repositório, não os ajustes guardados no navegador. Aang, Saibaman e o editor precisam de portes específicos antes de substituir integralmente o protótipo.

Vegeta mantém o atlas provisório existente. O laboratório usa Cell como oponente inicial; a partida normal continua Goku × Vegeta. Não foram inventadas regras de combate para Cell.
