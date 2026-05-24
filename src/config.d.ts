/**
 * Server configuration block.
 */
export interface AplosServerConfig {
	port?: number | string;
}

/**
 * A single head tag entry (meta, link, script, …). Attributes are free-form
 * since they map directly to HTML attributes.
 */
export type AplosHeadTag = Record<string, string | number | boolean | undefined>;

/**
 * Head configuration used to render the document <head>.
 */
export interface AplosHeadConfig {
	defaultTitle?: string;
	titleTemplate?: string;
	htmlAttributes?: Record<string, string>;
	meta?: AplosHeadTag[];
	link?: AplosHeadTag[];
	script?: AplosHeadTag[];
}

/**
 * A route rewrite/redirect or a programmatic route definition.
 */
export interface AplosRoute {
	source?: string;
	destination?: string;
	path?: string;
	component?: string;
	file?: string;
	requirements?: Record<string, string>;
}

/**
 * Base shape of an `aplos.config.js` export. Projects typically extend this
 * with their own `publicRuntimeConfig` fields, so additional keys are allowed.
 *
 * To get precise typing for project-specific keys, pass your own config type
 * as the generic argument to {@link getConfig}.
 */
export interface AplosConfig {
	reactStrictMode?: boolean;
	server?: AplosServerConfig;
	head?: AplosHeadConfig;
	routes?: AplosRoute[];
	publicRuntimeConfig?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Returns the resolved Aplos configuration (merged defaults + `aplos.config.js`).
 *
 * Pass a project-specific config type to get precise typing for custom keys
 * such as `publicRuntimeConfig`:
 *
 * @example
 *   import getConfig from 'aplos/config';
 *
 *   interface MyConfig extends AplosConfig {
 *     publicRuntimeConfig: { api_base_url: string };
 *   }
 *
 *   const { publicRuntimeConfig } = getConfig<MyConfig>();
 *   publicRuntimeConfig.api_base_url; // typed as string
 */
export default function getConfig<T extends AplosConfig = AplosConfig>(): T;
