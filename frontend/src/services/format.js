const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const money = (value) => currency.format(value);
export const date = (value) => dateTime.format(new Date(value)).replace(',', ' às');

export function matchesBook(book, search) {
  const text = normalize([book.nome, book.autor, book.genero].join(' '));
  return normalize(search.trim()).split(/\s+/).every((word) => text.includes(word));
}
