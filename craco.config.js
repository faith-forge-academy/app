module.exports = {
  webpack: {
    configure: (config) => {
      // Suppress known upstream warning from @huggingface/transformers
      config.ignoreWarnings = [
        { message: /Critical dependency: Accessing import\.meta/ },
      ];
      // Use 'self' as the global object so the webpack runtime works correctly
      // inside Web Workers (where `this` is undefined in strict mode)
      config.output = {
        ...config.output,
        globalObject: 'self',
      };
      // Prevent webpack from splitting @huggingface/transformers into async chunks
      // that the worker loads via importScripts() — keep the worker bundle self-contained
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'initial',
        },
      };
      return config;
    },
  },
};
