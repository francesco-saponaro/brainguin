import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.39.0";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

// We use the SERVICE_ROLE_KEY so this function has admin privileges
// to upgrade the user without them needing to be logged into this specific request
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") as string;

  let event;

  try {
    // 1. Verify this request actually came from Stripe
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    // 2. Handle a successful payment!
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // This is the user ID we passed into the checkout link earlier!
      const userId = session.client_reference_id; 

      if (userId) {
        console.log(`Unlocking Pro for user: ${userId}`);
        
        // 3. Update the user in your database
        // NOTE: Make sure this matches the table where you track pro status (e.g., 'users' or 'profiles')
        const { error } = await supabaseAdmin
          .from('users') 
          .update({ is_pro: true }) // Or however you track pro status in your DB
          .eq('id', userId);

        if (error) throw error;
      }
    }

    // 3. Handle a canceled subscription
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription canceled: ${subscription.id}`);
      // You can add logic here later to downgrade them when they cancel!
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`);
    return new Response('Webhook handler failed', { status: 500 });
  }
});