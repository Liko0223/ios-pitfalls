---
name: ios-pitfalls-diagnose
description: Use when debugging iOS, Swift, SwiftUI, CloudKit, CKShare, WidgetKit, SwiftData, or Core Data issues where the user provides logs, screenshots, symptoms, build environment details, TestFlight/App Store behavior, device storage growth, widget behavior, navigation glitches, or crash reports. This skill checks a curated real pitfall library before proposing fixes.
---

# iOS Pitfalls Diagnose

Use this skill to diagnose iOS / Swift issues against a curated set of real pitfalls.

## Required Workflow

1. Read `references/pitfalls.json` first.
2. Match the user's issue against `title`, `symptom`, `rootCause`, and `agentKeywords`.
3. If one or more pitfalls match, cite their `id` before giving advice.
4. Treat a match as a hypothesis, not proof. Ask for missing evidence before claiming root cause.
5. Prefer checks from the matching pitfall before editing code.
6. If no pitfall matches, say so and continue with ordinary iOS debugging.

## Evidence To Ask For

Ask only for the missing evidence relevant to the suspected pitfall:

- Build channel: Debug, TestFlight, App Store, simulator, or real device.
- Exact logs or crash frames.
- CloudKit environment: Development or Production.
- Device role: owner or participant for CKShare.
- Whether the issue is real-device-only.
- Whether app storage, `cloudd`, WidgetKit, or UIKit/SwiftUI layer behavior is involved.

## Output Style

When a pitfall matches, answer in this shape:

```text
Likely pitfall: <id> - <title>
Why it matches: <short evidence-based reason>
Check first:
1. ...
2. ...
Fix direction:
1. ...
2. ...
Do not assume:
- ...
Missing evidence:
- ...
```

## References

- `references/pitfalls.json`: structured pitfall index. Load this for most tasks.
- `references/source.md`: full source note from the user's Obsidian vault. Load only when the structured index is insufficient or the user asks for the original write-up.
