# Animações e assets

## Preservação

Usar as artes fornecidas, sem redesenhar os personagens. `tools/export_godot_assets.py` recorta os atlases existentes, remove fundos conforme os critérios do renderizador anterior e registra retângulo, pivô, escala e duração em segundos. Os originais ficam intactos na raiz.

O filtro de textura é nearest-neighbor. Pivôs ficam nos pés; o desenho dos quadros não deve reposicionar o personagem a cada mudança de pose. Efeitos têm coordenadas próprias e não alteram o pivô do ator. A transparência deve preservar o branco interno das artes.

## Fontes principais

| Uso | Fonte |
| --- | --- |
| Idle base | `assets/Idle.ase`, export de 20 quadros de 100 ms |
| Idle SSJ | `assets/Idle SSJ.ase`, 12 quadros de 100 ms |
| Kamehameha base | `assets/Kamehameha.ase`, 9 quadros de 100 ms |
| Gesto Kienzan | `assets/Kienzan Throw.ase`, 9 quadros de 100 ms |
| Disco Kienzan | `assets/Kienzan.ase`, 2 quadros de 100 ms |
| Rajada | `assets/rajada-action-original.jpg`, 6 poses |
| Projétil e impacto de Ki | `assets/ki-projectile-original.png`, `assets/ki-impact-original.png` |
| Gogeta | `assets/gogeta-original.png`, export de 9 poses |
| Super Kamehameha: explosão | `assets/super-impact-original.png`, 10 quadros |
| Cell | `assets/cell-atlas.png/json`, clips identificados na versão anterior |
| Cenário | `assets/temple-original.png` |

Créditos dos materiais originais permanecem nos arquivos e na documentação existente. Os arquivos gerados não substituem nem removem as fontes.

## Runtime

Um relógio de simulação determina poses, deslocamentos, disparos, impactos e término. Eventos são ordenados pelo instante e processados mesmo quando um quadro do navegador demora. Pausar interrompe o relógio; avançar soma 1/60 s; velocidade multiplica o delta. O fim espera também a dissipação dos efeitos.

Goku começa à esquerda e o inimigo à direita. O desenho espelha personagem e projétil inimigos uma única vez. O combo aproxima o ator, reproduz impactos de contato e retorna ao ponto de origem. Feixes preservam suas extremidades e estendem o trecho central.

Gogeta não possui ataques próprios no pacote atual: mantém sua postura durante técnicas e projéteis, sem trocar pelo sprite base de Goku. Vegeta utiliza o atlas provisório. SSJ mantém sua própria postura ao receber impacto.

## Aceite

Executar `test_animations.gd`, observar as habilidades no navegador, inspecionar bordas/transparência e revisar enquadramento. O editor de animação da versão anterior ainda não injeta substituições neste runtime.
