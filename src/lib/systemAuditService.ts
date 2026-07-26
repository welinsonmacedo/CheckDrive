import { supabase } from "@/src/lib/supabase";

export interface SystemAuditPayload {
  company_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  module:
    | "Ativos"
    | "Motoristas"
    | "Empresas"
    | "Configurações"
    | "Ordens de Serviço"
    | "Manutenções"
    | "Checklists"
    | "Multas"
    | "Escalas"
    | "Usuários"
    | "Permissões"
    | "Autenticação"
    | string;
  entity: string; // e.g. "vehicles", "drivers", "work_orders", "app_settings"
  entity_id?: string;
  action:
    | "CRIAR"
    | "EDITAR"
    | "EXCLUIR"
    | "RESTAURAR"
    | "CONCLUIR"
    | "CANCELAR"
    | "APROVAR"
    | "REPROVAR"
    | "BLOQUEAR"
    | "DESBLOQUEAR"
    | "RESET_SENHA"
    | "LOGIN"
    | "LOGOUT"
    | "FALHA_LOGIN"
    | "ALTERAR_SENHA"
    | string;
  field_changed?: string;
  old_value?: Record<string, any> | any;
  new_value?: Record<string, any> | any;
  ip_address?: string;
  user_agent?: string;
  type?: string; // fallback or category e.g. "system_action"
  reason?: string; // human readable summary
}

/**
 * Transparently and asynchronously logs a system audit action.
 * Never throws or blocks main workflow execution.
 */
export async function logSystemAudit(payload: SystemAuditPayload): Promise<void> {
  try {
    // 1. Fill default user context from active Supabase session or target user ID if missing
    let userId = payload.user_id;
    let userName = payload.user_name;
    let userEmail = payload.user_email;
    let userRole = payload.user_role;
    let companyId = payload.company_id;

    if (!userId || !userEmail || !companyId || !userName) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        userId = userId || session.user.id;
        userEmail = userEmail || session.user.email;
      }

      const activeUserId = userId || session?.user?.id;
      if (activeUserId) {
        // Fetch profile metadata for company_id, name, role
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role, company_id")
          .eq("id", activeUserId)
          .maybeSingle();

        if (profile) {
          userName = userName || profile.full_name || userEmail;
          userRole = userRole || profile.role;
          companyId = companyId || profile.company_id;
        }
      }
    }

    // 2. Format a human readable summary in reason if empty
    let summary = payload.reason;
    if (!summary) {
      summary = `Ação [${payload.action}] no módulo [${payload.module}] na entidade [${payload.entity}${payload.entity_id ? ` #${payload.entity_id}` : ""}] realizada por ${userName || userEmail || "Usuário"}`;
    }

    const logEntry = {
      company_id: companyId || null,
      user_id: userId || null,
      user_name: userName || userEmail || "Sistema",
      user_email: userEmail || null,
      user_role: userRole || "admin",
      module: payload.module,
      entity: payload.entity,
      entity_id: payload.entity_id ? String(payload.entity_id) : null,
      action: payload.action,
      field_changed: payload.field_changed || null,
      old_value: payload.old_value ? payload.old_value : null,
      new_value: payload.new_value ? payload.new_value : null,
      ip_address: payload.ip_address || (typeof window !== "undefined" ? "web_client" : null),
      user_agent:
        payload.user_agent || (typeof navigator !== "undefined" ? navigator.userAgent : null),
      type: payload.type || "system_action",
      reason: summary,
      created_at: new Date().toISOString(),
    };

    // 3. Insert into system_audit_logs
    const { error } = await supabase.from("system_audit_logs").insert(logEntry);

    if (error) {
      console.error(
        "Erro ao salvar log na tabela 'system_audit_logs'. Por favor, certifique-se de executar o script SQL no Supabase para criar a tabela. Detalhes:",
        error.message,
        error
      );

      // Attempt fallback insert into audit_logs
      const { error: fallbackErr } = await supabase.from("audit_logs").insert({
        company_id: companyId || null,
        driver_id: userId || null,
        type: "system_action",
        amount: 0,
        reason: `${logEntry.module} | ${logEntry.action}: ${summary}`,
        created_at: logEntry.created_at,
      });

      if (fallbackErr) {
        console.warn("Fallback insert to audit_logs also failed:", fallbackErr.message);
      }
    }
  } catch (err) {
    console.warn("Silent failure writing audit log:", err);
  }
}

/**
 * Purge expired audit logs based on retention days (90, 180, 365 days)
 */
export async function purgeExpiredAuditLogs(companyId: string, retentionDays: number): Promise<{ deleted: number }> {
  if (retentionDays <= 0) return { deleted: 0 };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  let query = supabase.from("system_audit_logs").delete().lt("created_at", cutoffIso);
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("Error purging expired audit logs:", error);
    throw error;
  }

  return { deleted: data ? data.length : 0 };
}
