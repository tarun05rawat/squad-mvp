/**
 * Calculate the winner from a list of event options.
 * Returns the option with the highest vote_count.
 * In case of a tie, returns the first option found with the max votes.
 */
export function calculateWinner(options) {
  if (!options || options.length === 0) return null;

  return options.reduce((winner, option) => {
    if (!winner || option.vote_count > winner.vote_count) {
      return option;
    }
    return winner;
  }, null);
}

/**
 * Check if a user has already voted on a specific option.
 */
export function hasUserVoted(votes, userId, optionId) {
  return votes.some(vote => vote.user_id === userId && vote.option_id === optionId);
}

/**
 * Check if voting has closed for an event.
 */
export function isVotingClosed(votingClosesAt) {
  if (!votingClosesAt) return false;
  return new Date(votingClosesAt) <= new Date();
}

/**
 * Calculate vote percentages for display.
 */
export function calculatePercentages(options) {
  const totalVotes = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
  if (totalVotes === 0) return options.map(o => ({ ...o, percentage: 0 }));

  return options.map(o => ({
    ...o,
    percentage: Math.round(((o.vote_count || 0) / totalVotes) * 100),
  }));
}
