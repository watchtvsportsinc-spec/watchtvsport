import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function config() {
  if (process.env.WATCHTVSPORT_REVIEW_ENABLED !== 'true') throw new Error('disabled');
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const origin = process.env.WATCHTVSPORT_REVIEW_ORIGIN;
  if (!supabaseUrl || !key || !origin) throw new Error('config');
  const s = new URL(supabaseUrl);
  const o = new URL(origin);
  if (s.protocol !== 'https:' || o.protocol !== 'https:' || o.origin !== origin || key.startsWith('sb_secret_')) throw new Error('config');
  return { supabaseUrl: s.origin, key, origin: o.origin };
}

function baseHeaders(nonce: string) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  };
}

function page(nonce: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>WatchTVSport Review - Mot de passe</title><style nonce="${nonce}">:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#fff;font:16px/1.5 system-ui,-apple-system,sans-serif}main{max-width:520px;margin:auto;padding:24px 16px}.card{margin-top:28px;padding:20px;border:1px solid #2b3a51;border-radius:20px;background:#111827}h1{font-size:26px;line-height:1.2}label{display:block;margin:14px 0 6px;color:#cbd5e1}input,button{width:100%;min-height:48px;border-radius:10px;font:inherit}input{padding:12px;border:1px solid #2b3a51;background:#0b1220;color:#fff}button{margin-top:16px;border:1px solid #3b82f6;background:#245bbe;color:#fff;font-weight:700}.muted{color:#cbd5e1;font-size:14px}.status{margin:14px 0;padding:12px;border:1px solid #2b3a51;border-radius:10px}.error{border-color:#fb7185;color:#fecdd3}[hidden]{display:none!important}</style></head><body><main><strong>WatchTVSport</strong><h1>Créer ton mot de passe</h1><p class="muted">Cette page n’accepte qu’un lien de récupération Supabase valide pour un compte autorisé à la revue.</p><div id="status" class="status" role="status" aria-live="polite">Vérification du lien…</div><form id="form" class="card" hidden><label for="password">Nouveau mot de passe</label><input id="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><label for="confirm">Confirme le mot de passe</label><input id="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><button type="submit">Enregistrer le mot de passe</button><p class="muted">Utilise au moins 12 caractères et un mot de passe unique.</p></form></main><script nonce="${nonce}">const status=document.getElementById('status'),form=document.getElementById('form');const params=new URLSearchParams(location.hash.slice(1));let token=params.get('access_token')||'';const type=params.get('type')||'';history.replaceState(null,'',location.pathname);if(!token||type!=='recovery'){status.textContent='Lien de récupération invalide ou expiré. Demande un nouveau lien depuis Supabase.';status.classList.add('error');token='';}else{status.textContent='Lien valide. Choisis maintenant ton mot de passe.';form.hidden=false;document.getElementById('password').focus();}form.addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('password').value,c=document.getElementById('confirm').value;if(p!==c){status.textContent='Les deux mots de passe ne correspondent pas.';status.classList.add('error');return;}if(p.length<12){status.textContent='Le mot de passe doit contenir au moins 12 caractères.';status.classList.add('error');return;}e.submitter.disabled=true;status.textContent='Enregistrement…';status.classList.remove('error');try{const r=await fetch('/admin/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({access_token:token,password:p})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Échec de la mise à jour.');token='';document.getElementById('password').value='';document.getElementById('confirm').value='';status.textContent='Mot de passe enregistré. Tu peux maintenant te connecter.';form.hidden=true;setTimeout(()=>location.replace('/admin/login'),1200);}catch(err){status.textContent=err.message||'Échec de la mise à jour.';status.classList.add('error');e.submitter.disabled=false;}});</script></body></html>`;
}

export async function GET() {
  const nonce = randomBytes(18).toString('base64');
  const headers = new Headers(baseHeaders(nonce));
  headers.set('Content-Type', 'text/html; charset=utf-8');
  try { config(); } catch { return new Response('Espace privé indisponible.', { status: 503, headers }); }
  return new Response(page(nonce), { status: 200, headers });
}

export async function POST(request: Request) {
  const nonce = randomBytes(18).toString('base64');
  const headers = new Headers(baseHeaders(nonce));
  headers.set('Content-Type', 'application/json; charset=utf-8');
  const send = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  let c;
  try { c = config(); } catch { return send({ error: 'Espace privé indisponible.' }, 503); }
  if (request.headers.get('origin') !== c.origin || ['cross-site','same-site'].includes(request.headers.get('sec-fetch-site') || '')) return send({ error: 'Origine non autorisée.' }, 403);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return send({ error: 'JSON requis.' }, 415);
  let body: any;
  try {
    if (Number(request.headers.get('content-length') || 0) > 12000) return send({ error: 'Requête trop volumineuse.' }, 413);
    body = await request.json();
  } catch { return send({ error: 'JSON invalide.' }, 400); }
  const token = body?.access_token;
  const password = body?.password;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || typeof password !== 'string' || password.length < 12 || password.length > 128) return send({ error: 'Lien ou mot de passe invalide.' }, 400);
  const common = { apikey: c.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const userRes = await fetch(c.supabaseUrl + '/auth/v1/user', { headers: common, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!userRes.ok) return send({ error: 'Lien de récupération invalide ou expiré.' }, 401);
    const user = await userRes.json();
    if (!user || !UUID.test(user.id)) return send({ error: 'Session de récupération invalide.' }, 401);
    const identityRes = await fetch(c.supabaseUrl + '/rest/v1/rpc/wts_review_identity', { method: 'POST', headers: common, body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!identityRes.ok) return send({ error: 'Compte non autorisé pour cet espace.' }, 403);
    const identity = await identityRes.json();
    if (identity?.member !== true) return send({ error: 'Compte non autorisé pour cet espace.' }, 403);
    const updateRes = await fetch(c.supabaseUrl + '/auth/v1/user', { method: 'PUT', headers: common, body: JSON.stringify({ password }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!updateRes.ok) return send({ error: 'Impossible d’enregistrer ce mot de passe. Demande un nouveau lien.' }, updateRes.status === 429 ? 429 : 400);
    return send({ ok: true });
  } catch {
    return send({ error: 'Service d’authentification indisponible. Réessaie sans réutiliser un lien expiré.' }, 503);
  }
}
