import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Gauge,
  Car,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import localforage from "localforage";
import { supabase } from "../lib/supabase";
import { decodeItemTitle, applyNumberMask, parseMaskedValue } from "../lib/maskUtils";

const STEPS = ["info", "external_photos", "items", "summary"];

export default function ChecklistFlow() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [options, setOptions] = useState<{
    vehicles: any[];
    routes: any[];
    trailers: any[];
    items: any[];
  }>({
    vehicles: [],
    routes: [],
    trailers: [],
    items: [],
  });

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: "",
    trailerId: "",
    manualTrailerPlate: "",
    km: "",
    routeId: "",
    photos: {
      front: null as File | null,
      back: null as File | null,
      left: null as File | null,
      right: null as File | null,
      receipt: null as File | null,
    },
    itemValues: {} as Record<string, "normal" | "defect" | string>,
    defects: {} as Record<
      string,
      Array<{ description: string; photo: File | null; existing_issue_id?: string; existing_photo_url?: string }>
    >,
  });

  const [lastKm, setLastKm] = useState<number | null>(null);
  const [existingIssues, setExistingIssues] = useState<any[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [isTrailerOnly, setIsTrailerOnly] = useState(false);
  const [requireExternalPhotos, setRequireExternalPhotos] = useState(true);
  const [requireFuelReceiptPhoto, setRequireFuelReceiptPhoto] = useState(true);
  const [requireLocation, setRequireLocation] = useState(false);

  const [dataRestored, setDataRestored] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const savedData: any = await localforage.getItem(`checklist_state_${type || "start"}`);
        if (savedData && savedData.formData) {
          setFormData(savedData.formData);
          if (savedData.currentStep !== undefined) {
            setCurrentStep(savedData.currentStep);
          }
        }
      } catch (err) {
        console.error("Error restoring localforage state:", err);
      } finally {
        setDataRestored(true);
        fetchOptions();
      }
    }
    init();
  }, [type]);

  useEffect(() => {
    if (dataRestored) {
      localforage.setItem(`checklist_state_${type || "start"}`, { formData, currentStep }).catch(err => {
        console.error("Localforage save error:", err);
      });
    }
  }, [formData, currentStep, type, dataRestored]);

  useEffect(() => {
    if (formData.vehicleId || formData.trailerId) {
      if (formData.vehicleId) fetchLastKm(formData.vehicleId);

      // options.items may not be ready initially, so we check it
      if (options.items && options.items.length > 0) {
        fetchExistingIssues(
          formData.vehicleId,
          formData.trailerId,
          options.items,
        );
      }
    } else {
      setLastKm(null);
      setExistingIssues([]);
    }
  }, [formData.vehicleId, formData.trailerId, options.items]);

  const fetchExistingIssues = async (
    vehicleId: string,
    trailerId: string,
    availableItems: any[],
  ) => {
    try {
      let query = supabase
        .from("checklist_issues")
        .select("*")
        .eq("status", "pending");

      if (vehicleId && trailerId) {
        query = query.or(
          `vehicle_id.eq.${vehicleId},trailer_id.eq.${trailerId}`,
        );
      } else if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      } else if (trailerId) {
        query = query.eq("trailer_id", trailerId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setExistingIssues(data);

        // Auto-fill form data with existing issues so driver doesn't have to report them again manually
        setFormData((prev) => {
          const newItemValues = { ...prev.itemValues };
          const newDefects = { ...prev.defects };
          let updated = false;

          data.forEach((issue) => {
            // Fix: correctly match trailer vs vehicle items
            const item = availableItems.find(
              (i: any) => 
                i.title === issue.item_title && 
                i.is_trailer_item === (issue.trailer_id !== null)
            );

            if (item) {
              /*if (newItemValues[item.id] !== "defect") {
                newItemValues[item.id] = "defect";
                updated = true;
              }*/

              if (!newDefects[item.id]) {
                newDefects[item.id] = [];
              }
              if (!newDefects[item.id].some(d => d.existing_issue_id === issue.id)) {
                newDefects[item.id].push({
                  description: issue.description || "",
                  photo: null,
                  existing_issue_id: issue.id,
                  existing_photo_url: issue.photo_url || undefined
                });
                updated = true;
              }
            }
          });

          if (updated) {
            return {
              ...prev,
              itemValues: newItemValues,
              defects: newDefects,
            };
          }
          return prev;
        });
      }
    } catch (e) {
      console.error("Error fetching existing issues", e);
    }
  };

  const fetchLastKm = async (vehicleId: string) => {
    try {
      const { data } = await supabase
        .from("checklist_submissions")
        .select("odometer")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastKm(data.odometer);
      } else {
        setLastKm(null);
      }
    } catch (error) {
      console.error("Error fetching last KM:", error);
      setLastKm(null);
    }
  };

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let userProfile = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, modality_ids")
          .eq("id", user.id)
          .single();
        userProfile = profile;
        if (profile?.full_name?.includes("//INTERNO")) {
          setIsInternal(true);
        }
      }

      let vRes, rRes, tRes, settingsRes;
      try {
        [vRes, rRes, tRes, settingsRes] = await Promise.all([
          supabase.from("vehicles").select("*").eq("active", true),
          supabase.from("routes").select("*").eq("active", true),
          supabase.from("trailers").select("*").eq("active", true),
          supabase
            .from("app_settings")
            .select("*")
            .eq("id", "global")
            .maybeSingle(),
        ]);
        
        await localforage.setItem('cache_vehicles', vRes.data);
        await localforage.setItem('cache_routes', rRes.data);
        await localforage.setItem('cache_trailers', tRes.data);
        await localforage.setItem('cache_app_settings', settingsRes.data);
      } catch (err) {
        console.error('Fetch options failed, using offline cache', err);
        const [cv, cr, ct, cs] = await Promise.all([
           localforage.getItem('cache_vehicles'),
           localforage.getItem('cache_routes'),
           localforage.getItem('cache_trailers'),
           localforage.getItem('cache_app_settings')
        ]);
        vRes = { data: cv || [] };
        rRes = { data: cr || [] };
        tRes = { data: ct || [] };
        settingsRes = { data: cs || {} };
      }

      let availableVehicles = vRes.data || [];
      let availableRoutes = rRes.data || [];
      if (
        userProfile &&
        userProfile.modality_ids &&
        userProfile.modality_ids.length > 0
      ) {
        availableVehicles = availableVehicles.filter(
          (v) =>
            !v.modality_id ||
            userProfile.modality_ids.indexOf(v.modality_id) !== -1,
        );
        availableRoutes = availableRoutes.filter((r: any) => {
          if (!r.stops || r.stops.length === 0) return true;
          const routeModalityTokens = r.stops.filter((s: string) =>
            s.startsWith("__MODALITY:"),
          );
          if (routeModalityTokens.length === 0) return true;
          return routeModalityTokens.some((token: string) => {
            const mId = token.replace("__MODALITY:", "");
            return userProfile.modality_ids.indexOf(mId) !== -1;
          });
        });
      }

      if (
        settingsRes.data &&
        settingsRes.data.require_external_photos !== undefined
      ) {
        setRequireExternalPhotos(
          settingsRes.data.require_external_photos !== false,
        );
      }
      if (
        settingsRes.data &&
        settingsRes.data.require_fuel_receipt_photo !== undefined
      ) {
        setRequireFuelReceiptPhoto(
          settingsRes.data.require_fuel_receipt_photo !== false,
        );
      }
      if (settingsRes.data && settingsRes.data.require_location !== undefined) {
        setRequireLocation(settingsRes.data.require_location === true);
      }

      // Check for active schedule to pre-fill
      let prefill = { vehicleId: "", trailerId: "", routeId: "" };
      if (user) {
        // Find if url has ?schedule=ID
        const urlParams = new URLSearchParams(window.location.search);
        const scheduleId = urlParams.get("schedule");

      let scheduleRes;
      try {
        let query = supabase
          .from("schedules")
          .select("vehicle_id, trailer_id, route_id")
          .eq("driver_id", user?.id);

        if (urlParams.get("schedule")) {
          query = query.eq("id", urlParams.get("schedule"));
        } else {
          const now = new Date();
          const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          query = query
            .is("end_checklist_id", null)
            .lte("start_at", now.toISOString())
            .gte("end_at", twelveHoursAgo.toISOString())
            .order("start_at", { ascending: false });
        }

        scheduleRes = await query.limit(1).maybeSingle();
        await localforage.setItem('cache_schedules', scheduleRes.data);
      } catch (e) {
        scheduleRes = { data: await localforage.getItem('cache_schedules') };
      }

      const schedule = scheduleRes.data;

      if (schedule) {
        prefill = {
          vehicleId: schedule.vehicle_id || "",
          trailerId: schedule.trailer_id || "",
          routeId: schedule.route_id || "",
        };
        setIsScheduled(true);
      } else {
        setIsScheduled(false);
      }
      } // end if (user)

      let typeData, itemsData;
      try {
        const typeRes = await supabase
          .from("checklist_types")
          .select("id")
          .eq("slug", type || "start")
          .single();
        typeData = typeRes.data;
        
        if (typeData) {
          const itemsRes = await supabase
            .from("checklist_items")
            .select("*")
            .eq("type_id", typeData.id)
            .order("order_index");
          itemsData = itemsRes.data;
        }
        await localforage.setItem(`cache_type_${type}`, typeData);
        await localforage.setItem(`cache_items_${type}`, itemsData);
      } catch (e) {
        typeData = await localforage.getItem(`cache_type_${type}`);
        itemsData = await localforage.getItem(`cache_items_${type}`);
      }

      let checklistItems: any[] = [];
      if (typeData) {
        checklistItems = (itemsData || []).map((item: any) => {
          const { title, mask, options } = decodeItemTitle(item.title);
          return { ...item, title, mask, options };
        });
      }

      setOptions({
        vehicles: availableVehicles,
        routes: availableRoutes,
        trailers: tRes.data || [],
        items: checklistItems,
      });

      // Init item defaults to 'normal'
      const defaults: Record<string, string> = {};
      checklistItems.forEach(item => {
        if (!item.input_type || item.input_type === 'boolean') {
          defaults[item.id] = 'normal';
        }
      });

      setFormData((prev) => {
        // Build new defaults, but prefer any already-selected itemValues from previous localforage restore state
        const mergedItemValues = { ...defaults, ...prev.itemValues };
        return {
          ...prev,
          vehicleId: prev.vehicleId || prefill.vehicleId,
          trailerId: prev.trailerId || prefill.trailerId,
          routeId: prev.routeId || prefill.routeId,
          itemValues: mergedItemValues,
        };
      });
    } catch (error) {
      console.error("Error loading options:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setIsStepLoading(true);
    setTimeout(() => {
      setCurrentStep((prev) => {
        if (type === "yard" && prev === 0) return 2;
        return Math.min(prev + 1, STEPS.length - 1);
      });
      setIsStepLoading(false);
    }, 600); // simulated loading step
  };

  const prevStep = () => {
    setCurrentStep((prev) => {
      if (type === "yard" && prev === 2) return 0;
      return Math.max(prev - 1, 0);
    });
  };

  const handlePhotoUpload = async (key: string, file: File) => {
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: false,
      };
      const compressedFile = await imageCompression(file, options);
      setFormData((prev) => ({
        ...prev,
        photos: { ...prev.photos, [key]: compressedFile },
      }));
    } catch (error) {
      console.error("Compression failed", error);
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) {
      if (isInternal && isTrailerOnly) return !!formData.trailerId;

      const selectedVehicle = options.vehicles.find(
        (v) => v.id === formData.vehicleId,
      );
      const trailerRequired = selectedVehicle?.requires_trailer;

      const currentKm = parseInt(formData.km);
      let isKmValid =
        !!formData.km &&
        !isNaN(currentKm) &&
        (lastKm === null || currentKm >= lastKm);

      return (
        formData.vehicleId &&
        isKmValid &&
        (type === "yard" || formData.routeId) &&
        (!trailerRequired || formData.trailerId || formData.manualTrailerPlate)
      );
    }
    if (currentStep === 1) {
      if (isInternal && isTrailerOnly) return true;
      if (type === "yard") return true;
      if (type === "fuel") {
        if (!formData.photos.front) return false;
        if (requireFuelReceiptPhoto && !formData.photos.receipt) return false;
        return true;
      }
      if (!requireExternalPhotos) return true;
      return (
        formData.photos.front &&
        formData.photos.back &&
        formData.photos.left &&
        formData.photos.right
      );
    }
    if (currentStep === 2) {
      if (type === "fuel") {
        return options.items.every((i: any) =>
          i.order_index !== 0
            ? formData.itemValues[i.id] &&
              formData.itemValues[i.id].trim() !== ""
            : true,
        );
      }
      return options.items
        .filter((i) => (isInternal && isTrailerOnly ? i.is_trailer_item : true))
        .every((i: any) =>
          i.order_index !== 0 ? !!formData.itemValues[i.id] : true,
        );
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let itemValuesPayload = { ...formData.itemValues };
      let newDefectsPayload = { ...formData.defects };
      let formStateModified = false;
      let promptEmptyFieldsOnce = false;
      let userAgreedToCloseEmpty = false;

      const defectItems = Object.entries(itemValuesPayload)
        .filter(([_, value]) => value === "defect" || value === "defeito")
        .map(([id]) => id);

      for (const itemId of defectItems) {
        const itemOption = options.items.find((i: any) => i.id === itemId);
        const subDefects = newDefectsPayload[itemId] || [];
        
        const emptyDefects = subDefects.filter(
          (d) => (!d.description || d.description.trim() === "") && !d.photo && !(d as any).existing_photo_url && !(d as any).existing_issue_id
        );
        
        const validDefects = subDefects.filter(
          (d) => d.description?.trim() !== "" || d.photo || (d as any).existing_photo_url || (d as any).existing_issue_id
        );

        if (emptyDefects.length > 0) {
          if (!promptEmptyFieldsOnce) {
            promptEmptyFieldsOnce = true;
            userAgreedToCloseEmpty = window.confirm(
              "Existem campos de descrição de defeito abertos sem texto ou foto.\n\nDeseja fechar esses campos para salvar o check-list?"
            );
            if (!userAgreedToCloseEmpty) {
              setLoading(false);
              return; // Stop and let them write
            }
          }

          if (userAgreedToCloseEmpty) {
            // Remove the empty ones
            newDefectsPayload[itemId] = validDefects;
            formStateModified = true;
          }
        }

        // After cleaning (or if it was already 0 valid defects)
        if (newDefectsPayload[itemId].length === 0) {
          // If the user already agreed to close empty fields, we assume they implicitly agreed to make it NORMAL if zero are left.
          // Or we ask them specifically.
          const itemName = itemOption?.title?.split("::")[0] || "Desconhecido";
          const revert = userAgreedToCloseEmpty || window.confirm(
            `O item "${itemName}" foi marcado como DEFEITO, mas não possui nenhuma descrição ou foto válida.\n\nDeseja alterar este item para NORMAL e prosseguir com o envio?`
          );
          
          if (revert) {
            itemValuesPayload[itemId] = "normal";
            delete newDefectsPayload[itemId];
            formStateModified = true;
          } else {
            setLoading(false);
            return;
          }
        }
      }

      if (formStateModified) {
         setFormData(prev => ({
           ...prev,
           itemValues: itemValuesPayload,
           defects: newDefectsPayload
         }));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let latitude = null;
      let longitude = null;

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          },
        );
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (err) {
        console.warn("Could not get geolocation:", err);
      }

      if (requireLocation && (latitude === null || longitude === null)) {
        alert(
          "É obrigatório permitir e obter a localização GPS para salvar o checklist. Verifique as permissões do seu navegador e seu sinal GPS.",
        );
        setLoading(false);
        return;
      }

      if (!navigator.onLine) {
        setLoading(true);
        const { fileToBase64 } = await import('../lib/offlineSubmitHelper');
        const { queueSubmission } = await import('../lib/offlineQueue');

        const photoB64: any = {};
        for (const [key, file] of Object.entries(formData.photos)) {
          if (file) photoB64[key] = await fileToBase64(file as File);
        }

        const defectsB64 = { ...formData.defects } as any;
        for (const [itemId, subDefectsRaw] of Object.entries(defectsB64)) {
           for (let i = 0; i < (subDefectsRaw as any[]).length; i++) {
              const d = (subDefectsRaw as any)[i];
              if (d.photo) d.photoB64 = await fileToBase64(d.photo);
              d.photo = null; // remove file obj
           }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const scheduleId = urlParams.get("schedule");

        const itemTitles = options.items.reduce((acc: any, item: any) => ({ ...acc, [item.id]: item.title }), {});

        await queueSubmission({
          type,
          scheduleId,
          isInternal,
          isTrailerOnly,
          itemTitles,
          formData: {
            ...formData,
            itemValues: itemValuesPayload,
            defects: defectsB64,
            photos: photoB64,
            latitude,
            longitude,
            itemsList: options.items,
          }
        });

        alert("Sem conexão com a internet. O Checklist foi salvo localmente como pendente e será enviado quando houver rede.");
        await localforage.removeItem(`checklist_state_${type || "start"}`);
        navigate("/dashboard");
        return;
      }

      // 1. Upload external photos
      const photoUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(formData.photos)) {
        if (file) {
          const path = `${user.id}/${Date.now()}_${key}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("checklist-photos")
            .upload(path, file as any);

          if (uploadError) throw uploadError;
          photoUrls[key] = path;
        }
      }

      // 2. Create Submission
      const itemValues = itemValuesPayload;
      const itemTitles = options.items.reduce(
        (acc: any, item: any) => ({ ...acc, [item.id]: item.title }),
        {},
      );

      // Extract receipt URL if available
      const receipt_photo_url = photoUrls.receipt || null;

      const { data: submission, error: subError } = await supabase
        .from("checklist_submissions")
        .insert({
          driver_id: user.id,
          vehicle_id: isInternal && isTrailerOnly ? null : formData.vehicleId,
          trailer_id: formData.trailerId || null,
          route_id: formData.routeId || null,
          type: type || "start",
          odometer: parseInt(formData.km) || 0,
          latitude: latitude,
          longitude: longitude,
          photos: photoUrls,
          receipt_photo_url: receipt_photo_url,
          status:
            type === "fuel"
              ? "concluido"
              : Object.values(itemValues).includes("defect")
                ? "com_defeitos"
                : "concluido",
          details: {
            itemValues,
            itemTitles,
            manualTrailerPlate: formData.manualTrailerPlate,
          },
        })
        .select()
        .single();

      if (subError) throw subError;

      // 3. Handle Defects (if any)
      const defectData: Record<
        string,
        Array<{ description: string; photoUrl: string | null }>
      > = {};
      const issuesToInsert = [];

      const defectEntries = Object.entries(formData.defects) as [
        string,
        Array<{ description: string; photo: File | null }>,
      ][];
      for (const [itemId, subDefectsRaw] of defectEntries) {
        defectData[itemId] = [];
        const itemOption = options.items.find((i: any) => i.id === itemId);
        const itemTitle = itemOption?.title || "Item Desconhecido";
        const isTrailerItem = itemOption?.is_trailer_item || false;

        let issueVehicleId = null;
        let issueTrailerId = null;

        if (isInternal && isTrailerOnly) {
          issueTrailerId = formData.trailerId || null;
        } else {
          if (isTrailerItem) {
            issueTrailerId = formData.trailerId || null;
          } else {
            issueVehicleId = formData.vehicleId || null;
          }
        }

        const subDefects = subDefectsRaw.filter(
          (d) => d.description?.trim() !== "" || d.photo || (d as any).existing_photo_url || (d as any).existing_issue_id
        );

        for (let i = 0; i < subDefects.length; i++) {
          const subDefect = subDefects[i];
          let defectPhotoUrl = (subDefect as any).existing_photo_url || null;
          if (subDefect.photo) {
            const path = `${user.id}/defects/${Date.now()}_${itemId}_${i}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("checklist-photos")
              .upload(path, subDefect.photo);

            if (!uploadError) {
              defectPhotoUrl = path;
            }
          }

          defectData[itemId].push({
            description: subDefect.description,
            photoUrl: defectPhotoUrl,
          });

          issuesToInsert.push({
            submission_id: submission.id,
            vehicle_id: issueVehicleId,
            trailer_id: issueTrailerId,
            driver_id: user.id,
            item_title: itemTitle,
            description: subDefect.description,
            photo_url: defectPhotoUrl,
            status: "pending",
            existing_issue_id: (subDefect as any).existing_issue_id,
          });
        }
      }

      const incrementedIssueIds = new Set<string>();

      // Insert or update issues into dedicated table
      if (issuesToInsert.length > 0) {
        for (const newIssue of issuesToInsert) {
          let existings = null;

          if (newIssue.existing_issue_id) {
            const { data } = await supabase
              .from("checklist_issues")
              .select("*")
              .eq("id", newIssue.existing_issue_id)
              .eq("status", "pending");
            existings = data;
          } else {
            let query = supabase
              .from("checklist_issues")
              .select("*")
              .eq("status", "pending")
              .eq("item_title", newIssue.item_title)
              .eq("description", newIssue.description);

            if (newIssue.vehicle_id)
              query = query.eq("vehicle_id", newIssue.vehicle_id);
            else query = query.is("vehicle_id", null);

            if (newIssue.trailer_id)
              query = query.eq("trailer_id", newIssue.trailer_id);
            else query = query.is("trailer_id", null);

            const { data } = await query;
            existings = data;
          }

          if (existings && existings.length > 0) {
            const ex = existings[0];
            let currentAttachments = Array.isArray(ex.attachments)
              ? [...ex.attachments]
              : [];
              
            const isUnchanged = ex.description === newIssue.description && ex.photo_url === newIssue.photo_url;
            
            if (!isUnchanged) {
              currentAttachments.push({
                description: newIssue.description,
                photoUrl: newIssue.photo_url,
                driver_id: newIssue.driver_id,
                submission_id: newIssue.submission_id,
                created_at: new Date().toISOString(),
              });
            }

            const { error: updateError } = await supabase
              .from("checklist_issues")
              .update({
                report_count: (ex.report_count || 1) + 1,
                attachments: currentAttachments,
                updated_at: new Date().toISOString(),
              })
              .eq("id", ex.id);

            if (updateError) {
              console.error(
                "Failed to update report_count. Falling back to insert.",
                updateError,
              );
              const { existing_issue_id, ...issueDataToInsert } = newIssue;
              await supabase.from("checklist_issues").insert(issueDataToInsert);
            } else {
              incrementedIssueIds.add(ex.id);
            }
          } else {
            const { existing_issue_id, ...issueDataToInsert } = newIssue;
            await supabase.from("checklist_issues").insert(issueDataToInsert);
          }
        }
      }

      // Handle un-touched existing defects (resolve or increment)
      const existingIssuesToResolve = [];
      for (const issue of existingIssues) {
        const item = options.items.find(
          (i: any) =>
            i.title === issue.item_title &&
            i.is_trailer_item === (issue.trailer_id !== null),
        );

        if (item) {
          const status = formData.itemValues[item.id];
          if (status === "normal") {
            existingIssuesToResolve.push(issue.id);
          } else if (status === "defect") {
            if (!incrementedIssueIds.has(issue.id)) {
              const isStillInDefects = (formData.defects[item.id] || []).some(d => (d as any).existing_issue_id === issue.id);
              if (issue.description?.trim() === "" && !issue.photo_url) {
                // Kill empty issues by resolving them
                existingIssuesToResolve.push(issue.id);
              } else if (!isStillInDefects) {
                // Driver unchecked or removed the existing issue! Resolved!
                existingIssuesToResolve.push(issue.id);
              } else {
                await supabase
                  .from("checklist_issues")
                  .update({
                    report_count: (issue.report_count || 1) + 1,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", issue.id);
                incrementedIssueIds.add(issue.id);
              }
            }
          }
        }
      }

      if (existingIssuesToResolve.length > 0) {
        await supabase
          .from("checklist_issues")
          .update({
             status: "resolved",
             resolved_at: new Date().toISOString(),
             resolved_by: user.id,
             resolution_notes: "Marcado como normal no checklist (automático)"
          })
          .in("id", existingIssuesToResolve);
      }

      // Update submission with defect data if needed
      if (Object.keys(defectData).length > 0) {
        // Fetch existing details
        const { data: existingSubmission } = await supabase
          .from("checklist_submissions")
          .select("details")
          .eq("id", submission.id)
          .single();

        const existingDetails = existingSubmission?.details || {};

        await supabase
          .from("checklist_submissions")
          .update({
            details: {
              ...existingDetails,
              itemValues: formData.itemValues,
              defects: defectData,
            },
          })
          .eq("id", submission.id);
      }

      // 4. Link to Schedule if applicable
      if (type === "start" || type === "end" || type === "fuel") {
        const scheduleId = new URLSearchParams(window.location.search).get(
          "schedule",
        );

        let activeScheduleId = scheduleId;

        if (!activeScheduleId) {
          const { data: activeSchedule } = await supabase
            .from("schedules")
            .select("id")
            .eq("driver_id", user.id)
            .eq("vehicle_id", formData.vehicleId)
            .eq("route_id", formData.routeId)
            // Look for any schedule today (simple approach) or current active one
            .lte("start_at", new Date().toISOString())
            .gte(
              "end_at",
              new Date(
                new Date().getTime() - 24 * 60 * 60 * 1000,
              ).toISOString(),
            ) // Within last 24h
            .is(
              type === "start"
                ? "start_checklist_id"
                : type === "end"
                  ? "end_checklist_id"
                  : "fuel_checklist_id",
              null,
            )
            .order("start_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeSchedule) {
            activeScheduleId = activeSchedule.id;
          }
        }

        if (activeScheduleId) {
          const updateField =
            type === "start"
              ? "start_checklist_id"
              : type === "end"
                ? "end_checklist_id"
                : "fuel_checklist_id";
          await supabase
            .from("schedules")
            .update({ [updateField]: submission.id })
            .eq("id", activeScheduleId);
        }
      }

      // 5. Update performance if it's the end of the trip
      if (type === "end") {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select(
              `
                participates_in_ranking,
                score_profile_id,
                score_profiles(calculation_type, base_value),
                driver_performance(score, total_checklists)
              `,
            )
            .eq("id", user.id)
            .single();

          if (profile && profile.participates_in_ranking !== false) {
            const scoreProfile: any = profile.score_profiles;
            const perf = profile.driver_performance as any;
            let newScore = Array.isArray(perf)
              ? (perf[0]?.score ?? 0)
              : (perf?.score ?? 0);
            let currentTotal = Array.isArray(perf)
              ? (perf[0]?.total_checklists ?? 0)
              : (perf?.total_checklists ?? 0);

            const baseValue = Number(scoreProfile?.base_value || 0);

            currentTotal += 1; // Always increment

            if (scoreProfile) {
              if (scoreProfile.calculation_type === "per_schedule") {
                newScore += baseValue;
              } else if (scoreProfile.calculation_type === "per_workday") {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const { count, error: countErr } = await supabase
                  .from("checklist_submissions")
                  .select("id", { count: "exact", head: true })
                  .eq("driver_id", user.id)
                  .eq("type", "end")
                  .gte("created_at", startOfDay.toISOString());

                if (count === 1 && !countErr) {
                  newScore += baseValue;
                }
              }
            }

            await supabase.from("driver_performance").upsert({
              driver_id: user.id,
              score: newScore,
              total_checklists: currentTotal,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error("Error updating driver performance:", err);
        }
      }

      await localforage.removeItem(`checklist_state_${type || "start"}`);
      navigate("/dashboard");
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Falha ao enviar checklist. Verifique conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderItemInput = (item: any) => {
    const isText = item.input_type === "text";
    const isNumeric =
      item.input_type === "number" || item.input_type === "fuel_liters" || (!item.input_type && type === "fuel");

    if (isNumeric || isText) {
      const hasMask = isNumeric && item.mask && item.mask !== "none";
      return (
        <input
          type={hasMask ? "text" : (isNumeric ? "number" : "text")}
          inputMode={hasMask ? "decimal" : undefined}
          step={(!hasMask && isNumeric) ? "0.01" : undefined}
          placeholder={isNumeric ? "Valor numérico..." : "Digite aqui..."}
          className="w-32 h-9 px-3 rounded-lg border border-app-border bg-white text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          value={hasMask ? applyNumberMask(formData.itemValues[item.id] || "", item.mask) : (formData.itemValues[item.id] || "")}
          onChange={(e) => {
            const val = hasMask ? parseMaskedValue(e.target.value, item.mask) : e.target.value;
            setFormData((prev) => ({
              ...prev,
              itemValues: { ...prev.itemValues, [item.id]: val },
            }));
          }}
        />
      );
    }

    // boolean fallback
    return (
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              itemValues: { ...prev.itemValues, [item.id]: "normal" },
            }));
            const newDefects = { ...formData.defects };
            delete newDefects[item.id];
            setFormData((prev) => ({ ...prev, defects: newDefects }));
          }}
          className={`min-w-[80px] flex items-center justify-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-app-border ${formData.itemValues[item.id] === "normal" ? (item.is_trailer_item ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100" : "bg-primary text-white border-primary") : "bg-white text-text-muted"}`}
        >
          NORMAL
        </button>
        <button
          onClick={() => {
            setFormData((prev) => {
              let updatedDefects = prev.defects[item.id] || [];
              if (updatedDefects.length === 0) {
                const issuesForItem = existingIssues.filter(
                  (iss: any) =>
                    iss.item_title === item.title &&
                    (item.is_trailer_item ? iss.trailer_id !== null : iss.trailer_id === null)
                );
                // Create a new array to avoid mutating prev
                updatedDefects = issuesForItem.map((iss: any) => ({
                  description: iss.description || "",
                  photo: null,
                  existing_issue_id: iss.id,
                  existing_photo_url: iss.photo_url || undefined,
                }));
              }

              return {
                ...prev,
                itemValues: { ...prev.itemValues, [item.id]: "defect" },
                defects: {
                  ...prev.defects,
                  [item.id]: updatedDefects,
                },
              };
            });
          }}
          className={`min-w-[80px] flex items-center justify-center px-3 py-1.5 rounded-lg border border-danger/20 text-[9px] font-black uppercase tracking-widest ${formData.itemValues[item.id] === "defect" ? "bg-danger text-white border-danger shadow-md shadow-danger/20" : "bg-red-50 text-danger"}`}
        >
          DEFEITO
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto min-h-[calc(100vh-64px)] bg-app-bg flex flex-col p-4 sm:p-6 pb-48">
      {/* progress card - Bento style */}
      <div className="bg-card-bg border border-app-border rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
        <div className="flex gap-1.5 flex-1">
          {STEPS.map((_, i) => {
            if (type === "yard" && i === 1) return null;
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? "bg-primary" : "bg-app-bg"}`}
              />
            );
          })}
        </div>
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-6">
          Passo{" "}
          {type === "yard"
            ? currentStep === 0
              ? 1
              : currentStep === 2
                ? 2
                : 3
            : currentStep + 1}{" "}
          de {type === "yard" ? STEPS.length - 1 : STEPS.length}
        </span>
      </div>

      <div className="flex-1">
        {isStepLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-primary space-y-4 min-h-[300px]">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-bold text-text-muted animate-pulse">Carregando próxima etapa...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5"
            >
              <div className="bento-card">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Identificação Operacional
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                    <Car size={16} />
                  </div>
                </div>

                <div className="space-y-4">
                  {isInternal && (
                    <div
                      className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer"
                      onClick={() => setIsTrailerOnly(!isTrailerOnly)}
                    >
                      <input
                        type="checkbox"
                        checked={isTrailerOnly}
                        className="w-4 h-4 rounded text-primary focus:ring-primary focus:ring-2"
                        readOnly
                      />
                      <span className="text-xs font-bold text-orange-800">
                        Checklist Somente de Reboque
                      </span>
                    </div>
                  )}

                  {(!isInternal || !isTrailerOnly) && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Veículo
                      </label>
                      <div className="relative">
                        <select
                          disabled={isScheduled}
                          className={`w-full h-12 px-4 rounded-xl border border-app-border bg-white text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled ? "opacity-70 bg-zinc-50" : ""}`}
                          value={formData.vehicleId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleId: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione o veículo</option>
                          {options.vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plate}
                            </option>
                          ))}
                        </select>
                        <ChevronRight
                          size={14}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none"
                        />
                      </div>
                    </div>
                  )}

                  {((!isInternal || !isTrailerOnly) &&
                    options.vehicles.find((v) => v.id === formData.vehicleId)
                      ?.requires_trailer) ||
                  (isInternal && isTrailerOnly) ? (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Reboque{" "}
                        <span className="text-primary">(Obrigatório)</span>
                      </label>
                      <div className="relative">
                        <select
                          disabled={isScheduled && !isTrailerOnly}
                          className={`w-full h-12 px-4 rounded-xl border ${!formData.trailerId ? "border-primary/50 bg-blue-50/10" : "border-app-border bg-white"} text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled && !isTrailerOnly ? "opacity-70 bg-zinc-50" : ""}`}
                          value={formData.trailerId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              trailerId: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione o reboque</option>
                          {options.trailers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.plate}
                            </option>
                          ))}
                        </select>
                        <ChevronRight
                          size={14}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none"
                        />
                      </div>
                    </div>
                  ) : null}

                  {(!isInternal || !isTrailerOnly) && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        KM Atual
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Ex: 125430"
                          className={`w-full h-12 px-4 pl-10 rounded-xl border ${formData.km && lastKm !== null && parseInt(formData.km) < lastKm ? "border-danger focus:border-danger bg-red-50" : "border-app-border focus:border-primary bg-white"} text-sm font-bold text-text-main outline-none transition-colors`}
                          value={formData.km}
                          onChange={(e) =>
                            setFormData({ ...formData, km: e.target.value })
                          }
                        />
                        <Gauge
                          size={14}
                          className={`absolute left-4 top-1/2 -translate-y-1/2 ${formData.km && lastKm !== null && parseInt(formData.km) < lastKm ? "text-danger" : "text-text-muted"}`}
                        />
                      </div>
                      {formData.km &&
                        lastKm !== null &&
                        parseInt(formData.km) < lastKm && (
                          <div className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1">
                            <AlertCircle size={10} /> Não pode ser menor que o
                            último KM registrado: {lastKm}
                          </div>
                        )}
                    </div>
                  )}

                  {type !== "yard" && (!isInternal || !isTrailerOnly) && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Rota
                      </label>
                      <div className="relative">
                        <select
                          disabled={isScheduled}
                          className={`w-full h-12 px-4 pl-10 rounded-xl border border-app-border bg-white text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled ? "opacity-70 bg-zinc-50" : ""}`}
                          value={formData.routeId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              routeId: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione a rota</option>
                          {options.routes.map((r) => {
                            const validStops =
                              r.stops?.filter(
                                (s: string) => !s.startsWith("__MODALITY:"),
                              ) || [];
                            return (
                              <option key={r.id} value={r.id}>
                                {r.origin} &#8594; {r.destination}
                                {validStops.length > 0
                                  ? ` (via ${validStops.join(", ")})`
                                  : ""}
                              </option>
                            );
                          })}
                        </select>
                        <MapPin
                          size={14}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                        <ChevronRight
                          size={14}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="bento-card">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Registro Fotográfico
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-warning flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                </div>

                <div
                  className={`grid gap-4 ${type === "fuel" ? "grid-cols-2" : "grid-cols-2"}`}
                >
                  {(type === "fuel"
                    ? [
                        { id: "front", label: "Tacógrafo" },
                        { id: "receipt", label: "Cupom Fiscal" },
                      ]
                    : [
                        { id: "front", label: "Frente" },
                        { id: "back", label: "Traseira" },
                        { id: "left", label: "Lateral Esq." },
                        { id: "right", label: "Lateral Dir." },
                      ]
                  ).map((pos) => (
                    <div key={pos.id} className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black text-text-main uppercase tracking-widest">
                          {pos.label}
                        </span>
                        {!requireExternalPhotos && type !== "fuel" && (
                          <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest bg-zinc-100 px-1.5 py-0.5 rounded">
                            Opcional
                          </span>
                        )}
                        {!requireFuelReceiptPhoto && pos.id === "receipt" && (
                          <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest bg-zinc-100 px-1.5 py-0.5 rounded">
                            Opcional
                          </span>
                        )}
                      </div>
                      <div className="relative aspect-[4/3]">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handlePhotoUpload(pos.id, e.target.files[0])
                          }
                        />
                        <div
                          className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all overflow-hidden relative
                          ${formData.photos[pos.id as keyof typeof formData.photos] ? "border-success bg-green-50" : "border-app-border hover:border-text-muted bg-app-bg"}`}
                        >
                          {formData.photos[
                            pos.id as keyof typeof formData.photos
                          ] ? (
                            <>
                              <img src={URL.createObjectURL(formData.photos[pos.id as keyof typeof formData.photos] as File)} className="absolute inset-0 w-full h-full object-cover" alt={pos.label} />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <CheckCircle2 className="text-white" size={32} />
                              </div>
                            </>
                          ) : (
                            <>
                              <Camera
                                className="text-text-muted mb-1"
                                size={24}
                              />
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                {pos.label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              <div className="bento-card">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-6">
                  Lista de Verificação
                </span>
                <div className="space-y-6">
                  {/* Vehicle Items */}
                  <div className="space-y-3">
                    {options.items.some((i) => !i.is_trailer_item) && (
                      <h4 className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">
                        Veículo Principal
                      </h4>
                    )}
                    {options.items
                      .filter((i) => !i.is_trailer_item)
                      .map((item) => (
                        <React.Fragment key={item.id}>
                          <div className="p-4 rounded-xl border border-app-border bg-app-bg flex flex-col group hover:bg-white hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-text-main flex-1 mr-4">
                                {item.title}
                                {item.order_index === 0 && (
                                  <span className="ml-2 text-[9px] font-medium text-text-muted">
                                    (Opcional)
                                  </span>
                                )}
                              </span>

                              {renderItemInput(item)}
                            </div>

                            {/* Defeitos Conhecidos / Existentes */}
                            {formData.itemValues[item.id] !== "normal" && existingIssues.some(
                              (issue) => issue.item_title === item.title && !issue.trailer_id,
                            ) && (
                              <div className="mt-3 pt-3 border-t border-app-border">
                                <p className="text-[10px] font-black text-warning uppercase tracking-widest flex items-center gap-1 mb-2">
                                  <AlertCircle size={12} /> Defeito Pendente
                                </p>
                                {existingIssues
                                  .filter(
                                    (issue) => issue.item_title === item.title && !issue.trailer_id,
                                  )
                                  .map((issue) => (
                                    <div
                                      key={issue.id}
                                      className="text-xs text-text-muted italic bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex items-start gap-2"
                                    >
                                      <div className="flex-1">
                                        "{issue.description || "Sem descrição"}"
                                        <div className="mt-1 text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                                          Reportado {issue.report_count || 1}{" "}
                                          {issue.report_count === 1
                                            ? "vez"
                                            : "vezes"}
                                        </div>
                                      </div>
                                      {issue.photo_url && (
                                        <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-orange-200">
                                          <img src={supabase.storage.from("checklist-photos").getPublicUrl(issue.photo_url).data.publicUrl} className="w-full h-full object-cover" alt="Foto Anterior" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {formData.itemValues[item.id] === "defect" && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mb-4 p-4 rounded-xl border border-danger/20 bg-red-50/30 space-y-4"
                            >
                              {item.options && item.options.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  <p className="text-[10px] font-bold text-danger uppercase tracking-widest pb-1 border-b border-danger/10">Pendências Mapeadas:</p>
                                  {item.options.map((opt, i) => {
                                      const defectIdx = (formData.defects[item.id] || []).findIndex(d => d.description === opt);
                                      const isSelected = defectIdx !== -1;
                                      const defect = isSelected ? formData.defects[item.id][defectIdx] : null;
                                      return (
                                        <div key={i} className={`p-3 rounded-lg border ${isSelected ? 'border-danger bg-white' : 'border-app-border bg-white'} transition-colors`}>
                                          <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                            <input 
                                              type="checkbox" 
                                              className="w-4 h-4 text-danger rounded border-danger/30"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                   const newDefects = [...(formData.defects[item.id] || []), { description: opt, photo: null }];
                                                   setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                                } else {
                                                   const newDefects = [...(formData.defects[item.id] || [])];
                                                   newDefects.splice(defectIdx, 1);
                                                   setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                                }
                                              }}
                                            />
                                            {opt}
                                          </label>
                                          {isSelected && defect && (
                                            <div className="flex items-center gap-3 ml-7 pt-3 mt-3 border-t border-danger/10">
                                              <div className="relative w-12 h-12 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center overflow-hidden">
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  capture="environment"
                                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: false }).then(compressed => {
                                                        const newDefects = [...(formData.defects[item.id] || [])];
                                                        newDefects[defectIdx] = { ...newDefects[defectIdx], photo: compressed };
                                                        setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects } }));
                                                      });
                                                    }
                                                  }}
                                                />
                                                {defect.photo ? (
                                                  <img src={URL.createObjectURL(defect.photo)} className="w-full h-full object-cover" alt="Evidência" />
                                                ) : defect.existing_photo_url ? (
                                                  <img src={supabase.storage.from("checklist-photos").getPublicUrl(defect.existing_photo_url).data.publicUrl} className="w-full h-full object-cover" alt="Evidência Anterior" />
                                                ) : <Camera size={16} className="text-danger/50" />}
                                              </div>
                                              <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Foto Evidência</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                  })}
                                </div>
                              )}

                              {(() => {
                                const customDefectIdx = (formData.defects[item.id] || []).findIndex(d => !d.existing_issue_id && (!item.options || !item.options.includes(d.description)));
                                const hasCustomDefect = customDefectIdx !== -1;
                                const customDefect = hasCustomDefect ? formData.defects[item.id][customDefectIdx] : null;

                                return (
                                  <div className={`p-3 rounded-lg border ${hasCustomDefect ? 'border-danger bg-white' : 'border-app-border bg-white'} transition-colors mt-4`}>
                                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-danger rounded border-danger/30"
                                        checked={hasCustomDefect}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newDefects = [...(formData.defects[item.id] || []), { description: "", photo: null }];
                                            setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                          } else {
                                            const newDefects = [...(formData.defects[item.id] || [])];
                                            newDefects.splice(customDefectIdx, 1);
                                            setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                          }
                                        }}
                                      />
                                      Outros
                                    </label>
                                    
                                    {hasCustomDefect && customDefect && (
                                      <div className="mt-4 pt-4 border-t border-danger/10 space-y-4">
                                        <div className="space-y-1.5 mt-2">
                                          <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex justify-between">
                                            <span>Descrição do Problema (Outros)</span>
                                          </label>
                                          <textarea
                                            className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                            placeholder="Descreva o defeito encontrado..."
                                            rows={2}
                                            value={customDefect.description}
                                            onChange={(e) => {
                                              const newDefects = [...(formData.defects[item.id] || [])];
                                              newDefects[customDefectIdx] = { ...newDefects[customDefectIdx], description: e.target.value };
                                              setFormData(prev => ({ ...prev, defects: { ...prev.defects, [item.id]: newDefects } }));
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
                                                    imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: false }).then(compressed => {
                                                      const newDefects = [...(formData.defects[item.id] || [])];
                                                      newDefects[customDefectIdx] = { ...newDefects[customDefectIdx], photo: compressed };
                                                      setFormData(prev => ({ ...prev, defects: { ...prev.defects, [item.id]: newDefects } }));
                                                    });
                                                  }
                                                }}
                                              />
                                              {customDefect.photo ? (
                                                <img src={URL.createObjectURL(customDefect.photo)} className="w-full h-full object-cover" alt="Defeito" />
                                              ) : (
                                                <Camera size={20} className="text-danger/40" />
                                              )}
                                            </div>
                                            <span className="text-[10px] font-medium text-text-muted italic">
                                              Toque para anexar evidência
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </motion.div>
                          )}
                        </React.Fragment>
                      ))}
                  </div>

                  {/* Trailer Items (Only if trailer selected) */}
                  {formData.trailerId && (
                    <div className="space-y-3 pt-4 border-t border-app-border">
                      <h4 className="text-[9px] font-black text-orange-600 uppercase tracking-widest pl-1">
                        Itens do Reboque
                      </h4>
                      {options.items.filter((i) => i.is_trailer_item).length >
                      0 ? (
                        options.items
                          .filter((i) => i.is_trailer_item)
                          .map((item) => (
                            <React.Fragment key={item.id}>
                              <div className="p-4 rounded-xl border border-app-border bg-app-bg flex items-center justify-between group hover:bg-white hover:border-orange-200 transition-all">
                                <span className="text-xs font-bold text-text-main flex-1 mr-4">
                                  {item.title}
                                  {item.order_index === 0 && (
                                    <span className="ml-2 text-[9px] font-medium text-text-muted">
                                      (Opcional)
                                    </span>
                                  )}
                                </span>
                                {renderItemInput(item)}
                              </div>

                              {/* Defeitos Conhecidos / Existentes (Reboque) */}
                              {formData.itemValues[item.id] !== "normal" && existingIssues.some(
                                (issue) => issue.item_title === item.title && issue.trailer_id !== null,
                              ) && (
                                <div className="mt-3 pt-3 border-t border-app-border">
                                  <p className="text-[10px] font-black text-warning uppercase tracking-widest flex items-center gap-1 mb-2">
                                    <AlertCircle size={12} /> Defeito Pendente
                                  </p>
                                  {existingIssues
                                    .filter(
                                      (issue) => issue.item_title === item.title && issue.trailer_id !== null,
                                    )
                                    .map((issue) => (
                                      <div
                                        key={issue.id}
                                        className="text-xs text-text-muted italic bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex items-start gap-2"
                                      >
                                        <div className="flex-1">
                                          "{issue.description || "Sem descrição"}"
                                          <div className="mt-1 text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                                            Reportado {issue.report_count || 1}{" "}
                                            {issue.report_count === 1
                                              ? "vez"
                                              : "vezes"}
                                          </div>
                                        </div>
                                        {issue.photo_url && (
                                          <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-orange-200">
                                            <img src={supabase.storage.from("checklist-photos").getPublicUrl(issue.photo_url).data.publicUrl} className="w-full h-full object-cover" alt="Foto Anterior" />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}

                              {formData.itemValues[item.id] === "defect" && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mb-4 p-4 rounded-xl border border-danger/20 bg-red-50/30 space-y-4"
                                >
                                  {item.options && item.options.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                      <p className="text-[10px] font-bold text-danger uppercase tracking-widest pb-1 border-b border-danger/10">Pendências Mapeadas:</p>
                                      {item.options.map((opt, i) => {
                                          const defectIdx = (formData.defects[item.id] || []).findIndex(d => d.description === opt);
                                          const isSelected = defectIdx !== -1;
                                          const defect = isSelected ? formData.defects[item.id][defectIdx] : null;
                                          return (
                                            <div key={i} className={`p-3 rounded-lg border ${isSelected ? 'border-danger bg-white' : 'border-app-border bg-white'} transition-colors`}>
                                              <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                                <input 
                                                  type="checkbox" 
                                                  className="w-4 h-4 text-danger rounded border-danger/30"
                                                  checked={isSelected}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                       const newDefects = [...(formData.defects[item.id] || []), { description: opt, photo: null }];
                                                       setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                                    } else {
                                                       const newDefects = [...(formData.defects[item.id] || [])];
                                                       newDefects.splice(defectIdx, 1);
                                                       setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                                    }
                                                  }}
                                                />
                                                {opt}
                                              </label>
                                              {isSelected && defect && (
                                                <div className="flex items-center gap-3 ml-7 pt-3 mt-3 border-t border-danger/10">
                                                  <div className="relative w-12 h-12 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center overflow-hidden">
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      capture="environment"
                                                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                          imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: false }).then(compressed => {
                                                            const newDefects = [...(formData.defects[item.id] || [])];
                                                            newDefects[defectIdx] = { ...newDefects[defectIdx], photo: compressed };
                                                            setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects } }));
                                                          });
                                                        }
                                                      }}
                                                    />
                                                    {defect.photo ? (
                                                      <img src={URL.createObjectURL(defect.photo)} className="w-full h-full object-cover" alt="Evidência" />
                                                    ) : defect.existing_photo_url ? (
                                                      <img src={supabase.storage.from("checklist-photos").getPublicUrl(defect.existing_photo_url).data.publicUrl} className="w-full h-full object-cover" alt="Evidência Anterior" />
                                                    ) : <Camera size={16} className="text-danger/50" />}
                                                  </div>
                                                  <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Foto Evidência</span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                      })}
                                    </div>
                                  )}

                                  {(() => {
                                    const customDefectIdx = (formData.defects[item.id] || []).findIndex(d => !d.existing_issue_id && (!item.options || !item.options.includes(d.description)));
                                    const hasCustomDefect = customDefectIdx !== -1;
                                    const customDefect = hasCustomDefect ? formData.defects[item.id][customDefectIdx] : null;

                                    return (
                                      <div className={`p-3 rounded-lg border ${hasCustomDefect ? 'border-danger bg-white' : 'border-app-border bg-white'} transition-colors mt-4`}>
                                        <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                          <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-danger rounded border-danger/30"
                                            checked={hasCustomDefect}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                const newDefects = [...(formData.defects[item.id] || []), { description: "", photo: null }];
                                                setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                              } else {
                                                const newDefects = [...(formData.defects[item.id] || [])];
                                                newDefects.splice(customDefectIdx, 1);
                                                setFormData(p => ({ ...p, defects: { ...p.defects, [item.id]: newDefects }}));
                                              }
                                            }}
                                          />
                                          Outros
                                        </label>
                                        
                                        {hasCustomDefect && customDefect && (
                                          <div className="mt-4 pt-4 border-t border-danger/10 space-y-4">
                                            <div className="space-y-1.5 mt-2">
                                              <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex justify-between">
                                                <span>Descrição do Problema (Outros - Reboque)</span>
                                              </label>
                                              <textarea
                                                className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                                placeholder="Descreva o defeito no reboque..."
                                                rows={2}
                                                value={customDefect.description}
                                                onChange={(e) => {
                                                  const newDefects = [...(formData.defects[item.id] || [])];
                                                  newDefects[customDefectIdx] = { ...newDefects[customDefectIdx], description: e.target.value };
                                                  setFormData(prev => ({ ...prev, defects: { ...prev.defects, [item.id]: newDefects } }));
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
                                                        imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: false }).then(compressed => {
                                                          const newDefects = [...(formData.defects[item.id] || [])];
                                                          newDefects[customDefectIdx] = { ...newDefects[customDefectIdx], photo: compressed };
                                                          setFormData(prev => ({ ...prev, defects: { ...prev.defects, [item.id]: newDefects } }));
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  {customDefect.photo ? (
                                                    <img src={URL.createObjectURL(customDefect.photo)} className="w-full h-full object-cover" alt="Defeito" />
                                                  ) : (
                                                    <Camera size={20} className="text-danger/40" />
                                                  )}
                                                </div>
                                                <span className="text-[10px] font-medium text-text-muted italic">
                                                  Toque para anexar evidência
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </motion.div>
                              )}
                            </React.Fragment>
                          ))
                      ) : (
                        <p className="text-[10px] text-text-muted italic py-2">
                          Nenhum item de reboque configurado.
                        </p>
                      )}
                    </div>
                  )}

                  {options.items.length === 0 && (
                    <div className="py-10 text-center text-xs text-text-muted italic">
                      Carregando itens...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="bento-card items-center py-10 space-y-6">
                <div className="w-20 h-20 bg-green-50 text-success rounded-full flex items-center justify-center shadow-inner">
                  <ClipboardCheck size={32} />
                </div>
                <div className="space-y-2 text-center px-4">
                  <h2 className="text-2xl font-black text-text-main tracking-tight">
                    Tudo pronto!
                  </h2>
                  <p className="text-text-muted text-xs font-medium leading-relaxed">
                    Os dados foram validados e o checklist está completo para
                    envio.
                  </p>
                </div>

                <div className="w-full bg-app-bg p-5 rounded-2xl border border-app-border space-y-3">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Placa</span>
                    <span className="text-text-main">
                      {
                        options.vehicles.find(
                          (v) => v.id === formData.vehicleId,
                        )?.plate
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Hodômetro</span>
                    <span className="text-text-main font-mono">
                      {formData.km} km
                    </span>
                  </div>
                  <div className="h-px bg-app-border/50" />
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Status</span>
                    <span className="text-success">CONCLUÍDO</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-12 sm:p-6 sm:pb-8 bg-white/80 backdrop-blur-md border-t border-app-border flex gap-3 z-[60] max-w-xl mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pt-4">
        {currentStep > 0 && currentStep < 3 && (
          <button
            disabled={loading || isStepLoading}
            onClick={prevStep}
            className="flex-1 h-12 rounded-xl border border-app-border font-bold text-xs text-text-muted flex items-center justify-center gap-2 hover:bg-app-bg transition-all disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
        )}

        {currentStep < 3 ? (
          <button
            disabled={!isStepValid() || loading || isStepLoading}
            onClick={nextStep}
            className={`flex-[2] h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm
              ${isStepValid() ? "bg-primary text-white hover:opacity-90" : "bg-app-bg text-text-muted cursor-not-allowed border border-app-border"}`}
          >
            {loading || isStepLoading ? (
              "Processando..."
            ) : (
              <>
                Próximo <ChevronRight size={16} />
              </>
            )}
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-text-main text-white font-black text-sm tracking-widest shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              "FINALIZAR OPERAÇÃO"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Sub-component for Checklist Icon
function ClipboardCheck({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}
