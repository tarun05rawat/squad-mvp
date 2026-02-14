import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateEventScreen from '../src/screens/events/CreateEventScreen';

// Mock supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'event-1' },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const mockNavigation = { goBack: jest.fn() };
const mockRoute = { params: { squadId: 'squad-1' } };

describe('CreateEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form fields', () => {
    const { getByPlaceholderText, getByText } = render(
      <CreateEventScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('e.g., Friday night dinner')).toBeTruthy();
    expect(getByPlaceholderText('Any details...')).toBeTruthy();
    expect(getByPlaceholderText('Option 1')).toBeTruthy();
    expect(getByPlaceholderText('Option 2')).toBeTruthy();
    expect(getByText('Start Voting')).toBeTruthy();
  });

  it('starts with 2 option inputs', () => {
    const { getByPlaceholderText, queryByPlaceholderText } = render(
      <CreateEventScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Option 1')).toBeTruthy();
    expect(getByPlaceholderText('Option 2')).toBeTruthy();
    expect(queryByPlaceholderText('Option 3')).toBeNull();
  });

  it('can add an option', () => {
    const { getByText, getByPlaceholderText } = render(
      <CreateEventScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.press(getByText('+ Add Option'));
    expect(getByPlaceholderText('Option 3')).toBeTruthy();
  });

  it('allows typing in title and options', () => {
    const { getByPlaceholderText } = render(
      <CreateEventScreen route={mockRoute} navigation={mockNavigation} />
    );

    const titleInput = getByPlaceholderText('e.g., Friday night dinner');
    fireEvent.changeText(titleInput, 'Movie Night');
    expect(titleInput.props.value).toBe('Movie Night');

    const option1 = getByPlaceholderText('Option 1');
    fireEvent.changeText(option1, 'Action movie');
    expect(option1.props.value).toBe('Action movie');
  });
});
