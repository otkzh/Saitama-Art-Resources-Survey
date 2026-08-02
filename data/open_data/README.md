# アート資源調査・公共施設一覧オープンデータ

`111007_public_facility.csv` は、デジタル庁「自治体標準オープンデータセット」の「公共施設一覧」を参考に、アーツカウンシルさいたまのアート資源調査データを整形したものです。

## 形式

- 先頭56列：デジタル庁「公共施設一覧」公式フォーマットと同じ項目名・順序
- 後続8列：本調査固有の拡張項目（元データID、施設分類、調査年度、公式掲載区分、公式掲載確認日、座標取得元、座標取得URL、データ提供者）
- 末尾16列：OpenStreetMap照合項目（照合状態、要素種別、OSM ID、名称、URL、距離、主要分類、住所、営業時間、電話番号、ウェブサイト、車椅子対応、運営者、最終更新日時、照合日、照合根拠）
- 文字コード：UTF-8（BOM付き）
- 改行コード：LF
- ファイル名：デジタル庁の命名規則 `[全国地方公共団体コード]_public_facility.csv` を採用

## 収録基準

- 元データ45件のうち、所在地と国土地理院住所検索APIの座標を確認できた37件を収録
- 所在地または座標を確認できない8件は、必須項目「所在地_連結表記」を満たさないため除外
- 「URL」には各施設の公式サイトではなく、アーツカウンシルさいたまの調査紹介記事を収録。各行の備考にもその旨を記載
- 「全国地方公共団体コード」は、調査主体がさいたま市に創設された支援組織であることに基づき、さいたま市の `111007` を設定。実際の公開主体が異なる場合は公開前に変更すること
- 「所在地_全国地方公共団体コード」は、J-LISの全国地方公共団体コードに基づき、各施設の所在区・市のコードを設定

## OpenStreetMap照合

- 2026-08-02時点のOpenStreetMapデータを、名称の全半角・記号・括弧内表記などを正規化し、国土地理院座標から原則350m以内の候補と照合
- 37件中、名称一致5件、表記揺れ・英字表記等からの推定一致6件、該当なし26件
- `OSM照合状態` が `推定一致` の行は、公開前に施設または現地情報との再確認を推奨
- 同一施設に建物と店舗POIの両方がある場合は、店舗タグまたはウェブサイトを持つPOIを優先
- `OSM住所`、`OSM営業時間`、`OSM電話番号`、`OSMウェブサイト`、`OSM車椅子対応`、`OSM運営者` は、該当OSM要素にタグがある場合のみ収録
- OpenStreetMap由来の列は Open Database License（ODbL）対象。公開・再利用時は `© OpenStreetMap contributors` の表示とODbLへのリンクが必要

再取得・付与スクリプト：

```bash
python3 scripts/enrich_osm.py
```

スクリプト内のOSM ID対応表は、誤結合を避けるため2026-08-02の目視確認結果を固定しています。再調査で対応を変更する場合は `REVIEWED_MATCHES` を更新してください。

## 公開前の確認事項

- データの二次利用条件・ライセンスは本CSV内で確定していません。公開ページで公開主体が明示してください。
- 施設名称、所在地、営業状況、紹介記事URLの最新性を確認してください。
- 空欄の推奨・任意項目は、不明な情報を推測せず未記入としています。

## 参照資料

- デジタル庁「自治体標準オープンデータセット（正式版）」
  - https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
- J-LIS「埼玉県内市町村」
  - https://www.j-lis.go.jp/spd/code-address/kantou/cms_13214181.html
- OpenStreetMap「Copyright and License」
  - https://www.openstreetmap.org/copyright
- OpenStreetMap Wiki「Overpass API / Overpass QL」
  - https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
- Nominatim「Usage Policy」
  - https://operations.osmfoundation.org/policies/nominatim/
