import { createClient } from '@/lib/supabase/server'
import type { NotificationType, NotificationChannel } from '@/types/notification'

interface SendNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  channel?: NotificationChannel
}

export async function sendNotification(params: SendNotificationParams) {
  const supabase = await createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    data: params.data || {},
    channel: params.channel || 'in_app',
  })

  if (error) {
    console.error('Failed to send notification:', error)
  }

  // Email channel stub — ready for Resend/SendGrid integration
  if (params.channel === 'email' || params.channel === 'both') {
    const { emailProvider } = await import('./emailProvider')
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', params.userId)
      .single()

    if (profile?.email) {
      await emailProvider.send(profile.email, params.title, params.body || '')
    }
  }
}
