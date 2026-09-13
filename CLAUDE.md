# Arkheron 試合振り返りアプリ

## アプリの目的

Arkheron（NASEF主催の3人チーム制eスポーツ）を部活動でプレイした後の「試合振り返り」に特化したアプリ。
クラス全体で使う汎用評価ツールではなく、esports部内の「3人チーム」を母集団とする。

- **最優先事項**: 生徒自身が自分の成長を実感できること
- 外部有料ツール（J's GROW等）との連携はなし、完全自作・ローカル完結
- サーバー不要、完全オフラインで動作するPWA

## データモデル

Dexie.js（IndexedDB）で管理。定義は [src/db.ts](src/db.ts) 参照。

| テーブル | 主なフィールド | 備考 |
|---|---|---|
| `Student` | id, name（氏名）, attendanceNumber（出席番号）, className（クラス） | |
| `RubricItem`（評価観点） | id, name（観点名）, targetType（`self`/`peer`/`teacher`/`common`）, scaleMax（スケール、1〜4固定運用）, description（説明文） | |
| `Match`（試合/活動） | id, date, title, opponent（任意）, memo（任意） | Recordからmatchidで参照されるだけの疎結合設計。Match自体は生徒個人の評価データを一切保持しない（Phase2で公開可否フラグ・動画URL等を追加しても影響を受けない） |
| `EvalRecord`（評価ログ、テーブル名は`records`） | id, targetStudentId（評価される生徒）, authorType（`self`/`peer`/`teacher`）, authorStudentId（peerの場合のみ）, rubricItemId, score, comment（任意）, timestamp, matchId | 自己・ピア・教師の3種類の評価をすべて同じテーブルで扱う。削除以外の更新（編集）はなく、記録は追記のみ。commentは観点ごとのコメントタグ（複数可）＋任意の一言メモを`、`区切りで1本の文字列に結合して保存する（[src/commentTags.ts](src/commentTags.ts)の`composeComment()`）。タグ選択UIであり自由記述の代替だが、保存形式自体は変えていない |
| `OverallScore`（総合ふりかえりスコア、テーブル名は`overallScores`。Dexie version 2で追加） | id, matchId, studentId, score（0〜100）, timestamp | 観点別評価とは別に、生徒本人が試合全体をどう感じたかを1つの数値で記録する。試合・生徒の組み合わせごとに1件（[src/db.ts](src/db.ts)の`upsertOverallScore()`で同じ組み合わせは上書き） |

## 画面構成

| 画面 | ルート | ファイル | 概要 |
|---|---|---|---|
| ① 教員クイック記録 | `#/teacher` | [src/pages/TeacherQuickRecord.tsx](src/pages/TeacherQuickRecord.tsx) | 試合選択（既存選択/その場で新規作成）→生徒選択→観点選択→スコアをワンタップ→コメント（観点別タグチップ＋任意の一言メモ）→保存。直近の記録一覧を表示（削除可）。PINロック対象**外**（教員がその場で素早く記録できるよう認証なし） |
| ② 自己・ピア評価 | `#/me` | [src/pages/SelfPeerEvaluation.tsx](src/pages/SelfPeerEvaluation.tsx) | 「あなたは誰？」（画面を開くたびに確認、端末を回して使う想定のため状態は保持しない）→試合・活動選択→評価する相手選択（自分を選べば自己評価、他者を選べばピア評価に自動切替、自分には「(自分)」マーク）→**自己評価時は「数秒で終わる」二段構え**（下記参照）／ピア評価時は観点別記録がそのまま表示。自分が入力した記録だけを一覧表示（他の生徒のスコアは非表示）。PINロックなし |
| ③ 設定 | `#/settings` | [src/pages/Settings.tsx](src/pages/Settings.tsx) | 生徒・評価観点・試合のCRUD（登録・削除）。評価観点は初期6項目（主体性・協働・思考力・声かけ/コミュニケーション・状況判断・役割遂行）を一括投入するボタンあり。PIN管理（設定・変更・解除）もここに配置。**PINロック対象** |
| ④ 成長を見る（生徒詳細・推移ビュー） | `#/trend` | [src/pages/StudentTrend.tsx](src/pages/StudentTrend.tsx) | 「あなたは誰？」選択後、**2段階構成**で表示。詳細は下記参照 |
| ⑤ 部全体一覧（教員向け） | `#/roster` | [src/pages/TeacherRoster.tsx](src/pages/TeacherRoster.tsx) | 部員全員をカード一覧表示し、誰に声をかけるべきか一目で判断できるようにする画面。詳細は下記参照。**PINロック対象** |

### ②自己評価の「数秒で終わる」二段構え

観点を複数つけると時間がかかる問題への対応（2026-09-13）。**自己評価のときのみ**適用（ピア評価は観点別記録が主目的なので常に表示）。

1. 画面を開くとまず「今日のふりかえり」＝総合ふりかえりスコアのスライダー（0〜100）だけが大きく表示される。動かすだけで即座に保存され、「✓ 保存済み」が出る＝これだけで振り返り完了
2. 観点別のタグ付け・スコアは「＋ もっと詳しく記録する（観点別・任意）」ボタンの先に隠れており、デフォルトでは表示されない（任意であることが一目で分かる）
3. 展開すると「全部埋めなくて大丈夫です。気になった観点が1つだけでもOK。」という案内文を表示し、全観点を埋める必要がないことを明示する

## 教員用PINロック

- 対象は**設定・部全体一覧のみ**。教員クイック記録・自己/ピア評価・成長を見るは対象外（教員記録は試合中に素早く使う想定のため、生徒向け2画面はそもそも生徒本人が使うため認証なし）
- PIN自体はlocalStorageに平文で保存する「簡易」ロック（強固な認証は想定しない。生徒が誤って教員向け画面を開かないようにする程度の目的）。[src/teacherAuth.tsx](src/teacherAuth.tsx)
- 解錠状態はReact Context上のメモリ値のみで保持し、**ページを再読み込みすると再度PIN入力が必要**になる（タブを閉じずに使い続ける分には設定画面↔部全体一覧の行き来で再入力は不要）
- 初回は設定画面か部全体一覧のどちらかを開いた時点でPIN登録フォームが表示され、以後はそのPINでの解錠が必要になる。PINの変更・解除は設定画面内の「教員用PINロック」セクションから行う（[src/components/TeacherGate.tsx](src/components/TeacherGate.tsx)がゲートUI、実際にラップしているのは[src/App.tsx](src/App.tsx)のルート定義）

### ⑤ 部全体一覧

- 部員全員を1枚ずつカード表示し、それぞれ [src/analytics.ts](src/analytics.ts) の `buildStudentTrend()` / `generateInsight()` を**再利用**して算出した一言インサイトを添える（④成長を見るのデフォルト表示と全く同じロジック・同じ文言。新規ロジックの重複実装はしていない）
- インサイトのtoneと記録の有無から4状態に分類し、アイコン・枠色で一目で区別できるようにしている（状態分類自体はこの画面固有の表示ロジックで、analytics.tsの計算結果を読むだけ）
  - 📈/🤝 **伸びている**（`insight.tone`が`up`または`narrowing`）: 既存の`insight-up`/`insight-narrowing`カード色を流用
  - ➖ **変化なし**（記録はあるが目立った変化なし）: `insight-neutral`
  - 💤 **しばらく記録がない**（その生徒の記録が1件もない）: 破線枠の`insight-nodata`
- カードをタップすると `#/trend` に `navigate('/trend', { state: { studentId } })` で遷移し、「あなたは誰？」選択をスキップしてその生徒の詳細がそのまま開く（StudentTrend.tsx側で`location.state.studentId`を初期値として使用。stateがない通常のナビタブ経由アクセスは従来通り選択画面から）
- ナビゲーションでは教員向け2画面（教員記録・部全体一覧）を先頭にまとめ、生徒も使う画面との間に区切り線を入れて視覚的に区別している（[src/App.tsx](src/App.tsx)の`TEACHER_GROUP_SIZE`）

### ④ 成長を見るの2段階構成

- **デフォルト表示**（15秒以内で見終わる想定）: 直近の変化を1〜2文の短いポジティブなコメント＋アイコン/枠色で表示。ロジックは [src/analytics.ts](src/analytics.ts) の `generateInsight()`。優先順位は次の通り:
  1. 観点のスコアが2試合以上連続で上昇（📈 緑）
  2. 自己評価とまわり（ピア＋教員）の評価の差が縮小（🤝 青）
  3. 直近1試合で観点スコアが上昇（📈 緑）
  4. 該当なし・データ不足時のニュートラルな励まし文（✨）
- **詳細表示**（「もっと見る」で展開、任意）: 観点別バランスのレーダーチャート→**総合ふりかえりスコアの推移**（0〜100の折れ線グラフ、`OverallScore`テーブルが元データ）→観点ごとの自己評価/ピア評価の折れ線グラフ（全期間推移）→試合ごとの記録・コメント一覧（ピアの評価者名は匿名化し「ピア評価」とだけ表示）、の順で並べて表示

## 技術構成

- **PWA基盤**: Vite + React + TypeScript + `vite-plugin-pwa`（manifest・Service Worker自動生成、`registerType: autoUpdate`）。設定は [vite.config.ts](vite.config.ts)
- **UI**: React、軽量CSS（[src/index.css](src/index.css)、CSS変数によるダークテーマ）、スマホ縦画面優先のレイアウト（`.app-shell`は`max-width: 480px`）
- **ルーティング**: react-router-dom の `HashRouter`（静的ホスティングでもサーバー側のリライト設定が不要なため採用）
- **保存**: IndexedDB（Dexie.js、[src/db.ts](src/db.ts)）、サーバー不要、完全オフラインで動作。データ集計・購読は `dexie-react-hooks` の `useLiveQuery`（[src/hooks.ts](src/hooks.ts)）
- **グラフ**: Chart.js + react-chartjs-2（折れ線・レーダー・棒グラフ）
- **認証**: なし（端末＝生徒・教員本人という前提。将来必要ならPIN程度）

### 共通コンポーネント・フック（重複排除）

- [src/components/StudentChoiceGrid.tsx](src/components/StudentChoiceGrid.tsx): 生徒選択のグリッドUI（教員記録の生徒選択、自己・ピア評価の「あなたは誰？」「評価する相手」、成長を見るの「あなたは誰？」で共用）
- [src/components/MatchSummaryCard.tsx](src/components/MatchSummaryCard.tsx): 「試合・活動」カード（選択済み表示⇔MatchPickerの切り替え）を共通化（教員記録・自己ピア評価で共用）
- [src/hooks.ts](src/hooks.ts) の `useToast()`: 「保存しました」トースト表示の共通フック
- [src/db.ts](src/db.ts) の `todayString()`: 試合作成フォームの日付初期値の共通ヘルパー

## 運用上の注意点

- 生徒本人確認は自己申告制（認証なし）。他生徒のふりをしてスコアをつけることは技術的には可能だが、Phase1では運用でカバーする前提
- 「自己・ピア評価」画面と「成長を見る」画面の「あなたは誰？」は、画面を開くたびにリセットされ、端末に記憶されない（複数生徒が同じ端末を回して使う想定のため）

## 今回のスコープ外（意図的に着手しない）

- Phase2の公開可否フラグ・動画/ハイライト・外部プレイヤー向けコミュニティ機能
- J's GROW等の外部ツール連携
- 生徒・観点・試合データの編集機能（Settings画面は登録・削除のみで、編集は未実装）
- ログイン認証・PINロック

## 開発コマンド

```bash
npm run dev       # 開発サーバー起動（Vite）
npm run build     # 型チェック（tsc -b）＋ 本番ビルド（PWA生成含む）
npm run preview   # 本番ビルドをローカルでプレビュー
```

## Service Workerの自動更新について

コードを変更してビルドするたびに手動でバージョン番号を上げる作業が発生していた問題への対応。

- Viteはビルドごとにファイル名へコンテンツハッシュを付与する（例: `index-XXXX.js`）ため、コードを1文字でも変えればビルド成果物は自動的に別バージョンになる。**この部分はもともと自動**。
- 問題は「新しいバージョンが出たことを、開いたままのタブが検知して反映する」部分に自動更新ロジックが無かったこと（[dist/registerSW.js](dist/registerSW.js)相当のデフォルト生成スクリプトは登録するだけで、更新チェックをしていなかった）。
- [src/pwa.ts](src/pwa.ts) で `virtual:pwa-register` を使って明示的に登録し直し、新しいSWを検知したら確認なしで即座に反映（`updateSW(true)`）、さらに1時間ごとに更新チェックする仕組みを追加した（[src/main.tsx](src/main.tsx) から呼び出し）。
- [vite.config.ts](vite.config.ts) 側は `injectRegister: false`（自動注入スクリプトを止めて上記に一本化）、`workbox: { skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true }` を明示（`registerType: 'autoUpdate'` のデフォルトでも有効だが明示化）。
- 結果として、今後は **`npm run build` するだけで自動的にバージョンが上がり、ユーザー側の操作も不要** になっているはず（実機での最終確認は未実施、下記参照）。

## 既知の制限・確認事項

- Claude Codeデスクトップアプリの埋め込みブラウザ（Browser pane）では、同一オリジンのどんな静的JSファイルでもService Worker登録が `An unknown error occurred when fetching the script` で失敗することを確認済み。manifest・sw.js自体は正しく生成・配信されている（`npm run build`の出力、レスポンスヘッダーとも正常）ため、これは埋め込みブラウザ環境固有の制限と切り分け済み。**実際のChrome等での動作確認は別途必要**（下記「実機Chromeでの確認手順」参照）

### 実機Chromeでの確認手順（未実施・要手動確認）

このセッションではClaude in Chrome拡張機能が未接続（未インストールまたは未サインイン）のため、実Chromeでの自動確認ができませんでした。以下の手順で1〜2分あれば確認できます。

```bash
npm run build
npm run preview
```

1. 実Chromeで `http://localhost:4173` を開く
2. DevTools（F12）→ Application タブ → Service Workers で登録状態を確認
3. Application → Manifest でmanifestの内容・アイコンを確認、「Install」（アドレスバー右のインストールアイコン、または三点メニュー → 「Arkheronをインストール」）を試す
4. インストール後、Network タブを「Offline」にしてページをリロードし、オフラインでも表示されるか確認
5. （自動更新の確認）コードを1行変えて`npm run build`し直し、`npm run preview`のタブをリロードして新しい内容が反映されるか確認

問題があれば内容を教えてください。原因調査・修正を行います。

## 境界値・異常系のテスト結果

以下の組み合わせをブラウザ操作で実際に確認し、いずれもクラッシュせず適切なヒント文言（「不明」表示や「設定画面で登録してください」等）を表示することを確認済み。

- 生徒0人 / 評価観点0件 / 試合0件（すべて同時に0の状態も含む）
- 生徒が1人だけ（自己・ピア評価画面で相手候補が自分しかいない状態）
- 記録が参照している評価観点を後から削除した場合（成長を見る画面のグラフ・見出しが「不明」表示になり、クラッシュしない）

## UI検討事項（確定済み）

[src/uiOptions.ts](src/uiOptions.ts) に切り替え可能な設定としてまとめ、実際のスクリーンショット比較（Artifact）で見比べたうえで以下の通り確定した（2026-09-13）。他の案に戻したい場合も、該当の定数を書き換えるだけで良い。

1. **成長を見る画面のレーダーチャート**（`RADAR_SPARSE_MODE`）→ **`'bar'` を採用**。観点データが少ない（`RADAR_SPARSE_THRESHOLD`＝3項目未満）うちは棒グラフに切り替える（`'radar'`のまま常時レーダー表示すると、観点2件時に多角形にならず直線になってしまうため）。`'hide'`（テキスト一覧化）は不採用。
2. **一覧の削除ボタン（🗑）のタップ領域**（`DELETE_BUTTON_SIZE`）→ **`'md'` を採用**。見た目のアイコンサイズは現状のまま、タップ領域だけ44×44pxに拡大。`'lg'`（アイコン自体を拡大）は不採用。
3. **ボトムナビのラベル文言**（`NAV_LABEL_STYLE`）→ **`'full'`（現状維持）で確定**。「自己・ピア評価」が2行に折り返してナビの高さが不揃いになる不具合はフォントサイズ調整で修正済み（文言自体は変更なし）。
