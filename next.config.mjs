function webpackDevMiddleware(config) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: [
      '**/node_modules/**',
      '**/$RECYCLE.BIN/**',
      '**/System Volume Information/**'
    ]
  };
}

export default {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) webpackDevMiddleware(config);
    return config;
  }
};
