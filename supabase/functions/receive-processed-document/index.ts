import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to process document from n8n');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      month, 
      year, 
      document_name, 
      drive_url, 
      category, 
      observations 
    } = await req.json();

    console.log('Processing document:', { user_id, month, year, document_name, drive_url });

    // Validar dados obrigatórios
    if (!user_id || !document_name || !drive_url || !category) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: user_id, document_name, drive_url, category' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', userData);

    // Buscar ou criar categoria
    let categoryId: string;
    const { data: existingCategory } = await supabase
      .from('document_categories')
      .select('id')
      .eq('name', category)
      .single();

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('Using existing category:', categoryId);
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('document_categories')
        .insert({ name: category, color: '#10b981' })
        .select('id')
        .single();

      if (categoryError || !newCategory) {
        console.error('Error creating category:', categoryError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar categoria' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      categoryId = newCategory.id;
      console.log('Created new category:', categoryId);
    }

    // Criar observações enriquecidas
    const enrichedObservations = `${observations || ''}\n\nDocumento processado automaticamente via n8n\nPeríodo: ${month || year || 'N/A'}\nOrigem: Google Drive`;

    // Inserir documento no banco
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id,
        name: document_name,
        file_url: drive_url,
        drive_url: drive_url,
        storage_key: null,
        category: categoryId,
        observations: enrichedObservations.trim(),
        uploaded_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (documentError) {
      console.error('Error inserting document:', documentError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar documento', details: documentError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document registered successfully:', document.id);

    // Buscar todos os admins
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (!adminsError && admins && admins.length > 0) {
      // Criar notificações para todos os admins
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        message: `Novo documento processado: ${document_name} (${userData.name})`,
        type: 'Documento Processado',
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      } else {
        console.log('Notifications created for admins');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_id: document.id,
        message: 'Documento processado registrado com sucesso' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
