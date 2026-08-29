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

## Acesso remoto
Este backend não faz TLS nem gerencia certificados — ele foi pensado para rodar
atrás de um proxy reverso (ex.: Caddy, Nginx, Traefik) que termina HTTPS antes
de repassar para a porta 3001. Para expor a aplicação fora da rede local:
- Nunca exponha a porta 5432 (Postgres) publicamente — só a porta do proxy/API.
- Sirva a aplicação sempre via HTTPS; nunca em HTTP puro pela internet.
- Ajuste `CORS_ORIGIN` (backend) e `VITE_API_URL` (frontend) para o domínio real.
- Configure um serviço de email real para o reset de senha (ver comentário
  `TODO(produção/acesso remoto)` em `backend/local-api/src/server.js`); sem isso,
  o link de recuperação só é visível no log do servidor.

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
