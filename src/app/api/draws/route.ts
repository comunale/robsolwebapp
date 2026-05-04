import { createClient } from '@/lib/supabase/server'
import { emailProvider } from '@/lib/notifications/emailProvider'
import { buildRaffleResultEmail, buildWinnerEmail } from '@/lib/notifications/raffleEmailTemplates'
import { NextResponse } from 'next/server'

type DrawAction = 'draw' | 'publish_winners' | 'notify_winners' | 'notify_base'

interface WinnerRow {
  id: string
  user_id: string
  campaign_id: string
  number: number
  winner_notified_at: string | null
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
  campaigns?: {
    title: string | null
  } | null
}

async function assertAdmin() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { supabase, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { supabase, error: NextResponse.json({ error: 'Acesso negado - apenas admin' }, { status: 403 }) }
  }

  return { supabase, error: null }
}

// POST /api/draws - Execute a draw (admin only)
export async function POST(request: Request) {
  try {
    const { supabase, error: authError } = await assertAdmin()
    if (authError) return authError

    const body = await request.json()
    const { campaign_id, draw_count = 1, action = 'draw' } = body as {
      campaign_id?: string
      draw_count?: number
      action?: DrawAction
    }

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id é obrigatório' },
        { status: 400 }
      )
    }

    if (action === 'publish_winners') {
      const publishedAt = new Date().toISOString()
      const { data, error } = await supabase
        .from('lucky_numbers')
        .update({ is_public: true, published_at: publishedAt })
        .eq('campaign_id', campaign_id)
        .eq('is_winner', true)
        .eq('is_public', false)
        .select('id')

      if (error) throw error

      return NextResponse.json({
        message: `${data?.length ?? 0} ganhador(es) publicado(s)`,
        count: data?.length ?? 0,
      })
    }

    if (action === 'notify_winners') {
      const { data, error } = await supabase
        .from('lucky_numbers')
        .select('id, user_id, campaign_id, number, winner_notified_at, profiles!lucky_numbers_user_id_fkey(full_name, email), campaigns(title)')
        .eq('campaign_id', campaign_id)
        .eq('is_winner', true)
        .is('winner_notified_at', null)

      if (error) throw error

      const winners = (data ?? []) as unknown as WinnerRow[]
      const notifiedAt = new Date().toISOString()

      for (const winner of winners) {
        const winnerName = winner.profiles?.full_name || 'vendedor VIP'
        const campaignTitle = winner.campaigns?.title || 'Robsol VIP'
        const template = buildWinnerEmail({
          winnerName,
          campaignTitle,
          luckyNumber: winner.number,
        })

        await supabase.from('notifications').insert({
          user_id: winner.user_id,
          type: 'draw_winner',
          title: 'Você foi sorteado!',
          body: `Seu número da sorte #${winner.number} foi premiado no sorteio ${campaignTitle}.`,
          data: { campaign_id, lucky_number_id: winner.id, number: winner.number },
          channel: 'both',
        })

        if (winner.profiles?.email) {
          await emailProvider.send(winner.profiles.email, template.subject, template.html)
        }

        await supabase
          .from('lucky_numbers')
          .update({ winner_notified_at: notifiedAt })
          .eq('id', winner.id)
      }

      return NextResponse.json({
        message: `${winners.length} ganhador(es) notificado(s)`,
        count: winners.length,
      })
    }

    if (action === 'notify_base') {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', campaign_id)
        .single()

      if (campaignError) throw campaignError

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'user')
        .eq('status', 'active')

      if (usersError) throw usersError

      const activeUsers = users ?? []
      const campaignTitle = campaign?.title || 'Robsol VIP'
      const template = buildRaffleResultEmail({ campaignTitle })
      const bodyText = 'Sorteio realizado! Confira se você não foi um dos ganhadores.'

      if (activeUsers.length > 0) {
        const { error: insertError } = await supabase.from('notifications').insert(
          activeUsers.map((user) => ({
            user_id: user.id,
            type: 'general',
            title: 'Sorteio realizado!',
            body: bodyText,
            data: { campaign_id },
            channel: 'both',
          }))
        )

        if (insertError) throw insertError
      }

      for (const user of activeUsers) {
        if (user.email) {
          await emailProvider.send(user.email, template.subject, template.html)
        }
      }

      await supabase
        .from('campaigns')
        .update({ draw_base_notified_at: new Date().toISOString() })
        .eq('id', campaign_id)

      return NextResponse.json({
        message: `${activeUsers.length} usuário(s) ativo(s) notificado(s)`,
        count: activeUsers.length,
      })
    }

    // Get eligible (non-winner) lucky numbers for this campaign
    const { data: eligible, error: fetchError } = await supabase
      .from('lucky_numbers')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('is_winner', false)

    if (fetchError) throw fetchError

    if (!eligible || eligible.length === 0) {
      return NextResponse.json(
        { error: 'Não há números da sorte elegíveis para sorteio' },
        { status: 400 }
      )
    }

    const count = Math.min(draw_count, eligible.length)
    const winners: typeof eligible = []

    // Fisher-Yates shuffle and pick first N
    const shuffled = [...eligible]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (let i = 0; i < count; i++) {
      const winner = shuffled[i]
      winners.push(winner)

      // Mark as winner
      await supabase
        .from('lucky_numbers')
        .update({
          is_winner: true,
          is_public: false,
          drawn_at: new Date().toISOString(),
          published_at: null,
          winner_notified_at: null,
        })
        .eq('id', winner.id)
    }

    return NextResponse.json({
      message: `${count} ganhador(es) sorteado(s) com sucesso`,
      winners: winners.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        number: w.number,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao executar sorteio'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
