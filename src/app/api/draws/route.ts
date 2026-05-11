import { createClient } from '@/lib/supabase/server'
import { emailProvider } from '@/lib/notifications/emailProvider'
import { buildRaffleResultEmail, buildWinnerEmail } from '@/lib/notifications/raffleEmailTemplates'
import { NextResponse } from 'next/server'

type DrawAction = 'draw' | 'publish_winners' | 'notify_winners' | 'notify_base' | 'close_campaign'

interface WinnerRow {
  id: string
  user_id: string
  campaign_id: string
  number: number
  winner_notified_at: string | null
  profiles?: { full_name: string | null; email: string | null } | null
  campaigns?: { title: string | null } | null
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { supabase, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') {
    return { supabase, error: NextResponse.json({ error: 'Acesso negado - apenas admin' }, { status: 403 }) }
  }
  return { supabase, error: null }
}

export async function POST(request: Request) {
  try {
    const { supabase, error: authError } = await assertAdmin()
    if (authError) return authError

    const body = await request.json()
    const { campaign_id, draw_count = 1, action = 'draw', draw_id } = body as {
      campaign_id?: string
      draw_count?: number
      action?: DrawAction
      draw_id?: string
    }

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id é obrigatório' }, { status: 400 })
    }

    // ── close_campaign ─────────────────────────────────────────────────────
    if (action === 'close_campaign') {
      const { error } = await supabase
        .from('campaigns').update({ status: 'closed' }).eq('id', campaign_id)
      if (error) throw error
      return NextResponse.json({ message: 'Campanha encerrada com sucesso' })
    }

    // ── publish_winners ────────────────────────────────────────────────────
    if (action === 'publish_winners') {
      const publishedAt = new Date().toISOString()

      // Resolve target draw: use provided draw_id or find oldest draft
      let targetDrawId = draw_id
      if (!targetDrawId) {
        const { data: draftDraw } = await supabase
          .from('draws')
          .select('id, round_number')
          .eq('campaign_id', campaign_id)
          .eq('status', 'draft')
          .order('round_number', { ascending: true })
          .limit(1)
          .maybeSingle()
        targetDrawId = draftDraw?.id ?? undefined
      }

      // Publish lucky_numbers — scoped to draw or legacy campaign-wide
      const luckyUpdateQuery = supabase
        .from('lucky_numbers')
        .update({ is_public: true, published_at: publishedAt })
        .eq('is_winner', true)
        .eq('is_public', false)

      const { data: published, error: publishErr } = targetDrawId
        ? await luckyUpdateQuery.eq('draw_id', targetDrawId).select('id')
        : await luckyUpdateQuery.eq('campaign_id', campaign_id).select('id')

      if (publishErr) throw publishErr

      // Mark draw as published
      if (targetDrawId) {
        await supabase
          .from('draws')
          .update({ status: 'published', published_at: publishedAt })
          .eq('id', targetDrawId)
      }

      // Auto-close campaign when all planned rounds are published
      const { data: campaignRow } = await supabase
        .from('campaigns')
        .select('max_draw_rounds, status')
        .eq('id', campaign_id)
        .single()

      const { count: publishedCount } = await supabase
        .from('draws')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign_id)
        .eq('status', 'published')

      if (
        campaignRow?.status !== 'closed' &&
        (publishedCount ?? 0) >= (campaignRow?.max_draw_rounds ?? 1)
      ) {
        await supabase.from('campaigns').update({ status: 'closed' }).eq('id', campaign_id)
      }

      return NextResponse.json({
        message: `${published?.length ?? 0} ganhador(es) publicado(s)`,
        count: published?.length ?? 0,
      })
    }

    // ── notify_winners ─────────────────────────────────────────────────────
    if (action === 'notify_winners') {
      const baseQuery = supabase
        .from('lucky_numbers')
        .select('id, user_id, campaign_id, number, winner_notified_at, profiles!lucky_numbers_user_id_fkey(full_name, email), campaigns(title)')
        .eq('is_winner', true)
        .is('winner_notified_at', null)

      const { data, error } = draw_id
        ? await baseQuery.eq('draw_id', draw_id)
        : await baseQuery.eq('campaign_id', campaign_id)

      if (error) throw error

      const winners = (data ?? []) as unknown as WinnerRow[]
      const notifiedAt = new Date().toISOString()

      for (const winner of winners) {
        const winnerName = winner.profiles?.full_name || 'vendedor VIP'
        const campaignTitle = winner.campaigns?.title || 'Robsol VIP'
        const template = buildWinnerEmail({ winnerName, campaignTitle, luckyNumber: winner.number })

        await supabase.from('notifications').insert({
          user_id: winner.user_id,
          type: 'draw_winner',
          title: 'Você foi sorteado!',
          body: `Seu número da sorte #${winner.number} foi premiado no sorteio ${campaignTitle}.`,
          data: { campaign_id, lucky_number_id: winner.id, number: winner.number },
          channel: 'both',
        })

        if (winner.profiles?.email) {
          try {
            await emailProvider.send(winner.profiles.email, template.subject, template.html)
          } catch (emailErr) {
            console.error(`[notify_winners] email failed for ${winner.profiles.email}:`, emailErr)
          }
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

    // ── notify_base ─────────────────────────────────────────────────────────
    if (action === 'notify_base') {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns').select('title').eq('id', campaign_id).single()
      if (campaignError) throw campaignError

      const { data: users, error: usersError } = await supabase
        .from('profiles').select('id, email').eq('role', 'user')
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

      let emailsSent = 0
      for (const user of activeUsers) {
        if (user.email) {
          try {
            await emailProvider.send(user.email, template.subject, template.html)
            emailsSent++
          } catch (emailErr) {
            console.error(`[notify_base] email failed for ${user.email}:`, emailErr)
          }
        }
      }

      // Track per-draw or per-campaign
      if (draw_id) {
        await supabase.from('draws').update({ base_notified_at: new Date().toISOString() }).eq('id', draw_id)
      } else {
        await supabase.from('campaigns').update({ draw_base_notified_at: new Date().toISOString() }).eq('id', campaign_id)
      }

      return NextResponse.json({
        message: `${activeUsers.length} usuário(s) notificado(s) (${emailsSent} e-mails enviados)`,
        count: activeUsers.length,
      })
    }

    // ── draw (default action) ──────────────────────────────────────────────
    const { data: campaignRow } = await supabase
      .from('campaigns')
      .select('status, max_draw_rounds')
      .eq('id', campaign_id)
      .single()

    if (campaignRow?.status === 'closed') {
      return NextResponse.json({ error: 'Campanha encerrada. Não é possível realizar novos sorteios.' }, { status: 409 })
    }

    // Block if a draft draw already exists for this campaign
    const { data: existingDraft } = await supabase
      .from('draws')
      .select('id, round_number')
      .eq('campaign_id', campaign_id)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingDraft) {
      return NextResponse.json({
        error: `Rodada ${existingDraft.round_number} está em rascunho. Publique-a antes de realizar um novo sorteio.`,
      }, { status: 409 })
    }

    // Block if all planned rounds are already published
    const { count: publishedRounds } = await supabase
      .from('draws')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('status', 'published')

    if ((publishedRounds ?? 0) >= (campaignRow?.max_draw_rounds ?? 1)) {
      return NextResponse.json({ error: 'Todas as rodadas planejadas já foram realizadas.' }, { status: 409 })
    }

    const { data: eligible, error: fetchError } = await supabase
      .from('lucky_numbers')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('is_winner', false)

    if (fetchError) throw fetchError
    if (!eligible || eligible.length === 0) {
      return NextResponse.json({ error: 'Não há números da sorte elegíveis para sorteio' }, { status: 400 })
    }

    const count = Math.min(draw_count, eligible.length)
    const shuffled = [...eligible]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const winners = shuffled.slice(0, count)

    // Determine next round number
    const { count: totalDrawCount } = await supabase
      .from('draws')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
    const nextRound = (totalDrawCount ?? 0) + 1

    // Create draw row
    const { data: newDraw, error: drawInsertErr } = await supabase
      .from('draws')
      .insert({
        campaign_id,
        round_number: nextRound,
        status: 'draft',
        drawn_at: new Date().toISOString(),
        winner_count: count,
      })
      .select('id, round_number')
      .single()
    if (drawInsertErr) throw drawInsertErr

    // Mark winners and link to this draw
    const drawnAt = new Date().toISOString()
    for (const winner of winners) {
      await supabase
        .from('lucky_numbers')
        .update({
          is_winner: true,
          is_public: false,
          drawn_at: drawnAt,
          published_at: null,
          winner_notified_at: null,
          draw_id: newDraw.id,
        })
        .eq('id', winner.id)
    }

    return NextResponse.json({
      message: `${count} ganhador(es) sorteado(s) — Rodada ${newDraw.round_number}`,
      draw_id: newDraw.id,
      round_number: newDraw.round_number,
      winners: winners.map((w) => ({ id: w.id, user_id: w.user_id, number: w.number })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao executar sorteio'
    console.error('[draws] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
