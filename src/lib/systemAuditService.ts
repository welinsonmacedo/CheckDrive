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
    // 1. Fill default user context from active Supabase session if not explicitly provided
    let userId = payload.user_id;
    let userName = payload.user_name;
    let userEmail = payload.user_email;
    let userRole = payload.user_role;
    let companyId = payload.company_id;

    if (!userId || !userEmail || !companyId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        userId = userId || session.user.id;
        userEmail = userEmail || session.user.email;

        // Try getting profile metadata if missing
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role, company_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          userName = userName || profile.full_name || session.user.email;
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
      company_id: companyId,
      user_id: userId,
      user_name: userName || userEmail || "Sistema",
      user_email: userEmail,
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
      console.warn("Notice: Failed to insert into system_audit_logs, trying fallback to audit_logs:", error.message);
      // Fallback insert with standard existing columns in audit_logs
      await supabase.from("audit_logs").insert({
        company_id: companyId,
        driver_id: userId,
        type: "system_action",
        reason: `${logEntry.module} | ${logEntry.action}: ${summary}`,
        created_at: logEntry.created_at,
      });
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
