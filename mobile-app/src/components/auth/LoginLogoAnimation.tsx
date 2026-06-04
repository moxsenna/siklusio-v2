import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";

export function LoginLogoAnimation() {
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0.84)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.38)).current;

  const shimmerX = useRef(new Animated.Value(-130)).current;

  useEffect(() => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.96,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.86,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.28,
            duration: 1900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 1900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.38,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: 185,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(shimmerX, {
          toValue: -130,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimation.start();
    rotateAnimation.start();
    glowAnimation.start();
    shimmerAnimation.start();

    return () => {
      breathingAnimation.stop();
      rotateAnimation.stop();
      glowAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [glowOpacity, glowScale, opacity, rotate, scale, shimmerX, translateY]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-2deg", "2deg"],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.rippleGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity,
            transform: [
              { translateY },
              { scale },
              { rotate: rotateInterpolate },
            ],
          },
        ]}
      >
        <Image
          source={require("../../../assets/images/logo-siklusio-bg.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            {
              transform: [
                { translateX: shimmerX },
                { rotate: "18deg" },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 240,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  logoContainer: {
    width: 224,
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  logo: {
    width: 224,
    height: 145,
  },

  rippleGlow: {
    position: "absolute",
    width: 210,
    height: 132,
    borderRadius: 999,
    backgroundColor: "rgba(236, 72, 153, 0.16)",
    shadowColor: "#ec4899",
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: {
      width: 0,
      height: 12,
    },
  },

  shimmer: {
    position: "absolute",
    width: 42,
    height: 210,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    opacity: 0.65,
  },
});
