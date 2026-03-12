import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.39.0";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  try {
    // 1. Security Check: Ensure this request is actually from RevenueCat
    const authHeader = req.headers.get('Authorization');
    const expectedAuth = `Bearer ${Deno.env.get('RC_WEBHOOK_SECRET')}`;

    if (authHeader !== expectedAuth) {
      console.error("Unauthorized webhook attempt");
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse the RevenueCat Event
    const body = await req.json();
    const event = body.event;

    // Because we added Purchases.logIn() to the app, this is now the Supabase User ID!
    const userId = event.app_user_id;

    if (!userId || userId.startsWith('$RCAnonymous')) {
      return new Response('Ignored anonymous user', { status: 200 });
    }

    // 3. Handle Purchases & Renewals
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL' || event.type === 'NON_RENEWING_PURCHASE') {
      console.log(`[RevenueCat] Unlocking Pro for user: ${userId}`);
      
      const { error } = await supabaseAdmin
        .from('users') 
        .update({ is_pro: true })
        .eq('id', userId);

      if (error) throw error;
    }

    // 4. Handle Cancellations & Expirations
    if (event.type === 'CANCELLATION' || event.type === 'EXPIRATION') {
      console.log(`[RevenueCat] Removing Pro for user: ${userId}`);
      
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_pro: false })
        .eq('id', userId);

      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error(`Error processing RevenueCat webhook: ${error.message}`);
    return new Response('Webhook handler failed', { status: 500 });
  }
});