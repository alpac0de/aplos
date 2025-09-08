export default {
    // React configuration
    reactStrictMode: true,
    
    // Server configuration
    server: {
        port: 3001,
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