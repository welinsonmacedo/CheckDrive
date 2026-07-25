import { supabase } from "@/src/lib/supabase";
import { DriverLocation } from "../types";

export function subscribeDriverLocations(
  companyId: string,
  onNewLocation: (location: DriverLocation) => void
) {
  if (!companyId) return () => {};

  const channelName = `driver_locations_company_${companyId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "driver_locations",
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewLocation(payload.new as DriverLocation);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "driver_locations",
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewLocation(payload.new as DriverLocation);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Supabase Realtime] Connected to driver_locations for company ${companyId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
