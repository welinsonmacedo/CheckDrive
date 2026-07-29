const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

const toggleStatusFn = `
  const handleToggleStatus = async (infraction: any) => {
    try {
      const newStatus = infraction.status === "paid" ? "pending" : "paid";
      const { error } = await supabase
        .from("traffic_infractions")
        .update({ status: newStatus })
        .eq("id", infraction.id);
        
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status.");
    }
  };
`;

code = code.replace(
  /const handleDelete = async \(id: string\) => \{/,
  toggleStatusFn + '\n  const handleDelete = async (id: string) => {'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
