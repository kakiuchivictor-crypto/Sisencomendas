-- Custom SQL migration file, put your code below! --

-- Renomeia o valor do enum (nao a permissao): "admin" vira "desenvolvedor".
-- E so o rotulo interno mudando de nome — linhas existentes com role='admin'
-- passam a valer 'desenvolvedor' automaticamente, sem precisar de UPDATE.
ALTER TYPE "sisencomendas"."usuario_role" RENAME VALUE 'admin' TO 'desenvolvedor';
--> statement-breakpoint

-- Nova funcao: tem quase as mesmas permissoes do desenvolvedor, exceto
-- gerenciar usuarios e configuracoes (ver policies em 0010).
ALTER TYPE "sisencomendas"."usuario_role" ADD VALUE 'administracao';
