import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordGuidance } from "@/components/PasswordGuidance";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { validatePassword } from "@/lib/passwordPolicy";

export default function SecuritySettingsScreen() {
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const {
    user,
    setPassword,
    setup2FA,
    verify2FASetup,
    disable2FA,
    deleteAccount,
    refreshUser,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Password state
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // 2FA setup state
  const [is2FASetupModalVisible, setIs2FASetupModalVisible] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "backup">("qr");

  // 2FA disable state
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [requiresCurrentPassword, setRequiresCurrentPassword] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser]),
  );

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";
  const inputBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.02)";

  const hasPassword = user?.hasPassword ?? false;
  const showCurrentPasswordField = hasPassword || requiresCurrentPassword;

  const handleSetPassword = async () => {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert("Error", passwordValidation.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (showCurrentPasswordField && !currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    setIsPasswordLoading(true);
    const result = await setPassword(
      newPassword,
      showCurrentPasswordField ? currentPassword : undefined,
    );
    setIsPasswordLoading(false);

    if (result.success) {
      Alert.alert("Success", "Password updated successfully");
      setIsSettingPassword(false);
      setRequiresCurrentPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else if (
      result.error === "Current password is required to change password"
    ) {
      setRequiresCurrentPassword(true);
      Alert.alert(
        "Current password required",
        "Your account already has a password. Enter your current password to change it.",
      );
    } else {
      Alert.alert("Error", result.error || "Failed to set password");
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;

    await Clipboard.setStringAsync(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleStart2FASetup = async () => {
    setIs2FALoading(true);
    const result = await setup2FA();
    setIs2FALoading(false);

    if (
      result.success &&
      result.qrCode &&
      result.secret &&
      result.backupCodes
    ) {
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setSetupStep("qr");
      setIs2FASetupModalVisible(true);
    } else {
      Alert.alert("Error", result.error || "Failed to setup 2FA");
    }
  };

  const handleVerify2FASetup = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit code");
      return;
    }

    setIs2FALoading(true);
    const result = await verify2FASetup(verificationCode);
    setIs2FALoading(false);

    if (result.success) {
      setSetupStep("backup");
    } else {
      Alert.alert("Error", result.error || "Invalid verification code");
    }
  };

  const handleFinish2FASetup = () => {
    Alert.alert(
      "Success",
      "Two-factor authentication has been enabled successfully",
    );
    setIs2FASetupModalVisible(false);
    setVerificationCode("");
    setSetupStep("qr");
    setSecretCopied(false);
  };

  const handleDisable2FA = async () => {
    if (!disablePassword || !disableCode) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIs2FALoading(true);
    const result = await disable2FA(disablePassword, disableCode);
    setIs2FALoading(false);

    if (result.success) {
      Alert.alert("Success", "Two-factor authentication has been disabled");
      setIsDisabling2FA(false);
      setDisablePassword("");
      setDisableCode("");
    } else {
      Alert.alert("Error", result.error || "Failed to disable 2FA");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and app data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteAccount();
            setIsDeletingAccount(false);

            if (!result.success) {
              Alert.alert("Error", result.error || "Failed to delete account");
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        {/* Password Section */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="lock" size={20} color={theme.text} />
              <ThemedText style={styles.cardTitle}>Password</ThemedText>
            </View>
            {!isSettingPassword && (
              <Pressable onPress={() => setIsSettingPassword(true)}>
                <ThemedText style={[styles.linkText, { color: theme.primary }]}>
                  {hasPassword ? "Change" : "Set Password"}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {isSettingPassword ? (
            <View style={styles.formContainer}>
              {showCurrentPasswordField && (
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                    Current Password
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: inputBackgroundColor,
                        color: theme.text,
                        borderColor,
                      },
                    ]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Enter current password"
                    placeholderTextColor={secondaryTextColor}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>New Password</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBackgroundColor,
                      color: theme.text,
                      borderColor,
                    },
                  ]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Enter new password"
                  placeholderTextColor={secondaryTextColor}
                />
                <PasswordGuidance password={newPassword} />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>
                  Confirm Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBackgroundColor,
                      color: theme.text,
                      borderColor,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Re-enter new password"
                  placeholderTextColor={secondaryTextColor}
                />
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.cancelButton, { borderColor }]}
                  onPress={() => {
                    setIsSettingPassword(false);
                    setRequiresCurrentPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSetPassword}
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <ThemedText
              style={[styles.cardDescription, { color: secondaryTextColor }]}
            >
              {hasPassword
                ? "Your password is set. You can change it here."
                : user?.googleId
                  ? "Set a password to enable email/password sign-in alongside Google."
                  : "Set a strong password to secure your account."}
            </ThemedText>
          )}
        </View>

        {/* Two-Factor Authentication Section */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="shield" size={20} color={theme.text} />
              <ThemedText style={styles.cardTitle}>
                Two-Factor Authentication
              </ThemedText>
            </View>
            {user?.twoFactorEnabled && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: "rgba(34, 197, 94, 0.2)" },
                ]}
              >
                <ThemedText style={[styles.badgeText, { color: "#22c55e" }]}>
                  Enabled
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText
            style={[styles.cardDescription, { color: secondaryTextColor }]}
          >
            {user?.twoFactorEnabled
              ? "Your account is protected with two-factor authentication."
              : "Add an extra layer of security to your account."}
          </ThemedText>

          {!user?.twoFactorEnabled ? (
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={handleStart2FASetup}
              disabled={is2FALoading || !hasPassword}
            >
              {is2FALoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.actionButtonText}>
                  {!hasPassword ? "Set password first" : "Enable 2FA"}
                </ThemedText>
              )}
            </Pressable>
          ) : (
            <>
              {!isDisabling2FA ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.dangerButton,
                    { borderColor: "#ef4444" },
                  ]}
                  onPress={() => setIsDisabling2FA(true)}
                >
                  <ThemedText
                    style={[styles.actionButtonText, { color: "#ef4444" }]}
                  >
                    Disable 2FA
                  </ThemedText>
                </Pressable>
              ) : (
                <View style={styles.formContainer}>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Password</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: inputBackgroundColor,
                          color: theme.text,
                          borderColor,
                        },
                      ]}
                      value={disablePassword}
                      onChangeText={setDisablePassword}
                      secureTextEntry
                      placeholder="Enter your password"
                      placeholderTextColor={secondaryTextColor}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>
                      Verification Code
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: inputBackgroundColor,
                          color: theme.text,
                          borderColor,
                        },
                      ]}
                      value={disableCode}
                      onChangeText={setDisableCode}
                      placeholder="6-digit code from authenticator"
                      placeholderTextColor={secondaryTextColor}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <Pressable
                      style={[
                        styles.button,
                        styles.cancelButton,
                        { borderColor },
                      ]}
                      onPress={() => {
                        setIsDisabling2FA(false);
                        setDisablePassword("");
                        setDisableCode("");
                      }}
                    >
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.button,
                        styles.dangerButtonFilled,
                        { backgroundColor: "#ef4444" },
                      ]}
                      onPress={handleDisable2FA}
                      disabled={is2FALoading}
                    >
                      {is2FALoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText style={styles.saveButtonText}>
                          Disable
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Account Section */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="trash-2" size={20} color="#ef4444" />
              <ThemedText style={styles.cardTitle}>Delete Account</ThemedText>
            </View>
          </View>

          <ThemedText
            style={[styles.cardDescription, { color: secondaryTextColor }]}
          >
            This permanently deletes your account and app data.
          </ThemedText>

          <Pressable
            style={[
              styles.actionButton,
              styles.dangerButton,
              { borderColor: "#ef4444" },
            ]}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <ThemedText
                style={[styles.actionButtonText, { color: "#ef4444" }]}
              >
                Delete Account
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* 2FA Setup Modal */}
      <Modal
        visible={is2FASetupModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIs2FASetupModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: borderColor, paddingTop: insets.top },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {setupStep === "qr"
                ? "Scan QR Code"
                : setupStep === "verify"
                  ? "Verify Code"
                  : "Backup Codes"}
            </ThemedText>
            <Pressable onPress={() => setIs2FASetupModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            {setupStep === "qr" && (
              <>
                <ThemedText style={styles.instructionText}>
                  1. Download an authenticator app like Google Authenticator or
                  Authy
                </ThemedText>
                <ThemedText style={styles.instructionText}>
                  2. Scan this QR code with your authenticator app
                </ThemedText>

                {qrCode && (
                  <View style={styles.qrContainer}>
                    <Image
                      source={{ uri: qrCode }}
                      style={styles.qrCode}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <ThemedText
                  style={[
                    styles.instructionText,
                    { color: secondaryTextColor, fontSize: 12 },
                  ]}
                >
                  Or enter this code manually:
                </ThemedText>

                <View
                  style={[
                    styles.secretContainer,
                    { backgroundColor: inputBackgroundColor, borderColor },
                  ]}
                >
                  <ThemedText style={styles.secretText} selectable>
                    {secret}
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.copyButton,
                      {
                        backgroundColor: secretCopied
                          ? "rgba(34, 197, 94, 0.15)"
                          : isDark
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.06)",
                        borderColor: secretCopied ? "#22c55e" : borderColor,
                      },
                    ]}
                    onPress={handleCopySecret}
                    accessibilityRole="button"
                    accessibilityLabel="Copy setup code"
                  >
                    <Feather
                      name={secretCopied ? "check" : "copy"}
                      size={16}
                      color={secretCopied ? "#22c55e" : theme.primary}
                    />
                    <ThemedText
                      style={[
                        styles.copyButtonText,
                        {
                          color: secretCopied ? "#22c55e" : theme.primary,
                        },
                      ]}
                    >
                      {secretCopied ? "Copied" : "Copy"}
                    </ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSetupStep("verify")}
                >
                  <ThemedText style={styles.modalButtonText}>Next</ThemedText>
                </Pressable>
              </>
            )}

            {setupStep === "verify" && (
              <>
                <ThemedText style={styles.instructionText}>
                  Enter the 6-digit code from your authenticator app to verify
                  the setup
                </ThemedText>

                <TextInput
                  style={[
                    styles.codeInput,
                    {
                      backgroundColor: inputBackgroundColor,
                      color: theme.text,
                      borderColor,
                    },
                  ]}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="000000"
                  placeholderTextColor={secondaryTextColor}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />

                <Pressable
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleVerify2FASetup}
                  disabled={is2FALoading}
                >
                  {is2FALoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.modalButtonText}>
                      Verify & Enable
                    </ThemedText>
                  )}
                </Pressable>
              </>
            )}

            {setupStep === "backup" && (
              <>
                <ThemedText style={styles.instructionText}>
                  Save these backup codes in a safe place. You can use them to
                  access your account if you lose access to your authenticator
                  app.
                </ThemedText>

                <View
                  style={[
                    styles.backupCodesContainer,
                    { backgroundColor: inputBackgroundColor, borderColor },
                  ]}
                >
                  {backupCodes.map((code, index) => (
                    <ThemedText key={index} style={styles.backupCode}>
                      {code}
                    </ThemedText>
                  ))}
                </View>

                <ThemedText
                  style={[
                    styles.warningText,
                    { color: "#f59e0b", marginTop: Spacing.md },
                  ]}
                >
                  ⚠️ These codes will only be shown once. Make sure to save
                  them!
                </ThemedText>

                <Pressable
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleFinish2FASetup}
                >
                  <ThemedText style={styles.modalButtonText}>
                    {"I've Saved My Codes"}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  formContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  actionButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 44,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  dangerButtonFilled: {},
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  secretContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  secretText: {
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 1,
    textAlign: "center",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignSelf: "center",
    minWidth: 110,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeInput: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: 8,
  },
  modalButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: 44,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  backupCodesContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  backupCode: {
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    padding: Spacing.xs,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
