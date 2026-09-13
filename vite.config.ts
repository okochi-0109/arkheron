import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages（プロジェクトサイト）は https://<user>.github.io/arkheron/ 配下で配信されるため、
// 本番ビルドのみベースパスを/arkheron/にする（開発サーバーはこれまで通りルート/のまま）。
const BASE_PATH = '/arkheron/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE_PATH : '/',
  server: {
    // 同じWi-Fi内の他端末（スマホ等）からアクセスできるように全インターフェースで待ち受ける
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 登録・更新チェックは src/pwa.ts から virtual:pwa-register で明示的に行う
      // （自動更新の挙動を自前で制御し、二重登録を避けるため）
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Arkheron 試合振り返り',
        short_name: 'Arkheron振り返り',
        description:
          'Arkheron部活動の試合振り返り専用アプリ。自己評価・ピア評価・教員記録を記録します。',
        theme_color: '#12142a',
        background_color: '#12142a',
        display: 'standalone',
        orientation: 'portrait',
        // start_url/scopeは指定しない → vite-plugin-pwaがbase（本番は/arkheron/）から自動設定する
        icons: [
          {
            src: 'icons.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        // 新しいSWを即座に有効化し、開いているタブの制御も直ちに引き継ぐ
        // （registerType: 'autoUpdate' のデフォルトでも有効だが、明示しておく）
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}))
