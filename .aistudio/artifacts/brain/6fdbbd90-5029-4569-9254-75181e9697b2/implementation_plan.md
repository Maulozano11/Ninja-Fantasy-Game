# Launching Valley of the End Turn-Based Tactical Combat Encounter

Launch the turn-based 5e tactical combat engine with **Noctis Lucis Caelum** leading the skirmish at the **Valley of the End**, featuring an enhanced interactive **3D D20 dice tray** with physics simulation, manual rolling, and critical hit animations.

---

### User Confirmed Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive interview:
> - **Encounter**: **Valley of the End Skirmish against Rogue Shinobi**. Historic river gorge with running water tiles, stone monument precipices, and tactical cover, pitting Noctis against Rogue Jonin Kagero and his infiltration squad.
> - **Dice Rolling Engine**: **Interactive D20 Dice Tray with Physics and Critical Hits**. Features manual toss triggers, rotational 3D tumble physics, Nat 20 critical hit bursts, and transparent D&D 5e mathematical breakdowns (D20 roll + stat mod vs AC / Save DC).
> - **Lead Character**: **Noctis Lucis Caelum with Royal Warp and Katana**. Deploys with authentic 16-bit JRPG sprite visuals (midnight indigo-slate hair, cyan crystal eyes, and popped leather collar), equipped with Royal Warp Strike (`Body Flicker`), Lightning Blade (`Chidori`), and Katana Dance (`Crescent Moon Dance`).

---

### 1. Architecture & Component Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  - Active View: 'combat'                                              │
│  - Active Character: Noctis Lucis Caelum (from preset_noctis)          │
│  - Encounter: 'Valley of the End Skirmish' (Weather: Rain/Mist)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│         TacticalCombat.tsx           │  │      DiceRollModal.tsx       │
│  - 10x8 Grid with River & Precipice  │  │  - Interactive D20 Tray      │
│  - Noctis Sprite with Warp Motion    │  │  - Manual Throw / Spacebar   │
│  - Rogue Jonin & Chunin Squad AI     │  │  - Tumble Physics & Sound    │
│  - Turn Order Tracker & Round HUD    │  │  - Nat 20 / Nat 1 FX         │
│  - D&D 5e Movement, Action & Jutsu   │  │  - 5e Math Modifier Breakdown│
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

### 2. Implementation Steps

#### Step 1: Default Launch Setup in `src/App.tsx`
- Configure `App.tsx` to automatically initialize with Noctis Lucis Caelum (`preset_noctis`) as the active combatant.
- Launch directly into `activeView: 'combat'` with the `Valley of the End Skirmish` encounter:
  - Title: *"Valley of the End Skirmish"*
  - Description: *"Rogue shinobi have infiltrated the historic river gorge beneath the monumental stone statues. Eliminate the rogue squad before they breach the border."*
  - Enemy Type: `'skirmish'`
  - Weather: `'Rain'` / `'Mist'` (adds elemental lightning conductivity and fire evaporation interactions).

#### Step 2: Interactive D20 Dice Tray Overhaul in `src/components/DiceRollModal.tsx`
- **Manual Roll Physics Trigger**: Add an interactive "Roll D20" button and Spacebar listener so the player actively tosses the dice instead of purely automatic rolls.
- **3D Rotational Tumble Simulation**: Render a multi-faceted icosahedron with rotational velocity, dynamic shadows, and realistic trajectory that bounces inside an illuminated velvet dice tray.
- **Nat 20 Critical Hit & Nat 1 Fumble FX**:
  - *Natural 20*: Explosive golden particle shockwave, royal azure chakra burst, and critical damage multiplier notification.
  - *Natural 1*: Deep red glitch shatter vibration and fumble notification.
- **Transparent 5e Math Formula**: Display clear mathematical resolution:
  `[Natural Roll] + [Stat Mod / Proficiency] = [Total] vs [Target AC: XX] -> HIT / CRITICAL HIT!`.

#### Step 3: Valley of the End Battlefield & Noctis Combat Integration in `src/components/TacticalCombat.tsx`
- **Valley of the End Terrain Generation**:
  - Center river gorge: Water tiles spanning $(x = 4..5, y = 0..7)$ that boost Lightning jutsu area-of-effect and halve fire damage.
  - Stone monument precipices: High-ground elevation tiles offering +2 attack bonus.
  - Fallen stone rubble and foliage: Destructible partial cover (+2 AC) and full cover (+5 AC).
- **Noctis Lucis Caelum Combat Abilities**:
  - *Royal Warp Strike* (`Body Flicker`): Instant teleportation to any tile within 6 spaces followed by an immediate melee katana strike.
  - *Chidori / Lightning Warp Blade*: Electrifies the water channel to shock multiple rogue enemies simultaneously.
  - *Crescent Moon Dance*: Tri-directional phantom katana slash.
- **Rogue Squad AI & Turn Order**:
  - Rogue Jonin Kagero (Shadow Clone, Genjutsu stun, Katana parry).
  - Rogue Chunin Skirmishers (Throwing Kunai, Water Dragon jutsu).

---

### 3. Verification & Validation Plan

1. **Compilation & Type Check**:
   - Run `compile_applet` and `lint_applet` to confirm 0 TypeScript and build errors.
2. **Direct Combat Launch**:
   - Verify that the app launches directly into the tactical grid with Noctis Lucis Caelum ready for Turn 1.
3. **Interactive Dice Rolling**:
   - Test manual D20 rolling on attacks, saving throws, and jutsu damage checks to verify physics tumble and critical hit animations.
4. **Combat Resolution**:
   - Verify that turns progress seamlessly between Noctis and rogue enemies, HP/Chakra bars update correctly, and victory/defeat screens trigger appropriately.
