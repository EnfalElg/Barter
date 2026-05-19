-- Uygulama artık bu fonksiyonları kullanmıyor (eşleşme Next.js API + keşif doğrudan SELECT).
-- Şema önbelleği / eksik fonksiyon hatalarını temizlemek için güvenli bırakma.

drop function if exists public.get_similar_barter_matches(uuid, numeric);
drop function if exists public.discover_similar_value_rows(double precision, double precision, double precision, uuid);
