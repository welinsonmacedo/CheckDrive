const fs = require('fs');
const file = 'src/modules/company/components/InventoryTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `<td className="px-6 py-3 text-sm font-bold text-zinc-900">
                        {item.current_quantity}{' '}
                        {item.current_quantity <= item.min_quantity && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold ml-2">BAIXO</span>
                        )}
                      </td>`;

const replacement = `<td className="px-6 py-3 text-sm font-bold text-zinc-900">
                        {itemsFilter === "used" ? Math.abs(transactions.filter(tx => tx.item_id === item.id && tx.type === 'out').reduce((acc, tx) => acc + Number(tx.quantity), 0)) : item.current_quantity}{' '}
                        {itemsFilter !== "used" && item.current_quantity <= item.min_quantity && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold ml-2">BAIXO</span>
                        )}
                      </td>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched inventory_items rendering');
} else {
  console.log('target not found');
}
