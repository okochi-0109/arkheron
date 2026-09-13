/**
 * UI検討事項の設定値。値を変えて保存するだけで各案をその場で試せます。
 * ①②③は確定済み（採用理由はCLAUDE.md参照）。他の値に戻すことも可能。
 */

/**
 * ①成長を見る画面: レーダーチャートの観点データが少ないときの見せ方 → 'bar' で確定
 * - 'radar' : 観点数に関わらず常にレーダーチャートを表示する（観点が少ないと直線になる）
 * - 'bar'   : 観点数が RADAR_SPARSE_THRESHOLD 未満のときは棒グラフに切り替える【採用】
 * - 'hide'  : 観点数が RADAR_SPARSE_THRESHOLD 未満のときはグラフを隠し、
 *             スコアをシンプルなテキスト一覧で表示する
 */
export type RadarSparseMode = 'radar' | 'bar' | 'hide';
export const RADAR_SPARSE_MODE: RadarSparseMode = 'bar';
export const RADAR_SPARSE_THRESHOLD = 3;

/**
 * ②一覧の削除ボタン（🗑）のタップ領域 → 'md' で確定
 * - 'sm' : 小さめ（誤操作防止優先）。アイコン・タップ領域とも現状サイズ
 * - 'md' : 見た目のアイコンサイズはそのまま、タップ領域だけ44x44pxに拡大【採用】
 * - 'lg' : アイコン自体も一回り大きくする
 */
export type DeleteButtonSize = 'sm' | 'md' | 'lg';
export const DELETE_BUTTON_SIZE: DeleteButtonSize = 'md';

/** 削除ボタン用のclassNameを組み立てる共通ヘルパー。 */
export function deleteButtonClass(): string {
  const sizeClass = DELETE_BUTTON_SIZE === 'md' ? ' size-md' : DELETE_BUTTON_SIZE === 'lg' ? ' size-lg' : '';
  return `icon-btn danger${sizeClass}`;
}

/**
 * ③ボトムナビのラベル文言 → 'full'（現状維持）で確定
 * - 'full'     : 教員記録／自己・ピア評価／成長を見る／設定【採用】
 * - 'short'    : 短縮ラベル（記録／評価／成長／設定）
 * - 'iconOnly' : アイコンのみ、ラベルテキストを非表示にする
 */
export type NavLabelStyle = 'full' | 'short' | 'iconOnly';
export const NAV_LABEL_STYLE: NavLabelStyle = 'full';
