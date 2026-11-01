import type { TranslationSchema } from '../types'

export const tr: TranslationSchema = {
  header: {
    generatedMessageSingular: 'Oluşturulan Mesaj',
    generatedMessagePlural: 'Oluşturulan Mesajlar',
    totalTokens: 'Toplam Token'
  },
  sidebar: {
    newChat: 'Yeni sohbet',
    conversations: 'Sohbetler',
    noConversations: 'Henüz sohbet yok',
    deleteConversation: 'Sohbeti sil',
    deleteConfirmTitle: 'Sohbeti sil',
    deleteConfirmMessage: 'Bu sohbeti geçmişten silmek istediğinizden emin misiniz?',
    delete: 'Sil',
    cancel: 'İptal',
    loginToSavePrefix: 'Giriş yapın',
    loginToSaveSuffix: 've etkinliği kaydedin',
    settings: 'Ayarlar',
    logout: 'Çıkış yap',
    login: 'Giriş yap'
  },
  chat: {
    ready: 'Hazır',
    conversationLoaded: 'Sohbet yüklendi.',
    savingConversation: 'Sohbet kaydediliyor...',
    thinking: '{speaker} düşünüyor...',
    errorOccurred: 'Bir hata oluştu.',
    errorTurn: 'Sıra işlenirken hata oluştu',
    errorInitialTopic: 'Lütfen LLM 1 için bir başlangıç konusu girin.',
    noResponse: '(Yanıt yok)',
    error: 'Hata',
    topicPlaceholder: 'Sohbet nasıl başlasın?',
    random: 'Rastgele',
    sendMessage: 'Mesaj gönder',
    restart: 'Yeniden başlat',
    restartConfirmTitle: 'Sohbeti yeniden başlat',
    restartConfirmMessage: 'Bu karakterlerle sohbeti yeniden başlatmak üzeresiniz. Bu sohbet geçmişe kaydedilecek. Yeniden başlatmak istiyor musunuz?',
    restartConfirmButton: 'Yeniden başlat',
    restartCancelButton: 'İptal',
    tokens: '{count} token'
  },
  agents: {
    defaultAgent1: 'Ajan 1',
    defaultAgent2: 'Ajan 2',
    nameLabel: 'Karakter adı {number}',
    namePlaceholder: 'Benim adım ne?',
    descriptionLabel: 'Karakteri tanımla {number}',
    descriptionPlaceholder: 'Beni tanımla'
  },
  settings: {
    title: 'Ayarlar',
    subtitle: 'Sohbet modelleri için genel yapılandırmalar.',
    language: 'Dil',
    languageLabel: 'Sohbet Dili',
    languageHint: 'Diyalogda ajanlar tarafından kullanılan dil.',
    generalRules: 'Genel Kurallar',
    generalRulesLabel: 'Ajanlar için Genel Kurallar',
    generalRulesPlaceholder: 'ör.: Her zaman Türkçe ve özlü bir şekilde yanıt ver.',
    generalRulesHint: 'Ajan açıklamalarına eklenen kurallar ({current}/{max} karakter).',
    restoreDefaults: 'Varsayılanları Geri Yükle'
  },
  confirmation: {
    title: 'Onay',
    confirm: 'Onayla',
    cancel: 'İptal'
  },
  login: {
    title: 'Giriş Yap',
    subtitle: 'Hesabınıza erişmek için bilgilerinizi girin.',
    emailLabel: 'E-posta',
    emailPlaceholder: 'ornek@alanadi.com',
    passwordLabel: 'Şifre',
    passwordPlaceholder: 'Şifreniz',
    submit: 'Giriş Yap',
    noAccount: 'Henüz hesabınız yok mu?',
    registerLink: 'Buradan kaydolun'
  },
  register: {
    title: 'Hesap Oluştur',
    subtitle: 'Sohbetlerinizi kaydetmek ve erişmek için kaydolun.',
    nameLabel: 'İsim',
    namePlaceholder: 'İsminiz (isteğe bağlı)',
    emailLabel: 'E-posta',
    emailPlaceholder: 'ornek@alanadi.com',
    passwordLabel: 'Şifre',
    passwordPlaceholder: 'En az 8 karakter',
    confirmPasswordLabel: 'Şifreyi Onayla',
    confirmPasswordPlaceholder: 'Şifreyi tekrar girin',
    submit: 'Hesap Oluştur',
    hasAccount: 'Zaten bir hesabınız var mı?',
    loginLink: 'Buradan giriş yapın'
  }
}
