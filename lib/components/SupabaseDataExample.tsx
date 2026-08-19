import { createClient } from "@/lib/supabase/server";

export async function SupabaseDataExample() {
  const supabase = await createClient();

  // Ejemplo: obtener todos los registros de una tabla
  // const { data: items, error } = await supabase
  //   .from('your_table')
  //   .select('*');

  // Ejemplo con filtro
  // const { data: filteredItems, error } = await supabase
  //   .from('your_table')
  //   .select('*')
  //   .eq('column_name', 'value');

  // Ejemplo con relaciones
  // const { data: itemsWithRelations, error } = await supabase
  //   .from('your_table')
  //   .select(`
  //     *,
  //     related_table (
  //       id,
  //       name
  //     )
  //   `);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Datos de Supabase</h2>
      <p className="text-gray-600">
        Descomenta las consultas de ejemplo arriba para comenzar a obtener datos
        de tu base de datos.
      </p>
      <div className="mt-4 p-3 bg-gray-100 rounded text-sm font-mono">
        <p>const {'{data, error}'} = await supabase</p>
        <p className="ml-2">.from('your_table')</p>
        <p className="ml-2">.select('*')</p>
      </div>
    </div>
  );
}
