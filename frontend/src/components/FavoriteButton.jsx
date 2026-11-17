import { useFavorites } from '../context/FavoritesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from './Icon.jsx';

export default function FavoriteButton({ book, withText = false }) {
  const { favorites, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const active = favorites.has(String(book.id));

  function toggle() {
    toggleFavorite(book.id);
    showToast(active ? 'Livro removido da sua estante.' : 'Livro adicionado à sua estante.', active ? 'info' : 'success');
  }

  return (
    <button type="button" className={'favorite-button' + (withText ? ' favorite-button--labeled' : '')}
      onClick={toggle} aria-pressed={active} aria-label={'Favoritar ' + book.nome}>
      <Icon name="heart" size={20} />
      {withText && (active ? 'Na minha estante' : 'Favoritar')}
    </button>
  );
}
