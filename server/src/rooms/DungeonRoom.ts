import { Client, Room } from 'colyseus';
import { DungeonPlayer, DungeonState } from '../schema/DungeonState';

const BOSS_SOLO_HP: Record<string, number> = {
  sdech_kongkaeb: 4500,
  yeak_thmor: 18000,
};

const DIFFICULTY_MULT: Record<string, number> = {
  normal: 1.0,
  expert: 1.5,
  calamity: 1.9,
  death: 2.3,
};

/**
 * Exact Co-op Boss HP Scaling Formula from docs/GDD_SYSTEMS_SKILLS_AND_BALANCE.md §4.4:
 * BossHP_party = BossHP_solo * (1 + 0.65 * (PartySize - 1)) * M_diff
 */
function calculateCoopBossHp(soloHp: number, partySize: number, difficulty: string): number {
  const clampedParty = Math.max(1, Math.min(4, Math.floor(partySize)));
  const mDiff = DIFFICULTY_MULT[difficulty] ?? 1.0;
  return Math.round(soloHp * (1 + 0.65 * (clampedParty - 1)) * mDiff);
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

export class DungeonRoom extends Room<DungeonState> {
  maxClients = 4;
  private hostSessionId = '';

  onCreate(options: { partyId?: string; bossId?: string; difficulty?: string }): void {
    const partyId = typeof options?.partyId === 'string' && options.partyId.trim()
      ? options.partyId.trim().slice(0, 64)
      : `coop_${Date.now().toString(36)}`;
    const bossId = options?.bossId === 'yeak_thmor' ? 'yeak_thmor' : 'sdech_kongkaeb';
    const difficulty =
      options?.difficulty === 'expert' ||
      options?.difficulty === 'calamity' ||
      options?.difficulty === 'death'
        ? options.difficulty
        : 'normal';

    const soloHp = BOSS_SOLO_HP[bossId] ?? 4500;
    const scaledHp = calculateCoopBossHp(soloHp, 1, difficulty);

    const state = new DungeonState();
    state.partyId = partyId;
    state.bossId = bossId;
    state.difficulty = difficulty;
    state.partySize = 1;
    state.boss.bossId = bossId;
    state.boss.difficulty = difficulty;
    state.boss.baseSoloHp = soloHp;
    state.boss.maxHp = scaledHp;
    state.boss.hp = scaledHp;
    state.boss.phase = 1;
    state.boss.alive = true;

    this.setState(state);
    this.setMetadata({ partyId, bossId, difficulty });

    this.onMessage(
      'move',
      (
        client,
        payload: { x?: number; y?: number; facing?: string; pose?: string; hp?: number; maxHp?: number }
      ) => {
        const p = this.state.players.get(client.sessionId);
        if (!p || !payload || typeof payload !== 'object') return;
        if (typeof payload.x === 'number') p.x = Math.round(clamp(payload.x, 20, 1780) * 10) / 10;
        if (typeof payload.y === 'number') p.y = Math.round(clamp(payload.y, 40, 700) * 10) / 10;
        if (payload.facing === 'left' || payload.facing === 'right') p.facing = payload.facing;
        if (
          payload.pose === 'idle' ||
          payload.pose === 'walk1' ||
          payload.pose === 'walk2' ||
          payload.pose === 'jump' ||
          payload.pose === 'attack'
        ) {
          p.pose = payload.pose;
        }
        if (typeof payload.hp === 'number' && Number.isFinite(payload.hp)) {
          p.hp = Math.max(0, Math.floor(payload.hp));
        }
        if (typeof payload.maxHp === 'number' && Number.isFinite(payload.maxHp)) {
          p.maxHp = Math.max(1, Math.floor(payload.maxHp));
        }
      }
    );

    this.onMessage(
      'updateAppearance',
      (client, payload: { appearanceJson?: string; activeClass?: string; name?: string }) => {
        const p = this.state.players.get(client.sessionId);
        if (!p || !payload || typeof payload !== 'object') return;
        if (typeof payload.appearanceJson === 'string' && payload.appearanceJson.length <= 2048) {
          p.appearanceJson = payload.appearanceJson;
        }
        if (typeof payload.activeClass === 'string') {
          p.activeClass = payload.activeClass.slice(0, 20);
        }
        if (typeof payload.name === 'string' && payload.name.trim()) {
          p.name = payload.name.trim().slice(0, 20);
        }
      }
    );

    this.onMessage(
      'attack',
      (client, payload: { classId?: string; x?: number; y?: number; dir?: number }) => {
        const p = this.state.players.get(client.sessionId);
        if (!p) return;
        this.broadcast(
          'playerAttack',
          {
            sessionId: client.sessionId,
            classId: payload?.classId || p.activeClass,
            x: typeof payload?.x === 'number' ? payload.x : p.x,
            y: typeof payload?.y === 'number' ? payload.y : p.y,
            dir: payload?.dir === -1 ? -1 : 1,
          },
          { except: client }
        );
      }
    );

    this.onMessage('bossDamage', (client, payload: { amount?: number; isCrit?: boolean }) => {
      if (!this.state.boss.alive) return;
      const dmg = Math.max(1, Math.min(6000, Math.round(Number(payload?.amount ?? 0))));
      if (!Number.isFinite(dmg) || dmg <= 0) return;

      this.state.boss.hp = Math.max(0, this.state.boss.hp - dmg);
      if (this.state.boss.phase === 1 && this.state.boss.hp > 0 && this.state.boss.hp <= this.state.boss.maxHp * 0.5) {
        this.state.boss.phase = 2;
      }

      this.broadcast(
        'bossHit',
        {
          fromSessionId: client.sessionId,
          amount: dmg,
          isCrit: Boolean(payload?.isCrit),
          hp: this.state.boss.hp,
          maxHp: this.state.boss.maxHp,
          phase: this.state.boss.phase,
        },
        { except: client }
      );

      if (this.state.boss.hp <= 0) {
        this.state.boss.alive = false;
        this.state.boss.stage = 'defeated';
        // Every player in the room receives their own instanced Boss Treasure Bag!
        this.broadcast('bossDefeated', {
          bossId: this.state.bossId,
          difficulty: this.state.difficulty,
          partySize: this.state.partySize,
        });
      }
    });

    this.onMessage(
      'bossSync',
      (client, payload: { x?: number; y?: number; stage?: string; lastTelegraphTag?: string }) => {
        if (client.sessionId !== this.hostSessionId || !this.state.boss.alive) return;
        if (typeof payload?.x === 'number') this.state.boss.x = Math.round(clamp(payload.x, 120, 1700));
        if (typeof payload?.y === 'number') this.state.boss.y = Math.round(clamp(payload.y, 100, 640));
        if (typeof payload?.stage === 'string') this.state.boss.stage = payload.stage.slice(0, 24);
        if (typeof payload?.lastTelegraphTag === 'string') {
          this.state.boss.lastTelegraphTag = payload.lastTelegraphTag.slice(0, 32);
        }
      }
    );
  }

  private rescaleBossForPartySize(): void {
    const nextSize = Math.max(1, Math.min(4, this.state.players.size));
    const prevMax = Math.max(1, this.state.boss.maxHp);
    const ratio = this.state.boss.hp / prevMax;
    const nextMax = calculateCoopBossHp(this.state.boss.baseSoloHp, nextSize, this.state.difficulty);

    this.state.partySize = nextSize;
    this.state.boss.maxHp = nextMax;
    if (this.state.boss.alive) {
      this.state.boss.hp = Math.max(1, Math.round(nextMax * ratio));
    }
  }

  onJoin(
    client: Client,
    options?: {
      playerId?: string;
      name?: string;
      appearanceJson?: string;
      activeClass?: string;
      hp?: number;
      maxHp?: number;
    }
  ): void {
    const p = new DungeonPlayer();
    p.sessionId = client.sessionId;
    p.playerId = typeof options?.playerId === 'string' ? options.playerId.slice(0, 64) : '';
    p.name = typeof options?.name === 'string' && options.name.trim()
      ? options.name.trim().slice(0, 20)
      : `Raider_${client.sessionId.slice(0, 4)}`;
    p.x = 240 + this.state.players.size * 38;
    p.y = 574;
    p.facing = 'right';
    p.pose = 'idle';
    p.hp = typeof options?.hp === 'number' ? Math.max(1, Math.floor(options.hp)) : 150;
    p.maxHp = typeof options?.maxHp === 'number' ? Math.max(1, Math.floor(options.maxHp)) : 150;
    p.appearanceJson =
      typeof options?.appearanceJson === 'string' && options.appearanceJson.length <= 2048
        ? options.appearanceJson
        : '{}';
    p.activeClass = typeof options?.activeClass === 'string' ? options.activeClass.slice(0, 20) : 'lbokator';

    this.state.players.set(client.sessionId, p);
    if (!this.hostSessionId) {
      this.hostSessionId = client.sessionId;
    }
    this.rescaleBossForPartySize();
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    if (this.hostSessionId === client.sessionId) {
      const firstKey = this.state.players.keys().next().value as string | undefined;
      this.hostSessionId = firstKey ?? '';
    }
    if (this.state.players.size > 0) {
      this.rescaleBossForPartySize();
    }
  }
}
