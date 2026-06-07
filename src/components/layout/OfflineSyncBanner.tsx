import React, { useEffect, useState } from 'react';
import { getQueuedSubmissions, removeSubmission } from '../../lib/offlineQueue';
import { supabase } from '../../lib/supabase';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { base64ToFile } from '../../lib/offlineSubmitHelper';

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkQueue();
    const intervalId = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [user]);

  const checkQueue = async () => {
    const q = await getQueuedSubmissions();
    setQueueCount(q.length);
  };

  const syncData = async () => {
    if (syncing || !navigator.onLine || !user) return;
    setSyncing(true);
    
    try {
      const q = await getQueuedSubmissions();
      for (const req of q) {
        await processOfflineSubmission(req.data, user);
        await removeSubmission(req.id);
      }
      await checkQueue();
    } catch (e) {
      console.error('Offline sync failed', e);
    } finally {
      setSyncing(false);
    }
  };

  const processOfflineSubmission = async (data: any, currentUser: any) => {
     const { formData, type, scheduleId, itemTitles, isInternal, isTrailerOnly } = data;
     
     // Upload outer photos
     const photoUrls: Record<string, string> = {};
     for (const [key, b64] of Object.entries(formData.photos) as any) {
        if (b64) {
           const file = base64ToFile(b64, `${key}.jpg`);
           const path = `${currentUser.id}/${Date.now()}_${key}.jpg`;
           const { error } = await supabase.storage.from("checklist-photos").upload(path, file);
           if (!error) photoUrls[key] = path;
        }
     }

     const receipt_photo_url = photoUrls.receipt || null;

     const status = type === "fuel" 
      ? "concluido" 
      : Object.values(formData.itemValues).includes("defect") 
        ? "com_defeitos" 
        : "concluido";

     const { data: submission, error: subError } = await supabase.from('checklist_submissions').insert({
          driver_id: currentUser.id,
          vehicle_id: isInternal && isTrailerOnly ? null : formData.vehicleId,
          trailer_id: formData.trailerId || null,
          route_id: formData.routeId || null,
          type: type || "start",
          odometer: parseInt(formData.km) || 0,
          latitude: formData.latitude,
          longitude: formData.longitude,
          photos: photoUrls,
          receipt_photo_url,
          status,
          details: {
            itemValues: formData.itemValues,
            itemTitles,
            manualTrailerPlate: formData.manualTrailerPlate,
          },
     }).select().single();

     if (subError || !submission) throw subError;

     const issuesToInsert = [];
     for (const [itemId, subDefectsRaw] of Object.entries(formData.defects) as any) {
         let issueVehicleId = null;
         let issueTrailerId = null;
         const isTrailerItem = formData.itemsList?.find((i:any) => i.id === itemId)?.is_trailer_item;
         const itemTitle = formData.itemsList?.find((i:any) => i.id === itemId)?.title || itemId;

         if (isInternal && isTrailerOnly) issueTrailerId = formData.trailerId || null;
         else if (isTrailerItem) issueTrailerId = formData.trailerId || null;
         else issueVehicleId = formData.vehicleId || null;

         const subDefects: any[] = subDefectsRaw.filter((d:any) => d.description?.trim() !== "" || d.photoB64 || d.existing_photo_url || d.existing_issue_id);

         for (let i = 0; i < subDefects.length; i++) {
           const d = subDefects[i];
           let dPhotoUrl = d.existing_photo_url || null;
           if (d.photoB64) {
             const file = base64ToFile(d.photoB64, `defect_${itemId}_${i}.jpg`);
             const path = `${currentUser.id}/defects/${Date.now()}_${itemId}_${i}.jpg`;
             const { error } = await supabase.storage.from("checklist-photos").upload(path, file);
             if (!error) dPhotoUrl = path;
           }

           issuesToInsert.push({
            submission_id: submission.id,
            vehicle_id: issueVehicleId,
            trailer_id: issueTrailerId,
            driver_id: currentUser.id,
            item_title: itemTitle,
            description: d.description,
            photo_url: dPhotoUrl,
            status: "pending",
            existing_issue_id: d.existing_issue_id,
           });
         }
     }

     if (issuesToInsert.length > 0) {
        for (const newIssue of issuesToInsert) {
           if (newIssue.existing_issue_id) {
               await supabase.from("checklist_issues").update({
                   description: newIssue.description,
                   photo_url: newIssue.photo_url || undefined,
                   submission_id: newIssue.submission_id
               }).eq("id", newIssue.existing_issue_id);
           } else {
               await supabase.from("checklist_issues").insert(newIssue);
           }
        }
     }

     if (scheduleId) {
        if (type === "start") await supabase.from("schedules").update({ start_checklist_id: submission.id }).eq("id", scheduleId);
        else if (type === "end") await supabase.from("schedules").update({ end_checklist_id: submission.id }).eq("id", scheduleId);
        else if (type === "fuel") await supabase.from("schedules").update({ fuel_checklist_id: submission.id }).eq("id", scheduleId);
     }
  };

  if (isOnline && queueCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-2 pointer-events-none">
      <div className="bg-zinc-900 text-white rounded-full px-4 py-2 text-xs font-bold shadow-xl flex items-center gap-2 pointer-events-auto">
        {!isOnline ? (
          <>
            <CloudOff size={14} className="text-orange-400" />
            <span className="opacity-90">Modo Offline</span>
            {queueCount > 0 && (
              <span className="bg-orange-500 rounded-full px-1.5 py-0.5 text-[9px] ml-1">{queueCount}</span>
            )}
          </>
        ) : queueCount > 0 ? (
          <>
            <RefreshCw size={14} className={`text-blue-400 ${syncing ? 'animate-spin' : ''}`} />
            <span className="opacity-90">Sincronizando {queueCount} envio(s) pendente(s)...</span>
            {!syncing && (
               <button onClick={syncData} className="ml-2 text-blue-300 hover:text-white underline">Fazer Sincronismo</button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
