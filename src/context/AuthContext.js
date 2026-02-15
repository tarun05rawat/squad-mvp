import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: undefined, // Email verification enabled
      },
    });
    if (error) throw error;

    // Insert into users table
    if (data.user) {
      const { error: insertError } = await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
      }, {
        onConflict: 'id'
      });

      if (insertError) {
        console.error('Error inserting user into users table:', insertError);
        // Don't throw - user is created in auth, they can still use the app
        // The signIn function will handle inserting their data later
      }
    }
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Upsert user data to users table (for existing users or if signup failed to insert)
    if (data.user) {
      const fullName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';
      await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
      }, {
        onConflict: 'id'
      });
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
