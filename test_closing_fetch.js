export const fetchClosings = async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('score_closings')
        .select(`
          *,
          closed_by ( full_name ),
          score_closing_items ( id, driver_id, score, total_checklists, profiles (full_name) )
        `)
        .order('created_at', { ascending: false });
        
      console.log('fetch closes:', data, error);
    } catch (error) {
      console.error('Erro ao carregar fechamentos:', error);
    }
}
