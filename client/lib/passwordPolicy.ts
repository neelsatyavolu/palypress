export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export type PasswordRuleStatus = {
  id: string;
  label: string;
  isMet: boolean;
  errorMessage: string;
};

const passwordRules = [
  {
    id: "min-length",
    label: "At least 10 characters",
    errorMessage: "Password must be at least 10 characters",
    test: (password: string) => password.length >= 10,
  },
  {
    id: "max-length",
    label: "At most 100 characters",
    errorMessage: "Password is too long",
    test: (password: string) => password.length <= 100,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    errorMessage: "Password must contain at least one uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    errorMessage: "Password must contain at least one lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "At least one number",
    errorMessage: "Password must contain at least one number",
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "At least one special character",
    errorMessage: "Password must contain at least one special character",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
];

export function getPasswordRuleStatuses(
  password: string,
): PasswordRuleStatus[] {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    errorMessage: rule.errorMessage,
    isMet: rule.test(password),
  }));
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors = getPasswordRuleStatuses(password)
    .filter((rule) => !rule.isMet)
    .map((rule) => rule.errorMessage);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return "empty";
  }

  const statuses = getPasswordRuleStatuses(password);
  const metCount = statuses.filter((rule) => rule.isMet).length;

  if (metCount === statuses.length) {
    return "strong";
  }

  if (metCount <= 2) {
    return "weak";
  }

  if (metCount <= 4) {
    return "fair";
  }

  return "good";
}
