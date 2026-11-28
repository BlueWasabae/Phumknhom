import { MapSchema, Schema, type } from '@colyseus/schema';

export class WorldBossPlayer extends Schema {
  @type('string') sessionId: string = '';
  @type('string') playerId: string = '';
  @type('string') name: string = 'PhumHero';
  @type('number') x: number = 320;
  @type('number') y: number = 560;
  @type('string') facing: string = 'right';
  @type('string') pose: string = 'idle';
  @type('number') hp: number = 150;
  @type('number') maxHp: number = 150;
  @type('string') appearanceJson: string = '{}';
  @type('string') activeClass: string = 'lbokator';
  @type('number') damageDealt: number = 0;
  @type('number') joinedAt: number = 0;
}

export class WorldBossEntityState extends Schema {
  @type('string') bossId: string = 'ancient_naga_colossus';
  @type('number') hp: number = 1_200_000;
  @type('number') maxHp: number = 1_200_000;
  @type('boolean') alive: boolean = true;
  @type('boolean') exposedHeartActive: boolean = false;
  @type('number') exposedHeartEndsAt: number = 0;
  @type('string') activeMechanic: string = 'idle'; // 'idle' | 'tidal_wave' | 'venom_rain' | 'exposed_heart'
  @type('number') mechanicSeed: number = 0;
  @type('number') x: number = 960;
  @type('number') y: number = 420;
}

export class WorldBossState extends Schema {
  @type('string') raidId: string = 'colossus_default';
  @type('boolean') active: boolean = true;
  @type('number') startedAt: number = 0;
  @type('number') endsAt: number = 0;
  @type('number') playerCount: number = 0;
  @type(WorldBossEntityState) boss = new WorldBossEntityState();
  @type({ map: WorldBossPlayer }) players = new MapSchema<WorldBossPlayer>();
}
