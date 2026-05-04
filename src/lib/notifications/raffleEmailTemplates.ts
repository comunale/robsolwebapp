interface WinnerEmailParams {
  winnerName: string
  campaignTitle: string
  luckyNumber: number
}

interface BaseEmailParams {
  campaignTitle: string
}

const shellStyle = [
  'font-family: Montserrat, Arial, sans-serif',
  'background:#0f0c29',
  'padding:32px 16px',
  'color:#111827',
].join(';')

const cardStyle = [
  'max-width:560px',
  'margin:0 auto',
  'background:#ffffff',
  'border-radius:18px',
  'overflow:hidden',
  'box-shadow:0 24px 80px rgba(0,0,0,0.25)',
].join(';')

export function buildWinnerEmail({ winnerName, campaignTitle, luckyNumber }: WinnerEmailParams) {
  return {
    subject: 'Parabéns! Você ganhou no Sorteio Robsol VIP 🎁',
    html: `
      <div style="${shellStyle}">
        <div style="${cardStyle}">
          <div style="height:5px;background:linear-gradient(90deg,#d4af37,#e3cb7d)"></div>
          <div style="padding:32px">
            <p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase">Robsol VIP</p>
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#111827">Parabéns, ${winnerName}!</h1>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#4b5563">
              Você foi um dos ganhadores do sorteio <strong>${campaignTitle}</strong>.
            </p>
            <div style="margin:24px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb">
              <p style="margin:0;color:#6b7280;font-size:13px;font-weight:700">Número da sorte premiado</p>
              <p style="margin:4px 0 0;color:#111827;font-size:32px;font-weight:900">#${luckyNumber}</p>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563">
              Nossa equipe entrará em contato para orientar os próximos passos da entrega do prêmio.
            </p>
          </div>
        </div>
      </div>
    `,
  }
}

export function buildRaffleResultEmail({ campaignTitle }: BaseEmailParams) {
  return {
    subject: 'Resultado do Sorteio Robsol VIP disponível!',
    html: `
      <div style="${shellStyle}">
        <div style="${cardStyle}">
          <div style="height:5px;background:linear-gradient(90deg,#d4af37,#e3cb7d)"></div>
          <div style="padding:32px">
            <p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase">Robsol VIP</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;color:#111827">Sorteio realizado!</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563">
              O resultado do sorteio <strong>${campaignTitle}</strong> já está disponível.
            </p>
            <p style="margin:0;font-size:16px;line-height:1.6;color:#111827;font-weight:700">
              Confira se você não foi um dos ganhadores.
            </p>
          </div>
        </div>
      </div>
    `,
  }
}
