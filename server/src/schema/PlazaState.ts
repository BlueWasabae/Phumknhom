import { MapSchema, Schema, type } from '@colyseus/schema';

export class RemotePlayer extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = 'PhumHero';
  @type('number') x: number = 480;
  @type('number') y: number = 405;
  @type('string') facing: string = 'down';
  @type('boolean') isMoving: boolean = false;
  @type('string') appearanceJson: string = '{}';
  @type('string') areaId: string = 'AREA 0';
}

export class PlazaState extends Schema {
  @type('string') areaId: string = 'AREA 0';
  @type({ map: RemotePlayer }) players = new MapSchema<RemotePlayer>();
}
