# Publicação do jogo

Os fontes estão em `main`. O site pronto fica em `gh-pages`, com o jogo anterior na raiz, seu laboratório em `laboratorio.html` e o export nativo em `godot/`.

O workflow **Publicar jogo no GitHub Pages** publica esse pacote usando as ações oficiais do GitHub. Antes do envio, confere os arquivos e os tamanhos WASM/PCK declarados pelo export. A pasta `godot/` precisa conter o export Web, não apenas os fontes do projeto Godot.

## Ativar a publicação por Actions

1. Em [Settings → Pages](https://github.com/GuizeraDan/Test-GPT/settings/pages), alterar **Build and deployment → Source** para **GitHub Actions**.
2. Em [Actions → Publicar jogo no GitHub Pages](https://github.com/GuizeraDan/Test-GPT/actions/workflows/deploy-pages.yml), clicar em **Run workflow**, selecionar a branch **gh-pages** e confirmar **Run workflow**.
3. Aguardar a execução verde. O passo **Publicar** mostra o endereço do site; a versão Godot está em `/Test-GPT/godot/`.

O workflow está nas duas branches: em `main` para aparecer no catálogo de Actions e em `gh-pages` para executar quando o pacote muda. Novos pushes em `gh-pages` disparam a publicação quando o GitHub permite o gatilho. Se um push feito por automação não disparar uma execução, usar **Run workflow** na branch `gh-pages`.

Isso substitui a publicação automática “Deploy from a branch”. Não é necessário apagar o site, as branches ou os arquivos anteriores. Não é necessário cadastrar tokens ou segredos: o workflow usa as permissões padrão de Pages e identidade OIDC do próprio GitHub Actions.

## Se houver erro

Abrir a execução e identificar o primeiro passo vermelho. Erros de permissão, Actions desativado, política de ambiente ou cota da conta não são corrigidos por reenviar os sprites. Compartilhar a mensagem desse passo para tratar a causa específica. A implantação só está confirmada depois que **Publicar** concluir com sucesso; um push de Git concluído não confirma que o site foi implantado.

Ao atualizar o export, preservar os arquivos da raiz e `.github/workflows/deploy-pages.yml` de `gh-pages`. Substituir apenas o conteúdo publicado em `godot/`, mantendo todos os arquivos produzidos pelo preset Web juntos.
