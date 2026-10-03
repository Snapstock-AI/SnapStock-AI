import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPostAuthRoute } from '../lib/routing';
import { makeAuthFormStyles } from '../styles/authForm';

export default function LoginScreen() {
  const { user, login, isAuthenticated, isHydrating } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeAuthFormStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isHydrating && isAuthenticated) {
    return <Redirect href={getPostAuthRoute(user)} />;
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.scroll} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.brandRow}>
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>S</Text>
          </View>
          <Text style={s.brandTitle}>SnapStock-AI</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your business</Text>

          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.inputFlex}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.inputFlex}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              hitSlop={8}
              style={s.eyeButton}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={[s.button, isSubmitting && s.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !email || !password}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={s.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <Link href="/forgot-password" style={[s.link, { textAlign: 'center' }]}>
            Forgot password?
          </Link>
        </View>

        <Text style={[s.footerText, { marginTop: 0 }]}>
          New here?{' '}
          <Link href="/register" style={s.link}>
            Create an account
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
