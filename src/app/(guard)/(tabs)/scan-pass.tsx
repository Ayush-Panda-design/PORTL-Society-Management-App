import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, ScanLine } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GatePicker } from '@/components/visitors/gate-picker';
import { useAppBack } from '@/hooks/use-app-back';
import { isVisitorPassExpired, markVisitorEntry } from '@/lib/mark-visitor-entry';
import { supabase } from '@/lib/supabase';
import { uploadLocalImage } from '@/lib/storage-upload';
import { useAuthStore } from '@/stores/authStore';
import type { VisitorWithFlat } from '@/types/database';

export default function ScanPassScreen() {
  const goBack = useAppBack();
  const { visitorId } = useLocalSearchParams<{ visitorId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [visitor, setVisitor] = useState<VisitorWithFlat | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const deepLinkHandled = useRef(false);

  const markEntry = useCallback(
    async (targetVisitorId: string, photoUrl: string | null, current: VisitorWithFlat | null) => {
      if (!profile?.id || !profile.society_id) return;

      const { error: entryError } = await markVisitorEntry({
        visitorId: targetVisitorId,
        guardId: profile.id,
        societyId: profile.society_id,
        flatId: current?.flat_id ?? null,
        visitorName: current?.name ?? 'Visitor',
        entryGateId: selectedGateId,
        photoUrl: photoUrl && current && !current.photo_url ? photoUrl : null,
      });

      if (entryError) {
        throw new Error(entryError);
      }

      setSuccess(true);
      setTakingPhoto(false);
    },
    [profile?.id, profile?.society_id, selectedGateId],
  );

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || processing || !profile?.society_id) return;

      setScanned(true);
      setProcessing(true);
      setError(null);

      let needsPhoto = false;

      try {
        const { data: vData, error: fetchError } = await supabase
          .from('visitors')
          .select('*, flats(*)')
          .eq('id', data)
          .eq('society_id', profile.society_id)
          .single();

        if (fetchError || !vData) {
          throw new Error('Invalid or unknown pass for this society.');
        }

        if (vData.society_id !== profile.society_id) {
          throw new Error('This pass belongs to another society.');
        }

        if (vData.status !== 'approved') {
          throw new Error(`Pass is not valid. Status: ${vData.status}`);
        }

        if (isVisitorPassExpired(vData.expires_at)) {
          throw new Error('This QR pass has expired.');
        }

        const next = vData as VisitorWithFlat;
        setVisitor(next);

        if (!next.photo_url) {
          needsPhoto = true;
          setTakingPhoto(true);
        } else {
          await markEntry(next.id, next.photo_url, next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to verify pass');
        setTimeout(() => {
          setScanned(false);
          setProcessing(false);
          setError(null);
        }, 3000);
      } finally {
        if (!needsPhoto) {
          setProcessing(false);
        }
      }
    },
    [scanned, processing, profile?.society_id, markEntry],
  );

  useEffect(() => {
    if (!visitorId || !permission?.granted || !profile?.society_id || deepLinkHandled.current) {
      return;
    }
    deepLinkHandled.current = true;
    void handleBarCodeScanned({ data: visitorId });
  }, [visitorId, permission?.granted, profile?.society_id, handleBarCodeScanned]);

  const capturePhoto = async () => {
    if (!cameraRef.current || !visitor || !profile?.society_id || processing) return;
    setProcessing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (!photo?.uri) {
        throw new Error('Could not capture photo');
      }

      const { publicUrl, error: uploadError } = await uploadLocalImage({
        bucket: 'visitor-photos',
        societyId: profile.society_id,
        uri: photo.uri,
        base64: photo.base64,
      });

      if (uploadError || !publicUrl) {
        throw new Error(uploadError || 'Upload failed');
      }

      await markEntry(visitor.id, publicUrl, visitor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo capture failed');
      setProcessing(false);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface p-6">
        <Text className="mb-4 text-center text-lg text-ink-soft">
          We need your permission to use the camera to scan passes.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="rounded-xl bg-teal-700 px-6 py-3"
        >
          <Text className="font-semibold text-white">Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!profile?.society_id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface p-6">
        <Text className="mb-4 text-center text-lg text-ink-soft">
          Assign a society to your guard profile to scan passes.
        </Text>
        <Pressable onPress={() => goBack()} className="rounded-xl bg-teal-700 px-6 py-3">
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-teal-700 p-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-teal-600">
          <Check color="#fff" size={48} />
        </View>
        <Text className="mb-2 text-center text-3xl font-bold text-white">
          {visitor?.name}
        </Text>
        <Text className="mb-8 text-center text-lg font-medium text-teal-100">
          Checked in successfully
        </Text>
        <Pressable
          onPress={() => goBack()}
          className="w-full rounded-2xl bg-white py-4 shadow-sm"
        >
          <Text className="text-center text-lg font-bold text-teal-900">Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <View className="absolute left-0 right-0 top-0 z-10 p-4 pt-12">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => goBack()}
            className="h-12 w-12 items-center justify-center rounded-full bg-black/50"
          >
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <View className="rounded-full bg-black/50 px-4 py-2">
            <Text className="font-semibold text-white">
              {takingPhoto ? 'Capture Photo' : 'Scan QR Pass'}
            </Text>
          </View>
          <View className="h-12 w-12" />
        </View>
        <View className="rounded-2xl bg-black/55 px-3 py-2">
          <GatePicker
            societyId={profile.society_id}
            value={selectedGateId}
            onChange={setSelectedGateId}
          />
        </View>
      </View>

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned || takingPhoto ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {!takingPhoto && (
        <View className="pointer-events-none flex-1 items-center justify-center">
          <View className="h-64 w-64 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/50 bg-black/20">
            <ScanLine color="#fff" size={48} opacity={0.8} />
          </View>
          <Text className="mt-8 text-center text-lg font-medium text-white shadow-sm">
            Align QR code within frame
          </Text>
        </View>
      )}

      {takingPhoto && (
        <View className="absolute bottom-0 left-0 right-0 items-center p-8 pb-12">
          <View className="mb-6 rounded-2xl bg-black/60 px-6 py-4">
            <Text className="text-center text-lg font-medium text-white">
              {visitor?.name}
            </Text>
            <Text className="text-center text-sm text-slate-300">
              Pre-approved. Capture photo for security.
            </Text>
          </View>

          <Pressable
            disabled={processing}
            onPress={() => void capturePhoto()}
            className={`h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/30 ${
              processing ? 'opacity-50' : ''
            }`}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <View className="h-14 w-14 rounded-full bg-white" />
            )}
          </Pressable>
        </View>
      )}

      {error ? (
        <View className="absolute bottom-12 left-4 right-4 rounded-xl bg-red-500 p-4 shadow-lg">
          <Text className="text-center font-medium text-white">{error}</Text>
        </View>
      ) : null}

      {processing && !takingPhoto && !error ? (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <ActivityIndicator color="#fff" size="large" />
          <Text className="mt-4 font-medium text-white">Verifying pass...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
