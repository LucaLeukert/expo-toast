import { toast } from 'expo-toast';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type DemoButtonProps = {
  label: string;
  subtitle?: string;
  onPress: () => void;
};

function DemoButton({ label, subtitle, onPress }: DemoButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#121212',
        borderRadius: 18,
        borderCurve: 'continuous',
        padding: 16,
        gap: 6,
      }}
    >
      <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>{label}</Text>
      {subtitle ? <Text style={{ color: '#bfbfbf', fontSize: 14 }}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export default function App() {
  const [keyboardValue, setKeyboardValue] = useState('');

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        gap: 14,
        backgroundColor: '#f2f5f7',
      }}
    >
      <Text selectable style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.4 }}>
        Expo Toast
      </Text>
      <Text selectable style={{ fontSize: 16, color: '#50545a', marginBottom: 4 }}>
        Native iOS 26 liquid-glass toast module demo.
      </Text>

      <DemoButton
        label="Success"
        subtitle="Default 3s timeout + fit-content"
        onPress={() => {
          toast.success('Profile saved', {
            title: 'Done',
            size: 'fit-content',
          });
        }}
      />

      <DemoButton
        label="Error + Retry"
        subtitle="Action callback + dismiss reason"
        onPress={() => {
          toast.error('Request failed', {
            title: 'Network issue',
            size: 'fill-width',
            action: {
              label: 'Retry',
              onPress: () => {
                toast.info('Retry tapped', { title: 'Action' });
              },
            },
            onDismiss: ({ reason }) => {
              if (reason === 'timeout') {
                toast.info('Dismissed by timeout', { duration: 'short' });
              }
            },
          });
        }}
      />

      <DemoButton
        label="Loading -> Success"
        subtitle="In-place native transition"
        onPress={() => {
          const id = toast.loading('Syncing records...', {
            title: 'Please wait',
          });

          setTimeout(() => {
            toast.transition(id, {
              variant: 'success',
              title: 'Done',
              message: 'Sync complete',
              duration: 'short',
              haptics: true,
            });
          }, 1800);
        }}
      />

      <DemoButton
        label="Queue Burst"
        subtitle="10 toasts, FIFO one-at-a-time"
        onPress={() => {
          for (let i = 1; i <= 10; i += 1) {
            toast.info(`Queue item #${i}`, { duration: 'short' });
          }
        }}
      />

      <DemoButton
        label="Bottom placement"
        subtitle="Non-default placement + fit-content"
        onPress={() => {
          toast.info('Shown near home indicator', {
            title: 'Bottom toast',
            position: 'bottom',
            size: 'fit-content',
          });
        }}
      />

      <View
        style={{
          marginTop: 6,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: '#fff',
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ fontSize: 15, fontWeight: '700' }}>
          Keyboard-aware bottom toast test
        </Text>
        <Text selectable style={{ color: '#4d5359' }}>
          Focus the input, then trigger the toast. It should stay above the keyboard.
        </Text>
        <TextInput
          value={keyboardValue}
          onChangeText={setKeyboardValue}
          placeholder="Type to show keyboard"
          placeholderTextColor="#8b9096"
          style={{
            height: 46,
            borderRadius: 12,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: '#d9dde1',
            paddingHorizontal: 12,
            backgroundColor: '#f8fafb',
            color: '#101418',
          }}
        />
        <DemoButton
          label="Show bottom toast (keyboard)"
          subtitle="Should lift above keyboard"
          onPress={() => {
            toast.info('Keyboard-aware bottom toast', {
              title: 'Bottom toast',
              position: 'bottom',
              size: 'fit-content',
            });
          }}
        />
      </View>

      <View
        style={{
          marginTop: 6,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: '#fff',
          padding: 16,
          gap: 8,
        }}
      >
        <Text selectable style={{ fontSize: 15, fontWeight: '700' }}>
          Runtime support
        </Text>
        <Text selectable style={{ color: '#4d5359' }}>
          {`isSupported(): ${String(toast.isSupported())}`}
        </Text>
      </View>
    </ScrollView>
  );
}
