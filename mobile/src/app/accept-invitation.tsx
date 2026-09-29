import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authFormStyles as s } from '../styles/authForm';

// The invite link emailed to a new teammate carries the token as a URL query
// param on the web app; see reset-password.tsx for why it's pasted in here
// rather than deep-linked.
export default function AcceptInvitationScreen() {
  const { isAuthenticated, acceptInvitation } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={s.container}>
        <View style={s.form}>
          <Text style={s.eyebrow}>Employee invitation</Text>
          <Text style={s.title}>Sign in to accept your invitation</Text>
          <Text style={s.subtitle}>
            Use the email address that received this invitation. If you don&apos;t have an account
            yet, create one with that email, then come back here.
          </Text>
          <Link href="/login" style={s.link}>
            Sign in
          </Link>
          <Link href="/register" style={s.link}>
            Create account
          </Link>
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await acceptInvitation(token.trim());
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <View style={s.container}>
        <View style={s.form}>
          <Text style={s.eyebrow}>Employee invitation</Text>
          <Text style={s.title}>Invitation accepted</Text>
          <Text style={s.subtitle}>You are now part of the business team.</Text>
          <Pressable style={s.button} onPress={() => router.replace('/home')}>
            <Text style={s.buttonText}>Open dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.form}>
        <Text style={s.eyebrow}>Employee invitation</Text>
        <Text style={s.title}>Accept employee invitation</Text>
        <Text style={s.subtitle}>Paste the invitation token from your email link.</Text>

        <TextInput
          style={s.input}
          placeholder="Invitation token"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable
          style={[s.button, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Accept invitation</Text>}
        </Pressable>
      </View>
    </View>
  );
}
