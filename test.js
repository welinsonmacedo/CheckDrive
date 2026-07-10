const x = [{plate: 'ABC'}, {plate: 'DEF'}, {plate: 'ABC'}];
const grouped = x.reduce((acc, curr) => {
  acc[curr.plate] = (acc[curr.plate] || []).concat(curr);
  return acc;
}, {});
console.log(grouped);
