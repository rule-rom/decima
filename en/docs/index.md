# DECIMA-8 — a deterministic neuromorphic machine

> Eight shared input lanes. Thousands of local integrators. Events instead of continuous prediction.

**Current physics:** v3

**Reference:** the C software runtime and the `.d8p` personality format

DECIMA-8 consumes a stream of eight Level16 VSB lanes and presents every frame to all active tiles at once. A tile weighs the common input, accumulates signed state, loses it through decay, and latches an event when the accumulator enters its configured corridor.

Neighbouring tiles do not pass data to each other. Local topology passes only **permission to compute on the next tick**. A personality branch is therefore a sequence of conditions over one shared history, not a data channel.

## Physics of one tick

```text
8-lane VSB frame
  -> common input for all ACTIVE tiles
  -> W[8x8] + signed accumulator + decay
  -> fuse inside [thr_lo..thr_hi]
  -> FIRE on unlocked -> locked transition
  -> local permission for descendants
  -> BUS_W readout and domain events
```

Memory emerges from `thr_cur`, `locked`, and the active topology front. There is no separate history array: the personality integrates the sequence directly in its state.

## Who defines a personality

The architect, or baker, defines the meaning of the eight input lanes, weights, thresholds, decay, topology, domains, priorities, and reset rules. Baking produces a `.d8p`: an executable machine configuration rather than branching application code.

The environment supplies the tape. The baker defines the space of possible reactions. Decima deterministically lives through the tape inside that space.

## Applied system

[Whaler](https://whaler.rulerom.com/) is the first applied Decima-8 family. Market microstructure is compressed into an eight-lane VSB tape; rare Decima events feed a risk director and trading contour. It is an imbalance event filter, not an HFT classifier forced to trade every candle.

## Documentation

- [Tile model v3](arch/tiles.md)
- [VSB and BUS16](arch/bus.md)
- [Runtime tick](arch/phase.md)
- [Activation graph](arch/routing.md)
- [IDE and personality observation](tools/ide.md)
- [Reference runtime benchmark](https://decima.rulerom.com/ru/bench/)
- [Architecture philosophy](https://philo.rulerom.com/en/)
- [Source code](https://github.com/rulerom/decima8)

The v0.2 materials are preserved as a historical contract. They document an earlier architecture stage and do not supersede the current v3 physics.

📧 [vsb@decima8.org](mailto:vsb@decima8.org)
