---
name: ios-pitfalls-diagnose
description: Diagnose iOS, Swift, SwiftUI, CloudKit, CKShare, WidgetKit, SwiftData, and Core Data issues with a bilingual real-world pitfall library. Use when the user provides logs, screenshots, symptoms, build channel details, TestFlight/App Store behavior, real-device-only bugs, storage growth, widget behavior, navigation/overlay glitches, or crash reports. 用于诊断 iOS 相关问题：先匹配真实踩坑库，再给出排查与修复建议。
---

# iOS Pitfalls Diagnose / iOS 踩坑诊断

Use this skill to match iOS / Swift issues against a bilingual, sanitized set of real pitfalls before ordinary debugging.

用这个 Skill 把 iOS / Swift 问题先和一组中英双语、已脱敏的真实踩坑记录做匹配，再进入常规排查。

## Required Workflow / 必走流程

1. Read `references/pitfalls.json` first.
2. Match the user's issue against both Chinese and English fields: `title`, `titleEn`, `symptom`, `symptomEn`, `rootCause`, `rootCauseEn`, and `agentKeywords`.
3. If one or more pitfalls match, cite their `id` before giving advice.
4. Treat a match as a hypothesis, not proof. Ask for missing evidence before claiming root cause.
5. Prefer the matching pitfall's checks before editing code.
6. If no pitfall matches, say that no known pitfall matched, then continue with ordinary iOS debugging.

## Language Rule / 语言规则

- Reply in the user's language.
- If the user writes in English, use the `*En` fields for titles, summaries, checks, fixes, and avoid notes.
- If the user writes in Chinese, use the Chinese fields.
- If the user mixes languages, keep technical terms unchanged and mirror the user's dominant language.

## Evidence To Ask For / 需要补问的证据

Ask only for missing evidence relevant to the suspected pitfall:

- Build channel: Debug, TestFlight, App Store, simulator, or real device.
- Exact logs, error codes, or crash frames.
- CloudKit environment: Development or Production.
- CKShare role: owner or participant.
- Whether the issue is real-device-only.
- Whether app storage, `cloudd`, WidgetKit, or UIKit/SwiftUI layer behavior is involved.

## Output Style / 输出格式

When a pitfall matches, answer in the user's language and follow this shape:

```text
Likely pitfall / 可能命中的坑: <id> - <title or titleEn>
Why it matches / 为什么像: <short evidence-based reason>
Check first / 先查这些:
1. ...
2. ...
Fix direction / 修复方向:
1. ...
2. ...
Do not assume / 不要直接假设:
- ...
Missing evidence / 还缺的证据:
- ...
```

## References / 参考资料

- `references/pitfalls.json`: structured, sanitized bilingual pitfall index. Read this for every diagnosis.
