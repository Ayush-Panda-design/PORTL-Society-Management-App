import { X } from 'lucide-react-native';
import { Modal, Pressable, Text, View, StyleSheet, useColorScheme } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Palette } from '@/constants/theme';
import { useModalBack } from '@/hooks/use-modal-back';
import { BlurView } from 'expo-blur';
import { VisitorWithFlat } from '@/types/database';

type Props = {
  visible: boolean;
  onClose: () => void;
  visitor: VisitorWithFlat | null;
};

export function QRCodeModal({ visible, onClose, visitor }: Props) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const palette = Palette[scheme];
  useModalBack(visible && Boolean(visitor), onClose);
  if (!visitor) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={20} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: palette.card,
              shadowColor: palette.shadow,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.border, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.ink }}>Visitor Pass</Text>
              <Pressable
                onPress={onClose}
                style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: palette.muted }}
              >
                <X color={palette.inkMuted} size={18} />
              </Pressable>
            </View>

            {/* QR Content */}
            <View style={{ alignItems: 'center', padding: 32 }}>
              <View style={{ height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: palette.brandSoftBg, marginBottom: 16 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0F766E' }}>
                  {visitor.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.ink, marginBottom: 4, textAlign: 'center' }}>
                {visitor.name}
              </Text>
              <Text style={{ fontSize: 14, color: palette.inkMuted, marginBottom: 24, textAlign: 'center' }}>
                Show this code at the gate
              </Text>

              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                  padding: 16,
                  backgroundColor: palette.card,
                }}
              >
                <QRCode
                  value={visitor.id}
                  size={200}
                  color={palette.ink}
                  backgroundColor={palette.card}
                />
              </View>

              <Text style={{ marginTop: 16, fontSize: 12, color: palette.inkFaint, textAlign: 'center', fontWeight: '500' }}>
                PASS ID: {visitor.id.split('-')[0].toUpperCase()}
              </Text>
            </View>

            {/* Footer */}
            <View style={{ backgroundColor: palette.muted, padding: 16 }}>
              <Text style={{ textAlign: 'center', fontSize: 13, color: palette.inkMuted }}>
                Take a screenshot and share it with your guest for instant entry.
              </Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
