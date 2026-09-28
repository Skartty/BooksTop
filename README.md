# BooksTop

BooksTop é uma loja de livros acadêmica criada para o projeto de Desenvolvimento Web 3. Ela demonstra um catálogo de produtos, pedidos independentes e um frontend React que consome as APIs.

## Arquitetura

O frontend React comunica-se por HTTP/Axios com o MS-Produtos e o MS-Pedidos. Cada serviço persiste seus dados em seu próprio banco SQLite. O MS-Pedidos consulta o MS-Produtos por HTTP antes de criar um pedido. O carrinho existe apenas no estado do frontend.

## Tecnologias

- React, Vite, React Router e Axios no frontend.
- Node.js, Express, Axios e CORS nos microsserviços.
- SQLite via sql.js, com um arquivo separado por serviço.
- Docker e Docker Compose.

## Estrutura

- `ms-produtos/`: API do catálogo e banco de produtos.
- `ms-pedidos/`: API de pedidos e banco de pedidos.
- `frontend/`: aplicação React + Vite.
- `docs/`: coleção Postman das APIs.
- `docker-compose.yml`: execução integrada.

## Executar localmente

Pré-requisito: Node.js 20 ou superior. Instale tudo com `npm run install:all`. Em três terminais distintos, execute `npm run dev:produtos`, `npm run dev:pedidos` e `npm run dev:frontend`. Abra `http://localhost:5173`.

As variáveis opcionais do frontend estão em `frontend/.env.example`.

## Executar com Docker

Execute `docker compose up --build`. O Compose cria volumes separados para os dois bancos. Para reinicializar os dados de demonstração, execute `docker compose down -v` e suba novamente.

## Portas

- Frontend: 5173
- MS-Produtos: 3001
- MS-Pedidos: 3002

## APIs

- Produtos: `POST /produtos`, `GET /produtos`, `GET /produtos/:id`.
- Pedidos: `POST /pedidos`, `GET /pedidos`, `GET /pedidos/:id`.

Exemplo de criação: `{ "produtoId": 1, "quantidade": 2 }`.

Produto inexistente responde 404; quantidade acima do estoque responde 409; quantidade inválida responde 400; e indisponibilidade do MS-Produtos responde 503. Importe [a coleção Postman](docs/BooksTop.postman_collection.json) para exemplos completos, incluindo cenários de erro e cadastro de produto.

## Fluxo e Snapshot Pattern

Ao receber `POST /pedidos`, o MS-Pedidos consulta `GET /produtos/:id` no MS-Produtos. Depois de validar existência e estoque, ele grava `nomeProduto`, `precoUnitario`, `quantidade`, `valorTotal`, data e status `REALIZADO` no banco próprio. Nome e preço são snapshots: alterações futuras no catálogo não mudam um pedido já salvo.

## Interface e dados iniciais

O catálogo é populado automaticamente na primeira inicialização com 24 livros reais e suas informações. As capas são URLs externas e o frontend apresenta um fallback visual se alguma falhar. A paginação é feita no React e exibe no máximo 12 livros por página.

O frontend possui catálogo, detalhes em `/livro/:id`, sacola, finalização e histórico. Há estados de carregamento e mensagens amigáveis para falhas de rede ou regras de negócio. O carrinho só é esvaziado após todas as criações de pedido retornarem sucesso.

## Como testar

1. Inicie os três componentes.
2. Acesse `GET http://localhost:3001/produtos` e confira os 24 livros.
3. Faça `POST http://localhost:3002/pedidos` com produto 1 e quantidade 2.
4. Consulte `GET http://localhost:3002/pedidos` e confira o snapshot.
5. Repita com produto 99999, quantidade 999 e quantidade 0 para validar os erros.
6. Pare um serviço e confirme a mensagem amigável no frontend.

O CORS é limitado por padrão a localhost:5173 e localhost:3000; ajuste pela variável `CORS_ORIGIN`. Para alterar a URL entre serviços, use `PRODUCTS_SERVICE_URL` no MS-Pedidos.
