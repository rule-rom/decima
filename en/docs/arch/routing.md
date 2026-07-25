# Local permission graph

DECIMA-8 topology propagates permission to compute, not data.

## RoutingFlags16

| Bits | Meaning |
| --- | --- |
| `0..7` | N, E, S, W, NE, SE, SW, NW edges |
| `8` | `BUS_R`: ACTIVE seed despite its historical name |
| `9` | `BUS_W`: readout contribution permission |
| `10..15` | Reserved |

If tile A has a local direction flag, a permission edge `A -> B` exists toward that neighbour.

## Activation condition

```text
ACTIVE[t] =
  BUS_R[t]
  OR exists parent p:
       ACTIVE[p] AND locked_before[p] AND edge(p, t)
```

Edges:

- carry no VSB;
- never add one tile output to another tile input;
- may have multiple parents;
- may form cycles;
- are evaluated deterministically from `locked_before`.

## Sequence over time

```text
Tick N:
  a root hears common VSB and enters lock

Tick N+1:
  the root is now locked_before
  its descendant becomes ACTIVE
  the descendant hears the new common VSB through its own weights
```

A branch recognizes a sequence of shared environmental states, not a packet travelling through the fabric.

## Branch collapse

When an ancestor unlocks, descendants lose permission unless another locked path or their own `BUS_R` keeps them active. Inactive fabric clears runtime state. Topology thus provides both order memory and forgetting.

## Why the baker needs topology

The baker arranges conditions so that roots hear basic features, descendants test event development, branches meet in domains, and a winner emits a pattern id and may clear used memory.

Topology defines reaction grammar, while every node reads the same shared VSB tape.
