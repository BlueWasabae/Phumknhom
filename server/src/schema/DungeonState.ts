import { MapSchema, Schema, type } from '@colyseus/schema';

export class DungeonPlayer extends Schema {
  @type('string') sessionId: string = '';
  @type('string') playerId: string = '';
  @type('string') name: string = 'PhumHero';
  @type('number') x: number = 280;
  @type('number') y: number = 574;
  @type('string') facing: string = 'right';
  @type('string') pose: string = 'idle';
  @type('number') hp: number = 150;
  @type('number') maxHp: number = 150;
  @type('string') appearanceJson: string = '{}';
  @type('string') activeClass: string = 'lbokator';
}

export class DungeonBossState extends Schema {
  @type('string') bossId: string = 'sdech_kongkaeb';
  @type('string') difficulty: string = 'normal';
  @type('number') hp: number = 4500;
  @type('number') maxHp: number = 4500;
  @type('number') baseSoloHp: number = 4500;
  @type('number') phase: number = 1;
  @type('string') stage: string = 'idle';
  @type('number') x: number = 1360;
  @type('number') y: number = 620;
  @type('boolean') alive: boolean = true;
  @type('string') lastTelegraphTag: string = '';
}

export class DungeonState extends Schema {
  @type('string') partyId: string = 'coop_default';
  @type('string') bossId: string = 'sdech_kongkaeb';
  @type('string') difficulty: string = 'normal';
  @type('number') partySize: number = 1;
  @type(DungeonBossState) boss = new DungeonBossState();
  @type({ map: DungeonPlayer }) players = new MapSchema<DungeonPlayer>();
}
