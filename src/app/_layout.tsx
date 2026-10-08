import { ClerkProvider, useAuth, useClerk } from "@clerk/clerk-expo"; // retained for production
import { NoClerkProvider } from "@/theme/NoClerkProvider";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack, useRouter } from "expo-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { verifyInstallation } from "nativewind";
import { colors } from "@/constants/theme";
import "../global.css";
import { FontProvider } from '@/theme/FontProvider';

export default function RootLayout() {
  const ready =
    !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.EXPO_PUBLIC_CONVEX_URL;
  const devBypassAuth = true; // set true to disable Clerk for local testing
  return ready ? (devBypassAuth ? <DevProviders /> : <Providers />) : <SetupRequired />;
}

function Providers() {
  useEffect(() => {
    verifyInstallation();
  }, []);

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
        <FontProvider>
          <RootNavigator />
        </FontProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function DevProviders() {
  const convex = useMemo(
    () =>
      new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
        unsavedChangesWarning: false,
      }),
    []
  );

  return (
    <NoClerkProvider>
      <ConvexProvider client={convex}>
        <FontProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.canvas },
              headerTintColor: colors.ink,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.canvas },
              statusBarStyle: "dark",
            }}
          >
            <Stack.Screen name="index" options={{ title: "DiaryNotes" }} />
            <Stack.Screen name="editor" options={{ title: "Edit note" }} />
            <Stack.Screen name="ai-note" options={{ title: "AI Voice Note" }} />
            <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
            <Stack.Screen name="trash" options={{ title: "Trash" }} />
          </Stack>
        </FontProvider>
      </ConvexProvider>
    </NoClerkProvider>
  );
}


function RootNavigator() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
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
            headerRight: () => (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push("/trash")}
                  style={styles.headerAction}
                >
                  <Text style={styles.headerLink}>Trash</Text>
                </Pressable>
                <SignOutButton />
              </View>
            ),
          }}
        />
        <Stack.Screen name="editor" options={{ title: "Edit note" }} />
        <Stack.Screen name="ai-note" options={{ title: "AI Voice Note" }} />
        <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
        <Stack.Screen name="trash" options={{ title: "Trash" }} />
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
    <Pressable
      onPress={() => void signOut()}
      style={styles.headerAction}
    >
      <Text style={[styles.headerLink, { color: colors.ink }]}>Sign out</Text>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  headerAction: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },
});
