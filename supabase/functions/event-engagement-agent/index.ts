import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { Resend } from 'npm:resend@3.5.0';

// ============= CONFIGURATION =============
const CONFIG = {
  MAX_EMAILS_PER_HOUR: 80,
  MAX_EMAILS_PER_DAY: 400,
  MAX_AI_CALLS_PER_HOUR: 20,
  DAILY_TOKEN_LIMIT: 400000,
  BATCH_SIZE: 15,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX_DELAY: 10000,
  REMINDER_INTERVALS: [24, 1],
  CACHE_TTL: 7200000,
  USE_TEMPLATES_ONLY: true,
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

// ============= RATE LIMITING & CACHING =============
const rateLimits = {
  emailsThisHour: 0,
  emailsToday: 0,
  aiCallsThisHour: 0,
  tokensToday: 0,
  hourReset: Date.now() + 3600000,
  dayReset: Date.now() + 86400000,
}

const aiCache = new Map<string, { content: string; timestamp: number }>()

function checkAndUpdateRateLimits(): { allowed: boolean; reason?: string } {
  const now = Date.now()
  
  // Reset counters if needed
  if (now > rateLimits.hourReset) {
    rateLimits.emailsThisHour = 0
    rateLimits.aiCallsThisHour = 0
    rateLimits.hourReset = now + 3600000
  }
  
  if (now > rateLimits.dayReset) {
    rateLimits.emailsToday = 0
    rateLimits.dayReset = now + 86400000
  }
  
  // Check limits
  if (rateLimits.emailsThisHour >= CONFIG.MAX_EMAILS_PER_HOUR) {
    return { allowed: false, reason: 'Hourly email limit reached' }
  }
  
  if (rateLimits.emailsToday >= CONFIG.MAX_EMAILS_PER_DAY) {
    return { allowed: false, reason: 'Daily email limit reached' }
  }
  
  return { allowed: true }
}

function getCachedAIResponse(cacheKey: string): string | null {
  const cached = aiCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    console.log('Using cached AI response')
    return cached.content
  }
  return null
}

function cacheAIResponse(cacheKey: string, content: string) {
  aiCache.set(cacheKey, { content, timestamp: Date.now() })
  // Clean old cache entries
  if (aiCache.size > 100) {
    const oldestKey = Array.from(aiCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
    aiCache.delete(oldestKey)
  }
}

// ============= ERROR HANDLING & RETRY =============
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxAttempts = CONFIG.RETRY_MAX_ATTEMPTS
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const delay = Math.min(
        CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt - 1),
        CONFIG.RETRY_MAX_DELAY
      )
      
      console.error(`${context} - Attempt ${attempt}/${maxAttempts} failed:`, error)
      
      if (attempt < maxAttempts) {
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        console.error(`${context} - All retry attempts exhausted`)
        return null
      }
    }
  }
  return null
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim()
}

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

// ============= AI CONTENT GENERATION =============
async function generatePersonalizedContent(
  prompt: string,
  cacheKey?: string
): Promise<string> {
  // Check cache first
  if (cacheKey) {
    const cached = getCachedAIResponse(cacheKey)
    if (cached) return cached
  }
  
  // Check AI rate limit
  if (rateLimits.aiCallsThisHour >= CONFIG.MAX_AI_CALLS_PER_HOUR) {
    console.warn('AI rate limit reached, using fallback content')
    return ''
  }
  
  const result = await withRetry(async () => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5-8b',
        messages: [
          {
            role: 'system',
            content: 'You are an expert event engagement specialist. Create personalized, engaging, and professional email content. Keep responses concise (150-200 words).'
          },
          {
            role: 'user',
            content: sanitizeInput(prompt)
          }
        ],
        max_tokens: 200,
      })
    })

    if (response.status === 429) {
      throw new Error('Rate limit exceeded')
    }
    
    if (response.status === 402) {
      throw new Error('Payment required')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Track AI call
    rateLimits.aiCallsThisHour++
    
    // Cache result
    if (cacheKey && content) {
      cacheAIResponse(cacheKey, content)
    }
    
    return content
  }, 'AI content generation')
  
  return result || ''
}

// ============= ENGAGEMENT ANALYSIS =============
async function analyzeEngagementPattern(attendee: Attendee): Promise<any> {
  try {
    const [engagementResult, interestsResult] = await Promise.all([
      supabaseAdmin
        .from('attendee_engagement')
        .select('*')
        .eq('attendee_id', attendee.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('attendee_interests')
        .select('*')
        .eq('attendee_id', attendee.id)
        .single()
    ])

    return {
      engagementHistory: engagementResult.data || [],
      interests: interestsResult.data?.interests || {},
      preferences: interestsResult.data?.preferences || {}
    }
  } catch (error) {
    console.error('Error analyzing engagement:', error)
    return {
      engagementHistory: [],
      interests: {},
      preferences: {}
    }
  }
}

// ============= EMAIL SENDING FUNCTIONS =============
async function sendPreEventReminder(
  event: Event, 
  attendee: Attendee, 
  hoursBeforeEvent: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate email
    if (!validateEmail(attendee.email)) {
      return { success: false, error: 'Invalid email address' }
    }
    
    // Check rate limits
    const rateCheck = checkAndUpdateRateLimits()
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason }
    }
    
    const pattern = await analyzeEngagementPattern(attendee)
    
    const cacheKey = `reminder_${event.id}_${hoursBeforeEvent}`
    const prompt = `Generate a personalized pre-event reminder email for:
Event: ${sanitizeInput(event.title)}
Description: ${sanitizeInput(event.description || 'An upcoming event')}
Hours until event: ${hoursBeforeEvent}
Attendee: ${sanitizeInput(attendee.name || 'there')}

Create an engaging reminder that:
1. Confirms their registration
2. Builds excitement about the event
3. Mentions 2-3 key topics
4. Includes a friendly call-to-action`

    const content = await generatePersonalizedContent(prompt, cacheKey)
    
    if (!content) {
      return { success: false, error: 'Failed to generate content' }
    }

    const emailResult = await withRetry(async () => {
      return await resend.emails.send({
        from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'events@yourdomain.com',
        to: attendee.email,
        subject: `Reminder: ${event.title} in ${hoursBeforeEvent} hours`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hi ${sanitizeInput(attendee.name || 'there')}! 👋</h2>
            ${content.replace(/\n/g, '<br>')}
            <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
              <p style="margin: 0; font-weight: bold;">Event Details:</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
            </div>
          </div>
        `
      })
    }, 'Email sending')

    if (!emailResult) {
      return { success: false, error: 'Failed to send email after retries' }
    }

    // Update rate limits
    rateLimits.emailsThisHour++
    rateLimits.emailsToday++

    await supabaseAdmin.from('email_logs').insert({
      attendee_id: attendee.id,
      event_id: event.id,
      email_type: 'pre_event_reminder',
      subject: `Reminder: ${event.title} in ${hoursBeforeEvent} hours`,
      status: 'sent'
    })

    console.log(`✅ Sent pre-event reminder to ${attendee.email}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending pre-event reminder:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function sendPostEventFollowup(
  event: Event, 
  attendee: Attendee
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate email
    if (!validateEmail(attendee.email)) {
      return { success: false, error: 'Invalid email address' }
    }
    
    // Check rate limits
    const rateCheck = checkAndUpdateRateLimits()
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason }
    }
    
    const pattern = await analyzeEngagementPattern(attendee)
    
    const cacheKey = `followup_${event.id}_${attendee.attended ? 'attended' : 'missed'}`
    const prompt = `Generate a personalized post-event follow-up email for:
Event: ${sanitizeInput(event.title)}
Attendee: ${sanitizeInput(attendee.name || 'there')}
Attended: ${attendee.attended ? 'Yes' : 'No'}

Create a follow-up that:
1. Thanks them for their ${attendee.attended ? 'participation' : 'registration'}
2. ${attendee.attended ? 'Asks for feedback and offers resources' : 'Offers to share the recording'}
3. Suggests next steps or related events`

    const content = await generatePersonalizedContent(prompt, cacheKey)
    
    if (!content) {
      return { success: false, error: 'Failed to generate content' }
    }

    const emailResult = await withRetry(async () => {
      return await resend.emails.send({
        from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'events@yourdomain.com',
        to: attendee.email,
        subject: `Thank you for ${attendee.attended ? 'attending' : 'registering for'} ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hi ${sanitizeInput(attendee.name || 'there')}! 🎉</h2>
            ${content.replace(/\n/g, '<br>')}
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #666; font-size: 14px;">We'd love to hear from you!</p>
            </div>
          </div>
        `
      })
    }, 'Email sending')

    if (!emailResult) {
      return { success: false, error: 'Failed to send email after retries' }
    }

    // Update rate limits
    rateLimits.emailsThisHour++
    rateLimits.emailsToday++

    await supabaseAdmin.from('email_logs').insert({
      attendee_id: attendee.id,
      event_id: event.id,
      email_type: 'post_event_followup',
      subject: `Thank you for ${attendee.attended ? 'attending' : 'registering for'} ${event.title}`,
      status: 'sent'
    })

    console.log(`✅ Sent post-event follow-up to ${attendee.email}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending post-event follow-up:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// ============= TRACKING & METRICS =============
async function trackEngagement(
  attendeeId: string, 
  eventId: string, 
  type: string, 
  data: any
): Promise<void> {
  try {
    await supabaseAdmin.from('attendee_engagement').insert({
      attendee_id: attendeeId,
      event_id: eventId,
      engagement_type: type,
      engagement_data: { ...data, timestamp: new Date().toISOString() }
    })
  } catch (error) {
    console.error('Error tracking engagement:', error)
  }
}

async function logMetrics(metrics: {
  upcomingEvents: number
  completedEvents: number
  remindersSent: number
  remindersFailed: number
  followupsSent: number
  followupsFailed: number
  emailsThisHour: number
  emailsToday: number
  aiCallsThisHour: number
  duration: number
}) {
  console.log('📊 EXECUTION METRICS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`⏱️  Duration: ${metrics.duration}ms`)
  console.log(`📅 Upcoming Events: ${metrics.upcomingEvents}`)
  console.log(`✅ Completed Events: ${metrics.completedEvents}`)
  console.log(`📧 Reminders Sent: ${metrics.remindersSent}`)
  console.log(`❌ Reminders Failed: ${metrics.remindersFailed}`)
  console.log(`📬 Follow-ups Sent: ${metrics.followupsSent}`)
  console.log(`❌ Follow-ups Failed: ${metrics.followupsFailed}`)
  console.log(`📊 Emails This Hour: ${metrics.emailsThisHour}/${CONFIG.MAX_EMAILS_PER_HOUR}`)
  console.log(`📊 Emails Today: ${metrics.emailsToday}/${CONFIG.MAX_EMAILS_PER_DAY}`)
  console.log(`🤖 AI Calls This Hour: ${metrics.aiCallsThisHour}/${CONFIG.MAX_AI_CALLS_PER_HOUR}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

// ============= BATCH PROCESSING =============
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize = CONFIG.BATCH_SIZE
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map(processor))
    
    // Small delay between batches to avoid overwhelming services
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

// ============= MAIN AGENT LOGIC =============
Deno.serve(async (req) => {
  const startTime = Date.now()
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  }

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Event Engagement Agent started')
    console.log(`📊 Current Rate Limits: ${rateLimits.emailsThisHour}/${CONFIG.MAX_EMAILS_PER_HOUR} emails/hour, ${rateLimits.emailsToday}/${CONFIG.MAX_EMAILS_PER_DAY} emails/day`)

    const metrics = {
      upcomingEvents: 0,
      completedEvents: 0,
      remindersSent: 0,
      remindersFailed: 0,
      followupsSent: 0,
      followupsFailed: 0,
      emailsThisHour: rateLimits.emailsThisHour,
      emailsToday: rateLimits.emailsToday,
      aiCallsThisHour: rateLimits.aiCallsThisHour,
      duration: 0
    }

    // Parse request body for manual triggers or webhooks
    let requestBody: any = {}
    try {
      const text = await req.text()
      if (text) {
        requestBody = JSON.parse(text)
      }
    } catch {
      // No body or invalid JSON, continue with scheduled execution
    }

    const manualEventId = requestBody.eventId
    const reminderInterval = requestBody.reminderInterval || CONFIG.REMINDER_INTERVALS[0]

    // ============= PROCESS UPCOMING EVENTS =============
    const maxHours = Math.max(...CONFIG.REMINDER_INTERVALS)
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + maxHours)
    
    let upcomingQuery = supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'upcoming')
      .lte('date', futureDate.toISOString())

    if (manualEventId) {
      upcomingQuery = upcomingQuery.eq('id', manualEventId)
    }

    const { data: upcomingEvents, error: eventsError } = await upcomingQuery

    if (eventsError) throw eventsError

    metrics.upcomingEvents = upcomingEvents?.length || 0
    console.log(`📅 Found ${metrics.upcomingEvents} upcoming events`)

    if (upcomingEvents && upcomingEvents.length > 0) {
      await processBatch(upcomingEvents, async (event) => {
        try {
          const eventDate = new Date(event.date)
          const now = new Date()
          const hoursUntilEvent = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60))

          // Check if we should send reminder at this interval
          const shouldSendReminder = CONFIG.REMINDER_INTERVALS.some(interval => {
            return Math.abs(hoursUntilEvent - interval) < 1 // Within 1 hour of interval
          })

          if (hoursUntilEvent > 0 && shouldSendReminder) {
            const { data: attendees } = await supabaseAdmin
              .from('attendees')
              .select('*')
              .eq('event_id', event.id)

            if (attendees && attendees.length > 0) {
              await processBatch(attendees, async (attendee) => {
                // Check if reminder already sent for this interval
                const { data: existingLog } = await supabaseAdmin
                  .from('email_logs')
                  .select('id')
                  .eq('attendee_id', attendee.id)
                  .eq('event_id', event.id)
                  .eq('email_type', 'pre_event_reminder')
                  .single()

                if (!existingLog) {
                  const result = await sendPreEventReminder(event, attendee, hoursUntilEvent)
                  
                  if (result.success) {
                    metrics.remindersSent++
                    await trackEngagement(attendee.id, event.id, 'reminder_sent', {
                      hours_before_event: hoursUntilEvent,
                      interval: reminderInterval
                    })
                  } else {
                    metrics.remindersFailed++
                    console.error(`Failed to send reminder: ${result.error}`)
                  }
                }
              })
            }
          }
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error)
        }
      })
    }

    // ============= PROCESS COMPLETED EVENTS =============
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    let completedQuery = supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'completed')
      .gte('date', yesterday.toISOString())

    if (manualEventId) {
      completedQuery = completedQuery.eq('id', manualEventId)
    }

    const { data: completedEvents, error: completedError } = await completedQuery

    if (completedError) throw completedError

    metrics.completedEvents = completedEvents?.length || 0
    console.log(`✅ Found ${metrics.completedEvents} completed events for follow-up`)

    if (completedEvents && completedEvents.length > 0) {
      await processBatch(completedEvents, async (event) => {
        try {
          const { data: attendees } = await supabaseAdmin
            .from('attendees')
            .select('*')
            .eq('event_id', event.id)

          if (attendees && attendees.length > 0) {
            await processBatch(attendees, async (attendee) => {
              // Check if follow-up already sent
              const { data: existingLog } = await supabaseAdmin
                .from('email_logs')
                .select('id')
                .eq('attendee_id', attendee.id)
                .eq('event_id', event.id)
                .eq('email_type', 'post_event_followup')
                .single()

              if (!existingLog) {
                const result = await sendPostEventFollowup(event, attendee)
                
                if (result.success) {
                  metrics.followupsSent++
                  await trackEngagement(attendee.id, event.id, 'followup_sent', {
                    attended: attendee.attended
                  })
                } else {
                  metrics.followupsFailed++
                  console.error(`Failed to send follow-up: ${result.error}`)
                }
              }
            })
          }
        } catch (error) {
          console.error(`Error processing completed event ${event.id}:`, error)
        }
      })
    }

    // Update final metrics
    metrics.emailsThisHour = rateLimits.emailsThisHour
    metrics.emailsToday = rateLimits.emailsToday
    metrics.aiCallsThisHour = rateLimits.aiCallsThisHour
    metrics.duration = Date.now() - startTime

    // Log metrics
    await logMetrics(metrics)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Engagement agent completed successfully',
        metrics,
        rateLimits: {
          emailsThisHour: `${rateLimits.emailsThisHour}/${CONFIG.MAX_EMAILS_PER_HOUR}`,
          emailsToday: `${rateLimits.emailsToday}/${CONFIG.MAX_EMAILS_PER_DAY}`,
          aiCallsThisHour: `${rateLimits.aiCallsThisHour}/${CONFIG.MAX_AI_CALLS_PER_HOUR}`
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('💥 FATAL ERROR in engagement agent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
