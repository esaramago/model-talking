import type { TranslationSchema } from '../types'

export const de: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Generierte Nachricht',
    generatedMessagePlural: 'Generierte Nachrichten',
    totalTokens: 'Tokens insgesamt',
    model: 'Modell',
    dailyMessages: 'Tägliche Nachrichten',
    unlimited: 'Unbegrenzt'
  },
  sidebar: {
    newChat: 'Neues Gespräch',
    conversations: 'Gespräche',
    noConversations: 'Noch keine Gespräche',
    deleteConversation: 'Gespräch löschen',
    deleteConfirmTitle: 'Gespräch löschen',
    deleteConfirmMessage: 'Möchten Sie dieses Gespräch wirklich aus dem Verlauf löschen?',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    loginToSavePrefix: 'Melden Sie sich an',
    loginToSaveSuffix: ', um Aktivitäten zu speichern',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    login: 'Anmelden'
  },
  chat: {
    ready: 'Bereit',
    conversationLoaded: 'Gespräch geladen.',
    savingConversation: 'Gespräch wird gespeichert...',
    thinking: '{speaker} denkt nach...',
    errorOccurred: 'Ein Fehler ist aufgetreten.',
    errorTurn: 'Fehler bei der Verarbeitung des Zugs',
    errorInitialTopic: 'Bitte geben Sie ein Einstiegsthema für LLM 1 ein.',
    noResponse: '(Keine Antwort)',
    error: 'Fehler',
    topicPlaceholder: 'Wie beginnt das Gespräch?',
    random: 'Random',
    sendMessage: 'Nachricht senden',
    restart: 'Neu starten',
    restartConfirmTitle: 'Gespräch neu starten',
    restartConfirmMessage: 'Sie starten ein neues Gespräch mit diesen Charakteren. Dieses Gespräch wird im Verlauf gespeichert. Möchten Sie neu starten?',
    restartConfirmButton: 'Neu starten',
    restartCancelButton: 'Abbrechen',
    tokens: '{count} Tokens'
  },
  agents: {
    defaultAgent1: 'Agent 1',
    defaultAgent2: 'Agent 2',
    nameLabel: 'Name von Charakter {number}',
    namePlaceholder: 'Wie heiße ich?',
    descriptionLabel: 'Beschreibe Charakter {number}',
    descriptionPlaceholder: 'Beschreibe mich',
    selectAvatar: 'Avatar auswählen'
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Allgemeine Konfigurationen für die Gesprächsmodelle.',
    language: 'Sprache',
    languageLabel: 'Sprache der Anwendung',
    languageHint: 'Sprache, die in der Benutzeroberfläche der Anwendung und in Gesprächen verwendet wird.',
    generalRules: 'Allgemeine Regeln',
    generalRulesLabel: 'Allgemeine Regeln für die Agenten',
    generalRulesPlaceholder: 'z.B.: Antworte immer auf Deutsch und halte dich kurz.',
    generalRulesHint: 'Regeln, die der Beschreibung der Agenten hinzugefügt werden ({current}/{max} Zeichen).',
    maxChars: 'Maximale Zeichenanzahl',
    maxCharsLabel: 'Zeichenbegrenzung pro Nachricht',
    maxCharsHint: 'Legt die maximale Länge jeder Antwort fest.'
  },
  confirmation: {
    title: 'Bestätigung',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen'
  },
  login: {
    title: 'Anmelden',
    subtitle: 'Geben Sie Ihre Anmeldedaten ein, um auf Ihr Konto zuzugreifen.',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'beispiel@domain.com',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Ihr Passwort',
    submit: 'Anmelden',
    noAccount: 'Noch kein Konto?',
    registerLink: 'Hier registrieren'
  },
  register: {
    title: 'Konto Erstellen',
    subtitle: 'Registrieren Sie sich, um Ihre Gespräche zu speichern und abzurufen.',
    nameLabel: 'Name',
    namePlaceholder: 'Ihr Name (optional)',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'beispiel@domain.com',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    confirmPasswordLabel: 'Passwort Bestätigen',
    confirmPasswordPlaceholder: 'Passwort wiederholen',
    submit: 'Konto Erstellen',
    hasAccount: 'Bereits ein Konto?',
    loginLink: 'Hier anmelden'
  }
}
