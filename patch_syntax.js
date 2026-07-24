import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `              </div>

                </div>


                <div className="pt-4 border-t border-slate-200/60 mt-4">
              {/* Grid split for Issues and Submissions */}`;
              
const replaceStr = `              </div>

              {/* Grid split for Issues and Submissions */}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Successfully fixed syntax.");
} else {
  console.log("Could not find target string.");
}
