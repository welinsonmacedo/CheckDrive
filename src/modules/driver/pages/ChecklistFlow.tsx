import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Image as ImageIcon,
  Camera,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Gauge,
  Car,
  Plus,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import localforage from "localforage";
import { supabase } from "@/src/lib/supabase";
import {
  decodeItemTitle,
  applyNumberMask,
  parseMaskedValue,
} from "@/src/lib/maskUtils";
import { validateFileUpload } from "@/src/modules/shared/utils/validators";
import { triggerWhatsAppDispatches } from "@/src/lib/whatsappIntegration";

const STEPS = ["info", "external_photos", "items", "summary"];

export default function ChecklistFlow() {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
      odometer: null as File | null,
    },
    photoPreviews: {} as Record<string, string>,
    itemValues: {} as Record<string, "normal" | "defect" | string>,
    defects: {} as Record<
      string,
      Array<{
        description: string;
        photo: File | null;
        existing_issue_id?: string;
        existing_photo_url?: string;
      }>
    >,
  });

  const [lastKm, setLastKm] = useState<number | null>(null);
  const [existingIssues, setExistingIssues] = useState<any[]>([]);
  const [vehicleAlerts, setVehicleAlerts] = useState<any[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [manualChecklistActivate, setManualChecklistActivate] = useState(true);
  const [isTrailerOnly, setIsTrailerOnly] = useState(false);
  const [requireExternalPhotos, setRequireExternalPhotos] = useState(true);
  const [requireFuelReceiptPhoto, setRequireFuelReceiptPhoto] = useState(true);
  const [requireLocation, setRequireLocation] = useState(false);
  const [kmLimitSettings, setKmLimitSettings] = useState({
    enabled: false,
    maxDistance: 0,
  });
  const [hoursLimitSettings, setHoursLimitSettings] = useState({
    enabled: false,
    maxHours: 100,
  });

  const [dataRestored, setDataRestored] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const savedData: any = await localforage.getItem(
          `checklist_state_${type || "start"}`,
        );
        const currentUrlScheduleId = new URLSearchParams(
          location.search,
        ).get("schedule");

        if (savedData && savedData.formData) {
          if (savedData.scheduleId === currentUrlScheduleId) {
            setFormData(savedData.formData);
            if (savedData.currentStep !== undefined) {
              setCurrentStep(savedData.currentStep);
            }
          } else {
            // Se mudou de escala ou entrou em versão avulsa sem ID compativel, limpa o state
            await localforage.removeItem(`checklist_state_${type || "start"}`);
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (dataRestored && !isSubmitting && !hasSubmittedRef.current) {
      const scheduleId = new URLSearchParams(location.search).get(
        "schedule",
      );
      localforage
        .setItem(`checklist_state_${type || "start"}`, {
          formData,
          currentStep,
          scheduleId,
        })
        .catch((err) => {
          console.error("Localforage save error:", err);
        });
    }
  }, [formData, currentStep, type, dataRestored, isSubmitting]);

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
        .or("status.eq.pending,and(status.eq.resolved,resolved_by.is.null)");

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
                i.is_trailer_item === (issue.trailer_id !== null),
            );

            if (item) {
              /*if (newItemValues[item.id] !== "defect") {
                newItemValues[item.id] = "defect";
                updated = true;
              }*/

              if (!newDefects[item.id]) {
                newDefects[item.id] = [];
              }
              if (
                !newDefects[item.id].some(
                  (d) => d.existing_issue_id === issue.id,
                )
              ) {
                newDefects[item.id].push({
                  description: issue.description || "",
                  photo: null,
                  existing_issue_id: issue.id,
                  existing_photo_url: issue.photo_url || undefined,
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

  const renderItemInput = (item: any) => {
    if (
      item.input_type === "text" ||
      item.input_type === "number" ||
      item.mask
    ) {
      return (
        <div className="w-40 shrink-0">
          <input
            type={item.input_type === "number" || item.mask ? "tel" : "text"}
            className="w-full h-10 px-3 rounded-lg border border-app-border bg-app-bg text-sm font-medium text-text-main text-right focus:border-primary transition-colors outline-none"
            placeholder={item.mask ? item.mask.replace(/#/g, "0") : "Digite..."}
            value={
              formData.itemValues[item.id] === undefined ||
              formData.itemValues[item.id] === "normal" ||
              formData.itemValues[item.id] === "defect"
                ? ""
                : formData.itemValues[item.id]
            }
            onChange={(e) => {
              let val = e.target.value;
              if (item.mask) {
                val = applyNumberMask(val, item.mask);
              }
              setFormData((prev) => ({
                ...prev,
                itemValues: { ...prev.itemValues, [item.id]: val },
              }));
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex bg-app-bg p-1 rounded-xl border border-app-border gap-1 shrink-0">
        <button
          type="button"
          className={`h-8 px-4 rounded-lg font-bold text-xs transition-all ${
            formData.itemValues[item.id] === "normal"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-text-muted hover:text-text-main"
          }`}
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              itemValues: { ...prev.itemValues, [item.id]: "normal" },
            }));
          }}
        >
          OK
        </button>
        <button
          type="button"
          className={`h-8 px-4 rounded-lg font-bold text-xs transition-all ${
            formData.itemValues[item.id] === "defect"
              ? "bg-danger text-white shadow-sm"
              : "text-text-muted hover:text-text-main"
          }`}
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              itemValues: { ...prev.itemValues, [item.id]: "defect" },
            }));
          }}
        >
          Defeito
        </button>
      </div>
    );
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

      let currentKmForAlerts = 0;
      if (data) {
        setLastKm(data.odometer);
        currentKmForAlerts = data.odometer;
      } else {
        setLastKm(null);
      }

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select("*")
        .eq("target_vehicle_id", vehicleId)
        .eq("active", true)
        .eq("generate_issue", true);

      if (alertsData) {
        setVehicleAlerts(alertsData);
      } else {
        setVehicleAlerts([]);
      }
    } catch (error) {
      console.error("Error fetching last KM or alerts:", error);
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
          .select("full_name, modality_ids, company_id")
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
          supabase.from("vehicles").select("*").eq("company_id", userProfile?.company_id).eq("active", true),
          supabase.from("routes").select("*").eq("company_id", userProfile?.company_id).eq("active", true),
          supabase.from("trailers").select("*").eq("company_id", userProfile?.company_id).eq("active", true),
          supabase
            .from("app_settings")
            .select("*")
            .eq("company_id", userProfile?.company_id)
            .maybeSingle(),
        ]);

        await localforage.setItem("cache_vehicles", vRes.data);
        await localforage.setItem("cache_routes", rRes.data);
        await localforage.setItem("cache_trailers", tRes.data);
        await localforage.setItem("cache_app_settings", settingsRes.data);
      } catch (err) {
        console.error("Fetch options failed, using offline cache", err);
        const [cv, cr, ct, cs] = await Promise.all([
          localforage.getItem("cache_vehicles"),
          localforage.getItem("cache_routes"),
          localforage.getItem("cache_trailers"),
          localforage.getItem("cache_app_settings"),
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
      if (
        settingsRes.data &&
        settingsRes.data.manual_checklist_activate !== undefined
      ) {
        setManualChecklistActivate(
          settingsRes.data.manual_checklist_activate !== false,
        );
      }
      if (settingsRes.data) {
        setKmLimitSettings({
          enabled: settingsRes.data.km_limit_enabled === true,
          maxDistance: settingsRes.data.max_km_limit
            ? Number(settingsRes.data.max_km_limit)
            : 0,
        });
        setHoursLimitSettings({
          enabled: settingsRes.data.hours_limit_enabled === true,
          maxHours: settingsRes.data.max_hours
            ? Number(settingsRes.data.max_hours)
            : 100,
        });
      }

      // Check for active schedule to pre-fill
      let prefill = { vehicleId: "", trailerId: "", routeId: "" };
      if (user) {
        // Find if url has ?schedule=ID
        const urlParams = new URLSearchParams(location.search);
        const scheduleId = urlParams.get("schedule");
        const cacheKey = scheduleId
          ? `cache_schedule_${scheduleId}`
          : "cache_schedules_latest";

        let scheduleRes;
        try {
          let query = supabase
            .from("schedules")
            .select("vehicle_id, trailer_id, route_id")
            .eq("driver_id", user?.id);

          if (scheduleId) {
            query = query.eq("id", scheduleId);
          } else {
            const now = new Date();
            const twelveHoursAgo = new Date(
              now.getTime() - 12 * 60 * 60 * 1000,
            );
            query = query
              .is("end_checklist_id", null)
              .lte("start_at", now.toISOString())
              .gte("end_at", twelveHoursAgo.toISOString())
              .order("start_at", { ascending: false });
          }

          scheduleRes = await query.limit(1).maybeSingle();
          await localforage.setItem(cacheKey, scheduleRes.data);
        } catch (e) {
          scheduleRes = { data: await localforage.getItem(cacheKey) };
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
          .eq("company_id", userProfile?.company_id)
          .maybeSingle();
        typeData = typeRes.data;

        if (typeData) {
          const itemsRes = await supabase
            .from("checklist_items")
            .select("*")
            .eq("type_id", typeData.id)
            .eq("company_id", userProfile?.company_id)
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
          const { title, mask, options, vtype } = decodeItemTitle(item.title);
          return { ...item, title, mask, options, vehicle_type: item.vehicle_type || vtype || (item.is_trailer_item ? 'TRAILER' : 'ALL') };
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
      checklistItems.forEach((item) => {
        if (!item.input_type || item.input_type === "boolean") {
          defaults[item.id] = "normal";
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
    if (currentStep === 0) {
      if (!isInternal && !isTrailerOnly) {
        if (!formData.vehicleId) {
          return alert("Selecione um veículo.");
        }
        if (!formData.km) {
          return alert("Informe a kilometragem atual.");
        }
        if (lastKm !== null && Number(formData.km) < Number(lastKm)) {
          return alert(
            `Kilometragem inválida. O último KM registrado foi ${lastKm}.`,
          );
        }
      }

      if (type !== "yard") {
        const selectedVehicle = options.vehicles.find(
          (v: any) => v.id === formData.vehicleId,
        );
        if (
          !isTrailerOnly &&
          selectedVehicle?.requires_trailer &&
          !formData.trailerId
        ) {
          return alert("Este veículo exige que o reboque seja selecionado.");
        }
        if (options.routes.length > 0 && !formData.routeId) {
          return alert("Selecione uma rota.");
        }
      }
    }

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

  const compressImageSafe = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg",
      };
      return await imageCompression(file, options);
    } catch (error) {
      console.warn("Compression failed, returning original file", error);
      return file;
    }
  };

  const safeGetFile = async (
    file: any,
    key: string,
    fallbackBase64?: string,
  ): Promise<File | null> => {
    if (file && (file instanceof Blob || file instanceof File)) {
      return file as File;
    }
    if (fallbackBase64) {
      if (fallbackBase64.startsWith("data:image/")) {
        try {
          const arr = fallbackBase64.split(",");
          const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], `photo_${key}.jpg`, { type: mime });
        } catch (err) {
          console.error(
            "Error converting base64 fallback to file for key: " + key,
            err,
          );
        }
      } else if (fallbackBase64.startsWith("blob:")) {
        try {
          const response = await fetch(fallbackBase64);
          const blob = await response.blob();
          return new File([blob], `photo_${key}.jpg`, { type: blob.type || "image/jpeg" });
        } catch (err) {
          console.error("Error fetching blob URL for key: " + key, err);
        }
      }
    }
    return null;
  };

  const handlePhotoUpload = async (key: string, file: File) => {
    // 1. Instant preview using object URL (zero memory overhead)
    const objectUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      photoPreviews: {
        ...(prev.photoPreviews || {}),
        [key]: objectUrl,
      },
      photos: { ...prev.photos, [key]: file },
    }));

    // 2. Perform safe image compression in background
    try {
      const finalFile = await compressImageSafe(file);
      setFormData((prev) => ({
        ...prev,
        photos: { ...prev.photos, [key]: finalFile },
      }));
    } catch (e) {
      console.warn("Compression failed in background, keeping original", e);
    }
  };

  const handleDefectPhotoUpload = async (
    itemId: string,
    defectIdx: number,
    file: File,
  ) => {
    // 1. Instant preview using object URL (zero memory overhead)
    const objectUrl = URL.createObjectURL(file);
    setFormData((prev) => {
      const newDefects = [...(prev.defects[itemId] || [])];
      newDefects[defectIdx] = {
        ...newDefects[defectIdx],
        photo: file,
      };
      return {
        ...prev,
        photoPreviews: {
          ...(prev.photoPreviews || {}),
          [`defect_${itemId}_${defectIdx}`]: objectUrl,
        },
        defects: {
          ...prev.defects,
          [itemId]: newDefects,
        },
      };
    });

    // 2. Perform safe image compression
    try {
      const finalFile = await compressImageSafe(file);
      setFormData((prev) => {
        const newDefects = [...(prev.defects[itemId] || [])];
        newDefects[defectIdx] = {
          ...newDefects[defectIdx],
          photo: finalFile,
        };
        return {
          ...prev,
          defects: {
            ...prev.defects,
            [itemId]: newDefects,
          },
        };
      });
    } catch (e) {
      console.warn("Compression failed in background, keeping original", e);
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) {
      if (!isTrailerOnly && !formData.vehicleId) return false;
      const kmVal = parseInt(formData.km);
      if (isNaN(kmVal) || kmVal <= 0) return false;
      if (type !== "yard" && options.routes.length > 0 && !formData.routeId) {
        return false;
      }
      return true;
    }
    if (currentStep === 1) {
      const photos = formData.photos;
      const previews = formData.photoPreviews || {};

      if (type === "fuel" || type === "Abastecimento") {
        const hasReceipt =
          photos.receipt ||
          (previews.receipt && (previews.receipt.startsWith("data:image/") || previews.receipt.startsWith("blob:")));
        const hasOdometer =
          photos.odometer ||
          (previews.odometer && (previews.odometer.startsWith("data:image/") || previews.odometer.startsWith("blob:")));

        if (requireFuelReceiptPhoto && !hasReceipt) return false;
        if (!hasOdometer) return false;
        return true;
      }

      if (!requireExternalPhotos) return true;

      const hasFront =
        photos.front ||
        (previews.front && (previews.front.startsWith("data:image/") || previews.front.startsWith("blob:")));
      const hasBack =
        photos.back ||
        (previews.back && (previews.back.startsWith("data:image/") || previews.back.startsWith("blob:")));
      const hasLeft =
        photos.left ||
        (previews.left && (previews.left.startsWith("data:image/") || previews.left.startsWith("blob:")));
      const hasRight =
        photos.right ||
        (previews.right && (previews.right.startsWith("data:image/") || previews.right.startsWith("blob:")));

      return !!(hasFront && hasBack && hasLeft && hasRight);
    }
    if (currentStep === 2) {
      return options.items.every((item) => {
        if (item.order_index === 0) return true; // Optional item
        return !!formData.itemValues[item.id];
      });
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setIsSubmitting(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      if (requireLocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (err) {
          console.error("Location error", err);
          alert("Não foi possível obter a localização. Certifique-se de que o GPS está ativado e a permissão de localização foi concedida ao navegador.");
          setLoading(false);
          setIsSubmitting(false);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Motorista não autenticado");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      const companyId = profileData?.company_id || null;

      const photoUrls: Record<string, string> = {};
      let receipt_photo_url: string | null = null;
      const photos = formData.photos;
      const previews = formData.photoPreviews || {};

      for (const key of ["front", "back", "left", "right", "odometer", "receipt"]) {
        const fileObj = (photos as any)[key];
        const previewStr = (previews as any)[key];
        const finalFile = await safeGetFile(fileObj, key, previewStr);

        if (finalFile) {
          const path = `${user.id}/${key === 'receipt' ? 'receipts' : 'photos'}/${Date.now()}_${key}.jpg`;
          const { error } = await supabase.storage
            .from("checklist-photos")
            .upload(path, finalFile);
          if (error) {
            console.error(`Error uploading photo ${key}:`, error);
          } else {
            if (key === 'receipt') {
              receipt_photo_url = path;
            } else {
              photoUrls[key] = path;
            }
          }
        }
      }

      const hasDefects = Object.values(formData.itemValues).includes("defect");
      const status = hasDefects ? "com_defeitos" : "concluido";

      const itemTitles = options.items.reduce((acc: any, item: any) => {
        acc[item.id] = item.title;
        return acc;
      }, {});

      const scheduleId = new URLSearchParams(location.search).get(
        "schedule",
      );
      const { data: submission, error: subError } = await supabase
        .from("checklist_submissions")
        .insert({
          driver_id: user.id,
          vehicle_id:
            isInternal && isTrailerOnly ? null : formData.vehicleId || null,
          trailer_id: formData.trailerId || null,
          route_id: formData.routeId || null,
          type: type || "start",
          odometer: parseInt(formData.km) || 0,
          latitude: lat,
          longitude: lng,
          photos: photoUrls,
          receipt_photo_url,
          status,
          company_id: companyId,
          details: {
            itemValues: formData.itemValues,
            itemTitles,
            manualTrailerPlate: formData.manualTrailerPlate,
          },
        })
        .select()
        .single();

      if (subError || !submission) throw subError;

      const issuesToInsert = [];
      for (const [itemId, subDefectsRaw] of Object.entries(
        formData.defects,
      ) as any) {
        if (formData.itemValues[itemId] !== "defect") {
          continue;
        }

        const itemObj = options.items.find((i: any) => i.id === itemId);
        const isTrailerItem = itemObj?.is_trailer_item;
        const itemTitle = itemObj?.title || itemId;

        let issueVehicleId = null;
        let issueTrailerId = null;
        if (isInternal && isTrailerOnly) {
          issueTrailerId = formData.trailerId || null;
        } else if (isTrailerItem) {
          issueTrailerId = formData.trailerId || null;
        } else {
          issueVehicleId = formData.vehicleId || null;
        }

        const subDefects = subDefectsRaw.filter(
          (d: any) =>
            d.description?.trim() !== "" ||
            d.photo ||
            d.existing_photo_url ||
            d.existing_issue_id,
        );

        for (let i = 0; i < subDefects.length; i++) {
          const d = subDefects[i];
          let dPhotoUrl = d.existing_photo_url || null;

          const defectPreviewKey = `defect_${itemId}_${i}`;
          const dFinalFile = await safeGetFile(d.photo, defectPreviewKey, previews[defectPreviewKey]);

          if (dFinalFile) {
            const path = `${user.id}/defects/${Date.now()}_${itemId}_${i}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from("checklist-photos")
              .upload(path, dFinalFile);
            if (!uploadError) {
              dPhotoUrl = path;
            } else {
              console.error("Defect photo upload error", uploadError);
            }
          }

          issuesToInsert.push({
            submission_id: submission.id,
            vehicle_id: issueVehicleId,
            trailer_id: issueTrailerId,
            driver_id: user.id,
            item_title: itemTitle,
            description: d.description,
            photo_url: dPhotoUrl,
            status: "pending",
            priority: itemObj?.priority || "Medio",
            existing_issue_id: d.existing_issue_id || null,
            company_id: companyId,
          });
        }
      }

      if (issuesToInsert.length > 0) {
        for (const newIssue of issuesToInsert) {
          if (newIssue.existing_issue_id) {
            await supabase
              .from("checklist_issues")
              .update({
                description: newIssue.description,
                photo_url: newIssue.photo_url || undefined,
                submission_id: newIssue.submission_id,
              })
              .eq("id", newIssue.existing_issue_id);
          } else {
            await supabase.from("checklist_issues").insert({
              submission_id: newIssue.submission_id,
              vehicle_id: newIssue.vehicle_id,
              trailer_id: newIssue.trailer_id,
              driver_id: newIssue.driver_id,
              item_title: newIssue.item_title,
              description: newIssue.description,
              photo_url: newIssue.photo_url,
              status: newIssue.status,
              priority: (newIssue as any).priority,
              company_id: newIssue.company_id,
            });
          }
        }
      }

      if (scheduleId) {
        if (type === "start") {
          await supabase
            .from("schedules")
            .update({ start_checklist_id: submission.id })
            .eq("id", scheduleId);
        } else if (type === "end") {
          await supabase
            .from("schedules")
            .update({ end_checklist_id: submission.id })
            .eq("id", scheduleId);
        } else if (type === "fuel" || type === "Abastecimento") {
          await supabase
            .from("schedules")
            .update({ fuel_checklist_id: submission.id })
            .eq("id", scheduleId);
        }
      }

      if (type === "fuel" || type === "Abastecimento") {
        try {
          const litersItem = options.items.find(
            (i: any) => i.input_type === "fuel_liters",
          );
          let liters = 0;
          if (litersItem && formData.itemValues[litersItem.id]) {
            liters = parseFloat(
              (formData.itemValues[litersItem.id] || '').toString().replace(",", "."),
            );
          } else {
            // Fallback to title detection
            const titleEntry = Object.entries(itemTitles).find(
              ([_, title]: any) => {
                const t = title.toLowerCase();
                return (
                  t.includes("litro") ||
                  t.includes("quantidade") ||
                  t.includes("valor") ||
                  t.includes("lts")
                );
              },
            );
            if (titleEntry && formData.itemValues[titleEntry[0]]) {
              liters = parseFloat(
                (formData.itemValues[titleEntry[0]] || '').toString().replace(",", "."),
              );
            }
          }

          const currentOdo = parseInt(formData.km) || 0;
          const vehicleId =
            isInternal && isTrailerOnly ? null : formData.vehicleId || null;

          if (vehicleId && liters > 0) {
            let startOdo = currentOdo;
            let distance = 0;
            let startDate = submission.created_at;
            let shouldInsert = false;

            let schedule_start_date: string | null = null;
            if (scheduleId) {
              const { data: sData } = await supabase
                .from("schedules")
                .select("id, start_checklist_id, start_at, created_at")
                .eq("id", scheduleId)
                .single();
              if (sData) {
                schedule_start_date = sData.start_at || sData.created_at;
                if (sData.start_checklist_id) {
                  const { data: startChecklistObj } = await supabase
                    .from("checklist_submissions")
                    .select("created_at")
                    .eq("id", sData.start_checklist_id)
                    .single();
                  if (startChecklistObj) {
                    schedule_start_date = startChecklistObj.created_at;
                  }
                }
              }
            }

            if (schedule_start_date) {
              const { data: priorFuels } = await supabase
                .from("checklist_submissions")
                .select("id, odometer, created_at")
                .eq("vehicle_id", vehicleId)
                .in("type", ["fuel", "Abastecimento"])
                .gte("created_at", schedule_start_date)
                .lt("created_at", submission.created_at)
                .order("created_at", { ascending: true });

              if (priorFuels && priorFuels.length === 1) {
                const f1 = priorFuels[0];
                startOdo = f1.odometer || 0;
                distance = currentOdo - startOdo;
                startDate = f1.created_at;
                shouldInsert = true;
              }
            } else {
              // Fallback to last fuel checklist if not attached to a schedule
              const { data: lastFuels } = await supabase
                .from("checklist_submissions")
                .select("id, odometer, created_at")
                .eq("vehicle_id", vehicleId)
                .in("type", ["fuel", "Abastecimento"])
                .lt("created_at", submission.created_at)
                .order("created_at", { ascending: false })
                .limit(1);

              if (lastFuels && lastFuels.length > 0) {
                const prevSub = lastFuels[0];
                startOdo = prevSub.odometer || 0;
                distance = currentOdo - startOdo;
                startDate = prevSub.created_at;
                shouldInsert = true;
              }
            }

            if (shouldInsert) {
              if (distance < 0) distance = 0;
              const average = liters > 0 ? distance / liters : 0;

              // Insert automatically into vehicle_averages
              await supabase.from("vehicle_averages").insert([
                {
                  company_id: companyId,
                  vehicle_id: vehicleId,
                  driver_id: user.id,
                  schedule_id: scheduleId || null,
                  fuel_submission_id: submission.id,
                  start_date: startDate,
                  end_date: submission.created_at,
                  start_odometer: startOdo,
                  end_odometer: currentOdo,
                  distance: distance,
                  liters: liters,
                  average: average,
                  status: "pending",
                  notes:
                    "Calculado automaticamente na submissão (2º abastecimento posterior à escala)",
                },
              ]);
            }
          }
        } catch (avgErr) {
          console.error("Failed to auto-generate vehicle_average:", avgErr);
        }
      }

      // Note: Auto-alerts check & WhatsApp notifications are handled entirely asynchronously by the check-checklist-alerts Supabase Edge Function database webhook.
      const sessionKey = `checklist_state_${type || "start"}`;
      await localforage.removeItem(sessionKey);
      hasSubmittedRef.current = true;

      navigate("/driver/home");
    } catch (error) {
      console.error("Submission failed", error);
      alert(
        `Erro ao enviar checklist (${error instanceof Error ? error.message : JSON.stringify(error)}). Por favor tente novamente.`,
      );
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  if (!manualChecklistActivate && !isScheduled && !isInternal) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-lg font-black text-text-main mb-2">
          Checklist Manual Desativado
        </h2>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          A empresa configurou a obrigatoriedade de iniciar o checklist a partir
          de uma escala programada. Por favor, utilize uma das escalas
          disponíveis na tela inicial do aplicativo.
        </p>
        <button
          onClick={() => navigate("/")}
          className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-md cursor-pointer hover:bg-opacity-90 active:scale-95 transition-all text-sm animate-pulse-subtle"
        >
          Voltar para Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-app-border flex items-center px-4 justify-between z-50 max-w-xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-app-bg text-text-muted hover:text-text-main transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-bold text-text-main">
          Checklist -{" "}
          {type === "yard"
            ? "Pátio"
            : type === "end"
              ? "Fim de Rota"
              : type === "fuel" || type === "Abastecimento"
                ? "Abastecimento"
                : "Início de Rota"}
        </h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 pt-20 space-y-4">
        {/* Step Contents */}
        <div className="space-y-4">
          {/* Step 0: Information */}
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bento-card p-5 bg-white border border-app-border rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                  Dados do Checklist
                </h3>

                {/* Vehicle Selection */}
                {!isTrailerOnly && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">
                      Veículo
                    </label>
                    <select
                      className="w-full h-12 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-medium text-text-main outline-none focus:border-primary"
                      value={formData.vehicleId}
                      onChange={(e) => {
                        setFormData({ ...formData, vehicleId: e.target.value });
                        fetchLastKm(e.target.value);
                      }}
                    >
                      <option value="">Selecione um veículo</option>
                      {options.vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.plate} - {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Trailer Selection */}
                {type !== "yard" &&
                  (isTrailerOnly ||
                    options.vehicles.find(
                      (v: any) => v.id === formData.vehicleId,
                    )?.requires_trailer) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-main">
                        Reboque / Carreta
                      </label>
                      <select
                        className="w-full h-12 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-medium text-text-main outline-none focus:border-primary"
                        value={formData.trailerId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trailerId: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione um reboque</option>
                        {options.trailers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.plate} - {t.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {/* Route Selection */}
                {type !== "yard" && options.routes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">
                      Rota
                    </label>
                    <select
                      className="w-full h-12 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-medium text-text-main outline-none focus:border-primary"
                      value={formData.routeId}
                      onChange={(e) =>
                        setFormData({ ...formData, routeId: e.target.value })
                      }
                    >
                      <option value="">Selecione a rota</option>
                      {options.routes.map((r: any) => {
                        const validStops = (r.stops || []).filter(
                          (s: string) => !s.startsWith("__MODALITY:"),
                        );
                        const stopsStr =
                          validStops.length > 0
                            ? ` (Paradas: ${validStops.join(", ")})`
                            : "";
                        return (
                          <option key={r.id} value={r.id}>
                            {r.origin} ➔ {r.destination}
                            {stopsStr}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Odometer KM Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-text-main">
                      Kilometragem
                    </label>
                    {lastKm !== null && (
                      <span className="text-[10px] font-medium text-text-muted">
                        Último KM registrado: <strong>{lastKm}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Digite o KM atual"
                    className="w-full h-12 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-medium text-text-main outline-none focus:border-primary"
                    value={formData.km}
                    onChange={(e) =>
                      setFormData({ ...formData, km: e.target.value })
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: External Photos */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bento-card p-5 bg-white border border-app-border rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                  {type === "fuel" || type === "Abastecimento"
                    ? "Fotos de Abastecimento"
                    : "Fotos Externas do Veículo"}
                </h3>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[10px] leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block mb-1">Atenção</span>
                  Dê preferência a retirar a foto diretamente do app. Caso for preciso usar a galeria, fotos antigas são verificadas pelo app via metadados.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(type === "fuel" || type === "Abastecimento"
                    ? [
                        { key: "odometer", label: "Odômetro/Tacógrafo" },
                        ...(requireFuelReceiptPhoto
                          ? [{ key: "receipt", label: "Cupom" }]
                          : []),
                      ]
                    : [
                        { key: "front", label: "Frente" },
                        { key: "back", label: "Traseira" },
                        { key: "left", label: "Lateral Esquerda" },
                        { key: "right", label: "Lateral Direita" },
                      ]
                  ).map(({ key, label }) => {
                    const currentPhoto = (formData.photos as any)[key];
                    const currentPreview =
                      (formData.photoPreviews || ({} as any))[key] ||
                      (currentPhoto &&
                      (currentPhoto instanceof Blob ||
                        currentPhoto instanceof File)
                        ? URL.createObjectURL(currentPhoto)
                        : "");
                    return (
                      <div key={key} className="flex flex-col gap-2 w-full">
                        <div className="text-left px-1">
                          <span className="text-xs font-bold text-text-main uppercase tracking-wider">
                            {label}
                          </span>
                        </div>
                        {currentPreview ? (
                          <div className="relative h-28 w-full rounded-2xl border border-app-border bg-app-bg overflow-hidden shadow-sm">
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(key, file);
                              }}
                            />
                            <img
                              src={currentPreview}
                              className="absolute inset-0 w-full h-full object-cover"
                              alt={label}
                            />
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-20 transition-opacity">
                              <span className="text-xs font-black text-white uppercase tracking-wider mb-1">
                                {label}
                              </span>
                              <span className="text-[10px] text-white/90 uppercase tracking-widest font-bold px-3 py-1 bg-black/30 rounded-full">
                                Toque para alterar
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 h-20">
                            <div className="relative rounded-xl border border-app-border bg-app-bg hover:bg-zinc-50 transition-colors flex flex-col items-center justify-center overflow-hidden shadow-sm">
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(key, file);
                                }}
                              />
                              <Camera size={20} className="text-primary mb-1" />
                              <span className="text-[10px] font-black text-text-main uppercase tracking-wider">Câmera</span>
                            </div>
                            <div className="relative rounded-xl border border-app-border bg-app-bg hover:bg-zinc-50 transition-colors flex flex-col items-center justify-center overflow-hidden shadow-sm">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(key, file);
                                }}
                              />
                              <ImageIcon size={20} className="text-emerald-500 mb-1" />
                              <span className="text-[10px] font-black text-text-main uppercase tracking-wider">Galeria</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Items Check */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="space-y-4">
                {/* Vehicle Items List */}
                <div className="space-y-4">
                  {options.items
                    .filter((item: any) => !item.is_trailer_item)
                    .filter((item: any) => {
                      if (!item.vehicle_type || item.vehicle_type === 'ALL') return true;
                      const selectedVeh = options.vehicles?.find((v: any) => v.id === formData.vehicleId);
                      if (selectedVeh) {
                        if (item.vehicle_type === selectedVeh.asset_type) return true;
                        if (item.vehicle_type === selectedVeh.vehicle_type) return true;
                        if (selectedVeh.vehicle_types?.name && item.vehicle_type === selectedVeh.vehicle_types.name) return true;
                        return false;
                      }
                      return true;
                    })
                    .map((item: any) => (
                      <React.Fragment key={item.id}>
                        <motion.div
                          layout
                          className="bento-card p-4 bg-white border border-app-border rounded-2xl space-y-4 shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-text-main">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-[10px] text-text-muted">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {renderItemInput(item)}
                          </div>

                          {formData.itemValues[item.id] === "defect" && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mb-4 p-4 rounded-xl border border-danger/20 bg-red-50/30 space-y-4"
                            >
                              {item.options && item.options.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.options.map((opt: string) => {
                                    const defectIdx = (
                                      formData.defects[item.id] || []
                                    ).findIndex(
                                      (d: any) => d.description === opt,
                                    );
                                    const isSelected = defectIdx !== -1;
                                    const defect = isSelected
                                      ? (formData.defects[item.id] || [])[
                                          defectIdx
                                        ]
                                      : null;

                                    return (
                                      <div
                                        key={opt}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                          isSelected
                                            ? "border-danger bg-red-50 text-danger"
                                            : "border-app-border bg-app-bg text-text-muted hover:text-text-main"
                                        }`}
                                      >
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            className="form-checkbox h-4 w-4 text-danger border-danger/30 rounded"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                const newDefects = [
                                                  ...(formData.defects[
                                                    item.id
                                                  ] || []),
                                                  {
                                                    description: opt,
                                                    photo: null,
                                                  },
                                                ];
                                                setFormData({
                                                  ...formData,
                                                  defects: {
                                                    ...formData.defects,
                                                    [item.id]: newDefects,
                                                  },
                                                });
                                              } else {
                                                const newDefects = [
                                                  ...(formData.defects[
                                                    item.id
                                                  ] || []),
                                                ];
                                                newDefects.splice(defectIdx, 1);
                                                setFormData({
                                                  ...formData,
                                                  defects: {
                                                    ...formData.defects,
                                                    [item.id]: newDefects,
                                                  },
                                                });
                                              }
                                            }}
                                          />
                                          {opt}
                                        </label>

                                        {isSelected && defect && (
                                          <div className="flex items-center gap-2 border-l border-red-200 pl-2">
                                            <div className="relative w-8 h-8 rounded-full border border-red-200 bg-red-50 flex items-center justify-center overflow-hidden">
                                              <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={(e) => {
                                                  const file =
                                                    e.target.files?.[0];
                                                  if (file) {
                                                    handleDefectPhotoUpload(
                                                      item.id,
                                                      defectIdx,
                                                      file,
                                                    );
                                                  }
                                                }}
                                              />
                                              {formData.photoPreviews?.[
                                                `defect_${item.id}_${defectIdx}`
                                              ] ? (
                                                <img
                                                  src={
                                                    formData.photoPreviews[
                                                      `defect_${item.id}_${defectIdx}`
                                                    ]
                                                  }
                                                  className="w-full h-full object-cover"
                                                  alt="Evidência"
                                                />
                                              ) : defect.existing_photo_url ? (
                                                <img
                                                  src={
                                                    supabase.storage
                                                      .from("checklist-photos")
                                                      .getPublicUrl(
                                                        defect.existing_photo_url,
                                                      ).data.publicUrl
                                                  }
                                                  className="w-full h-full object-cover"
                                                  alt="Evidência Anterior"
                                                />
                                              ) : (
                                                <Camera
                                                  size={16}
                                                  className="text-danger/50"
                                                />
                                              )}
                                            </div>
                                            <span className="text-[9px] font-bold text-danger uppercase tracking-widest">
                                              Foto Evidência
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {(() => {
                                const customDefectIdx = (
                                  formData.defects[item.id] || []
                                ).findIndex(
                                  (d) =>
                                    !d.existing_issue_id &&
                                    (!item.options ||
                                      !item.options.includes(d.description)),
                                );
                                const hasCustomDefect = customDefectIdx !== -1;
                                const customDefect = hasCustomDefect
                                  ? formData.defects[item.id][customDefectIdx]
                                  : null;

                                return (
                                  <div
                                    className={`p-3 rounded-lg border ${hasCustomDefect ? "border-danger bg-white" : "border-app-border bg-white"} transition-colors mt-4`}
                                  >
                                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-danger rounded border-danger/30"
                                        checked={hasCustomDefect}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newDefects = [
                                              ...(formData.defects[item.id] ||
                                                []),
                                              {
                                                description: "",
                                                photo: null,
                                              },
                                            ];
                                            setFormData((p) => ({
                                              ...p,
                                              defects: {
                                                ...p.defects,
                                                [item.id]: newDefects,
                                              },
                                            }));
                                          } else {
                                            const newDefects = [
                                              ...(formData.defects[item.id] ||
                                                []),
                                            ];
                                            newDefects.splice(
                                              customDefectIdx,
                                              1,
                                            );
                                            setFormData((p) => ({
                                              ...p,
                                              defects: {
                                                ...p.defects,
                                                [item.id]: newDefects,
                                              },
                                            }));
                                          }
                                        }}
                                      />
                                      Outros
                                    </label>

                                    {hasCustomDefect && customDefect && (
                                      <div className="mt-4 pt-4 border-t border-danger/10 space-y-4">
                                        <div className="space-y-1.5 mt-2">
                                          <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex justify-between">
                                            <span>
                                              Descrição do Problema (Outros)
                                            </span>
                                          </label>
                                          <textarea
                                            className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                            placeholder="Descreva o defeito encontrado..."
                                            rows={2}
                                            value={customDefect.description}
                                            onChange={(e) => {
                                              const newDefects = [
                                                ...(formData.defects[item.id] ||
                                                  []),
                                              ];
                                              newDefects[customDefectIdx] = {
                                                ...newDefects[customDefectIdx],
                                                description: e.target.value,
                                              };
                                              setFormData((prev) => ({
                                                ...prev,
                                                defects: {
                                                  ...prev.defects,
                                                  [item.id]: newDefects,
                                                },
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
                                                  const file =
                                                    e.target.files?.[0];
                                                  if (file) {
                                                    handleDefectPhotoUpload(
                                                      item.id,
                                                      customDefectIdx,
                                                      file,
                                                    );
                                                  }
                                                }}
                                              />
                                              {formData.photoPreviews?.[
                                                `defect_${item.id}_${customDefectIdx}`
                                              ] ? (
                                                <img
                                                  src={
                                                    formData.photoPreviews[
                                                      `defect_${item.id}_${customDefectIdx}`
                                                    ]
                                                  }
                                                  className="w-full h-full object-cover"
                                                  alt="Defeito"
                                                />
                                              ) : (
                                                <Camera
                                                  size={20}
                                                  className="text-danger/40"
                                                />
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
                        </motion.div>
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
                            {formData.itemValues[item.id] !== "normal" &&
                              existingIssues.some(
                                (issue) =>
                                  issue.item_title === item.title &&
                                  issue.trailer_id !== null,
                              ) && (
                                <div className="mt-3 pt-3 border-t border-app-border">
                                  <p className="text-[10px] font-black text-warning uppercase tracking-widest flex items-center gap-1 mb-2">
                                    <AlertCircle size={12} /> Defeito Pendente
                                  </p>
                                  {existingIssues
                                    .filter(
                                      (issue) =>
                                        issue.item_title === item.title &&
                                        issue.trailer_id !== null,
                                    )
                                    .map((issue) => (
                                      <div
                                        key={issue.id}
                                        className="text-xs text-text-muted italic bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex items-start gap-2"
                                      >
                                        <div className="flex-1">
                                          "
                                          {issue.description || "Sem descrição"}
                                          "
                                          <div className="mt-1 text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                                            Reportado {issue.report_count || 1}{" "}
                                            {issue.report_count === 1
                                              ? "vez"
                                              : "vezes"}
                                          </div>
                                        </div>
                                        {issue.photo_url && (
                                          <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-orange-200">
                                            <img
                                              src={
                                                supabase.storage
                                                  .from("checklist-photos")
                                                  .getPublicUrl(issue.photo_url)
                                                  .data.publicUrl
                                              }
                                              className="w-full h-full object-cover"
                                              alt="Foto Anterior"
                                            />
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
                                    <p className="text-[10px] font-bold text-danger uppercase tracking-widest pb-1 border-b border-danger/10">
                                      Pendências Mapeadas:
                                    </p>
                                    {item.options.map((opt, i) => {
                                      const defectIdx = (
                                        formData.defects[item.id] || []
                                      ).findIndex((d) => d.description === opt);
                                      const isSelected = defectIdx !== -1;
                                      const defect = isSelected
                                        ? formData.defects[item.id][defectIdx]
                                        : null;
                                      return (
                                        <div
                                          key={i}
                                          className={`p-3 rounded-lg border ${isSelected ? "border-danger bg-white" : "border-app-border bg-white"} transition-colors`}
                                        >
                                          <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 text-danger rounded border-danger/30"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  const newDefects = [
                                                    ...(formData.defects[
                                                      item.id
                                                    ] || []),
                                                    {
                                                      description: opt,
                                                      photo: null,
                                                    },
                                                  ];
                                                  setFormData((p) => ({
                                                    ...p,
                                                    defects: {
                                                      ...p.defects,
                                                      [item.id]: newDefects,
                                                    },
                                                  }));
                                                } else {
                                                  const newDefects = [
                                                    ...(formData.defects[
                                                      item.id
                                                    ] || []),
                                                  ];
                                                  newDefects.splice(
                                                    defectIdx,
                                                    1,
                                                  );
                                                  setFormData((p) => ({
                                                    ...p,
                                                    defects: {
                                                      ...p.defects,
                                                      [item.id]: newDefects,
                                                    },
                                                  }));
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
                                                    const file =
                                                      e.target.files?.[0];
                                                    if (file) {
                                                      handleDefectPhotoUpload(
                                                        item.id,
                                                        defectIdx,
                                                        file,
                                                      );
                                                    }
                                                  }}
                                                />
                                                {formData.photoPreviews?.[
                                                  `defect_${item.id}_${defectIdx}`
                                                ] ? (
                                                  <img
                                                    src={
                                                      formData.photoPreviews[
                                                        `defect_${item.id}_${defectIdx}`
                                                      ]
                                                    }
                                                    className="w-full h-full object-cover"
                                                    alt="Evidência"
                                                  />
                                                ) : defect.existing_photo_url ? (
                                                  <img
                                                    src={
                                                      supabase.storage
                                                        .from(
                                                          "checklist-photos",
                                                        )
                                                        .getPublicUrl(
                                                          defect.existing_photo_url,
                                                        ).data.publicUrl
                                                    }
                                                    className="w-full h-full object-cover"
                                                    alt="Evidência Anterior"
                                                  />
                                                ) : (
                                                  <Camera
                                                    size={16}
                                                    className="text-danger/50"
                                                  />
                                                )}
                                              </div>
                                              <span className="text-[9px] font-bold text-danger uppercase tracking-widest">
                                                Foto Evidência
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {(() => {
                                  const customDefectIdx = (
                                    formData.defects[item.id] || []
                                  ).findIndex(
                                    (d) =>
                                      !d.existing_issue_id &&
                                      (!item.options ||
                                        !item.options.includes(d.description)),
                                  );
                                  const hasCustomDefect =
                                    customDefectIdx !== -1;
                                  const customDefect = hasCustomDefect
                                    ? formData.defects[item.id][customDefectIdx]
                                    : null;

                                  return (
                                    <div
                                      className={`p-3 rounded-lg border ${hasCustomDefect ? "border-danger bg-white" : "border-app-border bg-white"} transition-colors mt-4`}
                                    >
                                      <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-text-main">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 text-danger rounded border-danger/30"
                                          checked={hasCustomDefect}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newDefects = [
                                                ...(formData.defects[item.id] ||
                                                  []),
                                                {
                                                  description: "",
                                                  photo: null,
                                                },
                                              ];
                                              setFormData((p) => ({
                                                ...p,
                                                defects: {
                                                  ...p.defects,
                                                  [item.id]: newDefects,
                                                },
                                              }));
                                            } else {
                                              const newDefects = [
                                                ...(formData.defects[item.id] ||
                                                  []),
                                              ];
                                              newDefects.splice(
                                                customDefectIdx,
                                                1,
                                              );
                                              setFormData((p) => ({
                                                ...p,
                                                defects: {
                                                  ...p.defects,
                                                  [item.id]: newDefects,
                                                },
                                              }));
                                            }
                                          }}
                                        />
                                        Outros
                                      </label>

                                      {hasCustomDefect && customDefect && (
                                        <div className="mt-4 pt-4 border-t border-danger/10 space-y-4">
                                          <div className="space-y-1.5 mt-2">
                                            <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex justify-between">
                                              <span>
                                                Descrição do Problema (Outros -
                                                Reboque)
                                              </span>
                                            </label>
                                            <textarea
                                              className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                              placeholder="Descreva o defeito no reboque..."
                                              rows={2}
                                              value={customDefect.description}
                                              onChange={(e) => {
                                                const newDefects = [
                                                  ...(formData.defects[
                                                    item.id
                                                  ] || []),
                                                ];
                                                newDefects[customDefectIdx] = {
                                                  ...newDefects[
                                                    customDefectIdx
                                                  ],
                                                  description: e.target.value,
                                                };
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  defects: {
                                                    ...prev.defects,
                                                    [item.id]: newDefects,
                                                  },
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
                                                    const file =
                                                      e.target.files?.[0];
                                                    if (file) {
                                                      handleDefectPhotoUpload(
                                                        item.id,
                                                        customDefectIdx,
                                                        file,
                                                      );
                                                    }
                                                  }}
                                                />
                                                {formData.photoPreviews?.[
                                                  `defect_${item.id}_${customDefectIdx}`
                                                ] ? (
                                                  <img
                                                    src={
                                                      formData.photoPreviews[
                                                        `defect_${item.id}_${customDefectIdx}`
                                                      ]
                                                    }
                                                    className="w-full h-full object-cover"
                                                    alt="Defeito"
                                                  />
                                                ) : (
                                                  <Camera
                                                    size={20}
                                                    className="text-danger/40"
                                                  />
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
        </div>
      </main>

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
