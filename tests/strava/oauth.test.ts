import { describe, expect, it } from "vitest";
import {
	LOCAL_REDIRECT_URI,
	buildAuthorizeUrl,
	codeExchangeBody,
	describeStravaError,
	needsRefresh,
	parseTokenResponse,
	randomState,
	readCallback,
	readPastedCode,
	refreshBody,
} from "../../src/strava/oauth";

describe("buildAuthorizeUrl", () => {
	it("obsahuje ID aplikace, návratovou adresu, oprávnění a state", () => {
		const url = new URL(buildAuthorizeUrl(" 12345 ", LOCAL_REDIRECT_URI, "abc"));
		expect(url.origin + url.pathname).toBe("https://www.strava.com/oauth/authorize");
		expect(url.searchParams.get("client_id")).toBe("12345");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:28547/callback");
		expect(url.searchParams.get("scope")).toBe("activity:read_all");
		expect(url.searchParams.get("state")).toBe("abc");
	});
});

describe("readCallback", () => {
	const params = (query: string) => new URLSearchParams(query);

	it("vrátí kód, když sedí state i oprávnění", () => {
		expect(readCallback(params("state=abc&code=XYZ&scope=read,activity:read_all"), "abc")).toEqual({ ok: true, code: "XYZ" });
	});

	it("odmítne cizí state", () => {
		expect(readCallback(params("state=jiny&code=XYZ&scope=read,activity:read_all"), "abc").ok).toBe(false);
	});

	it("zamítnutí na Stravě", () => {
		expect(readCallback(params("state=abc&error=access_denied"), "abc")).toEqual({
			ok: false,
			error: "Přístup jsi na Stravě zamítl.",
		});
	});

	it("odškrtnuté čtení aktivit", () => {
		const result = readCallback(params("state=abc&code=XYZ&scope=read"), "abc");
		expect(result.ok).toBe(false);
	});

	it("chybějící kód", () => {
		expect(readCallback(params("state=abc"), "abc").ok).toBe(false);
	});
});

describe("readPastedCode", () => {
	it("celá adresa z prohlížeče", () => {
		const url = "http://localhost/better-form?state=abc&code=XYZ123&scope=read,activity:read_all";
		expect(readPastedCode(`  ${url}\n`, "abc")).toEqual({ ok: true, code: "XYZ123" });
		expect(readPastedCode(url, "jiny").ok).toBe(false);
	});

	it("samotný kód", () => {
		expect(readPastedCode("a1b2c3", "abc")).toEqual({ ok: true, code: "a1b2c3" });
	});

	it("prázdný nebo nesmyslný vstup", () => {
		expect(readPastedCode("   ", null).ok).toBe(false);
		expect(readPastedCode("tohle není kód!", null).ok).toBe(false);
	});
});

describe("těla požadavků", () => {
	it("výměna kódu", () => {
		expect(codeExchangeBody(" 1 ", " tajne ", "KOD")).toEqual({
			client_id: "1",
			client_secret: "tajne",
			code: "KOD",
			grant_type: "authorization_code",
		});
	});

	it("obnova tokenu", () => {
		expect(refreshBody("1", "tajne", "REF")).toEqual({
			client_id: "1",
			client_secret: "tajne",
			refresh_token: "REF",
			grant_type: "refresh_token",
		});
	});
});

describe("parseTokenResponse", () => {
	it("přečte tokeny a jméno sportovce", () => {
		expect(
			parseTokenResponse({
				token_type: "Bearer",
				expires_at: 1790000000,
				expires_in: 21600,
				refresh_token: "REF",
				access_token: "ACC",
				athlete: { id: 1, firstname: "Jan", lastname: "Novák" },
			}),
		).toEqual({ accessToken: "ACC", refreshToken: "REF", expiresAt: 1790000000, athleteName: "Jan Novák" });
	});

	it("obnova tokenu jméno neposílá", () => {
		expect(parseTokenResponse({ expires_at: 1790000000, refresh_token: "REF2", access_token: "ACC2" })).toEqual({
			accessToken: "ACC2",
			refreshToken: "REF2",
			expiresAt: 1790000000,
		});
	});

	it("neúplná odpověď = null", () => {
		expect(parseTokenResponse(null)).toBeNull();
		expect(parseTokenResponse({ access_token: "ACC" })).toBeNull();
		expect(parseTokenResponse({ access_token: "ACC", refresh_token: "REF", expires_at: "zítra" })).toBeNull();
	});
});

describe("needsRefresh", () => {
	it("obnovuje 5 minut před koncem platnosti", () => {
		expect(needsRefresh(10_000, 9_000)).toBe(false); // zbývá 1000 s
		expect(needsRefresh(10_000, 9_700)).toBe(true); // zbývá 300 s
		expect(needsRefresh(10_000, 11_000)).toBe(true); // vypršel
		expect(needsRefresh(0, 1_790_000_000)).toBe(true); // žádný token
	});
});

describe("describeStravaError", () => {
	it("limit požadavků", () => {
		expect(describeStravaError(429, null)).toContain("15 minut");
	});

	it("neplatný kód, špatné údaje aplikace, zrušené přihlášení", () => {
		const error = (resource: string, field: string) => ({ message: "Bad Request", errors: [{ resource, field, code: "invalid" }] });
		expect(describeStravaError(400, error("AuthorizationCode", "code"))).toContain("Kód už neplatí");
		expect(describeStravaError(400, error("Application", "client_id"))).toContain("Client ID");
		expect(describeStravaError(401, error("Application", ""))).toContain("Client ID");
		expect(describeStravaError(400, error("RefreshToken", "refresh_token"))).toContain("připoj se znovu");
	});

	it("výpadek a neznámá chyba", () => {
		expect(describeStravaError(503, null)).toContain("výpadek");
		expect(describeStravaError(418, null)).toBe("Strava vrátila chybu 418.");
	});
});

describe("randomState", () => {
	it("24 znaků [a-z0-9]", () => {
		expect(randomState()).toMatch(/^[a-z0-9]{24}$/);
		expect(randomState(() => 0)).toBe("0".repeat(24));
	});
});
