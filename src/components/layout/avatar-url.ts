const AVATAR_SIZE = 64;

/**
 * Avatar gerado pelo DiceBear a partir das iniciais. O nome completo é a seed,
 * então a mesma pessoa recebe sempre a mesma imagem.
 */
export function avatarUrl(firstName: string, lastName: string): string {
  const seed = encodeURIComponent(`${firstName} ${lastName}`);
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&size=${AVATAR_SIZE}`;
}
