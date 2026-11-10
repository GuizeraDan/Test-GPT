# Kamehameha e Super Kamehameha

## Base

4 ki, duas ações, 50 de dano. Usar os nove quadros de `Kamehameha.ase`, sem transformação visual na forma base. Carga, disparo, contato e recuperação formam uma sequência bloqueante. O dano acontece uma única vez quando o feixe alcança o alvo.

## Super

8 ki, duas ações, 80 de dano. Preparação, sequência de disparo, feixe maior e recuperação. A transformação visual da sequência não ativa a carta de transformação nem adiciona bônus permanente.

O contato reproduz os dez quadros de `super-impact-original.png`, da faísca à fumaça, uma única vez. Durações em ms: 65, 65, 80, 90, 100, 110, 120, 140, 150, 180. O ator só é liberado depois do encerramento da sequência e dos efeitos.

## Aceite

Alvo sem defesa termina com 50 de vida no Kamehameha e 20 no Super. Um personagem já transformado soma o bônus normal de +8. O feixe comum usa altura lógica de 80 e o Super de 150 nesta primeira arena Godot; ambos devem ser revisados visualmente antes de fechar o enquadramento. As extremidades da arte são preservadas, estendendo apenas o centro.

Reiniciar durante carga, feixe ou explosão cancela o restante. Pausar congela também a fumaça. Não substituir as poses ASE fornecidas por animações geradas.
