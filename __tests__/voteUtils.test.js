import { calculateWinner, hasUserVoted, isVotingClosed, calculatePercentages } from '../src/lib/voteUtils';

describe('calculateWinner', () => {
  it('returns null for empty array', () => {
    expect(calculateWinner([])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(calculateWinner(null)).toBeNull();
  });

  it('returns the option with most votes', () => {
    const options = [
      { id: '1', option_name: 'Pizza', vote_count: 3 },
      { id: '2', option_name: 'Sushi', vote_count: 5 },
      { id: '3', option_name: 'Tacos', vote_count: 2 },
    ];
    expect(calculateWinner(options)).toEqual(options[1]);
  });

  it('returns first option in tie scenario', () => {
    const options = [
      { id: '1', option_name: 'Pizza', vote_count: 3 },
      { id: '2', option_name: 'Sushi', vote_count: 3 },
    ];
    expect(calculateWinner(options)).toEqual(options[0]);
  });

  it('handles single option', () => {
    const options = [{ id: '1', option_name: 'Pizza', vote_count: 1 }];
    expect(calculateWinner(options)).toEqual(options[0]);
  });

  it('handles options with zero votes', () => {
    const options = [
      { id: '1', option_name: 'Pizza', vote_count: 0 },
      { id: '2', option_name: 'Sushi', vote_count: 0 },
    ];
    expect(calculateWinner(options).vote_count).toBe(0);
  });
});

describe('hasUserVoted', () => {
  const votes = [
    { user_id: 'u1', option_id: 'o1' },
    { user_id: 'u1', option_id: 'o2' },
    { user_id: 'u2', option_id: 'o1' },
  ];

  it('returns true when user has voted on option', () => {
    expect(hasUserVoted(votes, 'u1', 'o1')).toBe(true);
  });

  it('returns false when user has not voted on option', () => {
    expect(hasUserVoted(votes, 'u2', 'o2')).toBe(false);
  });

  it('returns false for empty votes array', () => {
    expect(hasUserVoted([], 'u1', 'o1')).toBe(false);
  });
});

describe('isVotingClosed', () => {
  it('returns false for null', () => {
    expect(isVotingClosed(null)).toBe(false);
  });

  it('returns true for past date', () => {
    const past = new Date('2020-01-01').toISOString();
    expect(isVotingClosed(past)).toBe(true);
  });

  it('returns false for future date', () => {
    const future = new Date('2030-01-01').toISOString();
    expect(isVotingClosed(future)).toBe(false);
  });
});

describe('calculatePercentages', () => {
  it('returns 0% for all when no votes', () => {
    const options = [
      { id: '1', option_name: 'A', vote_count: 0 },
      { id: '2', option_name: 'B', vote_count: 0 },
    ];
    const result = calculatePercentages(options);
    expect(result[0].percentage).toBe(0);
    expect(result[1].percentage).toBe(0);
  });

  it('calculates correct percentages', () => {
    const options = [
      { id: '1', option_name: 'A', vote_count: 3 },
      { id: '2', option_name: 'B', vote_count: 1 },
    ];
    const result = calculatePercentages(options);
    expect(result[0].percentage).toBe(75);
    expect(result[1].percentage).toBe(25);
  });

  it('handles single option with votes', () => {
    const options = [{ id: '1', option_name: 'A', vote_count: 5 }];
    const result = calculatePercentages(options);
    expect(result[0].percentage).toBe(100);
  });
});
