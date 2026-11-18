const COLORS = {
  "ギャラリー・展示施設": "#b65339",
  "カフェ・飲食店": "#b17b22",
  "書店・ショップ": "#426b9b",
  "工房・アトリエ": "#397663",
  "文化施設・歴史・自然": "#687044",
  コミュニティスペース: "#74558d",
};
const FOOT_ROUTER_URL = "https://routing.openstreetmap.de/routed-foot/route/v1";
const GSI_ADDRESS_URL =
  "https://msearch.gsi.go.jp/address-search/AddressSearch";
const WARDS = [
  "西区",
  "北区",
  "大宮区",
  "見沼区",
  "中央区",
  "桜区",
  "浦和区",
  "南区",
  "緑区",
  "岩槻区",
  "市外",
  "区不明",
];
const TAG_ORDER = [
  "展示",
  "カフェ",
  "飲食",
  "本",
  "買い物",
  "工芸",
  "ワークショップ",
  "音楽",
  "子ども",
  "地域交流",
  "屋外",
  "福祉",
];
const SPOT_META = {
  1: { category: "ギャラリー・展示施設", tags: ["展示", "カフェ", "地域交流"] },
  2: { category: "コミュニティスペース", tags: ["地域交流", "イベント"] },
  4: { category: "ギャラリー・展示施設", tags: ["展示", "カフェ", "工芸"] },
  5: { category: "ギャラリー・展示施設", tags: ["展示", "カフェ", "子ども"] },
  7: { category: "ギャラリー・展示施設", tags: ["展示", "地域交流"] },
  8: { category: "書店・ショップ", tags: ["買い物", "雑貨", "地域交流"] },
  9: { category: "ギャラリー・展示施設", tags: ["展示", "工芸", "若手作家"] },
  10: {
    category: "コミュニティスペース",
    tags: ["子ども", "子育て", "地域交流"],
  },
  11: { category: "コミュニティスペース", tags: ["地域交流", "音楽"] },
  12: { category: "カフェ・飲食店", tags: ["カフェ", "飲食", "展示"] },
  13: { category: "ギャラリー・展示施設", tags: ["展示", "屋外", "イベント"] },
  14: {
    category: "コミュニティスペース",
    tags: ["地域交流", "歴史", "イベント"],
  },
  15: {
    category: "文化施設・歴史・自然",
    tags: ["屋外", "農業", "食育", "ワークショップ"],
  },
  16: { category: "カフェ・飲食店", tags: ["カフェ", "飲食", "展示", "音楽"] },
  17: {
    category: "工房・アトリエ",
    tags: ["子ども", "おもちゃ", "ワークショップ"],
  },
  18: { category: "カフェ・飲食店", tags: ["カフェ", "飲食", "地域交流"] },
  19: {
    category: "カフェ・飲食店",
    tags: ["カフェ", "飲食", "福祉", "地域交流"],
  },
  20: {
    category: "コミュニティスペース",
    tags: ["買い物", "飲食", "地域交流", "イベント"],
  },
  21: {
    category: "ギャラリー・展示施設",
    tags: ["展示", "カフェ", "地域交流"],
  },
  22: { category: "ギャラリー・展示施設", tags: ["展示", "工芸"] },
  23: {
    category: "工房・アトリエ",
    tags: ["展示", "工芸", "ワークショップ", "子ども"],
  },
  24: { category: "文化施設・歴史・自然", tags: ["展示", "木工", "学び"] },
  25: {
    category: "ギャラリー・展示施設",
    tags: ["展示", "画材", "ワークショップ"],
  },
  26: { category: "工房・アトリエ", tags: ["工芸", "福祉", "展示"] },
  27: { category: "書店・ショップ", tags: ["買い物", "展示", "工芸"] },
  28: { category: "文化施設・歴史・自然", tags: ["展示", "美術館", "子ども"] },
  29: { category: "ギャラリー・展示施設", tags: ["展示", "買い物"] },
  30: { category: "ギャラリー・展示施設", tags: ["展示", "カフェ", "音楽"] },
  31: {
    category: "ギャラリー・展示施設",
    tags: ["展示", "イベント", "地域交流"],
  },
  32: { category: "コミュニティスペース", tags: ["地域交流", "子ども"] },
  33: { category: "コミュニティスペース", tags: ["地域交流", "健康", "飲食"] },
  34: { category: "書店・ショップ", tags: ["本", "カフェ", "地域交流"] },
  35: { category: "ギャラリー・展示施設", tags: ["展示", "アーティスト"] },
  36: {
    category: "書店・ショップ",
    tags: ["買い物", "画材", "ワークショップ"],
  },
  38: {
    category: "コミュニティスペース",
    tags: ["子ども", "子育て", "地域交流"],
  },
  39: { category: "カフェ・飲食店", tags: ["カフェ", "飲食", "屋外"] },
  43: { category: "書店・ショップ", tags: ["買い物", "展示", "音楽"] },
};
let facilities = [],
  selectedWard = "すべて",
  selectedCategory = "すべて",
  selectedTags = new Set(),
  selectedDistance = 0,
  coordinateMode = false,
  map,
  layer,
  activeImage = 0,
  currentLocation = null,
  currentLocationMarker = null,
  currentAccuracyCircle = null,
  locationRequest = null,
  nearbyLocation = null,
  addressMarker = null,
  routingControl = null,
  activeRouteFacility = "",
  routeState = { facilityId: "", status: "idle", message: "" };
const markers = new Map();
const escapeHtml = (value) =>
  String(value || "").replace(
    /[&<>'"]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[c],
  );
const safeUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
function objects(text) {
  const rows = parseCsv(text),
    headers = rows.shift() || [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((h, i) => [h, values[i] || ""])),
  );
}
function json(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function embeddedCsv(name) {
  const payload = JSON.parse(
      document.querySelector("#static-data").textContent,
    ),
    binary = atob(payload[name] || "");
  return new TextDecoder("utf-8").decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}
function imageUrl(image) {
  return image?.local_path && !image.local_path.includes("..")
    ? `./data/copyrighted/${image.local_path}`
    : safeUrl(image?.url || "");
}
function locationErrorMessage(error) {
  if (error?.code === 1)
    return "位置情報の利用が許可されていません。ブラウザの設定から許可してください。";
  if (error?.code === 2)
    return "現在地を取得できませんでした。端末の位置情報設定を確認してください。";
  if (error?.code === 3)
    return "現在地の取得がタイムアウトしました。もう一度お試しください。";
  return "この環境では現在地を取得できません。HTTPSまたはlocalhostで開いてください。";
}
function setLocateState(state, message) {
  const button = document.querySelector("#locate"),
    label = button?.querySelector(".locate-label");
  if (!button || !label) return;
  button.classList.remove("loading", "located", "error");
  if (state) button.classList.add(state);
  button.disabled = state === "loading";
  label.textContent =
    state === "loading"
      ? "現在地を確認中"
      : state === "located"
        ? "現在地で再検索"
        : state === "error"
          ? "現在地を再試行"
          : "現在地で探す";
  button.title = message || "";
  button.setAttribute("aria-label", message || label.textContent);
}
function focusCurrentLocation() {
  if (!currentLocation) return;
  if (currentLocation.accuracy > 500 && currentAccuracyCircle)
    map.fitBounds(currentAccuracyCircle.getBounds(), {
      padding: [32, 32],
      maxZoom: 16,
    });
  else
    map.setView(
      [currentLocation.lat, currentLocation.lon],
      Math.max(map.getZoom(), 15),
    );
  currentLocationMarker?.openPopup();
}
function setNearMessage(message, state = "") {
  const node = document.querySelector("#near-message");
  node.className = `near-message${state ? ` ${state}` : ""}`;
  node.firstChild.textContent = `${message} `;
  document
    .querySelector("#near-clear")
    .classList.toggle("visible", Boolean(nearbyLocation));
}
function setNearbyLocation(location) {
  nearbyLocation = location;
  selectedDistance = 3000;
  if (addressMarker) {
    map.removeLayer(addressMarker);
    addressMarker = null;
  }
  if (location.source === "address") {
    const icon = L.divIcon({
      className: "nearby-marker-shell",
      html: '<span class="nearby-marker">起</span>',
      iconSize: [31, 31],
      iconAnchor: [15, 15],
    });
    addressMarker = L.marker([location.lat, location.lon], {
      icon,
      title: `${location.label}の位置`,
    })
      .addTo(map)
      .bindPopup(
        `<strong>検索した住所</strong><br>${escapeHtml(location.label)}`,
      );
  } else document.querySelector("#near-address").value = "";
  setNearMessage(`${location.label}から3km以内を近い順に表示しています。`);
  filters();
  render();
}
function clearNearby() {
  nearbyLocation = null;
  selectedDistance = 0;
  if (addressMarker) {
    map.removeLayer(addressMarker);
    addressMarker = null;
  }
  document.querySelector("#near-address").value = "";
  setNearMessage("住所は保存せず、検索時のみ国土地理院APIへ送信します。");
  filters();
  render();
}
function applyCurrentLocation(position, focus = true, useForNearby = false) {
  const { latitude: lat, longitude: lon, accuracy } = position.coords,
    routedFacility = activeRouteFacility;
  currentLocation = {
    lat,
    lon,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
  };
  if (routedFacility) {
    removeRoute();
    setRouteState(
      routedFacility,
      "idle",
      "現在地を更新しました。徒歩ルートを再検索してください。",
    );
  }
  if (currentAccuracyCircle) map.removeLayer(currentAccuracyCircle);
  if (currentLocationMarker) map.removeLayer(currentLocationMarker);
  currentAccuracyCircle = L.circle([lat, lon], {
    radius: currentLocation.accuracy || 20,
    color: "#176f8c",
    weight: 1,
    fillColor: "#69bad0",
    fillOpacity: 0.13,
    interactive: false,
  }).addTo(map);
  currentLocationMarker = L.circleMarker([lat, lon], {
    radius: 8,
    color: "#fffdf8",
    weight: 3,
    fillColor: "#176f8c",
    fillOpacity: 1,
  })
    .addTo(map)
    .bindPopup(
      `<strong>現在地</strong><br><small>精度：約${Math.max(1, Math.round(currentLocation.accuracy))} m</small>`,
      { closeButton: false },
    );
  setLocateState(
    "located",
    "現在地を取得しました。クリックすると再取得します。",
  );
  if (useForNearby)
    setNearbyLocation({ lat, lon, label: "現在地", source: "current" });
  else if (focus) focusCurrentLocation();
  return currentLocation;
}
function acquireCurrentLocation(
  focus = true,
  refresh = false,
  useForNearby = false,
) {
  if (currentLocation && !refresh) {
    if (useForNearby)
      setNearbyLocation({
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        label: "現在地",
        source: "current",
      });
    else if (focus) focusCurrentLocation();
    return Promise.resolve(currentLocation);
  }
  if (locationRequest)
    return locationRequest.then((location) => {
      if (useForNearby)
        setNearbyLocation({
          lat: location.lat,
          lon: location.lon,
          label: "現在地",
          source: "current",
        });
      else if (focus) focusCurrentLocation();
      return location;
    });
  if (!navigator.geolocation) {
    const error = new Error(locationErrorMessage());
    setLocateState("error", error.message);
    return Promise.reject(error);
  }
  setLocateState("loading", "現在地を取得しています");
  locationRequest = new Promise((resolve, reject) => {
    try {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      });
    } catch (error) {
      reject(error);
    }
  })
    .then((position) => applyCurrentLocation(position, focus, useForNearby))
    .catch((error) => {
      const message = locationErrorMessage(error);
      setLocateState("error", message);
      throw new Error(message);
    })
    .finally(() => {
      locationRequest = null;
    });
  return locationRequest;
}
async function searchAddress() {
  const input = document.querySelector("#near-address"),
    button = document.querySelector("#near-submit"),
    query = input.value.trim();
  if (!query) {
    setNearMessage("住所を入力してください。", "error");
    input.focus();
    return;
  }
  button.disabled = true;
  button.textContent = "検索中…";
  setNearMessage("住所を確認しています…");
  try {
    const response = await fetch(
      `${GSI_ADDRESS_URL}?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) throw new Error();
    const results = await response.json(),
      result = results?.[0],
      coordinates = result?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) throw new Error("not-found");
    const label = result.properties?.title || query;
    setNearbyLocation({
      lat: Number(coordinates[1]),
      lon: Number(coordinates[0]),
      label,
      source: "address",
    });
  } catch (error) {
    setNearMessage(
      error.message === "not-found"
        ? "住所を見つけられませんでした。市区町村名から入力してください。"
        : "住所検索に接続できませんでした。通信状況を確認してください。",
      "error",
    );
  } finally {
    button.disabled = false;
    button.textContent = "近くを探す";
  }
}
function formatDistance(metres) {
  return metres < 1000
    ? `${Math.max(10, Math.round(metres / 10) * 10)} m`
    : `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`;
}
function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60
    ? `約${minutes}分`
    : `約${Math.floor(minutes / 60)}時間${minutes % 60 ? `${minutes % 60}分` : ""}`;
}
function distanceBetween(a, b) {
  const radius = 6371000,
    toRadians = (value) => (value * Math.PI) / 180,
    dLat = toRadians(b.lat - a.lat),
    dLon = toRadians(b.lon - a.lon),
    lat1 = toRadians(a.lat),
    lat2 = toRadians(b.lat),
    value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
function wardFromAddress(address) {
  const ward = WARDS.slice(0, 10).find((value) => address.includes(value));
  if (ward) return ward;
  if (address && /埼玉県(?!さいたま市)|川口市/.test(address)) return "市外";
  return "区不明";
}
function defaultRouteMessage() {
  return currentLocation
    ? "取得済みの現在地から徒歩ルートを検索します。"
    : "現在地を取得して、徒歩ルートを地図内に表示します。";
}
function setRouteState(facilityId, status, message) {
  routeState = { facilityId: String(facilityId), status, message };
  const detail = document.querySelector("#detail");
  if (detail?.dataset.facilityId !== String(facilityId)) return;
  const statusNode = detail.querySelector("[data-route-status]"),
    button = detail.querySelector("[data-route]"),
    clear = detail.querySelector("[data-route-clear]");
  if (statusNode) {
    statusNode.className = `route-status${status === "error" ? " error" : status === "ready" ? " ready" : ""}`;
    statusNode.textContent = message;
  }
  if (button) {
    button.disabled = status === "loading";
    button.textContent =
      status === "loading"
        ? "検索中…"
        : status === "ready"
          ? "再検索"
          : "徒歩ルートを表示";
  }
  if (clear) clear.hidden = status !== "ready";
}
function removeRoute() {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  activeRouteFacility = "";
}
function routePanelHtml(x) {
  const state =
    routeState.facilityId === String(x.id)
      ? routeState
      : { status: "idle", message: defaultRouteMessage() };
  const loading = state.status === "loading";
  const ready = state.status === "ready";
  const statusClass =
    state.status === "error" ? " error" : ready ? " ready" : "";
  const buttonLabel = loading
    ? "検索中…"
    : ready
      ? "再検索"
      : "徒歩ルートを表示";
  return `<section class="route-panel" aria-label="現在地からのルート案内">
    <div class="route-copy">
      <strong>現在地からここまで</strong>
      <p class="route-status${statusClass}" data-route-status>${escapeHtml(state.message || defaultRouteMessage())}</p>
    </div>
    <div class="route-actions">
      <button type="button" data-route ${loading ? "disabled" : ""}>${buttonLabel}</button>
      <button class="route-clear" type="button" data-route-clear ${ready ? "" : "hidden"}>消す</button>
    </div>
  </section>`;
}
async function showRoute(x) {
  setRouteState(
    x.id,
    "loading",
    currentLocation ? "徒歩ルートを検索しています…" : "現在地を取得しています…",
  );
  try {
    const location = await acquireCurrentLocation(false);
    removeRoute();
    activeRouteFacility = String(x.id);
    setRouteState(x.id, "loading", "徒歩ルートを検索しています…");
    const control = L.Routing.control({
      waypoints: [L.latLng(location.lat, location.lon), L.latLng(x.lat, x.lon)],
      router: new L.Routing.OSRMv1({
        serviceUrl: FOOT_ROUTER_URL,
        profile: "driving",
        timeout: 30000,
      }),
      show: false,
      collapsible: false,
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      createMarker: () => null,
      lineOptions: {
        styles: [
          { color: "#fffdf8", opacity: 0.95, weight: 9 },
          { color: "#176f8c", opacity: 0.92, weight: 5 },
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
    });
    routingControl = control;
    control.on("routesfound", (event) => {
      if (routingControl !== control) return;
      const summary = event.routes?.[0]?.summary;
      if (!summary) return;
      setRouteState(
        x.id,
        "ready",
        `${formatDistance(summary.totalDistance)}・徒歩${formatDuration(summary.totalTime)}（目安）`,
      );
    });
    control.on("routingerror", () => {
      if (routingControl === control) {
        map.removeControl(control);
        routingControl = null;
        activeRouteFacility = "";
      }
      setRouteState(
        x.id,
        "error",
        "ルートを取得できませんでした。通信状況を確認して再度お試しください。",
      );
    });
    control.addTo(map);
  } catch (error) {
    setRouteState(
      x.id,
      "error",
      error.message || "現在地を取得できませんでした。",
    );
  }
}
function build(facilityText, articleText, osmText) {
  const articles = new Map(
    objects(articleText).map((r) => [
      r.id,
      {
        title: r.記事タイトル,
        subtitle: r.記事サブタイトル,
        body: r.記事本文,
        sections: json(r.記事セクションJSON, []),
        images: json(r.画像JSON, []).filter((image) => imageUrl(image)),
        info: json(r.基本情報JSON, {}),
        source: safeUrl(r.出典URL),
        rights: r.権利者表示,
      },
    ]),
  );
  const osms = new Map(
    objects(osmText).map((r) => [
      r.ID,
      {
        status: r.OSM照合状態,
        type: r.OSM要素種別,
        id: r.OSM_ID,
        name: r.OSM名称,
        url: safeUrl(r.OSM_URL),
        distance: r.OSM距離_m,
        classification: r.OSM主要分類,
        address: r.OSM住所,
        hours: r.OSM営業時間,
        phone: r.OSM電話番号,
        website: r.OSMウェブサイト,
        wheelchair: r.OSM車椅子対応,
        operator: r.OSM運営者,
        modified: r.OSM最終更新日時,
        reason: r.OSM照合根拠,
      },
    ]),
  );
  return objects(facilityText)
    .map((r) => {
      const pid = `ACS${String(Number(r.id)).padStart(4, "0")}`,
        meta = SPOT_META[String(Number(r.id))] || {
          category: "コミュニティスペース",
          tags: ["地域交流"],
        },
        address = r.国土地理院結果住所 || r.参考住所;
      return {
        id: r.id,
        name: r.施設名,
        tagline: r.キャッチコピー,
        category: meta.category,
        tags: meta.tags,
        ward: wardFromAddress(address),
        articleUrl: safeUrl(r.公式記事URL),
        address,
        lat: Number(r.国土地理院緯度),
        lon: Number(r.国土地理院経度),
        gsi: safeUrl(r.国土地理院API_URL),
        article: articles.get(r.id),
        osm: osms.get(pid),
      };
    })
    .filter(
      (x) =>
        x.name &&
        Number.isFinite(x.lat) &&
        Number.isFinite(x.lon) &&
        x.lat &&
        x.lon,
    );
}
function filtered() {
  const q = document
      .querySelector("#search")
      .value.trim()
      .toLocaleLowerCase("ja"),
    selected = [...selectedTags];
  return facilities
    .map((x) => ({
      ...x,
      distance: nearbyLocation ? distanceBetween(nearbyLocation, x) : null,
    }))
    .filter(
      (x) =>
        (selectedWard === "すべて" || x.ward === selectedWard) &&
        (selectedCategory === "すべて" || x.category === selectedCategory) &&
        (!selected.length || selected.some((tag) => x.tags.includes(tag))) &&
        (!selectedDistance || x.distance <= selectedDistance) &&
        (!q ||
          `${x.name} ${x.tagline} ${x.address} ${x.ward} ${x.category} ${x.tags.join(" ")} ${x.article?.body || ""} ${x.osm?.name || ""}`
            .toLocaleLowerCase("ja")
            .includes(q)),
    )
    .sort((a, b) =>
      nearbyLocation ? a.distance - b.distance : Number(a.id) - Number(b.id),
    );
}
function activeConditions() {
  const q = document.querySelector("#search").value.trim(),
    parts = [];
  if (q) parts.push(`「${q}」`);
  if (selectedWard !== "すべて") parts.push(selectedWard);
  if (selectedCategory !== "すべて") parts.push(selectedCategory);
  if (selectedTags.size) parts.push([...selectedTags].join("・"));
  if (nearbyLocation)
    parts.push(
      `${nearbyLocation.label}${selectedDistance ? `から${selectedDistance / 1000}km以内` : "から近い順"}`,
    );
  return parts;
}
function popup(x, color) {
  const body = coordinateMode
      ? `<p class="popup-coords"><span>GSI API</span><strong>${x.lat.toFixed(6)}, ${x.lon.toFixed(6)}</strong></p>`
      : `<address>${escapeHtml(x.address)}</address>`,
    distance =
      x.distance != null
        ? `<p class="distance">${escapeHtml(nearbyLocation.label)}から ${formatDistance(x.distance)}</p>`
        : "";
  return `<article class="popup">
    <span class="popup-category" style="--category-color:${color}">${escapeHtml(x.category)} / ${escapeHtml(x.ward)}</span>
    <h2>${escapeHtml(x.name)}</h2>
    ${body}
    ${distance}
  </article>`;
}
function render() {
  const items = filtered(),
    conditions = activeConditions(),
    listView = document.querySelector("#list-view");
  document.querySelector("#count").textContent = items.length;
  document.querySelector("#result-summary").innerHTML =
    `<strong>${items.length}件</strong>${conditions.length ? `・${escapeHtml(conditions.join(" / "))}` : "・すべてのスポット"}`;
  document.querySelector("#clear").style.display = conditions.length
    ? "block"
    : "none";
  listView.classList.remove("list-view-updating");
  void listView.offsetWidth;
  listView.classList.add("list-view-updating");
  setTimeout(() => listView.classList.remove("list-view-updating"), 260);
  document.querySelector("#list").innerHTML = items.length
    ? items
        .map((x, i) => {
          const image = x.article?.images?.[0];
          const color = COLORS[x.category] || "#59636b";
          const location =
            x.distance != null
              ? `<em class="distance">${formatDistance(x.distance)}</em>`
              : `<em>${escapeHtml(x.ward)}</em>`;
          const tags = x.tags
            .slice(0, 3)
            .map((tag) => `<span class="card-tag">#${escapeHtml(tag)}</span>`)
            .join("");
          const address = coordinateMode
            ? `${x.lat.toFixed(6)}, ${x.lon.toFixed(6)}`
            : escapeHtml(x.address);
          return `<button class="card" data-id="${escapeHtml(x.id)}">
            ${image ? `<img class="card-image" src="${escapeHtml(imageUrl(image))}" alt="" loading="lazy">` : ""}
            <span class="card-body">
              <span class="card-meta">
                <span style="--category-color:${color}">${escapeHtml(x.category)}</span>
                ${location}
              </span>
              <strong>${escapeHtml(x.name)}</strong>
              <span class="card-tags">${tags}</span>
              <span class="address">${address}</span>
            </span>
            <span class="number">${String(i + 1).padStart(2, "0")}</span>
          </button>`;
        })
        .join("")
    : `<div class="empty">
      <strong>該当するスポットはありません</strong>
      <p>${conditions.length ? `${escapeHtml(conditions.join(" / "))} に一致する場所が見つかりませんでした。` : "条件に一致する場所が見つかりませんでした。"}<br>キーワードや絞り込み条件を変えてお試しください。</p>
      <button type="button" data-reset>条件をすべて解除</button>
    </div>`;
  layer.clearLayers();
  markers.clear();
  const points = [];
  items.forEach((x) => {
    const color = COLORS[x.category] || "#59636b",
      point = [x.lat, x.lon],
      icon = L.divIcon({
        className: "facility-marker-shell",
        html: `<span class="facility-marker${coordinateMode ? " coordinate" : ""}" style="--marker-color:${color}"></span>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
        popupAnchor: [0, -31],
      }),
      marker = L.marker(point, {
        icon,
        title: x.name,
        alt: `${x.name}の位置`,
        keyboard: true,
      })
        .addTo(layer)
        .bindPopup(popup(x, color), { maxWidth: 280, minWidth: 220 });
    marker.on("click", () => select(x.id));
    markers.set(x.id, marker);
    points.push(point);
  });
  if (nearbyLocation) points.push([nearbyLocation.lat, nearbyLocation.lon]);
  if (points.length > 1)
    map.fitBounds(points, { padding: [42, 42], maxZoom: 14 });
  else if (points.length) map.setView(points[0], 14);
  else map.setView([35.89, 139.65], 11);
  document.querySelector("[data-reset]")?.addEventListener("click", resetAll);
  document.querySelectorAll(".card").forEach(
    (card) =>
      (card.onclick = () => {
        const x = facilities.find((v) => v.id === card.dataset.id);
        map.flyTo([x.lat, x.lon], 15, { duration: 0.8 });
        markers.get(x.id)?.openPopup();
        select(x.id);
      }),
  );
}
function osmHtml(osm) {
  const rows = osm
    ? [
        ["名称", osm.name],
        ["要素", [osm.type, osm.id].filter(Boolean).join(" / ")],
        ["分類", osm.classification],
        ["住所", osm.address],
        ["営業時間", osm.hours],
        ["電話", osm.phone],
        ["ウェブサイト", osm.website],
        ["車椅子対応", osm.wheelchair],
        ["運営者", osm.operator],
        ["位置差", osm.distance ? `${osm.distance} m` : ""],
        ["最終更新", osm.modified],
      ].filter(([, v]) => v)
    : [];
  const entries = rows
    .map(
      ([label, value]) =>
        `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join("");
  return `<details class="osm">
    <summary>
      <span>OpenStreetMapの登録情報</span>
      <small>${escapeHtml(osm?.status || "未照合")}</small>
    </summary>
    <div class="osm-body">
      ${rows.length ? `<dl>${entries}</dl>` : `<p>${escapeHtml(osm?.reason || "対応するOSM要素は確認されていません。")}</p>`}
      ${osm?.reason && rows.length ? `<p>照合根拠：${escapeHtml(osm.reason)}</p>` : ""}
      ${osm?.url ? `<a href="${escapeHtml(osm.url)}" target="_blank" rel="noreferrer">OpenStreetMapで確認 <span>↗</span></a>` : ""}
    </div>
  </details>`;
}
function select(id) {
  const x = facilities.find((v) => v.id === id);
  if (!x?.article) return;
  if (activeRouteFacility && activeRouteFacility !== String(id)) {
    removeRoute();
    routeState = { facilityId: "", status: "idle", message: "" };
  }
  activeImage = 0;
  detail(x);
}
function detail(x) {
  const a = x.article,
    d = document.querySelector("#detail"),
    images = a.images || [],
    active = images[activeImage] || images[0],
    strip =
      images.length > 1
        ? `<div class="strip">${images.map((im, i) => `<button class="${i === activeImage ? "active" : ""}" data-image="${i}"><img src="${escapeHtml(imageUrl(im))}" alt="" loading="lazy"></button>`).join("")}</div>`
        : "",
    sections = a.sections
      .map(
        (s) =>
          `<section>${s.heading ? `<h3>${escapeHtml(s.heading)}</h3>` : ""}${(s.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</section>`,
      )
      .join(""),
    info = Object.entries(a.info || {})
      .map(
        ([k, v]) =>
          `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`,
      )
      .join(""),
    coordinate = coordinateMode
      ? `<section class="coordinate-card"><h3>国土地理院 住所検索API取得座標</h3><p><strong>${x.lat.toFixed(6)}, ${x.lon.toFixed(6)}</strong></p>${x.gsi ? `<a href="${escapeHtml(x.gsi)}" target="_blank" rel="noreferrer">API取得URLを確認 ↗</a>` : ""}</section>`
      : "";
  d.dataset.facilityId = String(x.id);
  d.innerHTML = `
    <div class="detail-bar">
      <button data-close>← 一覧へ</button>
      <span>SPOT ${String(x.id).padStart(2, "0")} / ${escapeHtml(x.ward)}</span>
    </div>
    <div class="detail-scroll">
      ${routePanelHtml(x)}
      ${active ? `<figure class="hero"><img src="${escapeHtml(imageUrl(active))}" alt="${escapeHtml(active.alt || a.title)}"></figure>` : ""}
      ${strip}
      <article class="reader">
        <span class="reader-category" style="--category-color:${COLORS[x.category] || "#59636b"}">${escapeHtml(x.category)}</span>
        <div class="reader-tags">${x.tags.map((tag) => `<span class="reader-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
        <h2>${escapeHtml(a.title || x.name)}</h2>
        <p class="subtitle">${escapeHtml(a.subtitle || x.tagline)}</p>
        ${coordinate}
        ${sections}
        ${info ? `<section class="info"><h3>基本情報</h3><dl>${info}</dl></section>` : ""}
        <a class="source" href="${escapeHtml(a.source || x.articleUrl)}" target="_blank" rel="noreferrer">公式記事で読む <span>↗</span></a>
        <p class="rights">記事・画像：${escapeHtml(a.rights || "アーツカウンシルさいたま")}<br>表示画像は公式掲載画像から作成した軽量WebPです。著作権は移転しません。</p>
        ${osmHtml(x.osm)}
      </article>
    </div>`;
  document.querySelector("#list-view").hidden = true;
  d.hidden = false;
  document.querySelector("#viewer").classList.add("has-detail");
  d.querySelector("[data-close]").onclick = closeDetail;
  d.querySelector("[data-route]").onclick = () => showRoute(x);
  d.querySelector("[data-route-clear]").onclick = () => {
    removeRoute();
    setRouteState(x.id, "idle", defaultRouteMessage());
  };
  d.querySelectorAll("[data-image]").forEach(
    (b) =>
      (b.onclick = () => {
        activeImage = Number(b.dataset.image);
        detail(x);
      }),
  );
}
function closeDetail() {
  document.querySelector("#detail").hidden = true;
  document.querySelector("#list-view").hidden = false;
  document.querySelector("#viewer").classList.remove("has-detail");
  map.closePopup();
}
function updateMobileFilterState() {
  const active = [
      selectedWard !== "すべて" ? selectedWard : "",
      selectedCategory !== "すべて" ? selectedCategory : "",
      ...selectedTags,
    ].filter(Boolean),
    button = document.querySelector("#mobile-filter-toggle");
  document.querySelector("#mobile-filter-state").textContent = active.length
    ? active.join("・")
    : "区・カテゴリ・タグ";
  button.classList.toggle("active", Boolean(active.length));
}
function setMobileFilters(open) {
  const button = document.querySelector("#mobile-filter-toggle");
  document.querySelector(".app").classList.toggle("filters-open", open);
  button.setAttribute("aria-expanded", String(open));
  button.querySelector(".toggle-mark").textContent = open ? "−" : "＋";
}
function filters() {
  document.querySelector("#wards").innerHTML = ["すべて", ...WARDS]
    .map((ward) => {
      const count =
        ward === "すべて"
          ? facilities.length
          : facilities.filter((x) => x.ward === ward).length;
      return `<button class="${ward === selectedWard ? "active" : ""}" data-ward="${escapeHtml(ward)}" ${!count ? "disabled" : ""}>${escapeHtml(ward)} <small>${count}</small></button>`;
    })
    .join("");
  document.querySelectorAll("[data-ward]").forEach(
    (button) =>
      (button.onclick = () => {
        selectedWard = button.dataset.ward;
        filters();
        render();
      }),
  );
  document.querySelector("#categories").innerHTML = [
    "すべて",
    ...Object.keys(COLORS),
  ]
    .map(
      (category) =>
        `<button class="${category === selectedCategory ? "active" : ""}" data-category="${escapeHtml(category)}" style="--filter-color:${category === "すべて" ? "#59636b" : COLORS[category]}"><i></i>${escapeHtml(category)}</button>`,
    )
    .join("");
  document.querySelectorAll("[data-category]").forEach(
    (button) =>
      (button.onclick = () => {
        selectedCategory = button.dataset.category;
        filters();
        render();
      }),
  );
  document.querySelector("#tags").innerHTML = TAG_ORDER.map(
    (tag) =>
      `<button class="${selectedTags.has(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`,
  ).join("");
  document.querySelectorAll("[data-tag]").forEach(
    (button) =>
      (button.onclick = () => {
        selectedTags.has(button.dataset.tag)
          ? selectedTags.delete(button.dataset.tag)
          : selectedTags.add(button.dataset.tag);
        filters();
        render();
      }),
  );
  const distances = [
    [0, "指定なし"],
    [1000, "1km"],
    [3000, "3km"],
    [5000, "5km"],
  ];
  document
    .querySelector("#distances")
    .classList.toggle("disabled", !nearbyLocation);
  document.querySelector("#distances").innerHTML = distances
    .map(
      ([metres, label]) =>
        `<button class="${metres === selectedDistance ? "active" : ""}" data-distance="${metres}" ${!nearbyLocation ? "disabled" : ""}>${label}</button>`,
    )
    .join("");
  document.querySelectorAll("[data-distance]").forEach(
    (button) =>
      (button.onclick = () => {
        selectedDistance = Number(button.dataset.distance);
        filters();
        render();
      }),
  );
  updateMobileFilterState();
}
function resetAll() {
  selectedWard = "すべて";
  selectedCategory = "すべて";
  selectedTags.clear();
  selectedDistance = 0;
  nearbyLocation = null;
  if (addressMarker) {
    map.removeLayer(addressMarker);
    addressMarker = null;
  }
  document.querySelector("#search").value = "";
  document.querySelector("#near-address").value = "";
  setNearMessage("住所は保存せず、検索時のみ国土地理院APIへ送信します。");
  filters();
  render();
}
function init() {
  try {
    facilities = build(
      embeddedCsv("facility"),
      embeddedCsv("article"),
      embeddedCsv("osm"),
    );
    if (!facilities.length) throw new Error("表示できる座標がありません");
    if (!L.Routing?.OSRMv1)
      throw new Error("ルート案内プラグインを読み込めません");
    map = L.map("map").setView([35.89, 139.65], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    document.querySelector("#state").remove();
    filters();
    render();
    document.querySelector("#search").addEventListener("input", render);
    document
      .querySelector("#near-search")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        searchAddress();
      });
    document.querySelector("#near-clear").onclick = clearNearby;
    document.querySelector("#mobile-filter-toggle").onclick = (event) =>
      setMobileFilters(
        event.currentTarget.getAttribute("aria-expanded") !== "true",
      );
    document.querySelector("#locate").onclick = () =>
      acquireCurrentLocation(true, true, true).catch((error) =>
        setNearMessage(error.message, "error"),
      );
    document.querySelector("#clear").onclick = resetAll;
    document.querySelector("#coordinate").onclick = () => {
      coordinateMode = !coordinateMode;
      document
        .querySelector("#coordinate")
        .classList.toggle("active", coordinateMode);
      document
        .querySelector("#coordinate")
        .setAttribute("aria-pressed", String(coordinateMode));
      document
        .querySelector("#map-note")
        .classList.toggle("coordinate", coordinateMode);
      document.querySelector("#map-note").textContent = coordinateMode
        ? "国土地理院APIで取得した座標を表示"
        : "色：カテゴリ / 位置：国土地理院API";
      render();
      const open = document.querySelector("#detail:not([hidden])");
      if (open) {
        const x = facilities.find(
          (value) => String(value.id) === open.dataset.facilityId,
        );
        if (x) detail(x);
      }
    };
  } catch (error) {
    const state = document.querySelector("#state");
    state.setAttribute("role", "alert");
    state.querySelector("strong").textContent = "地図を表示できません";
    state.querySelector("p").textContent = error.message;
  }
}
init();
