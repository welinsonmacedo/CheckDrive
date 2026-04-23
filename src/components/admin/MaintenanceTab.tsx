import React, { useState, useEffect } from "react";
import { Search, CheckCircle2, Download, X, ZoomIn, ZoomOut, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function MaintenanceTab() {

  const [issues, setIssues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {

    setLoading(true);

    try {

      const { data: issuesData, error } = await supabase
        .from("checklist_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setIssues([]);
        setLoading(false);
        return;
      }

      const submissionIds = [...new Set(issuesData.map((i: any) => i.submission_id))];

      const { data: submissionsData } = await supabase
        .from("checklist_submissions")
        .select("id, type")
        .in("id", submissionIds);

      const fuelSubmissionIds =
        submissionsData
          ?.filter((s: any) => s.type === "fuel")
          .map((s: any) => s.id) || [];

      const filteredIssues = issuesData.filter(
        (i: any) => !fuelSubmissionIds.includes(i.submission_id)
      );

      const vehicleIds = [...new Set(filteredIssues.map((i: any) => i.vehicle_id))];
      const driverIds = [...new Set(filteredIssues.map((i: any) => i.driver_id))];

      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, plate, model")
        .in("id", vehicleIds);

      const { data: drivers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", driverIds);

      const issuesWithRelations = filteredIssues.map((issue: any) => ({
        ...issue,
        vehicles: vehicles?.find(v => v.id === issue.vehicle_id),
        profiles: drivers?.find(d => d.id === issue.driver_id)
      }));

      setIssues(issuesWithRelations);

    } catch (error) {

      console.error(error);

    }

    setLoading(false);

  }

  async function handleResolveIssue(issueId: string) {

    const notes = window.prompt("Observações da solução (opcional):");

    if (notes === null) return;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("checklist_issues")
      .update({
        status: "resolved",
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id
      })
      .eq("id", issueId);

    fetchIssues();
  }

  function openImageModal(issue: any) {

    if (!issue?.photo_url) return;

    const publicUrl = supabase
      .storage
      .from("checklist-photos")
      .getPublicUrl(issue.photo_url).data.publicUrl;

    setSelectedImage(publicUrl);
    setSelectedIssue(issue);
    setZoom(1);

  }

  async function downloadImage() {

    if (!selectedImage || !selectedIssue) return;

    const response = await fetch(selectedImage);
    const blob = await response.blob();

    const plate = selectedIssue.vehicles?.plate || "veiculo";

    const date = new Date(selectedIssue.created_at)
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");

    const fileName = `${plate}_${date}.jpg`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

  }

  // Filtrar issues por status e search
  const filteredIssues = issues
    .filter(issue => issue.status === activeTab)
    .filter(issue =>
      issue.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.item_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const pendingCount = issues.filter(i => i.status === "pending").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;

  return (

    <div className="space-y-6">

      {/* Abas */}
      <div className="bento-card !p-0 overflow-hidden">
        <div className="border-b border-app-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "pending"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <AlertCircle size={16} />
              Pendentes
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "resolved"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <CheckCircle size={16} />
              Resolvidos
              {resolvedCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
                  {resolvedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pendências */}
      <div className="bento-card !p-0 overflow-hidden">

        <div className="p-5 border-b border-app-border flex items-center justify-between">

          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {activeTab === "pending" ? "Pendências de Manutenção" : "Manutenções Resolvidas"}
          </span>

          <div className="relative">

            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>

            <input
              type="text"
              placeholder="Filtrar placa, item ou motorista..."
              className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] border border-app-border w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

          </div>

        </div>

        {filteredIssues.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              {activeTab === "pending" ? (
                <>
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-500">Nenhuma pendência encontrada!</p>
                  <p className="text-xs text-gray-400">Todas as manutenções estão em dia.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Nenhuma manutenção resolvida encontrada.</p>
                  <p className="text-xs text-gray-400">As manutenções resolvidas aparecerão aqui.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Item</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Foto</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-app-border">

                {filteredIssues.map((issue) => {

                  const imageUrl = issue.photo_url
                    ? supabase
                        .storage
                        .from("checklist-photos")
                        .getPublicUrl(issue.photo_url).data.publicUrl
                    : null;

                  return (

                    <tr key={issue.id} className="hover:bg-gray-50 transition-colors">

                      <td className="px-5 py-4 text-xs">
                        {new Date(issue.created_at).toLocaleDateString()}
                        <div className="text-[10px] text-gray-400">
                          {new Date(issue.created_at).toLocaleTimeString()}
                        </div>
                       </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-sm">{issue.vehicles?.plate}</div>
                        <div className="text-[10px] text-gray-400">{issue.vehicles?.model}</div>
                       </td>

                      <td className="px-5 py-4 text-sm">
                        {issue.profiles?.full_name || "N/A"}
                       </td>

                      <td className="px-5 py-4">
                        <div className="text-sm font-medium">{issue.item_title}</div>
                        {issue.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs">
                            {issue.description}
                          </div>
                        )}
                       </td>

                      <td className="px-5 py-4">

                        {imageUrl && (

                          <img
                            src={imageUrl}
                            className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 hover:shadow-md transition-all"
                            onClick={() => openImageModal(issue)}
                            alt="Defeito"
                          />

                        )}

                       </td>

                      <td className="px-5 py-4 text-right">

                        {issue.status === "pending" && (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                          >
                            <CheckCircle2 size={14}/>
                            Resolver
                          </button>
                        )}

                        {issue.status === "resolved" && (
                          <div className="text-left">
                            <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle size={14} />
                              Resolvido
                            </div>

                            {issue.resolution_notes && (
                              <div className="text-text-muted text-xs mt-1 max-w-xs">
                                {issue.resolution_notes}
                              </div>
                            )}

                            {issue.resolved_at && (
                              <div className="text-[10px] text-gray-400 mt-1">
                                {new Date(issue.resolved_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}

                       </td>

                    </tr>

                  );

                })}

                {loading && (

                  <tr>

                    <td colSpan={6} className="text-center py-8 text-sm text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                        Carregando...
                      </div>
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* Modal de Imagem */}
      {selectedImage && (

        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setSelectedImage(null)}>

          <div className="relative max-w-5xl" onClick={(e) => e.stopPropagation()}>

            <img
              src={selectedImage}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[80vh] transition-transform duration-200"
              alt="Defeito"
            />

            {/* Info do Issue */}
            {selectedIssue && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold">{selectedIssue.vehicles?.plate}</span>
                    <span className="mx-2">•</span>
                    <span>{selectedIssue.item_title}</span>
                  </div>
                  <div className="text-xs">
                    {new Date(selectedIssue.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedIssue.description && (
                  <div className="text-xs mt-1 text-gray-300">
                    {selectedIssue.description}
                  </div>
                )}
              </div>
            )}

            <div className="absolute top-4 right-4 flex gap-2">

              <button
                onClick={() => setZoom(zoom + 0.2)}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <ZoomIn size={18}/>
              </button>

              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <ZoomOut size={18}/>
              </button>

              <button
                onClick={downloadImage}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <Download size={18}/>
              </button>

              <button
                onClick={() => setSelectedImage(null)}
                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-md"
              >
                <X size={18}/>
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

} 