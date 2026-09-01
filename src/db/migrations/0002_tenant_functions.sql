-- Custom SQL migration file, put your code below! --

-- auth.uid()/auth.role()/auth.jwt() ja existem (criados na migration
-- anterior) e continuam sendo o nosso shim local do contrato do Supabase Auth.
--
-- current_condominio_id() e current_usuario_role() substituem as antigas
-- auth.condominio_id()/auth.app_role() (que liam claims fixos do JWT, ficando
-- desatualizadas se o role/condominio do usuario mudasse depois do login).
-- Agora consultam sisencomendas.usuarios ao vivo a cada chamada, usando
-- apenas auth.uid() (identidade) como entrada confiavel do JWT — uma
-- mudanca de role feita pelo admin tem efeito imediato na proxima
-- requisicao, em vez de esperar a sessao expirar (ate 7 dias).
--
-- SECURITY DEFINER: roda com o privilegio de quem criou a funcao (o owner,
-- dono da tabela usuarios), entao a consulta interna ignora RLS — sem isso
-- teriamos uma dependencia circular (a policy de usuarios.select depende
-- desta funcao, que por sua vez consultaria usuarios sob a mesma policy).
-- search_path fixo previne um ataque classico de sequestro de search_path
-- contra funcoes SECURITY DEFINER.
CREATE FUNCTION sisencomendas.current_condominio_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sisencomendas, pg_temp
AS $$
  SELECT condominio_id FROM sisencomendas.usuarios WHERE id = auth.uid()
$$;

CREATE FUNCTION sisencomendas.current_usuario_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sisencomendas, pg_temp
AS $$
  SELECT role::text FROM sisencomendas.usuarios WHERE id = auth.uid()
$$;
