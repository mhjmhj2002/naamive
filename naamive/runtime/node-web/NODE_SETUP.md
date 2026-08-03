# Configuração do Node.js

O runtime Node/Web requer **Node.js 24 ou superior**. O npm é instalado junto
com o Node.js.

## Verificar a instalação

No terminal, execute:

```sh
node --version
npm --version
command -v node
command -v npm
```

O primeiro comando deve mostrar uma versão como `v24.x.x` (ou maior). Se o
comando `node` não existir, se `npm` não existir, ou se a versão principal for
menor que 24, instale/atualize o Node antes de executar o runtime.

Para verificar somente a versão principal exigida:

```sh
node -p "process.versions.node.split('.')[0] >= 24 ? 'Node compatível' : 'Node 24+ é necessário'"
```

## Instalar ou atualizar com nvm (recomendado)

O [nvm](https://github.com/nvm-sh/nvm) permite manter versões de Node por
usuário, sem alterar o Node fornecido pelo sistema operacional. Instale-o pela
instrução oficial do projeto e abra um novo terminal. Depois, execute:

```sh
nvm install 24
nvm use 24
nvm alias default 24
node --version
npm --version
```

`nvm use 24` seleciona Node 24 apenas para o terminal atual. O alias
`default` faz novos terminais usarem Node 24 por padrão.

Para confirmar quais versões estão disponíveis e qual está ativa:

```sh
nvm ls
nvm current
```

## Atualizar dentro da linha 24

```sh
nvm install 24 --reinstall-packages-from=current
nvm alias default 24
nvm use 24
```

Após trocar de versão do Node, volte ao diretório `naamive/runtime/node-web` e
execute `npm install` novamente, pois dependências nativas podem precisar ser
reinstaladas.

## Sem nvm

Instale uma versão LTS 24+ a partir do gerenciador oficial de distribuição do
Node.js para seu sistema operacional. Em seguida, feche e reabra o terminal e
repita os comandos de verificação acima. Evite misturar instalações de `apt`,
Snap, nvm e instaladores manuais sem saber qual binário aparece em
`command -v node`.
