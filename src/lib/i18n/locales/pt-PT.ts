import type { TranslationSchema } from '../types'

export const ptPT: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Mensagem Gerada',
    generatedMessagePlural: 'Mensagens Geradas',
    totalTokens: 'Tokens Total',
    model: 'Modelo',
    dailyMessages: 'Mensagens diárias',
    unlimited: 'Ilimitado'
  },
  sidebar: {
    newChat: 'Nova conversa',
    conversations: 'Conversas',
    noConversations: 'Sem conversas ainda',
    deleteConversation: 'Apagar conversa',
    deleteConfirmTitle: 'Apagar conversa',
    deleteConfirmMessage: 'Tens a certeza de que pretendes apagar esta conversa do histórico?',
    delete: 'Apagar',
    cancel: 'Cancelar',
    loginToSavePrefix: 'Inicia a sessão',
    loginToSaveSuffix: 'para guardar a atividade',
    settings: 'Definições',
    logout: 'Sair',
    login: 'Iniciar sessão'
  },
  chat: {
    ready: 'Pronto',
    conversationLoaded: 'Conversa carregada.',
    savingConversation: 'A guardar conversa...',
    thinking: '{speaker} a pensar...',
    errorOccurred: 'Ocorreu um erro.',
    errorTurn: 'Erro ao processar turno',
    errorInitialTopic: 'Por favor introduz um tópico inicial para o LLM 1.',
    noResponse: '(Sem resposta)',
    error: 'Erro',
    topicPlaceholder: 'Como começa a conversa?',
    random: 'Random',
    sendMessage: 'Enviar mensagem',
    restart: 'Recomeçar',
    restartConfirmTitle: 'Recomeçar conversa',
    restartConfirmMessage: 'Vai recomeçar uma conversa com estas personagens. Esta conversa vai ser gravada no histórico. Queres recomeçar?',
    restartConfirmButton: 'Recomeçar',
    restartCancelButton: 'Cancelar',
    tokens: '{count} tokens'
  },
  agents: {
    defaultAgent1: 'Agente 1',
    defaultAgent2: 'Agente 2',
    nameLabel: 'Nome da personagem {number}',
    namePlaceholder: 'Como me chamo?',
    descriptionLabel: 'Descreve a personagem {number}',
    descriptionPlaceholder: 'Descreve-me'
  },
  settings: {
    title: 'Definições',
    subtitle: 'Configurações gerais para os modelos de conversação.',
    language: 'Idioma',
    languageLabel: 'Idioma da aplicação',
    languageHint: 'Idioma usado na interface da aplicação e nas conversas.',
    generalRules: 'Regras Gerais',
    generalRulesLabel: 'Regras Gerais para os Agentes',
    generalRulesPlaceholder: 'ex: Responde sempre em português e de forma concisa.',
    generalRulesHint: 'Regras adicionadas à descrição dos agentes ({current}/{max} caracteres).'
  },
  confirmation: {
    title: 'Confirmação',
    confirm: 'Confirmar',
    cancel: 'Cancelar'
  },
  login: {
    title: 'Iniciar Sessão',
    subtitle: 'Introduz as tuas credenciais para acederes à tua conta.',
    emailLabel: 'Email',
    emailPlaceholder: 'exemplo@dominio.com',
    passwordLabel: 'Palavra-passe',
    passwordPlaceholder: 'A tua palavra-passe',
    submit: 'Entrar',
    noAccount: 'Ainda não tens conta?',
    registerLink: 'Regista-te aqui'
  },
  register: {
    title: 'Criar Conta',
    subtitle: 'Regista-te para guardares e acederes às tuas conversas.',
    nameLabel: 'Nome',
    namePlaceholder: 'O teu nome (opcional)',
    emailLabel: 'Email',
    emailPlaceholder: 'exemplo@dominio.com',
    passwordLabel: 'Palavra-passe',
    passwordPlaceholder: 'Mínimo de 8 caracteres',
    confirmPasswordLabel: 'Confirmar Palavra-passe',
    confirmPasswordPlaceholder: 'Repete a palavra-passe',
    submit: 'Criar Conta',
    hasAccount: 'Já tens conta?',
    loginLink: 'Inicia sessão aqui'
  }
}
