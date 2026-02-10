import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { record, old_record } = await req.json()

  // Only trigger if is_pro went from false/null to true
  const isNewUpgrade = record.is_pro === true && (old_record?.is_pro === false || old_record?.is_pro === null);

  if (!isNewUpgrade) {
    return new Response(JSON.stringify({ message: "Not an upgrade" }), { status: 200 })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'BrainGuin <hello@brainguin.app>',
      to: record.email,
      subject: 'Welcome to BrainGuin Pro! 🐧✨',
      html: `<h1>Welcome to the colony!</h1><p>Your Pro access is now active for ${record.email}.</p>`,
    }),
  })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})