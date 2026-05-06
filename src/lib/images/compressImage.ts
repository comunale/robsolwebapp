const DEFAULT_MAX_DIMENSION = 1200
const DEFAULT_QUALITY = 0.8
const OUTPUT_MIME_TYPE = 'image/webp'

interface CompressImageOptions {
  maxDimension?: number
  quality?: number
}

const getWebpFileName = (fileName: string) => {
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  return `${baseName || 'image'}.webp`
}

const getTargetSize = (width: number, height: number, maxDimension: number) => {
  const largestSide = Math.max(width, height)
  if (largestSide <= maxDimension) return { width, height }

  const scale = maxDimension / largestSide
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

const loadImage = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file)
  console.log('[compressImage] loadImage: created objectUrl for', file.name)

  try {
    const image = new Image()
    image.src = objectUrl
    // decode() waits for both resource load AND full pixel decode before resolving,
    // so canvas.drawImage never receives an undecoded (blank) image.
    await image.decode()
    console.log('[compressImage] loadImage: decoded OK', image.naturalWidth, 'x', image.naturalHeight)
    return image
  } catch (err) {
    console.error('[compressImage] loadImage: decode FAILED:', err)
    throw new Error('Nao foi possivel carregar a imagem para compressao.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export const compressImageForUpload = async (
  file: File,
  options: CompressImageOptions = {},
): Promise<File> => {
  console.log('[compressImage] START:', file.name, file.size + 'B', file.type)

  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem valido.')
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const image = await loadImage(file)
  const { width, height } = getTargetSize(image.naturalWidth, image.naturalHeight, maxDimension)
  console.log('[compressImage] target dimensions:', width, 'x', height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Nao foi possivel preparar a compressao da imagem.')
  }

  context.drawImage(image, 0, 0, width, height)

  const pixel = context.getImageData(0, 0, 1, 1).data
  console.log(
    '[compressImage] top-left pixel RGBA:',
    pixel[0], pixel[1], pixel[2], pixel[3],
    pixel[3] === 0 ? '⚠ TRANSPARENT — canvas may be blank!' : '✓ has pixels',
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          console.log('[compressImage] blob created:', result.size + 'B', result.type)
          if (result.size < 1000) {
            console.warn('[compressImage] ⚠ blob is suspiciously small — possible blank canvas or unsupported format')
          }
          resolve(result)
        } else {
          reject(new Error('Nao foi possivel comprimir a imagem.'))
        }
      },
      OUTPUT_MIME_TYPE,
      quality,
    )
  })

  const compressed = new File([blob], getWebpFileName(file.name), {
    type: OUTPUT_MIME_TYPE,
    lastModified: Date.now(),
  })

  console.log(
    '[compressImage] DONE:',
    compressed.name,
    compressed.size + 'B',
    `(${Math.round((compressed.size / file.size) * 100)}% of original)`,
  )
  return compressed
}
