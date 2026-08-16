# Privacy-First Data Flow

The device is the trusted computing base for media and pose. The cloud, when used, is an
optional history store for allowlisted derived facts.

## Stays On-Device

- Camera frames and previews
- Still images and thumbnails
- Microphone audio (AdaptFit does not record session audio)
- Pose landmarks and pixel coordinates
- Feature windows and event-bus payloads that include angles used only in memory
- Local orchestrator weights, prompts, and tool-call logs

## May Leave The Device

Only derived, schema-validated fields listed in the derived metrics allowlist, sent to
the Fastify API over HTTPS with a user bearer token, after the user is in live mode.

## Trust Boundary

```text
[camera] -> [pose module] -> [features] -> [bus] -> [orchestrator/tools]
                 |                                    |
                 +---- never crosses ----+            v
                                   [allowlisted RepMetric batch]
                                              |
                                              v
                                    [Fastify API / Postgres]
```

## Deletion

Session deletion and account deletion remove derived history the API stored. Media cannot
be deleted from the server because it was never sent. Guest SQLite is wiped with the
local store.
