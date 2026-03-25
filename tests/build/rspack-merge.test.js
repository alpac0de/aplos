import { describe, test, expect } from 'bun:test';
import { merge } from 'webpack-merge';

describe('rspack config merge with webpack-merge', () => {
    const frameworkConfig = {
        mode: 'development',
        module: {
            rules: [
                { test: /\.(js|tsx)$/, use: 'babel-loader' },
                { test: /\.css$/, use: ['css-loader'] },
            ],
        },
        resolve: {
            alias: { '@': '/src' },
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        plugins: ['framework-plugin'],
    };

    test('adds new module rules without removing existing ones', () => {
        const userConfig = {
            module: {
                rules: [
                    { test: /\.md$/, type: 'asset/source' },
                ],
            },
        };

        const result = merge(frameworkConfig, userConfig);

        expect(result.module.rules).toHaveLength(3);
        expect(result.module.rules[2]).toEqual({ test: /\.md$/, type: 'asset/source' });
        // Framework rules still present
        expect(result.module.rules[0].use).toBe('babel-loader');
        expect(result.module.rules[1].use).toEqual(['css-loader']);
    });

    test('adds new plugins without removing existing ones', () => {
        const userConfig = {
            plugins: ['user-plugin'],
        };

        const result = merge(frameworkConfig, userConfig);

        expect(result.plugins).toHaveLength(2);
        expect(result.plugins).toContain('framework-plugin');
        expect(result.plugins).toContain('user-plugin');
    });

    test('adds new resolve aliases without removing existing ones', () => {
        const userConfig = {
            resolve: {
                alias: { '~content': '/content' },
            },
        };

        const result = merge(frameworkConfig, userConfig);

        expect(result.resolve.alias['@']).toBe('/src');
        expect(result.resolve.alias['~content']).toBe('/content');
    });

    test('user can override a scalar value', () => {
        const userConfig = { mode: 'production' };

        const result = merge(frameworkConfig, userConfig);

        expect(result.mode).toBe('production');
    });

    test('empty user config returns framework config unchanged', () => {
        const result = merge(frameworkConfig, {});

        expect(result).toEqual(frameworkConfig);
    });

    test('user can override an existing alias', () => {
        const userConfig = {
            resolve: {
                alias: { '@': '/custom-src' },
            },
        };

        const result = merge(frameworkConfig, userConfig);

        expect(result.resolve.alias['@']).toBe('/custom-src');
    });
});
