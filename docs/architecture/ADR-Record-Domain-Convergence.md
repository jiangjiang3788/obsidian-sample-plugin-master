# ADR — Record Domain Convergence (1.5.0)

## Status

Accepted for Think OS 1.5.0.

## Decision

Think OS uses two orthogonal business identities for a Record:

```text
recordType — what the record is
goalPath   — why / for which Goal it exists
```

Category is not a third persisted identity and is retired.

### Record Type ownership

- Record Schema owns canonical type identity and persisted grammar.
- Record Type Registry / Presentation owns enumeration order, display label and product-default semantic color identity.
- Views may consume type presentation but cannot own a private type order or color map.
- User-configurable Record Type color overrides are deferred to 1.6.0.

### Goal ownership

- `GoalDefinition.path` is canonical Goal identity.
- `GoalDefinition.color` owns explicit Goal color; Goal Presentation owns deterministic fallback.
- Timeline and other Goal-aware Views consume Goal Presentation directly.
- File names and retired Category color are not Goal identity/color intermediaries.

### Canonical Record Types

`task`, `task-session`, `task-series`, `energy`, `habit`, `event`, `feeling`, `thought`, `review`, `plan`, `blocker`, `milestone`.

`evidence` is retired in favor of `event`. Feeling is a first-class type. Thought no longer uses a feeling/thought subtype. `recordSubtype` remains only for domains that actually define internal subtype facts (currently Energy).

## Migration policy

This is a single-user current-only convergence. Legacy runtime compatibility is intentionally not retained. Upgrade is performed by an explicit offline migration of Settings and, when supplied, Vault Markdown. Legacy keys are stripped at the Settings normalization/persistence boundary so they cannot reappear after save.
