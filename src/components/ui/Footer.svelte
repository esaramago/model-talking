<script>
  import { stats } from '@/lib/state/stats.svelte'
  import { t } from '@/lib/i18n/index.svelte'
</script>

<footer>
  Criado por <a href="https://emanuelsaramago.com" target="_blank">Emanuel Saramago</a>
  <span>|</span>
  {t('header.model')}: {stats.model}
</footer>

<style>
  footer {
    padding-block: var(--wa-space-3xl) var(--wa-space-m);
    text-align: center;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-xs);
  }
</style>
