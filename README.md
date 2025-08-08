# Formulário Interno de Orçamentos para Monday.com

Este projeto fornece um formulário web estático que cria itens no Board de Orçamentos do Monday.com e conecta projetos, empresas, contatos e serviços.

## Como usar

1. Edite `config.js` e substitua `YOUR_API_TOKEN_HERE` pelo seu API Token do Monday.com.
2. Defina os IDs dos boards:
   - BOARD_ID_ORCAMENTOS: ID do Board de Orçamentos
   - BOARD_ID_PROJETOS: ID do Board de Projetos
   - BOARD_ID_EMPRESAS: ID do Board de Empresas
   - BOARD_ID_CONTATOS: ID do Board de Contatos
   - BOARD_ID_SERVICOS: ID do Board de Serviços
3. Faça deploy dos arquivos estáticos (index.html, config.js, script.js) na sua hospedagem (ex: Hostinger).

## Estrutura de arquivos

- `index.html` - Formulário e inclusão das bibliotecas.
- `config.js` - Configurações (token e IDs de boards).
- `script.js` - Lógica para buscar dados e criar item no Monday.
- `README.md` - Este arquivo.

## Tecnologias

- HTML5, JavaScript
- Tailwind CSS (via CDN)
- monday-sdk-js v2
- GraphQL API do Monday.com

## Execução local

Basta abrir `index.html` no navegador. Se houver CORS ou necessidade de servidor local, use um servidor HTTP simples:
\`\`\`bash
# Python 3
python3 -m http.server 8000
\`\`\`

Acesse http://localhost:8000 no navegador.
