import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  createShelf,
  deleteShelf,
  getShelves,
  SHELF_CATEGORIES,
  updateShelf,
  type Shelf,
} from '../../lib/shelf';
import { card, fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

export default function ShelvesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const businessId = user?.businessId ?? null;

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>(SHELF_CATEGORIES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoadError(null);
    try {
      const data = await getShelves(businessId);
      setShelves(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load shelves');
    }
  }, [businessId]);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function openCreateForm() {
    setEditingShelf(null);
    setFormName('');
    setFormCategory(SHELF_CATEGORIES[0]);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(shelf: Shelf) {
    setEditingShelf(shelf);
    setFormName(shelf.name);
    setFormCategory(shelf.category);
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingShelf(null);
  }

  async function handleSave() {
    if (!businessId || isSaving) return;
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingShelf) {
        const updated = await updateShelf(editingShelf.id, formName.trim(), formCategory);
        setShelves((current) => current.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createShelf(businessId, formName.trim(), formCategory);
        setShelves((current) => [...current, created]);
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save shelf');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(shelf: Shelf) {
    Alert.alert('Delete shelf', `Remove "${shelf.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShelf(shelf.id);
            setShelves((current) => current.filter((s) => s.id !== shelf.id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete shelf');
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shelves</Text>
        <Pressable style={styles.addButton} onPress={openCreateForm} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
          <Text style={styles.addButtonText}>+ Add shelf</Text>
        </Pressable>
      </View>

      {isFormOpen ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editingShelf ? 'Edit shelf' : 'New shelf'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Shelf name"
            placeholderTextColor={colors.textMuted}
            value={formName}
            onChangeText={setFormName}
          />
          <View style={styles.categoryRow}>
            {SHELF_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.categoryChip, formCategory === category && styles.categoryChipActive]}
                onPress={() => setFormCategory(category)}
                android_ripple={ripple}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    formCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <View style={styles.formActions}>
            <Pressable style={styles.cancelButton} onPress={closeForm} disabled={isSaving} android_ripple={ripple}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving || !formName.trim()}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.saveButtonText}>{editingShelf ? 'Save changes' : 'Create shelf'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <FlatList
        data={shelves}
        keyExtractor={(item) => item.id}
        contentContainerStyle={shelves.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No shelves yet. Add one to start scanning.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowCategory}>{item.category}</Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => openEditForm(item)} hitSlop={8}>
                <Text style={styles.rowActionEdit}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Text style={styles.rowActionDelete}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    addButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      overflow: 'hidden',
    },
    addButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
      fontSize: 13,
    },
    form: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.sm,
      ...card(colors),
    },
    formTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    categoryChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surface,
    },
    categoryChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    categoryChipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryChipTextActive: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      overflow: 'hidden',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    list: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 24,
      gap: spacing.sm,
    },
    emptyList: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontFamily: fonts.body,
      color: colors.textMuted,
      fontSize: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radius.md,
      ...card(colors),
    },
    rowInfo: {
      gap: 2,
    },
    rowName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    rowCategory: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    rowActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    rowActionEdit: {
      fontFamily: fonts.bodySemiBold,
      color: colors.info,
      fontSize: 13,
    },
    rowActionDelete: {
      fontFamily: fonts.bodySemiBold,
      color: colors.danger,
      fontSize: 13,
    },
  });
