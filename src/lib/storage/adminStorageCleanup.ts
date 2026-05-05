import type { SupabaseClient } from '@supabase/supabase-js'

export const PRIZE_IMAGES_BUCKET = 'prize-images'
export const CAMPAIGN_IMAGES_BUCKET = 'incentive-campaigns'

const LIST_PAGE_SIZE = 1000
const REMOVE_BATCH_SIZE = 100

type StorageBucket = typeof PRIZE_IMAGES_BUCKET | typeof CAMPAIGN_IMAGES_BUCKET

interface PrizeImageRecord {
  image_url: string | null
  image_horizontal: string | null
  images: string[] | null
}

interface CampaignImageRecord {
  banner_url: string | null
  banner_url_mobile: string | null
}

const normalizePath = (value: string) => value.replace(/^\/+/, '').split('?')[0]

export const getStoragePathFromUrl = (value: string | null | undefined, bucket: string): string | null => {
  if (!value) return null

  try {
    const url = new URL(value)
    const decodedPath = decodeURIComponent(url.pathname)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = decodedPath.indexOf(marker)

    if (markerIndex >= 0) {
      return normalizePath(decodedPath.slice(markerIndex + marker.length))
    }
  } catch {
    // Manual paths are supported below.
  }

  const bucketMarker = `${bucket}/`
  const markerIndex = value.indexOf(bucketMarker)
  if (markerIndex >= 0) {
    return normalizePath(value.slice(markerIndex + bucketMarker.length))
  }

  if (!value.startsWith('http') && !value.startsWith('data:')) {
    return normalizePath(value)
  }

  return null
}

const uniquePaths = (paths: Array<string | null>) => [...new Set(paths.filter(Boolean) as string[])]

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

const collectPrizeUrls = (prize: PrizeImageRecord) => [
  prize.image_url,
  prize.image_horizontal,
  ...(Array.isArray(prize.images) ? prize.images : []),
]

export const getPrizeImagePaths = (prize: PrizeImageRecord, bucket = PRIZE_IMAGES_BUCKET) =>
  uniquePaths(collectPrizeUrls(prize).map((url) => getStoragePathFromUrl(url, bucket)))

export const getCampaignImagePaths = (campaign: CampaignImageRecord, bucket: string) =>
  uniquePaths([
    getStoragePathFromUrl(campaign.banner_url, bucket),
    getStoragePathFromUrl(campaign.banner_url_mobile, bucket),
  ])

export const removeStoragePaths = async (
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
) => {
  const cleanPaths = uniquePaths(paths)
  if (cleanPaths.length === 0) return 0

  let removed = 0
  for (const batch of chunk(cleanPaths, REMOVE_BATCH_SIZE)) {
    const { error } = await admin.storage.from(bucket).remove(batch)
    if (error) throw error
    removed += batch.length
  }

  return removed
}

export const removePrizeStorageAssets = async (
  admin: SupabaseClient,
  prize: PrizeImageRecord,
) => removeStoragePaths(admin, PRIZE_IMAGES_BUCKET, getPrizeImagePaths(prize))

export const removeCampaignStorageAssets = async (
  admin: SupabaseClient,
  campaign: CampaignImageRecord,
) => {
  let removed = 0
  for (const bucket of [CAMPAIGN_IMAGES_BUCKET, PRIZE_IMAGES_BUCKET] as StorageBucket[]) {
    removed += await removeStoragePaths(admin, bucket, getCampaignImagePaths(campaign, bucket))
  }
  return removed
}

export const listStorageFiles = async (
  admin: SupabaseClient,
  bucket: string,
  prefix = '',
): Promise<string[]> => {
  const files: string[] = []

  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) throw error
    if (!data || data.length === 0) break

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      const isFolder = item.id === null || item.metadata === null

      if (isFolder) {
        files.push(...await listStorageFiles(admin, bucket, path))
      } else {
        files.push(path)
      }
    }

    if (data.length < LIST_PAGE_SIZE) break
  }

  return files
}

export const getReferencedPrizeImagePaths = async (admin: SupabaseClient) => {
  const [prizeRes, campaignRes] = await Promise.all([
    admin.from('prizes_catalog').select('image_url, image_horizontal, images'),
    admin.from('campaigns').select('banner_url, banner_url_mobile'),
  ])

  if (prizeRes.error) throw prizeRes.error
  if (campaignRes.error) throw campaignRes.error

  const paths = new Set<string>()

  for (const prize of (prizeRes.data ?? []) as PrizeImageRecord[]) {
    for (const path of getPrizeImagePaths(prize, PRIZE_IMAGES_BUCKET)) paths.add(path)
  }

  for (const campaign of (campaignRes.data ?? []) as CampaignImageRecord[]) {
    for (const path of getCampaignImagePaths(campaign, PRIZE_IMAGES_BUCKET)) paths.add(path)
  }

  return paths
}

export const scanOrphanedPrizeImages = async (admin: SupabaseClient) => {
  const [storageFiles, referencedPaths] = await Promise.all([
    listStorageFiles(admin, PRIZE_IMAGES_BUCKET),
    getReferencedPrizeImagePaths(admin),
  ])

  const orphanedFiles = storageFiles.filter((path) => !referencedPaths.has(path))

  return {
    bucket: PRIZE_IMAGES_BUCKET,
    totalFiles: storageFiles.length,
    referencedFiles: storageFiles.length - orphanedFiles.length,
    orphanedCount: orphanedFiles.length,
    orphanedFiles,
  }
}
