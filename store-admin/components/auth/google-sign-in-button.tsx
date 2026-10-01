'use client'

import { GoogleLogin } from '@react-oauth/google'

interface GoogleSignInButtonProps {
  onIdToken: (idToken: string) => void
  onError?: () => void
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
}

// Renders Google's own "Sign in with Google" button — required by Google's
// identity-services flow to get a signed ID token (credential) rather than a
// bare access token. The button's appearance isn't customizable the way the
// old custom-styled button was.
export function GoogleSignInButton({ onIdToken, onError, text = 'signin_with' }: GoogleSignInButtonProps) {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) onIdToken(credentialResponse.credential)
        else onError?.()
      }}
      onError={() => onError?.()}
      text={text}
      width="100%"
    />
  )
}
