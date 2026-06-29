import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Download, Calendar, X, ChevronRight } from 'lucide-react-native';
import { format, subDays } from 'date-fns';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba } from '@/lib/glass';
import { tapHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import { exportJournalArchive, getEntriesInRange } from '@/lib/export-journal';

type RangeMode = 'all' | 'custom';

interface ExportJournalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function ExportJournalModal({ visible, onClose, onSuccess, onError }: ExportJournalModalProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);

  const [mode, setMode] = useState<RangeMode>('custom');
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(() => new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  const effectiveStart = mode === 'all' ? new Date(0) : startDate;
  const effectiveEnd = mode === 'all' ? new Date() : endDate;

  const entriesInRange = useMemo(() => {
    if (!visible) return [];
    return getEntriesInRange(effectiveStart, effectiveEnd);
  }, [visible, mode, startDate, endDate]);

  const hasEntries = entriesInRange.length > 0;

  const handleExport = async () => {
    if (!hasEntries) return;
    tapHaptic();
    setIsExporting(true);
    setProgressMessage('Preparing export...');

    try {
      const result = await exportJournalArchive({
        mode,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        onProgress: setProgressMessage,
      });

      if (result.success) {
        successHaptic();
        onClose();
        onSuccess();
      } else {
        errorHaptic();
        onError(result.error || 'Export failed');
      }
    } catch (err) {
      errorHaptic();
      onError('Something went wrong. Please try again.');
    } finally {
      setIsExporting(false);
      setProgressMessage('');
    }
  };

  const handleClose = () => {
    if (isExporting) return;
    tapHaptic();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <LinearGradient
          colors={THEME_COLORS[selectedTheme].backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: Platform.OS === 'ios' ? 48 : 32,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.15)',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.25)',
              }}
            />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: hexToRgba(Colors.primary, 0.25),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Download size={18} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: 'Fraunces_700Bold', color: '#FFFFFF', fontSize: 22 }}>
                Export Journals
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} disabled={isExporting}>
              <X size={22} color="rgba(255,255,255,0.55)" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Mode selector */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 4,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            {(['all', 'custom'] as RangeMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => { tapHaptic(); setMode(m); }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: mode === m ? 'rgba(255,255,255,0.18)' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: mode === m ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    color: mode === m ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                  }}
                >
                  {m === 'all' ? 'All entries' : 'Custom range'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Date range pickers (shown only for custom) */}
          {mode === 'custom' && (
            <View style={{ marginBottom: 20 }}>
              {/* Start date */}
              <Pressable
                onPress={() => { tapHaptic(); setShowStartPicker(true); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 10,
                }}
              >
                <Calendar size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginLeft: 10, flex: 1 }}>
                  From
                </Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                  {format(startDate, 'MMM d, yyyy')}
                </Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.35)" strokeWidth={2} style={{ marginLeft: 8 }} />
              </Pressable>

              {/* End date */}
              <Pressable
                onPress={() => { tapHaptic(); setShowEndPicker(true); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Calendar size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginLeft: 10, flex: 1 }}>
                  To
                </Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                  {format(endDate, 'MMM d, yyyy')}
                </Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.35)" strokeWidth={2} style={{ marginLeft: 8 }} />
              </Pressable>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={endDate}
                  onChange={(_, date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (date) setStartDate(date);
                  }}
                  themeVariant="dark"
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={startDate}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (date) setEndDate(date);
                  }}
                  themeVariant="dark"
                />
              )}
            </View>
          )}

          {/* Entry count / empty state */}
          <View
            style={{
              backgroundColor: hasEntries ? 'rgba(255,255,255,0.08)' : 'rgba(255,100,100,0.10)',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: hasEntries ? 'rgba(255,255,255,0.12)' : 'rgba(255,100,100,0.25)',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                color: hasEntries ? 'rgba(255,255,255,0.75)' : '#F87171',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {hasEntries
                ? `${entriesInRange.length} ${entriesInRange.length === 1 ? 'entry' : 'entries'} found`
                : 'No entries in this range'}
            </Text>
          </View>

          {/* Export button / progress */}
          {isExporting ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 12 }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                {progressMessage || 'Exporting...'}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleExport}
              disabled={!hasEntries}
              style={{ opacity: hasEntries ? 1 : 0.4, borderRadius: 20, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[hexToRgba(Colors.primary, 0.9), hexToRgba(Colors.primary, 0.6)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 16,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <Download size={18} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 10 }} />
                <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 16 }}>
                  Export & Download
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Description */}
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 11,
              textAlign: 'center',
              lineHeight: 16,
              marginTop: 16,
            }}
          >
            Exports a ZIP archive containing a PDF of your journal entries{'\n'}and audio files organized by date.
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}
