/**
 * Copies values from WebAwesome form controls (`wa-input`, `wa-select`, `wa-textarea`)
 * into a standard `FormData` instance before submission.
 */
export function syncWebAwesomeFormData(formElement: HTMLFormElement, formData: FormData): void {
  const controls = formElement.querySelectorAll<HTMLElement & { name?: string; value?: unknown }>(
    'wa-input, wa-select, wa-textarea'
  )

  for (const control of controls) {
    const name = control.name || control.getAttribute('name')
    if (name && control.value !== undefined && control.value !== null && !formData.get(name)) {
      formData.set(name, String(control.value))
    }
  }
}
