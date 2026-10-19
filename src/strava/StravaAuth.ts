// Připojení ke Stravě (SPEC 6.1): přihlášení, uložení a obnova tokenů.
// Tokeny a Client Secret se nikdy nelogují ani nevypisují do hlášek.

/// <reference types="node" />
import { Platform, requestUrl } from "obsidian";
import type { BetterFormSettings } from "../settings/settings";
import {
	LOCAL_AUTH_PORT,
	LOCAL_REDIRECT_URI,
	MANUAL_REDIRECT_URI,
	STRAVA_TOKEN_URL,
	buildAuthorizeUrl,
	codeExchangeBody,
	describeStravaError,
	needsRefresh,
	parseTokenResponse,
	randomState,
	readCallback,
	readPastedCode,
	refreshBody,
	type StravaTokens,
} from "./oauth";
import { t } from "../i18n";

/** To málo z Node modulu http, co lokální přihlášení potřebuje (modul se načítá až v desktopové aplikaci). */
interface LocalServer {
	close(): void;
	on(event: "error", listener: (err: Error & { code?: string }) => void): void;
	listen(port: number, host: string, onListening: () => void): void;
}

interface HttpModule {
	createServer(
		handler: (
			req: { url?: string },
			res: { writeHead(status: number, headers?: Record<string, string>): { end(): void }; end(body?: string): void },
		) => void,
	): LocalServer;
}

/** Jak dlouho čeká lokální server na návrat z prohlížeče. */
const LOCAL_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

const DONE_PAGE = (message: string) =>
	`<!doctype html><html lang="cs"><meta charset="utf-8"><title>Better Form</title>` +
	`<body style="font-family:sans-serif;padding:2em"><h2>Better Form</h2><p>${message}</p></body></html>`;

/** Náhodné číslo 0–1 z kryptografického generátoru (pro parametr state). */
function secureRandom(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

export class StravaAuth {
	/** `state` posledního ručně spuštěného přihlášení (pro kontrolu vloženého kódu). */
	private manualState: string | null = null;
	private server: LocalServer | null = null;

	constructor(
		private readonly settings: () => BetterFormSettings,
		private readonly save: () => Promise<void>,
	) {}

	get hasCredentials(): boolean {
		const { clientId, clientSecret } = this.settings().strava;
		return clientId.trim() !== "" && clientSecret.trim() !== "";
	}

	get isConnected(): boolean {
		return this.settings().strava.refreshToken !== "";
	}

	/** Přihlášení přes dočasný server na localhost jde jen na počítači. */
	get canUseLocalServer(): boolean {
		return Platform.isDesktopApp;
	}

	/**
	 * Počítač: otevře Stravu v prohlížeči, na localhost zachytí návrat a vymění
	 * kód za tokeny. Skončí chybou při zamítnutí, obsazeném portu nebo vypršení.
	 */
	async connectWithLocalServer(): Promise<void> {
		this.requireCredentials();
		if (!this.canUseLocalServer) throw new Error(t("On mobile, use manual connection."));
		const state = randomState(secureRandom);
		const code = await this.waitForLocalCallback(state, () => {
			window.open(buildAuthorizeUrl(this.settings().strava.clientId, LOCAL_REDIRECT_URI, state));
		});
		await this.exchange(code);
	}

	/** Ruční cesta, 1. krok: otevře Stravu; po povolení uživatel zkopíruje adresu z prohlížeče. */
	openManualAuthorization(): void {
		this.requireCredentials();
		this.manualState = randomState(secureRandom);
		window.open(buildAuthorizeUrl(this.settings().strava.clientId, MANUAL_REDIRECT_URI, this.manualState));
	}

	/** Ruční cesta, 2. krok: vložená adresa (nebo samotný kód) → tokeny. */
	async connectWithPastedCode(text: string): Promise<void> {
		this.requireCredentials();
		const result = readPastedCode(text, this.manualState);
		if (!result.ok) throw new Error(result.error);
		await this.exchange(result.code);
		this.manualState = null;
	}

	/** Zapomene tokeny v tomto zařízení (přístup na Stravě zůstane, dokud ho uživatel nezruší tam). */
	async disconnect(): Promise<void> {
		this.stopServer();
		const strava = this.settings().strava;
		strava.accessToken = "";
		strava.refreshToken = "";
		strava.expiresAt = 0;
		strava.athleteName = "";
		await this.save();
	}

	/** Platný access token; podle potřeby ho nejdřív obnoví. */
	async accessToken(): Promise<string> {
		const strava = this.settings().strava;
		if (!this.isConnected) throw new Error(t("Strava isn't connected – connect it in the settings."));
		if (strava.accessToken && !needsRefresh(strava.expiresAt, Date.now() / 1000)) return strava.accessToken;
		this.requireCredentials();
		const tokens = await this.requestTokens(refreshBody(strava.clientId, strava.clientSecret, strava.refreshToken));
		await this.store(tokens);
		return tokens.accessToken;
	}

	/** Ukončí případný běžící lokální server (při vypnutí pluginu). */
	dispose(): void {
		this.stopServer();
	}

	// ---------- Vnitřní ----------

	private requireCredentials(): void {
		if (!this.hasCredentials) throw new Error(t("Fill in the Client ID and Client Secret first."));
	}

	private async exchange(code: string): Promise<void> {
		const { clientId, clientSecret } = this.settings().strava;
		await this.store(await this.requestTokens(codeExchangeBody(clientId, clientSecret, code)));
	}

	private async requestTokens(body: Record<string, string>): Promise<StravaTokens> {
		let status: number;
		let json: unknown;
		try {
			const response = await requestUrl({
				url: STRAVA_TOKEN_URL,
				method: "POST",
				contentType: "application/x-www-form-urlencoded",
				body: new URLSearchParams(body).toString(),
				throw: false,
			});
			status = response.status;
			try {
				json = response.json;
			} catch {
				json = null;
			}
		} catch {
			// Záměrně bez původní chyby – mohla by obsahovat tělo požadavku s tajným klíčem.
			throw new Error(t("Couldn't connect to Strava – check your internet connection."));
		}
		if (status < 200 || status >= 300) throw new Error(describeStravaError(status, json));
		const tokens = parseTokenResponse(json);
		if (!tokens) throw new Error(t("Strava returned an unexpected response."));
		return tokens;
	}

	private async store(tokens: StravaTokens): Promise<void> {
		const strava = this.settings().strava;
		strava.accessToken = tokens.accessToken;
		strava.refreshToken = tokens.refreshToken;
		strava.expiresAt = tokens.expiresAt;
		if (tokens.athleteName) strava.athleteName = tokens.athleteName;
		await this.save();
	}

	private stopServer(): void {
		this.server?.close();
		this.server = null;
	}

	private waitForLocalCallback(state: string, onListening: () => void): Promise<string> {
		// Node je dostupný jen v desktopové aplikaci (a kontrola v connectWithLocalServer).
		if (!Platform.isDesktop) {
			return Promise.reject(new Error(t("On mobile, use manual connection.")));
		}
		this.stopServer();
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- modul http jen v desktopové aplikaci, načítá se až při přihlášení
		const http = require("http") as HttpModule;
		return new Promise<string>((resolve, reject) => {
			let settled = false;
			const finish = (action: () => void) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timer);
				this.stopServer();
				action();
			};
			const server = http.createServer((req, res) => {
				const url = new URL(req.url ?? "/", LOCAL_REDIRECT_URI);
				if (url.pathname !== "/callback") {
					res.writeHead(404).end();
					return;
				}
				const result = readCallback(url.searchParams, state);
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(DONE_PAGE(result.ok ? t("Done – you can go back to Obsidian and close this window.") : result.error));
				finish(() => (result.ok ? resolve(result.code) : reject(new Error(result.error))));
			});
			const timer = window.setTimeout(
				() => finish(() => reject(new Error(t("Sign-in wasn't completed within 5 minutes. Try again.")))),
				LOCAL_AUTH_TIMEOUT_MS,
			);
			server.on("error", (err: Error & { code?: string }) => {
				const message =
					err.code === "EADDRINUSE"
						? t("Port {LOCAL_AUTH_PORT} is in use – use manual connection.", { LOCAL_AUTH_PORT })
						: t("Couldn't start the local sign-in server – use manual connection.");
				finish(() => reject(new Error(message)));
			});
			this.server = server;
			// Jen na localhost – server není dostupný z okolní sítě.
			server.listen(LOCAL_AUTH_PORT, "127.0.0.1", onListening);
		});
	}
}
