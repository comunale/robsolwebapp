import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/notifications/mark-all-read
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ message: 'All notifications marked as read' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
