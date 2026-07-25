# Shared VSB and output BUS16

DECIMA-8 has two distinct planes that must not be conflated.

| Plane | Direction | Purpose |
| --- | --- | --- |
| `VSB_INGRESS16[8]` | Conductor → swarm | One common input frame for every ACTIVE tile |
| `BUS16[8]` | swarm → Conductor | Saturated sum of eligible `BUS_W` tile contributions |

## VSB: common physical context

VSB does not travel through a tile chain. Within a tick, the same eight-lane vector is available to every ACTIVE tile. Tiles hear it differently because of their weights and accumulated history.

This is the hydraulic model: one shared pressure manifold acts on many local chambers simultaneously.

## BUS16: readout, not tile input

During WRITE, eligible tiles contribute `row_out`:

```text
bus_raw[lane] = sum(row_out[t][lane] for eligible BUS_W tiles)
BUS16[lane] = clamp15(bus_raw[lane])
BUS_CLIP[lane] = bus_raw[lane] > 15
```

The upper bound of `bus_raw` depends on the actual number of active writers. The old `256 x 15` value is not a v3 invariant: the runtime supports fabrics up to 4096 tiles.

## BUS_R and BUS_W

- `BUS_R` is a historical flag name. In the current runtime it makes a tile an ACTIVE graph seed; the tile does not read BUS16 data.
- `BUS_W` allows a tile to contribute to the common output when its branch has a locked source.

A neighbour edge also carries no Level16 data. It only permits the descendant to apply its own matrix to the common VSB on the next tick.

## Why the split matters

One data stream is presented to the whole fabric while topology selects which parts of the personality may respond. Branch depth can therefore express a temporal sequence without copying market, audio, or sensor data between tiles.
