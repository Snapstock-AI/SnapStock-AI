import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authFormStyles as s } from '../styles/authForm';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
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
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.form}>
        <Text style={s.eyebrow}>Get started</Text>
        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Start monitoring inventory and freshness for your storefront.</Text>

        <TextInput
          style={s.input}
          placeholder="Full name"
          placeholderTextColor="#9ca3af"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#9ca3af"
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
          disabled={isSubmitting || !fullName || !email || password.length < 6}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create account</Text>}
        </Pressable>

        <Text style={s.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={s.link}>
            Sign in
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
