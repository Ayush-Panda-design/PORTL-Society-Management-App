import { X, Share2, Download } from 'lucide-react-native';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Brand } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { VisitorWithFlat } from '@/types/database';

type Props = {
  visible: boolean;
  onClose: () => void;
  visitor: VisitorWithFlat | null;
};

export function QRCodeModal({ visible, onClose, visitor }: Props) {
  if (!visitor) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 p-4">
              <Text className="text-lg font-bold text-slate-900">Visitor Pass</Text>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X color="#64748B" size={18} />
              </Pressable>
            </View>

            {/* QR Content */}
            <View className="items-center p-8">
              <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                <Text className="text-2xl font-bold text-teal-700">
                  {visitor.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text className="mb-1 text-center text-xl font-bold text-slate-900">
                {visitor.name}
              </Text>
              <Text className="mb-6 text-center text-sm text-slate-500">
                Show this code at the gate
              </Text>

              <View
                className="items-center justify-center overflow-hidden rounded-2xl bg-white p-4"
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#94A3B8',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                }}
              >
                <QRCode
                  value={visitor.id}
                  size={200}
                  color="#0F172A"
                  backgroundColor="white"
                />
              </View>

              <Text className="mt-6 text-center text-xs font-medium text-slate-400">
                PASS ID: {visitor.id.split('-')[0].toUpperCase()}
              </Text>
            </View>

            {/* Footer */}
            <View className="bg-slate-50 p-4">
              <Text className="text-center text-sm font-medium text-slate-500">
                Take a screenshot and share it with your guest for instant entry.
              </Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
