import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type LegalScreenProps = NativeStackScreenProps<ProfileStackParamList, "Legal">;

type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

const legalDocuments: Record<
  "terms" | "privacy",
  {
    title: string;
    updated: string;
    switchLabel: string;
    switchDocument: "terms" | "privacy";
    blocks: LegalBlock[];
  }
> = {
  terms: {
    title: "Terms of Service",
    updated: "Last updated August 30, 2026",
    switchLabel: "Privacy Policy",
    switchDocument: "privacy",
    blocks: [
      {
        type: "paragraph",
        text: "These are the rules for using the PALY Press app and this website. By making an account or using the app, you're agreeing to them. We kept them short and readable on purpose. If something here is unclear, ask us and we'll explain what we meant.",
      },
      { type: "heading", text: "What this app is (and isn't)" },
      {
        type: "paragraph",
        text: "PALY Press is an independent project built by a Paly student. It is not run by, endorsed by, or affiliated with the Palo Alto Unified School District, Palo Alto High School, or any of the publications whose work appears in the app.",
      },
      { type: "heading", text: "Whose content this is" },
      {
        type: "paragraph",
        text: "Every article, photo, and byline you see in the app was written, shot, or published by one of the student publications and their staff, not by us. That content belongs to the publication and its staff, not to PALY Press — we don't own it, we don't hold any copyright in it, and we don't edit it. We display it because it's already public on the publication's own website, and it stays theirs the whole time we show it. Publication names and logos are the property of those publications too. If you want to reuse an article for anything beyond reading it in the app, ask the publication that made it, not us.",
      },
      { type: "heading", text: "Copyright complaints" },
      {
        type: "paragraph",
        text: "If you believe something in the app infringes your copyright, email us at team@palyjournalism.com with what the work is, where it appears in the app, and a statement that you believe in good faith the use isn't authorized. We'll look into it and take it down if that's the right call, and we can cut off access for anyone who repeatedly posts infringing comments.",
      },
      { type: "heading", text: "Your account" },
      {
        type: "paragraph",
        text: "You need to be at least 13 to make an account. Use your real information when you sign up, and keep your password to yourself. If someone does something with your account because you shared your login, that's on you. If you think your account has been compromised, reset your password or contact us.",
      },
      { type: "heading", text: "Comments" },
      {
        type: "paragraph",
        text: "Comments you post in the app are submitted to the publication's own website and published there publicly under your display name. That means two things. First, each publication's comment rules apply to you, and they can moderate or remove your comment like any other. Second, once a comment is published on their site, deleting your app account doesn't remove it.",
      },
      {
        type: "paragraph",
        text: "Don't use comments to harass people, impersonate anyone, spam, or post things you know are false about real people. We're a journalism app built by student journalists; we care about this one. If you abuse the comment feature we can suspend your account, and the publications can ban you from theirs.",
      },
      { type: "heading", text: "Reporting and blocking" },
      {
        type: "paragraph",
        text: "You can flag any comment with Report, and you can Block an abusive author. Blocking hides that person's comments from your feed immediately and notifies us. We review every report and block notification, and we act within 24 hours by removing the content and ejecting the account that posted it when the report is valid.",
      },
      { type: "heading", text: "Acceptable use" },
      {
        type: "paragraph",
        text: "Don't try to break the app. Specifically: no attempting to access other people's accounts or data, no flooding the server with automated requests, and no using the app to redistribute the publications' content at scale. If you find a security hole, please tell us instead of exploiting it. We'll be genuinely grateful.",
      },
      { type: "heading", text: "This is beta software" },
      {
        type: "paragraph",
        text: "The app is in beta and distributed through TestFlight. Things will break sometimes. Features may change or disappear, the server may go down, and in a worst case your saved articles, to-dos, or schedule could be lost. We do our best to avoid that, but you shouldn't keep anything in this app that you can't afford to lose.",
      },
      { type: "heading", text: "No warranty, and a liability cap" },
      {
        type: "paragraph",
        text: "The app is provided as-is, without warranties of any kind. The app is free, nobody pays us, and we're students, so to the fullest extent the law allows, we're not liable for damages that come from using it or from not being able to use it. Where the law doesn't allow liability to be excluded entirely, our total liability is capped at $10.",
      },
      {
        type: "paragraph",
        text: "We also aren't responsible for the content of the articles themselves. Complaints about what a publication wrote should go to that publication.",
      },
      { type: "heading", text: "Ending things" },
      {
        type: "paragraph",
        text: "You can delete your account any time from the profile screen in the app, and our privacy policy explains exactly what gets deleted. We can suspend or delete accounts that violate these terms, and since this is a student project, we may someday shut the whole thing down. If that happens we'll try to give notice through the app first.",
      },
      { type: "heading", text: "Changes and governing law" },
      {
        type: "paragraph",
        text: "If we change these terms, we'll update the date at the top, and continuing to use the app after that means you accept the new version. These terms are governed by California law, and if any part of them turns out to be unenforceable, the rest still stands. Questions go to the feedback form in the app or team@palyjournalism.com.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated October 21, 2026",
    switchLabel: "Terms of Service",
    switchDocument: "terms",
    blocks: [
      {
        type: "paragraph",
        text: "PALY Press is an independent student project that puts Palo Alto High School's student publications in one app. It is not run by PAUSD, Paly, or the publications themselves. This page explains what the app actually collects, where it goes, and how to get rid of it. We tried to write it in plain English because we would want the same.",
      },
      { type: "heading", text: "What we collect when you make an account" },
      {
        type: "paragraph",
        text: 'You can sign in two ways, and what we store depends on which one you pick. If you use Google sign-in, we get your name, email address, profile photo, and Google account ID from Google. We request the basic "openid email profile" scopes and nothing more. If you sign up with an email and password instead, we store your email address and a hash of your password (bcrypt) - never the password itself - and we email you a verification code to confirm the address is yours.',
      },
      {
        type: "paragraph",
        text: "If you sign up with a pausd.us email, we also read the student ID number out of the address (the part before the @), since PAUSD emails are formatted that way. It's used to identify you as a Paly student.",
      },
      {
        type: "paragraph",
        text: "If you turn on two-factor authentication, the TOTP secret is stored encrypted (AES-256-GCM) and your backup codes are stored hashed, the same way passwords are.",
      },
      { type: "heading", text: "What we store while you use the app" },
      {
        type: "list",
        items: [
          "Articles you save and upvote",
          "To-dos you create and classes you add to your schedule",
          "Which publications you want notifications from, and a device push token if you enable notifications (issued by Expo's push service)",
          "Feedback you send through the feedback form",
          "Comment reports and authors you block",
          "Whether you want the weekly digest email",
          "When your account was created and when you last signed in",
        ],
      },
      { type: "heading", text: "Comments are public" },
      {
        type: "paragraph",
        text: "This is the most important part of this page. When you comment on an article in the app, the comment is submitted to that publication's website (they run on WordPress) under your display name. It becomes a public comment on their site, the same as if you had commented there directly. Deleting your account in the app does not remove comments that were already published on a publication's website. If you want one taken down, you'd need to contact that publication.",
      },
      { type: "heading", text: "Google Calendar, if you connect it" },
      {
        type: "paragraph",
        text: "Connecting Google Calendar is optional. If you do, we store access and refresh tokens so the app can fetch your events and show them on your schedule, plus your choices about which calendars to show or hide. The tokens are encrypted at rest with AES-256-GCM. We read your calendar; we never write to it. You can disconnect it in the app at any time, which deletes the stored tokens.",
      },
      { type: "heading", text: "Analytics" },
      {
        type: "paragraph",
        text: "We use PostHog to see which features people actually use and to find bugs. It records taps and app events (things like notification opened). It does not record your screen, and we configured it not to track which screens you visit automatically. There are no ads in the app and we don't sell data to anyone. Honestly, there's nothing to sell - this is a school project.",
      },
      { type: "heading", text: "Do Not Track and selling data" },
      {
        type: "paragraph",
        text: 'Some browsers send a "Do Not Track" signal. Nothing in the app currently changes based on it. We don\'t sell your personal information to anyone, and we never will - there\'s no ad network or data broker here to sell it to.',
      },
      { type: "heading", text: "Emails we send" },
      {
        type: "paragraph",
        text: "We send email for three reasons: verification codes when you sign up, password reset links when you ask for one, and a weekly digest of popular articles, which you can turn off in your profile settings. Email goes out through Resend, our email provider.",
      },
      { type: "heading", text: "Where the articles come from" },
      {
        type: "paragraph",
        text: "The articles themselves are fetched from the publications' public websites (The Paly Voice, The Campanile, Verde, and the rest). When you read one, images may load directly from that publication's site, which means their servers see the request like any normal web visit.",
      },
      { type: "heading", text: "Services we rely on" },
      {
        type: "paragraph",
        text: "The app couldn't run without a few third-party services, and some of your data passes through them:",
      },
      {
        type: "list",
        items: [
          "Cloudflare runs the server",
          "Neon hosts the Postgres database where everything above is stored",
          "Resend delivers our emails",
          "Expo delivers push notifications and app updates",
          "PostHog processes the analytics events",
          "Google handles Google sign-in and calendar access, if you use them",
          "The publications' websites receive comments you post and serve the articles you read",
        ],
      },
      { type: "heading", text: "Security" },
      {
        type: "paragraph",
        text: "Traffic to the server uses HTTPS. Passwords and 2FA backup codes are hashed, OAuth tokens and 2FA secrets are encrypted at rest, and sessions use secure cookies. That said, we're students, not a security team. We've put real effort into this, but no one can promise perfect security, and we won't either.",
      },
      { type: "heading", text: "The beta signup page" },
      {
        type: "paragraph",
        text: "If you fill out the beta signup form on this site, we store your name, email, and role (student, staff, parent, or alumni) so we can review the request and send you a TestFlight invite.",
      },
      { type: "heading", text: "Deleting your data" },
      {
        type: "paragraph",
        text: "You can delete your account from the profile screen in the app. That deletes your account record and everything tied to it: saved articles, upvotes, to-dos, classes, notification settings, push tokens, calendar connections, all of it. The two exceptions are comments already published on publication websites (explained above) and feedback you submitted, which is kept so we can still act on it. Verification codes and password reset tokens expire on their own. If you'd rather just see what we have on you or fix something instead of deleting it all, email us and we'll help.",
      },
      { type: "heading", text: "Age" },
      {
        type: "paragraph",
        text: "The app is built for high schoolers, their families, and Paly staff. You need to be at least 13 to make an account. It is not directed at children under 13, and we don't knowingly collect their data.",
      },
      { type: "heading", text: "Changes and contact" },
      {
        type: "paragraph",
        text: "If we change this policy, we'll update the date at the top. For anything privacy-related, use the feedback form in the app or email team@palyjournalism.com.",
      },
    ],
  },
};

export default function LegalScreen({ navigation, route }: LegalScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const document = legalDocuments[route.params.document];
  const secondaryColor = isDark ? "rgba(255,255,255,0.6)" : "#666";
  const cardColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

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
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText style={styles.title}>{document.title}</ThemedText>
        <ThemedText style={[styles.updated, { color: secondaryColor }]}>
          {document.updated}
        </ThemedText>

        {document.blocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <ThemedText key={index} style={styles.heading}>
                {block.text}
              </ThemedText>
            );
          }

          if (block.type === "list") {
            return (
              <View key={index} style={styles.list}>
                {block.items.map((item) => (
                  <View key={item} style={styles.listItem}>
                    <ThemedText
                      style={[styles.bullet, { color: secondaryColor }]}
                    >
                      {"\u2022"}
                    </ThemedText>
                    <ThemedText style={styles.body}>{item}</ThemedText>
                  </View>
                ))}
              </View>
            );
          }

          return (
            <ThemedText key={index} style={styles.body}>
              {block.text}
            </ThemedText>
          );
        })}

        <Pressable
          style={[
            styles.switchButton,
            { backgroundColor: cardColor, borderColor },
          ]}
          onPress={() =>
            navigation.navigate("Legal", {
              document: document.switchDocument,
            })
          }
        >
          <ThemedText style={[styles.switchText, { color: theme.link }]}>
            View {document.switchLabel}
          </ThemedText>
        </Pressable>
      </ScrollView>
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
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  updated: {
    ...Typography.small,
    marginBottom: Spacing.xl,
  },
  heading: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  body: {
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  list: {
    marginBottom: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bullet: {
    ...Typography.body,
  },
  switchButton: {
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  switchText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
