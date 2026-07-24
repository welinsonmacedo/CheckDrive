import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `              {/* Alerts Block */}`;
const target2 = `              {/* Grid split for Issues and Submissions */}`;

if(content.includes(target1) && content.includes(target2)) {
    const idx1 = content.indexOf(target1);
    const idx2 = content.indexOf(target2);
    
    if (idx1 < idx2) {
        const alertsContent = content.substring(idx1, idx2);
        
        // Remove from current position
        content = content.substring(0, idx1) + content.substring(idx2);
        
        // Insert after gallery
        const galleryEnd = `                    {!vehicle.photo_front_url && !vehicle.photo_right_url && !vehicle.photo_left_url && !vehicle.photo_rear_url && (
                      <span className="text-[10px] text-slate-400 italic col-span-4">Nenhuma foto anexada</span>
                    )}
                  </div>
                </div>`;
                
        if (content.includes(galleryEnd)) {
            content = content.replace(galleryEnd, galleryEnd + "\n\n                <div className=\"pt-4 border-t border-slate-200/60 mt-4\">\n" + alertsContent + "                </div>\n");
            fs.writeFileSync(file, content);
            console.log("Successfully moved alerts.");
        } else {
            console.log("Gallery end not found");
        }
    } else {
        console.log("Alerts not found before grid split");
    }
} else {
    console.log("Targets not found");
}
