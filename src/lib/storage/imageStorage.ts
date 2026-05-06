import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'incentive-campaigns'

const getSafeStorageBaseName = (fileName: string) => {
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  const safeName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)

  return safeName || 'imagem'
}

const getShortStorageSuffix = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8)

/**
 * Uploads a campaign banner image to Supabase Storage
 * @param file - The image file to upload
 * @param campaignId - The campaign ID
 * @returns The public URL of the uploaded image
 */
export const uploadCampaignBanner = async (
  file: File,
  campaignId: string
): Promise<string> => {
  const supabase = createClient()

  const fileExt = file.name.split('.').pop()
  const filePath = `campaigns/${campaignId}/banner.${fileExt}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Allow overwriting existing banner
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * Uploads a campaign mobile banner image to Supabase Storage
 * @param file - The image file to upload
 * @param campaignId - The campaign ID
 * @returns The public URL of the uploaded image
 */
export const uploadCampaignBannerMobile = async (
  file: File,
  campaignId: string
): Promise<string> => {
  const supabase = createClient()

  const fileExt = file.name.split('.').pop()
  const filePath = `campaigns/${campaignId}/banner-mobile.${fileExt}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * Uploads a coupon image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user ID
 * @param campaignId - The campaign ID
 * @returns The public URL of the uploaded image
 */
export const uploadCouponImage = async (
  file: File,
  userId: string,
  campaignId: string
): Promise<string> => {
  const supabase = createClient()

  // Generate unique filename
  const timestamp = Date.now()
  const fileName = `${timestamp}_${file.name}`

  // Storage path: coupons/{campaign_id}/{user_id}/{filename}
  const filePath = `coupons/${campaignId}/${userId}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  const supabase = createClient()

  // Extract file path from URL
  const urlParts = imageUrl.split(`${BUCKET_NAME}/`)
  if (urlParts.length < 2) {
    throw new Error('Invalid image URL')
  }
  const path = urlParts[1]

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) throw error
}

/**
 * Uploads a mural slide image to the 'mural-slides' Supabase Storage bucket.
 * Ideal dimensions: 1200 × 400px (3:1 aspect ratio).
 * @param file - The image file to upload
 * @param slideId - A unique identifier for the slide (used in the path)
 * @returns The public URL of the uploaded image
 */
export const uploadMuralSlideImage = async (
  file: File,
  slideId: string
): Promise<string> => {
  const supabase = createClient()

  const fileExt = file.name.split('.').pop()
  const filePath = `slides/${slideId}/image.${fileExt}`

  const { error } = await supabase.storage
    .from('mural-slides')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('mural-slides')
    .getPublicUrl(filePath)

  return publicUrl
}

export const uploadPrizeImage = async (file: File, prizeImageId: string): Promise<string> => {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const filePath = `prizes/${prizeImageId}/square.${fileExt}`
  console.log('[uploadPrizeImage] uploading to:', filePath, file.size + 'B')
  const { error } = await supabase.storage
    .from('prize-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: true })
  if (error) {
    console.error('[uploadPrizeImage] ERROR:', error.message, error)
    throw error
  }
  const { data: { publicUrl } } = supabase.storage.from('prize-images').getPublicUrl(filePath)
  console.log('[uploadPrizeImage] OK:', publicUrl)
  return publicUrl
}

export const uploadPrizeImageHorizontal = async (file: File, prizeImageId: string): Promise<string> => {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const filePath = `prizes/${prizeImageId}/horizontal.${fileExt}`
  console.log('[uploadPrizeImageHorizontal] uploading to:', filePath, file.size + 'B')
  const { error } = await supabase.storage
    .from('prize-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: true })
  if (error) {
    console.error('[uploadPrizeImageHorizontal] ERROR:', error.message, error)
    throw error
  }
  const { data: { publicUrl } } = supabase.storage.from('prize-images').getPublicUrl(filePath)
  console.log('[uploadPrizeImageHorizontal] OK:', publicUrl)
  return publicUrl
}

export const uploadPrizeGalleryImage = async (file: File, prizeImageId: string): Promise<string> => {
  const supabase = createClient()

  // Auth check — the prize-images INSERT policy requires the authenticated role.
  const { data: { session } } = await supabase.auth.getSession()
  console.log(
    '[uploadPrizeGalleryImage] auth session:',
    session ? `✓ user=${session.user.email}` : '✗ NO SESSION — upload will be rejected with 403!',
  )

  if (file.type !== 'image/webp') {
    throw new Error('A imagem da galeria precisa ser convertida para WebP antes do upload.')
  }

  const safeBaseName = getSafeStorageBaseName(file.name)
  const filePath = `prizes/${prizeImageId}/gallery/${safeBaseName}-${getShortStorageSuffix()}.webp`
  console.log('[uploadPrizeGalleryImage] uploading to:', filePath, file.size + 'B', file.type)

  const { error } = await supabase.storage
    .from('prize-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (error) {
    // Log the full error object so we can see statusCode, message, etc.
    console.error('[uploadPrizeGalleryImage] SUPABASE ERROR:', {
      message: error.message,
      name: error.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statusCode: (error as any).statusCode,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cause: (error as any).cause,
    })
    const statusCode = typeof error === 'object' && error && 'statusCode' in error ? String(error.statusCode) : ''
    const details = [
      'Falha ao enviar imagem para o bucket prize-images.',
      statusCode ? `Status ${statusCode}.` : '',
      error.message,
      'Verifique se voce esta logado e se a policy de INSERT do Supabase Storage permite uploads.',
    ]
      .filter(Boolean)
      .join(' ')

    throw new Error(details)
  }

  const { data: { publicUrl } } = supabase.storage.from('prize-images').getPublicUrl(filePath)
  console.log('[uploadPrizeGalleryImage] OK:', publicUrl)
  return publicUrl
}

/**
 * Deletes a campaign banner from Supabase Storage
 * @param campaignId - The campaign ID
 */
export const deleteCampaignBanner = async (campaignId: string): Promise<void> => {
  const supabase = createClient()

  // List all files in the campaign folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`campaigns/${campaignId}`)

  if (listError) throw listError

  if (files && files.length > 0) {
    // Delete all files in the campaign folder
    const filePaths = files.map(file => `campaigns/${campaignId}/${file.name}`)
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths)

    if (error) throw error
  }
}
