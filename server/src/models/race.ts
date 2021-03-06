import db from '../prismaClient';
import { NotFoundError } from '../errors/notFoundError';

// Handles requests for race info: FR12

export const getRace = async (raceId: any) => {
  const intRaceId = parseInt(raceId, 10);
  const race = await db.race.findUnique({
    where: { id: intRaceId },
    include: {
      Results: {
        select: {
          wpm: true, rank: true, userId: true, User: { select: { username: true } },
        },
        orderBy: { rank: 'asc' },
      },
      Passage: {
        select: {
          text: true,
        },
      },
    },
  });

  if (!race) throw new NotFoundError('error');
  return race;
};

export const createRace = async (passageId:number) => {
  const race = await db.race.create({ data: { passageId } });
  return race;
};
