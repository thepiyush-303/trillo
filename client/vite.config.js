export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://trillo-bqx1.onrender.com/'
    }
  }
});
