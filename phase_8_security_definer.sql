-- Fase 8 - Revisão das funções SECURITY DEFINER
-- Reforçando os parâmetros para impedir vazamentos infraestruturais paralelos.

CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size BIGINT;
    storage_size BIGINT := 0;
    file_count BIGINT := 0;
    fotos_size BIGINT := 0;
    docs_size BIGINT := 0;
    out_json JSON;
    user_role TEXT;
    u_company_id UUID;
BEGIN
    SELECT role, company_id INTO user_role, u_company_id FROM public.profiles WHERE id = auth.uid();
    
    -- Se for superadmin, dá um overview da base. 
    -- Se for admin comum, retorna contadores apenas dos seus sub-pastas de files.
    IF user_role = 'superadmin' THEN
        SELECT pg_database_size(current_database()) INTO db_size;
        
        BEGIN
            SELECT COALESCE(SUM((metadata->>'size')::numeric), 0), COUNT(*)
            INTO storage_size, file_count
            FROM storage.objects;
            
            SELECT COALESCE(SUM((metadata->>'size')::numeric), 0)
            INTO fotos_size
            FROM storage.objects
            WHERE bucket_id IN ('checklist-photos', 'truck-photos');

            SELECT COALESCE(SUM((metadata->>'size')::numeric), 0)
            INTO docs_size
            FROM storage.objects
            WHERE bucket_id NOT IN ('checklist-photos', 'truck-photos');
        EXCEPTION WHEN OTHERS THEN
             -- Default
        END;
    ELSIF user_role = 'admin' THEN
        db_size := 0; -- Admins não gerenciam banco inteiro
        
        BEGIN
            SELECT COALESCE(SUM((obj.metadata->>'size')::numeric), 0), COUNT(obj.id)
            INTO storage_size, file_count
            FROM storage.objects obj
            INNER JOIN public.profiles p ON (storage.foldername(obj.name))[1] = p.id::text
            WHERE p.company_id = u_company_id;
            
            SELECT COALESCE(SUM((obj.metadata->>'size')::numeric), 0)
            INTO fotos_size
            FROM storage.objects obj
            INNER JOIN public.profiles p ON (storage.foldername(obj.name))[1] = p.id::text
            WHERE p.company_id = u_company_id AND obj.bucket_id IN ('checklist-photos', 'truck-photos');

            docs_size := storage_size - fotos_size;
        EXCEPTION WHEN OTHERS THEN
             -- Default
        END;
    ELSE
        -- Drivers ou Standard
        db_size := 0;
    END IF;

    out_json := json_build_object(
        'db_size', db_size,
        'storage_size', storage_size,
        'file_count', file_count,
        'fotos_size', fotos_size,
        'docs_size', docs_size
    );
    
    RETURN out_json;
END;
$$;
