import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/src/theme/useColorScheme";
import { useAuth } from "@/src/context/AuthContext";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 38, width: "100%" }}>
      {props.focused && (
        <View
          style={{
            position: "absolute",
            top: -10,
            width: 36,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: "#ec4899",
          }}
        />
      )}
      <FontAwesome
        size={props.focused ? 24 : 22}
        name={props.name}
        color={props.color}
        style={{ marginTop: props.focused ? 0 : 2 }}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { session, isLoading } = useAuth();
  const activeColor = Colors[colorScheme ?? "light"].tint;
  const inactiveColor = colorScheme === "dark" ? "#64748b" : "#94a3b8";

  // Tambah padding bottom dinamis: minimal 14px, atau ikuti safe area inset
  const bottomPadding = Math.max(insets.bottom, 14);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [isLoading, session]);

  if (isLoading || !session) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf2f8",
        }}
      >
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        animation: "none",
        tabBarStyle: {
          height: 70 + bottomPadding,
          backgroundColor: colorScheme === "dark" ? "#0f172a" : "#ffffff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 0,
          borderColor: colorScheme === "dark" ? "#1e293b" : "#f1f5f9",
          paddingTop: 8,
          paddingBottom: bottomPadding,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
          paddingBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="heart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Kalender",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Kebiasaan",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="list-ul" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Komunitas",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="users" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
