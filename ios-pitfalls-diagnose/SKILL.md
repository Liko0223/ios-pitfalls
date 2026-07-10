---
name: ios-pitfalls-diagnose
description: Diagnose iOS, Swift, SwiftUI, UIKit, CloudKit, CKShare, WidgetKit, SwiftData, Core Data, and sync-integrity issues with a bilingual real-world pitfall library. Use when the user provides logs, screenshots, symptoms, build-channel details, TestFlight/App Store behavior, real-device-only bugs, storage growth, data loss, destructive deletes, stale sync snapshots, share-role ambiguity, stuck system-controller loading, widget behavior, navigation glitches, or crash reports. 用于诊断 iOS 相关问题：先匹配真实踩坑库，再给出证据优先、保护数据的排查与修复建议。
---

# iOS Pitfalls Diagnose / iOS 踩坑诊断

Use this skill to match iOS / Swift issues against a bilingual, sanitized set of real pitfalls before ordinary debugging, especially when synchronization or data integrity is at risk.

用这个 Skill 把 iOS / Swift 问题先和一组中英双语、已脱敏的真实踩坑记录做匹配，再进入常规排查；涉及同步、删除或云端覆盖时，优先保护数据完整性。

## Required Workflow / 必走流程

1. Read `references/pitfalls.json` first.
2. Match the user's issue against both Chinese and English fields: `title`, `titleEn`, `symptom`, `symptomEn`, `rootCause`, `rootCauseEn`, and `agentKeywords`.
3. If one or more pitfalls match, cite each full exact `id` from `references/pitfalls.json` before giving advice; never shorten it to forms such as `pit-09`.
4. Treat a match as a hypothesis, not proof. Ask for missing evidence before claiming root cause.
5. Prefer the matching pitfall's checks before editing code.
6. If no pitfall matches, say that no known pitfall matched, then continue with ordinary iOS debugging.
7. For suspected data loss, destructive sync, or cloud overwrite, keep the investigation read-only until local enumeration and the outgoing payload are proven complete; default to fail closed.

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
- Whether a local fetch succeeded, returned a genuine empty result, or failed.
- Which sync entry points can overlap across `await`, and which exact snapshot produced the uploaded payload.
- CKShare identity and role evidence: container, account, owner/participant, zone owner, root, and share.
- How a system controller was closed: interactive dismissal, Done, save, stop sharing, or failure.

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
Data safety boundary / 数据安全边界:
- ...
```

## References / 参考资料

- `references/pitfalls.json`: structured, sanitized bilingual pitfall index covering UI, storage, widgets, CloudKit sharing, and sync integrity. Read this for every diagnosis.
