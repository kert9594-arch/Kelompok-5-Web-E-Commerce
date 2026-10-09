# KEL 5 DIMSUM V34 — Perbaikan Akun Online

Versi ini mempertahankan tampilan V34 tanpa logo K5. Sistem daftar/login sudah disiapkan untuk menggunakan Supabase Auth. **Akun online belum aktif sampai Publishable key Supabase dimasukkan.**

## 1. Masukkan Publishable key
1. Buka folder `kel32` di VS Code.
2. Buka `script.js`.
3. Cari baris `const SUPABASE_PUBLISHABLE_KEY='TEMPEL_PUBLISHABLE_KEY_DI_SINI';`
4. Ganti teks `TEMPEL_PUBLISHABLE_KEY_DI_SINI` dengan Publishable key dari Supabase (biasanya diawali `sb_publishable_`). Pertahankan tanda petik.
5. Simpan file.

Alamat proyek yang disetel: `https://chstiboptuofhzhabxpt.supabase.co`.

## 2. Pastikan Supabase Auth aktif
- Buka Supabase Dashboard → Authentication → Providers → Email, lalu pastikan Email aktif.
- Untuk pendaftaran yang meminta verifikasi, pengguna harus membuka email verifikasi sebelum bisa login.
- Untuk uji coba kelas, pengaturan verifikasi email bisa disesuaikan dari Authentication → Settings. Jangan menonaktifkannya untuk toko produksi tanpa pertimbangan keamanan.

## 3. Jalankan website
- Ekstrak ZIP.
- Buka folder `kel32` di VS Code.
- Jalankan `index.html` dengan Live Server, atau unggah isi folder `kel32` ke hosting statis.
- Website memerlukan internet untuk memuat Supabase SDK dan menghubungi Supabase.

## Apa yang disimpan online?
- Pendaftaran dan login: Supabase Auth.
- Nama, username, nomor HP, dan alamat profil: metadata akun Supabase.
- Foto profil tetap tersimpan lokal pada browser/perangkat ini.
- Keranjang dan pesanan masih demo/localStorage, belum tersinkron antarperangkat.

## Keamanan
Gunakan hanya Publishable key di browser. **Jangan pernah memasukkan Secret key atau service_role key ke `script.js`.** Jangan simpan password pengguna di `localStorage`; autentikasi online ditangani Supabase.

Jika akun online belum aktif, halaman akan tetap berjalan dalam mode demo lokal sampai Publishable key diganti.
