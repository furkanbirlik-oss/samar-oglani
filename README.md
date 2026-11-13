# Şamar Oğlanı

Arkadaşlarla gülmek için yapılmış, fizik tabanlı bir stres atma oyunu. Bir fotoğraf yükle, yüzü bez bebeğin kafasına oturt, karakterini seç ve bebeği savur. Kan ya da yaralanma yok; yıldızlar, "POW / ŞAK / BAM" yazıları ve komik sesler var.

## Nasıl çalıştırılır?

**En kolay yol:** `index.html` dosyasına çift tıkla. Oyun tarayıcıda açılır. İnternet gerekmez.

**Yedek yol (çift tıklama sorun çıkarırsa):** Bilgisayarında Node.js kuruluysa bu klasörde bir terminal aç ve şunu çalıştır:

```bash
npx serve
```

Terminalde yazan adresi (genelde `http://localhost:3000`) tarayıcıda aç.

## Nasıl oynanır?

| Ne yapmak istiyorsun | Nasıl |
| --- | --- |
| Saldırı | Alttaki butonlar ya da klavyede `1` ve `2` |
| Bebeği tutup fırlatmak | Fareyle (ya da parmakla) tut, sürükle, bırak |
| Bebeği ayağa kaldırmak | "Ayağa Kaldır" butonu ya da `R` |
| Sesi açıp kapatmak | Hoparlör butonu ya da `M` |
| Menüye dönmek | "← Menü" butonu ya da `Esc` |

- Art arda hızlı vurursan **kombo** yaparsın; kombo puanı çarpar.
- Bebeği duvara ya da yere sert çarptırmak da puan kazandırır.
- **Hasar Puanı** arttıkça yüze süsler eklenir: yara bandı (120), morarmış göz (350), şaşı gözler (700), kafada şişlik (1200), dönen gözler (2000).
- Bebek bir süre rahat bırakılırsa kendiliğinden ayağa kalkar.

## Fotoğraf gizliliği

Yüklediğin fotoğraf yalnızca açık olan sekmenin belleğinde durur. Hiçbir sunucuya gönderilmez, `localStorage` dahil hiçbir yere kaydedilmez. Sayfayı yenilediğinde ya da kapattığında silinir.

## Klasör yapısı

```
index.html            Tek sayfa: menü, kırpma ekranı, oyun ekranı
css/style.css         Görünüm
lib/matter.min.js     Fizik motoru (Matter.js 0.20.0)
assets/characters/    Karakterlerin gerçek fotoğrafları için klasör
js/characters.js      Karakter listesi ve yer tutucu çizimleri
js/attacks.js         Saldırı listesi ve uçan nesnelerin hareketi
js/effects.js         Sarsıntı, yazılar, yıldızlar, ağır çekim
js/audio.js           Sesler (Web Audio ile üretilir, ses dosyası yok)
js/ragdoll.js         Eklemli bez bebek
js/physics.js         Fizik dünyası, duvarlar, tutup fırlatma
js/face.js            Varsayılan yüz ve hasar süsleri
js/cropper.js         Fotoğraf yükleme ve kırpma
js/score.js           Puan, kombo, hasar seviyeleri
js/main.js            Hepsini birbirine bağlayan kod
```

## Bir karakterin resmini gerçek fotoğrafla değiştirmek

1. Kare'ye yakın bir fotoğrafı `assets/characters/` klasörüne koy, örneğin `rabia.png`.
2. `js/characters.js` dosyasında o karakterin satırındaki `image: null` kısmını değiştir:

```js
image: 'assets/characters/rabia.png'
```

Fotoğraf hem menüdeki kartta hem de "Kafa At" gibi karakterin kendisinin göründüğü saldırılarda kullanılır.

## Yeni karakter eklemek

`js/characters.js` içindeki listeye bir satır ekle:

```js
{ id: 'ayse', name: 'Ayşe', color: '#f77f00', skin: '#ffd9b8', hair: '#3b2314', hairStyle: 'long', image: null, attacks: ['tokat', 'tava'] },
```

- `id`: benzersiz, küçük harfli ve Türkçe karaktersiz bir ad.
- `color`: kartın ve butonların rengi.
- `hairStyle`: `long`, `bun`, `curly` ya da `short`.
- `attacks`: `js/attacks.js` içindeki saldırı kimlikleri. Sırayla `1`, `2`, `3`... tuşlarına bağlanır; ikiden fazla da yazabilirsin.

Başka bir şey yapmana gerek yok; kart menüde kendiliğinden çıkar.

## Yeni saldırı eklemek

1. `js/attacks.js` içindeki `Oyun.attacks` listesine bir kayıt ekle:

```js
oklava: { name: 'Oklava', icon: '🥖', words: ['TAK!', 'KÜT!'], sound: 'punch',
          target: 'head', power: 24, lift: 0.3, spin: 0.4, damage: 42, anim: 'swing', duration: 180, size: 90 },
```

2. `js/characters.js` içinde bir karakterin `attacks` listesine kimliğini (`'oklava'`) yaz.

Alanların anlamı `js/attacks.js` dosyasının başında tek tek açıklanıyor. En çok oynayacağın üçü:

- `power`: savurma gücü (15 hafif, 35 çok sert).
- `damage`: temel hasar puanı.
- `anim`: `swing` (savurma), `jab` (düz vuruş), `throw` (ekran dışından fırlatma), `dash` (ekran dışından dalış).

Yeni bir ses istersen `js/audio.js` içindeki `SOUNDS` listesine bir fonksiyon ekle ve saldırıda `sound: 'adı'` olarak kullan.

## Ayarlarla oynamak

- Hasar seviyelerinin puan eşikleri ve adları: `js/score.js` (`thresholds`, `levelNames`).
- Kombo süresi: `js/score.js` (`COMBO_WINDOW`).
- Ağır çekimin hızı: `js/effects.js` (`SLOW_SCALE`).
- Bebeğin renkleri: `js/ragdoll.js` (`COLORS`).
