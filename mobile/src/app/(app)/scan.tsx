import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { analyzeImage, type DetectionResult, type PickedImage, type ScanMode } from '../../lib/detection';
import { getShelves, type Shelf } from '../../lib/shelf';

const SCAN_MODES: { value: ScanMode; label: string }[] = [
  { value: 'STOCK_IN', label: 'Stock in' },
  { value: 'STOCK_OUT', label: 'Stock out' },
];

export default function ScanScreen() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? null;

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('STOCK_IN');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const loadShelves = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await getShelves(businessId);
      setShelves(data);
      setSelectedShelf((current) => current ?? data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shelves');
    }
  }, [businessId]);

  useEffect(() => {
    setIsLoadingShelves(true);
    loadShelves().finally(() => setIsLoadingShelves(false));
  }, [loadShelves]);

  function assetToPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
    return {
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split('/').pop() ?? `scan-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    };
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access to scan a shelf.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!picked.canceled && picked.assets[0]) {
      setResult(null);
      setError(null);
      setImage(assetToPickedImage(picked.assets[0]));
    }
  }

  async function handlePickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo library permission needed', 'Enable photo access to select a shelf image.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!picked.canceled && picked.assets[0]) {
      setResult(null);
      setError(null);
      setImage(assetToPickedImage(picked.assets[0]));
    }
  }

  async function handleAnalyze() {
    if (!image || !selectedShelf || !businessId || isAnalyzing) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(image, selectedShelf, businessId, scanMode);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleScanAnother() {
    setImage(null);
    setResult(null);
    setError(null);
  }

  if (isLoadingShelves) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (shelves.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No shelves yet</Text>
        <Text style={styles.emptyText}>Add a shelf before scanning inventory.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/shelves')}>
          <Text style={styles.primaryButtonText}>Go to Shelves</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan shelf</Text>

      <Text style={styles.label}>Shelf</Text>
      <View style={styles.chipRow}>
        {shelves.map((shelf) => (
          <Pressable
            key={shelf.id}
            style={[styles.chip, selectedShelf?.id === shelf.id && styles.chipActive]}
            onPress={() => setSelectedShelf(shelf)}
          >
            <Text style={[styles.chipText, selectedShelf?.id === shelf.id && styles.chipTextActive]}>
              {shelf.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Mode</Text>
      <View style={styles.chipRow}>
        {SCAN_MODES.map((mode) => (
          <Pressable
            key={mode.value}
            style={[styles.chip, scanMode === mode.value && styles.chipActive]}
            onPress={() => setScanMode(mode.value)}
          >
            <Text style={[styles.chipText, scanMode === mode.value && styles.chipTextActive]}>
              {mode.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} />
      ) : (
        <View style={styles.pickerButtons}>
          <Pressable style={styles.pickerButton} onPress={handleTakePhoto}>
            <Text style={styles.pickerButtonText}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.pickerButton} onPress={handlePickFromGallery}>
            <Text style={styles.pickerButtonText}>Choose from gallery</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {image && !result ? (
        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryButton} onPress={() => setImage(null)} disabled={isAnalyzing}>
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, isAnalyzing && styles.primaryButtonDisabled]}
            onPress={handleAnalyze}
            disabled={isAnalyzing || !selectedShelf}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Analyze</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {isAnalyzing ? (
        <Text style={styles.hint}>Analyzing image — this can take up to 15 seconds…</Text>
      ) : null}

      {result ? <ScanResult result={result} onScanAnother={handleScanAnother} /> : null}
    </ScrollView>
  );
}

function ScanResult({ result, onScanAnother }: { result: DetectionResult; onScanAnother: () => void }) {
  const classEntries = Object.entries(result.counts);

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>Scan complete — {result.total_count} item(s) detected</Text>

      {classEntries.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>By product</Text>
          {classEntries.map(([className, counts]) => (
            <View key={className} style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>{className}</Text>
              <Text style={styles.resultRowValue}>
                {counts.fresh} fresh · {counts.rotten} spoiled · {counts.total} total
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {result.inventoryChanges.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>Inventory updated</Text>
          {result.inventoryChanges.map((change) => (
            <View key={change.productId} style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>{change.product}</Text>
              <Text style={styles.resultRowValue}>
                {change.currentQuantity} → {change.quantity}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {result.detections.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>Detections</Text>
          {result.detections.map((detection, index) => (
            <View key={detection.id ?? index} style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>{detection.class_name}</Text>
              <Text style={styles.resultRowValue}>
                {detection.freshness} · {detection.freshness_confidence_percent}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={onScanAnother}>
        <Text style={styles.primaryButtonText}>Scan another</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  resultSection: {
    gap: 4,
  },
  resultSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  resultRowLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  resultRowValue: {
    fontSize: 13,
    color: '#374151',
  },
});
