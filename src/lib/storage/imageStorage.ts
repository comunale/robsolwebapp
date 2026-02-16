import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'incentive-campaigns'

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
