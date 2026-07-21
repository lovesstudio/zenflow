interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  INTERNAL_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID?: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  LINE_PAY_CHANNEL_ID?: string;
  LINE_PAY_CHANNEL_SECRET?: string;
  LINE_PAY_API_URL?: string;
  LINE_LOGIN_CHANNEL_ID?: string;
  LINE_LOGIN_CHANNEL_SECRET?: string;
  SESSION_SIGNING_SECRET?: string;
  APP_ORIGIN?: string;
}

type FirestoreValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type NotificationPhase = 'booking' | 'payment';

let googleTokenCache: { token: string; expiresAt: number } | null = null;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' }
});

const base64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
};

const base64UrlToBytes = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const randomBase64Url = (byteLength = 32) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

async function hmacSha256Base64Url(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

async function signPayload(secret: string, payload: Record<string, unknown>) {
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${await hmacSha256Base64Url(secret, encoded)}`;
}

async function verifySignedPayload<T>(secret: string, signed: string | undefined): Promise<T | null> {
  if (!signed) return null;
  const [encoded, signature] = signed.split('.');
  if (!encoded || !signature) return null;
  const expected = await hmacSha256Base64Url(secret, encoded);
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  if (mismatch !== 0) return null;
  try { return JSON.parse(fromBase64Url(encoded)) as T; } catch { return null; }
}

async function oauthEncryptionKey(secret: string) {
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`zenflow-oauth-state:${secret}`));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptOAuthState(secret: string, payload: OAuthState) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await oauthEncryptionKey(secret),
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decryptOAuthState(secret: string, encryptedState: string | null): Promise<OAuthState | null> {
  if (!encryptedState) return null;
  const [ivText, cipherText] = encryptedState.split('.');
  if (!ivText || !cipherText) return null;
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlToBytes(ivText) },
      await oauthEncryptionKey(secret),
      base64UrlToBytes(cipherText)
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as OAuthState;
  } catch {
    return null;
  }
}

function getCookies(request: Request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

const cookie = (name: string, value: string, options: string) => `${name}=${encodeURIComponent(value)}; Path=/; ${options}`;

function appOrigin(request: Request, env: Env) {
  return (env.APP_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');
}

function safeReturnTo(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

const pemToBytes = (pem: string) => {
  const normalized = pem.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

async function getGoogleAccessToken(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  if (googleTokenCache && googleTokenCache.expiresAt > now + 60) return googleTokenCache.token;

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(env.FIREBASE_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status} ${await response.text()}`);
  const data = await response.json() as { access_token: string; expires_in: number };
  googleTokenCache = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

const firestoreBase = (env: Env) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/${encodeURIComponent(env.FIREBASE_DATABASE_ID || '(default)')}/documents`;

const encodeDocumentPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

function decodeValue(value?: FirestoreValue): any {
  if (!value) return undefined;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields || {});
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value: any): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } };
}

async function getDocument(env: Env, path: string) {
  const token = await getGoogleAccessToken(env);
  const response = await fetch(`${firestoreBase(env)}/${encodeDocumentPath(path)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore GET ${path} failed: ${response.status} ${await response.text()}`);
  const document = await response.json() as FirestoreDocument;
  return decodeFields(document.fields || {});
}

async function patchDocument(env: Env, path: string, fields: Record<string, any>) {
  const token = await getGoogleAccessToken(env);
  const masks = Object.keys(fields).map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  const response = await fetch(`${firestoreBase(env)}/${encodeDocumentPath(path)}?${masks}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)])) })
  });
  if (!response.ok) throw new Error(`Firestore PATCH ${path} failed: ${response.status} ${await response.text()}`);
}

type OAuthState = { state: string; nonce: string; verifier: string; returnTo: string; exp: number };
type SessionMember = {
  id: string;
  name: string;
  birthday: string;
  gender: string;
  level: string;
  role: string;
  roles: string[];
  lineUserId: string;
  createdAt: number;
};
type LoginSession = { memberId: string; lineUserId: string; member?: SessionMember; exp: number };

function requireLoginConfiguration(env: Env) {
  return Boolean(env.LINE_LOGIN_CHANNEL_ID && env.LINE_LOGIN_CHANNEL_SECRET && env.SESSION_SIGNING_SECRET);
}

function missingBindings(env: Env, names: Array<keyof Env>) {
  return names.filter(name => !env?.[name]);
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  return message
    .replace(/(client_secret|access_token|id_token|assertion|private_key)["'=:\s]+[^\s&",}]+/gi, '$1=[REDACTED]')
    .slice(0, 1500);
}

async function startLineLogin(request: Request, env: Env) {
  if (!requireLoginConfiguration(env)) return json({ error: 'LINE_LOGIN_NOT_CONFIGURED' }, 503);
  const url = new URL(request.url);
  const canonicalOrigin = appOrigin(request, env);
  if (url.origin !== canonicalOrigin) {
    return Response.redirect(`${canonicalOrigin}${url.pathname}${url.search}`, 302);
  }
  const state = randomBase64Url();
  const nonce = randomBase64Url();
  const verifier = randomBase64Url(48);
  const oauthState: OAuthState = {
    state,
    nonce,
    verifier,
    returnTo: safeReturnTo(url.searchParams.get('returnTo')),
    exp: Date.now() + 10 * 60 * 1000
  };
  const signedState = await signPayload(env.SESSION_SIGNING_SECRET!, oauthState);
  const encryptedState = await encryptOAuthState(env.SESSION_SIGNING_SECRET!, oauthState);
  const redirectUri = `${appOrigin(request, env)}/api/auth/line/callback`;
  const authorize = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: redirectUri,
    state: encryptedState,
    scope: 'openid profile',
    nonce,
    code_challenge: await sha256Base64Url(verifier),
    code_challenge_method: 'S256',
    bot_prompt: 'normal'
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': cookie('zf_oauth', signedState, 'HttpOnly; Secure; SameSite=None; Max-Age=600')
    }
  });
}

async function exchangeLineLoginCode(request: Request, env: Env, code: string, verifier: string) {
  const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appOrigin(request, env)}/api/auth/line/callback`,
      client_id: env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: env.LINE_LOGIN_CHANNEL_SECRET!,
      code_verifier: verifier
    })
  });
  if (!response.ok) throw new Error(`LINE Login token exchange failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<{ id_token: string; access_token: string }>;
}

async function verifyLineIdToken(env: Env, idToken: string, nonce: string) {
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_LOGIN_CHANNEL_ID!, nonce })
  });
  if (!response.ok) throw new Error(`LINE ID token verification failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<{ sub: string; name?: string; picture?: string; email?: string }>;
}

async function upsertLineMember(env: Env, profile: { sub: string; name?: string; picture?: string; email?: string }) {
  const identityPath = `lineIdentities/${profile.sub}`;
  const identity = await getDocument(env, identityPath);
  const memberId = typeof identity?.memberId === 'string' ? identity.memberId : `line_${profile.sub}`;
  const existing = await getDocument(env, `members/${memberId}`);
  const now = Date.now();
  const member = {
    ...(existing || {}),
    id: memberId,
    name: profile.name || existing?.name || 'LINE 會員',
    birthday: existing?.birthday || '',
    gender: existing?.gender || '女',
    level: existing?.level || '一般',
    role: existing?.role || 'member',
    roles: Array.isArray(existing?.roles) ? existing.roles : ['member'],
    lineUserId: profile.sub,
    linePictureUrl: profile.picture || existing?.linePictureUrl || '',
    lineEmail: profile.email || existing?.lineEmail || '',
    createdAt: existing?.createdAt || now,
    lineLastLoginAt: now
  };
  await patchDocument(env, `members/${memberId}`, member);
  await patchDocument(env, identityPath, { memberId, lineUserId: profile.sub, updatedAt: now });
  return member;
}

async function finishLineLogin(request: Request, env: Env) {
  const requestId = crypto.randomUUID();
  let stage = 'configuration';
  try {
    const missingLoginBindings = missingBindings(env, [
      'LINE_LOGIN_CHANNEL_ID',
      'LINE_LOGIN_CHANNEL_SECRET',
      'SESSION_SIGNING_SECRET'
    ]);
    if (missingLoginBindings.length) {
      return json({
        ok: false,
        error: 'LINE_LOGIN_NOT_CONFIGURED',
        stage,
        missingBindings: missingLoginBindings,
        requestId
      }, 503);
    }

    stage = 'oauth_state_validation';
    const url = new URL(request.url);
    const oauthCookie = getCookies(request).zf_oauth;
    const cookieState = await verifySignedPayload<OAuthState>(env.SESSION_SIGNING_SECRET!, oauthCookie);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const encryptedState = await decryptOAuthState(env.SESSION_SIGNING_SECRET!, returnedState);
    const stateCookie = cookieState || encryptedState;
    const stateSourcesAgree = !cookieState || !encryptedState || cookieState.state === encryptedState.state;
    if (url.searchParams.get('error')) {
      return json({ ok: false, error: 'LINE_LOGIN_DENIED', stage, lineError: url.searchParams.get('error'), requestId }, 400);
    }
    if (!code || !stateCookie || stateCookie.exp < Date.now() || !stateSourcesAgree) {
      return json({
        ok: false,
        error: 'INVALID_OR_EXPIRED_OAUTH_STATE',
        stage,
        diagnostics: {
          hasCode: Boolean(code),
          hasOAuthCookie: Boolean(oauthCookie),
          validSignedCookie: Boolean(cookieState),
          validEncryptedState: Boolean(encryptedState),
          recoveredFromEncryptedState: Boolean(!cookieState && encryptedState),
          stateMatches: stateSourcesAgree,
          stateExpired: Boolean(stateCookie && stateCookie.exp < Date.now())
        },
        requestId
      }, 400);
    }

    stage = 'line_token_exchange';
    const tokens = await exchangeLineLoginCode(request, env, code, stateCookie.verifier);

    stage = 'line_id_token_verification';
    const profile = await verifyLineIdToken(env, tokens.id_token, stateCookie.nonce);
    if (!/^U[0-9a-f]{32}$/i.test(profile.sub)) {
      return json({ ok: false, error: 'INVALID_LINE_USER_ID', stage, requestId }, 400);
    }

    stage = 'firebase_member_upsert';
    const missingFirebaseBindings = missingBindings(env, [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ]);
    const fallbackMember: SessionMember = {
      id: `line_${profile.sub}`,
      name: profile.name || 'LINE 會員',
      birthday: '',
      gender: '女',
      level: '一般',
      role: 'member',
      roles: ['member'],
      lineUserId: profile.sub,
      createdAt: Date.now()
    };
    let member: any = fallbackMember;

    if (missingFirebaseBindings.length > 0) {
      console.warn('LINE Login skipping Firebase persistence due to missing Firebase credentials', {
        requestId,
        missingBindings: missingFirebaseBindings
      });
    } else {
      try {
        member = await upsertLineMember(env, profile);
      } catch (fbError) {
        console.warn('Firebase member upsert failed, continuing with fallback session member', {
          requestId,
          error: safeErrorMessage(fbError)
        });
        member = fallbackMember;
      }
    }

    stage = 'session_creation';
    const session = await signPayload(env.SESSION_SIGNING_SECRET!, {
      memberId: member.id,
      lineUserId: profile.sub,
      member: {
        id: member.id,
        name: member.name || fallbackMember.name,
        birthday: member.birthday || '',
        gender: member.gender || '女',
        level: member.level || '一般',
        role: member.role || 'member',
        roles: Array.isArray(member.roles) ? member.roles : ['member'],
        lineUserId: profile.sub,
        createdAt: Number(member.createdAt) || fallbackMember.createdAt
      },
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    } satisfies LoginSession);
    const redirect = new URL(stateCookie.returnTo, appOrigin(request, env));
    redirect.searchParams.set('lineLogin', 'success');
    const headers = new Headers({ location: redirect.toString() });
    headers.append('set-cookie', cookie('zf_session', session, 'HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'));
    headers.append('set-cookie', cookie('zf_oauth', '', 'HttpOnly; Secure; SameSite=None; Max-Age=0'));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('LINE Login callback failed', { requestId, stage, error });
    return json({
      ok: false,
      error: 'LINE_LOGIN_CALLBACK_FAILED',
      stage,
      message: safeErrorMessage(error),
      requestId
    }, 500);
  }
}

async function getLoginSession(request: Request, env: Env) {
  if (!env.SESSION_SIGNING_SECRET) return json({ authenticated: false });
  const session = await verifySignedPayload<LoginSession>(env.SESSION_SIGNING_SECRET, getCookies(request).zf_session);
  if (!session || session.exp < Date.now()) return json({ authenticated: false });
  const missingFirebaseBindings = missingBindings(env, [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ]);
  if (!missingFirebaseBindings.length) {
    try {
      const member = await getDocument(env, `members/${session.memberId}`);
      if (member?.lineUserId === session.lineUserId) return json({ authenticated: true, member, persistence: 'firebase' });
    } catch (error) {
      console.warn('Firebase session lookup failed; using signed session fallback', {
        memberId: session.memberId,
        error: safeErrorMessage(error)
      });
    }
  }
  if (session.member?.lineUserId !== session.lineUserId) return json({ authenticated: false });
  return json({ authenticated: true, member: session.member, persistence: 'session' });
}

function logoutLineSession() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': cookie('zf_session', '', 'HttpOnly; Secure; SameSite=Lax; Max-Age=0')
    }
  });
}

const uniqueLineUserIds = (values: unknown[]) => [...new Set(values.filter(
  (value): value is string => typeof value === 'string' && /^U[0-9a-f]{32}$/i.test(value.trim())
).map(value => value.trim()))];

async function stableRetryKey(orderId: string, phase: string) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${orderId}:${phase}`)));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function sendLineMulticast(env: Env, recipients: string[], text: string, retryKey: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'content-type': 'application/json',
      'x-line-retry-key': retryKey
    },
    body: JSON.stringify({ to: recipients, messages: [{ type: 'text', text }], notificationDisabled: false })
  });
  if (!response.ok) throw new Error(`LINE multicast failed: ${response.status} ${await response.text()}`);
}

async function hmacSha256Base64(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  let binary = '';
  signature.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function callLinePay(env: Env, uri: string, body: Record<string, unknown>) {
  if (!env.LINE_PAY_CHANNEL_ID || !env.LINE_PAY_CHANNEL_SECRET) return json({ error: 'LINE_PAY_NOT_CONFIGURED' }, 503);
  const nonce = crypto.randomUUID();
  const bodyText = JSON.stringify(body);
  const signature = await hmacSha256Base64(env.LINE_PAY_CHANNEL_SECRET, `${env.LINE_PAY_CHANNEL_SECRET}${uri}${bodyText}${nonce}`);
  const response = await fetch(`${env.LINE_PAY_API_URL || 'https://sandbox-api-pay.line.me'}${uri}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-line-channelid': env.LINE_PAY_CHANNEL_ID,
      'x-line-authorization-nonce': nonce,
      'x-line-authorization': signature
    },
    body: bodyText
  });
  const result = await response.json() as any;
  return json(result, response.ok ? 200 : response.status);
}

async function requestLinePay(request: Request, env: Env) {
  const input = await request.json() as { amount?: number; orderId?: string; productName?: string; confirmUrl?: string; cancelUrl?: string };
  if (!input.orderId || !input.confirmUrl || !input.cancelUrl) return json({ error: 'INVALID_LINE_PAY_REQUEST' }, 400);
  const order = await getDocument(env, `orders/${input.orderId}`);
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404);
  const amount = Number(order.finalPrice);
  if (!Number.isInteger(amount) || amount <= 0) return json({ error: 'INVALID_ORDER_AMOUNT' }, 400);
  const allowedOrigin = new URL(request.url).origin;
  if (new URL(input.confirmUrl).origin !== allowedOrigin || new URL(input.cancelUrl).origin !== allowedOrigin) return json({ error: 'INVALID_REDIRECT_ORIGIN' }, 400);
  return callLinePay(env, '/v3/payments/request', {
    amount,
    currency: 'TWD',
    orderId: input.orderId,
    packages: [{
      id: 'zenflow_pkg', amount, name: 'ZEN FLOW 預約服務',
      products: [{ id: 'course', name: input.productName || 'ZEN FLOW 預約服務', quantity: 1, price: amount }]
    }],
    redirectUrls: { confirmUrl: input.confirmUrl, cancelUrl: input.cancelUrl }
  });
}

async function confirmLinePay(request: Request, env: Env) {
  const input = await request.json() as { transactionId?: string; orderId?: string };
  if (!input.transactionId || !input.orderId) return json({ error: 'TRANSACTION_AND_ORDER_REQUIRED' }, 400);
  const order = await getDocument(env, `orders/${input.orderId}`);
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404);
  const amount = Number(order.finalPrice);
  const uri = `/v3/payments/${encodeURIComponent(input.transactionId)}/confirm`;
  const lineResponse = await callLinePay(env, uri, { amount, currency: 'TWD' });
  const result = await lineResponse.clone().json() as any;
  if (result.returnCode === '0000') {
    await patchDocument(env, `orders/${input.orderId}`, {
      paymentMethod: 'LINE PAY (已線上結帳)',
      linePayTransactionId: String(input.transactionId),
      linePayPaidAt: new Date().toISOString()
    });
    const notification = await notifyBookingSuccess(env, input.orderId, 'payment');
    if (!notification.body.ok) console.error('Payment confirmed but LINE notification failed', notification.body);
  }
  return new Response(lineResponse.body, { status: lineResponse.status, headers: lineResponse.headers });
}

async function resolveRecipients(env: Env, order: any) {
  const customer = order.memberId ? await getDocument(env, `members/${order.memberId}`) : null;
  const therapistKey = order.therapistMemberId || order.therapistId || order.therapistPreference;
  const therapist = therapistKey ? await getDocument(env, `staffDirectory/${therapistKey}`) : null;
  const settings = await getDocument(env, 'settings/lineNotifications');

  return uniqueLineUserIds([
    order.customerLineUserId,
    customer?.lineUserId,
    order.therapistLineUserId,
    therapist?.lineUserId,
    order.receptionistLineUserId,
    settings?.receptionistLineUserId,
    ...(Array.isArray(settings?.receptionistLineUserIds) ? settings.receptionistLineUserIds : [])
  ]);
}

async function notifyBookingSuccess(env: Env, orderId: string, phase: NotificationPhase) {
  const order = await getDocument(env, `orders/${orderId}`);
  if (!order) return { status: 404, body: { ok: false, error: 'ORDER_NOT_FOUND' } };
  if (order.status === 'cancelled') return { status: 409, body: { ok: false, error: 'ORDER_CANCELLED' } };

  const sentPhases: string[] = Array.isArray(order.lineNotificationSentPhases) ? order.lineNotificationSentPhases : [];
  if (sentPhases.includes(phase)) return { status: 200, body: { ok: true, alreadySent: true } };

  const recipients = await resolveRecipients(env, order);
  if (!recipients.length) return { status: 422, body: { ok: false, error: 'NO_LINE_RECIPIENTS' } };

  const serviceName = order.isFitness ? '健身預約' : '運動按摩預約';
  const message = `【Loves | ZEN FLOW】預約成功通知\n\n您好，系統提醒您在 ${order.date || '日期未定'} ${order.time || '時間未定'} 有一筆${serviceName}，請準時出席 / 準備接待。`;
  const retryKey = await stableRetryKey(orderId, phase);
  await sendLineMulticast(env, recipients, message, retryKey);

  await patchDocument(env, `orders/${orderId}`, {
    lineNotificationSentPhases: [...sentPhases, phase],
    lineNotificationSentAt: new Date().toISOString(),
    lineNotificationRecipientCount: recipients.length,
    lineNotificationStatus: 'sent'
  });
  return { status: 200, body: { ok: true, recipientCount: recipients.length } };
}

async function verifyInternalRequest(request: Request, env: Env) {
  const received = request.headers.get('x-zenflow-webhook-secret') || '';
  if (!received || !env.INTERNAL_WEBHOOK_SECRET) return false;
  const expectedMac = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.INTERNAL_WEBHOOK_SECRET)));
  const receivedMac = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(received)));
  return expectedMac.length === receivedMac.length && expectedMac.every((byte, index) => byte === receivedMac[index]);
}

async function verifyLineSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = Uint8Array.from(atob(signature), char => char.charCodeAt(0));
  return mac.length === expected.length && mac.every((byte, index) => byte === expected[index]);
}

async function handleLineWebhook(request: Request, env: Env) {
  const rawBody = await request.text();
  const valid = await verifyLineSignature(rawBody, request.headers.get('x-line-signature'), env.LINE_CHANNEL_SECRET);
  if (!valid) return json({ ok: false, error: 'INVALID_LINE_SIGNATURE' }, 401);
  const payload = JSON.parse(rawBody) as { events?: Array<{ type?: string; source?: { userId?: string } }> };
  // Webhook 已通過驗證。LINE User ID 必須再透過會員綁定流程寫入 members 或 staffDirectory。
  // 此處刻意不把未綁定的 User ID 自動配對到任何會員，避免認錯人。
  return json({ ok: true, receivedEvents: payload.events?.length || 0 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/api/auth/line/start') {
        return startLineLogin(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/auth/line/callback') {
        return finishLineLogin(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        return getLoginSession(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        return logoutLineSession();
      }
      if (request.method === 'POST' && url.pathname === '/api/line/webhook') {
        return handleLineWebhook(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/linepay/request') {
        return requestLinePay(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/linepay/confirm') {
        return confirmLinePay(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/notifications/booking-success') {
        if (!(await verifyInternalRequest(request, env))) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
        const body = await request.json() as { orderId?: string; phase?: NotificationPhase };
        if (!body.orderId) return json({ ok: false, error: 'ORDER_ID_REQUIRED' }, 400);
        const phase: NotificationPhase = body.phase === 'payment' ? 'payment' : 'booking';
        const result = await notifyBookingSuccess(env, body.orderId, phase);
        return json(result.body, result.status);
      }
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('ZEN FLOW Worker error', error);
      return json({ ok: false, error: 'INTERNAL_ERROR' }, 500);
    }
  }
};
