// next.config.mjs

export const allowedDevOrigins = [
  'https://your-ngrok-url.ngrok.app',
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
};

export default nextConfig;
