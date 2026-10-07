import { ClerkProvider, useAuth, useClerk } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack } from "expo-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";

export default function RootLayout() {
  const ready =
    !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.EXPO_PUBLIC_CONVEX_URL;
  return ready ? <Providers /> : <SetupRequired />;
}

function Providers() {
  const convex = useMemo(
    () =>
      new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
        unsavedChangesWarning: false,
      }),
    []
  );

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RootNavigator />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function RootNavigator() {
  const { isSignedIn } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontWeight: "400",
          fontSize: 20,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
        statusBarStyle: "dark",
      }}
    >
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen
          name="index"
          options={{
            title: "DiaryNotes",
            headerRight: () => <SignOutButton />,
          }}
        />
        <Stack.Screen name="editor" options={{ title: "Edit note" }} />
        <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <Pressable onPress={() => void signOut()} hitSlop={8}>
      <Text style={styles.signOutText}>Sign out</Text>
    </Pressable>
  );
}

function SetupRequired() {
  return (
    <View style={[styles.center, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.message, { color: colors.muted }]}>
        Setup required. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local,
        then run `npx convex dev` to create EXPO_PUBLIC_CONVEX_URL.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink,
    paddingHorizontal: 4,
  },
});
