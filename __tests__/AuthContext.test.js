import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';

// Mock supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('AuthContext', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for session
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    // Default mock for auth state change
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  describe('initial state', () => {
    it('should start with null user and loading true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should load existing session on mount', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('signUp', () => {
    it('should sign up user and insert into users table', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        user_metadata: { full_name: 'New User' },
      };

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const upsertMock = jest.fn().mockResolvedValue({
        error: null,
      });

      supabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'newuser@example.com',
          'password123',
          'New User'
        );
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'New User' },
          emailRedirectTo: undefined,
        },
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(upsertMock).toHaveBeenCalledWith(
        {
          id: 'user-123',
          email: 'newuser@example.com',
          full_name: 'New User',
        },
        { onConflict: 'id' }
      );

      expect(signUpResult.user).toEqual(mockUser);
    });

    it('should handle signup error', async () => {
      const signupError = new Error('Email already exists');
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: signupError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signUp('test@example.com', 'password', 'Test User');
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should not throw if users table insert fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const upsertMock = jest.fn().mockResolvedValue({
        error: { message: 'Table does not exist' },
      });

      supabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw - signup still succeeds
      await act(async () => {
        await result.current.signUp('test@example.com', 'password', 'Test User');
      });

      expect(upsertMock).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should sign in user and upsert to users table', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const upsertMock = jest.fn().mockResolvedValue({
        error: null,
      });

      supabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(upsertMock).toHaveBeenCalledWith(
        {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        { onConflict: 'id' }
      );
    });

    it('should handle user without full_name metadata', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const upsertMock = jest.fn().mockResolvedValue({
        error: null,
      });

      supabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      // Should use email prefix as fallback
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'test',
        }),
        { onConflict: 'id' }
      );
    });

    it('should handle signin error', async () => {
      const signinError = new Error('Invalid credentials');
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: signinError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out user', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle signout error', async () => {
      const signoutError = new Error('Signout failed');
      supabase.auth.signOut.mockResolvedValue({
        error: signoutError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toThrow('Signout failed');
    });
  });

  describe('auth state changes', () => {
    it('should update user when auth state changes', async () => {
      const mockCallback = jest.fn();

      supabase.auth.onAuthStateChange.mockImplementation((callback) => {
        mockCallback.current = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate auth state change
      const newUser = { id: 'user-456', email: 'new@example.com' };
      const newSession = { user: newUser, access_token: 'new-token' };

      act(() => {
        mockCallback.current('SIGNED_IN', newSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(newUser);
        expect(result.current.session).toEqual(newSession);
      });
    });
  });
});
