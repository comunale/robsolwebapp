'use server'

import OpenAI from 'openai'
import type { ExtractedData } from '@/types/coupon'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function scanCouponImage(
  base64Image: string,
  mimeType: string,
  campaignKeywords: string[]
): Promise<{ success: boolean; data?: ExtractedData; error?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY nao esta configurada')
    }

    const keywordsText =
      campaignKeywords.length > 0
        ? `Produtos elegiveis da campanha (palavras-chave): ${campaignKeywords.join(', ')}`
        : 'Nenhuma palavra-chave especifica definida para esta campanha.'

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
- Extract ALL products/items visible on the receipt.
- For each item, check if it matches any campaign keyword (case-insensitive, partial match allowed).
- If an item matches, put the matched keyword in "matched_keyword".
- "matched_keywords" is a deduplicated list of all keywords that had at least one matching product.
- "has_matching_products" is true if at least one product matches a campaign keyword.
- If no keywords are defined for the campaign, set "has_matching_products" to true and "matched_keywords" to [].
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
                url: `data:${mimeType};base64,${base64Image}`,
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

    // Clean the response — remove markdown code fences if present
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const extractedData: ExtractedData = JSON.parse(cleaned)

    return { success: true, data: extractedData }
  } catch (error: unknown) {
    console.error('OCR scan error:', error)
    const message = error instanceof Error ? error.message : 'Falha ao escanear imagem do cupom'
    return {
      success: false,
      error: message,
    }
  }
}
