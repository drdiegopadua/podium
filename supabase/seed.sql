-- Podium - dados de seed para desenvolvimento local

insert into esportes (nome, padrao, configuracao_sumula) values
('Volei', true, '{
  "sets": { "quantidade_max": 5, "pontos_por_set": 25, "tie_break": 15 },
  "campos_por_atleta": ["pontos", "aces", "bloqueios", "erros_saque"],
  "eventos_jogo": ["substituicao", "tempo_tecnico", "cartao"],
  "ordem_saque": true
}'::jsonb),
('Basquete', true, '{
  "periodos": 4,
  "duracao_periodo_min": 10,
  "campos_por_atleta": ["pontos", "rebotes", "assistencias", "faltas"],
  "faltas_max_atleta": 5
}'::jsonb),
('Handebol', true, '{
  "periodos": 2,
  "duracao_periodo_min": 30,
  "campos_por_atleta": ["gols", "assistencias", "exclusoes"],
  "faltas_max_atleta": 3
}'::jsonb),
('Futsal', true, '{
  "periodos": 2,
  "duracao_periodo_min": 20,
  "campos_por_atleta": ["gols", "assistencias", "cartoes"],
  "faltas_max_atleta": 5
}'::jsonb);
