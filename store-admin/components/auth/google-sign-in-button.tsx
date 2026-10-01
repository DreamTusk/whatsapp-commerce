'use client'

import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui/button'

function GoogleGLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.766 12.2764c0-.9175-.0824-1.7995-.2354-2.6455H12.24v5.0055h6.482c-.2812 1.5155-1.1282 2.7995-2.4025 3.6605v3.0435h3.8875c2.2735-2.0935 3.582-5.1755 3.582-8.864z" />
      <path fill="#34A853" d="M12.24 24c3.24 0 5.9555-1.0755 7.9405-2.9095l-3.8875-3.0435c-1.0755.72-2.4515 1.1455-4.053 1.1455-3.1155 0-5.7535-2.1035-6.6935-4.9295H1.5335v3.0995C3.5075 21.3005 7.5325 24 12.24 24z" />
      <path fill="#FBBC05" d="M5.5465 14.2685c-.243-.72-.3815-1.489-.3815-2.2685s.1385-1.5485.3815-2.2685V6.6315H1.5335A11.994 11.994 0 0 0 0 12c0 1.9385.4655 3.7735 1.5335 5.3685l4.013-3.1z" />
      <path fill="#EA4335" d="M12.24 4.7455c1.7625 0 3.3455.6055 4.5905 1.794l3.4445-3.4445C18.1905 1.1855 15.4755 0 12.24 0 7.5325 0 3.5075 2.6995 1.5335 6.6315l4.013 3.1c.94-2.826 3.578-4.9295 6.6935-4.9295z" />
    </svg>
  )
}

interface GoogleSignInButtonProps {
  onAccessToken: (accessToken: string) => void
  onError?: () => void
  disabled?: boolean
  label?: string
}

export function GoogleSignInButton({
  onAccessToken,
  onError,
  disabled,
  label = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => onAccessToken(tokenResponse.access_token),
    onError: () => onError?.(),
  })

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={() => googleLogin()}
      disabled={disabled}
    >
      <GoogleGLogo className="w-4 h-4" />
      {label}
    </Button>
  )
}
