'use server'

import OpenAI from 'openai'
import type { ExtractedData } from '@/types/coupon'

// NOTE: The OpenAI client is intentionally instantiated INSIDE the function.
// The SDK constructor throws synchronously when apiKey is undefined, which at
// module level would crash the entire server action module — making every call
// return a 500 before the try/catch ever runs.

/**
 * Analyses a receipt image already stored in Supabase Storage.
 * Accepts a public URL — no base64 payload, no body-size limit issues.
 */
export async function scanCouponImage(
  imageUrl: string,
  campaignKeywords: string[]
): Promise<{ success: boolean; data?: ExtractedData; error?: string }> {
  console.log('[scanCoupon] ▶ Starting AI analysis')
  console.log('[scanCoupon] Image URL:', imageUrl)
  console.log('[scanCoupon] Keywords:', campaignKeywords)

  // ── 1. Environment variable validation ──────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[scanCoupon] AI_ERROR_DETAILS: OPENAI_API_KEY is undefined in this runtime.')
    console.error('[scanCoupon] Check Vercel → Project → Settings → Environment Variables.')
    return { success: false, error: 'Configuração da IA ausente' }
  }
  console.log('[scanCoupon] API key present — length:', apiKey.length)

  // ── 2. Instantiate client inside the function (never at module level) ───
  let openai: OpenAI
  try {
    openai = new OpenAI({ apiKey })
  } catch (initErr) {
    console.error('[scanCoupon] AI_ERROR_DETAILS (OpenAI init failed):', initErr)
    return { success: false, error: 'Configuração da IA ausente' }
  }

  try {
    const keywordsText =
      campaignKeywords.length > 0
        ? `Produtos elegiveis da campanha (palavras-chave): ${campaignKeywords.join(', ')}`
        : 'Nenhuma palavra-chave especifica definida para esta campanha.'

    console.log('[scanCoupon] Calling OpenAI Vision API...')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are an expert receipt/coupon OCR system. You extract structured data from receipt images.
You MUST respond ONLY with valid JSON. No markdown, no code blocks, no extra text.

${keywordsText}

Respond with this exact JSON structure:
{
  "customer_name": "name if visible or null",
  "date": "YYYY-MM-DD if visible or null",
  "store": "store name if visible or null",
  "total": 0.00,
  "receipt_number": "NF, NFCe, fiscal document number, or order number if visible or null",
  "items": [
    {
      "name": "product name",
      "quantity": 1,
      "price": 0.00,
      "matched_keyword": "matching keyword from campaign or null"
    }
  ],
  "matched_keywords": ["list of campaign keywords that matched products found"],
  "has_matching_products": true
}

Rules:
- Extract ALL products/items visible on the receipt exactly as printed.
- Keyword matching is CHARACTER-LEVEL SUBSTRING ONLY. A product matches a keyword if and only if the exact keyword character sequence appears somewhere inside the product name string when both are lowercased. This is a pure string containment check — nothing more.
  FORBIDDEN: semantic inference, synonyms, brand associations, category matching, phonetic similarity, abbreviation expansion, translation, or any other form of inference.
  CORRECT example: keyword "ray-ban" matches "Ray-Ban Clubmaster" ✓ (literal substring present)
  WRONG example: keyword "ray-ban" matching "oculos escuros" ✗ (no literal substring)
  WRONG example: keyword "sabrina sato" matching "SMART HAYTEK AR." ✗ (completely different character sequences — no substring match exists)
  WRONG example: keyword "nike" matching "tenis esportivo" ✗ (category match, not literal)
- To check a match: take the product name from the receipt, lowercase it, check if the lowercased keyword is a substring. If yes → match. If no → null. No other logic applies.
- If an item matches by the strict rule above, put the matched keyword in "matched_keyword"; otherwise set "matched_keyword" to null.
- "matched_keywords" is a deduplicated list of all keywords that had at least one strictly matching product.
- "has_matching_products" is true ONLY if at least one product matches a keyword by the strict rule above.
- If no keywords are defined for the campaign, set "has_matching_products" to true and "matched_keywords" to [].
- Extract the fiscal document or order number (NF, NFCe, COO, cupom number, pedido number) into "receipt_number". This is critical for anti-fraud.
- Use null for fields you cannot extract.
- Prices must be numbers, not strings.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all data from this receipt image. Compare products against the campaign keywords and flag matches.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Sem resposta da OpenAI')
    }

    console.log('[scanCoupon] OpenAI raw response (first 400 chars):', content.substring(0, 400))

    // ── 3. Response sanitisation — strip markdown fences, then parse ───────
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    let extractedData: ExtractedData
    try {
      extractedData = JSON.parse(cleaned) as ExtractedData
    } catch (parseErr) {
      console.error('[scanCoupon] AI_ERROR_DETAILS (JSON parse failed):', parseErr)
      console.error('[scanCoupon] Full raw response that failed to parse:', content)
      return { success: false, error: 'IA retornou formato inválido' }
    }

    console.log('[scanCoupon] ✔ Parsed successfully. has_matching_products:', extractedData.has_matching_products)
    console.log('[scanCoupon] matched_keywords:', extractedData.matched_keywords)
    console.log('[scanCoupon] receipt_number:', extractedData.receipt_number)

    return { success: true, data: extractedData }
  } catch (error: unknown) {
    // Full object dump — captures AuthenticationError, RateLimitError, APIError etc.
    console.error('[scanCoupon] AI_ERROR_DETAILS:', error)
    const message = error instanceof Error ? error.message : 'Falha ao escanear imagem do cupom'
    return { success: false, error: message }
  }
}
