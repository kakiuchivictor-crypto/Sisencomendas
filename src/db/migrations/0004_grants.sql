-- Custom SQL migration file, put your code below! --

-- sisencomendas_app nao e dona das tabelas (sisencomendas_owner e), entao
-- esta sempre sujeita as RLS policies. login_throttle e deliberadamente
-- omitida aqui: so a conexao privilegiada (dbService) le/escreve nela,
-- durante o login, antes de existir sessao.
GRANT USAGE ON SCHEMA sisencomendas TO sisencomendas_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  sisencomendas.condominios,
  sisencomendas.usuarios,
  sisencomendas.moradores,
  sisencomendas.encomendas
  TO sisencomendas_app;

-- USAGE na schema e pre-requisito para o GRANT na tabela abaixo fazer
-- efeito — sem ela, o Postgres nega acesso mesmo com SELECT concedido.
-- So faz sentido no shim local: no Supabase real, "authenticated" nao tem
-- (e nao deve ter) acesso direto a auth.users, que fica atras de RLS
-- propria do GoTrue (ver supabase/CUTOVER.md, item 3).
GRANT USAGE ON SCHEMA auth TO sisencomendas_app;
GRANT SELECT, INSERT ON auth.users TO sisencomendas_app;

GRANT EXECUTE ON FUNCTION sisencomendas.current_condominio_id() TO sisencomendas_app;
GRANT EXECUTE ON FUNCTION sisencomendas.current_usuario_role() TO sisencomendas_app;
