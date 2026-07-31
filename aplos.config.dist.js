export default {
    // React configuration
    reactStrictMode: true,
    
    // Server configuration
    server: {
        port: 3001,
        // false (default): a busy port falls back to the next free one.
        // true: fail instead. Use this when something outside the dev server has
        // memorised the port (a reverse proxy registration, a docker port
        // mapping, an OAuth redirect URI), where falling back would silently
        // point that other side at nothing.
        strictPort: false,
    },
    
    // Client-side runtime configuration
    publicRuntimeConfig: {
        api_base_url: process.env.API_BASE_URL || "https://api.example.com",
    },
    
    // Routes configuration
    routes: [
        {
            source: '/custom',
            destination: '/custom-page'
        },
        {
            path: '/blog/:id',
            component: 'BlogPost',
            file: 'pages/blog/[id]',
            requirements: {
                id: '\\d+'  // Numbers only
            }
        }
    ]
};