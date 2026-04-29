import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { X, Wind, Eye, Ear, Hand, ChevronRight, Flower2, Coffee } from 'lucide-react-native';
import { tapHaptic } from '@/lib/haptics';

type GroundingTool = 'box-breathing' | 'five-senses' | 'body-scan' | null;

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function GroundingToolsModal({ visible, onDismiss }: Props) {
  const [activeTool, setActiveTool] = useState<GroundingTool>(null);

  const reset = useCallback(() => setActiveTool(null), []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Pressable onPress={() => { if (activeTool) { reset(); } else { onDismiss(); } }} style={{ padding: 8 }}>
            <X size={24} color="#6B7280" />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937' }}>
            {activeTool ? toolTitle(activeTool) : 'Grounding Tools'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {activeTool ? (
          <ToolContent tool={activeTool} onDone={() => { tapHaptic(); onDismiss(); }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 20 }}>
              These exercises help bring your attention back to the present moment. Choose one that feels right right now.
            </Text>

            <ToolCard
              icon={<Wind size={24} color="#3B82F6" />}
              title="Box Breathing"
              description="Breathe in for 4, hold for 4, out for 4, hold for 4. A simple pattern to calm your nervous system."
              color="#EFF6FF"
              onPress={() => { tapHaptic(); setActiveTool('box-breathing'); }}
            />
            <ToolCard
              icon={<Eye size={24} color="#10B981" />}
              title="5-4-3-2-1 Senses"
              description="Notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste."
              color="#ECFDF5"
              onPress={() => { tapHaptic(); setActiveTool('five-senses'); }}
            />
            <ToolCard
              icon={<Hand size={24} color="#8B5CF6" />}
              title="Body Scan"
              description="Gently move your attention from your toes to the top of your head. Notice without judgment."
              color="#F5F3FF"
              onPress={() => { tapHaptic(); setActiveTool('body-scan'); }}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function toolTitle(tool: string): string {
  switch (tool) {
    case 'box-breathing': return 'Box Breathing';
    case 'five-senses': return '5-4-3-2-1 Senses';
    case 'body-scan': return 'Body Scan';
    default: return 'Grounding';
  }
}

function ToolCard({ icon, title, description, color, onPress }: { icon: React.ReactNode; title: string; description: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: color, borderRadius: 16, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ marginRight: 16 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 22 }}>{description}</Text>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </Pressable>
  );
}

function ToolContent({ tool, onDone }: { tool: string; onDone: () => void }) {
  switch (tool) {
    case 'box-breathing': return <BoxBreathing onDone={onDone} />;
    case 'five-senses': return <FiveSenses onDone={onDone} />;
    case 'body-scan': return <BodyScan onDone={onDone} />;
    default: return null;
  }
}

// ── Box Breathing ────────────────────────────────────────────────────────────

function BoxBreathing({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale');
  const [cycle, setCycle] = useState(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const runCycle = () => {
      setPhase('inhale');
      scale.value = withTiming(1.6, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      setTimeout(() => {
        setPhase('hold');
        setTimeout(() => {
          setPhase('exhale');
          scale.value = withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) });
          setTimeout(() => {
            setPhase('hold2');
            setTimeout(() => {
              setCycle((c) => c + 1);
            }, 4000);
          }, 4000);
        }, 4000);
      }, 4000);
    };
    runCycle();
    const interval = setInterval(runCycle, 16000);
    return () => clearInterval(interval);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const phaseLabel = { inhale: 'Breathe In', hold: 'Hold', exhale: 'Breathe Out', hold2: 'Hold' };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 40 }}>Cycle {cycle + 1}</Text>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            { width: 120, height: 120, borderRadius: 60, backgroundColor: '#BFDBFE', opacity: 0.6 },
            circleStyle,
          ]}
        />
        <View style={{ position: 'absolute' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E40AF', textAlign: 'center' }}>
            {phaseLabel[phase]}
          </Text>
          <Text style={{ fontSize: 14, color: '#3B82F6', textAlign: 'center', marginTop: 4 }}>
            4 seconds
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 40, textAlign: 'center' }}>
        Follow the circle with your breath
      </Text>
      <Pressable onPress={onDone} style={{ marginTop: 40, backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>I'm ready to save</Text>
      </Pressable>
    </View>
  );
}

// ── 5-4-3-2-1 Senses ─────────────────────────────────────────────────────────

function FiveSenses({ onDone }: { onDone: () => void }) {
  const steps = [
    { icon: <Eye size={28} color="#10B981" />, count: 5, sense: 'See', prompt: 'Look around. Name 5 things you can see right now.' },
    { icon: <Hand size={28} color="#10B981" />, count: 4, sense: 'Feel', prompt: 'Notice 4 things you can physically feel. Your clothes, the air, the ground.' },
    { icon: <Ear size={28} color="#10B981" />, count: 3, sense: 'Hear', prompt: 'Listen carefully. Name 3 sounds you can hear.' },
    { icon: <Flower2 size={28} color="#10B981" />, count: 2, sense: 'Smell', prompt: 'Breathe in. Notice 2 scents around you.' },
    { icon: <Coffee size={28} color="#10B981" />, count: 1, sense: 'Taste', prompt: 'What is 1 taste in your mouth right now?' },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ marginBottom: 16 }}>{step.icon}</View>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Step {currentStep + 1} of 5</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
          {step.count} things you {step.sense.toLowerCase()}
        </Text>
        <Text style={{ fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 22 }}>
          {step.prompt}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {currentStep > 0 && (
          <Pressable onPress={() => { tapHaptic(); setCurrentStep((s) => s - 1); }} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            tapHaptic();
            if (currentStep < steps.length - 1) {
              setCurrentStep((s) => s + 1);
            } else {
              onDone();
            }
          }}
          style={{ flex: 1, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
            {currentStep < steps.length - 1 ? 'Next' : "I'm grounded"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Body Scan ────────────────────────────────────────────────────────────────

function BodyScan({ onDone }: { onDone: () => void }) {
  const areas = [
    { name: 'Feet & Legs', prompt: 'Bring your attention to your feet. Notice any sensation — warmth, coolness, pressure, tingling, or nothing at all.' },
    { name: 'Stomach & Hips', prompt: 'Move your attention to your stomach area. Is it tight? Relaxed? Hungry? Just notice.' },
    { name: 'Chest & Heart', prompt: 'Notice your chest. Can you feel your heartbeat? Is there tightness or openness?' },
    { name: 'Shoulders & Arms', prompt: 'Check your shoulders and arms. Are they tense? Heavy? Light?' },
    { name: 'Throat & Neck', prompt: 'Bring attention to your throat and neck. Any tightness? Swallowing?' },
    { name: 'Face & Head', prompt: 'Finally, your face and head. Notice your jaw, forehead, eyes. Soften anything that feels tight.' },
  ];

  const [currentArea, setCurrentArea] = useState(0);
  const area = areas[currentArea];

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Area {currentArea + 1} of {areas.length}</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>{area.name}</Text>
        <Text style={{ fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 24 }}>{area.prompt}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {currentArea > 0 && (
          <Pressable onPress={() => { tapHaptic(); setCurrentArea((a) => a - 1); }} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            tapHaptic();
            if (currentArea < areas.length - 1) {
              setCurrentArea((a) => a + 1);
            } else {
              onDone();
            }
          }}
          style={{ flex: 1, backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
            {currentArea < areas.length - 1 ? 'Next area' : "I'm centered"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
