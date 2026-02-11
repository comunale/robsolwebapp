'use client'

import { useState, useEffect } from 'react'
import type { Notification } from '@/types/notification'

interface NotificacoesProps {
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

export default function Notificacoes({ onClose, onUnreadCountChange }: NotificacoesProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        onUnreadCountChange(data.notifications.filter((n: Notification) => !n.is_read).length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    onUnreadCountChange(notifications.filter(n => !n.is_read && n.id !== id).length)
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    onUnreadCountChange(0)
  }

  const typeIcon: Record<string, string> = {
    goal_completed: '🎯',
    coupon_approved: '✅',
    coupon_rejected: '❌',
    lucky_number: '🍀',
    draw_winner: '🏆',
    campaign_new: '📢',
    general: '📌',
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-h-96 overflow-y-auto z-50">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Notificacoes</h3>
          <div className="flex gap-3">
            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Marcar todas como lidas
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nenhuma notificacao</div>
        ) : (
          <div>
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                  n.is_read ? 'bg-white' : 'bg-indigo-50'
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-lg">{typeIcon[n.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
