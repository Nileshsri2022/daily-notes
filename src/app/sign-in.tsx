import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { themeVars } from "@/theme/theme-provider";
import { colors, spacing, type } from "@/constants/theme";


export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const {
    signIn,
    setActive: setSignInSession,
    isLoaded: signInLoaded,
  } = useSignIn();
  const {
    signUp,
    setActive: setSignUpSession,
    isLoaded: signUpLoaded,
  } = useSignUp();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [secondFactor, setSecondFactor] = useState<
    "totp" | "phone_code" | "email_code" | "backup_code" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn]);

  const submit = async () => {
    if (busy) return;

    if (!signInLoaded || !signUpLoaded) {
      setError("Connecting to authentication service... Please try again in a moment.");
      return;
    }

    Keyboard.dismiss();
    setError("");

    if (pendingVerification || secondFactor) {
      if (!code.trim()) {
        setError("Please enter the verification code.");
        return;
      }
    } else {
      if (!email.trim()) {
        setError("Please enter your email.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }
    }

    setBusy(true);

    try {
      if (mode === "sign-in" && secondFactor) {
        const result = await signIn.attemptSecondFactor({
          strategy: secondFactor,
          code: code.trim(),
        });
        if (result.status === "complete") {
          await setSignInSession({ session: result.createdSessionId });
          router.replace("/");
          return;
        } else {
          setError(`Sign-in is not complete (status: ${result.status}).`);
        }
        return;
      }

      if (mode === "sign-in") {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === "complete") {
          await setSignInSession({ session: result.createdSessionId });
          router.replace("/");
          return;
        } else if (result.status === "needs_second_factor") {
          const factors = (signIn.supportedSecondFactors ?? []) as {
            strategy: string;
          }[];
          const has = (name: string) => factors.some((f) => f.strategy === name);
          const strategy = has("totp")
            ? ("totp" as const)
            : has("phone_code")
              ? ("phone_code" as const)
              : has("email_code")
                ? ("email_code" as const)
                : has("backup_code")
                  ? ("backup_code" as const)
                  : null;
          if (!strategy) {
            setError(
              "Two-step verification is required, but no supported method is available."
            );
            return;
          }
          if (strategy === "phone_code" || strategy === "email_code") {
            await signIn.prepareSecondFactor({ strategy });
          }
          setSecondFactor(strategy);
          setCode("");
        } else if (result.status === "needs_first_factor") {
          const factors = (signIn.supportedFirstFactors ?? []) as {
            strategy: string;
            emailAddressId?: string;
          }[];
          const emailFactor = factors.find((f) => f.strategy === "email_code");
          if (emailFactor?.emailAddressId) {
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });
            setSecondFactor("email_code");
            setCode("");
          } else {
            setError(`Additional verification required (status: ${result.status}).`);
          }
        } else {
          setError(`Sign-in is not complete (status: ${result.status}).`);
        }
        return;
      }

      if (!pendingVerification) {
        await signUp.create({ emailAddress: email.trim(), password });
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setPendingVerification(true);
        setCode("");
      } else {
        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (result.status === "complete") {
          await setSignUpSession({ session: result.createdSessionId });
          router.replace("/");
          return;
        } else {
          setError(`Verification is not complete (status: ${result.status}).`);
        }
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError("");
    setPendingVerification(false);
    setSecondFactor(null);
    setCode("");
  };

  const cancelVerification = () => {
    setSecondFactor(null);
    setPendingVerification(false);
    setCode("");
    setError("");
  };

  const buttonLabel = secondFactor
    ? busy
      ? "Verifying…"
      : "Verify"
    : pendingVerification
      ? busy
        ? "Verifying…"
        : "Verify code"
      : mode === "sign-in"
        ? busy
          ? "Signing in…"
          : "Sign in"
        : busy
          ? "Creating account…"
          : "Create account";

  return (
    <SafeAreaView style={[themeVars, { flex: 1, backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[type.displayLg, styles.title]}>Dincharya</Text>
          <Text style={[type.bodySm, styles.subtitle]}>
            {pendingVerification
              ? `Enter the code we sent to ${email.trim()}`
              : secondFactor === "totp"
                ? "Enter the 6-digit code from your authenticator app"
                : secondFactor === "backup_code"
                  ? "Enter one of your backup codes"
                  : secondFactor
                    ? "Enter the code we sent you"
                    : mode === "sign-in"
                      ? "Sign in to your notes"
                      : "Create your account"}
          </Text>

          {pendingVerification || secondFactor ? (
            <Input
              className="mb-3"
              placeholder={
                secondFactor === "backup_code" ? "Backup code" : "Verification code"
              }
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              keyboardType={
                secondFactor === "backup_code" ? "default" : "number-pad"
              }
            />
          ) : (
            <>
              <Input
                className="mb-3"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              <Input
                className="mb-3"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          {error ? (
            <Text style={{ color: colors.error, fontSize: 13, marginBottom: spacing.sm }}>
              {error}
            </Text>
          ) : null}

          {/* Container for Clerk's Smart CAPTCHA on web (nativeID -> id attr).
              Without it Clerk falls back to Invisible CAPTCHA with a console warning. */}
          <View nativeID="clerk-captcha" />

          <Button
            className="mb-4"
            onPress={submit}
            disabled={busy || !signInLoaded || !signUpLoaded}
            loading={busy}
            title={buttonLabel}
          />

          {secondFactor || pendingVerification ? (
            <Pressable onPress={cancelVerification} style={{ paddingVertical: 8 }}>
              <Text
                style={{
                  textAlign: "center",
                  color: colors.muted,
                  fontSize: 13,
                }}
              >
                ← Back to {mode === "sign-in" ? "sign in" : "sign up"}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={switchMode} style={{ paddingVertical: 8 }}>
              <Text
                style={{
                  textAlign: "center",
                  color: colors.primary,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {mode === "sign-in"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: { textAlign: "center", marginBottom: spacing.xs },
  subtitle: { textAlign: "center", marginBottom: spacing.lg },
});
