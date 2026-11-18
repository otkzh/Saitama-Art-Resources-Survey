# 背景地図切り替え

確認日：2026年11月18日。開発ブランチ：`feature/production-static-map`。

## 既存構造と変更範囲

- Vue 3 / TypeScript / Vite、npmとlockfileで依存管理。Leafletは1.9.4を維持。
- 地図の生成・破棄は `SpotMap.vue` のmounted / beforeUnmount。従来はconfig.jsonの地理院淡色タイルを1枚作成していた。
- スポットは独立したLayerGroupのMarker / Popup、検索起点は別LayerGroupのCircleMarker / Circle。JSONデータの検索・絞り込みは `domain.ts` とAppで実行する。
- 現行アプリにはLeafletのGeoJSONレイヤーはない。住所検索APIのGeoJSON形式の応答は、検索地点に変換して利用する。
- PCは地図と一覧を並列表示。760px以下は地図と一覧を縦に配置。一覧・詳細は既存のスクロール領域を維持。

背景専用Paneと管理クラスだけを追加し、背景選択では既存のスポット描画関数・検索条件・選択IDを変更しない。背景は常に1枚。切り替えでsetView / fitBoundsを呼ばず、全背景で共通のズーム範囲2〜18を使う。追加のGeoJSON等が別Pane・レイヤーに置かれた場合も、背景管理クラスはそれらを列挙・削除しない。

## 設定

URL・ラベル・出典を `web/src/maps/basemaps.ts` に集約。将来の変更時は同ファイルを更新してZIPを再生成する。旧config.jsonのtileUrl / tileAttribution / tileAttributionUrl / maxZoomは使用しない。住所検索の設定は従来どおりconfig.jsonで管理する。

| 表示 | ID | URL |
| --- | --- | --- |
| シンプル | positron | https://tiles.openfreemap.org/styles/positron |
| 街歩き | liberty | https://tiles.openfreemap.org/styles/liberty |
| 地理院（淡色） | pale | https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png |
| 航空写真 | seamlessphoto | https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg |
| 地理院 標準 | std | https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png |
| ダーク | dark | https://tiles.openfreemap.org/styles/dark |

## UI・保存・ライフサイクル

右上のボタンで背景選択を開く。通常の選択肢は4種類で、地理院標準とダークは「その他の背景地図」から選ぶ。CSSの簡易プレビューによりサムネイル用の追加通信は行わない。選択ボタンはaria-pressed、展開ボタンはaria-expandedを使用。Tab / Enter / Space / Escapeに対応し、選択後は開閉ボタンへフォーカスを戻す。スマートフォンでも44px以上の操作領域を確保する。

localStorageの `saitama-art-map.basemap.v1` に、利用者が選んだ背景IDだけを保存する。初期値はpositron。無効値・ストレージ拒否は初期値へ戻す。window / localStorageはmountedでのみ取得し、住所・現在地は保存しない。自動フォールバックでは利用者の保存した好みを上書きしない。

旧背景のタイル・WebGLマップ・リスナー・タイマーを破棄してから次を表示。MapLibreのコードとCSSは遅延ロードし、WorkerはZIP内のハッシュ付きファイルを使用する。遅れて届いた旧背景の応答は世代番号で無視する。

初期の致命的なスタイル失敗、WebGL2非対応、読み込み時間切れなどでは地理院淡色へ一度だけ切り替える。淡色も失敗した場合は案内を表示し、再帰的に切り替えない。一時的なタイルエラー1件では切り替えない。部分的な失敗を検知した場合も案内し、一覧やマーカーは保持する。Rasterは最初の1枚だけで完了扱いせず、可視タイルの読み込み終了を待つ。

## 依存とライセンス

- `maplibre-gl` 6.19.0：BSD-3-Clause。
- `@maplibre/maplibre-gl-leaflet` 0.1.4：ISC。
- Leaflet 1.9.4、Vue、既存のUI・ビルド構成を維持。新しいUIライブラリは追加していない。
- 追加ライセンス本文を納品物のTHIRD_PARTY_NOTICES.txtへ収録。

## 公式資料・利用条件

### OpenFreeMap

公式Quick StartはPositron / Liberty / Darkを掲載し、Leaflet用のMapLibre連携とVite向けWorkerの設定方法も提供している。

- https://openfreemap.org/quick_start/
- https://openfreemap.org/
- https://openfreemap.org/tos/ （確認時の更新日：2026年10月14日）
- https://github.com/maplibre/maplibre-gl-leaflet

公開インスタンスは登録・APIキー不要、無料で商用利用も可能。通常の地図閲覧・リクエスト回数の上限は設けられていない。ただし無保証で、サービス変更・停止の可能性がある。帰属表示は公式サンプルに合わせてOpenFreeMap・© OpenMapTiles・© OpenStreetMap contributorsをリンク付きで常時表示する。

独自の一括取得やオフライン保存は実装しない。オフライン取得を将来追加する場合は、1回3,000タイルまたは50MB以下、並列4以下、識別可能なUser-Agent等の条件を再確認する。

### 地理院タイル

- https://maps.gsi.go.jp/development/ichiran.html （URL・データ別の出典）
- https://maps.gsi.go.jp/development/siyou.html （XYZ方式等の仕様）
- https://maps.gsi.go.jp/help/termsofuse.html （アクセス制限等）
- https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html （コンテンツ利用規約）

指定されたpale / std / seamlessphotoのURLを公式一覧で確認。ウェブでリアルタイム表示する場合は出典の明示のみで申請不要と案内されている。APIキーは不要。サーバーの正常な運用を妨げる負荷は予告なく遮断される場合があり、無制限の可用性を保証するサービスとしては扱わない。

地理院タイルへの出典リンクを表示する。淡色の低ズームではVMAP0の出所、航空写真のズーム9〜13ではLandsat8等、2〜8ではNASA / USGS等を付記。航空写真の高ズームは写真の出典一覧へのリンクと、一部地域のGRUS画像（© Axelspace）を案内する。出典はズームと背景変更に追従し、長い場合は折り返す。出典をCSSで隠さず、表示高さに応じて凡例・エラー案内を避ける。

### キャッシュ・公開環境

配信元のHTTPキャッシュ指示をブラウザ・地図ライブラリが利用する。独自キャッシュ、Service Worker、タイルのZIP同梱は行わない。実サービス確認時のOpenFreeMapの応答では、スタイルはmax-age=86400、版付きタイル・スプライトはmax-age=315360000等を確認した。これらの値は将来の保証として固定しない。

公開先のCSPではtiles.openfreemap.org、cyberjapandata.gsi.go.jp、同梱Workerの起動等を許可する必要がある。サイト全体のCSPを置き換えず、実サイトの設置先で確認する。追加されたベクター描画コードは約1.06MB（gzip約292KB）、Workerは約550KB。初期アプリ本体とは分割している。

## 検証

- 型チェックとビルド成功。MapLibreを含むチャンクサイズの警告はあるが、ビルドエラーはない。
- 単体テスト22件：保存・無効値・拒否・出典、旧背景破棄、遅延応答、フォールバック上限、単発エラーからの回復等。
- 回帰・ブラウザテスト18件成功：PCとiPhone 13相当の画面サイズで各9件。6×6の全相互切り替え、マーカー位置（中心・ズームを反映する画面座標）の不変、背景1枚、ポップアップ保持、検索結果保持、保存復元、キーボード、障害時の一覧利用、既存機能を確認。ベクターは実際のMapLibre / WebGLを動かし、公開サービス応答だけを固定データへ差し替えている。
- 各切り替えのテストでアプリの未処理例外・予期しないconsole.errorがないことを確認。
- 公式サービス接続は別のopt-inテストで確認。コマンド例：

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
LIVE_BASEMAPS=1 PLAYWRIGHT_CHANNEL=chrome ./node_modules/.bin/playwright test basemaps-live.spec.ts
```

この環境のPythonによる直接リクエストではOpenFreeMapが403を返したが、Chromeでは3スタイルともHTTP 200で表示できた。別サービスへの置き換えは行っていない。PC・スマートフォン相当の両方で全6種類がrequestedとactualの一致したreadyになり、記録した応答はHTTP 200、アプリ未処理例外は0件だった。これは全世界・全ズームのデータ欠損や将来の可用性を保証するものではない。

ライブテストの結果JSON・スクリーンショットはdist内に保存し、公開ZIPには含めない。掲載許可の判定・26件の確認用データ・公開用ZIPの生成条件は変更していない。

## 未確認事項

アーツカウンシルさいたまの実サイトのCSP・埋め込み先、Safari / Firefox / Edge、スマートフォン実機、低性能端末でのGPU・メモリ挙動、全ズーム・全地域のデータの網羅性は未確認。これらは公開先で確認する。通常テストでは外部サービスに依存しないため、ライブ接続テストは既定でスキップする。

## 変更ファイル

- `package.json`、`package-lock.json`：追加依存。
- `web/src/maps/basemaps.ts`：カタログ・出典・選択保存。
- `web/src/maps/backgroundLayer.ts`：背景1枚のライフサイクル・フォールバック。
- `web/src/maps/vectorBasemap.ts`：Leaflet用MapLibreアダプター・同梱Worker。
- `web/src/components/BasemapSwitcher.vue`：切り替えUI。
- `web/src/components/SpotMap.vue`：既存地図との接続。
- `web/src/App.vue`：フッターの出典追従。
- `web/src/style.css`：プレビュー・レスポンシブUI・出典との重なり回避。
- `web/src/types.ts`、`web/src/services.ts`、`web/config.template.json`：旧背景設定を整理。
- `scripts/prepare-production-data.ts`：ライセンス表記を納品に追加。
- `tests/basemaps.test.ts`、`tests/backgroundLayer.test.ts`：単体テスト。
- `tests/e2e/basemaps.spec.ts`、`tests/e2e/basemaps-live.spec.ts`：切り替え・ライブ確認。
- `tests/e2e/map.spec.ts`：既存回帰テストの外部通信遮断を追加。
- `README.md`、`docs/production-install.txt`、`docs/production-development.md`、`docs/production-technology-selection.md`、本書：設置・保守資料。
