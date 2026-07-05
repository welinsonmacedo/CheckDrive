import { supabase } from "@/src/lib/supabase";

let isAuditing = false;

export const runSilentAudit = async () => {
  if (isAuditing) return;
  isAuditing = true;
  try {
    // Threshold: 1 hour after end_at
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    // Check if the user is authenticated and has permission implicitly by attempting fetch
    const { data: expired, error } = await supabase
      .from("schedules")
      .select(
        "*, routes(origin, destination), vehicles(plate), profiles(participates_in_ranking, score_profiles(penalty_start, penalty_end, penalty_fuel, penalty_yard, apply_penalty_start, apply_penalty_end, apply_penalty_fuel, apply_penalty_yard, base_value, calculation_type))",
      )
      .lt("end_at", oneHourAgo)
      .eq("penalty_applied", false);

    // If RLS prevents it or no records, just silently exit
    if (error || !expired || expired.length === 0) {
      return;
    }

    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .single();
    const appSettings = settings || {};

    for (const schedule of expired) {
      // Check if this specific penalty was already applied FIRST
      const { data: existingLogs, error: checkError } = await supabase
        .from("audit_logs")
        .select("id")
        .eq("driver_id", schedule.driver_id)
        .eq("type", "penalty")
        .ilike("reason", `%[ID: ${schedule.id}]%`)
        .limit(1);

      if (checkError) {
        console.error("Error checking existing audit logs:", checkError);
        continue;
      }

      // If it's already applied, just heal the schedule state and skip
      if (existingLogs && existingLogs.length > 0) {
        await supabase
          .from("schedules")
          .update({ penalty_applied: true })
          .eq("id", schedule.id);
        continue;
      }

      // Optimistic lock: try to claim this schedule for auditing
      const { data: lockedSchedule, error: lockError } = await supabase
        .from("schedules")
        .update({ penalty_applied: true })
        .eq("id", schedule.id)
        .eq("penalty_applied", false)
        .select("id")
        .maybeSingle();

      // If no row is returned, it was already processed by another client/process
      if (lockError || !lockedSchedule) {
        continue;
      }

      // If driver doesn't participate in ranking, we just skip penalties (already marked as audited)
      if (schedule.profiles?.participates_in_ranking === false) {
        continue;
      }

      const profileInfo = schedule.profiles?.score_profiles || {};
      const missingStart = !schedule.start_checklist_id;
      const missingEnd = !schedule.end_checklist_id;
      const missingFuel =
        schedule.requires_fueling !== false && !schedule.fuel_checklist_id;

      if (missingStart || missingEnd || missingFuel) {
        // Check if penalties apply (defaults to true if undefined)
        const applyStart = profileInfo.apply_penalty_start !== false;
        const applyEnd = profileInfo.apply_penalty_end !== false;
        const applyFuel = profileInfo.apply_penalty_fuel !== false;

        const pStart = applyStart
          ? Number(profileInfo.penalty_start ?? appSettings.penalty_start ?? 50)
          : 0;
        const pEnd = applyEnd
          ? Number(profileInfo.penalty_end ?? appSettings.penalty_end ?? 50)
          : 0;
        const pFuel = applyFuel
          ? Number(profileInfo.penalty_fuel ?? appSettings.penalty_fuel ?? 50)
          : 0;

        let totalPenalty = 0;
        if (missingStart && applyStart) totalPenalty += pStart;
        if (missingEnd && applyEnd) totalPenalty += pEnd;
        if (missingFuel && applyFuel) totalPenalty += pFuel;

        // If total penalty is 0, we can just continue (already marked as audited)
        if (totalPenalty === 0) {
          continue;
        }

        // Build detailed reason
        const missingItems = [];
        if (missingStart && applyStart) missingItems.push("inicial");
        if (missingEnd && applyEnd) missingItems.push("final");
        if (missingFuel && applyFuel) missingItems.push("abastecimento");

        const formatDate = (dateString: string) => {
          return (
            new Date(dateString).toLocaleDateString() +
            " " +
            new Date(dateString).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        };

        const routeStr = schedule.routes
          ? `${schedule.routes.origin} ➔ ${schedule.routes.destination}`
          : "Rota não definida";
        const vehicleStr = schedule.vehicles
          ? schedule.vehicles.plate
          : "Sem veículo";

        const reason = `Penalidade automática: Falta de checklist ${missingItems.join(", ").replace(/, ([^,]*)$/, " e $1")}. Detalhes da Escala: Início ${formatDate(schedule.start_at)}, Fim ${formatDate(schedule.end_at)}. ${routeStr}. Veículo: ${vehicleStr}. [ID: ${schedule.id}]`;

        // Apply penalty to performance
        const { data: perfList } = await supabase
          .from("driver_performance")
          .select("score")
          .eq("driver_id", schedule.driver_id)
          .limit(1);

        const perf = perfList && perfList.length > 0 ? perfList[0] : null;

        let baseScore = Number(appSettings.initial_value || 1000);
        if (profileInfo && profileInfo.calculation_type) {
          if (
            profileInfo.calculation_type === "fixed" &&
            profileInfo.base_value !== undefined
          ) {
            baseScore = Number(profileInfo.base_value);
          } else if (profileInfo.calculation_type !== "fixed") {
            baseScore = 0;
          }
        }

        // Use perf.score if it exists (can be 0 or negative), else baseScore
        const currentScore = perf ? perf.score : baseScore;
        const newScore = currentScore - totalPenalty;

        const { error: upsertError } = await supabase.from("driver_performance").upsert({
          driver_id: schedule.driver_id,
          score: newScore,
          updated_at: new Date().toISOString(),
        });
        
        if (upsertError) {
            console.error("Error updating performance:", upsertError);
            continue;
        }

        // Log Audit
        const { error: insertError } = await supabase.from("audit_logs").insert({
          driver_id: schedule.driver_id,
          type: "penalty",
          amount: totalPenalty,
          reason,
        });
        
        if (insertError) {
            console.error("Error inserting audit log:", insertError);
        }
      }
    }
  } catch (err) {
    // Silently fail on background audit
  } finally {
    isAuditing = false;
  }
};
