# US-4 — Capacity headroom & resource sizing

> **As** an SRE provisioning a service,
> **I want** to compare an uncertain load against provisioned capacity and turn
> it into a number of instances,
> **so that** I know the **odds of overload**, how much **headroom** I have, and
> **how many instances** I must run to serve the peak with a safety margin.

This is the **supply side** of capacity planning; the load distribution it
consumes comes from [US-3](US-3-traffic-load-forecasting.md).

## Why this fits calcy

Overload odds and headroom are exactly the comparison + `chance` primitives from
[US-2](US-2-task-project-estimation.md): `chance(load > capacity)` is the
probability of exceeding capacity. Headroom is subtraction/division. The only
gap is turning a fractional instance count into a whole number — `ceil` — which
this story adds.

## The flow

```
capacity = 30000 req/s          # provisioned ceiling
peak     = (20000 to 28000) req/s

# odds of overload (US-2 comparison + chance)
chance(peak > capacity)         → probability the peak exceeds capacity

# headroom at the 95th-percentile peak
spare    = capacity - p(peak, 0.95)        → spare req/s at p95
headroom = capacity / p(peak, 0.95) - 1    → fractional headroom (e.g. 0.07 = 7%)

# how many instances to serve the p95 peak, with a 30% safety margin
per_instance = 5000 req/s
instances    = ceil(p(peak, 0.95) / per_instance * 1.3)   → a whole number
```

- **Overload odds** — `chance(peak > capacity)`; drives the "are we provisioned
  enough?" decision directly.
- **Headroom** — spare capacity in absolute (`capacity - p(peak, 0.95)`) or
  fractional (`capacity / p(peak, 0.95) - 1`) terms. Use `p(peak, q)` to size
  against a percentile rather than the mean.
- **Sizing** — `ceil(load / per_instance)` gives whole instances; multiply by a
  margin first. `per_instance` and `capacity` can themselves be distributions.

## Additions this story needs

| Addition | Form | Status |
|---|---|---|
| Rounding helpers | `ceil(x)`, `floor(x)`, `round(x)` | **Shipped** — elementwise, dimension-preserving (`src/lib/engine/eval.ts`). The only new primitive for US-4. |
| Overload odds | `chance(load > capacity)` | Reused from US-2. |

No dedicated capacity *view* is proposed; the notepad + Rate Card carry the
flow. A sizing panel could be a later story if demand appears.

## Acceptance criteria (golden tests)

```
# ceil/floor/round are elementwise and preserve dimension
ceil(2.1 req)                   → 3 req
floor(2.9)                      → 2
round(2.5)                      → 3

# instances to serve a fixed load (deterministic)
ceil(23000 req/s / (5000 req/s) * 1.3)   → 6     (23000/5000·1.3 = 5.98 → 6)

# overload odds are a probability in [0,1]
capacity = 30000 req/s
peak     = (20000 to 28000) req/s
chance(peak > capacity)         → in [0,1]; small for this peak

# sizing against an uncertain peak yields an integer-valued distribution
instances = ceil(peak / (5000 req/s))    → all samples are whole numbers
```

## Out of scope

- **Bin-packing / heterogeneous instance types**, autoscaling policies, or cost
  optimisation across instance families. (Cost roll-up could be a later story:
  `instances * 0.10 $/hour * 1 month`.)
- **Queueing-theory** latency/utilisation models (M/M/c etc.) — US-4 is
  throughput headroom, not latency under load.
- Solving for the **minimum capacity** that hits a target overload probability —
  the user sweeps candidate capacities and reads `chance(peak > capacity)`.

## Personas served

- **SRE** — "peak is 20–28k req/s, we run 30k of capacity: what's our overload
  risk and how many 5k-req/s instances cover p95 with margin?"
- **Cost-aware eng lead** — feeds `instances` into a `$/hour` rate to quote the
  monthly bill (composes with the Rate Card and accumulation).
