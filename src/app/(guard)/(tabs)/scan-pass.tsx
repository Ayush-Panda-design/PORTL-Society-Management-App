import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useAppBack } from '@/hooks/use-app-back';
import { supabase } from '@/lib/supabase';
import { uploadLocalImage } from '@/lib/storage-upload';
import { notifyFlatOfVisitorEntry } from '@/lib/visitors';
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

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visitorId && permission?.granted) {
      void handleBarCodeScanned({ data: visitorId });
    }
    // Initial deep-link scan only — handler identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId, permission?.granted]);

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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);
    setError(null);

    try {
      // Find the visitor with this ID
      const { data: vData, error: fetchError } = await supabase
        .from('visitors')
        .select('*, flats(*)')
        .eq('id', data)
        .single();

      if (fetchError || !vData) {
        throw new Error('Invalid or unknown pass.');
      }

      if (vData.status !== 'approved') {
        throw new Error(`Pass is not valid. Status: ${vData.status}`);
      }

      if (vData.expires_at && new Date(vData.expires_at) < new Date()) {
        throw new Error('This QR pass has expired.');
      }

      setVisitor(vData as VisitorWithFlat);

      // If no photo URL exists (pre-approved guest), we MUST take a photo
      if (!vData.photo_url) {
        setTakingPhoto(true);
      } else {
        // They already have a photo, we can just mark them as checked in
        await markEntry(vData.id, vData.photo_url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify pass');
      setTimeout(() => {
        setScanned(false);
        setProcessing(false);
        setError(null);
      }, 3000); // Allow re-scanning after 3 seconds on error
    } finally {
      if (!takingPhoto) {
        setProcessing(false);
      }
    }
  };

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

      await markEntry(visitor.id, publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo capture failed');
      setProcessing(false);
    }
  };

  const markEntry = async (visitorId: string, photoUrl: string | null) => {
    if (!profile?.id) return;
    
    try {
      // Update photo URL if needed
      if (photoUrl && visitor && !visitor.photo_url) {
        await supabase
          .from('visitors')
          .update({ photo_url: photoUrl, status: 'checked_in' })
          .eq('id', visitorId);
      } else {
        await supabase
          .from('visitors')
          .update({ status: 'checked_in' })
          .eq('id', visitorId);
      }

      // Log entry
      await supabase.from('visitor_logs').insert({
        visitor_id: visitorId,
        entry_time: new Date().toISOString(),
        guard_id: profile.id,
      });

      if (profile.society_id && visitor?.flat_id) {
        void notifyFlatOfVisitorEntry({
          flatId: visitor.flat_id,
          societyId: profile.society_id,
          visitorName: visitor.name,
          visitorId,
        });
      }

      setSuccess(true);
      setTakingPhoto(false);
    } catch {
      throw new Error('Failed to mark entry');
    }
  };

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-teal-700 p-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-teal-600">
          <Check color="#fff" size={48} />
        </View>
        <Text className="mb-2 text-3xl font-bold text-white text-center">
          {visitor?.name}
        </Text>
        <Text className="mb-8 text-lg font-medium text-teal-100 text-center">
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
      {/* Header overlay */}
      <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between p-4 pt-12">
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

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned || takingPhoto ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay for QR Scanner */}
      {!takingPhoto && (
        <View className="flex-1 items-center justify-center pointer-events-none">
          <View className="h-64 w-64 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/50 bg-black/20">
            <ScanLine color="#fff" size={48} opacity={0.8} />
          </View>
          <Text className="mt-8 text-center text-lg font-medium text-white shadow-sm">
            Align QR code within frame
          </Text>
        </View>
      )}

      {/* Camera Capture UI */}
      {takingPhoto && (
        <View className="absolute bottom-0 left-0 right-0 p-8 pb-12 items-center">
          <View className="mb-6 rounded-2xl bg-black/60 px-6 py-4 backdrop-blur-md">
            <Text className="text-center text-lg font-medium text-white">
              {visitor?.name}
            </Text>
            <Text className="text-center text-sm text-slate-300">
              Pre-approved. Capture photo for security.
            </Text>
          </View>
          
          <Pressable
            disabled={processing}
            onPress={capturePhoto}
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

      {error && (
        <View className="absolute bottom-12 left-4 right-4 rounded-xl bg-red-500 p-4 shadow-lg">
          <Text className="text-center font-medium text-white">{error}</Text>
        </View>
      )}

      {processing && !takingPhoto && !error && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 backdrop-blur-sm">
          <ActivityIndicator color="#fff" size="large" />
          <Text className="mt-4 font-medium text-white">Verifying pass...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
