import type { TranslationSchema } from '../types'

export const it: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Messaggio generato',
    generatedMessagePlural: 'Messaggi generati',
    totalTokens: 'Token totali'
  },
  sidebar: {
    newChat: 'Nuova conversazione',
    conversations: 'Conversazioni',
    noConversations: 'Ancora nessuna conversazione',
    deleteConversation: 'Elimina conversazione',
    deleteConfirmTitle: 'Elimina conversazione',
    deleteConfirmMessage: 'Sei sicuro di voler eliminare questa conversazione dalla cronologia?',
    delete: 'Elimina',
    cancel: 'Annulla',
    loginToSavePrefix: 'Accedi',
    loginToSaveSuffix: 'per salvare la tua attività',
    settings: 'Impostazioni',
    logout: 'Esci',
    login: 'Accedi'
  },
  chat: {
    ready: 'Pronto',
    conversationLoaded: 'Conversazione caricata.',
    savingConversation: 'Salvataggio conversazione in corso...',
    thinking: '{speaker} sta pensando...',
    errorOccurred: 'Si è verificato un errore.',
    errorTurn: 'Errore durante l’elaborazione del turno',
    errorInitialTopic: 'Inserisci un argomento iniziale per LLM 1.',
    noResponse: '(Nessuna risposta)',
    error: 'Errore',
    topicPlaceholder: 'Come inizia la conversazione?',
    random: 'Random',
    sendMessage: 'Invia messaggio',
    restart: 'Ricomincia',
    restartConfirmTitle: 'Ricomincia conversazione',
    restartConfirmMessage: 'Stai per ricominciare una conversazione con questi personaggi. Questa conversazione verrà salvata nella cronologia. Vuoi ricominciare?',
    restartConfirmButton: 'Ricomincia',
    restartCancelButton: 'Annulla',
    tokens: '{count} token'
  },
  agents: {
    defaultAgent1: 'Agente 1',
    defaultAgent2: 'Agente 2',
    nameLabel: 'Nome del personaggio {number}',
    namePlaceholder: 'Come mi chiamo?',
    descriptionLabel: 'Descrivi il personaggio {number}',
    descriptionPlaceholder: 'Descrivimi'
  },
  settings: {
    title: 'Impostazioni',
    subtitle: 'Configurazioni generali per i modelli di conversazione.',
    aiModel: 'Modello IA',
    modelLabel: 'Modello',
    modelPlaceholder: 'es: meta-llama/llama-3.3-70b-instruct:free',
    modelHint: 'Modello utilizzato da entrambi i conversatori.',
    language: 'Lingua',
    languageLabel: 'Lingua delle Conversazioni',
    languageHint: 'Lingua utilizzata dagli agenti nel dialogo.',
    generalRules: 'Regole Generali',
    generalRulesLabel: 'Regole Generali per gli Agenti',
    generalRulesPlaceholder: 'es: Rispondi sempre in italiano e in modo conciso.',
    generalRulesHint: 'Regole aggiunte alla descrizione degli agenti ({current}/{max} caratteri).',
    tokenProtection: 'Protezione dei Token',
    maxTokensLabel: 'Massimo di Token per risposta',
    maxTokensHint: 'Limita la lunghezza di ogni singola risposta.',
    restoreDefaults: 'Ripristina predefiniti'
  },
  confirmation: {
    title: 'Conferma',
    confirm: 'Conferma',
    cancel: 'Annulla'
  },
  login: {
    title: 'Accedi',
    subtitle: 'Inserisci le tue credenziali per accedere al tuo account.',
    emailLabel: 'Email',
    emailPlaceholder: 'esempio@dominio.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'La tua password',
    submit: 'Accedi',
    noAccount: 'Non hai ancora un account?',
    registerLink: 'Registrati qui'
  },
  register: {
    title: 'Crea Account',
    subtitle: 'Registrati per salvare e consultare le tue conversazioni.',
    nameLabel: 'Nome',
    namePlaceholder: 'Il tuo nome (facoltativo)',
    emailLabel: 'Email',
    emailPlaceholder: 'esempio@dominio.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Almeno 8 caratteri',
    confirmPasswordLabel: 'Conferma Password',
    confirmPasswordPlaceholder: 'Ripeti la password',
    submit: 'Crea Account',
    hasAccount: 'Hai già un account?',
    loginLink: 'Accedi qui'
  }
}
