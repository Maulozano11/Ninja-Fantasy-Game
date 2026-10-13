import React, { useState, useEffect, useRef } from 'react';
import {
  ShinobiCharacter,
  BattlefieldTile,
  CombatEntity,
  WeatherType,
  DiceRollResult,
  CombatLogEntry,
  JutsuDefinition,
} from '../types/shinobi';
import { JUTSUS_DATA } from '../data/shinobiData';
import { ShinobiSpriteCanvas } from './ShinobiSpriteCanvas';
import { defaultAppearance, getAppearance } from '../sprite/legacy';
import { castStyleFor } from '../sprite/castInfo';
import type { ItemChoice, SpriteAppearance } from '../sprite/types';

const it = (id: string, ...colors: string[]): ItemChoice => ({ id, colors });
/** Enemy outfits, so foes never wear the player's appearance. */
const enemyLook = (o: Partial<SpriteAppearance>): SpriteAppearance => ({ ...defaultAppearance(), headband: { ...defaultAppearance().headband, position: 'none' }, ...o });
const ENEMY_LOOKS: Record<string, SpriteAppearance> = {
  titan_boss_char: enemyLook({
    body: 'bulky',
    skin: '#c98c5f',
    eyeShape: 'sharp',
    eyeColor: '#f59e0b',
    slots: {
      hair: it('hair_storm', '#ff7b2e'),
      top: it('top_mesh'),
      bottom: it('bottom_hakama', '#3a1f1a', '#cfc8b6'),
      hands: it('hands_gauntlets'),
      feet: it('feet_wraps'),
      face: it('face_warpaint', '#c81e2a'),
    },
    chakra: { color: 'orange', onCharge: true, onCast: true, onVictory: true },
  }),
  hydra_char: enemyLook({
    body: 'bulky',
    skin: '#9fbf8f',
    eyeShape: 'sharp',
    eyeColor: '#f59e0b',
    slots: {
      hair: it('hair_warlord', '#2e6b45'),
      armor: it('armor_bronze', '#5f7a3a', '#2d3a1c'),
      bottom: it('bottom_cargo', '#2d3a1c', '#3e3428'),
      feet: it('feet_greaves', '#7c8a6a', '#2d2a1e'),
      held: it('held_naginata'),
    },
    chakra: { color: 'green', onCharge: true, onCast: true, onVictory: true },
  }),
  kagero_char: enemyLook({
    eyeShape: 'sharp',
    slots: {
      hair: it('hair_lowtail', '#141218'),
      top: it('top_highcollar', '#1d1b26', '#3b3449'),
      bottom: it('bottom_shinobi', '#1d1b26', '#e7e1d1'),
      feet: it('feet_shinobi', '#2a2733', '#141218'),
      cape: it('cape_rogue'),
      held: it('held_kunai'),
    },
    headband: { position: 'forehead', slashed: true, tails: false, emblem: 'crescent', cloth: '#1d1b26', plate: '#9ca3af' },
    chakra: { color: 'violet', onCharge: true, onCast: true, onVictory: false },
  }),
  scout_char: enemyLook({
    slots: {
      hair: it('hair_crop', '#4b5563'),
      face: it('face_catmask'),
      top: it('top_longsleeve', '#2b3346', '#1b2130'),
      armor: it('armor_storm'),
      bottom: it('bottom_shinobi', '#2b3346', '#e7e1d1'),
      feet: it('feet_shinobi', '#2b3346', '#141821'),
      held: it('held_kunai'),
    },
    accessories: [it('acc_kunai_leg')],
    chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
  }),
};
import { DiceRollModal } from './DiceRollModal';
import { soundManager } from '../utils/audio';
import {
  Shield,
  Zap,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Swords,
  Heart,
  Skull,
} from 'lucide-react';

interface TacticalCombatProps {
  playerCharacter: ShinobiCharacter;
  campaignEncounter?: {
    title: string;
    description: string;
    enemyType: 'skirmish' | 'rogue_squad' | 'giant_beast' | 'titanic_threat';
    weather: WeatherType;
  };
  onBattleEnd?: (victory: boolean, expGained: number) => void;
  onBackToCreator?: () => void;
}

const GRID_WIDTH = 10;
const GRID_HEIGHT = 8;

export const TacticalCombat: React.FC<TacticalCombatProps> = ({
  playerCharacter,
  campaignEncounter,
  onBattleEnd,
  onBackToCreator,
}) => {
  // Weather
  const [weather, setWeather] = useState<WeatherType>(campaignEncounter?.weather || 'Clear');
  const [muted, setMuted] = useState<boolean>(soundManager.getMuted());

  // Grid Battlefield State - synchronously initialize with player combatant
  const [grid, setGrid] = useState<BattlefieldTile[][]>([]);
  const [entities, setEntities] = useState<CombatEntity[]>(() => [
    {
      id: 'player',
      name: playerCharacter.name,
      isPlayer: true,
      team: 'player',
      x: 1,
      y: 3,
      size: 1,
      character: { ...playerCharacter, currentHp: playerCharacter.maxHp, currentChakra: playerCharacter.maxChakra },
      conditions: [],
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: playerCharacter.speed,
      spriteState: 'idle',
    },
  ]);
  const [activeEntityId, setActiveEntityId] = useState<string>('player');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnOrder, setTurnOrder] = useState<string[]>(['player']);
  const [turnIndex, setTurnIndex] = useState<number>(0);

  // Selection & Targeting
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedJutsu, setSelectedJutsu] = useState<JutsuDefinition | null>(null);
  const [isEnhancedCast, setIsEnhancedCast] = useState<boolean>(false);
  const [targetedTiles, setTargetedTiles] = useState<{ x: number; y: number }[]>([]);

  // Dice roll modal
  const [diceModalOpen, setDiceModalOpen] = useState<boolean>(false);
  const [currentDiceRoll, setCurrentDiceRoll] = useState<DiceRollResult | null>(null);

  // Combat Log
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Battle outcome
  const [battleState, setBattleState] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');

  // Helper log
  const addLog = (
    text: string,
    type: 'action' | 'damage' | 'environmental' | 'roll' | 'defeat' | 'crit',
    sourceName: string = 'Combat'
  ) => {
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      round: roundNumber,
      sourceName,
      text,
      type,
      timestamp: Date.now(),
    };
    setCombatLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  // Initialize battlefield map and combat entities
  const initBattlefield = () => {
    const encounterType = campaignEncounter?.enemyType || 'giant_beast';

    // 1. Generate Terrain Grid
    const newGrid: BattlefieldTile[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: BattlefieldTile[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        let terrain: BattlefieldTile['terrain'] = 'plain';
        let hp: number | undefined;
        let isFlammable = false;
        let coverBonus = 0;
        let blocksLOS = false;

        const isValley = campaignEncounter?.enemyType === 'skirmish' || campaignEncounter?.title?.includes('Valley');

        if (isValley) {
          // Valley of the End: Central river gorge running through x = 4 and x = 5
          if (x === 4 || x === 5) {
            terrain = 'water';
          }
          // Monument Cliffs / High-Ground Precipices overlooking the river (Statue of Madara / Hashirama)
          else if ((x === 1 && (y === 1 || y === 2)) || (x === 8 && (y === 5 || y === 6))) {
            terrain = 'stone_precipice';
            coverBonus = 2; // High-ground elevation bonus
          }
          // Riverbank rocks & foliage cover
          else if ((x === 3 && (y === 1 || y === 6)) || (x === 6 && (y === 2 || y === 5))) {
            terrain = 'foliage';
            isFlammable = true;
            coverBonus = 2;
          } else if ((x === 2 && y === 4) || (x === 7 && y === 3)) {
            terrain = 'tree';
            hp = 20;
            isFlammable = true;
            coverBonus = 2;
          }
        } else {
          // Standard battlefield
          // Place water pond in center-right
          if ((x === 5 && y === 3) || (x === 6 && y === 3) || (x === 5 && y === 4) || (x === 6 && y === 4)) {
            terrain = 'water';
          }
          // Place wooden houses (flammable!)
          else if ((x === 2 && y === 1) || (x === 7 && y === 6)) {
            terrain = 'wooden_house';
            hp = 25;
            isFlammable = true;
            coverBonus = 5;
            blocksLOS = true;
          }
          // Place trees & dense foliage
          else if (
            (x === 3 && y === 5) ||
            (x === 4 && y === 5) ||
            (x === 1 && y === 4) ||
            (x === 8 && y === 2) ||
            (x === 7 && y === 1)
          ) {
            terrain = 'tree';
            hp = 18;
            isFlammable = true;
            coverBonus = 2; // half cover
            blocksLOS = false;
          } else if ((x === 0 && y === 3) || (x === 3 && y === 2)) {
            terrain = 'foliage';
            isFlammable = true;
            coverBonus = 2;
          }
        }

        row.push({
          x,
          y,
          terrain,
          hp,
          maxHp: hp,
          isFlammable,
          coverBonus,
          blocksLineOfSight: blocksLOS,
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);

    // 2. Generate Entities
    const playerEntity: CombatEntity = {
      id: 'player',
      name: playerCharacter.name,
      isPlayer: true,
      team: 'player',
      x: 1,
      y: 3,
      size: 1,
      character: { ...playerCharacter, currentHp: playerCharacter.maxHp, currentChakra: playerCharacter.maxChakra },
      conditions: [],
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: playerCharacter.speed,
      spriteState: 'idle',
    };

    let enemies: CombatEntity[] = [];

    if (encounterType === 'titanic_threat') {
      // Titanic Threat: Enraged Tailed Beast Avatar (3x3 Colossus)
      const titanEntity: CombatEntity = {
        id: 'titan_boss',
        name: 'Kurama Avatar (Titanic Tailed Beast)',
        isPlayer: false,
        team: 'enemy',
        x: 6,
        y: 2,
        size: 3, // takes 3x3 tiles!
        isBossTitan: true,
        character: {
          ...playerCharacter,
          id: 'titan_boss_char',
          appearance: ENEMY_LOOKS.titan_boss_char,
          name: 'Kurama Avatar',
          clan: 'Akkai',
          shinobiClass: 'Ninjutsu Specialist',
          maxHp: 160,
          currentHp: 160,
          maxChakra: 80,
          currentChakra: 80,
          armorClass: 16,
          speed: 4,
          jutsuSaveDC: 16,
          jutsuAttackBonus: 8,
          palette: {
            ...playerCharacter.palette,
            chakraAuraColor: '#f97316',
            hairColor: '#ea580c',
            eyeColor: '#ef4444',
          },
        },
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementRemaining: 4,
        spriteState: 'idle',
      };
      enemies = [titanEntity];
    } else if (encounterType === 'giant_beast') {
      // Giant Summoned Beast (2x2 tiles)
      const giantBeast: CombatEntity = {
        id: 'giant_beast',
        name: 'Orochi Hydra (Giant Three-Headed Serpent)',
        isPlayer: false,
        team: 'enemy',
        x: 7,
        y: 3,
        size: 2, // 2x2 footprint!
        isBossTitan: true,
        character: {
          ...playerCharacter,
          id: 'hydra_char',
          appearance: ENEMY_LOOKS.hydra_char,
          name: 'Orochi Hydra',
          clan: 'Uddo',
          shinobiClass: 'Taijutsu Master',
          maxHp: 95,
          currentHp: 95,
          maxChakra: 40,
          currentChakra: 40,
          armorClass: 15,
          speed: 5,
          jutsuSaveDC: 15,
          jutsuAttackBonus: 7,
          palette: {
            ...playerCharacter.palette,
            chakraAuraColor: '#10b981',
            armorPrimary: '#065f46',
          },
        },
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementRemaining: 5,
        spriteState: 'idle',
      };
      enemies = [giantBeast];
    } else {
      // Rival Shinobi Squad
      const rogueLeader: CombatEntity = {
        id: 'enemy_leader',
        name: 'Rogue Jonin Kagero',
        isPlayer: false,
        team: 'enemy',
        x: 8,
        y: 2,
        size: 1,
        character: {
          ...playerCharacter,
          id: 'kagero_char',
          appearance: ENEMY_LOOKS.kagero_char,
          name: 'Rogue Jonin Kagero',
          clan: 'Mirai',
          shinobiClass: 'Genjutsu Adept',
          maxHp: 42,
          currentHp: 42,
          maxChakra: 30,
          currentChakra: 30,
          armorClass: 15,
          speed: 6,
          jutsuSaveDC: 14,
          jutsuAttackBonus: 6,
          dojutsu: 'Sharingan (3-Tomoe)',
          palette: {
            ...playerCharacter.palette,
            hairColor: '#18181b',
            chakraAuraColor: '#a855f7',
            armorPrimary: '#1e293b',
          },
        },
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementRemaining: 6,
        spriteState: 'idle',
      };

      const rogueScout: CombatEntity = {
        id: 'enemy_scout',
        name: 'Mist Hunter-nin',
        isPlayer: false,
        team: 'enemy',
        x: 8,
        y: 5,
        size: 1,
        character: {
          ...playerCharacter,
          id: 'scout_char',
          appearance: ENEMY_LOOKS.scout_char,
          name: 'Mist Hunter-nin',
          clan: 'Uddo',
          shinobiClass: 'Bukijutsu Master',
          maxHp: 28,
          currentHp: 28,
          maxChakra: 20,
          currentChakra: 20,
          armorClass: 14,
          speed: 7,
          jutsuSaveDC: 13,
          jutsuAttackBonus: 5,
          armorStyle: 'Mist Storm Vest',
          palette: {
            ...playerCharacter.palette,
            hairColor: '#334155',
            chakraAuraColor: '#0ea5e9',
            armorPrimary: '#475569',
          },
        },
        conditions: [],
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementRemaining: 7,
        spriteState: 'idle',
      };
      enemies = [rogueLeader, rogueScout];
    }

    const allEntities = [playerEntity, ...enemies];
    setEntities(allEntities);
    setTurnOrder(allEntities.map((e) => e.id));
    setActiveEntityId('player');
    setTurnIndex(0);
    setRoundNumber(1);
    setBattleState('ongoing');

    addLog(
      `Battle commenced! Weather: ${weather}. Battlefield contains destructible houses, lakes, and foliage.`,
      'action'
    );
  };

  useEffect(() => {
    initBattlefield();
  }, [campaignEncounter]);

  // Active Entity
  const currentEntity = entities.find((e) => e.id === activeEntityId) || entities[0];
  const isPlayerTurn = currentEntity?.isPlayer;

  // Next Turn
  const handleEndTurn = () => {
    soundManager.playSelect();
    setSelectedJutsu(null);
    setIsEnhancedCast(false);
    setTargetedTiles([]);

    // Check round wrap-around
    const nextIdx = (turnIndex + 1) % turnOrder.length;
    if (nextIdx === 0) {
      setRoundNumber((r) => r + 1);
      addLog(`--- Round ${roundNumber + 1} Begins ---`, 'action');
    }

    // Refresh active entity action points and trigger Uddo regeneration
    const nextEntityId = turnOrder[nextIdx];
    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id === nextEntityId) {
          let chakraRegen = 0;
          if (ent.character.clan === 'Uddo') chakraRegen += 2;
          return {
            ...ent,
            actionUsed: false,
            bonusActionUsed: false,
            reactionUsed: false,
            movementRemaining: ent.character.speed,
            spriteState: 'idle',
            character: {
              ...ent.character,
              currentChakra: Math.min(ent.character.maxChakra, ent.character.currentChakra + chakraRegen),
            },
          };
        }
        return ent;
      })
    );

    setTurnIndex(nextIdx);
    setActiveEntityId(nextEntityId);

    // If next entity is AI enemy, trigger AI turn
    const nextEntity = entities.find((e) => e.id === nextEntityId);
    if (nextEntity && !nextEntity.isPlayer) {
      setTimeout(() => {
        executeEnemyAITurn(nextEntity);
      }, 700);
    }
  };

  // AI Turn Execution
  const executeEnemyAITurn = (enemy: CombatEntity) => {
    if (battleState !== 'ongoing' || enemy.character.currentHp <= 0) {
      handleEndTurn();
      return;
    }

    const player = entities.find((e) => e.isPlayer);
    if (!player || player.character.currentHp <= 0) return;

    // Calculate distance to player
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);

    // Enemy AI: If distant, move closer; if in range, unleash jutsu or claw attack!
    if (dist > 3 && enemy.movementRemaining > 0) {
      // Step toward player
      const stepX = enemy.x > player.x ? enemy.x - 1 : enemy.x < player.x ? enemy.x + 1 : enemy.x;
      const stepY = enemy.y > player.y ? enemy.y - 1 : enemy.y < player.y ? enemy.y + 1 : enemy.y;

      setEntities((prev) =>
        prev.map((e) => (e.id === enemy.id ? { ...e, x: stepX, y: stepY, movementRemaining: 0 } : e))
      );
      addLog(`${enemy.name} stalks forward across the battlefield!`, 'action', enemy.name);
    }

    // Attack action
    setTimeout(() => {
      executeEnemyAttack(enemy, player);
    }, 500);
  };

  const executeEnemyAttack = (enemy: CombatEntity, target: CombatEntity) => {
    // Enemy rolls d20 attack
    const d20 = Math.floor(Math.random() * 20) + 1;
    const isCrit = d20 === 20;
    const totalAttack = d20 + enemy.character.jutsuAttackBonus;

    // Calculate target cover bonus from battlefield terrain
    const targetTile = grid[target.y]?.[target.x];
    const coverAC = targetTile ? targetTile.coverBonus : 0;
    const effectiveAC = target.character.armorClass + coverAC;

    if (totalAttack >= effectiveAC || isCrit) {
      // Hit!
      let damage = enemy.isBossTitan
        ? Math.floor(Math.random() * 16) + 10 // Titan devastating swipe
        : Math.floor(Math.random() * 10) + 6; // Jonin strike

      if (isCrit) damage *= 2;

      soundManager.playHit();
      addLog(
        `${enemy.name} strikes ${target.name}! d20(${d20}) + ${enemy.character.jutsuAttackBonus} = ${totalAttack} vs AC ${effectiveAC} (Hit!). Deals ${damage} damage!`,
        'damage',
        enemy.name
      );

      setEntities((prev) =>
        prev.map((e) => {
          if (e.id === target.id) {
            const nextHp = Math.max(0, e.character.currentHp - damage);
            return {
              ...e,
              spriteState: 'hurt',
              character: { ...e.character, currentHp: nextHp },
            };
          }
          return e;
        })
      );

      // Check player defeat
      if (target.character.currentHp - damage <= 0) {
        soundManager.playDestruction();
        setBattleState('defeat');
        addLog(`${target.name} has fallen in battle!`, 'defeat', 'System');
        return;
      }
    } else {
      addLog(
        `${enemy.name} attacks ${target.name}: d20(${d20}) vs AC ${effectiveAC} - Evaded! (Cover +${coverAC} AC saved you)`,
        'action',
        enemy.name
      );
    }

    setTimeout(() => {
      handleEndTurn();
    }, 700);
  };

  // Move Player Shinobi on Grid Click
  const handleTileClick = (tx: number, ty: number) => {
    if (!isPlayerTurn || battleState !== 'ongoing') return;

    // If jutsu targeting is active, cast jutsu on tile
    if (selectedJutsu) {
      handleCastJutsu(selectedJutsu, tx, ty);
      return;
    }

    // Otherwise, move player to tile
    const player = currentEntity;
    if (!player || !player.isPlayer) return;
    const dist = Math.abs(player.x - tx) + Math.abs(player.y - ty);

    if (dist === 0) return; // already here

    const tile = grid[ty]?.[tx];
    if (tile && (tile.terrain === 'wooden_house' || tile.terrain === 'earth_wall') && tile.hp && tile.hp > 0) {
      addLog('Cannot step into an impassable building or earth wall! Attack it to destroy.', 'action');
      return;
    }

    if (dist <= player.movementRemaining) {
      soundManager.playSelect();
      setEntities((prev) =>
        prev.map((e) =>
          e.id === player.id
            ? {
                ...e,
                x: tx,
                y: ty,
                movementRemaining: e.movementRemaining - dist,
              }
            : e
        )
      );

      // Check for explosive tag trap trigger!
      if (tile && tile.terrain === 'explosive_tag') {
        soundManager.playDestruction();
        const trapDamage = Math.floor(Math.random() * 12) + 6;
        addLog(`BOOM! Stepped on an Explosive Tag Ambush! Takes ${trapDamage} Fire damage!`, 'damage');
        setEntities((prev) =>
          prev.map((e) =>
            e.id === player.id
              ? {
                  ...e,
                  character: { ...e.character, currentHp: Math.max(0, e.character.currentHp - trapDamage) },
                }
              : e
          )
        );
        // Clear trap
        setGrid((prev) => {
          const next = [...prev.map((row) => [...row])];
          next[ty][tx] = { ...next[ty][tx], terrain: 'plain' };
          return next;
        });
      }

      addLog(`Moved to position (${tx}, ${ty}). (${player.movementRemaining - dist} movement remaining)`, 'action');
    }
  };

  // Prepare Jutsu Targeting
  const handleSelectJutsu = (jutsu: JutsuDefinition) => {
    soundManager.playSelect();
    const effectiveCost = jutsu.chakraCost + (isEnhancedCast ? jutsu.enhancementChakraCost : 0);
    if (currentEntity.character.currentChakra < effectiveCost) {
      addLog(`Not enough Chakra! Needs ${effectiveCost} Chakra, but you only have ${currentEntity.character.currentChakra}.`, 'action');
      return;
    }

    setSelectedJutsu(jutsu);

    // Compute range tiles
    const player = currentEntity;
    const inRangeTiles: { x: number; y: number }[] = [];

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const d = Math.hypot(x - player.x, y - player.y);
        if (d <= jutsu.range) {
          inRangeTiles.push({ x, y });
        }
      }
    }
    setTargetedTiles(inRangeTiles);
  };

  // CAST JUTSU: Process D&D 5e Dice Rolls, Environmental Destructions, and Damage!
  const handleCastJutsu = (jutsu: JutsuDefinition, targetX: number, targetY: number) => {
    const player = currentEntity;
    const dist = Math.hypot(targetX - player.x, targetY - player.y);

    if (dist > jutsu.range) {
      addLog(`Out of range! Maximum range is ${jutsu.range} tiles.`, 'action');
      return;
    }

    const totalCost = jutsu.chakraCost + (isEnhancedCast ? jutsu.enhancementChakraCost : 0);
    if (player.character.currentChakra < totalCost) {
      addLog('Insufficient chakra for this technique!', 'action');
      return;
    }

    // Play jutsu casting sound
    soundManager.playJutsuCast(jutsu.nature);

    // Deduct Chakra & Set Casting Animation
    // Special: Body Flicker / Royal Warp Strike instantly teleports to target tile!
    const isWarp = jutsu.id === 'body_flicker';

    setEntities((prev) =>
      prev.map((e) =>
        e.id === player.id
          ? {
              ...e,
              x: isWarp ? targetX : e.x,
              y: isWarp ? targetY : e.y,
              actionUsed: true,
              spriteState: isWarp ? 'attack' : 'cast',
              castStyle: castStyleFor(getAppearance(e.character), jutsu.id),
              character: {
                ...e.character,
                currentChakra: e.character.currentChakra - totalCost,
              },
            }
          : e
      )
    );

    if (isWarp) {
      soundManager.playChakraSurge();
      addLog(`WARP STRIKE! ${player.name} flickered instantly across space to (${targetX}, ${targetY})!`, 'crit');
    }

    // D&D 5e ROLL RESOLUTION:
    // 1. Attack roll vs AC or Saving Throw vs DC
    const d20 = Math.floor(Math.random() * 20) + 1;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;

    // Check targets inside area of effect
    const affectedRadius = jutsu.aoeRadius || (jutsu.areaOfEffect === 'Sphere' ? 1 : 0);
    const affectedTiles: { x: number; y: number }[] = [];

    for (let dy = -affectedRadius; dy <= affectedRadius; dy++) {
      for (let dx = -affectedRadius; dx <= affectedRadius; dx++) {
        const nx = targetX + dx;
        const ny = targetY + dy;
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          affectedTiles.push({ x: nx, y: ny });
        }
      }
    }

    // ENVIRONMENTAL DESTRUCTION & DYNAMIC SURROUNDINGS:
    setGrid((prevGrid) => {
      const nextGrid = [...prevGrid.map((row) => [...row])];

      affectedTiles.forEach(({ x, y }) => {
        const tile = nextGrid[y]?.[x];
        if (!tile) return;

        // 1. Fireball / Fire Jutsu ignites Wooden Houses and Trees
        if (jutsu.environmentalEffect === 'Ignites Wood' || jutsu.nature === 'Fire') {
          if (tile.terrain === 'wooden_house') {
            soundManager.playDestruction();
            nextGrid[y][x] = {
              ...tile,
              terrain: 'charred_ruins',
              hp: 0,
              coverBonus: 2,
              blocksLineOfSight: false,
            };
            addLog(`The Wooden House was engulfed in roaring flames and reduced to Charred Ruins!`, 'environmental');
          } else if (tile.terrain === 'tree' || tile.terrain === 'foliage') {
            nextGrid[y][x] = {
              ...tile,
              terrain: 'fire_blaze',
              coverBonus: 0,
            };
            addLog(`Foliage and trees were ignited into a persistent raging fire!`, 'environmental');
          }
        }

        // 2. Earth Wall (Doryuheki): Spawns dynamic destructible cover!
        if (jutsu.environmentalEffect === 'Creates Earth Wall') {
          soundManager.playDestruction();
          nextGrid[y][x] = {
            ...tile,
            terrain: 'earth_wall',
            hp: isEnhancedCast ? 50 : 30,
            maxHp: isEnhancedCast ? 50 : 30,
            coverBonus: 5, // Three-quarters cover (+5 AC!)
            blocksLineOfSight: true,
          };
          addLog(`A towering Earth Wall (Doryuheki) erupted from the ground (+5 AC Cover)!`, 'environmental');
        }

        // 3. Water Shield (Suijinheki): Creates water barrier that quenches flames
        if (jutsu.environmentalEffect === 'Creates Water Barrier') {
          nextGrid[y][x] = {
            ...tile,
            terrain: 'water_barrier',
            hp: 25,
            coverBonus: 2,
            blocksLineOfSight: false,
          };
          addLog(`A torrent of swirling water formed a dynamic Water Barrier!`, 'environmental');
        }

        // 4. Wind Blade: Slices dense foliage and trees into clear open paths!
        if (jutsu.environmentalEffect === 'Clears Foliage' || jutsu.nature === 'Wind') {
          if (tile.terrain === 'tree' || tile.terrain === 'foliage') {
            nextGrid[y][x] = {
              ...tile,
              terrain: 'plain',
              coverBonus: 0,
            };
            addLog(`Wind Release gale sliced through the dense foliage, carving a clear pathway!`, 'environmental');
          }
        }

        // 5. Lightning Jutsu on Water: Electrifies the entire pool!
        if (jutsu.environmentalEffect === 'Electrifies Water' || jutsu.nature === 'Lightning') {
          if (tile.terrain === 'water') {
            nextGrid[y][x] = {
              ...tile,
              isElectrified: true,
            };
            addLog(`Lightning surged through the water, electrifying the entire pool!`, 'environmental');
          }
        }

        // 6. Explosive Tag Trap Setter
        if (jutsu.environmentalEffect === 'Sets Trap') {
          nextGrid[y][x] = {
            ...tile,
            terrain: 'explosive_tag',
            trapArmingPlayerId: player.id,
          };
          addLog(`Concealed an Explosive Tag trap at (${x}, ${y})!`, 'action');
        }
      });

      return nextGrid;
    });

    // DAMAGE CALCULATION:
    // Parse damage dice (e.g. "3d8", "5d10", "8d10")
    let baseDamage = 0;
    const rolls: number[] = [];

    if (jutsu.damageDice) {
      const match = jutsu.damageDice.match(/(\d+)d(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          rolls.push(roll);
          baseDamage += roll;
        }
      } else {
        baseDamage = 18;
      }
    } else {
      baseDamage = 0; // defensive or utility
    }

    // Weather modifiers
    if (weather === 'Downpour' && jutsu.nature === 'Fire') baseDamage = Math.max(1, baseDamage - 4);
    if (weather === 'Downpour' && (jutsu.nature === 'Lightning' || jutsu.nature === 'Water')) baseDamage += 4;
    if (weather === 'Scorching Drought' && jutsu.nature === 'Fire') baseDamage += 5;

    // Jutsu Enhancement bonus!
    if (isEnhancedCast) {
      baseDamage += 12; // massive upcast power
      addLog(`⚡ JUTSU ENHANCEMENT ACTIVATED: ${jutsu.enhancementEffect}`, 'action');
    }

    if (isCrit) {
      baseDamage *= 2;
    }

    // Find enemies in affected tiles
    const hitEnemies = entities.filter((e) =>
      !e.isPlayer &&
      affectedTiles.some((at) => {
        // Support multi-tile boss footprint (e.g. 2x2 or 3x3)
        for (let bx = 0; bx < e.size; bx++) {
          for (let by = 0; by < e.size; by++) {
            if (e.x + bx === at.x && e.y + by === at.y) return true;
          }
        }
        return false;
      })
    );

    // Apply Damage to hit enemies
    let anyDefeated = false;

    if (hitEnemies.length > 0) {
      soundManager.playHit();

      setEntities((prev) =>
        prev.map((e) => {
          const isHit = hitEnemies.some((he) => he.id === e.id);
          if (isHit) {
            const nextHp = Math.max(0, e.character.currentHp - baseDamage);
            if (nextHp === 0) anyDefeated = true;
            return {
              ...e,
              spriteState: 'hurt',
              character: {
                ...e.character,
                currentHp: nextHp,
              },
            };
          }
          return e;
        })
      );

      hitEnemies.forEach((he) => {
        addLog(
          `${jutsu.name} detonates on ${he.name}! Roll d20(${d20}) + ${player.character.jutsuAttackBonus}. Hit deals ${baseDamage} ${jutsu.damageType || 'Elemental'} damage!`,
          isCrit ? 'crit' : 'damage'
        );
      });
    } else if (jutsu.damageDice) {
      addLog(`${jutsu.name} blasted the targeted tiles, altering the terrain!`, 'action');
    }

    // Self Healing jutsu
    if (jutsu.damageType === 'Healing') {
      const healAmount = baseDamage + 8;
      setEntities((prev) =>
        prev.map((e) =>
          e.id === player.id
            ? {
                ...e,
                character: {
                  ...e.character,
                  currentHp: Math.min(e.character.maxHp, e.character.currentHp + healAmount),
                },
              }
            : e
        )
      );
      addLog(`Mystical Palm knitted your wounds, restoring ${healAmount} Hit Points!`, 'action');
    }

    // Trigger Dice Roller UI
    setCurrentDiceRoll({
      diceType: 'd20',
      roll: d20,
      modifier: player.character.jutsuAttackBonus,
      total: d20 + player.character.jutsuAttackBonus,
      isCritical: isCrit,
      isFumble,
      targetAC: hitEnemies[0]?.character.armorClass || 14,
      isSuccess: d20 + player.character.jutsuAttackBonus >= (hitEnemies[0]?.character.armorClass || 14),
      reason: `${jutsu.name} [Rank ${jutsu.rank}]`,
    });
    setDiceModalOpen(true);

    // Reset targeting state
    setSelectedJutsu(null);
    setTargetedTiles([]);

    // Check Victory
    setTimeout(() => {
      setEntities((latestEntities) => {
        const remainingEnemies = latestEntities.filter((e) => !e.isPlayer && e.character.currentHp > 0);
        if (remainingEnemies.length === 0) {
          soundManager.playCriticalHit();
          setBattleState('victory');
          addLog('VICTORY! All hostile combatants and titanic beasts vanquished!', 'crit', 'Victory');
          if (onBattleEnd) onBattleEnd(true, 1200);
        }
        return latestEntities;
      });
    }, 1200);
  };

  // Weather switch
  const handleWeatherChange = (newWeather: WeatherType) => {
    soundManager.playSelect();
    setWeather(newWeather);
    addLog(`Battlefield atmosphere shifted to: ${newWeather}`, 'environmental');
  };

  if (!currentEntity || grid.length === 0) {
    return (
      <div className="min-w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-cyan-400 font-mono">Deploying Shinobi Battlefield...</p>
      </div>
    );
  }

  return (
    <div className="min-w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* COMBAT HEADER */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              Round {roundNumber} · Turn: {currentEntity?.name} {isPlayerTurn ? '(YOU)' : '(ENEMY)'}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {campaignEncounter?.title || 'Tactical Shinobi Battlefield'}
            </h2>
          </div>

          {/* Weather Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Weather:</span>
            <span className="font-semibold text-amber-300">{weather}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Weather Selector */}
          <select
            value={weather}
            onChange={(e) => handleWeatherChange(e.target.value as WeatherType)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="Clear">Clear Sky</option>
            <option value="Downpour">Downpour Rain (Buffs Water/Lightning)</option>
            <option value="Scorching Drought">Scorching Heat (Buffs Fire)</option>
            <option value="Sandstorm">Sandstorm (Vision Hazard)</option>
          </select>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              soundManager.setMuted(nextMuted);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Toggle Sound FX"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Restart Battle */}
          <button
            type="button"
            onClick={initBattlefield}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Map
          </button>

          {onBackToCreator && (
            <button
              type="button"
              onClick={onBackToCreator}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400"
            >
              Character Creator
            </button>
          )}
        </div>
      </div>

      {/* BATTLEFIELD GRID & TACTICAL INTERACTION */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* LEFT / CENTER: 10x8 TACTICAL 2D SPRITE GRID */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
            {/* Weather Overlay FX */}
            {weather === 'Downpour' && (
              <div className="absolute inset-0 pointer-events-none bg-blue-900/10 backdrop-blur-2xs border border-blue-500/20" />
            )}
            {weather === 'Scorching Drought' && (
              <div className="absolute inset-0 pointer-events-none bg-amber-900/10" />
            )}

            {/* Grid Container */}
            <div
              className="grid gap-1 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((row, y) =>
                row.map((tile, x) => {
                  const isTargeted = targetedTiles.some((t) => t.x === x && t.y === y);
                  const entityHere = entities.find((e) => {
                    for (let bx = 0; bx < e.size; bx++) {
                      for (let by = 0; by < e.size; by++) {
                        if (e.x + bx === x && e.y + by === y && e.character.currentHp > 0) return true;
                      }
                    }
                    return false;
                  });

                  // Tile visual backgrounds
                  let tileBg = 'bg-slate-800/60 border-slate-700/60';
                  let iconElement: React.ReactNode = null;

                  if (tile.terrain === 'water') {
                    tileBg = tile.isElectrified
                      ? 'bg-cyan-600/60 border-yellow-400 animate-pulse'
                      : 'bg-blue-900/70 border-blue-700/60';
                    iconElement = <Droplets className="w-3.5 h-3.5 text-cyan-300 opacity-60" />;
                  } else if (tile.terrain === 'wooden_house') {
                    tileBg = 'bg-amber-950 border-amber-800';
                    iconElement = (
                      <div className="text-[9px] font-bold text-amber-200 uppercase tracking-tighter">
                        House {tile.hp}HP
                      </div>
                    );
                  } else if (tile.terrain === 'charred_ruins') {
                    tileBg = 'bg-neutral-900 border-neutral-700';
                    iconElement = <Flame className="w-3 h-3 text-orange-500 opacity-50" />;
                  } else if (tile.terrain === 'tree') {
                    tileBg = 'bg-emerald-950/80 border-emerald-800/60';
                    iconElement = (
                      <div className="text-[9px] text-emerald-400 font-medium">Tree +2AC</div>
                    );
                  } else if (tile.terrain === 'earth_wall') {
                    tileBg = 'bg-stone-800 border-stone-600';
                    iconElement = (
                      <div className="text-[9px] text-amber-400 font-bold">Wall {tile.hp}HP</div>
                    );
                  } else if (tile.terrain === 'fire_blaze') {
                    tileBg = 'bg-orange-950 border-orange-600 animate-pulse';
                    iconElement = <Flame className="w-3.5 h-3.5 text-orange-400" />;
                  } else if (tile.terrain === 'stone_precipice') {
                    tileBg = 'bg-stone-900 border-amber-600/70 shadow-inner';
                    iconElement = (
                      <div className="flex flex-col items-center">
                        <Mountain className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[8px] text-amber-300 font-bold tracking-tight">Cliff +2</span>
                      </div>
                    );
                  } else if (tile.terrain === 'explosive_tag') {
                    tileBg = 'bg-red-950/80 border-red-800';
                    iconElement = <span className="text-[9px] text-red-400 font-mono">TAG</span>;
                  }

                  return (
                    <div
                      key={`${x}_${y}`}
                      onClick={() => handleTileClick(x, y)}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition select-none ${tileBg} ${
                        isTargeted ? 'ring-2 ring-red-500 bg-red-950/50 scale-95' : 'hover:border-cyan-400/80'
                      }`}
                    >
                      {/* Tile coordinates */}
                      <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-500">
                        {x},{y}
                      </span>

                      {/* Terrain Decor */}
                      {iconElement && !entityHere && <div className="pointer-events-none">{iconElement}</div>}

                      {/* 2D Sprite Entity Rendered on Tile */}
                      {entityHere && (
                        <div className="relative z-10 flex flex-col items-center">
                          {/* Mini HP & Name Bar */}
                          <div className="absolute -top-3 w-14 bg-slate-950/90 rounded-sm px-1 py-0.2 border border-slate-700 flex flex-col items-center">
                            <span className="text-[8px] truncate text-white font-medium">
                              {entityHere.isBossTitan ? 'TITAN' : entityHere.name.slice(0, 7)}
                            </span>
                            <div className="w-full h-1 bg-slate-800 rounded-xs overflow-hidden mt-0.5">
                              <div
                                className={`h-full ${
                                  entityHere.isPlayer ? 'bg-cyan-400' : 'bg-rose-500'
                                }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    (entityHere.character.currentHp / entityHere.character.maxHp) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <ShinobiSpriteCanvas
                            character={entityHere.character}
                            stance={entityHere.spriteState}
                            castStyle={entityHere.castStyle}
                            size={entityHere.isBossTitan ? 84 : 52}
                            isEnhanced={entityHere.conditions.includes('ChakraSurge')}
                            showAura={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Victory / Defeat Overlay Banner */}
            {battleState !== 'ongoing' && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                {battleState === 'victory' ? (
                  <>
                    <Sparkles className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
                    <h3 className="text-3xl font-extrabold text-amber-400 tracking-wide mb-1">
                      SHINOBI VICTORY!
                    </h3>
                    <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                      You have bested your foes through tactical elemental mastery, environmental positioning, and supreme jutsu execution.
                    </p>
                    <button
                      type="button"
                      onClick={initBattlefield}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900 transition hover:scale-105"
                    >
                      Battle Again
                    </button>
                  </>
                ) : (
                  <>
                    <Skull className="w-16 h-16 text-rose-500 mb-2" />
                    <h3 className="text-3xl font-extrabold text-rose-500 tracking-wide mb-1">DEFEAT</h3>
                    <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                      Your chakra was exhausted and your defenses were breached. Rest and recalibrate your jutsu loadout.
                    </p>
                    <button
                      type="button"
                      onClick={initBattlefield}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    >
                      Retry Encounter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* COMBAT ACTIONS BAR & 5-SLOT JUTSU DECK */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Tactical Actions:</span>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playChakraSurge();
                    setIsEnhancedCast(!isEnhancedCast);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1.5 ${
                    isEnhancedCast
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Jutsu Enhancement Mode: {isEnhancedCast ? 'ACTIVE (+Extra Dice / Aura)' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Move Remaining: <strong className="text-white">{currentEntity?.movementRemaining ?? 0} tiles</strong>
                </span>
                <button
                  type="button"
                  disabled={!isPlayerTurn || battleState !== 'ongoing'}
                  onClick={handleEndTurn}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800/60 transition disabled:opacity-50"
                >
                  End Turn
                </button>
              </div>
            </div>

            {/* 5 Jutsu Slots Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                { label: 'Slot 1: Utility', id: playerCharacter.selectedJutsus.slot1Utility, icon: Shield },
                { label: 'Slot 2: Elemental A', id: playerCharacter.selectedJutsus.slot2Elemental, icon: Flame },
                { label: 'Slot 3: Elemental B', id: playerCharacter.selectedJutsus.slot3Elemental, icon: Wind },
                { label: 'Slot 4: Clan Secret', id: playerCharacter.selectedJutsus.slot4Clan, icon: Swords },
                { label: 'Slot 5: Ultimate S-Rank', id: playerCharacter.selectedJutsus.slot5Ultimate, icon: Zap },
              ].map((slot) => {
                const jutsu = JUTSUS_DATA.find((j) => j.id === slot.id);
                if (!jutsu) return null;
                const isSelected = selectedJutsu?.id === jutsu.id;
                const effectiveChakra = jutsu.chakraCost + (isEnhancedCast ? jutsu.enhancementChakraCost : 0);
                const canAfford = (currentEntity?.character?.currentChakra ?? 0) >= effectiveChakra;
                const Icon = slot.icon;

                return (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={!isPlayerTurn || !canAfford || battleState !== 'ongoing'}
                    onClick={() => handleSelectJutsu(jutsu)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/50 scale-102'
                        : canAfford
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        : 'bg-slate-950/30 border-slate-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span className="truncate">{slot.label}</span>
                        <span className="font-bold text-cyan-400">{effectiveChakra} Chk</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <Icon className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{jutsu.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {jutsu.damageDice ? `${jutsu.damageDice} ${jutsu.damageType}` : 'Barrier / Utility'}
                      </div>
                    </div>

                    <div className="mt-2 text-[9px] uppercase font-mono tracking-wider text-amber-400/80">
                      Rank {jutsu.rank} · Range {jutsu.range}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: COMBAT STATUS & D&D 5E AUDIT LOG */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Shinobi Status Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-base font-bold text-white">{currentEntity.name}</h3>
                <div className="text-xs text-slate-400">
                  {currentEntity.character.clan} Clan · {currentEntity.character.shinobiClass}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-800 text-amber-300 font-mono border border-slate-700">
                  AC {currentEntity.character.armorClass}
                </span>
              </div>
            </div>

            {/* Tactical 3/4 Sprite Portrait */}
            <div className="flex items-center justify-center p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <ShinobiSpriteCanvas
                character={currentEntity.character}
                stance={currentEntity.spriteState}
                castStyle={currentEntity.castStyle}
                size={112}
                isEnhanced={currentEntity.conditions.includes('ChakraSurge')}
                showAura={true}
              />
            </div>

            {/* HP Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Hit Points (HP)
                </span>
                <span className="font-mono text-white">
                  {currentEntity.character.currentHp} / {currentEntity.character.maxHp}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      (currentEntity.character.currentHp / currentEntity.character.maxHp) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Chakra Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-cyan-400 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Chakra Reserves
                </span>
                <span className="font-mono text-white">
                  {currentEntity.character.currentChakra} / {currentEntity.character.maxChakra}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      (currentEntity.character.currentChakra / currentEntity.character.maxChakra) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Environmental Rules Guide */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                Interactive Surroundings
              </div>
              <div>• <strong className="text-white">Fireball</strong> burns wooden houses into charred ruins & spreads flame!</div>
              <div>• <strong className="text-white">Earth Wall</strong> erects 30HP destructible barricade (+5 AC Cover).</div>
              <div>• <strong className="text-white">Wind Blade</strong> cleaves through dense trees into clear paths.</div>
              <div>• <strong className="text-white">Lightning</strong> shocks water bodies, electrifying swimming foes.</div>
            </div>
          </div>

          {/* D&D 5e Combat Roll & Event Log */}
          <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col shadow-lg overflow-hidden min-h-[320px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Shinobi 5e Combat Log
              </span>
              <span className="text-[10px] font-mono text-slate-500">Live Rolls & Saves</span>
            </div>

            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs max-h-[380px]"
            >
              {combatLogs.map((log) => {
                let textStyle = 'text-slate-300';
                if (log.type === 'damage') textStyle = 'text-rose-400';
                if (log.type === 'crit') textStyle = 'text-amber-400 font-bold';
                if (log.type === 'environmental') textStyle = 'text-emerald-400';
                if (log.type === 'defeat') textStyle = 'text-red-500 font-bold';

                return (
                  <div key={log.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                    <span className="text-slate-500 text-[10px]">R{log.round} · </span>
                    <span className={textStyle}>{log.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* D&D 5e DICE ROLLER MODAL */}
      <DiceRollModal
        isOpen={diceModalOpen}
        rollResult={currentDiceRoll}
        onClose={() => setDiceModalOpen(false)}
      />
    </div>
  );
};
