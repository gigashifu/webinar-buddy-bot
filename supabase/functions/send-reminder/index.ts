import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { Resend } from "npm:resend@3.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReminderRequest {
  attendeeId: string;
  eventId: string;
  reminderType?: 'pre-event' | 'post-event';
  customMessage?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    const { attendeeId, eventId, reminderType = 'pre-event', customMessage }: ReminderRequest = await req.json();

    // Fetch attendee details
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('*')
      .eq('id', attendeeId)
      .single();

    if (attendeeError || !attendee) {
      throw new Error('Attendee not found');
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Generate email content based on reminder type
    let subject: string;
    let htmlContent: string;

    if (reminderType === 'pre-event') {
      subject = `Reminder: ${event.title} is coming up!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📅 Event Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${attendee.name || 'there'},</p>
                <p>This is a friendly reminder that you're registered for:</p>
                <div class="details">
                  <h2>${event.title}</h2>
                  <p><strong>📅 When:</strong> ${formattedDate}</p>
                  <p><strong>📝 Description:</strong> ${event.description || 'Details coming soon'}</p>
                </div>
                ${customMessage ? `<p>${customMessage}</p>` : ''}
                <p>We're excited to see you there! Make sure to:</p>
                <ul>
                  <li>Mark your calendar</li>
                  <li>Prepare any questions you'd like to ask</li>
                  <li>Join a few minutes early to test your connection</li>
                </ul>
                <p>See you soon!</p>
              </div>
              <div class="footer">
                <p>You're receiving this because you registered for this event.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = `Thank you for attending ${event.title}!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Thank You!</h1>
              </div>
              <div class="content">
                <p>Hi ${attendee.name || 'there'},</p>
                <p>Thank you for attending <strong>${event.title}</strong>!</p>
                <p>We hope you found the event valuable and informative.</p>
                ${customMessage ? `<p>${customMessage}</p>` : ''}
                <p>Stay tuned for more exciting events coming your way!</p>
                <p>Best regards,<br>The Event Team</p>
              </div>
              <div class="footer">
                <p>You're receiving this because you attended this event.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: attendee.email,
      subject,
      html: htmlContent,
    });

    if (emailError) {
      throw emailError;
    }

    // Log the email
    await supabase.from('email_logs').insert({
      event_id: eventId,
      attendee_id: attendeeId,
      email_type: reminderType,
      subject,
      status: 'sent',
    });

    console.log(`✅ Reminder sent to ${attendee.email} for event ${event.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder sent successfully',
        emailId: emailData?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending reminder:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
