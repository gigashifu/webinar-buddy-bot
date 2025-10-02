import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'resend'

// Supabase client, will use env vars for secrets
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Resend client
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  try {
    // 1. Fetch upcoming events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'upcoming');

    if (eventsError) throw eventsError;

    for (const event of events) {
      // 2. Fetch attendees for each event
      const { data: attendees, error: attendeesError } = await supabaseAdmin
        .from('attendees')
        .select('*')
        .eq('event_id', event.id);

      if (attendeesError) throw attendeesError;

      for (const attendee of attendees) {
        // 3. Logic for sending reminders (e.g., 24 hours before)
        const eventDate = new Date(event.date);
        const now = new Date();
        const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24) {
          // 4. Send email using Resend
          await resend.emails.send({
            from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@your-domain.com',
            to: attendee.email,
            subject: `Reminder: ${event.title} is tomorrow!`,
            html: `
              <h1>Hi ${attendee.name || 'there'},</h1>
              <p>This is a reminder that the event "<strong>${event.title}</strong>" is starting in less than 24 hours.</p>
              <p>We're excited to see you there!</p>
            `
          });
        }
      }
    }

    return new Response(JSON.stringify({ message: "Engagement agent ran successfully." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})