# Threat Model

This note records assets, adversaries, and controls for the on-device intelligence
stack. It complements Security, Privacy, and Safety in the product specifications.

## Assets

- Camera frames and pose coordinates (highest sensitivity, device-only)
- Movement profile enumerations
- Derived session metrics
- Bearer tokens and publishable keys
- Catalog content (public)

## Adversaries

- Network observer on API traffic
- Compromised or curious backend operator
- Malicious exercise catalog row
- Local process that tries to subscribe to the camera outside the pose module

## Controls

- Frames never enter JavaScript persistence or HTTP bodies
- Tool arguments cannot carry media or coordinate fields
- API schemas set `additionalProperties: false` and reject landmark-shaped names
- RLS plus bearer-scoped repositories on hosted tables
- No service-role key in the client
- Orchestrator failure does not require a network fallback that uploads features

## Residual Risk

A rooted or jailbroken device can read process memory. That risk is accepted; the
architecture still refuses to transmit media from a cooperative client.
