const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const s1 = 'const fetchResolvedIssuesReport = async () => {';
const s2 = 'const fetchFleetAgeReport = async () => {';
const s3 = 'const fetchMileageReport = async () => {';
const s4 = 'const fetchPendingByPlateReport = async () => {';
const s5 = 'const fetchDefectsReport = async () => {';

// Let's find all indexes of s1
let idxs = [];
let i = -1;
while ((i = code.indexOf(s1, i + 1)) !== -1) {
  idxs.push(i);
}

console.log("Indexes of fetchResolvedIssuesReport:", idxs);

if (idxs.length > 1) {
  // The first occurrence should be kept. The duplicates should be removed.
  // Wait, in my duplicated file, the first s4 is at line 1413? No, let's check s4 indexes.
  let s4Idxs = [];
  let j = -1;
  while ((j = code.indexOf(s4, j + 1)) !== -1) {
    s4Idxs.push(j);
  }
  console.log("Indexes of fetchPendingByPlateReport:", s4Idxs);
  
  // Wait, I should just extract the unique functions and re-assemble them, but the JSX part might also be duplicated!
  // Let's check if there are duplicates of "case "pending_by_plate":"
  let cases = [];
  let k = -1;
  while ((k = code.indexOf('case "pending_by_plate":', k + 1)) !== -1) {
    cases.push(k);
  }
  console.log("Indexes of case 'pending_by_plate':", cases);
}
