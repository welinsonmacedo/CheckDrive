import os
import re

file_path = "src/modules/company/monitoring/components/DriverSidebar.tsx"
with open(file_path, "r") as f:
    content = f.read()

trips_render = """
          ) : currentTab === "trips" ? (
            /* TAB 3: HISTÓRICO DE TRAJETOS */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/40 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-purple-400 font-black">
                  <Navigation size={16} />
                  <span>Histórico de Trajetos</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Lista de trajetos já realizados. Filtre pela data clicando no botão de filtros acima.
                </p>
              </div>

              <div className="space-y-2 pb-20">
                {loadingTripsHistory ? (
                  <div className="p-8 text-center text-slate-400">
                    <Radio size={24} className="animate-pulse mx-auto mb-2 opacity-50" />
                    <p className="text-[11px]">Carregando trajetos...</p>
                  </div>
                ) : !tripsHistory || tripsHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <p className="text-[11px]">Nenhum trajeto encontrado para a data {filters.date}.</p>
                  </div>
                ) : (
                  tripsHistory.map((trip) => (
                    <div 
                      key={trip.trip_id}
                      className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl hover:bg-slate-800 transition cursor-pointer"
                      onClick={() => {
                        onSelectDriver(trip.driver_id);
                        if (onFilterChange) onFilterChange({ ...filters, tripId: trip.trip_id });
                        if (onSidebarTabChange) onSidebarTabChange("drivers");
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Users size={14} className="text-blue-400" />
                          <span>{driverStates.find(d => d.driver_id === trip.driver_id)?.driver?.full_name || "Motorista"}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          {trip.totalPositions} pts
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400">Início</span>
                          <span className="text-xs font-medium text-slate-200">
                            {new Date(trip.firstPositionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400">Fim</span>
                          <span className="text-xs font-medium text-slate-200">
                            {new Date(trip.lastPositionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400">Movimento</span>
                          <span className="text-xs font-bold text-emerald-400">
                            {formatDuration(trip.movingTimeMs)}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400">Parado</span>
                          <span className="text-xs font-bold text-rose-400">
                            {formatDuration(trip.stoppedTimeMs)}
                          </span>
                        </div>
                        
                        <div className="flex flex-col col-span-2 mt-1 pt-2 border-t border-slate-700/50">
                          <span className="text-[10px] text-slate-400">Velocidade Máxima</span>
                          <span className="text-xs font-bold text-amber-400">{trip.maxSpeedKmh} km/h</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
"""

# Replace the original closing of drivers tab to add the new condition
content = content.replace(
    '          ) : (\n            /* TAB 2: EVENTOS E EXCESSO DE VELOCIDADE */',
    trips_render + '\n          ) : (\n            /* TAB 2: EVENTOS E EXCESSO DE VELOCIDADE */'
)

with open(file_path, "w") as f:
    f.write(content)
