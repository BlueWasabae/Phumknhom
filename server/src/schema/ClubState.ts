import { MapSchema, Schema, type } from '@colyseus/schema';

export class ClubPlayer extends Schema {
  @type('string') sessionId: string = '';
  @type('string') playerId: string = '';
  @type('string') name: string = 'Guest';
  @type('number') x: number = 420;
  @type('number') y: number = 360;
  @type('string') facing: string = 'down';
  @type('boolean') isMoving: boolean = false;
  @type('string') appearanceJson: string = '{}';
}

export class ClubState extends Schema {
  @type('string') cityServer: string = 'phnom_penh';
  @type({ map: ClubPlayer }) players = new MapSchema<ClubPlayer>();
  @type('string') tienLenLastPlay: string = 'Table Ready — Tap to Deal!';
  @type('string') tienLenWinner: string = '';
  @type('number') tienLenPot: number = 100;
  @type('string') oukLastMove: string = 'Khmer Chess Board Ready';
  @type('number') oukTurnCount: number = 0;
}
