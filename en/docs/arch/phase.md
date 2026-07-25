# Decima v3 tick

The two phases define logical computation and readout order. A future hardware substrate may implement the carrier electrically; the software runtime does not require a literal single wire switching to Hi-Z.

## EV_FLASH order

```text
1. Snapshot locked_before
2. Build ACTIVE closure
3. Present common VSB to active tiles
4. Update accumulators, decay, and lock
5. Record FIRE and domain winners
6. Assemble BUS16 from BUS_W contributions
7. Sample readout and flags
8. Apply auto-reset to selected domains
```

## ACTIVE closure

Tiles with `BUS_R` are roots. A locked ancestor from the `locked_before` snapshot permits its local descendants to compute. Closure is evaluated to a fixed point, so multiple levels of an already locked branch may be ACTIVE in one tick.

Inactive tiles clear `thr_cur` and `locked`.

## Tile processing

An unlocked ACTIVE tile applies weights to the common VSB, adds signed `delta`, decays, and tests its corridor.

A locked ACTIVE tile adds no new `delta`, but decay still applies. It stays locked only inside its corridor and while permission remains. This corrects the old v0.2 description in which locked state appeared immutable.

## Events and domains

`FIRE` is recorded only on `unlocked -> locked`. Multiple FIRE events in one domain set collision state; the runtime deterministically selects a winner by priority and then lower tile id.

The winner may request a domain reset. The current tick readout has already been formed; reset prepares memory for the next history.

## Time

The contract fixes order, not a universal `20 us`. Wall-clock time depends on active tile count, runtime implementation, CPU, and future hardware. Published benchmarks apply only to their stated build and machine.
