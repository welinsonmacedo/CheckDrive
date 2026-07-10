const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the section that says:
//                           )}
//                         </div>
//                         </div>
//                         {inf.attachment_url && (
//                           <button

const pattern = /\}\);\s*\}\)\s*\)\}\s*<\/div>\s*<\/div>\s*\{inf\.attachment_url && \(\s*<button/g;

// Wait, let's just find the string starting from ' Desc:{" "}' up to ' title="Ver Anexos"'
const startMarker = ' Desc:{" "}';
const endMarker = ' title="Ver Anexos"';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  let block = content.substring(startIndex, endIndex + endMarker.length);
  console.log("Found block:\n" + block);
  
  // Notice the extra `</div>`
  let fixedBlock = block.replace('</div>\n                        </div>\n                        {inf.attachment_url', '</div>\n\n                        {inf.attachment_url');
  content = content.substring(0, startIndex) + fixedBlock + content.substring(endIndex + endMarker.length);
  fs.writeFileSync(file, content);
  console.log("Replaced extra div.");
} else {
  console.log("Could not find markers.");
}
