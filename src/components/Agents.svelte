<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'

  let {
    agent1Name = $bindable('Agente 1'),
    agent2Name = $bindable('Agente 2'),
    agent1Avatar = $bindable('/img/personas/1.svg'),
    agent2Avatar = $bindable('/img/personas/2.svg'),
    systemPrompt1 = $bindable(),
    systemPrompt2 = $bindable()
  }: {
    agent1Name?: string
    agent2Name?: string
    agent1Avatar?: string
    agent2Avatar?: string
    systemPrompt1: string
    systemPrompt2: string
  } = $props()

  const configs = $derived([
    {
      id: 'agent1',
      name: agent1Name,
      value: systemPrompt1,
      avatar: agent1Avatar,
      onNameInput: (e: Event) => {
        agent1Name = (e.currentTarget as HTMLInputElement).value
      },
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt1 = target.value
      }
    },
    {
      id: 'agent2',
      name: agent2Name,
      value: systemPrompt2,
      avatar: agent2Avatar,
      onNameInput: (e: Event) => {
        agent2Name = (e.currentTarget as HTMLInputElement).value
      },
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt2 = target.value
      }
    }
  ])
</script>

<Grid wrap={true} break="small" fullWidth>
  {#each configs as config (config.id)}
    <wa-card>
      <Grid direction="column" gap="s">
        <wa-avatar image={config.avatar}></wa-avatar>
        <wa-input
          label="Name"
          placeholder="Como me chamo?"
          maxlength="40"
          value={config.name}
          oninput={config.onNameInput}
        ></wa-input>
        <wa-textarea
          maxlength="200"
          value={config.value}
          oninput={config.oninput}
          placeholder="Descreve-me"
        ></wa-textarea>
      </Grid>
    </wa-card>
  {/each}
</Grid>

<style>
wa-textarea {
  &::part(textarea) {
    field-sizing: content;
    resize: none;
  }
  &::part(base) {
    background-color: var(--wa-color-neutral-10);
  }
}
</style>
