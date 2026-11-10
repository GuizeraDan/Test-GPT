# Laboratório Godot — migração 01

## Disponível

- Goku jogável, com forma inicial Base, Super Saiyajin ou Gogeta SSJ.
- Oponente Cell Perfeito ou Vegeta.
- Seletor de quem executa: personagem ou inimigo.
- Seletor de habilidade/animação, separado do seletor de oponente.
- Reproduzir, pausar/continuar, avançar 1/60 s da simulação, velocidade 0,5×/1×/2× e reiniciar.
- Dez cartas do Goku e catálogo de clips visuais do Cell, incluindo Makankosappo.

Cada teste começa de estado restaurado, com 8 ki, duas ações e ambos os combatentes com 100 de vida. Alterar ator, forma ou oponente restaura a sessão. Controles que mudam a seleção são bloqueados enquanto a habilidade está em execução. Reiniciar permanece disponível para cancelá-la.

Pausa deve congelar personagem, deslocamento, projétil, impacto e aplicação de dano. Avanço deve atualizar todos em conjunto. Reiniciar deve remover projéteis ativos e eventos futuros, impedindo danos atrasados. O atacante inimigo é espelhado uma única vez e olha para a esquerda.

Os ataques do Goku usam o motor de regras para permitir conferir vida e custo. As animações próprias do Cell têm apenas impactos visuais. A partida por turnos é um modo separado, com os recursos e a mão normais.

## Ainda no laboratório anterior

Editor de quadros, importação de sprites/ASE/PXO, pivôs editáveis, linha do tempo, onion skin, eventos editáveis, salvar no projeto, exportar pacotes personalizados, Aang e Saibaman. Esses controles não devem aparecer como funcionais no Godot até a migração respectiva.

Próxima etapa prevista: definir um formato versionado de animações que o editor e o runtime Godot possam compartilhar, validar pacotes e disponibilizar importação/salvamento. Esta etapa ainda não foi implementada.
