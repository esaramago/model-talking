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
    settings: string
    logout: string
    login: string
  }
  chat: {
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
    defaultAgent1: string
    defaultAgent2: string
    nameLabel: string
    namePlaceholder: string
    descriptionLabel: string
    descriptionPlaceholder: string
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
}

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<TranslationSchema>
