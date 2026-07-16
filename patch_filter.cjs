const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/InventoryTab.tsx', 'utf8');

content = content.replace(
  'const [activeSubTab, setActiveSubTab] = useState<"items" | "suppliers" | "nfs">("items");',
  'const [activeSubTab, setActiveSubTab] = useState<"items" | "suppliers" | "nfs">("items");\n  const [itemsFilter, setItemsFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");'
);

const filterHeader = `
            <div className="flex justify-between items-center">
              <div className="flex gap-2 bg-white p-1 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setItemsFilter("all")}
                  className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${itemsFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}\`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setItemsFilter("in_stock")}
                  className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${itemsFilter === "in_stock" ? "bg-green-600 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}\`}
                >
                  Com Estoque
                </button>
                <button
                  onClick={() => setItemsFilter("out_of_stock")}
                  className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${itemsFilter === "out_of_stock" ? "bg-red-500 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}\`}
                >
                  Sem Estoque
                </button>
              </div>
              <button`;

content = content.replace(
  '<div className="flex justify-between items-center">\n              <h2 className="text-lg font-bold text-zinc-800">Catálogo de Produtos</h2>\n              <button',
  '<div className="flex justify-between items-center mb-2">\n              <h2 className="text-lg font-bold text-zinc-800">Catálogo de Produtos</h2>\n            </div>' + filterHeader
);

const filterLogic = `
                  {items.filter(item => {
                    if (itemsFilter === "in_stock") return item.current_quantity > 0;
                    if (itemsFilter === "out_of_stock") return item.current_quantity <= 0;
                    return true;
                  }).map(item => (`;

content = content.replace(
  '{items.map(item => (',
  filterLogic
);

// We should also check for an empty state message if none match
const emptyState = `
                  {items.filter(item => {
                    if (itemsFilter === "in_stock") return item.current_quantity > 0;
                    if (itemsFilter === "out_of_stock") return item.current_quantity <= 0;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhum produto encontrado.</td>
                    </tr>
                  )}
                </tbody>`;

content = content.replace(
  '</tbody>',
  emptyState
);

fs.writeFileSync('src/modules/company/components/InventoryTab.tsx', content);
