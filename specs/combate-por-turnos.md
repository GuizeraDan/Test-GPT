# Combate por turnos

## Estado inicial

- Goku e Vegeta: 100 de vida, 3 ki; máximo de 8 ki.
- Jogador começa, round 1, duas ações disponíveis.
- Mão inicial: Combo de golpes, Concentrar ki, Reflexo veloz e Super Saiyajin.
- Baralho e descarte pertencem a cada combatente. Ordem de compra é aleatória.

## Contrato de execução

Uma carta só pode iniciar no turno do autor, com ações e ki suficientes, sem outra carta pendente e sem vencedor. O início paga o custo uma única vez e move a carta da mão para o descarte.

O dano acontece nos eventos de contato da animação. A Rajada resolve quatro impactos. Os demais ataques resolvem um único evento de dano, ainda que exibam vários golpes ou projéteis. Durante a animação, outra carta e o encerramento de turno ficam bloqueados.

A conclusão aplica efeitos de suporte, atualiza a forma e define o vencedor. Nenhuma ação começa depois da vitória. Reiniciar cancela o estado pendente e todos os efeitos visuais da partida anterior.

## Defesas e formas

Reação reduz o próximo impacto e é totalmente consumida nesse impacto. Depois, o escudo absorve o dano restante até acabar. A vida nunca fica negativa.

SSJ e Gogeta SSJ concedem +8 por carta de ataque, sem acumular bônus entre formas. Na Rajada, esse bônus se divide em +2 por disparo. Transformação mantém custo de 1 ki no início do turno do personagem.

## Troca de turno

O novo combatente recebe duas ações, perde o escudo anterior, ganha 2 ki até o limite de 8 e paga a manutenção da forma. Compra até duas cartas, respeitando sete na mão. Se o baralho acabar, o descarte é embaralhado e reutilizado. Round incrementa ao voltar ao jogador.

A CPU seleciona uma carta válida segundo as prioridades da versão JavaScript e encerra o turno quando não há jogada disponível. O jogador encerra seu turno pelo botão próprio.

## Aceite

Passar os 128 cenários de paridade e uma partida Web com a CPU. As funções de regra permanecem independentes da taxa de quadros e da duração visual das habilidades.
