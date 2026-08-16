# AdaptFit On-Device Intelligence Architecture

This series specifies AdaptFit's five-layer runtime: profile-aware workout construction,
on-device motion analysis, a local orchestrator with validated tool calls, accessible
multimodal guidance, and a privacy-first split between trusted device state and optional
cloud sync.

These documents define contracts, trust boundaries, and component responsibilities. They
do not replace the product specifications in the parent `docs/` folder.

The isolated TypeScript runtime lives in `packages/intelligence`. It is not imported by
`apps/mobile` or `apps/api`.

## Layers

1. User profile and workout generation
2. On-device motion pipeline
3. Local orchestrator and tools
4. User feedback and accessibility
5. Privacy-first data flow

## Contents

1. [System Overview](01-system-overview.md)
2. [Movement Profile](02-movement-profile.md)
3. [Compatibility Engine](03-compatibility-engine.md)
4. [Adaptive Workout Generation](04-workout-generation.md)
5. [Camera Capture Boundary](05-camera-capture-boundary.md)
6. [Pose Inference](06-pose-inference.md)
7. [Feature Engine](07-feature-engine.md)
8. [Repetition and State Tracker](08-rep-state-tracker.md)
9. [Temporal Motion Model](09-temporal-motion-model.md)
10. [Motion Event Bus](10-motion-event-bus.md)
11. [Local Orchestrator](11-slm-orchestrator.md)
12. [Tool-Calling Contract](12-tool-calling-contract.md)
13. [Exercise Adaptation Tool](13-exercise-adaptation-tool.md)
14. [Feedback Tool](14-feedback-tool.md)
15. [Speech Tool](15-speech-tool.md)
16. [Haptics Tool](16-haptics-tool.md)
17. [Progress Tool](17-progress-tool.md)
18. [User Profile Tool](18-profile-tool.md)
19. [Multimodal Accessibility](19-multimodal-accessibility.md)
20. [Privacy-First Data Flow](20-privacy-data-flow.md)
21. [Derived Metrics Allowlist](21-derived-metrics-allowlist.md)
22. [Optional Cloud Sync](22-optional-cloud-sync.md)
23. [Threat Model](23-threat-model.md)
24. [Glossary](24-glossary.md)
