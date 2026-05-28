export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://trillo-client.vercel.app'
    }
  }
});
