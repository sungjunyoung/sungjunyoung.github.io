#!/usr/bin/env node
/**
 * Regenerates the migration-throughput chart in
 * src/assets/posts/spring-boot-에서-fastapi-로-마이그레이션한-이유/.
 *
 *     node scripts/make-migration-chart.mjs
 *
 * Two plates are written from one drawing — `-light` and `-dark` — because
 * markdown/themed-images.ts pairs a body image with a twin on the other
 * theme's ground. The markdown names only the light one.
 *
 * The series below are cumulative net lines (added − deleted) per calendar
 * day, counted from each repo's first commit:
 *
 *   legacy  backoffice-backend (*.kt) + backoffice-frontend (*.ts,*.tsx),
 *           2025-02-15 → 2026-05-19
 *   next    backoffice (backend/**\/*.py + frontend/**\/*.{ts,tsx}),
 *           2026-04-16 → 2026-08-28
 *
 * Regenerate with:
 *   git log --no-merges --reverse --date=short --pretty='C %ad' --numstat -- <paths>
 * summing (added − deleted) per day and running the total.
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const OUT = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  "src/assets/posts/spring-boot-에서-fastapi-로-마이그레이션한-이유",
);

const LEGACY = [
  [0,40], [1,313], [2,308], [3,2215], [4,2147], [6,2521], [7,2940], [8,3826], [9,3898], [10,4139],
  [14,4908], [15,5818], [16,6640], [19,6812], [21,8506], [22,9514], [24,9975], [25,9973], [27,10690], [28,12753],
  [29,13937], [30,14094], [35,14681], [36,15546], [41,16092], [42,17079], [43,17526], [44,18360], [45,18379], [46,18891],
  [47,18960], [49,19231], [50,19530], [52,19528], [53,19542], [54,19580], [56,19598], [57,19604], [58,19737], [59,20719],
  [60,22091], [61,22234], [62,23194], [64,23236], [65,23414], [66,24316], [67,25153], [68,26738], [69,27123], [70,27124],
  [71,27967], [72,28094], [73,28519], [74,30081], [75,30083], [76,29682], [77,30320], [78,30325], [79,30773], [80,30889],
  [83,30920], [85,30714], [88,30763], [93,31498], [94,31426], [95,31636], [96,32356], [97,32361], [99,32430], [100,33004],
  [101,33267], [102,34579], [103,34813], [104,34735], [105,34735], [106,34990], [107,35628], [108,37275], [109,38699], [110,40126],
  [111,40307], [112,41617], [113,42207], [114,43797], [115,45684], [116,47547], [117,47717], [118,47846], [119,47867], [121,47927],
  [122,47953], [123,48337], [124,49681], [125,49787], [126,50395], [127,50571], [128,51054], [129,51180], [130,52809], [131,52834],
  [132,53258], [134,53406], [135,54026], [136,55470], [137,56489], [138,57158], [139,57618], [140,57618], [141,57799], [142,58286],
  [143,58209], [144,58248], [145,58532], [149,58535], [150,59135], [151,60638], [152,61263], [153,61509], [154,62244], [155,62249],
  [156,63544], [157,77208], [158,77534], [159,77960], [160,78303], [162,78209], [163,80386], [164,81113], [165,81258], [166,78734],
  [167,80528], [168,82407], [170,83323], [171,84403], [172,85417], [173,85931], [174,85984], [175,86013], [177,86029], [178,87809],
  [179,90611], [180,92088], [181,93576], [183,95839], [184,105747], [185,108024], [186,108473], [187,110765], [188,111961], [189,112228],
  [190,112484], [191,114186], [192,120059], [193,121683], [194,122074], [195,123534], [198,124904], [199,125553], [200,127456], [201,127931],
  [205,130324], [206,131812], [207,132340], [208,132593], [209,133524], [210,133524], [212,134024], [213,136460], [214,137277], [215,137552],
  [216,138470], [217,139023], [218,139734], [219,140096], [220,140601], [221,141212], [222,141766], [223,141801], [226,142223], [227,145838],
  [228,148409], [229,149065], [235,151300], [237,153065], [238,153098], [240,154448], [241,155813], [242,156331], [243,156630], [244,156836],
  [247,159874], [248,161030], [249,163516], [250,164250], [254,164587], [255,165855], [256,167173], [257,165526], [258,165681], [260,166590],
  [261,166997], [262,167839], [263,169681], [264,171029], [265,172965], [267,173492], [268,173495], [270,173514], [271,173530], [272,174250],
  [273,175169], [274,176595], [275,177310], [276,177815], [277,177823], [278,177830], [282,178280], [283,178325], [284,179445], [285,180771],
  [289,181802], [290,182326], [291,182972], [292,184566], [293,185625], [294,185698], [296,186693], [297,187529], [298,187540], [300,187820],
  [301,190530], [302,195080], [303,213671], [304,214506], [305,227223], [306,228478], [307,229309], [311,229309], [312,229780], [317,230830],
  [318,235369], [319,235892], [321,238514], [322,238668], [323,243601], [324,244997], [325,245497], [326,245696], [327,249816], [328,250884],
  [329,251141], [330,255935], [331,268681], [332,272355], [333,272489], [334,272909], [335,274240], [337,274276], [338,275083], [339,275819],
  [340,276252], [341,279137], [342,279396], [345,282218], [346,282878], [347,283598], [349,285906], [350,286053], [352,286622], [353,288451],
  [354,288509], [355,288657], [356,288904], [359,290855], [360,291255], [361,291646], [362,292741], [363,293021], [367,293022], [369,293437],
  [370,294361], [372,294407], [373,295784], [374,296070], [375,296299], [376,297963], [377,303969], [380,306364], [381,311724], [382,317897],
  [388,334383], [391,334757], [393,339084], [394,341729], [395,344893], [396,346446], [397,352263], [398,353099], [400,355994], [401,352325],
  [402,354416], [403,352590], [404,353563], [405,353603], [406,353846], [407,357135], [408,359742], [409,360991], [410,361650], [411,362690],
  [412,366172], [414,366687], [415,368716], [416,370131], [417,370824], [418,371170], [419,371097], [421,371542], [422,375292], [423,365880],
  [424,368423], [425,368259], [426,369046], [430,369398], [436,369401], [438,369688], [439,369707], [440,369708], [443,369056], [444,367417],
  [446,367700], [447,367700], [452,366909], [453,353171], [458,353171],];

const NEXT = [
  [0,776], [1,796], [2,5598], [3,6051], [4,14910], [5,27048], [6,40853], [7,53472], [8,66481], [9,72912],
  [10,93068], [11,103247], [12,126999], [13,139345], [14,137947], [15,144198], [16,145063], [17,157800], [18,163810], [19,174300],
  [20,181638], [21,191609], [22,200080], [23,209444], [24,221652], [25,237722], [26,247372], [27,266291], [28,275478], [29,278230],
  [31,319077], [32,329193], [33,332551], [34,341435], [35,350939], [36,353150], [37,353473], [38,354449], [39,358112], [40,360080],
  [41,366898], [42,369455], [43,369762], [46,372895], [47,377032], [49,380432], [50,388172], [52,395761], [53,400391], [54,403959],
  [55,409037], [56,417886], [57,423354], [58,427587], [59,427941], [60,429589], [61,432461], [62,438676], [63,443844], [64,447079],
  [66,447550], [67,458142], [68,462195], [69,466831], [70,470146], [71,484524], [72,486258], [74,492671], [75,496928], [76,500799],
  [77,511190], [78,515352], [79,518446], [81,526715], [82,528817], [83,534020], [84,541292], [85,541693], [88,555758], [89,559148],
  [90,562575], [91,573173], [94,575781], [95,585355], [96,594645], [97,599622], [98,612825], [99,619465], [100,619415], [102,625783],
  [103,634787], [104,638036], [105,641646], [106,646281], [108,647349], [109,651601], [110,660761], [111,668685], [112,669831], [113,674081],
  [116,679266], [117,677961], [118,680359], [119,696745], [120,709868], [124,711584], [125,735690], [126,739097], [127,742211], [128,744085],
  [129,745123], [130,747084], [131,752407], [132,756374], [133,762524], [134,761488],];

/** The line the legacy codebase ended on, and the day each side reached it. */
const FINAL = 353171;
const LEGACY_DAYS = 458;
const NEXT_DAYS = 37;
/** The port: a week of translation, then a week running both stacks side by side. */
const PORT_DAYS = 7;
const PARALLEL_DAYS = 14;

const W = 1440;
const H = 760;
const L = 104;
const R = 54;
const T = 44;
const B = 76;
const X_MAX = 470;
const Y_MAX = 800000;

const PLOT_W = W - L - R;
const PLOT_H = H - T - B;

const x = (d) => L + (d / X_MAX) * PLOT_W;
const y = (v) => T + PLOT_H - (v / Y_MAX) * PLOT_H;
const pathOf = (pts) => pts.map(([d, v], i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

const THEMES = {
  light: {
    background: "#fff",
    ink: "#222",
    strong: "#000",
    muted: "#737380",
    grid: "rgba(0, 0, 0, 0.12)",
    band: "rgba(34, 34, 34, 0.13)",
    bandSoft: "rgba(34, 34, 34, 0.06)",
  },
  dark: {
    background: "#292a2d",
    ink: "#a9a9b3",
    strong: "#e6e6ec",
    muted: "#909099",
    grid: "rgba(255, 255, 255, 0.13)",
    band: "rgba(230, 230, 236, 0.20)",
    bandSoft: "rgba(230, 230, 236, 0.09)",
  },
};
const ACCENT = "#fe5186";

/** Anchors the legacy label to the curve itself rather than to a fixed spot. */
const LEGACY_LABEL = LEGACY.reduce((best, p) => (Math.abs(p[0] - 210) < Math.abs(best[0] - 210) ? p : best));

const Y_TICKS = [0, 200000, 400000, 600000, 800000];
const X_TICKS = [0, 60, 120, 180, 240, 300, 360, 420];

const thousands = (n) => n.toLocaleString("en-US");

function page(theme) {
  const c = THEMES[theme];
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; background: ${c.background}; }
  body { font-family: "Pretendard Variable", Pretendard, -apple-system, sans-serif; }
  text { font-family: "Pretendard Variable", Pretendard, -apple-system, sans-serif; }
  .tick { font-size: 19px; fill: ${c.muted}; }
  .axis { font-size: 19px; fill: ${c.muted}; }
  .lead { font-size: 23px; font-weight: 600; }
  .note { font-size: 20px; fill: ${c.muted}; }
  .callout { font-size: 24px; font-weight: 700; }
</style></head><body>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">

  <!-- The port itself: the new repo's first 33 days ran while the legacy
       repos were still live, so this stretch is translation, not new work. -->
  <rect x="${x(0)}" y="${T}" width="${x(PORT_DAYS) - x(0)}" height="${PLOT_H}" fill="${c.band}" />
  <rect x="${x(PORT_DAYS)}" y="${T}" width="${x(PARALLEL_DAYS) - x(PORT_DAYS)}" height="${PLOT_H}" fill="${c.bandSoft}" />
  <line x1="${x(PARALLEL_DAYS)}" y1="${T}" x2="${x(PARALLEL_DAYS)}" y2="${T + PLOT_H}" stroke="${c.muted}" stroke-width="1.5" />
  <path d="M${x(0)} ${T + 30} v-7 h${x(PARALLEL_DAYS) - x(0)} v7" stroke="${c.muted}" stroke-width="1.5" />
  <text class="note" x="${x(PARALLEL_DAYS) + 12}" y="${T + 30}" fill="${c.muted}">2주 — 이관 1주 ＋ 병행 운영 1주</text>

  ${Y_TICKS.map(
    (v) => `<line x1="${L}" y1="${y(v)}" x2="${L + PLOT_W}" y2="${y(v)}" stroke="${c.grid}" stroke-width="1" />
  <text class="tick" x="${L - 16}" y="${y(v) + 7}" text-anchor="end">${v ? thousands(v / 1000) + "k" : "0"}</text>`,
  ).join("\n  ")}

  ${X_TICKS.map(
    (d) => `<text class="tick" x="${x(d)}" y="${T + PLOT_H + 34}" text-anchor="middle">${d}</text>`,
  ).join("\n  ")}
  <text class="axis" x="${L + PLOT_W}" y="${T + PLOT_H + 34}" text-anchor="end">경과일</text>

  <!-- Where the legacy codebase finished, so both curves can be read against it. -->
  <line x1="${L}" y1="${y(FINAL)}" x2="${L + PLOT_W}" y2="${y(FINAL)}" stroke="${c.muted}" stroke-width="1.5" stroke-dasharray="7 7" opacity="0.85" />
  <text class="note" x="${L + PLOT_W}" y="${y(FINAL) - 16}" text-anchor="end" fill="${c.muted}">레거시가 도달한 ${thousands(FINAL)}줄</text>

  <path d="${pathOf(LEGACY)}" stroke="${c.muted}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
  <path d="${pathOf(NEXT)}" stroke="${ACCENT}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" />

  <!-- 37일 -->
  <line x1="${x(NEXT_DAYS)}" y1="${y(FINAL)}" x2="${x(NEXT_DAYS)}" y2="${T + PLOT_H}" stroke="${ACCENT}" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.7" />
  <circle cx="${x(NEXT_DAYS)}" cy="${y(FINAL)}" r="7" fill="${ACCENT}" />
  <text class="callout" x="${x(NEXT_DAYS) + 16}" y="${y(FINAL) + 44}" fill="${ACCENT}">37일</text>

  <!-- 458일 -->
  <line x1="${x(LEGACY_DAYS)}" y1="${y(FINAL)}" x2="${x(LEGACY_DAYS)}" y2="${T + PLOT_H}" stroke="${c.muted}" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.7" />
  <circle cx="${x(LEGACY_DAYS)}" cy="${y(FINAL)}" r="7" fill="${c.muted}" />
  <text class="callout" x="${x(LEGACY_DAYS)}" y="${y(FINAL) + 44}" text-anchor="end" fill="${c.muted}">458일</text>

  <text class="lead" x="${x(NEXT[NEXT.length - 1][0]) + 14}" y="${y(NEXT[NEXT.length - 1][1]) + 8}" fill="${ACCENT}">신규 · FastAPI</text>
  <text class="lead" x="${x(LEGACY_LABEL[0])}" y="${y(LEGACY_LABEL[1]) - 30}" text-anchor="end" fill="${c.muted}">레거시 · Spring Boot</text>

  <text class="axis" x="${L}" y="${T - 16}" fill="${c.muted}">누적 코드 라인 (추가 − 삭제)</text>
</svg>
</body></html>`;
}

const browser = await chromium.launch();
const page_ = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});

for (const theme of ["light", "dark"]) {
  await page_.setContent(page(theme), { waitUntil: "networkidle" });
  await page_.evaluate(() => document.fonts.ready);
  const shot = await page_.screenshot({ type: "png" });
  const file = path.join(OUT, `migration-throughput-${theme}.webp`);
  // Rendered at 2x and resized back down: the plate ships at 1440 wide, and
  // supersampling is what keeps the hairlines from crawling.
  await sharp(shot).resize(W, H).webp({ quality: 92 }).toFile(file);
  console.log(`${path.basename(file)}  ${(await fs.stat(file)).size} bytes`);
}

await browser.close();
