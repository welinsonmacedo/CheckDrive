console.log("Variáveis de ambiente disponíveis:");
Object.keys(process.env).forEach(key => {
  if (key.includes("SUPABASE") || key.includes("VITE")) {
    console.log(key, "=>", process.env[key] ? "PREENCHIDO" : "VAZIO");
  }
});
