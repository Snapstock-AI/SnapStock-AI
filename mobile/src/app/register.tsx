import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
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
import { makeAuthFormStyles } from '../styles/authForm';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeAuthFormStyles(colors), [colors]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const successMessage = await register(fullName.trim(), email.trim(), password);
      setMessage(successMessage);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
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
          <Text style={s.eyebrow}>Get started</Text>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Start monitoring inventory and freshness for your storefront.</Text>

          <View style={s.inputRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.inputFlex}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

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
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
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
          {message ? <Text style={s.success}>{message}</Text> : null}

          <Pressable
            style={[s.button, isSubmitting && s.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !fullName || !email || password.length < 6}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {isSubmitting ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.buttonText}>Create account</Text>}
          </Pressable>
        </View>

        <Text style={[s.footerText, { marginTop: 0 }]}>
          Already have an account?{' '}
          <Link href="/login" style={s.link}>
            Sign in
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
