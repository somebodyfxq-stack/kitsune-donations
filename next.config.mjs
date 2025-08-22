// next.config.mjs

export const allowedDevOrigins = [
  'https://a31d4d3db372.ngrok-free.app',
  'http://localhost:3000',
];

function webpackDevMiddleware(config) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: [
      '**/node_modules/**',
      '**/$RECYCLE.BIN/**',
      '**/System Volume Information/**',
    ],
  };
  return config;
}

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      webpackDevMiddleware(config);
    }
    return config;
  },
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
          {
            key: 'bypass-tunnel-reminder',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
