// OAuth Stravy (SPEC 6.1): sestavení adres, čtení odpovědí, platnost tokenu.
// Čisté funkce bez závislosti na Obsidianu – síť řeší StravaAuth.

import { t } from "../i18n";

export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
/** Oprávnění číst všechny aktivity včetně soukromých. */
export const STRAVA_SCOPE = "activity:read_all";

/** Port dočasného serveru na počítači (Authorization Callback Domain = localhost). */
export const LOCAL_AUTH_PORT = 28547;
export const LOCAL_REDIRECT_URI = `http://localhost:${LOCAL_AUTH_PORT}/callback`;
/** Ruční cesta: na této adrese nic neběží, uživatel zkopíruje adresu z prohlížeče. */
export const MANUAL_REDIRECT_URI = "http://localhost/better-form";

/** Access token se obnovuje s předstihem, aby nevypršel uprostřed synchronizace. */
export const REFRESH_MARGIN_S = 300;

export interface StravaTokens {
	accessToken: string;
	refreshToken: string;
	/** Konec platnosti access tokenu, unixový čas v sekundách. */
	expiresAt: number;
	/** Jméno sportovce; Strava ho posílá jen při prvním přihlášení. */
	athleteName?: string;
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId.trim(),
		response_type: "code",
		redirect_uri: redirectUri,
		approval_prompt: "auto",
		scope: STRAVA_SCOPE,
		state,
	});
	return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export type CallbackResult = { ok: true; code: string } | { ok: false; error: string };

/**
 * Přečte výsledek přihlášení z parametrů adresy, na kterou Strava přesměrovala.
 * Kontroluje `state` (ochrana proti podvržené odpovědi) a udělené oprávnění.
 */
export function readCallback(params: URLSearchParams, expectedState: string | null): CallbackResult {
	const error = params.get("error");
	if (error) {
		return {
			ok: false,
			error: error === "access_denied" ? t("You declined access on Strava.") : t("Strava returned an error: {error}.", { error }),
		};
	}
	const code = params.get("code")?.trim();
	if (!code) return { ok: false, error: t("The address is missing the code (code parameter).") };
	if (expectedState !== null && params.get("state") !== expectedState) {
		return { ok: false, error: t("The response doesn't belong to this sign-in – start connecting again.") };
	}
	const scope = params.get("scope");
	if (scope !== null && !scope.split(",").includes(STRAVA_SCOPE)) {
		return {
			ok: false,
			error: t("Permission to read activities is missing – when signing in, keep “View data about your private activities” checked."),
		};
	}
	return { ok: true, code };
}

/**
 * Ruční vložení: uživatel vloží celou adresu z prohlížeče, nebo jen samotný kód.
 * U samotného kódu nejde ověřit `state` ani oprávnění.
 */
export function readPastedCode(text: string, expectedState: string | null): CallbackResult {
	const trimmed = text.trim();
	if (!trimmed) return { ok: false, error: t("Paste the address from the browser or the code.") };
	const query = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?") + 1).split("#")[0]! : null;
	if (query !== null) return readCallback(new URLSearchParams(query), expectedState);
	if (/^[A-Za-z0-9]+$/.test(trimmed)) return { ok: true, code: trimmed };
	return { ok: false, error: t("This doesn't look like an address or code from Strava.") };
}

export function codeExchangeBody(clientId: string, clientSecret: string, code: string): Record<string, string> {
	return {
		client_id: clientId.trim(),
		client_secret: clientSecret.trim(),
		code,
		grant_type: "authorization_code",
	};
}

export function refreshBody(clientId: string, clientSecret: string, refreshToken: string): Record<string, string> {
	return {
		client_id: clientId.trim(),
		client_secret: clientSecret.trim(),
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	};
}

/** Přečte odpověď token endpointu; null, když v ní tokeny chybí. */
export function parseTokenResponse(json: unknown): StravaTokens | null {
	if (typeof json !== "object" || json === null) return null;
	const data = json as Record<string, unknown>;
	const { access_token: access, refresh_token: refresh, expires_at: expiresAt } = data;
	if (typeof access !== "string" || !access || typeof refresh !== "string" || !refresh) return null;
	if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
	const tokens: StravaTokens = { accessToken: access, refreshToken: refresh, expiresAt };
	const athlete = data.athlete;
	if (typeof athlete === "object" && athlete !== null) {
		const { firstname, lastname } = athlete as Record<string, unknown>;
		const name = [firstname, lastname].filter((part): part is string => typeof part === "string" && part !== "").join(" ");
		if (name) tokens.athleteName = name;
	}
	return tokens;
}

/** Je potřeba access token obnovit? (`nowS` = aktuální unixový čas v sekundách) */
export function needsRefresh(expiresAt: number, nowS: number): boolean {
	return expiresAt - nowS <= REFRESH_MARGIN_S;
}

/** Srozumitelná hláška k chybové odpovědi Stravy. Neobsahuje tokeny ani tajný klíč. */
export function describeStravaError(status: number, json: unknown): string {
	if (status === 429) return t("Strava temporarily limited the number of requests. Try again in 15 minutes.");
	const errors =
		typeof json === "object" && json !== null && Array.isArray((json as { errors?: unknown }).errors)
			? ((json as { errors: unknown[] }).errors as { resource?: unknown; field?: unknown; code?: unknown }[])
			: [];
	const first = errors[0];
	if (status === 400 || status === 401) {
		if (first?.field === "code") return t("The code is no longer valid (it can only be used once, briefly). Start connecting again.");
		if (first?.field === "client_id" || first?.resource === "Application") {
			return t("The Client ID or Client Secret doesn't match – check them in the settings.");
		}
		if (first?.field === "refresh_token" || first?.field === "access_token") {
			return t("The Strava sign-in expired or was revoked – connect again.");
		}
		return status === 401 ? t("Strava rejected the sign-in – connect again.") : t("Strava rejected the request – check the Client ID and Client Secret.");
	}
	if (status === 403) return t("Strava denied access – the application doesn't have the required permission.");
	if (status >= 500) return t("Strava is currently down. Try again later.");
	return t("Strava returned error {status}.", { status });
}

/** Náhodný řetězec pro parametr `state`. */
export function randomState(random: () => number = Math.random): string {
	let out = "";
	for (let i = 0; i < 24; i++) out += Math.floor(random() * 36).toString(36);
	return out;
}
