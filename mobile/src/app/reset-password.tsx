import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../lib/api';
import { makeAuthFormStyles } from '../styles/authForm';

// The reset link emailed to the user carries the token as a URL query param
// on the web app. Deep-linking that straight into the mobile app needs
// server-side app-association config, so for now the user pastes the token
// from the email link into this field.
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeAuthFormStyles(colors), [colors]);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), password }),
      });
      setMessage(result.data?.message || 'Password reset successfully');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.form}>
        <Text style={s.eyebrow}>Account recovery</Text>
        <Text style={s.title}>Reset password</Text>
        <Text style={s.subtitle}>
          Paste the token from your reset email link, then choose a new password.
        </Text>

        <TextInput
          style={s.input}
          placeholder="Reset token"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />
        <TextInput
          style={s.input}
          placeholder="New password (min 6 characters)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}
        {message ? <Text style={s.success}>{message}</Text> : null}

        <Pressable
          style={[s.button, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !token || password.length < 6}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isSubmitting ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.buttonText}>Reset password</Text>}
        </Pressable>

        <Text style={s.footerText}>
          Need a new link?{' '}
          <Link href="/forgot-password" style={s.link}>
            Request one
          </Link>
        </Text>
      </View>
    </View>
  );
}
