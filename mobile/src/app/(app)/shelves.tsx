import { useCallback, useEffect, useState } from 'react';
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
import {
  createShelf,
  deleteShelf,
  getShelves,
  SHELF_CATEGORIES,
  updateShelf,
  type Shelf,
} from '../../lib/shelf';

export default function ShelvesScreen() {
  const { user } = useAuth();
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
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shelves</Text>
        <Pressable style={styles.addButton} onPress={openCreateForm}>
          <Text style={styles.addButtonText}>+ Add shelf</Text>
        </Pressable>
      </View>

      {isFormOpen ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editingShelf ? 'Edit shelf' : 'New shelf'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Shelf name"
            placeholderTextColor="#9ca3af"
            value={formName}
            onChangeText={setFormName}
          />
          <View style={styles.categoryRow}>
            {SHELF_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.categoryChip, formCategory === category && styles.categoryChipActive]}
                onPress={() => setFormCategory(category)}
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
            <Pressable style={styles.cancelButton} onPress={closeForm} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving || !formName.trim()}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
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
              <Pressable onPress={() => openEditForm(item)}>
                <Text style={styles.rowActionEdit}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)}>
                <Text style={styles.rowActionDelete}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  form: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowInfo: {
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 14,
  },
  rowActionEdit: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  rowActionDelete: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
});
