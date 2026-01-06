import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type Mood = {
  emoji: string;
  label: string;
  gradient: [string, string, string];
  message: string;
};

const moods: Mood[] = [
  {
    emoji: '😊',
    label: 'Happy',
    gradient: ['#FFD93D', '#FF9A3C', '#FF6B6B'],
    message: "You're radiating sunshine! ☀️",
  },
  {
    emoji: '😌',
    label: 'Calm',
    gradient: ['#667eea', '#764ba2', '#6B8DD6'],
    message: 'Inner peace is your superpower 🧘',
  },
  {
    emoji: '🔥',
    label: 'Energized',
    gradient: ['#f12711', '#f5af19', '#FF6B6B'],
    message: "You're unstoppable today! 💪",
  },
  {
    emoji: '😴',
    label: 'Tired',
    gradient: ['#2C3E50', '#4CA1AF', '#2C3E50'],
    message: 'Rest is productive too 🌙',
  },
  {
    emoji: '🤔',
    label: 'Thoughtful',
    gradient: ['#11998e', '#38ef7d', '#11998e'],
    message: 'Deep thoughts lead to big ideas 💡',
  },
  {
    emoji: '💜',
    label: 'Grateful',
    gradient: ['#834d9b', '#d04ed6', '#667eea'],
    message: 'Gratitude is the best attitude 🙏',
  },
];

export default function App() {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [showResult, setShowResult] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnims = useRef(moods.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Create floating animations for each mood button
    floatAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500 + index * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500 + index * 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);

    // Animate transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowResult(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleReset = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowResult(false);
      setSelectedMood(null);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  const currentGradient = selectedMood?.gradient || ['#1a1a2e', '#16213e', '#0f3460'];

  return (
    <LinearGradient colors={currentGradient} style={styles.container}>
      <StatusBar style="light" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {!showResult ? (
          <>
            <Text style={styles.title}>How are you feeling?</Text>
            <Text style={styles.subtitle}>Tap your vibe</Text>

            <View style={styles.moodGrid}>
              {moods.map((mood, index) => {
                const translateY = floatAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                });

                return (
                  <Animated.View
                    key={mood.label}
                    style={{ transform: [{ translateY }] }}
                  >
                    <TouchableOpacity
                      style={styles.moodButton}
                      onPress={() => handleMoodSelect(mood)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                      <Text style={styles.moodLabel}>{mood.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.resultContainer}>
            <Text style={styles.resultEmoji}>{selectedMood?.emoji}</Text>
            <Text style={styles.resultLabel}>
              Feeling {selectedMood?.label}
            </Text>
            <Text style={styles.resultMessage}>{selectedMood?.message}</Text>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <Text style={styles.footer}>Daily Vibe ✨</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 320,
  },
  moodButton: {
    width: 90,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultMessage: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 40,
  },
});
