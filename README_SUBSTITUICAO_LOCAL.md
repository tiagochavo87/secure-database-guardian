# Pacote de substituição do Supabase

## O que foi trocado
- Cliente Supabase substituído por um cliente local compatível com o frontend atual.
- Backend novo em `backend/local-api` com Node + Express + PostgreSQL.
- Autenticação local com JWT e reset de senha por link gerado localmente.
- CRUD genérico para as tabelas principais do sistema.

## Subir rápido com Docker
1. Na raiz do projeto: `docker compose -f docker-compose.local.yml up -d --build`
2. No frontend, copie `.env.example` para `.env`
3. Rode `npm install` e `npm run dev`
4. Acesse `http://localhost:8080`

## Credenciais iniciais
- Email: `admin@local.test`
- Senha: `admin123456`

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
