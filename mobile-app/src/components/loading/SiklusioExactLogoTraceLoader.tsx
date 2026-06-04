import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  SIKLUSIO_CENTER_TAIL_PATH,
  SIKLUSIO_MAIN_LOOP_PATH,
  SIKLUSIO_PATH_LENGTHS,
  SIKLUSIO_RIGHT_LOOP_PATH,
  SIKLUSIO_TRACE_VIEWBOX,
} from "./siklusioLogoTracePaths";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type SiklusioExactLogoTraceLoaderProps = {
  size?: number;
  style?: ViewStyle;
};

export function SiklusioExactLogoTraceLoader({
  size = 260,
  style,
}: SiklusioExactLogoTraceLoaderProps) {
  const mainOffset = useRef(new Animated.Value(SIKLUSIO_PATH_LENGTHS.main)).current;
  const centerOffset = useRef(new Animated.Value(SIKLUSIO_PATH_LENGTHS.centerTail)).current;
  const rightOffset = useRef(new Animated.Value(SIKLUSIO_PATH_LENGTHS.right)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sparkOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const tracing = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(mainOffset, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.delay(360),
            Animated.timing(centerOffset, {
              toValue: 0,
              duration: 560,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }),
          ]),
          Animated.sequence([
            Animated.delay(650),
            Animated.timing(rightOffset, {
              toValue: 0,
              duration: 900,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: false,
            }),
          ]),
          Animated.sequence([
            Animated.timing(sparkOpacity, {
              toValue: 1,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }),
            Animated.timing(sparkOpacity, {
              toValue: 0.55,
              duration: 900,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: false,
            }),
          ]),
        ]),
        Animated.delay(420),
        Animated.parallel([
          Animated.timing(mainOffset, {
            toValue: SIKLUSIO_PATH_LENGTHS.main,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(centerOffset, {
            toValue: SIKLUSIO_PATH_LENGTHS.centerTail,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(rightOffset, {
            toValue: SIKLUSIO_PATH_LENGTHS.right,
            duration: 0,
            useNativeDriver: false,
          }),
          Animated.timing(sparkOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(160),
      ]),
    );

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    tracing.start();
    breathing.start();

    return () => {
      tracing.stop();
      breathing.stop();
    };
  }, [centerOffset, mainOffset, pulse, rightOffset, sparkOpacity]);

  const animatedStyle = useMemo(
    () => ({
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1.015],
          }),
        },
      ],
    }),
    [pulse],
  );

  return (
    <Animated.View style={[styles.root, { width: size, height: size }, animatedStyle, style]}>
      {/* The real PNG keeps the logo shape exact. Do not replace this with a hand-drawn vector approximation. */}
      <Image
        source={require("../../../assets/images/logo-siklusio-bg.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* SVG tracing overlay follows the logo centerline extracted from the real PNG. */}
      <Svg
        viewBox={SIKLUSIO_TRACE_VIEWBOX}
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient
            id="siklusioTraceGradient"
            x1="40"
            y1="256"
            x2="472"
            y2="256"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#ec4899" stopOpacity="1" />
            <Stop offset="0.48" stopColor="#9333ea" stopOpacity="1" />
            <Stop offset="1" stopColor="#14b8a6" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Path
          d={SIKLUSIO_MAIN_LOOP_PATH}
          fill="none"
          stroke="url(#siklusioTraceGradient)"
          strokeOpacity={0.18}
          strokeWidth={42}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={SIKLUSIO_CENTER_TAIL_PATH}
          fill="none"
          stroke="#9333ea"
          strokeOpacity={0.14}
          strokeWidth={42}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={SIKLUSIO_RIGHT_LOOP_PATH}
          fill="none"
          stroke="#14b8a6"
          strokeOpacity={0.15}
          strokeWidth={42}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <AnimatedPath
          d={SIKLUSIO_MAIN_LOOP_PATH}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={sparkOpacity}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${SIKLUSIO_PATH_LENGTHS.main * 0.14} ${SIKLUSIO_PATH_LENGTHS.main}`}
          strokeDashoffset={mainOffset}
        />
        <AnimatedPath
          d={SIKLUSIO_CENTER_TAIL_PATH}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={sparkOpacity}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${SIKLUSIO_PATH_LENGTHS.centerTail * 0.52} ${SIKLUSIO_PATH_LENGTHS.centerTail}`}
          strokeDashoffset={centerOffset}
        />
        <AnimatedPath
          d={SIKLUSIO_RIGHT_LOOP_PATH}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={sparkOpacity}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${SIKLUSIO_PATH_LENGTHS.right * 0.24} ${SIKLUSIO_PATH_LENGTHS.right}`}
          strokeDashoffset={rightOffset}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "90%",
    height: "90%",
  },
});
