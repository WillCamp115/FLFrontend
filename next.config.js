/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Comprehensive CSP for /login with all Firebase Auth + reCAPTCHA requirements
const loginCSP = [
  // base
  `default-src 'self'`,
  // scripts needed for Firebase Auth + reCAPTCHA + Plaid
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://www.gstatic.com https://www.google.com https://www.recaptcha.net https://apis.google.com https://cdn.plaid.com`,
  // explicit element/attr variants if used anywhere
  `script-src-elem 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://www.gstatic.com https://www.google.com https://www.recaptcha.net https://apis.google.com https://cdn.plaid.com`,
  `script-src-attr 'self' 'unsafe-inline'`,
  // reCAPTCHA uses a web worker; allow it
  `worker-src 'self' blob: https://www.google.com https://www.gstatic.com`,
  // frames: Google, reCAPTCHA, Plaid, and YOUR Firebase auth domain(s)
  `frame-src 'self' https://accounts.google.com https://www.google.com https://www.recaptcha.net https://www.gstatic.com https://freedomledger-1d1b2.firebaseapp.com https://*.firebaseapp.com https://*.web.app https://cdn.plaid.com`,
  // XHR/fetch for Firebase + reCAPTCHA enterprise + Plaid + local backend
  `connect-src 'self' ${isDev ? 'http://localhost:8000 ws://localhost:8000' : ''} https://www.google.com https://www.recaptcha.net https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://recaptchaenterprise.googleapis.com https://www.gstatic.com https://firebasestorage.googleapis.com https://firebasestorage.app https://cdn.plaid.com https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com`,
  // styles/images required by reCAPTCHA
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://www.gstatic.com https://www.google.com https://www.recaptcha.net`,
].join('; ');

const nextConfig = {
   env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  async headers() {
    return [
      {
        // **IMPORTANT**: only ONE CSP header on this route
        source: '/login',
        headers: [
          { key: 'Content-Security-Policy', value: loginCSP },
          // turn OFF isolation for this route
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      {
        // Same comprehensive CSP for MFA enrollment
        source: '/mfa-enrollment',
        headers: [
          { key: 'Content-Security-Policy', value: loginCSP },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      {
        // CSP for dashboard and other pages that need API access
        source: '/dashboard',
        headers: [
          { key: 'Content-Security-Policy', value: loginCSP },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ];
  }
}

module.exports = nextConfig
