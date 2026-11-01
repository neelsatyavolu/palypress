import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordGuidance } from "@/components/PasswordGuidance";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { validatePassword } from "@/lib/passwordPolicy";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type AuthScreen =
  | "initial"
  | "email-signin"
  | "email-signup"
  | "forgot-password"
  | "reset-password"
  | "verify"
  | "2fa";

export default function SignInScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === "web";
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    verify2FA,
  } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmNewPasswordVisible, setIsConfirmNewPasswordVisible] =
    useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === "ios");
  const [authWidth, setAuthWidth] = useState(0);

  const openLegalPage = (path: "/terms" | "/privacy") => {
    navigation.navigate("Legal", {
      document: path === "/terms" ? "terms" : "privacy",
    });
  };

  const legalAgreement = (
    <View style={styles.agreementRow}>
      <Pressable
        onPress={() => setAgreedToTerms((agreed) => !agreed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreedToTerms }}
        accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
        hitSlop={8}
        disabled={isLoading}
      >
        <Feather
          name={agreedToTerms ? "check-square" : "square"}
          size={20}
          color={
            agreedToTerms
              ? theme.link
              : isDark
                ? "rgba(255,255,255,0.55)"
                : "#666"
          }
        />
      </Pressable>
      <ThemedText
        style={[
          styles.agreementText,
          { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
        ]}
      >
        I agree to the{" "}
        <ThemedText
          style={[styles.agreementLink, { color: theme.link }]}
          onPress={() => openLegalPage("/terms")}
        >
          Terms of Service
        </ThemedText>{" "}
        and{" "}
        <ThemedText
          style={[styles.agreementLink, { color: theme.link }]}
          onPress={() => openLegalPage("/privacy")}
        >
          Privacy Policy
        </ThemedText>
      </ThemedText>
    </View>
  );

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setAppleAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setAppleAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmNewPasswordVisible(false);
  }, [screen]);

  const handleAppleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const result = await signInWithApple();
    setIsLoading(false);

    if (result.success && result.requires2FA) {
      setScreen("2fa");
      return;
    }

    if (!result.success) {
      if (result.error !== "Sign in was cancelled") {
        Alert.alert("Error", result.error || "Failed to sign in");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const result = await signInWithGoogle();
    setIsLoading(false);

    if (result.success && result.requires2FA) {
      setScreen("2fa");
      return;
    }

    if (!result.success) {
      if (result.error !== "Sign in was cancelled") {
        Alert.alert("Error", result.error || "Failed to sign in");
      }
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    setIsLoading(true);
    const result = await signInWithEmail(email, password);
    setIsLoading(false);

    if (result.success && result.requires2FA) {
      setScreen("2fa");
      return;
    }

    if (!result.success) {
      if (result.emailVerified === false) {
        setPendingEmail(email);
        setScreen("verify");
        Alert.alert(
          "Email Not Verified",
          "Please check your email for the verification code",
        );
      } else {
        Alert.alert("Error", result.error || "Failed to sign in");
      }
    }
  };

  const handle2FAVerification = async () => {
    if (!twoFactorCode) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setIsLoading(true);
    const result = await verify2FA(twoFactorCode, isUsingBackupCode);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert("Error", result.error || "Invalid verification code");
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert("Error", passwordValidation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!agreedToTerms) {
      Alert.alert(
        "Agreement Required",
        "Please agree to the Terms of Service and Privacy Policy to continue",
      );
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail(
      email,
      password,
      displayName,
      agreedToTerms,
    );
    setIsLoading(false);

    if (result.success) {
      setPendingEmail(email);
      setScreen("verify");
      Alert.alert(
        "Check Your Email",
        "Please check your email for a verification code",
      );
    } else {
      Alert.alert("Error", result.error || "Failed to create account");
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    const result = await verifyEmail(verificationCode);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to verify email");
    }
  };

  const handleResendCode = async () => {
    if (!pendingEmail) {
      Alert.alert("Error", "No email address found");
      return;
    }

    setIsLoading(true);
    const result = await resendVerificationEmail(pendingEmail);
    setIsLoading(false);

    if (result.success) {
      Alert.alert("Success", "Verification code sent to your email");
    } else {
      Alert.alert("Error", result.error || "Failed to resend code");
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setIsLoading(true);
    const result = await requestPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setPendingEmail(email);
      setNewPassword("");
      setConfirmNewPassword("");
      setScreen("reset-password");
      Alert.alert(
        "Check Your Email",
        "If your account has a password, a reset code has been sent.",
      );
    } else {
      Alert.alert("Error", result.error || "Failed to send reset code");
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || resetCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit reset code");
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please enter and confirm your new password");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert("Error", passwordValidation.errors[0]);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(resetCode, newPassword);
    setIsLoading(false);

    if (result.success) {
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetCode("");
      setScreen("email-signin");
      Alert.alert(
        "Password Reset",
        "You can now sign in with your new password.",
      );
    } else {
      Alert.alert("Error", result.error || "Failed to reset password");
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setVerificationCode("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setConfirmNewPassword("");
    setPendingEmail("");
    setScreen("initial");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {screen === "initial" ? (
          <View
            style={[
              styles.scrollContent,
              {
                flex: 1,
                justifyContent: "center",
                paddingTop: headerHeight + Spacing["2xl"],
                paddingBottom: tabBarHeight + Spacing.xl,
              },
            ]}
          >
            <View style={styles.headerSection}>
              <View
                style={[
                  styles.logoContainer,
                  { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
                ]}
              >
                <Feather name="book-open" size={48} color={theme.link} />
              </View>

              <ThemedText style={styles.title}>The PALY App</ThemedText>
              <ThemedText
                style={[
                  styles.subtitle,
                  { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                ]}
              >
                Your Paly student journalism hub
              </ThemedText>
            </View>

            <View style={styles.featuresSection}>
              <FeatureItem
                icon="file-text"
                text="Student Journalism"
                isDark={isDark}
                theme={theme}
              />
            </View>

            <View
              style={styles.authSection}
              onLayout={(event) =>
                setAuthWidth(event.nativeEvent.layout.width)
              }
            >
              <ThemedText style={styles.authTitle}>Get Started</ThemedText>
              <ThemedText
                style={[
                  styles.authSubtitle,
                  { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                ]}
              >
                Choose how you&apos;d like to sign in
              </ThemedText>

              {appleAvailable ? (
                <View collapsable={false}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      isDark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle
                            .WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle
                            .BLACK
                    }
                    cornerRadius={BorderRadius.md}
                    style={[
                      styles.appleButton,
                      authWidth ? { width: authWidth } : null,
                    ]}
                    onPress={handleAppleSignIn}
                  />
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: "#fff",
                    borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                  },
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#4285F4" />
                ) : (
                  <>
                    <Image
                      source={{
                        uri: "https://developers.google.com/identity/images/g-logo.png",
                      }}
                      style={styles.googleLogo}
                      contentFit="contain"
                    />
                    <ThemedText style={styles.googleButtonText}>
                      Sign in with Google
                    </ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.emailButton,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#fff",
                    borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                  },
                ]}
                onPress={() => setScreen("email-signin")}
                disabled={isLoading}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={theme.text}
                  style={{ marginRight: Spacing.sm }}
                />
                <ThemedText style={styles.emailButtonText}>
                  {isWeb ? "Continue with Email" : "Sign in with Email"}
                </ThemedText>
              </Pressable>

              <View style={styles.signupPrompt}>
                <ThemedText
                  style={[
                    styles.signupPromptText,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Do not have an account?{" "}
                </ThemedText>
                <Pressable onPress={() => setScreen("email-signup")}>
                  <ThemedText
                    style={[styles.signupLink, { color: theme.link }]}
                  >
                    Sign up
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText
                style={[
                  styles.legalHint,
                  { color: isDark ? "rgba(255,255,255,0.5)" : "#888" },
                ]}
              >
                By continuing, you agree to our{" "}
                <ThemedText
                  style={[styles.legalHintLink, { color: theme.link }]}
                  onPress={() => openLegalPage("/terms")}
                >
                  Terms of Service
                </ThemedText>{" "}
                and{" "}
                <ThemedText
                  style={[styles.legalHintLink, { color: theme.link }]}
                  onPress={() => openLegalPage("/privacy")}
                >
                  Privacy Policy
                </ThemedText>
              </ThemedText>
            </View>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: headerHeight + Spacing["2xl"],
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.authSection}
            onLayout={(event) =>
              setAuthWidth(event.nativeEvent.layout.width)
            }
          >
            {screen === "email-signin" && (
              <>
                <Pressable
                  style={styles.backButton}
                  onPress={resetForm}
                  disabled={isLoading}
                >
                  <Feather
                    name="arrow-left"
                    size={20}
                    color={theme.link}
                    style={{ marginRight: Spacing.xs }}
                  />
                  <ThemedText style={[{ color: theme.link }]}>Back</ThemedText>
                </Pressable>

                <ThemedText style={styles.authTitle}>Sign In</ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Enter your email and password
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="Password"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.3)" : "#999"
                    }
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    hitSlop={8}
                  >
                    <Feather
                      name={isPasswordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.55)" : "#666"}
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Sign In
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={() => {
                    setPassword("");
                    setScreen("forgot-password");
                  }}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[styles.textButtonText, { color: theme.link }]}
                  >
                    Forgot password?
                  </ThemedText>
                </Pressable>

                <View style={styles.signupPrompt}>
                  <ThemedText
                    style={[
                      styles.signupPromptText,
                      { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                    ]}
                  >
                    Do not have an account?{" "}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setPassword("");
                      setConfirmPassword("");
                      setScreen("email-signup");
                    }}
                  >
                    <ThemedText
                      style={[styles.signupLink, { color: theme.link }]}
                    >
                      Sign up
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}

            {screen === "forgot-password" && (
              <>
                <Pressable
                  style={styles.backButton}
                  onPress={() => setScreen("email-signin")}
                  disabled={isLoading}
                >
                  <Feather
                    name="arrow-left"
                    size={20}
                    color={theme.link}
                    style={{ marginRight: Spacing.xs }}
                  />
                  <ThemedText style={[{ color: theme.link }]}>Back</ThemedText>
                </Pressable>

                <ThemedText style={styles.authTitle}>Reset Password</ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Enter your email to get a reset code
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handleRequestPasswordReset}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Send Reset Code
                    </ThemedText>
                  )}
                </Pressable>
              </>
            )}

            {screen === "reset-password" && (
              <>
                <ThemedText style={styles.authTitle}>
                  Enter Reset Code
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Enter the 6-digit code sent to {pendingEmail}
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                      textAlign: "center",
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: "600",
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                />

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="New password"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.3)" : "#999"
                    }
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!isNewPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() =>
                      setIsNewPasswordVisible((visible) => !visible)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      isNewPasswordVisible ? "Hide password" : "Show password"
                    }
                    hitSlop={8}
                  >
                    <Feather
                      name={isNewPasswordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.55)" : "#666"}
                    />
                  </Pressable>
                </View>

                <PasswordGuidance
                  password={newPassword}
                  style={styles.passwordGuidance}
                />

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.3)" : "#999"
                    }
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry={!isConfirmNewPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() =>
                      setIsConfirmNewPasswordVisible((visible) => !visible)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      isConfirmNewPasswordVisible
                        ? "Hide password"
                        : "Show password"
                    }
                    hitSlop={8}
                  >
                    <Feather
                      name={isConfirmNewPasswordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.55)" : "#666"}
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Reset Password
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={handleRequestPasswordReset}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[styles.textButtonText, { color: theme.link }]}
                  >
                    Resend Code
                  </ThemedText>
                </Pressable>
              </>
            )}

            {screen === "email-signup" && (
              <>
                <Pressable
                  style={styles.backButton}
                  onPress={resetForm}
                  disabled={isLoading}
                >
                  <Feather
                    name="arrow-left"
                    size={20}
                    color={theme.link}
                    style={{ marginRight: Spacing.xs }}
                  />
                  <ThemedText style={[{ color: theme.link }]}>Back</ThemedText>
                </Pressable>

                <ThemedText style={styles.authTitle}>Sign Up</ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Create your account
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                    },
                  ]}
                  placeholder="Display Name"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="Password"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.3)" : "#999"
                    }
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    hitSlop={8}
                  >
                    <Feather
                      name={isPasswordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.55)" : "#666"}
                    />
                  </Pressable>
                </View>

                <PasswordGuidance
                  password={password}
                  style={styles.passwordGuidance}
                />

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="Confirm password"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.3)" : "#999"
                    }
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!isConfirmPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() =>
                      setIsConfirmPasswordVisible((visible) => !visible)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      isConfirmPasswordVisible
                        ? "Hide password"
                        : "Show password"
                    }
                    hitSlop={8}
                  >
                    <Feather
                      name={isConfirmPasswordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={isDark ? "rgba(255,255,255,0.55)" : "#666"}
                    />
                  </Pressable>
                </View>

                {legalAgreement}

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handleEmailSignUp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Sign Up
                    </ThemedText>
                  )}
                </Pressable>

                <View style={styles.signupPrompt}>
                  <ThemedText
                    style={[
                      styles.signupPromptText,
                      { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                    ]}
                  >
                    Already have an account?{" "}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setDisplayName("");
                      setPassword("");
                      setConfirmPassword("");
                      setScreen("email-signin");
                    }}
                  >
                    <ThemedText
                      style={[styles.signupLink, { color: theme.link }]}
                    >
                      Sign in
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}

            {screen === "verify" && (
              <>
                <ThemedText style={styles.authTitle}>
                  Verify Your Email
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  Enter the 6-digit code sent to {pendingEmail}
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                      textAlign: "center",
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: "600",
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handleVerifyEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Verify Email
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={handleResendCode}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[styles.textButtonText, { color: theme.link }]}
                  >
                    Resend Code
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={resetForm}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[
                      styles.textButtonText,
                      { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                    ]}
                  >
                    Back to Sign In
                  </ThemedText>
                </Pressable>
              </>
            )}

            {screen === "2fa" && (
              <>
                <ThemedText style={styles.authTitle}>
                  Two-Factor Authentication
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authSubtitle,
                    { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                  ]}
                >
                  {isUsingBackupCode
                    ? "Enter one of your backup codes"
                    : "Enter the code from your authenticator app"}
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      color: theme.text,
                      textAlign: "center",
                      fontSize: isUsingBackupCode ? 18 : 24,
                      letterSpacing: isUsingBackupCode ? 2 : 8,
                      fontWeight: "600",
                    },
                  ]}
                  placeholder={isUsingBackupCode ? "XXXXXXXX" : "000000"}
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.3)" : "#999"
                  }
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  keyboardType={isUsingBackupCode ? "default" : "number-pad"}
                  maxLength={isUsingBackupCode ? 8 : 6}
                  autoCapitalize={isUsingBackupCode ? "characters" : "none"}
                  autoComplete="one-time-code"
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={handle2FAVerification}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Verify
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={() => {
                    setIsUsingBackupCode(!isUsingBackupCode);
                    setTwoFactorCode("");
                  }}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[styles.textButtonText, { color: theme.link }]}
                  >
                    {isUsingBackupCode
                      ? "Use authenticator code"
                      : "Use backup code"}
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.textButton}
                  onPress={resetForm}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[
                      styles.textButtonText,
                      { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                    ]}
                  >
                    Back to Sign In
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText
              style={[
                styles.footerText,
                { color: isDark ? "rgba(255,255,255,0.4)" : "#999" },
              ]}
            >
              By signing in, you agree to the app&apos;s terms of service
            </ThemedText>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function FeatureItem({
  icon,
  text,
  isDark,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  isDark: boolean;
  theme: { text: string; link: string };
}) {
  return (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIconContainer,
          { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0" },
        ]}
      >
        <Feather name={icon} size={18} color={theme.link} />
      </View>
      <ThemedText style={styles.featureText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  headerSection: {
    alignItems: "center",
    paddingTop: Spacing["2xl"],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  featuresSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
  },
  authSection: {
    width: "100%",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    alignSelf: "flex-start",
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  appleButton: {
    width: "100%",
    height: 56,
    marginBottom: Spacing.md,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: Spacing.sm,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  signupPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  signupPromptText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  agreementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  agreementLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  passwordInputContainer: {
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    fontSize: 16,
  },
  passwordToggle: {
    width: 48,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  passwordGuidance: {
    marginBottom: Spacing.md,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  textButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  domainHint: {
    fontSize: 13,
    textAlign: "center",
  },
  legalHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  legalHintLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
  },
});
