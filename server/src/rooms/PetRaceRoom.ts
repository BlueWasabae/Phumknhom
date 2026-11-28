import { Client, Room } from 'colyseus';
import { MapSchema, Schema, type } from '@colyseus/schema';

export class PetRacerSchema extends Schema {
  @type('string') sessionId = '';
  @type('string') ownerName = 'Villager';
  @type('string') petId = 'pet_village_puppy';
  @type('number') petStage = 1;
  @type('number') laneIndex = 0;
  @type('number') distance = 0;
  @type('boolean') hopping = false;
  @type('boolean') boosting = false;
  @type('number') finishedAt = 0;
}

export class PetRaceState extends Schema {
  @type('string') phase = 'racing';
  @type('number') trackLength = 1800;
  @type({ map: PetRacerSchema }) racers = new MapSchema<PetRacerSchema>();
}

/**
 * Update 2.9 — Live Multiplayer Village Pet Racing Room (up to 6 pets).
 * Normalizes stats fairly across Stage 1/2/3 pets while syncing real-time positions,
 * hurdle hops, cheer boosts, and finish placements.
 */
export class PetRaceRoom extends Room<PetRaceState> {
  maxClients = 6;

  onCreate(): void {
    this.setState(new PetRaceState());

    this.onMessage(
      'progress',
      (
        client,
        payload: { distance?: number; hopping?: boolean; boosting?: boolean; finishedAt?: number }
      ) => {
        const racer = this.state.racers.get(client.sessionId);
        if (!racer || !payload) return;
        if (typeof payload.distance === 'number' && Number.isFinite(payload.distance)) {
          racer.distance = Math.max(0, Math.min(this.state.trackLength + 80, payload.distance));
        }
        if (typeof payload.hopping === 'boolean') racer.hopping = payload.hopping;
        if (typeof payload.boosting === 'boolean') racer.boosting = payload.boosting;
        if (typeof payload.finishedAt === 'number' && payload.finishedAt > 0 && racer.finishedAt === 0) {
          racer.finishedAt = payload.finishedAt;
        }
      }
    );
  }

  onJoin(
    client: Client,
    options?: { ownerName?: string; petId?: string; petStage?: number }
  ): void {
    const racer = new PetRacerSchema();
    racer.sessionId = client.sessionId;
    racer.ownerName =
      typeof options?.ownerName === 'string' && options.ownerName.trim()
        ? options.ownerName.trim().slice(0, 20)
        : `Racer_${client.sessionId.slice(0, 4)}`;
    racer.petId = typeof options?.petId === 'string' && options.petId ? options.petId : 'pet_village_puppy';
    racer.petStage = options?.petStage === 3 ? 3 : options?.petStage === 2 ? 2 : 1;
    racer.laneIndex = Math.min(5, this.state.racers.size);
    this.state.racers.set(client.sessionId, racer);
  }

  onLeave(client: Client): void {
    this.state.racers.delete(client.sessionId);
  }
}
