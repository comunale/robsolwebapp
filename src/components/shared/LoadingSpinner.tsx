interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
  fullScreen?: boolean
}

const sizeMap = {
  sm: 'w-8 h-8 border-2',
  md: 'w-12 h-12 border-4',
  lg: 'w-16 h-16 border-4',
}

export default function LoadingSpinner({
  size = 'lg',
  color = 'border-indigo-600',
  text = 'Carregando...',
  fullScreen = true,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="text-center">
      <div
        className={`${sizeMap[size]} ${color} border-t-transparent rounded-full animate-spin mx-auto mb-4`}
      />
      {text && <p className="text-gray-500 text-sm">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
