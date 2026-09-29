import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../lib/api';
import { authFormStyles as s } from '../styles/authForm';

// See reset-password.tsx for why the token is pasted in rather than deep-linked.
export default function VerifyEmailScreen() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>(
        `/auth/verify-email?token=${encodeURIComponent(token.trim())}`,
      );
      setMessage(result.data?.message || 'Email verified successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.form}>
        <Text style={s.eyebrow}>Email verification</Text>
        <Text style={s.title}>Verify email</Text>
        <Text style={s.subtitle}>Paste the token from your verification email link.</Text>

        <TextInput
          style={s.input}
          placeholder="Verification token"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}
        {message ? <Text style={s.success}>{message}</Text> : null}

        <Pressable
          style={[s.button, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Verify email</Text>}
        </Pressable>

        {message ? (
          <Link href="/login" style={s.link}>
            Continue to sign in
          </Link>
        ) : null}
        {error ? (
          <Text style={s.footerText}>
            Didn&apos;t get a link?{' '}
            <Link href="/resend-verification" style={s.link}>
              Resend verification email
            </Link>
          </Text>
        ) : null}
      </View>
    </View>
  );
}
