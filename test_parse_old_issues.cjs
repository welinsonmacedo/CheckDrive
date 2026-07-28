const submissions = [
  {
    id: 'sub1',
    responses: JSON.stringify({
      defects: {
        'Pneu': [{ description: 'Furado', photo: 'url' }]
      }
    })
  }
];

const issuesData = [];
const oldIssues = [];

submissions.forEach(sub => {
  let responses;
  try {
    responses = typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses;
  } catch(e) {
    return;
  }
  
  if (responses && responses.defects) {
     Object.entries(responses.defects).forEach(([itemId, defectsList]) => {
        if (Array.isArray(defectsList)) {
           defectsList.forEach(d => {
              if (d.description || d.photo) {
                 oldIssues.push({
                   id: `old-${sub.id}-${itemId}-${Math.random()}`,
                   submission_id: sub.id,
                   item_title: itemId,
                   description: d.description,
                 });
              }
           });
        }
     });
  }
});

console.log(oldIssues);
