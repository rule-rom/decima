# Tile model v3

A tile is a local hydraulic integrator over the shared eight-lane VSB. It neither receives a neighbour's output nor forwards its own data to a neighbour.

## What the architect bakes

| Field | Role |
| --- | --- |
| `W[8][8]` | Signed transform of the common VSB input |
| `thr_lo16`, `thr_hi16` | Latching corridor |
| `decay16` | Accumulator leakage toward zero |
| `routing_flags16` | Local permission edges, `BUS_R`, `BUS_W` |
| `domain_id4` | Competition and reset domain |
| `priority8` | Winner selection inside a domain |
| `pattern_id16` | Event identifier |
| `reset_on_fire_mask16` | Domains reset by the winner |

Runtime state primarily consists of the signed `thr_cur16` accumulator and the `locked` latch.

## Common input

Every ACTIVE tile receives the same frame:

```c
in16[t][lane] = clamp15(VSB_INGRESS16[lane]);
```

The tile matrix does not deliver data. It defines that tile's sensitivity to the eight strings of the common stream.

## Accumulation

For an unlocked tile:

```text
delta = sum(W x VSB)
thr_cur = clamp_i16(decay_toward_zero(thr_cur + delta))
```

When the new state enters the active `[thr_lo16..thr_hi16]` corridor, the tile may latch. The `unlocked -> locked` transition is the `FIRE` event.

The upper bound is a real part of the filter. Both insufficient and excessive accumulated impact are outside the corridor, while the meaning of that distinction belongs to the baker, not the machine.

## Life of a locked tile

A locked tile:

- adds no new `delta`;
- continues to decay toward zero;
- remains locked only while the accumulator is inside its corridor and activation permission remains;
- unlocks on corridor exit or permission loss;
- recomputes `row_out` from the current common VSB for a possible BUS16 contribution.

Lock is therefore neither permanent state nor input passthrough. It is a leaky, temporarily retained state.

## Emergent memory

The sequence is not stored in a separate buffer. It appears in:

1. accumulated `thr_cur` values;
2. current latches;
3. the permitted topology front;
4. domain FIRE and reset events.

The baker constructs a memory organ from a sparse set of tiles, and the tape fills it with state.

## Invariants

- the same `.d8p`, initial state, complete VSB tape, and reset schedule produce the same trace;
- `FIRE` means only a transition into lock;
- an inactive tile clears its runtime state;
- neighbour edges carry no data.
