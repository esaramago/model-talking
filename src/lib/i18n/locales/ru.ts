import type { TranslationSchema } from '../types'

export const ru: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Сгенерированное сообщение',
    generatedMessagePlural: 'Сгенерированные сообщения',
    totalTokens: 'Всего токенов',
    model: 'Модель'
  },
  sidebar: {
    newChat: 'Новый чат',
    conversations: 'Диалоги',
    noConversations: 'Пока нет диалогов',
    deleteConversation: 'Удалить диалог',
    deleteConfirmTitle: 'Удалить диалог',
    deleteConfirmMessage: 'Вы уверены, что хотите удалить этот диалог из истории?',
    delete: 'Удалить',
    cancel: 'Отмена',
    loginToSavePrefix: 'Войдите',
    loginToSaveSuffix: ', чтобы сохранять историю',
    settings: 'Настройки',
    logout: 'Выйти',
    login: 'Войти'
  },
  chat: {
    ready: 'Готово',
    conversationLoaded: 'Диалог загружен.',
    savingConversation: 'Сохранение диалога...',
    thinking: '{speaker} думает...',
    errorOccurred: 'Произошла ошибка.',
    errorTurn: 'Ошибка при обработке реплики',
    errorInitialTopic: 'Пожалуйста, укажите начальную тему для LLM 1.',
    noResponse: '(Нет ответа)',
    error: 'Ошибка',
    topicPlaceholder: 'С чего начнется разговор?',
    random: 'Случайно',
    sendMessage: 'Отправить сообщение',
    restart: 'Начать заново',
    restartConfirmTitle: 'Начать диалог заново',
    restartConfirmMessage: 'Вы собираетесь перезапустить разговор с этими персонажами. Этот диалог будет сохранен в истории. Начать заново?',
    restartConfirmButton: 'Начать заново',
    restartCancelButton: 'Отмена',
    tokens: '{count} токенов'
  },
  agents: {
    defaultAgent1: 'Агент 1',
    defaultAgent2: 'Агент 2',
    nameLabel: 'Имя персонажа {number}',
    namePlaceholder: 'Как меня зовут?',
    descriptionLabel: 'Опишите персонажа {number}',
    descriptionPlaceholder: 'Опишите меня'
  },
  settings: {
    title: 'Настройки',
    subtitle: 'Общие параметры моделей диалога.',
    language: 'Язык',
    languageLabel: 'Язык диалогов',
    languageHint: 'Язык, используемый агентами в диалоге.',
    generalRules: 'Общие правила',
    generalRulesLabel: 'Общие правила для агентов',
    generalRulesPlaceholder: 'напр.: Всегда отвечай на русском языке и кратко.',
    generalRulesHint: 'Правила, добавляемые к описанию агентов ({current}/{max} символов).'
  },
  confirmation: {
    title: 'Подтверждение',
    confirm: 'Подтвердить',
    cancel: 'Отмена'
  },
  login: {
    title: 'Вход',
    subtitle: 'Введите свои данные для входа в аккаунт.',
    emailLabel: 'Электронная почта',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Ваш пароль',
    submit: 'Войти',
    noAccount: 'У вас еще нет аккаунта?',
    registerLink: 'Зарегистрируйтесь здесь'
  },
  register: {
    title: 'Создать аккаунт',
    subtitle: 'Зарегистрируйтесь, чтобы сохранять и просматривать свои диалоги.',
    nameLabel: 'Имя',
    namePlaceholder: 'Ваше имя (необязательно)',
    emailLabel: 'Электронная почта',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Минимум 8 символов',
    confirmPasswordLabel: 'Подтвердите пароль',
    confirmPasswordPlaceholder: 'Повторите пароль',
    submit: 'Создать аккаунт',
    hasAccount: 'Уже есть аккаунт?',
    loginLink: 'Войдите здесь'
  }
}
