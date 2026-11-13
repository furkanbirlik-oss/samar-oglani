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

1. **Kurban:** İki yol var. "Yüz Fotoğrafı" ile yalnızca yüzü yükleyip daireye oturtursun; bebeğin gövdesi çizim kalır. "Tam Boy Fotoğraf" ile baştan ayağa bir fotoğraf yüklersin; bebeğin tamamı o kişi olur (aşağıda anlatılıyor). Fotoğrafın altındaki düğmelerle çizim stilini seç: Çizgi Film, ✨ Anime (YZ), Anime Filtre, Pop Art, Karakalem ya da Orijinal.
2. **Karakter:** Dört karakterden birini seç.
3. **Yetenekler:** 15 yetenekten en fazla 4 tanesini seç. Seçme sıran tuş sıran olur. Karakterin iki favorisi hazır seçili gelir; değiştirebilirsin.
4. **Mod:** "Serbest" (süre yok) ya da "60 Saniye Yarışı" (süre bitince puan, unvan ve rekor gösterilir).

| Ne yapmak istiyorsun | Nasıl |
| --- | --- |
| Yetenek kullanmak | Alttaki butonlar ya da klavyede `1`-`4` |
| Çıldırmak (öfke barı dolunca) | "ÇILDIR!" butonu ya da `Boşluk` |
| Bebeği tutup fırlatmak | Fareyle (ya da parmakla) tut, sürükle, bırak |
| Bebeği ayağa kaldırmak | "Ayağa Kaldır" butonu ya da `R` |
| Sesi açıp kapatmak | Hoparlör butonu ya da `M` |
| Menüye dönmek | "← Menü" butonu ya da `Esc` |

- **Bekleme süresi:** Her yeteneğin bir bekleme süresi var; güçlü olanlar daha geç dolar. Butonun üstündeki koyu perde süreyi gösterir.
- **Kombo:** Art arda hızlı vurursan kombo yaparsın; kombo puanı çarpar.
- **Öfke barı:** Puan kutusunun altındaki bar vurdukça dolar. Dolunca 5 saniyeliğine çıldırırsın: yetenekler kendiliğinden yağar, bekleme süresi kalkar ve hasar iki katına çıkar.
- **Özel yetenekler:** Piyano bebeği yassıltır, Pasta yüzü kremaya bular, Yumurta Yağmuru altı yumurta düşürür, Yaylı Eldiven havaya fırlatır, Hortum havada döndürür.
- Bebeği duvara ya da yere sert çarptırmak da puan kazandırır.
- **Hasar Puanı** arttıkça yüze süsler eklenir: yara bandı (120), morarmış göz (350), şaşı gözler (700), kafada şişlik (1200), dönen gözler (2000).
- Bebek bir süre rahat bırakılırsa kendiliğinden ayağa kalkar ve laf atar.

## Fotoğraf gizliliği

Yüklediğin fotoğraf yalnızca açık olan sekmenin belleğinde durur. Çizgi film filtreleri ve "Anime (YZ)" yapay zekâ modeli de senin cihazında çalışır; hiçbir dış servis kullanılmaz. Hiçbir sunucuya gönderilmez, `localStorage` dahil hiçbir yere kaydedilmez. Sayfayı yenilediğinde ya da kapattığında silinir.

## Tam boy fotoğraftan bebek

"🧍 Tam Boy Fotoğraf" ile yüklenen fotoğraf kafa, gövde, kol ve bacak parçalarına kesilip bebeğe giydirilir; bebek kıyafetiyle, saçıyla o kişinin kendisi olur.

1. Fotoğrafı seç. Bir yapay zekâ modeli (MediaPipe Pose) eklemleri kendiliğinden bulur ve kişiyi arka plandan ayırır.
2. "Eklemleri kontrol et" ekranı açılır. Yanlış duran noktayı sürükleyerek düzelt; "Kalınlık" kaydırıcısıyla kol ve bacakların ne kadar geniş kesileceğini ayarla.
3. "Tamam"a bas. Seçtiğin stil bütün vücuda uygulanır.

İyi sonuç için: baştan ayağa görünen, düz duran, kolları gövdeden biraz açık ve arka planı sade bir fotoğraf kullan.

- Model ve kütüphanesi (yaklaşık 24 MB) yalnızca ilk tam boy fotoğrafta indirilir.
- Anime (YZ) tam boyda iki geçiş yapar (bütün vücut, sonra kafa); bilgisayarda 15-20 saniye sürer.
- Hasar süsleri (yara bandı, dönen gözler...) fotoğraftaki gerçek göz konumuna yerleşir.
- Bu özellik de `index.html` dosyasına çift tıklanarak açıldığında otomatik bulma yapamaz; noktaları elle yerleştirirsin ve arka plan silinmez.

## Anime (YZ) stili

"✨ Anime (YZ)" stili, fotoğrafı anime çizimine çeviren bir yapay zekâ modelini (AnimeGANv2) tarayıcının içinde çalıştırır.

- Model ve çalıştırma kütüphanesi (toplam yaklaşık 23 MB) yalnızca bu stil ilk seçildiğinde indirilir.
- Çevirme bilgisayarda 10 saniye, telefonda yarım dakika kadar sürebilir; bu sırada fotoğrafın aslı gösterilir.
- Bu stil, oyun `index.html` dosyasına çift tıklanarak açıldığında çalışmaz; siteden ya da `npx serve` ile açmak gerekir.
- Modelin kaynağı ve lisans notu `models/KAYNAK.md` dosyasında. Oyunu ticari amaçla kullanmadan önce o notu oku.

## Klasör yapısı

```
index.html            Tek sayfa: menü, kırpma ekranı, oyun ekranı
css/style.css         Görünüm
lib/matter.min.js     Fizik motoru (Matter.js 0.20.0)
assets/characters/    Karakterlerin gerçek fotoğrafları için klasör
js/characters.js      Karakter listesi ve yer tutucu çizimleri
js/attacks.js         Yetenek havuzu ve uçan nesnelerin hareketi
js/cartoon.js         Fotoğrafı çizgi filme çeviren filtreler
js/anime-ai.js        Anime (YZ): yapay zekâ modelini tarayıcıda çalıştırır
js/pose.js            Tam boy fotoğrafta eklemleri ve kişi maskesini bulur
js/bodyskin.js        Fotoğrafı parçalara kesip bebeğe giydirir, eklem düzenleme ekranı
lib/mediapipe/        Poz modelini çalıştıran kütüphane
lib/ort/              Modeli çalıştıran kütüphane (onnxruntime-web)
models/               Anime ve poz modelleri, kaynak notu
js/effects.js         Sarsıntı, yazılar, yıldızlar, ağır çekim
js/audio.js           Sesler (Web Audio ile üretilir, ses dosyası yok)
js/ragdoll.js         Eklemli bez bebek
js/physics.js         Fizik dünyası, duvarlar, tutup fırlatma
js/face.js            Varsayılan yüz ve hasar süsleri
js/cropper.js         Fotoğraf yükleme ve kırpma
js/score.js           Puan, kombo, öfke barı, hasar seviyeleri
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
- `attacks`: karakterin favori yetenekleri. Yetenek seçme ekranında hazır seçili gelir (en fazla 4).

Başka bir şey yapmana gerek yok; kart menüde kendiliğinden çıkar.

## Yeni yetenek eklemek

`js/attacks.js` içindeki `Oyun.attacks` listesine bir kayıt ekle; yetenek seçme ekranında kendiliğinden görünür:

```js
oklava: { name: 'Oklava', icon: '🥖', words: ['TAK!', 'KÜT!'], sound: 'punch',
          target: 'head', power: 24, lift: 0.3, spin: 0.4, damage: 42, cooldown: 900, anim: 'swing', duration: 180, size: 90 },
```

Alanların anlamı `js/attacks.js` dosyasının başında tek tek açıklanıyor. En çok oynayacakların:

- `power`: savurma gücü (10 hafif, 35 çok sert).
- `damage`: temel hasar puanı.
- `cooldown`: bekleme süresi (milisaniye).
- `anim`: `swing` (savurma), `jab` (düz vuruş), `throw` (fırlatma), `dash` (dalış), `drop` (tepeden düşme), `uppercut` (alttan vuruş).
- `fx`: özel etki: `cream`, `egg`, `squash` ya da `tornado`.

Yeni bir ses istersen `js/audio.js` içindeki `SOUNDS` listesine bir fonksiyon ekle ve yetenekte `sound: 'adı'` olarak kullan.

## Ayarlarla oynamak

- Hasar seviyelerinin puan eşikleri ve adları: `js/score.js` (`thresholds`, `levelNames`).
- Kombo süresi ve öfke barının dolma hızı: `js/score.js` (`COMBO_WINDOW`, `RAGE_PER_POINT`).
- Yetenek sayısı, yarış süresi, çıldırma süresi ve unvanlar: `js/main.js` başındaki sabitler.
- Çizim stilleri: `js/cartoon.js` (`STYLES`).
- Ağır çekimin hızı: `js/effects.js` (`SLOW_SCALE`).
- Bebeğin renkleri: `js/ragdoll.js` (`COLORS`).
