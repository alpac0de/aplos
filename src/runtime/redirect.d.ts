/**
 * Sentinel returned by a route middleware to short-circuit navigation.
 */
export interface AplosRedirect {
	__aplosRedirect: true;
	to: string;
	replace: boolean;
}

export interface RedirectOptions {
	/** Replace the current history entry instead of pushing a new one. Defaults to `true`. */
	replace?: boolean;
}

/**
 * Ask Aplos to navigate elsewhere before the matched route renders.
 *
 * @param to Destination path (e.g. `/login`).
 */
export function redirect(to: string, options?: RedirectOptions): AplosRedirect;

/**
 * Type guard for values returned by {@link redirect}.
 */
export function isRedirect(value: unknown): value is AplosRedirect;
