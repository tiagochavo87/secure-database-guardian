# Pacote de substituição do Supabase

## O que foi trocado
- Cliente Supabase substituído por um cliente local compatível com o frontend atual.
- Backend novo em `backend/local-api` com Node + Express + PostgreSQL.
- Autenticação local com JWT e reset de senha por link gerado localmente.
- CRUD genérico para as tabelas principais do sistema.

## Subir rápido com Docker
1. Na raiz do projeto, copie `.env.docker.example` para `.env` e preencha `JWT_SECRET`,
   `POSTGRES_PASSWORD` e `INITIAL_ADMIN_PASSWORD` com valores aleatórios próprios
   (ex.: `openssl rand -hex 32` para o `JWT_SECRET`). O container não sobe sem esses valores.
2. `docker compose -f docker-compose.local.yml up -d --build`
3. No frontend, copie `.env.example` para `.env`
4. Rode `npm install` e `npm run dev`
5. Acesse `http://localhost:8080`

## Credenciais iniciais
- Email: o que você definiu em `INITIAL_ADMIN_EMAIL` (padrão `admin@local.test`)
- Senha: a que você definiu em `INITIAL_ADMIN_PASSWORD` no `.env`

**Troque a senha do admin assim que fizer o primeiro login**, especialmente se esta
instalação ficar acessível fora da rede local (VPN, domínio público, túnel).

## Acesso remoto (HTTPS automático com Caddy)
O backend em si não faz TLS — por isso existe um segundo arquivo de compose,
`docker-compose.remote.yml`, que sobe um proxy reverso [Caddy](https://caddyserver.com/)
na frente de tudo: ele serve o build de produção do frontend, encaminha
`/auth`, `/api` e `/health` para a API, e termina HTTPS automaticamente
(Let's Encrypt se houver domínio público, certificado interno se for só
`localhost`/IP privado). Só o Caddy publica porta para fora (80/443); API
(3001) e Postgres (5432) ficam restritos a `127.0.0.1` no host.

1. Preencha também `DOMAIN` no `.env` (raiz):
   - domínio público real com DNS já apontando para este servidor → Caddy emite
     Let's Encrypt sozinho (portas 80/443 precisam estar liberadas no firewall);
   - `localhost` (padrão) → certificado interno, só para teste local — o
     navegador vai avisar que o emissor não é confiável, o que é esperado.
2. Configure `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` no `.env`
   para o reset de senha enviar email de verdade. Sem isso, o link só aparece
   no log do container `api` (`docker compose logs -f api`) — inviável para
   quem não tem acesso ao servidor.
3. Suba os dois arquivos de compose juntos:
   ```
   docker compose -f docker-compose.local.yml -f docker-compose.remote.yml up -d --build
   ```
4. Acesse `https://SEU_DOMINIO` (ou `https://localhost` em teste local).

Não é preciso rodar `npm run dev` nem o passo 3-4 do "Subir rápido com Docker"
nesse modo — o Caddy já serve o frontend buildado.

Outros pontos para acesso remoto:
- Ajuste `CORS_ORIGIN` só se algum cliente acessar a API em uma origem
  diferente do domínio do Caddy (o uso normal já é mesma origem, sem CORS).
- Revise regularmente `npm audit` (frontend e `backend/local-api`) e mantenha
  as dependências atualizadas.

## Rotas principais da API
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/reset-password/request`
- `POST /auth/reset-password/confirm`
- `PATCH /auth/user`
- `GET/POST/PATCH/DELETE /api/table/:table`

## Observação
O backend novo substitui login, perfis, tabelas e permissões básicas. O sistema de envio automático de backup para destinos externos ainda pode ser evoluído depois, mas o núcleo do app passa a funcionar sem Supabase.
