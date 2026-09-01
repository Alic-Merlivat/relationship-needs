export const INITIAL_RATING = 1500;
const K_FACTOR = 64;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function applyEloUpdate(
  winnerRating: number,
  loserRating: number
): { winner: number; loser: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  const winner = winnerRating + K_FACTOR * (1 - expectedWinner);
  const loser = loserRating + K_FACTOR * (0 - expectedLoser);

  return { winner: Math.round(winner), loser: Math.round(loser) };
}
