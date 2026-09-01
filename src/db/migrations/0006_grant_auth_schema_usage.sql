-- Custom SQL migration file, put your code below! --

-- Corrige bug: 0004_grants.sql concedeu SELECT/INSERT em auth.users mas
-- esqueceu o USAGE na schema "auth", que e pre-requisito no Postgres.
-- Sem ele, qualquer query de sisencomendas_app que referencie auth.users
-- falha com "permissao negada para esquema auth" (ex: pagina /usuarios).
GRANT USAGE ON SCHEMA auth TO sisencomendas_app;
