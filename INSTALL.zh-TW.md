[English](INSTALL.md) · [繁體中文](INSTALL.zh-TW.md) · [简体中文](INSTALL.zh-CN.md)

> 本文件是英文版的翻譯；英文版為準。

# INSTALL — @chonwai/dsh-gsap-skills

本指南說明 DeepSeek Harness（DSH）bundle 的安裝、啟用、遷移、驗證、更新與回滾，
以 macOS 上的 DSH **0.2.2-rc.1** 為準；同樣流程適用於任何受管理的 profile。

> 本 bundle 是 Host-only：一個 plugin row 註冊 8 個 runtime skill。
>
> **啟用規則：profile bundle rows 是在 DSH host 啟動時 compose 的。** 在已經
> 執行的 host 上安裝、啟用、停用或移除 bundle 之後，**要重啟 DSH**。新建
> session 或重新載入 Web 頁面都**不會**重新 compose profile。`plugin_manager` 報告
> installed/enabled 只代表 profile 正確，不代表執行中的 host 掛載了這個 row。
>
> **Skill layer 規則：本 bundle 註冊在 host/global layer。** Web app 把
> `skill-filesystem` 掛在 **agent preset 的 scope 裡**，並停用 host 層的
> filesystem row；因此 `~/.agents/skills`、`$DSH_HOME/skills` 或專案
> `.agents/skills` 底下的 `gsap-*` 檔案層副本會被 preset 的 provider 掃到，位於
> **更近的 scoped layer**，會直接贏得同名 skill。**bundle 無法覆蓋它。** 請先
> 把檔案層副本遷移出去（§5）。

> 面向朋友的釋出通道（Plugins 頁、git tag、release tarball、未來的 npm）以及
> 可直接複製的訊息，見 [docs/DISTRIBUTION.zh-TW.md](docs/DISTRIBUTION.zh-TW.md)；
> 本文件保留完整的安裝／驗證／回滾流程。

## 0. 安裝之前

| 專案 | 說明 |
|---|---|
| 預檢 | `test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"`——若有輸出，先遷移（§5） |
| 寫入什麼 | profile 的 `package.json` dependency（本地目錄用 `link:`）、有序的 `dsh.profile.bundles` 清單、profile 的 `node_modules` 連結與 lockfile——由 DSH 的 Plugin Manager 完成，不是本套件 |
| 本套件在 runtime 寫什麼 | 不寫自己套件之外的任何位置；只讀 `skills/**` |
| 需要的權限 | 每個 `plugin_manager` 動作（包括列表）都需要 **Full access** 或一個審批提示；Web UI 的安裝對話方塊有自己的信任確認 |
| 網路 | 本地目錄安裝不需要；沒有要下載的依賴 |
| 重啟 | **任何 bundle 變更後都必須重啟**；執行中的 host 只會保留它啟動時的那批 row |
| GSAP 函式庫 | **未隨附**。這些 skill 只是記錄 GSAP；每個專案要按 GreenSock 的授權自行安裝 `gsap` |
| 退場方式 | 把 bundle 關掉（再重啟），或移除它（見 §7） |

## 1. 從 Web UI 安裝（建議）

1. 開啟 DSH → 側邊欄的 **Plugins**。
2. **Add plugin** → **Install a third-party plugin**。
3. 貼上這個目錄的**絕對路徑**，例如
   `/Users/you/code/dsh-gsap-skills`。
4. 閱讀信任確認框並確認。DSH 會讀取套件、對 profile 執行 pnpm，然後套用
   bundle patch。
5. 如果對話方塊提供 **Enable now**，就接受它。
6. **重啟 DSH**（退出後重新開啟），然後遷移任何檔案層副本（§5），開一個新
   session 並用 §4 驗證。

## 2. 透過 `plugin_manager` 安裝（由 agent 驅動）

在具備 Full access（或你能回答審批提示）的 session 裡：

```
plugin_manager(action: "install_bundle", target: "/abs/path/to/dsh-gsap-skills")
```

- 這執行與 UI 相同的操作：`pnpm add link:<path>`、追加到
  `dsh.profile.bundles`、套用 `dsh.bundle.patch`、啟用 bundle。
- 沒有依賴，也沒有 install script，所以不會出現 `approvedBuilds` /
  `pendingBuilds` 提示。
- 看傳回的 `application` 欄位：`applied` 表示 profile 層已套用。它**不**表示
  執行中的 host 已掛載這個 row——預期 skill 出現之前，先重啟 DSH。
  `restart-required` 講的是同一件事，只是更明確。

**不要**自己手改 profile 的 `package.json` 或 `cordis.patch.yml` 再手動跑 pnpm
來複現安裝——那超出了受支援的 Plugin Manager 流程，而且每次寫入都要單獨審批。
請用 §1 或 §2。

## 3. 手動複製（進階；只在 Plugin Manager 不可用時）

這繞過了受支援的流程。請先備份 profile，並且要有自己管理更新／回滾的心理
準備。以下路徑都在受管理的 profile 目錄內（`$DSH_PROFILE_DIR`，例如
`~/.dsh/profiles/desktop`）：

```bash
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
mkdir -p "$PROFILE/node_modules/@chonwai"
rsync -a --delete /abs/path/to/dsh-gsap-skills/ \
  "$PROFILE/node_modules/@chonwai/dsh-gsap-skills/"
```

然後，在 app 已停止、或 profile 檔案只在一個文字編輯器裡開啟的情況下：

1. 在 profile `package.json` 的 `dependencies` 裡加上
   `"@chonwai/dsh-gsap-skills": "link:/abs/path/to/dsh-gsap-skills"`（或
   `file:` 路徑）；
2. 把 `"@chonwai/dsh-gsap-skills"` 追加到 `dsh.profile.bundles`；
3. 跑一次 profile 的 package manager install（只在 host 需要時）；
4. **重啟 DSH**。

回滾：刪掉複製進去的目錄、dependency 條目與 bundle 條目，然後重啟。這條路徑
不在 `plugin_manager` 的診斷範圍內，CI 也沒有測過；請優先用 §1／§2。

## 4. 驗證（重啟並完成遷移之後）

1. **預檢**：`test -d ~/.agents/skills/gsap-core` 必須沒有輸出（`$DSH_HOME/skills`
   與專案 `.agents/skills` 也一樣）。還留著的副本會待在 preset 的 scoped layer
   並勝出；先遷移它（§5）。
2. **重啟 DSH**，然後開一個新的 session。
3. **載入一個 skill**：用 `skill` 工具或 `/gsap-core`。結果必須顯示
   `<skill_resources>`，其中
   `Base directory for this skill: /abs/path/dsh-gsap-skills/skills/gsap-core`、
   上游正文，且沒有 `{{...}}` 佔位符。
4. **Catalog**：8 個名字都應該被列為 runtime skill：
   `gsap-core`、`gsap-timeline`、`gsap-scrolltrigger`、`gsap-plugins`、
   `gsap-utils`、`gsap-react`、`gsap-frameworks`、`gsap-performance`。
5. **如果 catalog 顯示的仍是舊副本**（例如 skill 正文裡沒有更正後的 transform
   順序）：
   - 再跑一次第 1 步的預檢——scoped 檔案層副本是最可能的原因；
   - 確認 host 是在安裝**之後**重啟的；
   - 檢查 `plugin_manager(action: "list_bundles")` 是否顯示
     `@chonwai/dsh-gsap-skills` installed/enabled，且 row 為 `include:gsap`；
   - 再重啟一次 DSH 並重試。只開新 session 修不好這個。
6. **Plugins 頁**：已安裝的 bundle 應該帶著本地化標題／描述與 icon 出現（如果
   該 build 會呈現 bundle metadata），並且應該列出 row **gsap**。
7. **只讀檢查**：`cordis_inspect_query(platform: "host",
   provider: "Config", method: "listConfigs", input: { name:
   "@chonwai/dsh-gsap-skills" })` 可以找到執行中的 row。`status: "absent"` 的
   意思是“沒有 Config schema”，不是“被停用”。

> 只有 host-global catalog 讀取時看到同名的 **global** 條目，bundle 才會發出
> `[gsap] …` 警告。在標準 Web preset 下，檔案層副本位於 preset 的 scoped
> layer，bundle 根本看不到它；scoped 副本就是直接勝出。不要把那一行當成驗證
> 訊號。

## 5. Layer 語義與從檔案層安裝遷移（必要步驟）

DSH 原始碼裡的三個事實，決定了哪一份副本會勝出：

1. `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 把
   `skill-filesystem` 掛在 **agent preset 的 scope 裡**。
2. `@deepseek-ai/dsh-web-app/cordis.patch.yml` **停用 host 層的
   `skill-filesystem` row**（註解明寫 "presets own local discovery"）。
3. `@deepseek-ai/dsh-skill` 把 global layer 與觀看 scope 的 chain 合併：
   **最近一層的同名條目直接勝出**；rank 只在同一層內排序重名條目。

後果：

- 本 bundle 是 **global** layer 裡的 host row。位於 `~/.agents/skills`、
  `$DSH_HOME/skills` 或專案 `.agents/skills` 的 `gsap-*` 檔案層副本，會被
  preset 的 provider 掃到，位於**更近的 scoped layer**；它無條件勝出，bundle
  無法覆蓋它。
- 移除檔案層副本會被 filesystem watcher **即時**接手（catalog 在下一個
  pre-step 重新整理）。但安裝或切換 bundle 本身仍需要**重啟 host**。
- 因此，profile 已正確安裝、而勝出的 catalog 條目仍是舊檔案副本，是完全可能
  的。這是預期行為，不是安裝失敗。

預檢：

```bash
test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"
test -d "${DSH_HOME:-$HOME/.dsh}/skills/gsap-core" && echo "WARNING: DSH_HOME copy will shadow the bundle"
```

把副本移出去（手動；本套件從不代勞）：

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  TARGET=~/.dsh-backup/$s-$(date +%F)
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s "$TARGET"
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" "$TARGET-dsh"
done
```

專案內的 `<repo>/.agents/skills/gsap-*` 也要一併移出。副本先留著當備份，直到
bundle 驗證透過為止。移完之後，等下一個 pre-step（或發一條訊息），再重試
§4.3——這個切換應該不需要重啟。如果還是沒變化，重啟 DSH 一次（bundle row
仍然必須在啟動時 compose）。

## 6. 更新

1. 同時更新 `package.json` 與 `lib/index.js`（版本字串要一致）。
2. 上游有變化時重新 vendor：

   ```bash
   bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
     --repo /path/to/gsap-skills
   # or from an existing checkout:
   bash tools/vendor-upstream.sh --from-dir /path/to/gsap-skills \
     --ref aed9cfd3277740755f6bfc1155c7aa645403b760
   ```

   它會複製 8 個 `SKILL.md` 與 `llms.txt`、套用 4 項更正（預期原文消失就
   失敗）、重寫 `checksums.txt` 與 `provenance.json`，並跑各道閘門。
3. 把 `NOTICE` 的 `Source:` 行更新成新的完整 commit；`NOTICE` 與
   `provenance.json.ref` 不一致時 offline 閘門會失敗。
4. 重新安裝／重啟 bundle。link 安裝要靠**重啟 DSH** 重新掛載；替換套件後也
   需要重啟，才能得到新的 Host module generation。
5. 在 §5 清理完之後重跑 §4。只有 catalog、載入的正文（以及可選的、專案層的
   GSAP 測試）都透過之後，才能宣稱成功。

## 7. 切換與回滾

| 意圖 | 操作 | 說明 |
|---|---|---|
| 暫停但不解除安裝 | Plugins → 把 bundle 關掉（或 `plugin_manager(action: "set_bundle", target: "@chonwai/dsh-gsap-skills", enabled: false)`） | 只改 profile；要**重啟 DSH** 才會從執行中的 host 撤掉這 8 個註冊 |
| 恢復 | 把它開啟／`enabled: true` | **重啟 DSH** 才會重新 compose bundle |
| 完全移除 | Plugins → Remove（或 `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`） | 移除 dependency 與 bundle 層；若被要求重啟就重啟（建議重啟） |
| 繼續用檔案層 | 自己把 8 個 `SKILL.md` 複製到 `~/.agents/skills` | 那份副本會贏過 bundle（更近的 preset layer）；兩條路選一條 |

移除 bundle 不會刪掉 `~/.agents` 或 `$DSH_HOME` 裡的任何東西。

## 8. 疑難排解

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| bundle 顯示 installed/enabled，但重新載入或新 session 後 catalog 沒變 | 重啟前就是這樣；bundle rows 在 host 啟動時 compose | 重啟 DSH |
| 重啟後 catalog 裡仍是 skill 的舊副本 | 還有檔案層副本留在 preset 會掃的目錄裡；它從更近的層勝出 | 跑 §5 的預檢，把副本移出，等一個 pre-step |
| `skill("gsap-core")` 顯示錯誤的 transform 順序 | 載入的正文是檔案層副本，或是較舊的 module generation | 遷移檔案層副本；如果 bundle 已經是勝出者，重啟 DSH 換新的 module generation |
| catalog 裡少了一個 skill | 另一個 runtime 註冊佔用了那個名字（會有警告），或 `skills` 不存在 | 移除競爭的 runtime 來源；確認 `skills` 已掛載 |
| `[gsap] …` 警告從沒出現 | 在 Web preset 下是預期行為：scoped 檔案副本對 bundle 的 global catalog 讀取不可見 | 改用 §5 的預檢 |
| `skill(...)` 拋 `source must be a string` | 載入了比本套件更舊的 Host module generation | 重啟 DSH |
| Plugins 卡片沒有 icon／標題 | 該 build 沒有呈現 bundle 的 locale metadata | 檢查 row 診斷資訊；本 repo 未驗證實際渲染結果 |
| Offline 檢查失敗，報 "NOTICE commit does not match provenance.json" | 重新 vendor 後沒有更新 NOTICE | 把 `NOTICE` 設成 `provenance.json.ref` |
| Offline 檢查失敗，報 "uncorrected upstream text still present" | 有人手改了 vendored skill | 重跑 `tools/vendor-upstream.sh`；永遠不要手改 vendored 檔案 |

## 9. 解除安裝

Plugins 頁 → 移除 bundle，或
`plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`，
然後重啟 DSH，讓執行中的 host 停止提供這些註冊。profile 之外的東西都不會變。
這些 skill 只是文件；移除 bundle 不會從任何專案裡解除安裝 GSAP。

## 10. 提交 issue

請附上：DSH 版本與 host 啟動時間、profile 名稱、`gsap` row 的啟用狀態、安裝後
是否重啟過 DSH、`~/.agents/skills`／`$DSH_HOME/skills`／專案 `.agents/skills`
底下是否存在 `gsap-*` 檔案層副本、`tests/offline-check.sh` 的輸出，以及你實際
看到的 skill 正文。
