import React, { useState, useEffect } from "react";
import { Search, CheckCircle2, Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function MaintenanceTab() {

  const [issues, setIssues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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
        .order("status", { ascending: false })
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
        .select("id, plate")
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

  const filteredIssues = issues.filter(issue =>
    issue.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.item_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (

    <div className="space-y-6">

      <div className="bento-card !p-0 overflow-hidden">

        <div className="p-5 border-b border-app-border flex items-center justify-between">

          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Pendências de Manutenção
          </span>

          <div className="relative">

            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>

            <input
              type="text"
              placeholder="Filtrar placa ou item..."
              className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] border border-app-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <tbody className="divide-y divide-app-border">

              {filteredIssues.map((issue) => {

                const imageUrl = issue.photo_url
                  ? supabase
                      .storage
                      .from("checklist-photos")
                      .getPublicUrl(issue.photo_url).data.publicUrl
                  : null;

                return (

                  <tr key={issue.id}>

                    <td className="px-5 py-4">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      {issue.vehicles?.plate}
                    </td>

                    <td className="px-5 py-4">

                      {imageUrl && (

                        <img
                          src={imageUrl}
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => openImageModal(issue)}
                        />

                      )}

                    </td>

<td className="px-5 py-4">

  {issue.status === "pending" && (
    <button
      onClick={() => handleResolveIssue(issue.id)}
      className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1"
    >
      <CheckCircle2 size={14}/>
      Resolver
    </button>
  )}

  {issue.status === "resolved" && (
    <div className="text-sm text-green-500">
      <div className="font-semibold">Resolvido</div>

      {issue.resolution_notes && (
        <div className="text-text-muted text-xs mt-1">
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

                  <td colSpan={4} className="text-center py-6 text-sm text-gray-400">
                    Carregando...
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {selectedImage && (

        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">

          <div className="relative max-w-5xl">

            <img
              src={selectedImage}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[80vh] transition"
            />

            <div className="absolute top-4 right-4 flex gap-2">

              <button
                onClick={() => setZoom(zoom + 0.2)}
                className="bg-white p-2 rounded"
              >
                <ZoomIn size={18}/>
              </button>

              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                className="bg-white p-2 rounded"
              >
                <ZoomOut size={18}/>
              </button>

              <button
                onClick={downloadImage}
                className="bg-white p-2 rounded"
              >
                <Download size={18}/>
              </button>

              <button
                onClick={() => setSelectedImage(null)}
                className="bg-red-500 text-white p-2 rounded"
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