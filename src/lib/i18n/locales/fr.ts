import type { TranslationSchema } from '../types'

export const fr: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Message généré',
    generatedMessagePlural: 'Messages générés',
    totalTokens: 'Total des tokens',
    model: 'Modèle'
  },
  sidebar: {
    newChat: 'Nouvelle conversation',
    conversations: 'Conversations',
    noConversations: 'Aucune conversation pour le moment',
    deleteConversation: 'Supprimer la conversation',
    deleteConfirmTitle: 'Supprimer la conversation',
    deleteConfirmMessage: 'Êtes-vous sûr de vouloir supprimer cette conversation de l’historique ?',
    delete: 'Supprimer',
    cancel: 'Annuler',
    loginToSavePrefix: 'Connectez-vous',
    loginToSaveSuffix: 'pour enregistrer votre activité',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    login: 'Connexion'
  },
  chat: {
    ready: 'Prêt',
    conversationLoaded: 'Conversation chargée.',
    savingConversation: 'Enregistrement de la conversation...',
    thinking: '{speaker} réfléchit...',
    errorOccurred: 'Une erreur est survenue.',
    errorTurn: 'Erreur lors du traitement du tour',
    errorInitialTopic: 'Veuillez saisir un sujet initial pour LLM 1.',
    noResponse: '(Aucune réponse)',
    error: 'Erreur',
    topicPlaceholder: 'Comment commence la conversation ?',
    random: 'Random',
    sendMessage: 'Envoyer le message',
    restart: 'Recommencer',
    restartConfirmTitle: 'Recommencer la conversation',
    restartConfirmMessage: 'Vous allez recommencer une conversation avec ces personnages. Cette conversation sera enregistrée dans l’historique. Voulez-vous recommencer ?',
    restartConfirmButton: 'Recommencer',
    restartCancelButton: 'Annuler',
    tokens: '{count} tokens'
  },
  agents: {
    defaultAgent1: 'Agent 1',
    defaultAgent2: 'Agent 2',
    nameLabel: 'Nom du personnage {number}',
    namePlaceholder: 'Comment je m’appelle ?',
    descriptionLabel: 'Décrivez le personnage {number}',
    descriptionPlaceholder: 'Décrivez-moi'
  },
  settings: {
    title: 'Paramètres',
    subtitle: 'Paramètres généraux pour les modèles de conversation.',
    language: 'Langue',
    languageLabel: 'Langue des Conversations',
    languageHint: 'Langue utilisée par les agents dans le dialogue.',
    generalRules: 'Règles Générales',
    generalRulesLabel: 'Règles Générales pour les Agents',
    generalRulesPlaceholder: 'ex : Réponds toujours en français et de manière concise.',
    generalRulesHint: 'Règles ajoutées à la description des agents ({current}/{max} caractères).'
  },
  confirmation: {
    title: 'Confirmation',
    confirm: 'Confirmer',
    cancel: 'Annuler'
  },
  login: {
    title: 'Connexion',
    subtitle: 'Saisissez vos identifiants pour accéder à votre compte.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'exemple@domaine.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Votre mot de passe',
    submit: 'Se connecter',
    noAccount: 'Vous n’avez pas encore de compte ?',
    registerLink: 'Inscrivez-vous ici'
  },
  register: {
    title: 'Créer un Compte',
    subtitle: 'Inscrivez-vous pour enregistrer et consulter vos conversations.',
    nameLabel: 'Nom',
    namePlaceholder: 'Votre nom (facultatif)',
    emailLabel: 'E-mail',
    emailPlaceholder: 'exemple@domaine.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Au moins 8 caractères',
    confirmPasswordLabel: 'Confirmer le Mot de passe',
    confirmPasswordPlaceholder: 'Répétez le mot de passe',
    submit: 'Créer un Compte',
    hasAccount: 'Vous avez déjà un compte ?',
    loginLink: 'Connectez-vous ici'
  }
}
