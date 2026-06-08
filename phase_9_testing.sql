-- Fase 9 - Testes de Invasão e Validação da Arquitetura
-- Consultas feitas sob token para verificar blindagem. Execute conectando-se sob a conta do locatário.

-- 1. DRIVER - Tenta virar ADMIN / SUPERADMIN usando Patch RLS Exposto
-- Resultado Esperado: UPDATE não surte efeito em `role` ou devolve Exception de Trigger.
UPDATE public.profiles SET role = 'superadmin' WHERE id = auth.uid();

-- 2. DRIVER - Tenta Mudar Escala Alheia
-- Resultado Esperado: Falha na Role (USING do company mismatch ou auth failure).
UPDATE public.schedules SET driver_id = '00000000-0000-0000-0000-000000000000' WHERE driver_id != auth.uid();

-- 3. ADMIN - Tenta excluir veículo de outra empresa
-- Resultado Esperado: Linhas afetadas = 0
DELETE FROM public.vehicles 
WHERE company_id != (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- 4. ADMIN - Tentar listar frotas cruzadas (Spam do backend)
-- Resultado Esperado: Apenas a própria empresa irá retornar devida ao 'can_access_company'.
SELECT * FROM public.vehicles;

-- 5. DRIVER - Listar buckets não perimitdos
-- Resultado esperado: Retorna Nulo ou falha.
SELECT * FROM storage.objects WHERE bucket_id = 'checklist-photos' AND (storage.foldername(name))[1] != auth.uid()::text;
