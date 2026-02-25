# Routing and Activation Graph

> **Neighbors form relay, data goes through bus**

---

## 🗺️ RoutingFlags16

### Bit Map (LSB-first)

| Bit | Flag | Description |
|-----|------|-------------|
| **bit0** | N | North: activate neighbor above |
| **bit1** | E | East: activate neighbor right |
| **bit2** | S | South: activate neighbor below |
| **bit3** | W | West: activate neighbor left |
| **bit4** | NE | Northeast: diagonal |
| **bit5** | SE | Southeast: diagonal |
| **bit6** | SW | Southwest: diagonal |
| **bit7** | NW | Northwest: diagonal |
| **bit8** | BUS_R | Read bus (ACTIVE source) |
| **bit9** | BUS_W | Write to bus (WRITE phase) |
| **bit10..15** | reserved | Must be 0 |

### Example

```
routing_flags16 = 0x0301
# binary: 0000 0011 0000 0001
# bits: N(0) + BUS_R(8) + BUS_W(9)
```

---

## 🧭 Neighbor Topology

### Tile Array

```
tile_id = y * tile_w + x
```

### Cardinal Neighbors

| Direction | Formula | Condition |
|-----------|---------|-----------|
| **N(x,y)** | (x, y-1) | y > 0 |
| **S(x,y)** | (x, y+1) | y < tile_h-1 |
| **W(x,y)** | (x-1, y) | x > 0 |
| **E(x,y)** | (x+1, y) | x < tile_w-1 |

### Diagonals

| Direction | Formula | Condition |
|-----------|---------|-----------|
| **NE(x,y)** | (x+1, y-1) | x < tile_w-1 and y > 0 |
| **SE(x,y)** | (x+1, y+1) | x < tile_w-1 and y < tile_h-1 |
| **SW(x,y)** | (x-1, y+1) | x > 0 and y < tile_h-1 |
| **NW(x,y)** | (x-1, y-1) | x > 0 and y > 0 |

---

## 🔗 Activation Edges

### Rule

```
If tile A has Dir flag set and neighbor B = neighbor(A, Dir) exists
→ edge A → B
```

### Important Properties

| Property | Description |
|----------|-------------|
| **ACTIVE only** | Edges affect only ACTIVE computation |
| **No data transfer** | Neighbors don't send data |
| **Multi-parents** | Allowed |
| **Cycles** | Allowed (determinism via locked_before) |

---

## 🌳 Activation Graph (ACTIVE Closure)

### ACTIVE Computation

```python
# Seed: sources (chain roots)
ACTIVE[t] = 1 if BUS_R[t] == 1

# Propagate: graph closure
ACTIVE[t] = 1 if exists p ∈ Parents(t) such that:
           ACTIVE[p] == 1 AND locked_before[p] == 1

# Least fixed point until stabilization
```

### Relay Example

```
Tick N:
  Tile A (BUS_R=1): ACTIVE=1, computes, locked_after=1
  Tile B (parent of A, flag N): ACTIVE=0 (since locked_before[A]=0)

Tick N+1:
  Tile A: locked_before=1, drives bus
  Tile B: ACTIVE=1 (since ACTIVE[A]=1 and locked_before[A]=1)
          → reads VSB_INGRESS → computes
```

---

## 🎯 Parents(t) — Parent Set

```python
Parents(t) = { p | tile p has Dir flag and neighbor(p, Dir) = t }
```

### Example

```
Tile(5,5) has parents:
- Tile(5,6) if it has N flag set
- Tile(4,5) if it has E flag set
- Tile(5,4) if it has S flag set
- Tile(6,5) if it has W flag set
- Tile(6,4) if it has NE flag set
- Tile(6,6) if it has NW flag set
- Tile(4,6) if it has SE flag set
- Tile(4,4) if it has SW flag set
```

---

## 🚨 Branch Collapse

If root/intermediate tile is unfused (reset/collide):

```
Tick N:   tile A: locked_before=1, drives bus
Tick N+1: tile A: reset → locked=0
Tick N+2: tile B (descendant of A): ACTIVE=0 → forced to 0
```

### Forced Zero

```python
if ACTIVE[t] == 0:
  thr_cur16 := 0
  locked := 0
  drive_vec := {0, 0, 0, 0, 0, 0, 0, 0}
  # weights/row/decay not applied
```

---

## 📐 Configuration Example

### 4×4 Array

```
┌─────┬─────┬─────┬─────┐
│ 0,0 │ 0,1 │ 0,2 │ 0,3 │  BUS_R=1 (source)
├─────┼─────┼─────┼─────┤
│ 1,0 │ 1,1 │ 1,2 │ 1,3 │  N=1 (activation from below)
├─────┼─────┼─────┼─────┤
│ 2,0 │ 2,1 │ 2,2 │ 2,3 │  N=1
├─────┼─────┼─────┼─────┤
│ 3,0 │ 3,1 │ 3,2 │ 3,3 │  N=1
└─────┴─────┴─────┴─────┘
```

### Activation Graph

```
(0,0) BUS_R=1 → ACTIVE seed
  │
  ▼ (N on 1,0)
(1,0) → ACTIVE if locked_before[(0,0)]=1
  │
  ▼ (N on 2,0)
(2,0) → ACTIVE if locked_before[(1,0)]=1
  │
  ▼ (N on 3,0)
(3,0) → ACTIVE if locked_before[(2,0)]=1
```

---

## 🔗 BUS_R / BUS_W

### BUS_R (Read)

| Parameter | Value |
|-----------|-------|
| **Bit** | bit8 (0x0100) |
| **Purpose** | ACTIVE source (graph seed) |
| **Effect** | ACTIVE[t]=1 regardless of parents |

### BUS_W (Write)

| Parameter | Value |
|-----------|-------|
| **Bit** | bit9 (0x0200) |
| **Purpose** | BUS16 write permission |
| **Condition** | locked self OR locked_ancestor |

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
