<script>
  import { t } from '@/lib/i18n/index.svelte'
</script>

<footer>
  {t('footer.createdBy')} <a href="https://emanuelsaramago.com" target="_blank">Emanuel Saramago</a>
  <span>|</span>
  <a href="mailto:modeltalking@emanuelsaramago.com">{t('footer.contact')}</a>
</footer>

<style>
  footer {
    padding-block: var(--wa-space-3xl) var(--wa-space-m);
    text-align: center;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-xs);
  }
</style>
