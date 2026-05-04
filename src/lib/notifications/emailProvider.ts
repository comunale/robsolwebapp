export interface EmailProvider {
  send(to: string, subject: string, htmlBody: string): Promise<void>
}

export const emailProvider: EmailProvider = {
  async send(to, subject, htmlBody) {
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}, Body: ${htmlBody.substring(0, 100)}...`)
      return
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Robsol VIP <noreply@appbeneficios.robsol.com.br>',
        to,
        subject,
        html: htmlBody,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Falha ao enviar email: ${errorBody}`)
    }
  },
}
