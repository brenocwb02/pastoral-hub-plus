-- FASE 3.1: Adicionar nova role ao enum
-- Este deve ser executado primeiro e separadamente

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lider_casa';