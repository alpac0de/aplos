export default {
  reactStrictMode: true,
  server: {
    port: 3000,
  },
  head: {
    defaultTitle: '{{NAME}}',
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Built with Aplos' },
    ],
  },
};
