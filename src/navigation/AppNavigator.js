import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Main screens
import SquadListScreen from '../screens/squads/SquadListScreen';
import SquadDetailScreen from '../screens/squads/SquadDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Event screens
import CreateEventScreen from '../screens/events/CreateEventScreen';
import SwipeVotingScreen from '../screens/events/SwipeVotingScreen';
import EventResultScreen from '../screens/events/EventResultScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function SquadsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SquadList"
        component={SquadListScreen}
        options={{ title: 'My Squads' }}
      />
      <Stack.Screen
        name="SquadDetail"
        component={SquadDetailScreen}
        options={({ route }) => ({ title: route.params.squadName })}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'New Event' }}
      />
      <Stack.Screen
        name="SwipeVoting"
        component={SwipeVotingScreen}
        options={({ route }) => ({ title: 'Vote' })}
      />
      <Stack.Screen
        name="EventResult"
        component={EventResultScreen}
        options={{ title: 'Results' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Squads"
        component={SquadsStack}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
