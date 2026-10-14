// Filtro por especialidad para grillas (Equipo y Educación).
// Botones: [data-filtro="slug" | "todas"]; elementos: [data-especialidad].
export function iniciarFiltro(contenedor: HTMLElement) {
  const botones = contenedor.querySelectorAll<HTMLButtonElement>('[data-filtro]');
  const items = document.querySelectorAll<HTMLElement>(contenedor.dataset.items ?? '[data-especialidad]');
  const estado = document.getElementById(contenedor.dataset.estado ?? '');

  const aplicar = (filtro: string) => {
    let visibles = 0;
    items.forEach((el) => {
      const mostrar = filtro === 'todas' || el.dataset.especialidad === filtro;
      (el.closest('li') ?? el).hidden = !mostrar;
      if (mostrar) visibles++;
    });
    botones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro)));
    if (estado) estado.textContent = `${visibles} ${visibles === 1 ? 'resultado' : 'resultados'}`;
  };

  botones.forEach((b) => b.addEventListener('click', () => {
    aplicar(b.dataset.filtro!);
    const url = new URL(location.href);
    if (b.dataset.filtro === 'todas') url.searchParams.delete('especialidad');
    else url.searchParams.set('especialidad', b.dataset.filtro!);
    history.replaceState(null, '', url);
  }));

  const inicial = new URLSearchParams(location.search).get('especialidad');
  if (inicial && [...botones].some((b) => b.dataset.filtro === inicial)) aplicar(inicial);
}
