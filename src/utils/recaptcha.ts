// utils/recaptcha.ts
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../lib/firestoreClient';

let _verifier: RecaptchaVerifier | null = null;
let _containerId: string | null = null;

export async function getRecaptchaVerifier(containerId = 'login-recaptcha-container', options: any = {}) {
  if (typeof window === 'undefined') return null;

  const baseOpts = {
    size: 'invisible',                // ← key change (no visible checkbox)
    callback: () => {},
    'expired-callback': () => {},
    'error-callback': (e: unknown) => console.error('[reCAPTCHA] error:', e),
    ...options,
  };

  if (_verifier && _containerId === containerId) return _verifier;

  if (_verifier) {
    try { _verifier.clear(); } catch {}
    _verifier = null;
    _containerId = null;
  }

  const el = document.getElementById(containerId);
  if (!el) throw new Error(`reCAPTCHA container #${containerId} not found`);

  // Do not style/show anything for invisible; keep DOM node empty and stable.
  try { el.innerHTML = ''; } catch {}

  _verifier = new RecaptchaVerifier(auth, containerId, baseOpts);
  await _verifier.render();                   // idempotent with our singleton
  _containerId = containerId;
  return _verifier;
}

export function clearRecaptchaVerifier() {
  if (_verifier) {
    try { _verifier.clear(); } catch {}
  }
  _verifier = null;
  _containerId = null;
}
