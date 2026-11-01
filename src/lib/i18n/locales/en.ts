import type { TranslationSchema } from '../types'

export const en: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Generated Message',
    generatedMessagePlural: 'Generated Messages',
    totalTokens: 'Total Tokens'
  },
  sidebar: {
    newChat: 'New chat',
    conversations: 'Conversations',
    noConversations: 'No conversations yet',
    deleteConversation: 'Delete conversation',
    deleteConfirmTitle: 'Delete conversation',
    deleteConfirmMessage: 'Are you sure you want to delete this conversation from history?',
    delete: 'Delete',
    cancel: 'Cancel',
    loginToSavePrefix: 'Log in',
    loginToSaveSuffix: 'to save activity',
    settings: 'Settings',
    logout: 'Log out',
    login: 'Log in'
  },
  chat: {
    ready: 'Ready',
    conversationLoaded: 'Conversation loaded.',
    savingConversation: 'Saving conversation...',
    thinking: '{speaker} is thinking...',
    errorOccurred: 'An error occurred.',
    errorTurn: 'Error processing turn',
    errorInitialTopic: 'Please provide an initial topic for LLM 1.',
    noResponse: '(No response)',
    error: 'Error',
    topicPlaceholder: 'How does the conversation start?',
    random: 'Random',
    sendMessage: 'Send message',
    restart: 'Restart',
    restartConfirmTitle: 'Restart conversation',
    restartConfirmMessage: 'You are about to restart a conversation with these characters. This conversation will be saved in history. Do you want to restart?',
    restartConfirmButton: 'Restart',
    restartCancelButton: 'Cancel',
    tokens: '{count} tokens'
  },
  agents: {
    defaultAgent1: 'Agent 1',
    defaultAgent2: 'Agent 2',
    nameLabel: 'Character name {number}',
    namePlaceholder: 'What is my name?',
    descriptionLabel: 'Describe character {number}',
    descriptionPlaceholder: 'Describe me'
  },
  settings: {
    title: 'Settings',
    subtitle: 'General configurations for conversation models.',
    aiModel: 'AI Model',
    modelLabel: 'Model',
    modelPlaceholder: 'e.g.: meta-llama/llama-3.3-70b-instruct:free',
    modelHint: 'Model used by both speakers.',
    language: 'Language',
    languageLabel: 'Conversation Language',
    languageHint: 'Language used by agents in dialogue.',
    generalRules: 'General Rules',
    generalRulesLabel: 'General Rules for Agents',
    generalRulesPlaceholder: 'e.g.: Always respond in English and concisely.',
    generalRulesHint: 'Rules added to agent descriptions ({current}/{max} characters).',
    tokenProtection: 'Token Protection',
    maxTokensLabel: 'Maximum Tokens per response',
    maxTokensHint: 'Restricts the length of each individual response.',
    restoreDefaults: 'Restore Defaults'
  },
  confirmation: {
    title: 'Confirmation',
    confirm: 'Confirm',
    cancel: 'Cancel'
  },
  login: {
    title: 'Log In',
    subtitle: 'Enter your credentials to access your account.',
    emailLabel: 'Email',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    submit: 'Log In',
    noAccount: "Don't have an account yet?",
    registerLink: 'Sign up here'
  },
  register: {
    title: 'Create Account',
    subtitle: 'Sign up to save and access your conversations.',
    nameLabel: 'Name',
    namePlaceholder: 'Your name (optional)',
    emailLabel: 'Email',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 8 characters',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Repeat password',
    submit: 'Create Account',
    hasAccount: 'Already have an account?',
    loginLink: 'Log in here'
  },
  languages: {
    'pt-PT': 'Portuguese (pt-PT)',
    en: 'English (en)',
    es: 'Spanish (es)',
    fr: 'French (fr)',
    de: 'German (de)',
    it: 'Italian (it)'
  }
}
