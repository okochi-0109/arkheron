import { registerSW } from 'virtual:pwa-register';

/**
 * Service Workerの登録と自動更新。
 *
 * Vite側は毎回のビルドでファイル名にコンテンツハッシュを付ける（例: index-XXXX.js）ため、
 * コードを1文字でも変えればビルド成果物は自動的に「別バージョン」になる。
 * ここではその新しいバージョンを、開いたままのタブでも自動で検知して
 * 確認なしで即座に反映する（registerType: 'autoUpdate' の意図に合わせる）。
 * これにより、手動でバージョン番号を上げる作業は不要になる。
 */
export function setupPWA(): void {
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // タブを開きっぱなしにしていても新しいビルドに気づけるよう、定期的に確認する
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    },
  });
}
