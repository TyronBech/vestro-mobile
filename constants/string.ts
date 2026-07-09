/**
 * Vestro Design System (VDS) - String Constants
 * Used to ensure consistency and uniform copy across the application.
 */

export const Strings = {
  // App info / Developer metadata
  designerCredit: "DESIGN BY TYRON BECHAYDA",
  engineVersion: "POVERTY FIREWALL V1.1.0",
  pageIndicator: "11 / 12",
  languageCode: "EN",
  
  // Login Screen
  loginSubtitle: "Login Credentials",
  loginButtonText: "LOGIN",
  forgotPasswordButtonText: "Forgot Password?",
  emailLabel: "Email Address",
  emailPlaceholder: "name@domain.com",
  passwordLabel: "Password",
  passwordPlaceholder: "••••••••",
  googleLoginButtonText: "CONTINUE WITH GOOGLE",
  googleLoginError: "Google Sign-In was cancelled or failed.",
  
  // Register Screen
  registerSubtitle: "New Account Credentials",
  nameLabel: "Full Name",
  namePlaceholder: "First Last",
  confirmPasswordLabel: "Confirm Password",
  confirmPasswordPlaceholder: "••••••••",
  registerButtonText: "REGISTER",
  registerLinkText: "CREATE AN ACCOUNT",
  loginLinkText: "ALREADY HAVE AN ACCOUNT? LOGIN",
  validationPasswordsMatch: "Passwords do not match.",
  validationPasswordLength: "Password must be at least 8 characters.",
  
  // Alerts / Errors
  authErrorTitle: "Auth Error",
  validationEmailPassword: "Please enter both email and password.",
  resetPasswordTitle: "Password Reset",
  resetPasswordMessage: "A password reset link will be sent to your registered email address.",
  ok: "OK",

  // Landing Screen
  landingSubtitle: "Financial tracker",
  taglineLine1: "That small money you got.",
  taglineLine2: "Can compound into something bigger.",
  
  // Security Protocols Sliding Sheet
  securityProtocolsSuffix: " SECURITY PROTOCOLS",
  securityInactivityTitle: "15m Inactivity Lock",
  securityInactivityDesc: "App locks securely after 15 minutes of inactivity, requiring biometric or passcode verification.",
  securityBiometricTitle: "Biometric Gate",
  securityBiometricDesc: "Biometric credentials are encrypted and stored in the secure enclave, never on public servers.",
  securityPanicTitle: "Panic Mode (Shake-to-Lock)",
  securityPanicDesc: "A sudden physical shake of the mobile device immediately invalidates the active session and locks all entry.",

  // Common Validations & Forms
  validationAmountPositive: "Amount must be a positive number.",
  validationCoreNetworkRequired: "Core Network selection is required.",
  validationNameRequired: "Name is required.",
  validationCardNameRequired: "Card Name is required.",
  validationCreditLimitPositive: "Credit Limit must be a positive number.",
  validationPaymentDueDay: "Payment Due Day must be between 1 and 31.",
  validationEmailRequired: "Valid email is required.",
  validationMediaPermissionRequired: "Permission to access media library is required.",
  validationSalary: "Please enter a valid salary amount.",
} as const;
