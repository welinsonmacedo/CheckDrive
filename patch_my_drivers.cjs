const fs = require('fs');
const file = 'src/modules/driver/pages/MyDrivers.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change export default name
code = code.replace(/export default function DriversTab\(\) \{/, 'export default function MyDrivers() {');

// Modify imports if needed to remove unused (or just leave them)
// We'll remove Plus and Edit2
code = code.replace(/Plus, /, '');
code = code.replace(/Edit2, /, '');

// Replace the root return block start
const targetReturnStart = `  return (
    <div className="flex-1 gap-6 items-start">
      {/* LISTA */}
      <div className="xl:col-span-8 bento-card !p-0">
        <div className="p-5 border-b border-app-border flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Motoristas / Usuários ({filteredUsers.length})
          </span>`;

const replacementReturnStart = `  return (
    <div className="p-6 max-w-2xl mx-auto py-10">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Motoristas</h2>
      </div>
      <div className="flex-1 gap-6 items-start">
        {/* LISTA */}
        <div className="xl:col-span-8 bento-card !p-0">
          <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Motoristas ({filteredUsers.length})
            </span>`;
code = code.replace(targetReturnStart, replacementReturnStart);

// Remove the Novo button
const novoButtonTarget = `            <button
              onClick={openCreateForm}
              className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
            >
              <Plus size={14} /> Novo
            </button>`;
code = code.replace(novoButtonTarget, '');

// Remove the Editar and toggle status buttons
const editarBlockTarget = `                <div className="flex gap-3 pt-6 border-t border-app-border mt-6">
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      setDocCnhFile(null);
                      setUserForm({
                        id: currentUser.id,
                        fullName: currentUser.full_name,
                        email: currentUser.email,
                        cpf: currentUser.cpf || "",
                        cnhNumber: currentUser.cnh_number || "",
                        cnhCategory: currentUser.cnh_category || "",
                        cnhExpirationDate: currentUser.cnh_expiration_date ? new Date(currentUser.cnh_expiration_date).toISOString().split("T")[0] : "",
                        cnhFirstDate: currentUser.cnh_first_date ? new Date(currentUser.cnh_first_date).toISOString().split("T")[0] : "",
                        photoUrl: currentUser.photo_url || "",
                        docCnhUrl: currentUser.doc_cnh_url || "",
                        role: currentUser.role || "driver",
                        password: "",
                        driverType: currentUser.driver_type || "Interno/Pátio",
                        participatesInRanking: currentUser.participates_in_ranking !== false,
                        modalityIds: currentUser.driver_modalities?.map((m: any) => m.modality_id) || [],
                        scoreProfileId: currentUser.score_profile_id || "",
                        isAuthUser: currentUser.is_auth_user !== false
                      });
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => toggleStatus(currentUser.id, currentUser.active !== false)}
                    className={\`w-12 h-12 flex items-center justify-center rounded-xl transition-colors \${currentUser.active !== false ? "bg-red-50 text-danger hover:bg-red-100" : "bg-green-50 text-success hover:bg-green-100"}\`}
                    title={currentUser.active !== false ? "Desabilitar" : "Habilitar"}
                  >
                    {currentUser.active !== false ? <X size={18} /> : <CheckCircle2 size={18} />}
                  </button>
                </div>`;
code = code.replace(editarBlockTarget, '');

// Remove the form (from {showForm && ( ... )} until the end of the file, we can do it with regex or substring)
const showFormIndex = code.indexOf('{showForm && (');
if (showFormIndex !== -1) {
    const endDivIndex = code.lastIndexOf('</div>');
    // We need to carefully remove the block. The block is inside the main div or outside. 
    // In DriversTab, {showForm && ...} is probably inside a flex container or outside. Let's just use regex or find the exact block.
}

fs.writeFileSync(file, code);
