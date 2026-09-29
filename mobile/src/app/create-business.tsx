import { router } from 'expo-router';
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
import { useAuth, type CreateBusinessInput } from '../context/AuthContext';
import { authFormStyles as s } from '../styles/authForm';

const initialForm: CreateBusinessInput = {
  business_name: '',
  business_email: '',
  address: '',
  contact_number: '',
};

export default function CreateBusinessScreen() {
  const { user, createBusiness, logout } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof CreateBusinessInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createBusiness(form);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not create your business.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid =
    form.business_name.trim() &&
    form.business_email.trim() &&
    form.address.trim() &&
    form.contact_number.trim();

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.form}>
        <Text style={s.eyebrow}>One last step</Text>
        <Text style={s.title}>Create your business</Text>
        <Text style={s.subtitle}>
          Welcome, {user?.full_name?.split(' ')[0] || 'there'}. Set up your workspace to start
          scanning shelves.
        </Text>

        <TextInput
          style={s.input}
          placeholder="Business name"
          placeholderTextColor="#9ca3af"
          maxLength={150}
          value={form.business_name}
          onChangeText={(value) => updateField('business_name', value)}
        />
        <TextInput
          style={s.input}
          placeholder="Business email"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.business_email}
          onChangeText={(value) => updateField('business_email', value)}
        />
        <TextInput
          style={s.input}
          placeholder="Business address"
          placeholderTextColor="#9ca3af"
          value={form.address}
          onChangeText={(value) => updateField('address', value)}
        />
        <TextInput
          style={s.input}
          placeholder="Contact number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          maxLength={20}
          value={form.contact_number}
          onChangeText={(value) => updateField('contact_number', value)}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable
          style={[s.button, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Create business and continue</Text>
          )}
        </Pressable>

        <Pressable onPress={() => logout()}>
          <Text style={s.footerText}>Sign out</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
