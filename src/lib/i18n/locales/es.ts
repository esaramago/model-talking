import type { TranslationSchema } from '../types'

export const es: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Mensaje generado',
    generatedMessagePlural: 'Mensajes generados',
    totalTokens: 'Tokens totales'
  },
  sidebar: {
    newChat: 'Nueva conversación',
    conversations: 'Conversaciones',
    noConversations: 'Sin conversaciones todavía',
    deleteConversation: 'Eliminar conversación',
    deleteConfirmTitle: 'Eliminar conversación',
    deleteConfirmMessage: '¿Estás seguro de que deseas eliminar esta conversación del historial?',
    delete: 'Eliminar',
    cancel: 'Cancelar',
    loginToSavePrefix: 'Inicia sesión',
    loginToSaveSuffix: 'para guardar tu actividad',
    settings: 'Ajustes',
    logout: 'Cerrar sesión',
    login: 'Iniciar sesión'
  },
  chat: {
    ready: 'Listo',
    conversationLoaded: 'Conversación cargada.',
    savingConversation: 'Guardando conversación...',
    thinking: '{speaker} está pensando...',
    errorOccurred: 'Ocurrió un error.',
    errorTurn: 'Error al procesar el turno',
    errorInitialTopic: 'Por favor, introduce un tema inicial para LLM 1.',
    noResponse: '(Sin respuesta)',
    error: 'Error',
    topicPlaceholder: '¿Cómo empieza la conversación?',
    random: 'Random',
    sendMessage: 'Enviar mensaje',
    restart: 'Reiniciar',
    restartConfirmTitle: 'Reiniciar conversación',
    restartConfirmMessage: 'Vas a reiniciar una conversación con estos personajes. Esta conversación se guardará en el historial. ¿Quieres reiniciar?',
    restartConfirmButton: 'Reiniciar',
    restartCancelButton: 'Cancelar',
    tokens: '{count} tokens'
  },
  agents: {
    defaultAgent1: 'Agente 1',
    defaultAgent2: 'Agente 2',
    nameLabel: 'Nombre del personaje {number}',
    namePlaceholder: '¿Cómo me llamo?',
    descriptionLabel: 'Describe al personaje {number}',
    descriptionPlaceholder: 'Descríbeme'
  },
  settings: {
    title: 'Ajustes',
    subtitle: 'Configuraciones generales para los modelos de conversación.',
    language: 'Idioma',
    languageLabel: 'Idioma de las Conversaciones',
    languageHint: 'Idioma utilizado por los agentes en el diálogo.',
    generalRules: 'Reglas Generales',
    generalRulesLabel: 'Reglas Generales para los Agentes',
    generalRulesPlaceholder: 'ej: Responde siempre en español y de forma concisa.',
    generalRulesHint: 'Reglas añadidas a la descripción de los agentes ({current}/{max} caracteres).',
    restoreDefaults: 'Restablecer valores predeterminados'
  },
  confirmation: {
    title: 'Confirmación',
    confirm: 'Confirmar',
    cancel: 'Cancelar'
  },
  login: {
    title: 'Iniciar Sesión',
    subtitle: 'Introduce tus credenciales para acceder a tu cuenta.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'ejemplo@dominio.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Tu contraseña',
    submit: 'Entrar',
    noAccount: '¿Todavía no tienes cuenta?',
    registerLink: 'Regístrate aquí'
  },
  register: {
    title: 'Crear Cuenta',
    subtitle: 'Regístrate para guardar y acceder a tus conversaciones.',
    nameLabel: 'Nombre',
    namePlaceholder: 'Tu nombre (opcional)',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'ejemplo@dominio.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Mínimo de 8 caracteres',
    confirmPasswordLabel: 'Confirmar Contraseña',
    confirmPasswordPlaceholder: 'Repite la contraseña',
    submit: 'Crear Cuenta',
    hasAccount: '¿Ya tienes una cuenta?',
    loginLink: 'Inicia sesión aquí'
  }
}
