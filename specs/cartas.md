# Cartas

Os valores abaixo reproduzem `game.js`, fonte de balanceamento da migração 01. O exportador gera `godot/data/cards.json`; alterações futuras devem manter este documento e os dados coerentes.

| Carta | Ki | Ações | Efeito sem transformação/defesa |
| --- | ---: | ---: | --- |
| Combo de golpes | 1 | 2 | 12 de dano total |
| Rajada de ki | 2 | 1 | 4 impactos de 5: 20 no total |
| Kamehameha | 4 | 2 | 50 de dano |
| Super Kamehameha | 8 | 2 | 80 de dano |
| Kienzan | 3 | 2 | 3 discos, 40 de dano total |
| Concentrar ki | 0 | 1 | Recupera 2 ki, máximo 8 |
| Postura defensiva | 1 | 1 | Soma 18 de escudo |
| Reflexo veloz | 1 | 1 | Reduz próximo impacto em até 15 |
| Super Saiyajin | 4 | 1 | Ativa SSJ: +8 de dano e manutenção de 1 ki/turno |
| Gogeta Super Sayajin | 4 | 1 | Ativa Gogeta SSJ, mesmo bônus/manutenção, sem acumular |

No laboratório, todas as dez cartas ficam acessíveis; cada novo teste restaura vida, recursos e ações. Na partida, apenas as cartas da mão podem ser jogadas. Cada carta mostra ilustração, nome, ki, ações e dano ou suporte; a descrição completa está na dica ao passar o mouse.

Cell é uma biblioteca de animações nesta etapa. Makankosappo não recebe carta, custo ou dano novos.
