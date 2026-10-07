import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ClerkError = { errors?: { longMessage?: string; message?: string }[] };

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn]);

  const submit = async () => {
    if (!signInLoaded || !signUpLoaded || busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "sign-in") {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status === "complete") {
          await setSignInSession({ session: result.createdSessionId });
        } else {
          setError(`Sign-in is not complete (status: ${result.status}).`);
          setBusy(false);
        }
        return;
      }

      if (!pendingVerification) {
        await signUp.create({ emailAddress: email.trim(), password });
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setPendingVerification(true);
        setBusy(false);
      } else {
        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (result.status === "complete") {
          await setSignUpSession({ session: result.createdSessionId });
        } else {
          setError(`Verification is not complete (status: ${result.status}).`);
          setBusy(false);
        }
      }
    } catch (err) {
      const clerkErr = err as ClerkError;
      setError(
        clerkErr.errors?.[0]?.longMessage ??
          clerkErr.errors?.[0]?.message ??
          "Something went wrong. Please try again."
      );
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError("");
    setPendingVerification(false);
  };

  const buttonLabel = pendingVerification
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>DiaryNotes</Text>
          <Text style={styles.subtitle}>
            {pendingVerification
              ? `Enter the code we sent to ${email.trim()}`
              : mode === "sign-in"
                ? "Sign in to your notes"
                : "Create your account"}
          </Text>

          {pendingVerification ? (
            <TextInput
              style={styles.input}
              placeholder="Verification code"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              keyboardType="number-pad"
            />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Container for Clerk's Smart CAPTCHA on web (nativeID -> id attr).
              Without it Clerk falls back to Invisible CAPTCHA with a console warning. */}
          <View nativeID="clerk-captcha" />

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>

          <Pressable onPress={switchMode}>
            <Text style={styles.link}>
              {mode === "sign-in"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: "#c0392b",
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1a8917",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#1a8917", fontSize: 14 },
});
