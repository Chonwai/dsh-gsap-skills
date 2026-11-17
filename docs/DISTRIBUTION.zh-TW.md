[English](DISTRIBUTION.md) · [繁體中文](DISTRIBUTION.zh-TW.md) · [简体中文](DISTRIBUTION.zh-CN.md)

> 本檔案是英文版的翻譯；英文版為準。

# 安裝與分發 `@chonwai/dsh-gsap-skills`

一份給朋友看的指南：這個 DeepSeek Harness（DSH）bundle 的四種受支援安裝方式、
怎麼驗證它，以及它沒出現時該怎麼辦。正式 repo：
<https://github.com/Chonwai/dsh-gsap-skills>。

本套件是 GreenSock 官方 GSAP skill 的**非官方** bundle，與 GreenSock 或
DeepSeek 沒有隸屬或背書關係。skill 文件是 MIT；**GSAP 庫沒有隨附，也不是
MIT**——每個專案要按 GreenSock 的授權自行安裝 GSAP。

## 哪些驗證過、哪些沒驗證

| 本 repo 驗證過 | 本 repo 沒驗證 |
|---|---|
| 從解包後的套件跑 `npm pack` tarball 完整性與各道閘門（`npm test`、host/registry smoke、checksums） | 實際的 **Plugins 頁 UI 流程**（對話方塊、信任確認框、Enable now）——本文只按預期 UI 行為記錄，本 repo 沒有端到端重測 |
| 真實 DSH 的 `parseInstallSpec` 接受文中列出的形式（並拒絕 tree URL／相對路徑） | 安裝到受管理的 DSH profile——release 驗證時沒有安裝任何 profile |
| `npm install github:…#v1.0.7` 能把 tag 解析到正確的 commit | npm registry 通道（本套件是 `private`） |
| 用 `tools/check-release.sh` 檢查 version／checksums／release 一致性 | GSAP runtime 動畫行為（本 bundle 只隨附文件，不是庫） |

## 1. 前置條件

- **DSH desktop 0.2.2-rc.1，或 0.2.x 線內更新的版本**
  （`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`）。
- 一個**受管理的 DSH profile**（desktop app 的 `desktop` profile，或由 CLI 管理
  的 profile）。desktop app 自己管理它的 profile；請用 Plugins 頁或
  `plugin_manager`，不要用 `dsh plugin add`。
- **網路**：git 安裝與 Plugins 頁 catalog 需要。
- **`git`**：git 通道需要。沒有 git 就改用 release tarball。
- **bundle 本身不需要 Node.js。** Node >= 22 只在開發或測試本套件時需要；安裝
  好的 bundle 只是讀檔案。
- 每個 `plugin_manager` 動作（包括列表）都需要 **Full access** 或一個審批
  提示。Web 安裝對話方塊有自己的信任確認。

## 2. DSH 如何解讀 install spec

Plugin Manager 接受這些形式（對照 `@deepseek-ai/dsh-plugin-manager` 的
install-spec 解析器驗證過；hosted git URL 與 shorthand spec 允許帶
`#tag`／`#ref` 片段）：

| 形式 | 示例 |
|---|---|
| 本地絕對目錄 | `/Users/you/dsh-gsap-skills` |
| 本地絕對路徑 tarball | `/Users/you/Downloads/dsh-gsap-skills-1.0.7.tgz` |
| http(s) tarball | `https://example.com/dsh-gsap-skills-1.0.7.tgz` |
| git shorthand + tag | `github:Chonwai/dsh-gsap-skills#v1.0.7` |
| git URL | `git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.7` |
| hosted repository URL + tag | `https://github.com/Chonwai/dsh-gsap-skills#v1.0.7` |
| npm 包名（未來） | `@chonwai/dsh-gsap-skills@1.0.7` |

強烈建議釘住 tag：branch 會移動，tag 不會。上面這些形式是等價的；hosted URL
最適合粘進對話方塊。

### 安裝器會拒絕的常見錯誤

Plugin Manager 會在 pnpm 看到 spec 之前先校驗。常見失敗有兩種：

- GitHub **tree URL**——`https://github.com/Chonwai/dsh-gsap-skills/tree/main`
  或 `…/tree/v1.0.6`——會被拒絕，錯誤是
  `a URL must point at a git repository or a tarball`。請用 **repo 根** URL 加
  tag：`https://github.com/Chonwai/dsh-gsap-skills#v1.0.7`。
- **相對路徑**——`./x`、`../x`、`file:./x`——會被拒絕，錯誤是
  `a local path must be absolute`。請用絕對目錄或 `.tgz` 路徑
  （`/Users/you/...`）。

`github:Chonwai/dsh-gsap-skills#v1.0.7` 與
`git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.7` 是被接受的替代
形式，與 hosted URL 等價。

## 3. 通道 1——Plugins 頁（對朋友最推薦）

1. 開啟側邊欄的 **DSH → Plugins**。
2. **Add plugin** → **Install a third-party plugin**。
3. 貼上釘好的 spec：
   `https://github.com/Chonwai/dsh-gsap-skills#v1.0.7`
   （或 `github:Chonwai/dsh-gsap-skills#v1.0.7`）。
4. 閱讀信任確認框並確認。DSH 會克隆該 tag、加上 profile dependency 與 bundle
   row，並啟用 bundle。
5. 如果對話方塊提供 **Enable now**，就接受它。
6. 如果新 session 裡沒看到 skill，就**重啟 DSH**（profile bundle rows 在 host
   啟動時 compose；只重新整理頁面不會重新 compose），再開一個新的 session。

上面這些對話方塊步驟是**預期的 UI 行為，本 repo 沒有端到端重測**；spec 解析、
套件解析、tarball 閘門與 release 檢查則有測試（見上面的驗證表）。

git 通道需要 `git` 與網路；私有 fork 需要它自己的憑證。

## 4. 通道 2——agent／`plugin_manager`

在具備 Full access（或你能回答審批提示）的 session 裡：

```
plugin_manager(action: "install_bundle", target: "https://github.com/Chonwai/dsh-gsap-skills#v1.0.7")
```

同樣接受絕對路徑、tarball URL 或 git 形式。返回的 `application: "applied"` 表示
profile 已變更；它不代表執行中的 host 已掛載這個 row——預期 skill 出現之前，
先重啟 DSH。

## 5. 通道 3——離線 tarball

從 GitHub release 下載 `dsh-gsap-skills-1.0.7.tgz`，然後驗證並安裝它（`npm
pack` 產出的同一份位元組叫 `chonwai-dsh-gsap-skills-1.0.7.tgz`；release asset 是
改過名的）：

```bash
shasum -a 256 -c dsh-gsap-skills-1.0.7.tgz.sha256
# then, in the Plugins dialog, paste the absolute path to the .tgz:
#   /Users/you/Downloads/dsh-gsap-skills-1.0.7.tgz
```

`plugin_manager` 接受同樣的絕對 tarball 路徑。解包後的目錄也可以，只要路徑是
絕對的。tarball 是完整的：包含 `lib/`、`skills/`、`docs/`、`locale/`、
`icon.svg`、`provenance.json`、`checksums.txt` 與測試，所以解包後的副本能和
repo 一樣透過同樣的閘門。

## 6. 通道 4——npm（未來；尚未釋出）

本套件目前是 `private: true`，所以沒有 npm release，registry 通道**還不可
用**。如果維護者之後真的釋出：

```bash
# maintainer, once per release (needs `npm login` and publish rights)
npm publish --access public        # after flipping private -> false for that release

# friend
plugin_manager(action: "install_bundle", target: "@chonwai/dsh-gsap-skills@1.0.7")
```

釋出是一個由人刻意執行的動作；在 release notes 寫明之前，不要假設 registry
名稱已經存在。

## 7. 驗證你裝了什麼

先在 session 裡跑，再在 shell 裡跑：

1. `plugin_manager(action: "list_bundles")` → `@chonwai/dsh-gsap-skills`
   顯示 `installed: true`、`enabled: true`、`removable: true`，row 為
   `include:gsap`。
2. 新 session 的 skill catalog 會列出全部 8 個名字：`gsap-core`、
   `gsap-timeline`、`gsap-scrolltrigger`、`gsap-plugins`、`gsap-utils`、
   `gsap-react`、`gsap-frameworks`、`gsap-performance`。
3. Layer 預檢：檔案層副本會贏過 bundle。
   `test -d ~/.agents/skills/gsap-core && echo "shadowed"` 應該沒有輸出（也一併
   檢查 `$DSH_HOME/skills` 與專案 `.agents/skills`）。若有輸出，見 §8。
4. `skill("gsap-core")`（或 `/gsap-core`）返回 `<skill_content>`，其中
   `Base directory for this skill: /abs/path/.../skills/gsap-core`、更正後的
   transform 順序 `translation → rotation → rotationY → rotationX → skew →
   scale`，且沒有 `{{...}}` 佔位符。

## 8. Layer 注意事項：檔案副本會勝出，以及如何遷移

DSH 的標準 Web preset 把 `skill-filesystem` 掛在 agent preset 的 scope 裡，並
停用 host 層的 filesystem row；catalog 會把 global layer 與觀看 scope 的 chain
合併，**最近一層的同名條目直接勝出**。本 bundle 是 global layer 裡的 host row，
所以 `~/.agents/skills`、`$DSH_HOME/skills` 或專案 `.agents/skills` 底下的
`gsap-*` 檔案層副本位置更近，會勝出。bundle 無法覆蓋它。

先備份，再把副本移出去（移除會被 filesystem watcher 即時接手；安裝或切換
bundle 仍需重啟 DSH）：

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s ~/.dsh-backup/$s-$(date +%F)
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" ~/.dsh-backup/$s-dsh-$(date +%F)
done
```

專案內的 `<repo>/.agents/skills/gsap-*` 副本也要一併移出。本套件不會替你刪除
或修改這些副本。

## 9. 更新與解除安裝

- **更新**：再安裝一次新的、釘好的 spec（如果 Plugins 頁無法原地更新，就先
  移除舊 bundle），或在提供時用 Plugins 的 **Update** 動作。之後重啟 DSH。
- **暫停**：Plugins → 把 bundle 關掉，然後重啟 DSH。
- **解除安裝**：Plugins → Remove（或
  `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`），
  然後重啟 DSH。移除 bundle 不會動 `~/.agents` 或 `$DSH_HOME`，也不會從任何
  專案解除安裝 GSAP。
- 不需要備份：這個 bundle 只是展示用的文件；移除它不會丟任何使用者資料。

## 10. 疑難排解

| 症狀 | 原因 | 處理 |
|---|---|---|
| 顯示 installed/enabled，但過載後 skill 不見 | bundle rows 在 host 啟動時 compose | 重啟 DSH；開一個新的 session |
| catalog 顯示 skill 的舊副本 | preset 會掃的目錄裡還有檔案層副本 | 跑 §8 的預檢／遷移 |
| 安裝失敗，報 git／auth 錯誤 | 私有 fork、缺少 `git`，或網路問題 | 改用 release tarball（§5），或修好憑證 |
| 安裝被拒，報 `engines`／版本資訊 | DSH 不在 `>=0.2.2-rc.1 <0.3.0` 範圍內 | 升級／降級 DSH；不要硬上 |
| `plugin_manager` 找不到 `@chonwai/dsh-gsap-skills` | npm 通道尚未釋出 | 改用 git tag 或 tarball |
| CI 顯示 `SKIP registry-smoke` | 可選的真實 registry 測試需要解包後的 `app.asar` | SKIP **不算**驗證；只有 `PASS` 才算 |
| 專案裡 import `gsap` 報錯 | 本 bundle 只隨附文件，不是庫 | 在該專案按 GreenSock 的授權 `npm install gsap` |
| 不確定它是不是官方的 | 不是官方的 | 非官方社群 bundle；見 NOTICE |

## 11. 可直接複製給朋友的訊息

```
GSAP skills for DeepSeek Harness — unofficial bundle, 8 skills:
https://github.com/Chonwai/dsh-gsap-skills
DSH → Plugins → Add plugin → Install a third-party plugin → paste https://github.com/Chonwai/dsh-gsap-skills#v1.0.7
Read the trust box and confirm, choose Enable now, restart DSH, then load /gsap-core.
If skills don't appear: move ~/.agents/skills/gsap-* (and $DSH_HOME/skills, project .agents/skills) out of the skills root.
```
