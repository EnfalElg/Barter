# Barter — Fiyat Yok, Denge Var

**Barter**, kullanıcıların ürünlerini satış fiyatı üzerinden değil, gizli değer dengesi, güven skoru, AI değer rozeti ve takas uyumu üzerinden değiştirebildiği modern bir takas platformudur.

Canlı demo:  
https://barter-indol.vercel.app

## Proje Fikri

Geleneksel ikinci el platformlarında kullanıcılar ürünlerini fiyatlandırmak, pazarlık yapmak ve güven problemiyle uğraşmak zorunda kalır. Barter bu yaklaşımı değiştirir.

Bu platformda ürünlerin parasal değeri diğer kullanıcılara açıkça gösterilmez. Kullanıcı kendi ürününe özel bir değer biçer; sistem bu değeri arka planda yalnızca denk takasları bulmak için kullanır.

Ana fikir:

> **Fiyat yok, denge var.**

Kullanıcılar ürünleri fiyatına göre değil; ihtiyaçlarına, güven skoruna, ürün rozetlerine, konuma, takas dengesine ve sohbet üzerinden kurdukları güvene göre değerlendirir.

## Temel Özellikler

### Gizli Değer Sistemi

Kullanıcı ürün eklerken ürüne kendi biçtiği değeri girer. Bu değer:

- Diğer kullanıcılara gösterilmez.
- Public ürün kartlarında görünmez.
- Takas eşleşmelerinde arka planda kullanılır.
- Sadece ürün sahibi tarafından profil ve düzenleme ekranlarında görülebilir.

Bu sayede uygulama klasik bir satış pazaryeri gibi değil, gerçek bir takas platformu gibi çalışır.

### AI Değer Rozeti

Ürün eklenirken veya düzenlenirken AI, kullanıcının belirlediği değeri kontrol eder ve bir rozet üretir:

- Makul değer
- Biraz düşük olabilir
- Çok düşük olabilir
- Biraz yüksek olabilir
- Çok yüksek olabilir
- AI emin değil

AI ürün değerini zorla belirlemez. Kullanıcı kendi değerini seçmeye devam eder; AI yalnızca bir kontrol ve uyarı katmanı sağlar.

### Denk Takas Alanı

Kullanıcı kendi ürünlerinden birini veya birkaçını seçebilir. Sistem seçilen ürünlerin gizli toplam değerine yakın ürünleri bulur.

Örneğin kullanıcı iki ürün seçtiğinde sistem arka planda toplam değeri hesaplar ve yaklaşık aynı değer bandındaki ürünleri önerir. Ancak bu değerler kullanıcıya gösterilmez.

Kullanıcı sadece şu tarz ifadeler görür:

- Denk takas adayı
- Çok denk takas
- Dengeli takas
- Biraz dengesiz
- Dengesiz takas

Yüzde veya TL bilgisi gösterilmez.

### Akıllı Takas Önerileri

Kullanıcı “Benim ürünlerimle ne alabilirim?” akışı üzerinden kendi ürünlerini seçerek öneriler alabilir.

Öneriler şu sinyallere göre hazırlanır:

- Gizli değer dengesi
- Kategori uyumu
- Kullanıcının aradığı kategoriler
- Konum benzerliği
- AI değer rozeti
- Güven skoru
- Güvenlik sinyalleri

Öneri kartlarında fiyat veya skor gösterilmez; yalnızca nitel etiketler gösterilir:

- Çok uygun takas adayı
- Uygun takas adayı
- Düşünülebilir
- Zayıf eşleşme

### Takas Teklifleri

Kullanıcılar başka bir ürün için kendi ürünlerinden birini veya birkaçını teklif edebilir.

Teklif akışı:

1. Kullanıcı almak istediği ürünü seçer.
2. Kendi ürünlerinden bir veya birkaçını teklif eder.
3. Sistem takas dengesini arka planda hesaplar.
4. Kullanıcı teklif mesajı ekleyebilir.
5. Karşı taraf teklifi kabul edebilir, reddedebilir veya sohbet başlatabilir.

Teklif durumları:

- Beklemede
- Kabul edildi
- Reddedildi
- İptal edildi
- Tamamlandı

### Takas Tamamlama ve Puanlama

Kabul edilen takaslar tamamlandı olarak işaretlenebilir. Takas tamamlandığında ilgili ürünler artık keşfet ekranında görünmez.

Tamamlanan takas sonrası kullanıcılar birbirini puanlayabilir. Bu puanlar güven skorunun hesaplanmasında kullanılır.

### Güven Skoru

Her kullanıcı için bir güven skoru gösterilir.

Güven skoru şu bilgilere göre hesaplanır:

- Profil bilgileri
- Tamamlanan takas sayısı
- Ortalama puan
- Puanlama sayısı
- Aktif ürün sayısı
- Riskli veya belirsiz ürün sinyalleri

Örnek etiketler:

- Çok güvenilir
- Güvenilir
- Yeni kullanıcı
- Dikkatli ilerle
- Riskli görünüyor

### Güvenlik Uyarıları

Platform, teklif ve ürün detaylarında basit güvenlik sinyalleri üretir.

Örneğin:

- Ürün açıklaması çok kısa olabilir.
- Ürün fotoğrafı eksik olabilir.
- İlan sahibinin güven geçmişi sınırlı olabilir.
- AI ürün değerinden emin olmayabilir.
- Takas dengesi zayıf olabilir.

Kullanıcıya şu tarz öneriler sunulur:

- Kalabalık ve güvenli bir buluşma noktası seç.
- Ürünü teslim almadan önce kontrol et.
- Ek fotoğraf veya bilgi istemekten çekinme.
- Şüpheli durumda takası iptal edebilirsin.

### Sohbet

Kullanıcılar ilan sahipleriyle veya takas teklifi taraflarıyla sohbet başlatabilir.

Sohbet akışı:

- Ürün detayından sohbet başlatma
- Teklif kartından sohbet etme
- Sohbetler sayfasında tüm konuşmaları görme
- Ürüne bağlı sohbet bağlamı

### Favoriler

Kullanıcılar ilgilendikleri ürünleri kaydedebilir.

Favoriler sayfasında:

- Kaydedilen ürünler görüntülenir.
- Ürün detayına gidilebilir.
- Takas teklifi gönderilebilir.
- Sohbet başlatılabilir.
- Kayıt kaldırılabilir.

### Bildirimler

Uygulama içi bildirim merkezi bulunur.

Bildirim örnekleri:

- Yeni takas teklifi aldın.
- Takas teklifin kabul edildi.
- Teklifin reddedildi.
- Yeni mesajın var.
- Takas tamamlandı.
- Yeni değerlendirme aldın.

### Konum Rozetleri

Ürünlerde konum bilgisi kullanılır.

Sistem, kullanıcıya nitel konum sinyalleri gösterebilir:

- Yakın bölgede
- Aynı şehirde
- Kargo gerekebilir
- Konum belirsiz

Tam adres veya hassas koordinatlar gösterilmez.

### İstek Listesi

Kullanıcı ürün eklerken karşılığında ne aradığını belirtebilir.

Örnek:

- Elektronik
- Kitap & Hobi
- Kahve & Mutfak
- Oyun & Konsol
- Kamp & Outdoor

Ayrıca anahtar kelimeler de eklenebilir:

- kahve makinesi
- Kindle
- mekanik klavye
- kulaklık

Bu bilgiler öneri sisteminde kullanılır.

## Gizlilik Yaklaşımı

Barter’ın en önemli prensibi, ürün değerlerinin gizli kalmasıdır.

Public alanlarda şu bilgiler gösterilmez:

- user_value
- estimated_price
- ai_min_value
- ai_max_value
- ai_value_deviation
- value_match_score yüzdesi
- TL fiyatı
- gizli değer aralığı

Bu bilgiler sadece sistemin arka planda takas dengesi oluşturması için kullanılır.

Kullanıcılar fiyat yerine şu sinyallere göre karar verir:

- Ürün açıklaması
- Kategori
- Kondisyon
- Konum
- AI değer rozeti
- Güven skoru
- Takas dengesi etiketi
- Sohbet
- Güvenlik uyarıları

## Kullanıcı Akışı

Tipik bir kullanıcı akışı şöyledir:

1. Kullanıcı giriş yapar.
2. Ürün ekler.
3. Ürüne kendi değerini biçer.
4. AI bu değeri değerlendirir ve rozet üretir.
5. Kullanıcı kendi ürünlerinden birini veya birkaçını seçer.
6. Sistem uygun takas adaylarını önerir.
7. Kullanıcı takas teklifi gönderir.
8. Taraflar sohbet eder.
9. Teklif kabul edilir.
10. Takas tamamlanır.
11. Kullanıcılar birbirini değerlendirir.
12. Güven skoru güncellenir.

## Kullanılan Teknolojiler

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Row Level Security
- Gemini API
- Vercel

## Ana Sayfalar

| Sayfa | Açıklama |
|---|---|
| `/` | Landing / dashboard |
| `/discover` | Keşfet sayfası |
| `/login` | Giriş sayfası |
| `/profile` | Kullanıcı profili ve kendi ürünleri |
| `/recommendations` | Akıllı takas önerileri |
| `/offers` | Gelen ve giden takas teklifleri |
| `/offers/new` | Yeni takas teklifi oluşturma |
| `/chat` | Sohbet listesi |
| `/chat/[id]` | Sohbet detayı |
| `/favorites` | Favoriler |
| `/notifications` | Bildirimler |
| `/products/[id]` | Ürün detay sayfası |
| `/products/[id]/edit` | Ürün düzenleme |
| `/products/[id]/matches` | Denk takas alanı |
| `/users/[id]` | Public kullanıcı profili |

## Kurulum

Projeyi klonla:

```bash
git clone https://github.com/EnfalElg/Barter.git
cd Barter
```

Bağımlılıkları yükle:

```bash
npm install
```

`.env.local` dosyasını oluştur:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Geliştirme sunucusunu başlat:

```bash
npm run dev
```

Uygulama localde şu adreste çalışır:

```bash
http://localhost:3000
```

## Environment Variables

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL’i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `GOOGLE_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Kullanılacak Gemini modeli |

Örnek:

```env
GEMINI_MODEL=gemini-2.5-flash
```

Not: API keyler client tarafına sızdırılmamalıdır. `GOOGLE_API_KEY` sadece server tarafında kullanılmalıdır.

## Supabase

Bu proje Supabase Auth, Database ve RLS kullanır.

Temel tablolar:

- products
- profiles
- swap_offers
- swap_offer_items
- swap_ratings
- chat_threads
- chat_messages
- product_favorites
- notifications

Migration kullanılıyorsa:

```bash
supabase db push
```

Schema cache yenilemek için SQL Editor’da:

```sql
notify pgrst, 'reload schema';
```

## Demo Verisi

Demo seed script varsa:

```bash
npm run seed:demo
```

Seed script yalnızca local veya demo ortamında kullanılmalıdır. `SUPABASE_SERVICE_ROLE_KEY` client tarafında asla kullanılmamalıdır.

## Deployment

Proje Vercel üzerinde yayına alınmıştır.

Canlı demo:

```text
https://barter-indol.vercel.app
```

Deploy için:

1. GitHub reposunu Vercel’e bağla.
2. Environment variables ekle.
3. Supabase Auth URL ayarlarını güncelle.
4. Deploy et.

Supabase Authentication ayarlarında:

Site URL:

```text
https://barter-indol.vercel.app
```

Redirect URLs:

```text
https://barter-indol.vercel.app/**
http://localhost:3000/**
```

## Güvenlik Notları

- Public UI’da fiyat gösterilmez.
- Gizli değerler sadece owner-only ekranlarda görünür.
- Takas tekliflerinde yüzdelik değer uyumu gösterilmez.
- AI yalnızca değer kontrolü yapar; otomatik sonsuz döngüye girmez.
- Kullanıcı ürün değeri üzerinde tam kontrole sahiptir.
- RLS politikaları ile kullanıcıların sadece kendi verilerini güncellemesi hedeflenir.
- Chat mesajları sadece konuşma katılımcıları tarafından görüntülenmelidir.
- Bildirimler kullanıcıya özeldir.

## AI Nasıl Kullanılıyor?

AI şu amaçlarla kullanılır:

- Ürün için makul değer aralığı tahmini
- Kullanıcının biçtiği değerin kontrolü
- AI değer rozeti üretimi
- Belirsiz ürünlerde “AI emin değil” uyarısı

AI şu işlemlerde otomatik sürekli çalışmaz:

- Keşfet sayfası
- Filtreleme
- Slider ile değer değiştirme
- Takas teklifi oluşturma
- Sohbet
- Bildirimler
- Favoriler

Bu sayede hem maliyet hem de quota kontrol altında tutulur.

## Proje Sloganı

> **Fiyat yok, denge var.**

## Kısa Tanım

Barter, ürün değerlerini gizli tutarak kullanıcıların güvenli, dengeli ve ihtiyaç odaklı takas yapmasını sağlayan AI destekli modern bir barter platformudur.