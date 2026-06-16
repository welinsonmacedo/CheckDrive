import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, AlertCircle, Camera } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import imageCompression from "browser-image-compression";

interface ChecklistEditModalProps {
  submission: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ChecklistEditModal({
  submission,
  onClose,
  onSaved,
}: ChecklistEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [odometer, setOdometer] = useState(
    submission.odometer?.toString() || "",
  );
  const [itemValues, setItemValues] = useState<Record<string, string>>(
    submission.details?.itemValues || {},
  );

  // defects structure matches ChecklistFlow: Record<itemId, Array<{ description, photoUrl?, photoFile?, issueId? }>>
  const [defectData, setDefectData] = useState<
    Record<
      string,
      Array<{
        description: string;
        photoUrl?: string | null;
        photoFile?: File | null;
        issueId?: string;
      }>
    >
  >(() => {
    const data: Record<
      string,
      Array<{
        description: string;
        photoUrl?: string | null;
        photoFile?: File | null;
        issueId?: string;
      }>
    > = {};
    if (submission.details?.defects) {
      for (const [itemId, rawDefectInfo] of Object.entries(
        submission.details.defects,
      )) {
        if (!rawDefectInfo) continue;
        let arr = [];
        if (typeof rawDefectInfo === "string") {
          arr = [
            { description: rawDefectInfo, photoUrl: null, photoFile: null },
          ];
        } else {
          const defArr = Array.isArray(rawDefectInfo)
            ? rawDefectInfo
            : [rawDefectInfo];
          arr = defArr.map((d: any) => ({
            description: d.description || "",
            photoUrl: d.photoUrl || null,
            photoFile: null,
          }));
        }
        data[itemId] = arr;
      }
    }
    return data;
  });

  // Fetch actual issues from DB to ensure we have the most accurate and up-to-date descriptions/photos
  useEffect(() => {
    async function fetchIssues() {
      if (!submission.id || submission.type === "fuel") return;
      const { data, error } = await supabase
        .from("checklist_issues")
        .select("*")
        .eq("submission_id", submission.id);
      if (!error && data && data.length > 0) {
        setDefectData((prev) => {
          const newData = { ...prev };

          // Group issues by trying to match their title back to the itemId
          // Since we only have itemTitle in checklist_issues, we match via itemTitles from details
          const titleToId: Record<string, string> = {};
          if (submission.details?.itemTitles) {
            for (const [id, title] of Object.entries(
              submission.details.itemTitles,
            )) {
              titleToId[(title as string).toLowerCase().trim()] = id;
            }
          }

          // Rebuild from issues if they exist
          const grouped: Record<string, any[]> = {};
          data.forEach((issue) => {
            // Remove suffix like " (1)" to find the base title
            const baseTitle = issue.item_title.replace(/\s\(\d+\)$/, "").toLowerCase().trim();
            const itemId = titleToId[baseTitle];

            if (itemId) {
              if (!grouped[itemId]) grouped[itemId] = [];
              grouped[itemId].push({
                description: issue.description || "",
                photoUrl: issue.photo_url || null,
                photoFile: null,
                issueId: issue.id,
              });
            }
          });

          // Merge items that got found in the issues table
          for (const [itemId, arr] of Object.entries(grouped)) {
            newData[itemId] = arr;
          }

          return newData;
        });
      }
    }
    fetchIssues();
  }, [submission.id, submission.type]);

  const getPhotoUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from("checklist-photos")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedDefects: Record<string, any[]> = {
        ...submission.details?.defects,
      };

      const newIssuesToInsert: any[] = [];
      const issuesToDelete: string[] = []; // issue IDs to delete
      const issuesToUpdate: {
        id: string;
        description: string;
        photo_url: string | null;
      }[] = [];

      // Fetch existing issues for this submission once to match
      const { data: existingIssues } = await supabase
        .from("checklist_issues")
        .select("id, item_title")
        .eq("submission_id", submission.id);

      if (submission.type !== "fuel") {
        for (const [itemId, val] of Object.entries(itemValues)) {
          const oldVal = submission.details?.itemValues?.[itemId];
          const titleBase =
            submission.details?.itemTitles?.[itemId] || `Item ${itemId}`;

          // Delete existing issues if no longer defect
          if (oldVal === "defect" && val !== "defect") {
            const matchingIssues =
              existingIssues?.filter((issue) =>
                issue.item_title.startsWith(titleBase),
              ) || [];
            issuesToDelete.push(...matchingIssues.map((i) => i.id));
            delete updatedDefects[itemId];
            continue;
          }

          if (val === "defect") {
            const defectsForThisItem = defectData[itemId] || [
              {
                description:
                  "[Editado Manualmente] Defeito adicionado/alterado",
                photoUrl: null,
                photoFile: null,
              },
            ];

            const processedDefects = [];
            for (let i = 0; i < defectsForThisItem.length; i++) {
              const def = defectsForThisItem[i];
              let currentPhotoUrl = def.photoUrl;

              if (def.photoFile) {
                const path = `${user.id}/defects/${Date.now()}_${itemId}_${i}.jpg`;
                const { error: uploadError } = await supabase.storage
                  .from("checklist-photos")
                  .upload(path, def.photoFile);
                if (!uploadError) currentPhotoUrl = path;
              }

              processedDefects.push({
                description: def.description || "[Sem descrição]",
                photoUrl: currentPhotoUrl,
              });

              // How to sync with checklist_issues?
              // We can completely rebuild issues for this item to ensure correctness, or try to map them.
              // Given items can have multiple issues, it's safer to delete old issues for this item and re-insert,
              // OR update the first one and insert the rest.
              // For safety against duplicates, let's just delete whatever exists for this item and re-insert them all.
            }

            updatedDefects[itemId] = processedDefects;

            // Mark old ones for deletion
            const matchingIssues =
              existingIssues?.filter((issue) =>
                issue.item_title.startsWith(titleBase),
              ) || [];
            issuesToDelete.push(...matchingIssues.map((i) => i.id));

            // Prepare new ones for insertion
            for (let i = 0; i < processedDefects.length; i++) {
              const def = processedDefects[i];
              const issueTitle =
                processedDefects.length > 1
                  ? `${titleBase} (${i + 1})`
                  : titleBase;
              newIssuesToInsert.push({
                submission_id: submission.id,
                vehicle_id: submission.vehicle_id,
                trailer_id: submission.trailer_id,
                driver_id: submission.driver_id || user.id,
                item_title: issueTitle,
                status: "pending",
                description: def.description,
                photo_url: def.photoUrl,
                report_count: 1,
              });
            }
          } else {
            delete updatedDefects[itemId];
          }
        }
      }

      const oldDetails = submission.details || {};
      const editHistoryEntry = {
        edited_at: new Date().toISOString(),
        previous_odometer: submission.odometer,
        new_odometer: parseInt(odometer) || 0,
        previous_items: oldDetails.itemValues || {},
        new_items: itemValues,
        previous_defects: oldDetails.defects || {},
        new_defects: updatedDefects,
      };

      const updatedDetails = {
        ...oldDetails,
        itemValues,
        defects: updatedDefects,
        is_edited: true,
        edited_at: editHistoryEntry.edited_at,
        edit_history: [...(oldDetails.edit_history || []), editHistoryEntry],
      };

      // Determine final status
      const hasDefects = Object.values(itemValues).includes("defect");
      const finalStatus =
        submission.type === "fuel"
          ? "concluido"
          : hasDefects
            ? "com_defeitos"
            : "concluido";

      const { error } = await supabase
        .from("checklist_submissions")
        .update({
          odometer: parseInt(odometer) || 0,
          status: finalStatus,
          details: updatedDetails,
        })
        .eq("id", submission.id);

      if (error) throw error;

      // Sync checklist_issues
      if (issuesToDelete.length > 0) {
        await supabase
          .from("checklist_issues")
          .delete()
          .in("id", issuesToDelete);
      }
      if (newIssuesToInsert.length > 0) {
        await supabase.from("checklist_issues").insert(newIssuesToInsert);
      }

      onSaved();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const titles = submission.details?.itemTitles || {};
  const hasPhotos =
    submission.photos && Object.keys(submission.photos).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-app-border bg-app-bg">
          <div>
            <h3 className="text-lg font-black text-text-main uppercase tracking-tight">
              Editar Checklist
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Altere o KM ou o status dos itens inspecionados
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {hasPhotos && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">
                Fotos do Checklist
              </h4>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {Object.entries(submission.photos).map(([key, path]) => {
                  const url = getPhotoUrl(path as string);
                  if (!url) return null;
                  return (
                    <div
                      key={key}
                      className="relative min-w-[120px] h-[120px] rounded-xl overflow-hidden border border-app-border bg-zinc-50 shrink-0 snap-start group"
                    >
                      <img
                        src={url}
                        alt={key}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                          {key === "receipt"
                            ? "Comprovante"
                            : key === "front"
                              ? "Frente"
                              : key === "back"
                                ? "Traseira"
                                : key === "left"
                                  ? "Lateral Esq"
                                  : key === "right"
                                    ? "Lateral Dir"
                                    : key}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">
              Informações Gerais
            </h4>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                KM Registrado
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-sm font-bold outline-none focus:border-primary transition-all"
                placeholder="Insira o KM..."
              />
            </div>
          </div>

          {Object.keys(titles).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">
                Itens Inspecionados
              </h4>

              <div className="grid gap-3">
                {Object.keys(titles).map((itemId) => {
                  const title = titles[itemId];
                  const value = itemValues[itemId];
                  if (value === undefined) return null;

                  if (submission.type === "fuel") {
                    return (
                      <div
                        key={itemId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-app-border bg-app-bg/50"
                      >
                        <span className="text-xs font-bold text-text-main">
                          {title}
                        </span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setItemValues((prev) => ({
                              ...prev,
                              [itemId]: e.target.value,
                            }))
                          }
                          className="w-full sm:w-1/2 h-9 px-3 rounded-lg text-xs font-bold outline-none border bg-white border-zinc-200 text-zinc-800 focus:border-primary transition-colors"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={itemId}
                      className="flex flex-col gap-2 p-3 rounded-xl border border-app-border bg-app-bg/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs font-bold text-text-main">
                          {title}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setItemValues((prev) => ({
                                ...prev,
                                [itemId]: "normal",
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-app-border ${value === "normal" || value === "conform" ? "bg-primary text-white border-primary" : "bg-white text-text-muted"}`}
                          >
                            NORMAL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemValues((prev) => ({
                                ...prev,
                                [itemId]: "defect",
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg border border-danger/20 text-[9px] font-black uppercase tracking-widest ${value === "defect" ? "bg-danger text-white border-danger shadow-md shadow-danger/20" : "bg-red-50 text-danger"}`}
                          >
                            DEFEITO
                          </button>
                        </div>
                      </div>

                      {value === "defect" && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 p-3 rounded-xl border border-danger/20 bg-red-50/30 space-y-6">
                          {(
                            defectData[itemId] || [
                              {
                                description: "",
                                photoUrl: null,
                                photoFile: null,
                              },
                            ]
                          ).map((defect, index) => (
                            <div
                              key={index}
                              className="space-y-4 pb-4 border-b border-danger/10 last:border-0 last:pb-0 relative"
                            >
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newDefects = [
                                      ...(defectData[itemId] || []),
                                    ];
                                    newDefects.splice(index, 1);
                                    setDefectData((prev) => ({
                                      ...prev,
                                      [itemId]: newDefects,
                                    }));
                                  }}
                                  className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center shadow-sm"
                                >
                                  <X size={14} />
                                </button>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex justify-between">
                                  <span>
                                    Descrição do Problema #{index + 1}
                                  </span>
                                </label>
                                <textarea
                                  className="w-full min-h-[80px] p-3 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-900 placeholder-red-300 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-y"
                                  placeholder="Descreva detalhadamente o defeito..."
                                  value={defect.description}
                                  onChange={(e) => {
                                    const newDefects = [
                                      ...(defectData[itemId] || []),
                                    ];
                                    if (!newDefects[index])
                                      newDefects[index] = {
                                        description: "",
                                        photoUrl: null,
                                        photoFile: null,
                                      };
                                    newDefects[index] = {
                                      ...newDefects[index],
                                      description: e.target.value,
                                    };
                                    setDefectData((prev) => ({
                                      ...prev,
                                      [itemId]: newDefects,
                                    }));
                                  }}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-danger uppercase tracking-widest">
                                  Foto do Defeito
                                </label>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-16 h-16 rounded-lg border border-red-200 bg-white flex items-center justify-center overflow-hidden">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          imageCompression(file, { maxSizeMB: 0.5 }).catch(err => { console.warn("Compression failed, using original file", err); return file; }).then((compressed) => {
                                            const newDefects = [
                                              ...(defectData[itemId] || []),
                                            ];
                                            if (!newDefects[index])
                                              newDefects[index] = {
                                                description: "",
                                                photoUrl: null,
                                                photoFile: null,
                                              };
                                            newDefects[index] = {
                                              ...newDefects[index],
                                              photoFile: compressed,
                                            };
                                            setDefectData((prev) => ({
                                              ...prev,
                                              [itemId]: newDefects,
                                            }));
                                          });
                                        }
                                      }}
                                    />
                                    {defect.photoFile ? (
                                      <img
                                        src={URL.createObjectURL(
                                          defect.photoFile!,
                                        )}
                                        className="w-full h-full object-cover"
                                        alt="Novo Defeito"
                                      />
                                    ) : defect.photoUrl ? (
                                      <img
                                        src={getPhotoUrl(defect.photoUrl)!}
                                        className="w-full h-full object-cover"
                                        alt="Defeito Existente"
                                      />
                                    ) : (
                                      <Camera
                                        size={20}
                                        className="text-danger/40"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    {defect.photoFile ? (
                                      <p className="text-[10px] font-bold text-red-800 uppercase">
                                        Nova Foto Anexada
                                      </p>
                                    ) : defect.photoUrl ? (
                                      <p className="text-[10px] font-bold text-red-800 uppercase">
                                        Foto Existente
                                      </p>
                                    ) : (
                                      <p className="text-[10px] font-bold text-red-800 uppercase">
                                        Anexar Foto
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const newDefects = [
                                ...(defectData[itemId] || []),
                                {
                                  description: "",
                                  photoUrl: null,
                                  photoFile: null,
                                },
                              ];
                              setDefectData((prev) => ({
                                ...prev,
                                [itemId]: newDefects,
                              }));
                            }}
                            className="w-full py-2 border-2 border-dashed border-danger/20 rounded-lg text-[9px] font-bold text-danger uppercase tracking-widest hover:bg-danger/5 transition-colors"
                          >
                            + Adicionar outro defeito para este item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-app-border bg-app-bg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-app-border text-xs font-black uppercase tracking-widest text-text-muted hover:bg-zinc-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              "Salvando..."
            ) : (
              <>
                <Save size={16} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
