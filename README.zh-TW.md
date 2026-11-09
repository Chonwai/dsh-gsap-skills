# GSAP Skills for DeepSeek Harness

**`@chonwai/dsh-gsap-skills`** 把 GSAP 官方 8 個 skill 打包成 DeepSeek Harness
（DSH）bundle，並套用 **4 項已記錄的內容更正**。每個 `SKILL.md` 都註冊成
runtime skill，session 可以按需載入 `gsap-core`、`gsap-timeline`、
`gsap-scrolltrigger`、`gsap-plugins`、`gsap-utils`、`gsap-react`、
`gsap-frameworks`、`gsap-performance`。

這是獨立的社群整合，與 GreenSock 或 GSAP 專案無隸屬、贊助或背書關係。
「GSAP」與「GreenSock」是 GreenSock, Inc. 的商標。Skill 文件是 MIT 授權；
**GSAP 函式庫本身沒有隨附、也不是 MIT**——請在你的專案依 GreenSock 的條款
自行安裝 GSAP。

**Scope 規則（先讀這條）：** 本 bundle 註冊在 host/global skill layer。Web app 把
`skill-filesystem` 掛在 agent preset 的 scope 裡，並停用 host 層的 filesystem
row；因此 `~/.agents/skills`、`$DSH_HOME/skills` 或專案 `.agents/skills` 底下的
`gsap-*` 檔案層副本位於**更近的 preset layer**，會直接贏得同名 skill——**bundle
無法蓋過它**。要讓 bundle 生效，必須把檔案層副本移出 skills root；見下方
〈從檔案層安裝遷移〉。Profile 已安裝不等於 catalog 的勝出條目是 bundle。

## Quick start

在 **Plugins → Add plugin → Install a third-party plugin** 貼上
`https://github.com/Chonwai/dsh-gsap-skills#v1.0.1`，按 **Enable now**，然後
**重啟 DSH**、開新 session，載入 `/gsap-core`。其他安裝通道（release tarball、
agent／`plugin_manager`、未來 npm）、驗證方式、layer 遷移與疑難排解：
[docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)。

## 這個 bundle 提供什麼

| Skill | 用途 |
|---|---|
| `gsap-core` | `gsap.to/from/fromTo`、easing、duration、stagger、defaults、`matchMedia` |
| `gsap-timeline` | 時間軸編排、position parameter、巢狀、播放控制 |
| `gsap-scrolltrigger` | 滾動連動動畫、pin、scrub、trigger |
| `gsap-plugins` | 註冊、Flip、Draggable、ScrollSmoother、SplitText、SVG、ease |
| `gsap-utils` | `clamp`、`mapRange`、`normalize`、`interpolate`、`random`、`snap`、`wrap`、`pipe` |
| `gsap-react` | `useGSAP`、refs、`gsap.context()`、cleanup |
| `gsap-frameworks` | Vue、Nuxt、Svelte、SvelteKit 生命週期與清理 |
| `gsap-performance` | transform、layout thrashing、`will-change`、batching |

另外隨附 `skills/llms.txt`（上游 skill 索引）。Host half 會把 8 個 skill 都
註冊，`resourceBase` 指向各自的 skill 目錄。沒有 client half、沒有
settings/Config schema、沒有 system prompt 區段、沒有 telemetry、沒有 runtime
依賴，也不會連網／開程序／寫檔——模組只讀自己套件內的檔案。

## 更正了什麼

由 `tools/apply-corrections.mjs` 在 vendor 時套用；每一條都在
[docs/KNOWN-UPSTREAM-ISSUES.md](docs/KNOWN-UPSTREAM-ISSUES.md) 附上原文引述、
更正內容與 upstream issue 或 source 證據：

1. **`gsap-core` transform 順序**——原文
   `translation → scale → rotationX/Y → skew → rotation` 是錯的；GSAP 3.15.1
   CSSPlugin 實際組合順序是 `translation → rotation → rotationY → rotationX →
   skew → scale`。
2. **`gsap-timeline` position parameter**——移除錯誤的 “(default)” 標記；省略
   position parameter 是**附加在 timeline 尾端**，`">"` 的意思是「最近加入的
   動畫之後」，不是預設值。
3. **`gsap-scrolltrigger` refreshPriority**——方向寫反了；**數字越大越先
   refresh**，所以頁面第一個 section 要給較大的數字。
4. **`gsap-frameworks` 重複的 `type Plugins`**——第二個宣告改名為
   `type PluginName = keyof PluginMap`，並同步更新 `PluginModule`、
   `PluginExport`、`lazyLoadPlugin` 的約束。

有記錄但**沒有**修補的：GSAP 3.15 的 `easeReverse` 未被 skill 提及；Nuxt 範例
把 cleanup 寫在 `onMounted`（issue #23，範例未隨附）。兩者都寫在 known-issues
文件。Fail-loud 的 vendor 腳本會在預期原文消失時中止，避免更正悄悄失效。

## 需求

- DeepSeek Harness **0.2.2-rc.1**（`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`）。
- Node.js **>= 22**（跟 Harness 一致）。
- 受管理的 DSH profile（Desktop app 的 `desktop` profile，或 CLI 管理的
  profile）。
- **GSAP 本身沒有隨附。** 這些 skill 只記錄怎麼用 GSAP；每個專案要依
  GreenSock 的授權自行從 npm 安裝 `gsap`（與需要的 plugin）。

## 安裝

三種方式都寫在 [INSTALL.md](INSTALL.md)：

1. **Plugins 頁（建議）**：Plugins → Add plugin → 安裝第三方外掛 → 貼上這個
   目錄的絕對路徑。
2. **`plugin_manager` 工具**：
   `plugin_manager(action: "install_bundle", target: "/abs/path/to/dsh-gsap-skills")`。
3. **手動複製（進階，只在 Plugin Manager 不可用時）**：把 checkout 複製到
   profile 的 `node_modules`，手動加入 dependency 與 bundle 清單；INSTALL.md
   有完整步驟與 rollback。

**安裝或切換 bundle 後要重啟 DSH。** Profile bundle rows 是在 DSH host 開機時
compose 的；新 session 或頁面重載不會重新 compose，`plugin_manager` 顯示
installed/enabled 只代表 profile 狀態正確，不代表執行中的 host 已經掛載這個
row。

## 使用方式

在 session 裡用 `skill` 工具或其 `/` 手勢載入：

- `/gsap-core`——「這個元素要怎麼用 GSAP 做動畫？」
- `/gsap-timeline`——「把這些步驟串成 timeline，`"<"` 是什麼意思？」
- `/gsap-scrolltrigger`——「pin 住這個 section 並用 scrub」
- `/gsap-plugins`——「註冊 SplitText，並 lazy-load Draggable」
- `/gsap-react`——「React 裡怎麼清掉這個動畫？」
- `/gsap-frameworks`——「Vue/Nuxt/Svelte 的生命週期清理」
- `/gsap-performance`——「這個列表動畫會卡，為什麼？」
- `/gsap-utils`——「用 gsap.utils 做 clamp 與 snap」

自然語言也可以：「用 GSAP timeline 這個 skill 幫我看這段序列」。Skill 內容是
上游文件，不會安裝套件、也不會執行任何動畫程式碼。

## 從檔案層安裝遷移（bundle 要生效的必要步驟）

DSH 原始碼的三個事實在決定哪一份 skill 會勝出：

1. `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 把
   `skill-filesystem` 掛在 **agent preset 的 scope** 裡。
2. `@deepseek-ai/dsh-web-app/cordis.patch.yml` **停用 host 層的
   `skill-filesystem` row**（註解明寫 "presets own local discovery"）。
3. `@deepseek-ai/dsh-skill` 合併 global layer 與觀看 scope 的 chain：
   **最近一層的同名條目直接勝出**；rank 只在同一層內排序重複名稱。

本 bundle 是 host row，註冊在 **global layer**。任何位於 `~/.agents/skills`、
`$DSH_HOME/skills` 或專案 `.agents/skills` 的 `gsap-*` 檔案層副本，都會被
preset 的 filesystem provider 掃到，因此位於**更近的 scoped layer**，無條件
勝出；bundle 蓋不過它。預檢：

```bash
for d in ~/.agents/skills "${DSH_HOME:-$HOME/.dsh}/skills"; do
  for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
    test -d "$d/$s" && echo "WARNING: file-level copy will shadow the bundle: $d/$s"
  done
done
```

把副本移出（本套件不會替你搬）：

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s ~/.dsh-backup/$s-$(date +%F)
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" ~/.dsh-backup/$s-dsh-$(date +%F)
done
```

專案內的 `<repo>/.agents/skills/gsap-*` 也要一併移出。移除會由 filesystem
watcher 在下一個 pre-step 接手（移除本身不需要重啟）；但**安裝或切換 bundle**
仍需要重啟 DSH。

## 已驗證與未驗證

以下每一項都可以在套件目錄直接執行。**已在 macOS 27.2（arm64）、Node
22.21.1、2026-11-09 驗證**：

| 檢查 | 指令 | 結果 |
|---|---|---|
| Offline 閘門 | `bash tests/offline-check.sh` | `RESULT: PASS (90 checks)` |
| Host smoke | `node tests/host-smoke.mjs` | `11/11 passed` |
| Registry smoke（選用） | `node tests/registry-smoke.mjs`，用 `DSH_ASAR_MODULES` 指向解開的 `app.asar` 內 `@deepseek-ai` | `3/3 passed` |
| 更正檢查 | `node tools/apply-corrections.mjs --check` | `corrections: 10/10 verified` |
| JS 語法 | `node --check lib/index.js` | exit 0 |
| Vendor 冪等性 | 重跑 `tools/vendor-upstream.sh --from-dir /tmp/gsap-skills --ref aed9cfd3… --no-tests` | `skills/`、`checksums.txt`、`provenance.json` byte-identical |

選用 registry 測試在沒有解開的 DSH 套件樹時會印 `SKIP` 並 exit 0；**SKIP 不算
驗證，只有真正的 `PASS` 才算。**

**未驗證：**

- **在 DSH profile 的 live 啟用。** 本 repo 沒有安裝這個 bundle；host half 由
  fake-Cordis 測試與真實 registry 載入路徑測試覆蓋，但 `skill("gsap-core")`
  要等 Lead 安裝並重啟 DSH 才能確認。
- **Plugins 頁面的呈現**：本地化標題／說明與 icon 的實際畫面。
- **GSAP runtime 行為**：4 項更正是對 GSAP 3.15.1 原始碼與 upstream issue
  驗證，不是逐個動畫在瀏覽器實跑；套件沒有隨附 GSAP。
- **上游是否已修**：issue #20/#21/#23 在 2026-11-09 仍 open；這些更正是本
  bundle 的，不是上游的。
- **非 macOS 主機**，以及 0.2.2-rc.1 以外的 DSH 版本。
- **沒有 npm 發布**：`private: true`，只從 checkout 安裝。

## 上游已知問題

完整引述、source 證據與 issue 連結：
[docs/KNOWN-UPSTREAM-ISSUES.md](docs/KNOWN-UPSTREAM-ISSUES.md)。
系列慣例：[docs/SERIES.md](docs/SERIES.md)。

## 開發

```bash
npm test                  # offline 閘門，最後印 RESULT: PASS
npm run check             # node --check lib/、tests/、tools/
npm run smoke             # host + 選用 registry smoke
npm run corrections-check # 檢查 vendored tree 的 4 項更正
```

重新 vendor（決定性、可重複）：

```bash
bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
  --repo /path/to/gsap-skills
# 或直接從既有 checkout：
bash tools/vendor-upstream.sh --from-dir /path/to/gsap-skills \
  --ref aed9cfd3277740755f6bfc1155c7aa645403b760
```

它會複製 8 個 `SKILL.md` 與 `llms.txt`、套用更正（預期原文消失就失敗）、重寫
`checksums.txt` 與 `provenance.json`，並跑閘門。若 commit 變更，記得更新
[NOTICE](NOTICE) 的 `Source:` 行；`NOTICE` 與 `provenance.json.ref` 不一致時
offline 閘門會失敗。沒有 build step。

## 目錄結構

```
lib/index.js                 host half：讀取、解析、註冊、釋放
cordis.patch.yml             單一 insert row：id gsap -> @chonwai/dsh-gsap-skills
skills/gsap-*/SKILL.md       8 個 vendored skills（已套用 4 項更正）
skills/llms.txt              上游 skill 索引
locale/{en,zh}.json          Plugins 頁標題／說明／詳情檔
icon.svg                     原創 motion/timeline 圖示
checksums.txt                9 個 vendored 檔案的 sha256 釘選
provenance.json              上游 URL、完整 commit、4 項更正
tools/vendor-upstream.sh     重新 vendor + 更正 + checksums + provenance + 測試
tools/apply-corrections.mjs  fail-loud 的 4 項更正腳本
docs/KNOWN-UPSTREAM-ISSUES.md  原文引述、更正、issue 連結、未修補缺口
docs/SERIES.md               系列命名與驗證慣例
patches/README.md            為什麼更正是程式碼而不是 diff 檔
tests/offline-check.sh       靜態驗收閘門
tests/host-smoke.mjs         以假 Cordis context 測 host half
tests/registry-smoke.mjs     選用：真實 dsh-skill registry 測試
```

## 授權與署名

MIT，見 [LICENSE](LICENSE)。8 個 skill 檔與 `llms.txt` vendor 自
[greensock/gsap-skills](https://github.com/greensock/gsap-skills) 的
`aed9cfd3…`（MIT，Copyright (c) 2026 GreenSock），並套用上述 4 項更正。
[NOTICE](NOTICE) 包含上游 MIT 全文、商標／無隸屬聲明、修改聲明，以及
「GSAP 函式庫未隨附、且不是 MIT」的明確說明。Icon 是本 bundle 的原創作品。
