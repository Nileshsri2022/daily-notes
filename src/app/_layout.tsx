import { ClerkProvider, useAuth, useClerk } from "@clerk/clerk-expo"; // retained for production
import { NoClerkProvider } from "@/theme/NoClerkProvider";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack, useRouter } from "expo-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { verifyInstallation } from "nativewind";
import { colors } from "@/constants/theme";
import "../global.css";
import { FontProvider } from "@/theme/FontProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { styles } from "@/styles/layout.styles";

export default function RootLayout() {
  const ready =
    !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.EXPO_PUBLIC_CONVEX_URL;
  const isDev = process.env.EXPO_PUBLIC_APP_ENV !== "prod";
  const devBypassAuth = isDev && process.env.EXPO_PUBLIC_BYPASS_AUTH !== "false";
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
          <SidebarProvider>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: colors.canvas,
                  // @ts-ignore border for web
                  borderBottomWidth: 1,
                  borderBottomColor: colors.hairline,
                },
                headerTintColor: colors.ink,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.canvas },
                statusBarStyle: "dark",
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  title: "Dincharya",
                  headerLeft: () => <SidebarTrigger style={{ marginRight: 12 }} />,
                  headerRight:
                    Platform.OS === "web"
                      ? () => (
                          <View style={styles.headerActions}>
                            <HeaderTrashButton />
                          </View>
                        )
                      : undefined,
                }}
              />
              <Stack.Screen name="editor" options={{ title: "Edit note" }} />
              <Stack.Screen name="ai-note" options={{ title: "AI Voice Note" }} />
              <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
              <Stack.Screen name="trash" options={{ title: "Trash" }} />
            </Stack>
          </SidebarProvider>
        </FontProvider>
      </ConvexProvider>
    </NoClerkProvider>
  );
}


function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SidebarProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.canvas,
            // @ts-ignore border for web
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
          },
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
              title: "Dincharya",
              headerLeft: () => <SidebarTrigger style={{ marginRight: 12 }} />,
              headerRight:
                Platform.OS === "web"
                  ? () => (
                      <View style={styles.headerActions}>
                        <HeaderTrashButton />
                        <SignOutButton />
                      </View>
                    )
                  : undefined,
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
    </SidebarProvider>
  );
}

function HeaderTrashButton() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={() => router.push("/trash")}
      accessibilityRole="button"
      accessibilityLabel="Open Trash"
      // @ts-ignore web-only
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web-only
      onMouseLeave={() => setHovered(false)}
      style={({ pressed }) => [
        styles.headerBtn,
        hovered && styles.headerBtnHover,
        pressed && styles.headerBtnPressed,
      ]}
    >
      <Text style={styles.headerBtnIcon}>🗑️</Text>
      <Text style={styles.headerBtnText}>Trash</Text>
    </Pressable>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={() => void signOut()}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      // @ts-ignore web-only
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web-only
      onMouseLeave={() => setHovered(false)}
      style={({ pressed }) => [
        styles.headerBtn,
        styles.signOutBtn,
        hovered && styles.signOutBtnHover,
        pressed && styles.headerBtnPressed,
      ]}
    >
      <Text style={styles.headerBtnIcon}>🚪</Text>
      <Text style={[styles.headerBtnText, styles.signOutText]}>Sign out</Text>
    </Pressable>
  );
}

function SetupRequired() {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>
        Setup required. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL in .env.
      </Text>
    </View>
  );
}
