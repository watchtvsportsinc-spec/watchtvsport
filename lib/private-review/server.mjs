import { randomBytes } from 'node:crypto';
import { page, manifest, icon } from './ui.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE = ['broadcaster_id','territory_id','access_type','broadcast_type','official_url','source_name','source_url','evidence_scope','language_codes','access_conditions','requires_account','is_free_trial'];
export class ReviewError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function reject(status, message) { throw new ReviewError(status, message); }
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function validateCommand(body) {
  if (!plain(body) || Object.keys(body).some(k => !['case_id','expected_version','request_id','action','patch','note'].includes(k))) reject(400, 'Commande invalide.');
  if (!UUID.test(body.case_id) || !UUID.test(body.request_id) || !Number.isSafeInteger(body.expected_version) || body.expected_version < 1) reject(400, 'Version ou identifiant invalide.');
  if (!['approve','reject','research','edit','reopen'].includes(body.action)) reject(400, 'Action invalide.');
  const patch = body.patch ?? {};
  if (!plain(patch) || Object.keys(patch).some(k => !EDITABLE.includes(k))) reject(400, 'Modification interdite.');
  if (Object.keys(patch).length && !['approve','edit'].includes(body.action)) reject(400, 'Cette action ne modifie pas les informations.');
  for (const [key,value] of Object.entries(patch)) {
    if (['broadcaster_id','territory_id'].includes(key)) {
      if (!UUID.test(value)) reject(400, 'Choisir un diffuseur et un territoire existants.');
    } else if (['requires_account','is_free_trial'].includes(key)) {
      if (typeof value !== 'boolean') reject(400, 'Valeur booleenne attendue.');
    } else if (key === 'language_codes') {
      if (!Array.isArray(value) || value.length > 12 || value.some(v => typeof v !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(v))) reject(400, 'Codes de langue invalides.');
    } else if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f]/.test(value)) reject(400, 'Texte invalide ou trop long.');
  }
  for (const field of ['source_url','official_url']) if (patch[field] && !publicHttps(patch[field])) reject(400, 'Un lien HTTPS public sans identifiants est requis.');
  if (patch.access_type && !['Free','Paid','Unknown'].includes(patch.access_type)) reject(400, 'Acces inconnu.');
  if (patch.broadcast_type && !['live','delayed','replay','highlights'].includes(patch.broadcast_type)) reject(400, 'Type de diffusion inconnu.');
  if (patch.evidence_scope && !['event','competition','unknown'].includes(patch.evidence_scope)) reject(400, 'Portee de preuve inconnue.');
  const note = body.note ?? '';
  if (typeof note !== 'string' || note.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note)) reject(400, 'Note invalide.');
  if ((Object.keys(patch).length || body.action === 'reopen') && !note.trim()) reject(400, 'Une justification est requise.');
  return {case_id:body.case_id, expected_version:body.expected_version, request_id:body.request_id, action:body.action, patch, note:note.trim()};
}
export function publicHttps(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) &&
      !/(^|\.)(localhost|local|internal|invalid|test|example\.(com|org|net))$/i.test(u.hostname);
  } catch { return false; }
}
export function configuration(env = process.env) {
  if (env.WATCHTVSPORT_REVIEW_ENABLED !== 'true') reject(503, 'Espace prive non active.');
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const origin = env.WATCHTVSPORT_REVIEW_ORIGIN;
  let base, home;
  try { base = new URL(url); home = new URL(origin); } catch { reject(503, 'Configuration privee incomplete.'); }
  const local = env.NODE_ENV !== 'production' && home.protocol === 'http:' && ['localhost','127.0.0.1'].includes(home.hostname);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash || !key || typeof key !== 'string' || key.startsWith('sb_secret_') || key.length > 4096 || /[\r\n]/.test(key)) reject(503, 'Configuration privee invalide.');
  if ((!local && home.protocol !== 'https:') || home.origin !== origin || home.username || home.password) reject(503, 'Origine privee invalide.');
  if (key.includes('.')) {
    try { if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon') reject(503, 'Cle publique requise.'); }
    catch { reject(503, 'Cle publique requise.'); }
  } else if (!key.startsWith('sb_publishable_')) reject(503, 'Cle publique requise.');
  return {url:base.origin, key, origin:home.origin, secure:!local};
}
function cookies(request, secure) {
  const prefix = secure ? '__Secure-wts-review-' : 'wts-review-';
  const result = {};
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [raw,...rest] = part.trim().split('=');
    if (!raw.startsWith(prefix)) continue;
    const name = raw.slice(prefix.length);
    if (Object.hasOwn(result,name)) reject(401, 'Session ambigue. Reconnectez-vous.');
    const val = rest.join('=');
    if (val.length > 4096 || !/^[A-Za-z0-9._~-]*$/.test(val)) reject(401, 'Session invalide.');
    result[name] = val;
  }
  return result;
}
export function sameOrigin(request, origin) {
  if (request.headers.get('origin') !== origin || ['cross-site','same-site'].includes(request.headers.get('sec-fetch-site'))) reject(403, 'Origine non autorisee.');
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) reject(415, 'JSON requis.');
}
async function readJson(request, limit = 16000) {
  if (Number(request.headers.get('content-length')) > limit) reject(413, 'Requete trop volumineuse.');
  if (!request.body) reject(400, 'Corps manquant.');
  const reader = request.body.getReader();
  const parts = []; let bytes = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      bytes += value.length; if (bytes > limit) { await reader.cancel(); reject(413, 'Requete trop volumineuse.'); }
      parts.push(value);
    }
    const parsed = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!plain(parsed)) reject(400, 'Objet JSON requis.');
    return parsed;
  } catch (error) { if (error instanceof ReviewError) throw error; reject(400, 'JSON invalide.'); }
}
function securityHeaders(nonce) {
  return {'Cache-Control':'private, no-store, max-age=0', 'CDN-Cache-Control':'no-store', 'Vercel-CDN-Cache-Control':'no-store',
    'X-Robots-Tag':'noindex, nofollow, noarchive', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`};
}
// The transport uses only the public project key and the current user's JWT.
// No service-role key, browser storage, public layout or analytics is involved.
export function makeHandler({env = process.env, fetcher = fetch} = {}) {
  return async function handle(request) {
    const nonce = randomBytes(18).toString('base64');
    const headers = new Headers(securityHeaders(nonce));
    const send = (data, status = 200, type = 'application/json; charset=utf-8') => {
      headers.set('Content-Type',type);
      return new Response(type.startsWith('application/json') ? JSON.stringify(data) : data,{status,headers});
    };
    let config;
    const cookie = (name,value,maxAge=604800) => {
      const prefix = config.secure ? '__Secure-wts-review-' : 'wts-review-';
      if (!/^[A-Za-z0-9._~-]*$/.test(value) || value.length > 4096) reject(502, 'Session recue invalide.');
      headers.append('Set-Cookie',`${prefix}${name}=${value}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secure ? '; Secure' : ''}`);
    };
    const clear = () => { cookie('access','',0); cookie('refresh','',0); };
    try {
      config = configuration(env);
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/$/,'');
      if (!['GET','POST'].includes(request.method)) return send({error:'Methode non autorisee.'},405);
      if (request.method === 'POST') sameOrigin(request, config.origin);
      const call = async (path, token = '', body = undefined) => {
        let response;
        try {
          response = await fetcher(config.url + path, {method:body === undefined ? 'GET':'POST', cache:'no-store',
            redirect:'error', signal:AbortSignal.timeout(8000), headers:{apikey:config.key, ...(token ? {Authorization:`Bearer ${token}`} : {}), 'Content-Type':'application/json'},
            ...(body === undefined ? {} : {body:JSON.stringify(body)})});
        } catch { reject(503, 'Service indisponible. Aucune decision confirmee.'); }
        if (response.status === 429) { headers.set('Retry-After','60'); reject(429, 'Trop de tentatives. Reessayez dans une minute.'); }
        if (!response.ok) {
          let detail = {}; try { detail = await response.json(); } catch { /* Never echo upstream messages or secrets. */ }
          if (detail.code === '40001' || detail.code === '23505') reject(409, 'La fiche a change. Actualisez avant de decider.');
          if (detail.code === '22023' || detail.code === '23514') reject(422, 'Preuve ou correction incomplete. Verifiez les champs et la justification.');
          if (detail.code === '42501' || response.status === 401 || response.status === 403) reject(403, 'Connexion ou autorisation refusee.');
          if (response.status === 400 && path.startsWith('/auth/')) reject(401, 'Identifiants ou code invalides.');
          reject(503, 'Le service de revue est indisponible ou non configure.');
        }
        if (response.status === 204) return null;
        const text = await response.text();
        if (text.length > 1500000) reject(502, 'Reponse trop volumineuse.');
        try { return text ? JSON.parse(text) : null; } catch { reject(502, 'Reponse invalide.'); }
      };
      const rpc = (name,token,body={}) => call('/rest/v1/rpc/'+name,token,body);
      const tokenCookies = cookies(request,config.secure);
      let token = tokenCookies.access || '';
      let identity, user;
      const saveTokens = data => {
        if (!data || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string') reject(502, 'Session incomplete.');
        token = data.access_token; cookie('access',token); cookie('refresh',data.refresh_token);
      };
      const authorize = async (elevated = true) => {
        if (!token) reject(401, 'Connectez-vous pour continuer.');
        try { user = await call('/auth/v1/user',token); }
        catch (error) {
          if (!(error instanceof ReviewError) || ![401,403].includes(error.status) || !tokenCookies.refresh) throw error;
          saveTokens(await call('/auth/v1/token?grant_type=refresh_token','',{refresh_token:tokenCookies.refresh}));
          user = await call('/auth/v1/user',token);
        }
        if (!user || !UUID.test(user.id)) reject(401, 'Session invalide.');
        identity = await rpc('wts_review_identity',token);
        if (identity?.member !== true) { clear(); reject(403, 'Compte non autorise pour cet espace.'); }
        if (elevated && identity.elevated !== true) reject(401, 'Double authentification requise.');
      };
      if (request.method === 'GET' && path === '/admin/manifest.webmanifest') return send(manifest,200,'application/manifest+json; charset=utf-8');
      if (request.method === 'GET' && path === '/admin/icon.svg') return send(icon,200,'image/svg+xml');
      if (request.method === 'GET' && path === '/admin/login') return send(page('login',nonce),200,'text/html; charset=utf-8');
      if (request.method === 'POST' && path === '/admin/api/login') {
        const body = await readJson(request,4096);
        if (typeof body.email !== 'string' || body.email.length > 254 || typeof body.password !== 'string' || body.password.length > 1024) reject(400, 'Identifiants invalides.');
        const result = await call('/auth/v1/token?grant_type=password','',{email:body.email.trim(),password:body.password});
        token = result?.access_token || '';
        await authorize(false);
        saveTokens(result);
        const factor = (user.factors || []).find(f => f.factor_type === 'totp' && f.status === 'verified');
        return send({ok:true, next:identity.elevated ? 'review':'mfa', factor_id:factor?.id || null});
      }
      if (request.method === 'POST' && path === '/admin/api/logout') {
        if (token) { try { await call('/auth/v1/logout?scope=local',token,{}); } catch { /* Cookies still cleared; tokens are never exposed. */ } }
        clear(); return send({ok:true});
      }
      if (request.method === 'GET' && ['/admin','/admin/review'].includes(path)) {
        try { await authorize(); }
        catch (error) {
          if (error instanceof ReviewError && [401,403].includes(error.status)) { headers.set('Location','/admin/login'); return new Response(null,{status:303,headers}); }
          throw error;
        }
        return send(page('review',nonce),200,'text/html; charset=utf-8');
      }
      const allowed = ['/admin/api/enroll','/admin/api/verify','/admin/api/queue','/admin/api/lookups','/admin/api/decision'];
      if (!allowed.includes(path)) return send({error:'Page introuvable.'},404);
      await authorize(!['/admin/api/enroll','/admin/api/verify'].includes(path));
      if (request.method === 'POST' && path === '/admin/api/enroll') {
        if ((user.factors || []).some(f => f.status === 'verified')) reject(409, 'Utilisez le facteur deja active.');
        // Enrolment never removes or replaces an existing verified factor.
        const factor = await call('/auth/v1/factors',token,{factor_type:'totp',friendly_name:'WatchTVSport Review'});
        return send({factor_id:factor.id,secret:factor.totp.secret});
      }
      if (request.method === 'POST' && path === '/admin/api/verify') {
        const body = await readJson(request,4096);
        if (!UUID.test(body.factor_id) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code) || !(user.factors || []).some(f => f.id === body.factor_id && f.factor_type === 'totp')) reject(400, 'Facteur ou code invalide.');
        const challenge = await call('/auth/v1/factors/'+body.factor_id+'/challenge',token,{});
        saveTokens(await call('/auth/v1/factors/'+body.factor_id+'/verify',token,{challenge_id:challenge.id,code:body.code}));
        await authorize(); return send({ok:true});
      }
      if (request.method === 'GET' && path === '/admin/api/queue') {
        const tab = url.searchParams.get('tab') || 'pending';
        if (!['pending','research','history'].includes(tab)) reject(400, 'Onglet invalide.');
        const offset = Number(url.searchParams.get('offset') || 0);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) reject(400, 'Pagination invalide.');
        return send(await rpc('wts_review_queue',token,{p_tab:tab,p_offset:offset}));
      }
      if (request.method === 'GET' && path === '/admin/api/lookups') return send(await rpc('wts_review_lookups',token));
      if (request.method === 'POST' && path === '/admin/api/decision') {
        const command = validateCommand(await readJson(request));
        return send(await rpc('wts_review_decide',token,{p_command:command}));
      }
      return send({error:'Methode non autorisee.'},405);
    } catch (error) {
      const status = error instanceof ReviewError ? error.status : 500;
      return send({error:error instanceof ReviewError ? error.message : 'Erreur interne. Aucune decision confirmee.'},status);
    }
  };
}
export const handleReviewRequest = makeHandler();
