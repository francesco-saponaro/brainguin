import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // We grab custom data sent from the App (not a DB record)
  const { userEmail, userId, message } = await req.json()

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'BrainGuin Feedback <hello@brainguin.app>',
      to: 'francescosaponaro5@gmail.com', // Where YOU want to receive it
      reply_to: userEmail, // 👈 CRITICAL: So you can reply directly to the user
      subject: `New App Feedback from ${userEmail}`,
      html: `
        <h2>New Feedback from BrainGuin</h2>
        <p><strong>User:</strong> ${userEmail}</p>
        <p><strong>Message:</strong></p>
        <div style="padding: 20px; background: #f4f4f4; border-radius: 10px;">
          ${message}
        </div>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: 200 })
})