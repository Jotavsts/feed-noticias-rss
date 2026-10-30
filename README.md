# Feed de Notícias RSS

Aplicação web que lê um feed RSS (por padrão, o do g1) e mostra as notícias em uma página responsiva, com filtro por texto e tema claro/escuro automático. O back-end é uma API em Node.js/Express com cache em memória, e o projeto roda em Docker.

> Inspirado em um projeto em equipe que desenvolvi durante o programa da Compass UOL. Esta é uma implementação independente, escrita do zero.

## Funcionalidades

- Leitura e normalização de feed RSS (título, resumo, imagem, data e link da matéria original)
- API REST `GET /api/noticias` com limite configurável
- Cache em memória com tempo de expiração; se o feed cair, a última versão guardada continua sendo servida
- Salvamento do último feed em um bucket Amazon S3, quando `S3_BUCKET` está definido
- Interface responsiva, com filtro, botão de atualizar e suporte a tema claro/escuro
- Execução com Docker ou direto com Node.js
- Testes automatizados com `node:test`

## Tecnologias

Node.js, Express, rss-parser, AWS SDK (S3), HTML, CSS, JavaScript, Docker, Docker Compose e AWS EC2.

## Diagramas

### Visão geral

```mermaid
---
title: Visão geral
---
flowchart LR
    U(["Usuários"]) -->|HTTP| F

    subgraph AWS["AWS Cloud: instância EC2"]
        subgraph D["Contêiner Docker"]
            F["Frontend<br/>HTML, CSS e JS (public/)"]
            B["Backend Node.js e Express<br/>porta 3000"]
            C[("Cache em memória<br/>CACHE_TTL")]
            R["src/feed.js<br/>lê e normaliza o RSS"]
            F -->|"GET /api/noticias"| B
            B <--> C
            B --> R
        end
        S3[("Bucket S3<br/>último feed em JSON")]
        B -->|"AWS SDK"| S3
    end

    R -->|"HTTP/XML"| G[("Feed RSS do g1")]
```

Variáveis de ambiente do backend: `PORT`, `FEED_URL`, `CACHE_TTL`, `S3_BUCKET` e `AWS_REGION`.

| Componente | Descrição |
| --- | --- |
| Usuários | Quem acessa a página no navegador e filtra as notícias |
| Frontend | Página estática servida pelo próprio Express, com filtro feito no navegador |
| Backend | API Node.js/Express na porta 3000, com cache em memória |
| `src/feed.js` | Busca o feed, limpa o HTML e devolve título, resumo, imagem, data e link |
| Bucket S3 | Guarda o último feed lido em JSON (ativado pela variável `S3_BUCKET`) |
| Feed RSS | Fonte externa das notícias (por padrão, o g1) |

### Fluxo de uma requisição

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant A as API (Express)
    participant C as Cache
    participant G as Feed RSS (g1)
    participant S as Bucket S3

    U->>F: 1. Acessa a página
    F->>A: 2. GET /api/noticias
    A->>C: 3. Existe cache válido?
    alt cache válido
        C-->>A: 4. Devolve as notícias guardadas
    else cache vazio ou expirado
        A->>G: 4. Busca o feed RSS
        G-->>A: 5. Retorna o XML
        A->>A: 6. Normaliza os itens
        A->>C: 7. Guarda no cache
        A-)S: 8. Salva o JSON (se S3_BUCKET estiver definido)
        S--)A: 9. Confirma o salvamento
    end
    A-->>F: 10. Retorna as notícias em JSON
    F-->>U: 11. Exibe os cartões
    U->>F: 12. Filtra por texto
    F-->>U: 13. Atualiza a lista, sem chamar a API
```

O salvamento no S3 não atrasa a resposta: a API responde ao frontend sem esperar a confirmação, e uma falha ali só é registrada no log. Se o feed estiver fora do ar e já existir uma versão guardada, a API devolve essa versão com `desatualizado: true`. Se não houver nada guardado, responde com erro 502.

## Como rodar

### Opção 1: Node.js

Requer Node.js 18 ou superior.

```bash
git clone https://github.com/Jotavsts/feed-noticias-rss.git
cd feed-noticias-rss
npm install
npm start
```

Abra http://localhost:3000.

### Opção 2: Docker

```bash
git clone https://github.com/Jotavsts/feed-noticias-rss.git
cd feed-noticias-rss
docker compose up --build
```

Abra http://localhost:3000.

### Opção 3: AWS (EC2)

O mesmo contêiner pode rodar em uma instância EC2. Passo a passo básico:

1. No console da AWS, crie uma instância **EC2** com Amazon Linux 2023 (uma `t3.micro` basta).
2. No **Security Group**, libere a porta **80** (HTTP) para qualquer origem e a porta **22** (SSH) apenas para o seu IP.
3. Conecte por SSH e instale o Docker e o Git:

   ```bash
   sudo dnf install -y docker git
   sudo systemctl enable --now docker
   ```

4. Clone o projeto, gere a imagem e suba o contêiner na porta 80:

   ```bash
   git clone https://github.com/Jotavsts/feed-noticias-rss.git
   cd feed-noticias-rss
   sudo docker build -t feed-noticias-rss .
   sudo docker run -d --name feed --restart unless-stopped -p 80:3000 feed-noticias-rss
   ```

5. Acesse `http://IP-PUBLICO-DA-INSTANCIA`.

Atenção aos custos: crie um alerta no **AWS Budgets** antes de subir a instância e encerre-a quando terminar de testar.

## Configuração

As variáveis são opcionais. Copie `.env.example` e ajuste, se quiser.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta do servidor |
| `FEED_URL` | `https://g1.globo.com/rss/g1/` | URL do feed RSS |
| `CACHE_TTL` | `300` | Tempo de cache, em segundos |
| `S3_BUCKET` | vazio | Nome do bucket S3 onde o último feed é salvo. Vazio desativa o recurso |
| `AWS_REGION` | `sa-east-1` | Região do bucket |

### Salvando o feed no S3

Defina `S3_BUCKET` e o servidor grava o último feed lido em `noticias/ultimas.json`. As credenciais vêm da cadeia padrão da AWS, então **não coloque chaves de acesso no código nem no `.env`**. Na EC2, anexe à instância um perfil IAM com permissão apenas de escrita nesse bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::NOME-DO-SEU-BUCKET/noticias/*"
    }
  ]
}
```

Depois suba o contêiner passando as variáveis:

```bash
sudo docker run -d --name feed --restart unless-stopped -p 80:3000 \
  -e S3_BUCKET=NOME-DO-SEU-BUCKET -e AWS_REGION=sa-east-1 feed-noticias-rss
```

Se o contêiner não conseguir as credenciais da instância, aumente o limite de saltos do serviço de metadados (`HttpPutResponseHopLimit`) para 2 nas opções da EC2.

## API

`GET /api/noticias?limite=30` devolve:

```json
{
  "fonte": "g1",
  "total": 30,
  "doCache": false,
  "desatualizado": false,
  "noticias": [
    {
      "titulo": "...",
      "resumo": "...",
      "link": "https://...",
      "imagem": "https://...",
      "publicadoEm": "2026-10-30T12:00:00.000Z"
    }
  ]
}
```

`GET /saude` devolve `{ "status": "ok" }` e é usado no healthcheck do Docker.

## Testes

```bash
npm test
```

## Estrutura

```
.
├── public/            # interface (HTML, CSS e JavaScript)
├── src/feed.js        # leitura e normalização do RSS
├── src/armazenamento.js  # salvamento do feed no S3
├── tests/             # testes automatizados
├── server.js          # servidor Express e API
├── Dockerfile
└── docker-compose.yml
```

## Aviso

As notícias pertencem aos respectivos veículos. A aplicação mostra apenas título, resumo curto e imagem de capa, com link para a matéria completa na fonte.

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
