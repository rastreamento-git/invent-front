# Inventário · Interface original

Interface web original do sistema de inventário de rastreadores e TAGs, desenvolvida com React e Vite. Este repositório corresponde à estrutura anterior, na qual frontend e backend eram mantidos separadamente.

A evolução atual do **Estoque Pro** está em [rastreamento-git/inventario-v2](https://github.com/rastreamento-git/inventario-v2), com interface e API organizadas em `invent-front/` e `invent-back/`. A integração com o ecossistema ZenTracking é mantida nesse repositório atual.

## Desenvolvimento desta versão

```bash
npm ci --include=dev
npm run dev
```

```bash
npm run lint
npm run build
```

A compilação gera a pasta `dist`. A configuração da API deve corresponder ao backend usado por esta versão. Não misture arquivos de versões diferentes sem conferir os respectivos contratos.

## Repositórios relacionados

- [API original do inventário](https://github.com/rastreamento-git/invent-back)
- [Estoque Pro atual](https://github.com/rastreamento-git/inventario-v2)
- [ZenControl](https://github.com/rastreamento-git/zencontrol)
- [ZenField](https://github.com/rastreamento-git/zenfield)

Desenvolvido por Victor Rodrigues.
