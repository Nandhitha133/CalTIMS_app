import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

// Auth hook using actual API
const useAuth = () => {
  const loginWithToken = async (token: string, refreshToken: string) => {
    // Store tokens
    await AsyncStorage.setItem('accessToken', token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    
    try {
      // Get actual user data from API
      const response = await api.get<any>('/users/me');
      const user = response.data.data;
      
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  };
  
  return { loginWithToken };
};

export default function OAuthSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    // Get tokens from route params (passed from deep linking or webview)
    const { token, refreshToken } = route.params as { token?: string; refreshToken?: string } || {};

    if (token && refreshToken) {
      handleSuccess(token, refreshToken);
    } else {
      Alert.alert(
        'Authentication Failed',
        'Authentication failed. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    }
  }, []);

  const handleSuccess = async (token: string, refreshToken: string) => {
    try {
      // Save tokens and get user data
      const user = await loginWithToken(token, refreshToken);
      
      Alert.alert('Success', 'Successfully logged in with Google!');
      
      // Navigate based on onboarding status
      if (!user.isOnboardingComplete) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' as never }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' as never }],
        });
      }
    } catch (error) {
      console.error('OAuth Success Handler Error:', error);
      Alert.alert(
        'Error',
        'Failed to complete login. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f8fafc',
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ 
          fontSize: 16, 
          color: '#64748b',
          fontWeight: '500',
        }}>
          Completing secure login...
        </Text>
      </View>
    </View>
  );
}