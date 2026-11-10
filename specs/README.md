# Especificações do Kame Duel

Estas especificações em Markdown descrevem os contratos de comportamento do projeto. Mudanças de regras ou de animação devem atualizar a SPEC correspondente, a implementação e sua validação no mesmo trabalho.

## Migração 01 — Godot 4.6.3 / Web

| Área | Situação |
| --- | --- |
| Partida Goku × Vegeta, CPU e 10 cartas | Implementada em GDScript |
| Laboratório do Goku: Base, SSJ e Gogeta SSJ | Implementado, com pausa, avanço e velocidade |
| Cell Perfeito e Makankosappo | Laboratório visual nativo; sem dano/carta novos |
| Editor de frames, importação e salvamento pelo laboratório | Continua na versão JavaScript |
| Aang e Saibaman | Continuam na versão JavaScript |
| Ajuste visual fino e interface para celulares | Próximas etapas |

A migração é incremental. O projeto original continua funcional na raiz; o projeto Godot está em `godot/`. As regras são comparadas automaticamente entre os motores, mas o enquadramento e os tempos da composição visual precisam de revisão no laboratório pelo usuário.

## Documentos

- [Arquitetura, execução e migração](projeto.md)
- [Combate por turnos](combate-por-turnos.md)
- [Cartas e balanceamento](cartas.md)
- [Laboratório](laboratorio.md)
- [Animações e assets](animacoes.md)
- [Rajada de Ki](habilidades/rajada-de-ki.md)
- [Combo de golpes](habilidades/combo-de-golpes.md)
- [Kienzan](habilidades/kienzan.md)
- [Kamehameha e Super Kamehameha](habilidades/kamehameha.md)
- [Makankosappo](habilidades/makankosappo.md)

## Validação

`tools/test_godot_parity.mjs` gera 128 cenários a partir do motor JavaScript existente. `godot/tests/test_model.gd` compara seus resultados com o motor Godot: custos, ações, danos, defesas, formas, turnos e descarte. As comparações não exigem a mesma ordem aleatória dos baralhos.

`godot/tests/test_animations.gd` executa 62 sequências, incluindo as formas do Goku e todos os clips/efeitos do catálogo Cell, e verifica término, quantidade de impactos, retorno à origem, pausa, avanço e cancelamento. O teste Web verifica o export real no Chromium, as dez cartas, os controles do laboratório, o Cell e um turno da CPU.

Consulte os comandos em [godot/README.md](../godot/README.md). A aprovação artística das animações continua sendo uma etapa visual; testes automatizados não a substituem.
