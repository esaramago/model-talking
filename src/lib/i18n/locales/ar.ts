import type { TranslationSchema } from '../types'

export const ar: TranslationSchema = {
  header: {
    generatedMessageSingular: 'رسالة مُنشأة',
    generatedMessagePlural: 'رسائل مُنشأة',
    totalTokens: 'إجمالي التوكنات',
    model: 'النموذج',
    dailyMessages: 'الرسائل اليومية',
    unlimited: 'غير محدود'
  },
  sidebar: {
    newChat: 'محادثة جديدة',
    conversations: 'المحادثات',
    noConversations: 'لا توجد محادثات بعد',
    deleteConversation: 'حذف المحادثة',
    deleteConfirmTitle: 'حذف المحادثة',
    deleteConfirmMessage: 'هل أنت متأكد من رغبتك في حذف هذه المحادثة من السجل؟',
    delete: 'حذف',
    cancel: 'إلغاء',
    loginToSavePrefix: 'تسجيل الدخول',
    loginToSaveSuffix: 'لحفظ النشاط',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول'
  },
  chat: {
    ready: 'جاهز',
    conversationLoaded: 'تم تحميل المحادثة.',
    savingConversation: 'جارٍ حفظ المحادثة...',
    thinking: '{speaker} يفكر...',
    errorOccurred: 'حدث خطأ.',
    errorTurn: 'خطأ أثناء معالجة الرد',
    errorInitialTopic: 'يرجى تحديد موضوع مبدئي للنموذج 1.',
    noResponse: '(لا يوجد رد)',
    error: 'خطأ',
    topicPlaceholder: 'كيف تبدأ المحادثة؟',
    random: 'عشوائي',
    sendMessage: 'إرسال رسالة',
    restart: 'إعادة البدء',
    restartConfirmTitle: 'إعادة بدء المحادثة',
    restartConfirmMessage: 'أنت على وشك إعادة بدء محادثة مع هذه الشخصيات. سيتم حفظ هذه المحادثة في السجل. هل تريد إعادة البدء؟',
    restartConfirmButton: 'إعادة البدء',
    restartCancelButton: 'إلغاء',
    tokens: '{count} توكن'
  },
  agents: {
    defaultAgent1: 'الوكيل 1',
    defaultAgent2: 'الوكيل 2',
    nameLabel: 'اسم الشخصية {number}',
    namePlaceholder: 'ما هو اسمي؟',
    descriptionLabel: 'وصف الشخصية {number}',
    descriptionPlaceholder: 'صفني'
  },
  settings: {
    title: 'الإعدادات',
    subtitle: 'الإعدادات العامة لنماذج المحادثة.',
    language: 'اللغة',
    languageLabel: 'لغة التطبيق',
    languageHint: 'اللغة المستخدمة في واجهة التطبيق وفي المحادثات.',
    generalRules: 'القواعد العامة',
    generalRulesLabel: 'القواعد العامة للوكلاء',
    generalRulesPlaceholder: 'مثال: أجب دائمًا باللغة العربية وبإيجاز.',
    generalRulesHint: 'قواعد مضافة إلى وصف الوكلاء ({current}/{max} حرفًا).'
  },
  confirmation: {
    title: 'تأكيد',
    confirm: 'تأكيد',
    cancel: 'إلغاء'
  },
  login: {
    title: 'تسجيل الدخول',
    subtitle: 'أدخل بياناتك للوصول إلى حسابك.',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور الخاصة بك',
    submit: 'دخول',
    noAccount: 'ليس لديك حساب بعد؟',
    registerLink: 'سجل هنا'
  },
  register: {
    title: 'إنشاء حساب',
    subtitle: 'سجل لحفظ محادثاتك والوصول إليها.',
    nameLabel: 'الاسم',
    namePlaceholder: 'اسمك (اختياري)',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'example@domain.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '8 أحرف على الأقل',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
    submit: 'إنشاء حساب',
    hasAccount: 'هل لديك حساب بالفعل؟',
    loginLink: 'سجل الدخول هنا'
  }
}
