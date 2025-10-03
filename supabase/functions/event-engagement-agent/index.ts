import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@3.5.0'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

interface Event {
  id: string
  title: string
  description: string | null
  date: string
  status: string
}

interface Attendee {
  id: string
  email: string
  name: string | null
  event_id: string
  registered_at: string
  attended: boolean | null
}

async function generatePersonalizedContent(
  prompt: string
): Promise<string> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert event engagement specialist. Create personalized, engaging, and professional email content for webinar attendees.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text())
      return ''
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('Error generating AI content:', error)
    return ''
  }
}

async function analyzeEngagementPattern(attendee: Attendee): Promise<any> {
  const { data: engagementData } = await supabaseAdmin
    .from('attendee_engagement')
    .select('*')
    .eq('attendee_id', attendee.id)

  const { data: interests } = await supabaseAdmin
    .from('attendee_interests')
    .select('*')
    .eq('attendee_id', attendee.id)
    .single()

  return {
    engagementHistory: engagementData || [],
    interests: interests?.interests || {},
    preferences: interests?.preferences || {}
  }
}

async function sendPreEventReminder(event: Event, attendee: Attendee) {
  const pattern = await analyzeEngagementPattern(attendee)
  
  const prompt = `Generate a personalized pre-event reminder email for:
Event: ${event.title}
Description: ${event.description || 'An upcoming webinar'}
Date: ${new Date(event.date).toLocaleDateString()}
Attendee: ${attendee.name || 'there'}
Previous engagement: ${JSON.stringify(pattern.engagementHistory.slice(0, 3))}

Create an engaging reminder that:
1. Confirms their registration
2. Builds excitement about the event
3. Mentions 2-3 key topics they'll learn
4. Includes a friendly call-to-action
Keep it concise (150-200 words) and professional.`

  const content = await generatePersonalizedContent(prompt)

  if (content) {
    await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'events@yourdomain.com',
      to: attendee.email,
      subject: `Tomorrow: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${attendee.name || 'there'}! 👋</h2>
          ${content.replace(/\n/g, '<br>')}
          <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; font-weight: bold;">Event Details:</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
          </div>
        </div>
      `
    })

    await supabaseAdmin.from('email_logs').insert({
      attendee_id: attendee.id,
      event_id: event.id,
      email_type: 'pre_event_reminder',
      subject: `Tomorrow: ${event.title}`,
      status: 'sent'
    })

    console.log(`Sent pre-event reminder to ${attendee.email}`)
  }
}

async function sendPostEventFollowup(event: Event, attendee: Attendee) {
  const pattern = await analyzeEngagementPattern(attendee)
  
  const prompt = `Generate a personalized post-event follow-up email for:
Event: ${event.title}
Attendee: ${attendee.name || 'there'}
Attended: ${attendee.attended ? 'Yes' : 'No'}

Create a follow-up that:
1. Thanks them for their ${attendee.attended ? 'participation' : 'registration'}
2. ${attendee.attended ? 'Asks for feedback and offers additional resources' : 'Offers to share the recording'}
3. Suggests next steps or related events
4. Keeps the door open for future engagement
Keep it warm and professional (150-200 words).`

  const content = await generatePersonalizedContent(prompt)

  if (content) {
    await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'events@yourdomain.com',
      to: attendee.email,
      subject: `Thank you for ${attendee.attended ? 'attending' : 'registering for'} ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${attendee.name || 'there'}! 🎉</h2>
          ${content.replace(/\n/g, '<br>')}
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 14px;">We'd love to hear from you!</p>
          </div>
        </div>
      `
    })

    await supabaseAdmin.from('email_logs').insert({
      attendee_id: attendee.id,
      event_id: event.id,
      email_type: 'post_event_followup',
      subject: `Thank you for ${attendee.attended ? 'attending' : 'registering for'} ${event.title}`,
      status: 'sent'
    })

    console.log(`Sent post-event follow-up to ${attendee.email}`)
  }
}

async function trackEngagement(attendeeId: string, eventId: string, type: string, data: any) {
  await supabaseAdmin.from('attendee_engagement').insert({
    attendee_id: attendeeId,
    event_id: eventId,
    engagement_type: type,
    engagement_data: data
  })
}

serve(async (req) => {
  try {
    console.log('Event Engagement Agent started')

    // Fetch upcoming events (within next 48 hours)
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 48)
    
    const { data: upcomingEvents, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'upcoming')
      .lte('date', twoDaysFromNow.toISOString())

    if (eventsError) throw eventsError

    console.log(`Found ${upcomingEvents?.length || 0} upcoming events`)

    // Process upcoming events for pre-event reminders
    for (const event of upcomingEvents || []) {
      const eventDate = new Date(event.date)
      const now = new Date()
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Send reminder 24 hours before
      if (hoursUntilEvent > 0 && hoursUntilEvent <= 24) {
        const { data: attendees, error: attendeesError } = await supabaseAdmin
          .from('attendees')
          .select('*')
          .eq('event_id', event.id)

        if (!attendeesError && attendees) {
          for (const attendee of attendees) {
            // Check if reminder already sent
            const { data: existingLog } = await supabaseAdmin
              .from('email_logs')
              .select('id')
              .eq('attendee_id', attendee.id)
              .eq('event_id', event.id)
              .eq('email_type', 'pre_event_reminder')
              .single()

            if (!existingLog) {
              await sendPreEventReminder(event, attendee)
              await trackEngagement(attendee.id, event.id, 'reminder_sent', {
                hours_before_event: hoursUntilEvent
              })
            }
          }
        }
      }
    }

    // Fetch completed events from last 24 hours for post-event follow-ups
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const { data: completedEvents, error: completedError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'completed')
      .gte('date', yesterday.toISOString())

    if (!completedError && completedEvents) {
      console.log(`Found ${completedEvents.length} completed events for follow-up`)

      for (const event of completedEvents) {
        const { data: attendees, error: attendeesError } = await supabaseAdmin
          .from('attendees')
          .select('*')
          .eq('event_id', event.id)

        if (!attendeesError && attendees) {
          for (const attendee of attendees) {
            // Check if follow-up already sent
            const { data: existingLog } = await supabaseAdmin
              .from('email_logs')
              .select('id')
              .eq('attendee_id', attendee.id)
              .eq('event_id', event.id)
              .eq('email_type', 'post_event_followup')
              .single()

            if (!existingLog) {
              await sendPostEventFollowup(event, attendee)
              await trackEngagement(attendee.id, event.id, 'followup_sent', {
                attended: attendee.attended
              })
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Engagement agent completed successfully',
        upcomingEvents: upcomingEvents?.length || 0,
        completedEvents: completedEvents?.length || 0
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in engagement agent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
