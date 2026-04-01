/**
 * Scanner Modal
 *
 * Two modes:
 *  - "barcode"  – live camera frame with barcode/QR overlay; model extracted immediately
 *  - "photo"    – capture still image → backend OCR → model extracted
 *
 * After extraction the user sees a REVIEW screen where they can:
 *  - Confirm the detected model number (pre-fills add-unit form)
 *  - Edit it manually
 *  - Pick from alternate candidates if confidence is low
 *  - Start over
 *
 * Edge cases handled:
 *  - Camera permission denied → helpful prompt + Settings deep-link
 *  - No barcode after 15 s → auto-suggest switching to photo mode
 *  - OCR error → raw text shown, manual entry enabled
 *  - Low confidence extraction → visual warning + alternate list
 *  - Device has no camera (simulator) → gallery picker fallback
 *  - Torch unavailable → silently hides toggle
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/contexts/ThemeContext';
import {
  extractModelFromBarcode,
  extractModelNumber,
  detectOemFromText,
  ExtractedModel,
} from '@/services/ocr/modelExtractor';
import { ocrImage } from '@/services/ocr/ocr.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.78;

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanMode = 'barcode' | 'photo';
type ScreenState = 'scan' | 'processing' | 'review' | 'error';

export default function ScannerModal() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ preferredOem?: string }>();
  const styles = createStyles(theme, isDark);

  // ── Camera permissions ───────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();

  // ── Scan state ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [screen, setScreen] = useState<ScreenState>('scan');
  const [torchOn, setTorchOn] = useState(false);
  const [facing] = useState<CameraType>('back');
  const [processingMessage, setProcessingMessage] = useState('');

  // ── Result state ─────────────────────────────────────────────────────────
  const [result, setResult] = useState<ExtractedModel | null>(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [editedModel, setEditedModel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Barcode scan cooldown (prevent duplicate fires) ───────────────────────
  const lastScannedRef = useRef<string | null>(null);
  const scanCooldownRef = useRef(false);

  // ── No-barcode timeout (suggest switching to photo) ───────────────────────
  const noBarcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPhotoSuggestion, setShowPhotoSuggestion] = useState(false);

  useEffect(() => {
    if (mode === 'barcode' && screen === 'scan') {
      noBarcodeTimerRef.current = setTimeout(() => {
        setShowPhotoSuggestion(true);
      }, 15000);
    }
    return () => {
      if (noBarcodeTimerRef.current) clearTimeout(noBarcodeTimerRef.current);
    };
  }, [mode, screen]);

  // ── Handle barcode detection ──────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(
    ({ data, type }: BarcodeScanningResult) => {
      if (scanCooldownRef.current) return;
      if (data === lastScannedRef.current) return;

      scanCooldownRef.current = true;
      lastScannedRef.current = data;

      const extracted = extractModelFromBarcode(data);

      if (!extracted) {
        // Barcode found but couldn't parse a model number
        Alert.alert(
          'Barcode Detected',
          `Scanned value:\n"${data}"\n\nCould not identify a model number. Would you like to use this as the model number?`,
          [
            {
              text: 'Use It',
              onPress: () => {
                setResult({
                  modelNumber: data,
                  confidence: 'low',
                  method: 'barcode',
                  rawText: data,
                });
                setEditedModel(data);
                setScreen('review');
              },
            },
            {
              text: 'Try Photo Instead',
              onPress: () => {
                setMode('photo');
                scanCooldownRef.current = false;
              },
            },
            {
              text: 'Scan Again',
              style: 'cancel',
              onPress: () => {
                setTimeout(() => {
                  scanCooldownRef.current = false;
                  lastScannedRef.current = null;
                }, 1500);
              },
            },
          ]
        );
        return;
      }

      setResult(extracted);
      setEditedModel(extracted.modelNumber);
      setScreen('review');
    },
    []
  );

  // ── Capture photo and run OCR ─────────────────────────────────────────────
  const cameraRef = useRef<CameraView>(null);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      setScreen('processing');
      setProcessingMessage('Capturing image…');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (!photo?.base64) {
        setErrorMessage('Failed to capture image. Please try again.');
        setScreen('error');
        return;
      }

      setProcessingMessage('Reading serial plate…');

      const ocrResult = await ocrImage(
        photo.base64,
        'image/jpeg',
        params.preferredOem
      );

      if (ocrResult.error && !ocrResult.rawText) {
        setErrorMessage(ocrResult.error);
        setScreen('error');
        return;
      }

      setRawOcrText(ocrResult.rawText);

      if (ocrResult.extracted) {
        setResult(ocrResult.extracted);
        setEditedModel(ocrResult.extracted.modelNumber);
        setScreen('review');
      } else {
        // OCR returned text but couldn't extract a model number
        setResult(null);
        setEditedModel('');
        setScreen('review');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.');
      setScreen('error');
    }
  };

  // ── Gallery fallback ──────────────────────────────────────────────────────
  const handlePickFromGallery = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        base64: true,
        allowsEditing: true,
      });

      if (pickerResult.canceled || !pickerResult.assets[0]?.base64) return;

      setScreen('processing');
      setProcessingMessage('Reading serial plate…');

      const ocrResult = await ocrImage(
        pickerResult.assets[0].base64,
        'image/jpeg',
        params.preferredOem
      );

      if (ocrResult.error && !ocrResult.rawText) {
        setErrorMessage(ocrResult.error);
        setScreen('error');
        return;
      }

      setRawOcrText(ocrResult.rawText);
      if (ocrResult.extracted) {
        setResult(ocrResult.extracted);
        setEditedModel(ocrResult.extracted.modelNumber);
      } else {
        setResult(null);
        setEditedModel('');
      }
      setScreen('review');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to open gallery.');
      setScreen('error');
    }
  };

  // ── Confirm and return model number to add-unit ───────────────────────────
  const handleConfirm = () => {
    const finalModel = editedModel.trim().toUpperCase();
    if (!finalModel) {
      Alert.alert('No Model Number', 'Please enter or edit the model number before continuing.');
      return;
    }
    const detectedOem = result?.detectedOem || detectOemFromText(rawOcrText);
    router.navigate({
      pathname: '/(tabs)/search',
      params: {
        scannedModel: finalModel,
        scannedOem: detectedOem || '',
      },
    });
  };

  // ── Restart scan ──────────────────────────────────────────────────────────
  const handleRescan = () => {
    setResult(null);
    setEditedModel('');
    setRawOcrText('');
    setErrorMessage('');
    setShowPhotoSuggestion(false);
    scanCooldownRef.current = false;
    lastScannedRef.current = null;
    setScreen('scan');
  };

  // ─── Permission handling ──────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="camera-off-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
          Camera Access Needed
        </Text>
        <Text style={[styles.permissionBody, { color: theme.colors.textSecondary }]}>
          OEM TechTalk needs camera access to scan serial plates and barcodes.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.primaryBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={() => Linking.openSettings()}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
            Open Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryFallback} onPress={handlePickFromGallery}>
          <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.galleryFallbackText, { color: theme.colors.primary }]}>
            Choose from Gallery Instead
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Processing overlay ───────────────────────────────────────────────────
  if (screen === 'processing') {
    return (
      <View style={[styles.centered, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.processingText}>{processingMessage}</Text>
        <Text style={styles.processingSubtext}>
          This usually takes 5–15 seconds
        </Text>
      </View>
    );
  }

  // ─── Error screen ─────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={64} color={theme.colors.danger} />
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
            Scan Failed
          </Text>
          <Text style={[styles.permissionBody, { color: theme.colors.textSecondary }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleRescan}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryFallback} onPress={handlePickFromGallery}>
            <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.galleryFallbackText, { color: theme.colors.primary }]}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Review screen ────────────────────────────────────────────────────────
  if (screen === 'review') {
    const hasAlternates = (result?.alternates?.length ?? 0) > 0;
    const confidenceColor =
      result?.confidence === 'high'
        ? theme.colors.success
        : result?.confidence === 'medium'
        ? theme.colors.warning ?? '#f59e0b'
        : theme.colors.danger;

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <TouchableOpacity onPress={handleRescan}>
            <Ionicons name="arrow-back" size={26} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.reviewHeaderTitle, { color: theme.colors.text }]}>
            Review Scan Result
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.reviewScroll}
          contentContainerStyle={styles.reviewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Confidence badge */}
          {result && (
            <View style={[styles.confidenceBadge, { borderColor: confidenceColor }]}>
              <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                {result.confidence === 'high'
                  ? 'High confidence match'
                  : result.confidence === 'medium'
                  ? 'Possible match — please verify'
                  : 'Low confidence — verify carefully'}
              </Text>
            </View>
          )}

          {/* Model number field */}
          <Text style={[styles.reviewLabel, { color: theme.colors.text }]}>
            Detected Model Number
          </Text>
          <View
            style={[
              styles.modelInputContainer,
              {
                backgroundColor: isDark
                  ? theme.colors.backgroundSecondary
                  : theme.colors.white,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.modelInput, { color: theme.colors.text }]}
              value={editedModel}
              onChangeText={(t) => setEditedModel(t.toUpperCase())}
              placeholder="Enter model number"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {editedModel.length > 0 && (
              <TouchableOpacity onPress={() => setEditedModel('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Detected OEM */}
          {result?.detectedOem && (
            <Text style={[styles.detectedOem, { color: theme.colors.textSecondary }]}>
              Detected manufacturer: <Text style={{ fontWeight: '600' }}>{result.detectedOem}</Text>
            </Text>
          )}

          {/* Alternate candidates */}
          {hasAlternates && (
            <View style={styles.alternatesSection}>
              <Text style={[styles.reviewLabel, { color: theme.colors.text }]}>
                Other candidates — tap to use
              </Text>
              {result!.alternates!.map((alt) => (
                <TouchableOpacity
                  key={alt}
                  style={[
                    styles.alternateChip,
                    {
                      backgroundColor: isDark
                        ? theme.colors.backgroundSecondary
                        : theme.colors.white,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setEditedModel(alt)}
                >
                  <Text style={[styles.alternateChipText, { color: theme.colors.text }]}>
                    {alt}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Raw OCR text (collapsible) */}
          {rawOcrText.length > 0 && (
            <RawTextAccordion text={rawOcrText} theme={theme} isDark={isDark} />
          )}

          {/* No model detected notice */}
          {!result && (
            <View
              style={[
                styles.noModelNotice,
                { backgroundColor: theme.colors.danger + '15', borderColor: theme.colors.danger + '40' },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.danger} />
              <Text style={[styles.noModelNoticeText, { color: theme.colors.danger }]}>
                Couldn't automatically detect a model number. Type it in the field above.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Confirm CTA */}
        <View
          style={[
            styles.reviewFooter,
            { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.colors.primary },
              !editedModel.trim() && styles.disabledBtn,
            ]}
            onPress={handleConfirm}
            disabled={!editedModel.trim()}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Use This Model Number</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.rescanBtnText, { color: theme.colors.primary }]}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Scan screen (camera live view) ──────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torchOn}
        barcodeScannerSettings={
          mode === 'barcode'
            ? {
                barcodeTypes: [
                  'qr',
                  'code128',
                  'code39',
                  'code93',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'datamatrix',
                  'pdf417',
                  'aztec',
                  'itf14',
                ],
              }
            : undefined
        }
        onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
      />

      {/* Dark overlay with viewfinder cutout */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          {/* Viewfinder */}
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {mode === 'barcode' && <View style={styles.scanLine} />}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>
          {mode === 'barcode' ? 'Scan Barcode' : 'Photo Mode'}
        </Text>

        <TouchableOpacity style={styles.topBarBtn} onPress={() => setTorchOn((t) => !t)}>
          <Ionicons
            name={torchOn ? 'flash' : 'flash-off'}
            size={24}
            color={torchOn ? '#FCD34D' : '#fff'}
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}
          onPress={() => {
            setMode('barcode');
            setShowPhotoSuggestion(false);
          }}
        >
          <Ionicons
            name="barcode-outline"
            size={18}
            color={mode === 'barcode' ? '#fff' : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.modeBtnText, mode === 'barcode' && styles.modeBtnTextActive]}>
            Barcode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]}
          onPress={() => {
            setMode('photo');
            setShowPhotoSuggestion(false);
          }}
        >
          <Ionicons
            name="camera-outline"
            size={18}
            color={mode === 'photo' ? '#fff' : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.modeBtnText, mode === 'photo' && styles.modeBtnTextActive]}>
            Photo / OCR
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hint text + photo suggestion */}
      <View style={styles.bottomHint}>
        {showPhotoSuggestion && mode === 'barcode' && (
          <TouchableOpacity
            style={styles.suggestionBanner}
            onPress={() => {
              setMode('photo');
              setShowPhotoSuggestion(false);
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#fff" />
            <Text style={styles.suggestionText}>
              No barcode found. Tap to switch to Photo mode and scan the label directly.
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hintText}>
          {mode === 'barcode'
            ? "Point at the barcode on the unit's serial plate"
            : 'Frame the entire model/serial label, then tap the button'}
        </Text>
      </View>

      {/* Photo capture button (photo mode only) */}
      {mode === 'photo' && (
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            <Ionicons name="images-outline" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          {/* Spacer to balance layout */}
          <View style={{ width: 52 }} />
        </View>
      )}
    </View>
  );
}

// ─── Collapsible raw OCR text ─────────────────────────────────────────────────
function RawTextAccordion({
  text,
  theme,
  isDark,
}: {
  text: string;
  theme: any;
  isDark: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginTop: 16 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        onPress={() => setExpanded((e) => !e)}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
          Raw text from scan
        </Text>
      </TouchableOpacity>
      {expanded && (
        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 18,
            color: theme.colors.textSecondary,
            backgroundColor: isDark
              ? theme.colors.backgroundSecondary
              : '#f1f5f9',
            padding: 10,
            borderRadius: 8,
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#4ADE80'; // green accent

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    // ── Permission / error screens ──
    permissionTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 16,
    },
    permissionBody: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      marginTop: 4,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      marginTop: 8,
      minWidth: 220,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    disabledBtn: { opacity: 0.45 },
    secondaryBtn: {
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
      minWidth: 220,
      alignItems: 'center',
    },
    secondaryBtnText: { fontSize: 15, fontWeight: '500' },
    galleryFallback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 16,
      padding: 8,
    },
    galleryFallbackText: { fontSize: 14, fontWeight: '500' },
    // ── Processing ──
    processingText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      marginTop: 20,
    },
    processingSubtext: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 14,
      marginTop: 6,
    },
    // ── Camera ──
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'column',
    },
    overlayTop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddleRow: { flexDirection: 'row', height: VIEWFINDER_SIZE },
    overlaySide: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
      flex: 2,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    viewfinder: {
      width: VIEWFINDER_SIZE,
      height: VIEWFINDER_SIZE,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      borderColor: CORNER_COLOR,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: CORNER_THICKNESS,
      borderLeftWidth: CORNER_THICKNESS,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: CORNER_THICKNESS,
      borderRightWidth: CORNER_THICKNESS,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: CORNER_THICKNESS,
      borderLeftWidth: CORNER_THICKNESS,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: CORNER_THICKNESS,
      borderRightWidth: CORNER_THICKNESS,
    },
    scanLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 2,
      backgroundColor: CORNER_COLOR,
      opacity: 0.7,
    },
    // ── Top bar ──
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    topBarBtn: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 21,
    },
    topBarTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    // ── Mode toggle ──
    modeToggle: {
      position: 'absolute',
      top: SCREEN_HEIGHT * 0.12,
      alignSelf: 'center',
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 24,
      padding: 4,
      gap: 4,
    },
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
    modeBtnText: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 13,
      fontWeight: '600',
    },
    modeBtnTextActive: { color: '#fff' },
    // ── Bottom hint ──
    bottomHint: {
      position: 'absolute',
      bottom: 160,
      left: 20,
      right: 20,
      alignItems: 'center',
      gap: 8,
    },
    hintText: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 13,
      textAlign: 'center',
    },
    suggestionBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: 'rgba(74,222,128,0.25)',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: 'rgba(74,222,128,0.5)',
    },
    suggestionText: {
      flex: 1,
      color: '#fff',
      fontSize: 13,
      lineHeight: 18,
    },
    // ── Capture row (photo mode) ──
    captureRow: {
      position: 'absolute',
      bottom: 50,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
    },
    galleryBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    captureBtn: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderWidth: 4,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    captureInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#fff',
    },
    // ── Review screen ──
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    reviewHeaderTitle: { fontSize: 17, fontWeight: '600' },
    reviewScroll: { flex: 1 },
    reviewScrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
    confidenceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 20,
    },
    confidenceDot: { width: 8, height: 8, borderRadius: 4 },
    confidenceText: { fontSize: 13, fontWeight: '500' },
    reviewLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 4,
    },
    modelInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 2,
      gap: 8,
      marginBottom: 8,
    },
    modelInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      paddingVertical: 12,
      letterSpacing: 1,
    },
    detectedOem: { fontSize: 13, marginBottom: 16 },
    alternatesSection: { marginTop: 16 },
    alternateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    alternateChipText: { fontSize: 16, fontWeight: '500' },
    noModelNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginTop: 16,
    },
    noModelNoticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
    reviewFooter: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      gap: 10,
    },
    rescanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    rescanBtnText: { fontSize: 15, fontWeight: '500' },
    closeBtn: {
      position: 'absolute',
      top: 52,
      right: 16,
      zIndex: 10,
      padding: 8,
    },
  });
