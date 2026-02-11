export interface EmailProvider {
  send(to: string, subject: string, htmlBody: string): Promise<void>
}

// Stub implementation — swap with Resend or SendGrid when ready
// npm install resend && set RESEND_API_KEY in .env.local
export const emailProvider: EmailProvider = {
  async send(to, subject, htmlBody) {
    console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}, Body: ${htmlBody.substring(0, 100)}...`)
    // When ready:
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: 'noreply@robsol.com', to, subject, html: htmlBody })
  },
}
