import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  // Redirect unauthenticated users to login
  if (!session && (isAdminRoute || isDashboardRoute)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // For routes that need role check, fetch profile once
  if (session && (isAdminRoute || isAuthPage)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Non-admins on admin routes → redirect to dashboard
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Authenticated users on auth pages → redirect to appropriate dashboard
    if (isAuthPage) {
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/register'],
}
