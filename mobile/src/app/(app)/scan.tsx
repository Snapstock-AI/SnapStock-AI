import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import {
  analyzeImage,
  compressForUpload,
  confirmScanInventory,
  formatHistoryDate,
  getScanHistory,
  updateDetectionFreshness,
  type DetectionResult,
  type FreshnessStatus,
  type PickedImage,
  type ScanHistoryItem,
  type ScanMode,
} from '../../lib/detection';
import { getShelves, type Shelf } from '../../lib/shelf';
import { card, fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

const SCAN_MODES: { value: ScanMode; label: string }[] = [
  { value: 'STOCK_IN', label: 'Stock in' },
  { value: 'STOCK_OUT', label: 'Stock out' },
];

// Recent-scans summary on this screen shows only a glance — the full,
// filterable history lives on the dedicated /scan-history screen.
const RECENT_SCANS_LIMIT = 15;
const RECENT_SCANS_WINDOW_DAYS = 90;

export default function ScanScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const businessId = user?.businessId ?? null;

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoadingShelves, setIsLoadingShelves] = useState(true);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('STOCK_IN');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [savingDetectionId, setSavingDetectionId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

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

  const loadRecentScans = useCallback(async () => {
    if (!businessId) return;
    try {
      const since = new Date();
      since.setDate(since.getDate() - RECENT_SCANS_WINDOW_DAYS);
      const data = await getScanHistory(businessId, since.toISOString());
      setRecentScans(data.slice(0, RECENT_SCANS_LIMIT));
    } catch {
      // Non-critical widget — leave it empty rather than surfacing an error banner.
      setRecentScans([]);
    }
  }, [businessId]);

  useEffect(() => {
    setIsLoadingShelves(true);
    loadShelves().finally(() => setIsLoadingShelves(false));
  }, [loadShelves]);

  useEffect(() => {
    setIsLoadingRecent(true);
    loadRecentScans().finally(() => setIsLoadingRecent(false));
  }, [loadRecentScans]);

  async function prepareAndSetImage(asset: ImagePicker.ImagePickerAsset) {
    setResult(null);
    setError(null);
    setIsPreparingImage(true);
    try {
      const prepared = await compressForUpload(asset.uri);
      setImage(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare the image');
    } finally {
      setIsPreparingImage(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access to scan a shelf.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] });
    if (!picked.canceled && picked.assets[0]) {
      await prepareAndSetImage(picked.assets[0]);
    }
  }

  async function handlePickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo library permission needed', 'Enable photo access to select a shelf image.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!picked.canceled && picked.assets[0]) {
      await prepareAndSetImage(picked.assets[0]);
    }
  }

  async function handleAnalyze() {
    if (!image || !selectedShelf || !businessId || isAnalyzing) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(image, selectedShelf, businessId, scanMode);
      // The capture controls disappear once a result exists (see the render
      // below); the photo stays on the result card until "Scan another".
      // Stock is unchanged until the user taps "Add to stock".
      setResult(data);
      loadRecentScans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleFreshnessChange(detectionId: string | undefined, freshness: FreshnessStatus) {
    if (!detectionId || !result || savingDetectionId) return;
    setSavingDetectionId(detectionId);
    setError(null);
    try {
      await updateDetectionFreshness(detectionId, freshness);
      const detections = result.detections.map((detection) =>
        detection.id === detectionId ? { ...detection, freshness } : detection,
      );
      const counts = detections.reduce<DetectionResult['counts']>((summary, detection) => {
        const key = detection.class_name;
        summary[key] ||= { fresh: 0, medium: 0, rotten: 0, total: 0 };
        summary[key].total += 1;
        if (detection.freshness === 'Fresh') {
          summary[key].fresh += 1;
        } else if (detection.freshness === 'Medium') {
          summary[key].medium = (summary[key].medium ?? 0) + 1;
        } else {
          summary[key].rotten += 1;
        }
        return summary;
      }, {});
      setResult({ ...result, detections, counts });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update freshness.');
    } finally {
      setSavingDetectionId(null);
    }
  }

  async function handleConfirmInventory() {
    if (!result || result.inventoryApplied || isConfirming) return;
    setIsConfirming(true);
    setError(null);
    try {
      const data = await confirmScanInventory(result.scanId);
      // Keep the local detections (they carry any freshness corrections) and
      // take only the applied stock changes from the server.
      setResult((current) =>
        current
          ? { ...current, inventoryApplied: true, inventoryChanges: data.inventoryChanges ?? [] }
          : current,
      );
      loadRecentScans();
      router.push('/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add the scan to inventory.');
    } finally {
      setIsConfirming(false);
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (shelves.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No shelves yet</Text>
        <Text style={styles.emptyText}>Add a shelf before scanning inventory.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/shelves')} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
          <Text style={styles.primaryButtonText}>Go to Shelves</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Scan shelf</Text>
        <Pressable onPress={() => router.push('/scan-history')} hitSlop={8} android_ripple={ripple}>
          <Text style={styles.historyLink}>Full history</Text>
        </Pressable>
      </View>

      {result ? (
        <ScanResult
          result={result}
          imageUri={image?.uri ?? null}
          scanMode={result.scanMode ?? scanMode}
          error={error}
          isConfirming={isConfirming}
          onConfirm={handleConfirmInventory}
          onScanAnother={handleScanAnother}
          onFreshnessChange={handleFreshnessChange}
          savingDetectionId={savingDetectionId}
          styles={styles}
          colors={colors}
        />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Shelf</Text>
            <View style={styles.chipRow}>
              {shelves.map((shelf) => (
                <Pressable
                  key={shelf.id}
                  style={[styles.chip, selectedShelf?.id === shelf.id && styles.chipActive]}
                  onPress={() => setSelectedShelf(shelf)}
                  android_ripple={ripple}
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
                  android_ripple={ripple}
                >
                  <Text style={[styles.chipText, scanMode === mode.value && styles.chipTextActive]}>
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            {isPreparingImage ? (
              <View style={styles.preparingBox}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.hint}>Preparing image…</Text>
              </View>
            ) : image ? (
              <Image source={{ uri: image.uri }} style={styles.preview} />
            ) : (
              <View style={styles.pickerButtons}>
                <Pressable style={styles.pickerButton} onPress={handleTakePhoto} android_ripple={ripple}>
                  <Text style={styles.pickerButtonText}>Take photo</Text>
                </Pressable>
                <Pressable style={styles.pickerButton} onPress={handlePickFromGallery} android_ripple={ripple}>
                  <Text style={styles.pickerButtonText}>Choose from gallery</Text>
                </Pressable>
              </View>
            )}

            {image ? (
              <View style={styles.actionsRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setImage(null)} disabled={isAnalyzing} android_ripple={ripple}>
                  <Text style={styles.secondaryButtonText}>Retake</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, isAnalyzing && styles.primaryButtonDisabled]}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing || !selectedShelf}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Analyze</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {isAnalyzing ? (
              <Text style={styles.hint}>Analyzing image — this can take up to 15 seconds…</Text>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}

      <View style={styles.card}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent scans</Text>
          <Pressable onPress={() => router.push('/scan-history')} hitSlop={8} android_ripple={ripple}>
            <Text style={styles.seeAllLink}>See all</Text>
          </Pressable>
        </View>

        {isLoadingRecent ? (
          <ActivityIndicator color={colors.accent} />
        ) : recentScans.length === 0 ? (
          <Text style={styles.hint}>No scans in the last {RECENT_SCANS_WINDOW_DAYS} days.</Text>
        ) : (
          recentScans.map((scan) => (
            <View key={scan.id} style={styles.recentRow}>
              <View style={styles.recentRowMain}>
                <Text style={styles.recentRowTitle}>{scan.shelf_name}</Text>
                <Text style={styles.recentRowMeta}>
                  {scan.item_count} item{scan.item_count === 1 ? '' : 's'} · {scan.fresh_count} fresh ·{' '}
                  {scan.spoiled_count} spoiled
                </Text>
              </View>
              <Text style={styles.recentRowTime}>{formatHistoryDate(scan.created_at)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const FRESHNESS_OPTIONS: FreshnessStatus[] = ['Fresh', 'Medium', 'Spoiled'];

function ScanResult({
  result,
  imageUri,
  scanMode,
  error,
  isConfirming,
  onConfirm,
  onScanAnother,
  onFreshnessChange,
  savingDetectionId,
  styles,
  colors,
}: {
  result: DetectionResult;
  imageUri: string | null;
  scanMode: ScanMode;
  error: string | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onScanAnother: () => void;
  onFreshnessChange: (detectionId: string | undefined, freshness: FreshnessStatus) => void;
  savingDetectionId: string | null;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  const classEntries = Object.entries(result.counts);
  const isApplied = result.inventoryApplied === true;
  const isStockIn = scanMode === 'STOCK_IN';
  const confirmLabel = isApplied
    ? isStockIn
      ? 'Added to stock'
      : 'Removed from stock'
    : isStockIn
      ? 'Add to stock'
      : 'Remove from stock';
  const canConfirm = !isApplied && !isConfirming && result.total_count > 0;

  return (
    <View style={styles.resultCard}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

      <Text style={styles.resultTitle}>Scan complete — {result.total_count} item(s) detected</Text>
      {!isApplied && result.total_count > 0 ? (
        <Text style={styles.resultHint}>
          Check the results, then tap "{confirmLabel}" to update inventory.
        </Text>
      ) : null}

      {classEntries.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>By product</Text>
          {classEntries.map(([className, counts]) => (
            <View key={className} style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>{className}</Text>
              <Text style={styles.resultRowValue}>
                {counts.fresh} fresh · {counts.medium ? `${counts.medium} medium · ` : ''}
                {counts.rotten} spoiled · {counts.total} total
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
          <Text style={styles.resultHint}>Tap a freshness label to correct it.</Text>
          {result.detections.map((detection, index) => (
            <View key={detection.id ?? index} style={styles.detectionRow}>
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>{detection.class_name}</Text>
                <Text style={styles.resultRowValue}>{detection.freshness_confidence_percent}% confidence</Text>
              </View>
              <View style={styles.freshnessChipRow}>
                {FRESHNESS_OPTIONS.map((option) => {
                  const isActive = detection.freshness === option;
                  const isSaving = savingDetectionId === detection.id;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.freshnessChip, isActive && styles.freshnessChipActive]}
                      onPress={() => onFreshnessChange(detection.id, option)}
                      disabled={!detection.id || isSaving}
                      android_ripple={ripple}
                    >
                      {isSaving && isActive ? (
                        <ActivityIndicator color={colors.onAccent} size="small" />
                      ) : (
                        <Text style={[styles.freshnessChipText, isActive && styles.freshnessChipTextActive]}>
                          {option}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={onScanAnother}
          disabled={isConfirming}
          android_ripple={ripple}
        >
          <Text style={styles.secondaryButtonText}>Scan another</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, !canConfirm && styles.primaryButtonDisabled]}
          onPress={onConfirm}
          disabled={!canConfirm}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isConfirming ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    fontSize: 21,
    color: colors.textPrimary,
  },
  historyLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    ...card(colors),
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.onAccent,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  pickerButtonText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
    fontSize: 14,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  preparingBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.onAccent,
    fontSize: 14,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.bodyMedium,
    color: colors.danger,
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  recentRowMain: {
    flex: 1,
    gap: 2,
  },
  recentRowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  recentRowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  recentRowTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  resultCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  resultTitle: {
    ...typography.h2,
    fontSize: 16,
    color: colors.textPrimary,
  },
  resultSection: {
    gap: spacing.xs,
  },
  resultSectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accentDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -2,
  },
  detectionRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  freshnessChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  freshnessChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  freshnessChipActive: {
    backgroundColor: colors.accent,
  },
  freshnessChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accentDark,
  },
  freshnessChipTextActive: {
    color: colors.onAccent,
  },
  resultRowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultRowValue: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  });
