---
name: ios-pitfalls-diagnose
description: 用于诊断 iOS、Swift、SwiftUI、CloudKit、CKShare、WidgetKit、SwiftData、Core Data 相关问题。当用户提供日志、截图、现象描述、构建环境、TestFlight/App Store 表现、真机问题、存储异常、Widget 行为、导航/浮层异常或崩溃报告时，先匹配真实踩坑库，再给出排查与修复建议。
---

# iOS 踩坑诊断

用这个 Skill 把 iOS / Swift 问题先和一组真实踩坑记录做匹配，再进入常规排查。

## 必走流程

1. 先读取 `references/pitfalls.json`。
2. 用用户的问题去匹配 `title`、`symptom`、`rootCause` 和 `agentKeywords`。
3. 如果命中一个或多个坑，先标出对应的 `id`，再给建议。
4. 把命中结果当成假设，不要当成已经证明的结论；缺证据时先补问。
5. 动代码前，优先执行命中条目里的排查项。
6. 如果没有命中，明确说明“暂时没有命中已知踩坑记录”，再继续常规 iOS 调试。

## 需要补问的证据

只问和当前怀疑点有关的缺失证据：

- 构建渠道：Debug、TestFlight、App Store、模拟器还是真机。
- 具体日志、错误码或崩溃堆栈。
- CloudKit 环境：Development 还是 Production。
- CKShare 里的设备/用户角色：owner 还是 participant。
- 问题是否只在真机出现。
- 是否涉及 app 存储、`cloudd`、WidgetKit、UIKit/SwiftUI 层级或窗口行为。

## 输出格式

命中踩坑记录时，按这个结构回答：

```text
可能命中的坑：<id> - <title>
为什么像：<基于现有证据的简短理由>
先查这些：
1. ...
2. ...
修复方向：
1. ...
2. ...
不要直接假设：
- ...
还缺的证据：
- ...
```

## 参考资料

- `references/pitfalls.json`：结构化、脱敏后的踩坑索引。每次诊断都先读这个。
