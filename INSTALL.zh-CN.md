[English](INSTALL.md) · [繁體中文](INSTALL.zh-TW.md) · [简体中文](INSTALL.zh-CN.md)

> 本文件是英文版的翻译；英文版为准。

# INSTALL — @chonwai/dsh-gsap-skills

DeepSeek Harness（DSH）bundle 的安装、启用、迁移、验证、更新与回滚。以 macOS
上的 DSH **0.2.2-rc.1** 为准；同样的流程适用于任何受管理的 profile。

> 本 bundle 是 Host-only：一个 plugin row 注册 8 个 runtime skill。
>
> **启用规则：profile bundle rows 是在 DSH host 启动时 compose 的。** 在已经
> 运行的 host 上安装、启用、停用或移除 bundle 之后，**要重启 DSH**。新建
> session 或重载 Web 页面都**不会**重新 compose profile。`plugin_manager` 报告
> installed/enabled 只代表 profile 正确，不代表运行中的 host 挂载了这个 row。
>
> **Skill layer 规则：本 bundle 注册在 host/global layer。** Web app 把
> `skill-filesystem` 挂在 **agent preset 的 scope 里**，并停用 host 层的
> filesystem row；因此 `~/.agents/skills`、`$DSH_HOME/skills` 或项目
> `.agents/skills` 底下的 `gsap-*` 文件层副本会被 preset 的 provider 扫到，位于
> **更近的 scoped layer**，会直接赢得同名 skill。**bundle 无法覆盖它。** 请先
> 把文件层副本迁移出去（§5）。

> 面向朋友的发布通道（Plugins 页、git tag、release tarball、未来的 npm）以及
> 可直接复制的消息，见 [docs/DISTRIBUTION.zh-CN.md](docs/DISTRIBUTION.zh-CN.md)；
> 本文件保留完整的安装／验证／回滚流程。

## 0. 安装之前

| 项目 | 说明 |
|---|---|
| 预检 | `test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"`——若有输出，先迁移（§5） |
| 写入什么 | profile 的 `package.json` dependency（本地目录用 `link:`）、有序的 `dsh.profile.bundles` 清单、profile 的 `node_modules` 链接与 lockfile——由 DSH 的 Plugin Manager 完成，不是本套件 |
| 本套件在 runtime 写什么 | 不写自己套件之外的任何位置；只读 `skills/**` |
| 需要的权限 | 每个 `plugin_manager` 动作（包括列表）都需要 **Full access** 或一个审批提示；Web UI 的安装对话框有自己的信任确认 |
| 网络 | 本地目录安装不需要；没有要下载的依赖 |
| 重启 | **任何 bundle 变更后都必须重启**；运行中的 host 只会保留它启动时的那批 row |
| GSAP 库 | **未随附**。这些 skill 只是记录 GSAP；每个项目要按 GreenSock 的授权自行安装 `gsap` |
| 退场方式 | 把 bundle 关掉（再重启），或移除它（见 §7） |

## 1. 从 Web UI 安装（建议）

1. 打开 DSH → 侧边栏的 **Plugins**。
2. **Add plugin** → **Install a third-party plugin**。
3. 粘贴这个目录的**绝对路径**，例如
   `/Users/you/code/dsh-gsap-skills`。
4. 阅读信任确认框并确认。DSH 会读取套件、对 profile 运行 pnpm，然后套用
   bundle patch。
5. 如果对话框提供 **Enable now**，就接受它。
6. **重启 DSH**（退出后重新打开），然后迁移任何文件层副本（§5），开一个新
   session 并用 §4 验证。

## 2. 通过 `plugin_manager` 安装（由 agent 驱动）

在具备 Full access（或你能回答审批提示）的 session 里：

```
plugin_manager(action: "install_bundle", target: "/abs/path/to/dsh-gsap-skills")
```

- 这执行与 UI 相同的操作：`pnpm add link:<path>`、追加到
  `dsh.profile.bundles`、套用 `dsh.bundle.patch`、启用 bundle。
- 没有依赖，也没有 install script，所以不会出现 `approvedBuilds` /
  `pendingBuilds` 提示。
- 看返回的 `application` 字段：`applied` 表示 profile 层已套用。它**不**表示
  运行中的 host 已挂载这个 row——预期 skill 出现之前，先重启 DSH。
  `restart-required` 讲的是同一件事，只是更明确。

**不要**自己手改 profile 的 `package.json` 或 `cordis.patch.yml` 再手动跑 pnpm
来复现安装——那超出了受支持的 Plugin Manager 流程，而且每次写入都要单独审批。
请用 §1 或 §2。

## 3. 手动复制（进阶；只在 Plugin Manager 不可用时）

这绕过了受支持的流程。请先备份 profile，并且要有自己管理更新／回滚的心理
准备。以下路径都在受管理的 profile 目录内（`$DSH_PROFILE_DIR`，例如
`~/.dsh/profiles/desktop`）：

```bash
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
mkdir -p "$PROFILE/node_modules/@chonwai"
rsync -a --delete /abs/path/to/dsh-gsap-skills/ \
  "$PROFILE/node_modules/@chonwai/dsh-gsap-skills/"
```

然后，在 app 已停止、或 profile 文件只在一个文本编辑器里打开的情况下：

1. 在 profile `package.json` 的 `dependencies` 里加上
   `"@chonwai/dsh-gsap-skills": "link:/abs/path/to/dsh-gsap-skills"`（或
   `file:` 路径）；
2. 把 `"@chonwai/dsh-gsap-skills"` 追加到 `dsh.profile.bundles`；
3. 跑一次 profile 的 package manager install（只在 host 需要时）；
4. **重启 DSH**。

回滚：删掉复制进去的目录、dependency 条目与 bundle 条目，然后重启。这条路径
不在 `plugin_manager` 的诊断范围内，CI 也没有测过；请优先用 §1／§2。

## 4. 验证（重启并完成迁移之后）

1. **预检**：`test -d ~/.agents/skills/gsap-core` 必须没有输出（`$DSH_HOME/skills`
   与项目 `.agents/skills` 也一样）。还留着的副本会待在 preset 的 scoped layer
   并胜出；先迁移它（§5）。
2. **重启 DSH**，然后开一个新的 session。
3. **载入一个 skill**：用 `skill` 工具或 `/gsap-core`。结果必须显示
   `<skill_resources>`，其中
   `Base directory for this skill: /abs/path/dsh-gsap-skills/skills/gsap-core`、
   上游正文，且没有 `{{...}}` 占位符。
4. **Catalog**：8 个名字都应该被列为 runtime skill：
   `gsap-core`、`gsap-timeline`、`gsap-scrolltrigger`、`gsap-plugins`、
   `gsap-utils`、`gsap-react`、`gsap-frameworks`、`gsap-performance`。
5. **如果 catalog 显示的仍是旧副本**（例如 skill 正文里没有更正后的 transform
   顺序）：
   - 再跑一次第 1 步的预检——scoped 文件层副本是最可能的原因；
   - 确认 host 是在安装**之后**重启的；
   - 检查 `plugin_manager(action: "list_bundles")` 是否显示
     `@chonwai/dsh-gsap-skills` installed/enabled，且 row 为 `include:gsap`；
   - 再重启一次 DSH 并重试。只开新 session 修不好这个。
6. **Plugins 页**：已安装的 bundle 应该带着本地化标题／描述与 icon 出现（如果
   该 build 会呈现 bundle metadata），并且应该列出 row **gsap**。
7. **只读检查**：`cordis_inspect_query(platform: "host",
   provider: "Config", method: "listConfigs", input: { name:
   "@chonwai/dsh-gsap-skills" })` 可以找到运行中的 row。`status: "absent"` 的
   意思是“没有 Config schema”，不是“被停用”。

> 只有 host-global catalog 读取时看到同名的 **global** 条目，bundle 才会发出
> `[gsap] …` 警告。在标准 Web preset 下，文件层副本位于 preset 的 scoped
> layer，bundle 根本看不到它；scoped 副本就是直接胜出。不要把那一行当成验证
> 信号。

## 5. Layer 语义与从文件层安装迁移（必要步骤）

DSH 源码里的三个事实，决定了哪一份副本会胜出：

1. `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 把
   `skill-filesystem` 挂在 **agent preset 的 scope 里**。
2. `@deepseek-ai/dsh-web-app/cordis.patch.yml` **停用 host 层的
   `skill-filesystem` row**（注解明写 "presets own local discovery"）。
3. `@deepseek-ai/dsh-skill` 把 global layer 与观看 scope 的 chain 合并：
   **最近一层的同名条目直接胜出**；rank 只在同一层内排序重名条目。

后果：

- 本 bundle 是 **global** layer 里的 host row。位于 `~/.agents/skills`、
  `$DSH_HOME/skills` 或项目 `.agents/skills` 的 `gsap-*` 文件层副本，会被
  preset 的 provider 扫到，位于**更近的 scoped layer**；它无条件胜出，bundle
  无法覆盖它。
- 移除文件层副本会被 filesystem watcher **实时**接手（catalog 在下一个
  pre-step 刷新）。但安装或切换 bundle 本身仍需要**重启 host**。
- 因此，profile 已正确安装、而胜出的 catalog 条目仍是旧文件副本，是完全可能
  的。这是预期行为，不是安装失败。

预检：

```bash
test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"
test -d "${DSH_HOME:-$HOME/.dsh}/skills/gsap-core" && echo "WARNING: DSH_HOME copy will shadow the bundle"
```

把副本移出去（手动；本套件从不代劳）：

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  TARGET=~/.dsh-backup/$s-$(date +%F)
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s "$TARGET"
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" "$TARGET-dsh"
done
```

项目内的 `<repo>/.agents/skills/gsap-*` 也要一并移出。副本先留着当备份，直到
bundle 验证通过为止。移完之后，等下一个 pre-step（或发一条消息），再重试
§4.3——这个切换应该不需要重启。如果还是没变化，重启 DSH 一次（bundle row
仍然必须在启动时 compose）。

## 6. 更新

1. 同时更新 `package.json` 与 `lib/index.js`（版本字符串要一致）。
2. 上游有变化时重新 vendor：

   ```bash
   bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
     --repo /path/to/gsap-skills
   # or from an existing checkout:
   bash tools/vendor-upstream.sh --from-dir /path/to/gsap-skills \
     --ref aed9cfd3277740755f6bfc1155c7aa645403b760
   ```

   它会复制 8 个 `SKILL.md` 与 `llms.txt`、套用 4 项更正（预期原文消失就
   失败）、重写 `checksums.txt` 与 `provenance.json`，并跑各道闸门。
3. 把 `NOTICE` 的 `Source:` 行更新成新的完整 commit；`NOTICE` 与
   `provenance.json.ref` 不一致时 offline 闸门会失败。
4. 重新安装／重启 bundle。link 安装要靠**重启 DSH** 重新挂载；替换套件后也
   需要重启，才能得到新的 Host module generation。
5. 在 §5 清理完之后重跑 §4。只有 catalog、载入的正文（以及可选的、项目层的
   GSAP 测试）都通过之后，才能宣称成功。

## 7. 切换与回滚

| 意图 | 操作 | 说明 |
|---|---|---|
| 暂停但不卸载 | Plugins → 把 bundle 关掉（或 `plugin_manager(action: "set_bundle", target: "@chonwai/dsh-gsap-skills", enabled: false)`） | 只改 profile；要**重启 DSH** 才会从运行中的 host 撤掉这 8 个注册 |
| 恢复 | 把它打开／`enabled: true` | **重启 DSH** 才会重新 compose bundle |
| 完全移除 | Plugins → Remove（或 `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`） | 移除 dependency 与 bundle 层；若被要求重启就重启（建议重启） |
| 继续用文件层 | 自己把 8 个 `SKILL.md` 复制到 `~/.agents/skills` | 那份副本会赢过 bundle（更近的 preset layer）；两条路选一条 |

移除 bundle 不会删掉 `~/.agents` 或 `$DSH_HOME` 里的任何东西。

## 8. 疑难排解

| 症状 | 可能原因 | 处理 |
|---|---|---|
| bundle 显示 installed/enabled，但重载或新 session 后 catalog 没变 | 重启前就是这样；bundle rows 在 host 启动时 compose | 重启 DSH |
| 重启后 catalog 里仍是 skill 的旧副本 | 还有文件层副本留在 preset 会扫的目录里；它从更近的层胜出 | 跑 §5 的预检，把副本移出，等一个 pre-step |
| `skill("gsap-core")` 显示错误的 transform 顺序 | 载入的正文是文件层副本，或是较旧的 module generation | 迁移文件层副本；如果 bundle 已经是胜出者，重启 DSH 换新的 module generation |
| catalog 里少了一个 skill | 另一个 runtime 注册占用了那个名字（会有警告），或 `skills` 不存在 | 移除竞争的 runtime 来源；确认 `skills` 已挂载 |
| `[gsap] …` 警告从没出现 | 在 Web preset 下是预期行为：scoped 文件副本对 bundle 的 global catalog 读取不可见 | 改用 §5 的预检 |
| `skill(...)` 抛 `source must be a string` | 载入了比本套件更旧的 Host module generation | 重启 DSH |
| Plugins 卡片没有 icon／标题 | 该 build 没有呈现 bundle 的 locale metadata | 检查 row 诊断信息；本 repo 未验证实际渲染结果 |
| Offline 检查失败，报 "NOTICE commit does not match provenance.json" | 重新 vendor 后没有更新 NOTICE | 把 `NOTICE` 设成 `provenance.json.ref` |
| Offline 检查失败，报 "uncorrected upstream text still present" | 有人手改了 vendored skill | 重跑 `tools/vendor-upstream.sh`；永远不要手改 vendored 文件 |

## 9. 卸载

Plugins 页 → 移除 bundle，或
`plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`，
然后重启 DSH，让运行中的 host 停止提供这些注册。profile 之外的东西都不会变。
这些 skill 只是文档；移除 bundle 不会从任何项目里卸载 GSAP。

## 10. 提交 issue

请附上：DSH 版本与 host 启动时间、profile 名称、`gsap` row 的启用状态、安装后
是否重启过 DSH、`~/.agents/skills`／`$DSH_HOME/skills`／项目 `.agents/skills`
底下是否存在 `gsap-*` 文件层副本、`tests/offline-check.sh` 的输出，以及你实际
看到的 skill 正文。
