export type SupportedLanguage = 'pt-PT' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'tr' | 'ru' | 'ar'

export interface TranslationSchema {
  header: {
    generatedMessageSingular: string
    generatedMessagePlural: string
    totalTokens: string
    model: string
    dailyMessages: string
    unlimited: string
  }
  sidebar: {
    newChat: string
    conversations: string
    noConversations: string
    deleteConversation: string
    deleteConfirmTitle: string
    deleteConfirmMessage: string
    delete: string
    cancel: string
    loginToSavePrefix: string
    loginToSaveSuffix: string
    profile: string
    settings: string
    logout: string
    login: string
  }
  chat: {
    title: string
    subtitle: string
    ready: string
    conversationLoaded: string
    savingConversation: string
    thinking: string
    errorOccurred: string
    errorTurn: string
    errorInitialTopic: string
    noResponse: string
    error: string
    topicPlaceholder: string
    random: string
    sendMessage: string
    restart: string
    restartConfirmTitle: string
    restartConfirmMessage: string
    restartConfirmButton: string
    restartCancelButton: string
    tokens: string
  }
  agents: {
    cardTitle: string
    changeAvatar: string
    defaultAgent1: string
    defaultAgent2: string
    nameLabel: string
    namePlaceholder: string
    descriptionLabel: string
    descriptionPlaceholder: string
    selectAvatar: string
  }
  settings: {
    title: string
    subtitle: string
    language: string
    languageLabel: string
    languageHint: string
    generalRules: string
    generalRulesLabel: string
    generalRulesPlaceholder: string
    generalRulesHint: string
    maxChars: string
    maxCharsLabel: string
    maxCharsHint: string
  }
  confirmation: {
    title: string
    confirm: string
    cancel: string
  }
  login: {
    title: string
    subtitle: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    submit: string
    noAccount: string
    registerLink: string
    twoFactorTitle: string
    twoFactorSubtitleEmail: string
    twoFactorSubtitleAuth: string
    twoFactorCodeLabel: string
    twoFactorCodePlaceholder: string
    verifyButton: string
    backToLogin: string
    invalidCode: string
    codeExpired: string
  }
  register: {
    title: string
    subtitle: string
    nameLabel: string
    namePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    submit: string
    hasAccount: string
    loginLink: string
  }
  profile: {
    title: string
    subtitle: string
    nameTitle: string
    nameLabel: string
    namePlaceholder: string
    saveName: string
    nameUpdated: string
    emailTitle: string
    emailLabel: string
    emailPlaceholder: string
    emailHint: string
    saveEmail: string
    emailConfirmationSent: string
    emailUnchanged: string
    emailError: string
    passwordTitle: string
    currentPasswordLabel: string
    currentPasswordPlaceholder: string
    newPasswordLabel: string
    newPasswordPlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    savePassword: string
    passwordUpdated: string
    passwordMinLength: string
    passwordMismatch: string
    currentPasswordIncorrect: string
    passwordError: string
    twoFactorTitle: string
    twoFactorLabel: string
    twoFactorHint: string
    twoFactorNone: string
    twoFactorEmail: string
    twoFactorAuthenticator: string
    saveTwoFactor: string
    twoFactorUpdated: string
    twoFactorEnabled: string
    twoFactorDisabled: string
    twoFactorCurrentStatus: string
    setupAuthenticatorTitle: string
    setupAuthenticatorStep1: string
    setupAuthenticatorStep2: string
    setupAuthenticatorStep3: string
    secretKeyLabel: string
    verifyAndActivate: string
    sendTestEmailCode: string
    emailCodeSent: string
    emailCodeLabel: string
    emailCodePlaceholder: string
    disable2FA: string
    fillRequired: string
    invalidCode: string
    codeExpired: string
    updateError: string
  }
  about: {
    title: string
    subtitle: string
  }
}

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<TranslationSchema>
