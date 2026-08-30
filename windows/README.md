# Instalação no laboratório (Windows)

Este modo instala tudo (frontend + backend + PostgreSQL) em **um único PC**,
que passa a funcionar como o "servidor" do laboratório. Os demais PCs **não
instalam nada** — só acessam pelo navegador, no mesmo endereço que o script
imprime ao final.

Este instalador ainda **não foi testado numa máquina Windows real** (foi
escrito e revisado com cuidado, mas construído fora do Windows). Rode a
primeira instalação com atenção à saída do script e volte aqui se algo
falhar — cada etapa imprime uma mensagem de erro específica.

## Pré-requisitos

- Windows 10/11 com `winget` disponível (já vem por padrão; se não tiver,
  o script avisa e diz onde pegar).
- PowerShell como **Administrador**.
- Conexão com a internet nesse PC durante a instalação (baixa Node.js,
  PostgreSQL e o NSSM via winget, e as dependências do projeto via npm).
- Esse PC precisa ficar ligado (ou pelo menos a conta do Windows logada)
  para os outros PCs conseguirem acessar — o serviço reinicia sozinho
  junto com o Windows, mas não sobrevive ao PC desligado.

## Passo a passo

1. Baixe/clone o repositório para um lugar **definitivo** neste PC — por
   exemplo `C:\DBLAPOGE` (não em Downloads ou numa pasta temporária: o
   serviço do Windows fica registrado apontando para esse caminho).
2. Abra o PowerShell **como Administrador**, entre na pasta do projeto e
   rode:
   ```powershell
   cd C:\DBLAPOGE
   .\windows\install-server.ps1
   ```
3. Acompanhe a saída. Ao final, o script imprime:
   - o endereço (`http://<ip-deste-pc>:8080`) para configurar nos outros
     PCs do laboratório;
   - o email e a senha do administrador inicial (gerada automaticamente —
     troque assim que fizer o primeiro login).

## Nos outros PCs do laboratório

Não precisa instalar nada. Basta:
- criar um favorito no navegador apontando para o endereço impresso pelo
  script (`http://<ip-do-pc-servidor>:8080`), ou
- criar um atalho na área de trabalho: clique direito → Novo → Atalho →
  cole o endereço.

## Depois de instalado

- **Logs**: `logs\service.log` e `logs\service-error.log`, dentro da pasta
  do projeto.
- **Reiniciar o serviço** (ex.: depois de editar `backend\local-api\.env`,
  como para configurar SMTP de verdade): `nssm restart DBLAPOGE` num
  PowerShell como Administrador.
- **Ver status**: `nssm status DBLAPOGE`.
- **Desinstalar** (remove o serviço e a regra de firewall, mas mantém o
  banco de dados e os arquivos do projeto):
  ```powershell
  .\windows\uninstall-server.ps1
  ```

## Sobre segurança nesse modo

Esse modo serve a aplicação em **HTTP simples, sem HTTPS**, pensado para
ficar só dentro da rede local do laboratório — as senhas e tokens trafegam
sem criptografia entre os PCs e o servidor. Isso é uma troca aceitável numa
rede interna confiável (cabo/Wi-Fi só do laboratório), mas:

- **Nunca** exponha essa porta diretamente para a internet (redirecionamento
  de porta no roteador, etc.) sem adicionar HTTPS antes — para acesso
  remoto de verdade (fora do laboratório), use o caminho com Docker +
  Caddy descrito em `README_SUBSTITUICAO_LOCAL.md`, que já cuida disso.
- Se a rede Wi-Fi do laboratório for compartilhada com outras pessoas/
  visitantes, considere separar numa rede/VLAN própria, já que qualquer
  um nessa rede consegue ver o tráfego em texto claro.

## O que o script faz, em ordem

1. Instala Node.js LTS (se não houver) via winget.
2. Instala PostgreSQL 16 (se não houver) via winget, com senha de
   superusuário gerada aleatoriamente, e cria o banco `dblapoge`.
3. Gera `backend\local-api\.env` com `JWT_SECRET` aleatório, a senha do
   Postgres gerada, e uma senha de administrador aleatória (só na primeira
   instalação — se o `.env` já existir, ele é preservado).
4. Instala as dependências e builda o frontend (`npm run build`, com
   `VITE_API_URL` vazio — o próprio backend passa a servir o frontend).
5. Registra o backend como Serviço do Windows via NSSM (início automático).
6. Libera a porta escolhida (padrão 8080) no Firewall do Windows.
7. Confere que `/health` responde antes de dar por concluído.
