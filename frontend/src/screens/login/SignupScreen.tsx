import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  User, 
  Building2, 
  Phone,
  ArrowLeft 
} from 'lucide-react-native';
import api from '../../services/api';

const { width, height } = Dimensions.get('window');

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required'),
  organizationName: z.string().min(2, 'Organization name is required'),
  phoneNumber: z.string().length(10, 'Phone number must be 10 digits').regex(/^\d+$/, 'Only digits allowed'),
});

type SignupFormData = {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  phoneNumber: string;
};

const GoogleIcon = () => (
  <View style={{ marginRight: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>G</Text>
  </View>
);

const MicrosoftIcon = () => (
  <View style={{ marginRight: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f25022' }}>M</Text>
  </View>
);

export default function SignupScreen() {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      organizationName: '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', data);
      Alert.alert(
        'Success',
        'Account created successfully! Please log in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsSocialLoading(true);
    try {
      // Implement proper social login for mobile
      // This is still a mock flow because real social login requires native setup
      const mockData = {
        email: `demo_${provider}_new@example.com`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        provider: provider
      };
      
      const response = await api.post<any>('/auth/social-login', mockData);
      const { accessToken, refreshToken, user } = response.data.data;
      
      // Store tokens
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      Alert.alert('Success', `Authenticated with ${user.provider}!`);
      
      // Navigate to onboarding
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' as never }],
      });
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Social login failed';
      Alert.alert('Error', message);
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={20} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', fontWeight: '700', fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Header Section */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              Join CalTIMS
            </Text>
            <View style={{ width: 64, height: 8, backgroundColor: '#3b82f6', borderRadius: 4 }} />
          </View>

          {/* Social Login Buttons */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => handleSocialLogin('google')}
                disabled={isSocialLoading}
                activeOpacity={0.7}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 2,
                  borderColor: '#e2e8f0',
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                  opacity: isSocialLoading ? 0.5 : 1,
                }}
              >
                <GoogleIcon />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSocialLogin('microsoft')}
                disabled={isSocialLoading}
                activeOpacity={0.7}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 2,
                  borderColor: '#e2e8f0',
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                  opacity: isSocialLoading ? 0.5 : 1,
                }}
              >
                <MicrosoftIcon />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 2 }}>
              OR CREATE A WORK ACCOUNT
            </Text>
          </View>

          {/* Signup Form */}
          <View style={{ gap: 20 }}>
            {/* Full Name Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                FULL NAME
              </Text>
              <View style={{ position: 'relative' }}>
                <User
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                />
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="John Doe"
                      placeholderTextColor="#94a3b8"
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.name ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: 16,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
              </View>
              {errors.name && (
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                  {errors.name.message}
                </Text>
              )}
            </View>

            {/* Organization Name & Phone Number Row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                  ORGANIZATION
                </Text>
                <View style={{ position: 'relative' }}>
                  <Building2
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                  />
                  <Controller
                    control={control}
                    name="organizationName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="Company"
                        placeholderTextColor="#94a3b8"
                        style={{
                          height: 56,
                          backgroundColor: '#f1f5f9',
                          borderWidth: 1,
                          borderColor: errors.organizationName ? '#ef4444' : '#e2e8f0',
                          borderRadius: 16,
                          paddingLeft: 48,
                          paddingRight: 16,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0f172a',
                        }}
                      />
                    )}
                  />
                </View>
                {errors.organizationName && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                    {errors.organizationName.message}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                  PHONE
                </Text>
                <View style={{ position: 'relative' }}>
                  <Phone
                    size={18}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                  />
                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          // Only allow digits
                          const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                          onChange(cleaned);
                        }}
                        value={value}
                        placeholder="1234567890"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={{
                          height: 56,
                          backgroundColor: '#f1f5f9',
                          borderWidth: 1,
                          borderColor: errors.phoneNumber ? '#ef4444' : '#e2e8f0',
                          borderRadius: 16,
                          paddingLeft: 48,
                          paddingRight: 16,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0f172a',
                        }}
                      />
                    )}
                  />
                </View>
                {errors.phoneNumber && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                    {errors.phoneNumber.message}
                  </Text>
                )}
              </View>
            </View>

            {/* Email Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                WORK EMAIL
              </Text>
              <View style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.email ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: 16,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
              </View>
              {errors.email && (
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password Field */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>
                PASSWORD
              </Text>
              <View style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }}
                />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      style={{
                        height: 56,
                        backgroundColor: '#f1f5f9',
                        borderWidth: 1,
                        borderColor: errors.password ? '#ef4444' : '#e2e8f0',
                        borderRadius: 16,
                        paddingLeft: 48,
                        paddingRight: 48,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, top: 18 }}
                >
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 8 }}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.9}
              style={{ marginTop: 16 }}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 56,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 1, marginRight: 8 }}>
                      Create Account
                    </Text>
                    <ChevronRight size={20} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b' }}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#3b82f6' }}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}