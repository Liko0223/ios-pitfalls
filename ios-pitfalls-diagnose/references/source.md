---
title: "iOS 开发踩坑记录"
type: wiki
category: concept
domain:
  - iOS 开发
  - 软件工程
tags:
  - ios
  - swift
  - 踩坑
  - 工程实践
sources:
  - "[[2026-06-13]]"
  - "[[2026-06-23]]"
  - "[[2026-06-25]]"
  - "[[2026-06-28]]"
  - "[[2026-06-30]]"
  - "[[2026-07-07]]"
last_updated: 2026-07-07
---

# iOS 开发踩坑记录

> [!abstract] 这是什么
> iOS / Swift 开发里**踩过的真实坑**合集，持续追加。每条记录：现象 → 根因 → 排查 → 解法 → 预防。
> 目的是同一个坑别踩第二次——尤其那些「本地一切正常、线上才炸」的隐蔽问题。

---

## 🐛 01 · CloudKit CKError 15：生产环境 schema 没部署

**日期** 2026-06-13　·　**项目** Miboooo（iCloud 同步）　·　**严重度** 🔴 高（全体用户同步失败）

> [!bug] 现象
> 「iCloud 同步」在**正式环境**（TestFlight / App Store 包）报错：
> `iCloud 同步失败：未能完成操作。(CKErrorDomain 错误 15。)`
> 而本地 Xcode 调试、早期 TF 包**全都正常**。一上正式，自己和用户**全员**同步失败。

> [!danger] 根因
> `CKErrorDomain 错误 15 = CKError.serverRejectedRequest`——CloudKit 服务器**拒绝**了写入请求。
> 真正原因：**Production（正式）环境里根本没有这些 record type / 字段**。CloudKit 的 schema 从没（或新增字段后没重新）**部署**到 Production。

CloudKit 有**两套互相独立**的环境，这是「本地好、线上炸」的指纹：

| 构建方式 | 用的 CloudKit 环境 | schema 行为 |
|---|---|---|
| Xcode 直接跑（Debug） | **Development** | 保存记录时**自动**推断、创建表/字段 → 本地永远「正常」 |
| TestFlight / App Store | **Production** | **绝不自动建**，必须在 CloudKit Console 手动把 Dev 的 schema 「Deploy」过去 |

> [!info] 为什么 TF 当初也「正常」
> 早期 TF 包能用，是因为当时 schema 恰好对得上（或没真正跑过照片同步）。后来代码新增了字段（`MibooooPhoto.contentSignature` / `imageVersion`）却**没重新 Deploy**，新包写带新字段的记录就被拒。**加字段 = schema 变更，Production 不会自动跟。**

> [!example] 排查（怎么实锤的）
> 1. 错误文案命中了 `userFacingMessage` 的 `default` 分支（当时没有 `serverRejectedRequest` case），暴露原始 `(CKErrorDomain 错误 15)`。
> 2. 登录 CloudKit Console → 切到 **Production** 环境 → 打开 `MibooooPhoto` → 提示 **`Record type 'MibooooPhoto' cannot be found`**。
> 3. 点 Deploy Schema Changes 的 diff 弹窗，8 个 record type 全是 `Create`（全新）→ 确认 Production 整个 schema 就是空的。

> [!success] 解法（在 Console，不是改代码）
> `icloud.developer.apple.com` → 选 container（`iCloud.com.lilinke.miboooo.app`）→ Schema → **Development** 环境 → 右上角 **「Deploy Schema Changes…」** → 弹窗列出要往 Production 新增的 record types / indexes / security roles → **Deploy**。
> - 部署是**纯新增、不动任何用户数据**，安全；几十秒全球生效。
> - 修好后老用户**重开 app / 点一次同步**即可，**不用发新版本**（schema 是服务端配置，所有版本共用）。

> [!tip] 预防 & 教训
> - ⚠️ **每次给 CloudKit 加 / 改 record type 或字段，发版前必须去 Console 把 schema Deploy 到 Production。** 这步极容易漏。
> - 仓库里**没有** tracked 的 schema 文件、也没 CI 校验 → 复发风险高。可考虑用 `cktool export-schema` 把 schema 纳入版本管理 + CI 比对。
> - **诊断日志别只放在 `#if DEBUG` 里**——正式包不打印就没法查线上问题。CKError 的 `NSDebugDescriptionErrorKey` 里有服务器返回的**真实拒绝原因**。
> - 永久性错误**别写「请稍后再试」**的文案——会诱导用户无限白重试。
> - 手机版 CloudKit Console 常把 **Deploy 按钮裁掉**：用 Safari「请求桌面网站」或直接上电脑。
> - 同类陷阱：query 用的字段在 Production 需手动标 **Queryable index**（Dev 自动、Prod 不会）。

---

## 🐛 02 · SwiftUI 全屏浮层 / 蒙版盖不住状态栏与导航栏

**日期** 2026-06-23　·　**严重度** 🟠 中（视觉缺陷：顶部漏白条、浮层被裁）

> [!bug] 现象
> 自定义底部弹窗 + 半透明蒙版（scrim），本意盖住整屏。但当它在**被 `NavigationStack` push 出来的子页面**上弹出时：
> - 顶部**状态栏区域漏出一条白带**，蒙版盖不到最上沿；
> - 有时导航栏（大标题 bar）的背景还**压在蒙版之上**。
>
> 把浮层移到 SwiftUI 视图树**根部**（作为最外层 `ZStack` 的兄弟、给很高的 `zIndex`）**仍然没用**——白条照旧。

> [!danger] 根因
> 两个独立机制叠加，且都发生在**同一个 `UIWindow` 内**：
> 1. **祖先裁剪是硬边界**：浮层的某个祖先用了 `clipShape` / `mask`，或用 `.ignoresSafeArea` 把顶部安全区排除掉了（典型如一个圆角容器面板）。被裁掉的区域，子视图无论怎么 `ignoresSafeArea` 都画不进去。
> 2. **`UINavigationBar` 是 UIKit 合成层**：大标题导航栏的背景（毛玻璃 / 底色）由 UIKit 在自己的图层绘制、会延伸进顶部安全区，其合成顺序可能盖在同窗口内的 SwiftUI 浮层之上。`zIndex` 只在**同一个 SwiftUI 容器**内排序，既管不到 UIKit 导航栏的图层，也跨不出被裁剪的层级。

> [!info] 为什么「提到 SwiftUI 根层」不够
> 根层 sibling 依旧待在**同一个窗口**里。它能压住普通页面内容，但压不过：(a) 系统绘制的导航栏背景延伸进安全区的那部分；(b) 任何在其之上、由 UIKit 合成的层。**窗口内的层级博弈，赢不过窗口本身。**

> [!example] 排查指纹
> 「本地大多数页面正常、唯独在 push 出的子页 / 带圆角裁剪的容器里弹浮层就漏顶」——基本就是 **祖先裁剪 + 导航栏合成** 这对组合，而不是 `ignoresSafeArea` 或 `zIndex` 写漏了。

> [!success] 解法 · 升一个独立的高 `windowLevel` 透明 `UIWindow`
> 不在视图树里继续斗，直接把浮层提到**它自己的窗口**上：
> - 取当前 `foregroundActive` 的 `UIWindowScene`，新建 `UIWindow(windowScene:)`；
> - 设 `windowLevel = .statusBar + 100`：高于 app 主窗口（`.normal`）和状态栏（`.statusBar`），于是浮在**一切之上**——状态栏、导航栏、安全区统统覆盖；
> - 窗口与承载视图都设透明：`backgroundColor = .clear`、`isOpaque = false`；用 `UIHostingController` 把 SwiftUI 浮层塞进去，host view 同样 clear / 非 opaque——这样只有浮层自己的 scrim + 卡片绘制，半透明蒙版才能透出底下真实画面；
> - 用一个单例 controller **强引用**这个 window（`UIWindow` 没人持有会被立即释放、浮层瞬间消失）；
> - `accessibilityViewIsModal = true`：让 VoiceOver 焦点困在浮层内；
> - 关闭 = `window.isHidden = true` + 把引用置 `nil`；
> - 用可观察状态驱动（`.onChange` 监听一个标志位 → controller `present` / `dismiss`），把呈现逻辑和状态解耦。
>
> **为什么成功（核心一句）**：iOS 的界面是一摞按 `windowLevel` 排序的 `UIWindow`。换到一个更高层级的窗口，就**跳出了原窗口里所有的裁剪 mask、安全区 inset、父视图层级、以及 UIKit 导航栏的合成顺序**——这些全是「窗口内」的约束，对独立窗口一概无效。

> [!tip] 预防 & 教训
> - 需要**真·全屏盖住状态栏 / 导航栏**的浮层（权限引导、强制确认弹窗、全局 toast / 遮罩），优先用独立高层级 `UIWindow`，别指望 `zIndex`。
> - `windowLevel` 取值要拿捏：比 `.statusBar` 高才能盖状态栏；比系统 `.alert` 低则会被系统弹窗压住。
> - 透明窗口务必让 host view 也透明，否则蒙版底下露的是黑底 / 白底而非真实界面。
> - 一定要管生命周期：强引用持有、`dismiss` 时 `isHidden = true` 并置 `nil`，避免窗口泄漏或多个浮层叠加。
> - 同一招也适用于：跨整个 app 的全局加载遮罩、画中画式悬浮控件、需要盖住键盘的浮层。

---

## 🐛 03 · push 进二级页面时底部闪一下白底 / 灰条（根部 chrome 状态比页面渲染晚一帧）

**日期** 2026-06-25　·　**严重度** 🟠 中（视觉缺陷：进二级页面底部闪屏，且时有时无）

> [!bug] 现象
> App 根部有一套"底部 dock（深色背景 + tab 栏）+ 圆角主面板"的 chrome：首页时面板较矮、露出底部 dock；进入二级页面时面板撑满全屏、把 dock 盖住。
> 用 `NavigationStack` push 进二级页面后，**底部先闪一下白底 / 灰条，然后才把二级页内容画出来**。而且**不稳定**——第一次进有、第二次进可能就没有，所有二级页都有点这种感觉。

> [!danger] 根因
> chrome 靠一个「是否在详情页」的全局标志（`isInDetail`）决定面板撑不撑满。但这个标志是在**被 push 的二级页面的 `.onAppear` 里**才置位的，而 `onAppear` 比该页**第一次渲染晚一帧**。
> 于是存在一帧窗口：页面已经开始渲染，但标志还是 false → 根部以为还在首页 → 面板还是矮的 → **底部那条常驻深色 dock 露出来**（被 push 页面此刻还没盖满）。这一帧有没有被你看见，取决于渲染时序 → 所以「时有时无」。

> [!danger] 连带的坑：别用 `withAnimation` 包全局状态
> 第一反应是给这个标志变化加动画让 dock 滑动。但**把驱动 `isInDetail` 的全局状态变更包进 `withAnimation`** 会把 `navigationDestination` 的 push 也卷进**同一个动画事务**，导致导航容器在 push 过程中被动画化 resize → 触发被 push 页面的 `onAppear`/`onDisappear` 反复来回 → **页面卡死、返回键消失**。

> [!example] 排查指纹
> - 「push 进子页底部闪一下、且时有时无」≈ 某个根部 chrome 的状态**比页面渲染晚一帧**，基本锁定 `onAppear` 置位的时序问题，而不是布局写错。
> - 「给状态变更加 `withAnimation` 后某些页面进去卡死 / 返回键没了」≈ 动画事务和导航 push 绞在一起的 onAppear/onDisappear 循环。

> [!success] 解法 · 在「路由触发点」就置位状态，并把真正的 push 推迟一帧
> 核心：**不要等被 push 页面的 `onAppear`，在点击那一刻就同步把 chrome 状态置好，再让 push 发生。**
> 1. 把 `NavigationLink(value:)` 换成 `Button`，点击时先置位、再 push：
>    ```swift
>    Button {
>        // ① 同步置位 chrome 标志，且禁用动画（瞬间撑满，不要"长出来"的过程，
>        //    否则进入时的生长动画会在底部留下灰块残影）
>        var t = Transaction(); t.disablesAnimations = true
>        withTransaction(t) { router.chromeInDetail = true }
>        // ② 把真正的 push 推迟到下一帧，确保 chrome 已经先撑满，
>        //    push 的第一帧就盖在满面板上 → 底部无缝
>        DispatchQueue.main.async { path.append(route) }
>    } label: { row }
>    ```
> 2. 用**一个统一派生量**驱动所有根 chrome（面板高度、圆角、dock、tab 栏）：`inDetail = isInDetail || chromeInDetail`。其中 `chromeInDetail` 在触发点就 true（无延迟），`isInDetail` 由各页 `onAppear` 维护（管计数与其它逻辑）。避免不同 chrome 各自延迟、各闪各的。
> 3. **入场 / 出场动画不对称**：返回首页才做 spring 滑入；进入详情**不加动画**（瞬间切）。进入时若也加动画，那段"dock 收起 / 面板生长"会留下灰块残影。
> 4. 圆角要随面板平滑变化，就让自定义 `Shape` 支持 `animatableData`（暴露 `cornerRadius`），单独动这一个值——**而不是**去包全局状态的 `withAnimation`。

> [!tip] 预防 & 教训
> - **任何「根部 chrome 依赖路由 / 导航状态」的场景，状态都要在路由触发点置位**（配合 `disablesAnimations` + 下一帧再 push），别依赖被 push 页面的 `onAppear`——它天生晚一帧。
> - **动画只加在视觉层，绝不裹全局状态变更**。要动画化跟随路由的视觉，用「本地镜像 state + `.onChange` 里 `withAnimation` 改这个镜像」或「可动画 Shape 的 `animatableData`」，把动画和导航事务隔离开。
> - **入场和出场分开设计**：很多"残影 / 闪块"是因为入场也套了出场那套动画。
> - 调试时盯住「状态翻转的时刻」和「页面首帧渲染的时刻」谁先谁后——闪屏类问题十有八九是这俩的竞态。

---

## 🐛 04 · Home Screen Widget 透明玻璃背景：公开 API 只能接近，真透明要改 WidgetKit descriptor

**日期** 2026-06-28　·　**严重度** 🟠 中（视觉目标明确，但实现依赖私有 API，有审核与系统版本风险）

> [!bug] 现象
> 想做一个像系统小组件 / Dock / 灵动岛附近那种「透出桌面壁纸的玻璃」Home Screen Widget。SwiftUI 里已经把背景改成 `Color.clear`、`containerBackground(for: .widget)`，甚至在新系统上尝试 `.glassEffect(...)` / `.ultraThinMaterial`，但真机桌面上仍然显示成一张白色卡片。
>
> 典型误判：以为是 SwiftUI 背景没清干净、颜色没设对、或者 WidgetKit snapshot 缓存没刷新。实际不是。

> [!danger] 根因
> Home Screen Widget 的卡片底色不是普通 SwiftUI 背景，而是 WidgetKit / SpringBoard 根据 Widget descriptor 决定的**宿主容器背景**。公开 SwiftUI API 只能控制 widget 内容树和 `containerBackground`，但不能把 descriptor 标成「transparent / background removable」。
>
> 因此：
> - `Color.clear` 只会清掉自己的 SwiftUI 内容背景；
> - `.containerBackground(for: .widget) { Color.clear }` 不等于移除系统容器；
> - `.glassEffect` 可以让内容内部像玻璃，但仍在系统卡片容器里；
> - `@Environment(\.showsWidgetContainerBackground)` 只能告诉你系统是否展示容器，不负责让容器透明。

> [!example] 排查指纹
> 1. Simulator / 真机 build 都成功，widget 也能添加，但桌面上仍是白底。
> 2. 改 SwiftUI 背景、材质、透明度都只能改变卡片内部，无法让壁纸透出来。
> 3. 一旦使用 descriptor patch，背景突然能接近系统透明玻璃；但如果 patch 写错，Widget 可能直接从「添加小组件」列表消失。

> [!success] 解法 · 接受私有 API 风险后：参考 ClearAndBlurredWidgets 改 descriptor
> 参考公开样例 `pookjw/ClearAndBlurredWidgets` 的思路：在 Widget extension 进程里 hook WidgetKit 的 descriptor fetch 回调，把目标 widget 的 descriptor 改成透明 / 可移除背景 / vibrant content。
>
> 核心做法（脱敏版）：
> 1. 在 Widget extension target 加一个 Objective-C++ 文件，并用 `-fno-objc-arc` 编译。
> 2. swizzle WidgetKit 内部 exported object 的 `getAllCurrentDescriptorsWithCompletion:`。
> 3. 在 completion 返回前复制并 patch 目标 `CHSWidgetDescriptor`：
>    ```objc
>    setBackgroundRemovable:YES
>    setTransparent:YES
>    setSupportsVibrantContent:YES
>    setPreferredBackgroundStyle:0x2 // blurred；0x1 更接近 clear
>    ```
> 4. SwiftUI 侧仍要给目标 widget 的 system family 提供 `Color.clear` 的 `containerBackground`，否则 descriptor 透明了，内容树自己还会画底。
> 5. Xcode 17 Debug 构建可能把真正代码放进 `WidgetExtension.debug.dylib`，检查私有 patch 是否进包时别只 `strings` 主 executable；Debug 查 `.debug.dylib`，Release 查最终 extension binary。
>
> 关键 caveat：这个方案用了私有类 / 私有 selector。若团队决定生产启用，必须明确接受 **App Review 被拒**、未来 iOS 版本失效、Widget 从选择器消失等风险；最好把改动范围收窄到单个 widget kind。

> [!tip] 预防 & 教训
> - **公开 API 路线的上限**：能做材质感 / 近似玻璃，但不能真正移除 Home Screen Widget 宿主卡片。
> - **私有 API 路线的风险**：类名、selector、descriptor 字段随系统版本变化；写错会让 WidgetKit 枚举 extension 失败，表现为 app 在小组件选择器里搜不到。
> - 如果决定生产启用，就不要再用 `#if DEBUG` 包住 patch；同时要在 Release 产物里用 `strings` 明确知道私有符号已经进入包，方便做审核风险判断。
> - descriptor 透明后，前景色要重新设计：文字用白色 + opacity，而不是米色 / 灰色混色；小图标不要加阴影，透明背景上会显脏。
> - 视觉验证必须上真机：WidgetKit 缓存很重，安装后可能要 reload timelines，甚至删除桌面 widget 后重新添加，才能看到新 snapshot。

---

## 🐛 05 · SwiftUI 巨型 `@ViewBuilder` / 计算属性真机 metadata 递归爆栈

**日期** 2026-06-30　·　**项目** Miboooo（Settings 页面 Debug 卡片）　·　**严重度** 🔴 高（真机进入设置页即闪退，模拟器可能不复现）

> [!bug] 现象
> Settings 页面在真机上点击进入就闪退。崩溃报告是：
> `EXC_BAD_ACCESS — Thread stack size exceeded due to excessive recursion`
>
> 典型栈顶类似：
> `SettingsView.debugCard.getter → debugSettingsCard(...) / settingsCard(...) → ... → SettingsView.body.getter`
>
> 容易误判成某个按钮 action、业务逻辑或显式递归调用。实际页面还没来得及点任何行，SwiftUI 在实例化这棵 view 的巨大泛型类型时就已经爆了。

> [!danger] 根因
> 这是 SwiftUI 在真机上实例化**巨型 `body` 泛型类型 / ViewBuilder metadata** 时递归过深导致的栈溢出。`@ViewBuilder` 函数、`some View` 计算属性、泛型 helper（例如 `settingsCard<Content: View>`）都会被塌进外层 `SettingsView.body` 的类型图里。
>
> 因此，把一个大块：
> `debugCard -> settingsCard(...)`
>
> 改成：
> `debugCard -> debugSettingsCard(...)`
>
> **不是修复**。新的 `@ViewBuilder` helper 仍然在同一个外层 body 泛型图里，嵌套深度没变，甚至可能又多加一层，真机依旧会在 metadata 实例化阶段递归爆栈。

> [!example] 排查指纹
> - 真机崩，模拟器不一定崩；
> - 崩溃类型是 `Thread stack size exceeded due to excessive recursion`；
> - 栈里反复出现某个大块 computed view getter（例如 `SettingsView.debugCard.getter`）和 `ViewBuilder` / 泛型 helper；
> - 页面本身由很多 card、section、button、toggle、sheet、alert、`#if DEBUG` 大块拼成；
> - 同页面里已经有若干卡片被抽成独立 `struct: View`，唯独最后一个大块还内联在父 View 里。

> [!success] 解法 · 抽成独立 `struct: View`，形成真正的 SwiftUI metadata 边界
> 不要再用另一个 `@ViewBuilder` 函数包一层。正确修法是把大块 View 抽成独立类型：
>
> ```swift
> #if DEBUG
> DebugSettingsCard(showsPaywall: $showsPaywall)
> #endif
> ```
>
> 然后在新文件里：
>
> ```swift
> #if DEBUG
> private struct DebugSettingsCard: View {
>     @Binding var showsPaywall: Bool
>
>     var body: some View {
>         // 原 debugCard 内容迁到这里
>     }
> }
> #endif
> ```
>
> 独立 `struct: View` 会形成新的 metadata / 子图边界，SwiftUI 不需要把整块 Debug 面板继续摊进 `SettingsView.body` 的同一个超长泛型类型里。这也是 `MembershipSettingsCard` / `ICloudSyncSettingsCard` / `CocreatorSettingsCard` 这类大卡片更稳的原因。

> [!tip] 预防 & 教训
> - Settings / Profile / Dashboard 这类页面，凡是超过一屏、带很多 `Button` / `Toggle` / `sheet` / `alert` / `#if DEBUG` 的大块，优先抽独立 `struct: View`，不要只抽 `@ViewBuilder` helper。
> - 看到真机-only 的 SwiftUI `Thread stack size exceeded due to excessive recursion`，先怀疑**类型图过深**，不要只找显式递归。
> - `@ViewBuilder` helper 适合小块复用，不适合给巨型父 View 降复杂度；要降低 SwiftUI metadata 压力，边界必须是独立 View 类型。
> - Debug 面板最容易被忽略：因为只在 `#if DEBUG` 里、内容又越堆越多，但真机 Debug 构建照样会触发。
> - 修完要真机 build / install 验证；模拟器过了不能证明这个坑已经消失。

---

## 🐛 06 · CloudKit `desiredKeys: nil` 全量拉 → 本地缓存无限暴涨（几十 GB）

**日期** 2026-07-07　·　**项目** Miboooo（iCloud / 家庭共享同步）　·　**严重度** 🔴 高（App 存储从 2G 一路涨到 60G+，用户不可接受）

> [!bug] 现象
> 开了 iCloud 同步的设备，**打开 App、什么都不干，存储占用就持续暴涨**：2G → 8G → 18G → 60G+，越用越大。多设备共享相册那台涨得尤其吓人。曾经加过一段「启动时删掉 `Library/Caches/CloudKit` 整个目录」的代码把它压住，一旦删掉这段「创可贴」，暴涨立刻失控。

> [!danger] 根因
> 同步的拉取用了 `database.recordZoneChanges(since:desiredKeys:)`，而 **`desiredKeys` 传了 `nil`（要全部字段）**。这会让 CloudKit 把 zone 里**每条记录的 `@Attribute(.externalStorage)` 大 blob（原图，几 MB/张）全部下载**进 `Library/Caches/CloudKit` 缓存——**即使应用层随后因为「内容签名没变」而跳过、把数据丢弃**，字节也已经落进缓存了。
> 每次切前台都触发一次同步 → 整册原图被反复重下 → 缓存无上限堆积。**「启动清缓存」不是修复，只是在替这个反复重下做兜底清理**；它一直在承重，删掉它才暴露真正的病根。
> 更隐蔽的变体：为了拿**一条** root / 探测记录，也用了 `desiredKeys: nil` 的全量 zone 拉取，结果把同 zone 里 100+ 条记录的原图全拖进缓存，客户端再把非目标记录丢弃。「只要一条、却下载全部」。

> [!example] 排查指纹（关键：应用层日志会骗你）
> - 应用层日志显示 `mods=0`「没有变化、没拉记录」，但存储还在涨 → **别信应用层，去看 `cloudd` 守护进程日志**。
> - 抓真机 syslog（`idevicesyslog`）过滤 `cloudd` / `Downloaded asset`：会看到同一条 record 的 asset 被**反复下载十几遍**、几百次 `UserInitiated` 的按-record 全量拉取、持续数分钟。这就是实锤。
> - `idevicesyslog` 抓不到 App 自己的 `os_log`（默认 `<private>`），但**能抓到系统进程（cloudd）的行为**——这次正是靠 cloudd 日志定位的。
> - ⚠️ macOS 没有 `timeout` 命令，`timeout idevicesyslog ...` 会静默失败抓到空日志；用 `nohup ... &` 后台跑再 `kill`。

> [!success] 解法 · 两段式拉取，未变的 asset 一个字节都不下载
> 1. **阶段 1**：主拉取传一个**排除掉 4 个 CKAsset 字段**的 `desiredKeys` 白名单（只要元数据 + 内容签名）。未变照片因此零字节传输，不再灌缓存。
> 2. **阶段 2**：只对「内容签名判定为需要采纳云端」的那几条，用 `database.records(for:)` 按 ID **补拉完整记录**（含 asset）。改动的才付下载代价。
> 3. 判定「哪些要补拉」必须复用与真正 import 时**完全相同**的裁决函数（同一个纯函数），保证不多拉一张、不漏拉一张。
> 4. 「为拿一条 root 记录」的探测：`desiredKeys` 传 **空数组 `[]`**（只要 recordID，系统字段一定返回，不带任何 asset）。
> 5. 增量拉取（带持久化 change token 的 `recordZoneChanges(since: token)`）可以按需保留 `desiredKeys: nil`——前提是 change token 没丢、steady state 只返回真正变化的记录；一旦 token 失效或回到全量扫描，仍要切回元数据优先的两段式策略。

> [!tip] 预防 & 教训
> - **CloudKit 拉带大 blob 的记录，默认就该按需拉 asset**：列表 / 探测 / 增量比对阶段只取元数据，确认要用了再单独取 blob。`desiredKeys: nil` 在「zone 里有大 asset」时几乎总是错的。
> - **「本地/线上都会涨、打开就涨」优先怀疑缓存被反复重灌**，而不是内存泄漏或数据重复。
> - **删任何「治标代码」前，先搞清楚它在替什么兜底**。这次把「启动清缓存」当红鲱鱼删掉，直接让缓存失去上限、从 8G 冲到 60G。承重的创可贴删之前要先补上真正的止血。
> - 诊断顺序：先拿真机 `cloudd` 日志实锤「是否在反复重下」，再动代码，别凭猜。

---

## 🐛 07 · 家庭共享（CKShare）同步失败 & 删除的照片自己复活

**日期** 2026-07-07　·　**项目** Miboooo（家庭共享 / CKShare）　·　**严重度** 🔴 高（家人间同步断连 / 已删照片跨设备复活，数据完整性问题）

> [!bug] 现象
> 双人共享相册（一方 owner、一方 participant）：
> 1. participant 侧频繁提示「共享已失效，请重新邀请」，同步断连；
> 2. **在一台删掉的照片，过一阵自己又回来了**（尤其接受邀请 / 重连之后）。

> [!danger] 根因（两个独立 bug，还会互相放大）
> **① `permissionFailure`（CKError code 10）被误判为「共享永久失效」。** 但 code 10 在「owner 邀请时给的是只读、还没把 participant 升级成 readWrite」的**握手窗口里是正常瞬时态**。把它标成永久失效 → participant 正式包里又没有自救入口 → 只能重新接受邀请。
> **② 「接受邀请」每次都调用 `resetLocalSyncIdentity()`，而它把用户的删除墓碑（pending-delete / deleted-day 时间戳）一起清空了。** 共享相册是「只增不删」模型——云端 memory 记录**永不真删**，删除只靠本地墓碑压制。墓碑一清 → 下次全量拉 → 云端那些「从没被真正删掉」的记录**全部重新 import → 已删照片复活**。
> **①→② 连环**：误判失效 → 逼用户重新接受 → 触发 reset → 清墓碑 → 放大复活。

> [!example] 排查指纹
> - 只有 participant（被分享方）出问题、owner 正常 → 差异基本在「participant 写共享 zone 需要 owner 显式授权 readWrite」这条路径，以及 participant 专属的 accept / reset 流程。
> - 「删了又回来」+「只增不删的同步模型」→ 一定是**删除意图的本地状态在某处被清空了**，去查所有清空同步状态的地方（reset / accept / 清缓存）有没有连带清掉删除墓碑。

> [!success] 解法
> 1. **`permissionFailure` 移出「判定共享失效」的错误集合**，只保留真正代表「共享/zone 没了」的信号（`unknownItem` / `zoneNotFound` 等）。瞬时的 code 10 交给「下次 owner 打开 app 授权后自愈」，不永久标记。
> 2. **`resetLocalSyncIdentity()` 保留删除墓碑**——只清「同步身份」相关的（owner 标记 / known 集 / change token / dirty / adopted LWW），**绝不清 pending-delete / deleted-day 时间戳**。删除是用户意图，与「设备同步身份」无关。
> 3. （弃用方案，留记录）曾想给 participant 加一个「重置家庭同步」的恢复按钮，但发现：它真能修好的场景（误标成 owner / 旧游标）恰恰不会触发失效标记、按钮不显示；而按钮会显示的场景（共享真没了）它又修不了。**「最需要它时不出现，出现时又没用」的按钮是鸡肋，直接砍掉**，退回成一句准确的提示文案（「请让相册主重新邀请你」）。

> [!tip] 预防 & 教训
> - **「只增不删 + 本地墓碑压制」的同步模型下，任何清空本地同步状态的操作都要显式保留删除墓碑**，否则必然复活。reset / accept / 迁移 / 清缓存都要单独审一遍。
> - **CKError 的瞬时态 vs 永久态要分清**：`permissionFailure` 在共享刚建立 / 权限传播中可能是**正常的临时状态**；`zoneNotFound` / `unknownItem` 更接近永久失效信号，但也要结合 owner / participant 角色和当前阶段判断，别一律掐断同步 + 弹「重新邀请」。
> - 加「恢复 / 重置」类按钮前，先问：**它能修好的场景，和它会出现的场景，重合吗？** 不重合就是鸡肋。
> - participant 与 owner 的路径差异很大（谁写哪个 DB、谁需要授权、谁能清标记），排查共享问题先按角色分开推。

---

## 🐛 08 · CoreData/SwiftData 外部存储文件丢失 → 读 blob 抛 `NSException` 直接 abort（Swift catch 不住）

**日期** 2026-07-07　·　**项目** Miboooo（SwiftData / 本地图片存储）　·　**严重度** 🔴 高（点到损坏那条数据的页面必崩，无法用 `try` 拦截）

> [!bug] 现象
> App 在某些设备上闪退，崩溃栈固定：
> `-[_PFExternalReferenceData _retrieveExternalData] → -[NSData _bridgingCopy:length:] → objc_exception_throw → abort（SIGABRT）`
> 触发点是主线程 UI 渲染读某张照片的 `thumbnailData`（例如「点日历某一天」渲染那天缩略图）。此前经历过存储被撑满 + 内存超限被杀（JetsamEvent）。

> [!danger] 根因
> SwiftData 模型里图片字段是 `@Attribute(.externalStorage)`（底层 Core Data 把大 blob 存成独立文件，主库只存引用）。当那个**外部文件丢了**（写到一半被打断——磁盘满 / JetsamEvent 杀进程 / 上一个 bug 导致的暴涨后遗症），主库里的引用变成**悬空引用**。读这个属性时 Core Data 去取文件、取不到 → 抛 **Objective-C `NSException`** → 进程 abort。
> **关键陷阱：`NSException` 不是 Swift `Error`，Swift 的 `do/catch` / `try?` 根本拦不住**，`NSSetUncaughtExceptionHandler` 也拦不住 abort。任何读到这条坏数据的地方都会崩。
> 附带的坑：有个「内容身份 / 缓存 key」的计算属性为了算签名去**读整个 blob**——它每次重渲都跑，读到丢失文件必崩，而且本身就浪费。

> [!example] 排查指纹
> - 崩溃栈出现 `_PFExternalReferenceData _retrieveExternalData` / `_bridgingCopy` + `objc_exception_throw` → 高度指向外部存储文件丢失。
> - 「点到某条特定数据的页面必崩、别的正常」→ 那条数据的外部 blob 坏了，不是代码逻辑错。
> - 用 `idevicecrashreport` 拉 `.ips`，解析崩溃线程栈定位到具体是读哪个属性（`PhotoAsset.thumbnailData.getter`）。

> [!success] 解法 · Objective-C `@try/@catch` 桥 + 安全访问器 + 占位
> Swift 拦不住 `NSException`，唯一正路是搭一个 OC 桥：
> 1. 新增一个 OC 类，方法体用 `@try { block(); return YES; } @catch { return NO; }`，用 `NS_SWIFT_NAME(catching(_:))` 暴露给 Swift（否则以 `try` 开头的 OC 方法名会被 Swift 自动改名成关键字 `try(_:)` 编译失败）。
> 2. 配 bridging header，**只挂在 App target**（widget 等 extension 是 `APPLICATION_EXTENSION_API_ONLY`，不该引入）。
> 3. 给模型加 `safeXxxData` 访问器：用 OC 桥包住 blob 读取，**文件缺失返回 `nil` 而非 abort**。
> 4. **所有 UI/渲染路径改走 `safeXxxData`**，读到 `nil` 显示占位图（灰底 + 图标），保持 App 可用；下次同步若云端还有会自动补回。
> 5. **「内容身份 / 缓存 key」类每帧都跑的计算属性，绝不读 blob**——改用便宜的主库字段（内容版本号 + 状态标志）就足以捕捉内容变化。

> [!tip] 预防 & 教训
> - **凡是 `@Attribute(.externalStorage)` 的大 blob，所有读取都要经过「可能抛 NSException」的假设**：封装 safe 访问器、读不到给占位，别让一条坏数据崩掉整个 App。这是「离线大 blob」App 的基本盘。
> - **纯 Swift 拦不住 `NSException`，必须 OC `@try/@catch` 桥**——记住这条，别在 Swift 里试 `try?` 白费功夫。
> - 坏数据的来源常常是**上游的另一个 bug**（这次是缓存暴涨 → jetsam → 写中断）。修崩溃（防御）+ 修上游（不再产生坏数据）**两手都要**，只做一个都不够。
> - **计算属性 / 缓存 key 别读大 blob**：既崩又慢，用内联的版本号/标志字段代替。
> - 改动涉及新增 OC 文件 / bridging header 时：xcodegen 项目要 `xcodegen generate` 后新文件才进工程；build 配置改 `project.yml` 而不是直接改 pbxproj。
> - 顺带暴露的 Swift 6 坑：`@MainActor` 类（如 `UIView` 子类）的 `deinit` 是 nonisolated，访问被隔离的存储属性会编译报错；若操作本身线程安全（如 `removeObserver`），给这些属性标 `nonisolated(unsafe)`。这类潜伏错误会在文件被重新编译时才暴露。

---

> [!example]- 📋 新条目模板（复制这段往下加）
> ```markdown
> ## 🐛 NN · 一句话标题
>
> **日期** YYYY-MM-DD　·　**项目** xxx　·　**严重度** 🔴/🟠/🟢
>
> > [!bug] 现象
> > 表现是什么、什么场景下触发。
>
> > [!danger] 根因
> > 真正原因（不是症状）。
>
> > [!success] 解法
> > 怎么修的。
>
> > [!tip] 预防 & 教训
> > 下次怎么避免。
> ```
