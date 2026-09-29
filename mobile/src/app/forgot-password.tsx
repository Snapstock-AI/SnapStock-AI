import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../lib/api';
import { makeAuthFormStyles } from '../styles/authForm';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeAuthFormStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(result.data?.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.form}>
        <Text style={s.eyebrow}>Account recovery</Text>
        <Text style={s.title}>Forgot password</Text>
        <Text style={s.subtitle}>Enter your email and we&apos;ll send a reset link if an account exists.</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}
        {message ? <Text style={s.success}>{message}</Text> : null}

        <Pressable
          style={[s.button, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !email}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isSubmitting ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.buttonText}>Send reset link</Text>}
        </Pressable>

        <Text style={s.footerText}>
          Have a reset token already?{' '}
          <Link href="/reset-password" style={s.link}>
            Reset password
          </Link>
        </Text>
        <Text style={s.footerText}>
          Remembered your password?{' '}
          <Link href="/login" style={s.link}>
            Sign in
          </Link>
        </Text>
      </View>
    </View>
  );
}
