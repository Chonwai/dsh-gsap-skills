[English](DISTRIBUTION.md) · [繁體中文](DISTRIBUTION.zh-TW.md) · [简体中文](DISTRIBUTION.zh-CN.md)

> 本文件是英文版的翻译；英文版为准。

# 安装与分发 `@chonwai/dsh-gsap-skills`

一份给朋友看的指南：这个 DeepSeek Harness（DSH）bundle 的四种受支持安装方式、
怎么验证它，以及它没出现时该怎么办。正式 repo：
<https://github.com/Chonwai/dsh-gsap-skills>。

本套件是 GreenSock 官方 GSAP skill 的**非官方** bundle，与 GreenSock 或
DeepSeek 没有隶属或背书关系。skill 文档是 MIT；**GSAP 库没有随附，也不是
MIT**——每个项目要按 GreenSock 的授权自行安装 GSAP。

## 哪些验证过、哪些没验证

| 本 repo 验证过 | 本 repo 没验证 |
|---|---|
| 从解包后的套件跑 `npm pack` tarball 完整性与各道闸门（`npm test`、host/registry smoke、checksums） | 实际的 **Plugins 页 UI 流程**（对话框、信任确认框、Enable now）——本文只按预期 UI 行为记录，本 repo 没有端到端重测 |
| 真实 DSH 的 `parseInstallSpec` 接受文中列出的形式（并拒绝 tree URL／相对路径） | 安装到受管理的 DSH profile——release 验证时没有安装任何 profile |
| `npm install github:…#v1.0.8` 能把 tag 解析到正确的 commit | npm registry 通道（本套件是 `private`） |
| 用 `tools/check-release.sh` 检查 version／checksums／release 一致性 | GSAP runtime 动画行为（本 bundle 只随附文档，不是库） |

## 1. 前置条件

- **DSH desktop 0.2.2-rc.1，或 0.2.x 线内更新的版本**
  （`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`）。
- 一个**受管理的 DSH profile**（desktop app 的 `desktop` profile，或由 CLI 管理
  的 profile）。desktop app 自己管理它的 profile；请用 Plugins 页或
  `plugin_manager`，不要用 `dsh plugin add`。
- **网络**：git 安装与 Plugins 页 catalog 需要。
- **`git`**：git 通道需要。没有 git 就改用 release tarball。
- **bundle 本身不需要 Node.js。** Node >= 22 只在开发或测试本套件时需要；安装
  好的 bundle 只是读文件。
- 每个 `plugin_manager` 动作（包括列表）都需要 **Full access** 或一个审批
  提示。Web 安装对话框有自己的信任确认。

## 2. DSH 如何解读 install spec

Plugin Manager 接受这些形式（对照 `@deepseek-ai/dsh-plugin-manager` 的
install-spec 解析器验证过；hosted git URL 与 shorthand spec 允许带
`#tag`／`#ref` 片段）：

| 形式 | 示例 |
|---|---|
| 本地绝对目录 | `/Users/you/dsh-gsap-skills` |
| 本地绝对路径 tarball | `/Users/you/Downloads/dsh-gsap-skills-1.0.8.tgz` |
| http(s) tarball | `https://example.com/dsh-gsap-skills-1.0.8.tgz` |
| git shorthand + tag | `github:Chonwai/dsh-gsap-skills#v1.0.8` |
| git URL | `git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.8` |
| hosted repository URL + tag | `https://github.com/Chonwai/dsh-gsap-skills#v1.0.8` |
| npm 包名（未来） | `@chonwai/dsh-gsap-skills@1.0.8` |

强烈建议钉住 tag：branch 会移动，tag 不会。上面这些形式是等价的；hosted URL
最适合粘进对话框。

### 安装器会拒绝的常见错误

Plugin Manager 会在 pnpm 看到 spec 之前先校验。常见失败有两种：

- GitHub **tree URL**——`https://github.com/Chonwai/dsh-gsap-skills/tree/main`
  或 `…/tree/v1.0.6`——会被拒绝，错误是
  `a URL must point at a git repository or a tarball`。请用 **repo 根** URL 加
  tag：`https://github.com/Chonwai/dsh-gsap-skills#v1.0.8`。
- **相对路径**——`./x`、`../x`、`file:./x`——会被拒绝，错误是
  `a local path must be absolute`。请用绝对目录或 `.tgz` 路径
  （`/Users/you/...`）。

`github:Chonwai/dsh-gsap-skills#v1.0.8` 与
`git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.8` 是被接受的替代
形式，与 hosted URL 等价。

## 3. 通道 1——Plugins 页（对朋友最推荐）

1. 打开侧边栏的 **DSH → Plugins**。
2. **Add plugin** → **Install a third-party plugin**。
3. 粘贴钉好的 spec：
   `https://github.com/Chonwai/dsh-gsap-skills#v1.0.8`
   （或 `github:Chonwai/dsh-gsap-skills#v1.0.8`）。
4. 阅读信任确认框并确认。DSH 会克隆该 tag、加上 profile dependency 与 bundle
   row，并启用 bundle。
5. 如果对话框提供 **Enable now**，就接受它。
6. 如果新 session 里没看到 skill，就**重启 DSH**（profile bundle rows 在 host
   启动时 compose；只刷新页面不会重新 compose），再开一个新的 session。

上面这些对话框步骤是**预期的 UI 行为，本 repo 没有端到端重测**；spec 解析、
套件解析、tarball 闸门与 release 检查则有测试（见上面的验证表）。

git 通道需要 `git` 与网络；私有 fork 需要它自己的凭证。

## 4. 通道 2——agent／`plugin_manager`

在具备 Full access（或你能回答审批提示）的 session 里：

```
plugin_manager(action: "install_bundle", target: "https://github.com/Chonwai/dsh-gsap-skills#v1.0.8")
```

同样接受绝对路径、tarball URL 或 git 形式。返回的 `application: "applied"` 表示
profile 已变更；它不代表运行中的 host 已挂载这个 row——预期 skill 出现之前，
先重启 DSH。

## 5. 通道 3——离线 tarball

从 GitHub release 下载 `dsh-gsap-skills-1.0.8.tgz`，然后验证并安装它（`npm
pack` 产出的同一份字节叫 `chonwai-dsh-gsap-skills-1.0.8.tgz`；release asset 是
改过名的）：

```bash
shasum -a 256 -c dsh-gsap-skills-1.0.8.tgz.sha256
# then, in the Plugins dialog, paste the absolute path to the .tgz:
#   /Users/you/Downloads/dsh-gsap-skills-1.0.8.tgz
```

`plugin_manager` 接受同样的绝对 tarball 路径。解包后的目录也可以，只要路径是
绝对的。tarball 是完整的：包含 `lib/`、`skills/`、`docs/`、`locale/`、
`icon.svg`、`provenance.json`、`checksums.txt` 与测试，所以解包后的副本能和
repo 一样通过同样的闸门。

## 6. 通道 4——npm（未来；尚未发布）

本套件目前是 `private: true`，所以没有 npm release，registry 通道**还不可
用**。如果维护者之后真的发布：

```bash
# maintainer, once per release (needs `npm login` and publish rights)
npm publish --access public        # after flipping private -> false for that release

# friend
plugin_manager(action: "install_bundle", target: "@chonwai/dsh-gsap-skills@1.0.8")
```

发布是一个由人刻意执行的动作；在 release notes 写明之前，不要假设 registry
名称已经存在。

## 7. 验证你装了什么

先在 session 里跑，再在 shell 里跑：

1. `plugin_manager(action: "list_bundles")` → `@chonwai/dsh-gsap-skills`
   显示 `installed: true`、`enabled: true`、`removable: true`，row 为
   `include:gsap`。
2. 新 session 的 skill catalog 会列出全部 8 个名字：`gsap-core`、
   `gsap-timeline`、`gsap-scrolltrigger`、`gsap-plugins`、`gsap-utils`、
   `gsap-react`、`gsap-frameworks`、`gsap-performance`。
3. Layer 预检：文件层副本会赢过 bundle。
   `test -d ~/.agents/skills/gsap-core && echo "shadowed"` 应该没有输出（也一并
   检查 `$DSH_HOME/skills` 与项目 `.agents/skills`）。若有输出，见 §8。
4. `skill("gsap-core")`（或 `/gsap-core`）返回 `<skill_content>`，其中
   `Base directory for this skill: /abs/path/.../skills/gsap-core`、更正后的
   transform 顺序 `translation → rotation → rotationY → rotationX → skew →
   scale`，且没有 `{{...}}` 占位符。

## 8. Layer 注意事项：文件副本会胜出，以及如何迁移

DSH 的标准 Web preset 把 `skill-filesystem` 挂在 agent preset 的 scope 里，并
停用 host 层的 filesystem row；catalog 会把 global layer 与观看 scope 的 chain
合并，**最近一层的同名条目直接胜出**。本 bundle 是 global layer 里的 host row，
所以 `~/.agents/skills`、`$DSH_HOME/skills` 或项目 `.agents/skills` 底下的
`gsap-*` 文件层副本位置更近，会胜出。bundle 无法覆盖它。

先备份，再把副本移出去（移除会被 filesystem watcher 实时接手；安装或切换
bundle 仍需重启 DSH）：

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s ~/.dsh-backup/$s-$(date +%F)
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" ~/.dsh-backup/$s-dsh-$(date +%F)
done
```

项目内的 `<repo>/.agents/skills/gsap-*` 副本也要一并移出。本套件不会替你删除
或修改这些副本。

## 9. 更新与卸载

- **更新**：再安装一次新的、钉好的 spec（如果 Plugins 页无法原地更新，就先
  移除旧 bundle），或在提供时用 Plugins 的 **Update** 动作。之后重启 DSH。
- **暂停**：Plugins → 把 bundle 关掉，然后重启 DSH。
- **卸载**：Plugins → Remove（或
  `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`），
  然后重启 DSH。移除 bundle 不会动 `~/.agents` 或 `$DSH_HOME`，也不会从任何
  项目卸载 GSAP。
- 不需要备份：这个 bundle 只是展示用的文档；移除它不会丢任何用户数据。

## 10. 疑难排解

| 症状 | 原因 | 处理 |
|---|---|---|
| 显示 installed/enabled，但重载后 skill 不见 | bundle rows 在 host 启动时 compose | 重启 DSH；开一个新的 session |
| catalog 显示 skill 的旧副本 | preset 会扫的目录里还有文件层副本 | 跑 §8 的预检／迁移 |
| 安装失败，报 git／auth 错误 | 私有 fork、缺少 `git`，或网络问题 | 改用 release tarball（§5），或修好凭证 |
| 安装被拒，报 `engines`／版本信息 | DSH 不在 `>=0.2.2-rc.1 <0.3.0` 范围内 | 升级／降级 DSH；不要硬上 |
| `plugin_manager` 找不到 `@chonwai/dsh-gsap-skills` | npm 通道尚未发布 | 改用 git tag 或 tarball |
| CI 显示 `SKIP registry-smoke` | 可选的真实 registry 测试需要解包后的 `app.asar` | SKIP **不算**验证；只有 `PASS` 才算 |
| 项目里 import `gsap` 报错 | 本 bundle 只随附文档，不是库 | 在该项目按 GreenSock 的授权 `npm install gsap` |
| 不确定它是不是官方的 | 不是官方的 | 非官方社群 bundle；见 NOTICE |

## 11. 可直接复制给朋友的消息

```
GSAP skills for DeepSeek Harness — unofficial bundle, 8 skills:
https://github.com/Chonwai/dsh-gsap-skills
DSH → Plugins → Add plugin → Install a third-party plugin → paste https://github.com/Chonwai/dsh-gsap-skills#v1.0.8
Read the trust box and confirm, choose Enable now, restart DSH, then load /gsap-core.
If skills don't appear: move ~/.agents/skills/gsap-* (and $DSH_HOME/skills, project .agents/skills) out of the skills root.
```
