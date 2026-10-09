let authMode='login', pendingAction=null, productTab='Semua', cart=JSON.parse(localStorage.getItem('dinsumCart')||'[]'), selectedCartIds=new Set(cart.map(i=>i.id)), selectedPayment={name:'BRI',img:'assets/bri.svg'}, selectedShipping={name:'J&T Express',img:'assets/jnt.svg',estimate:'Estimasi 2–4 hari',cost:12000};
const products=[
{id:1,name:'DIMSUM Ayam Original',tag:'Terlaris',price:89000,old:110000,image:'assets/products/dimsum-ayam-original.svg',sold:'2,3RB'},
{id:2,name:'DIMSUM Udang Premium',tag:'Terlaris',price:99000,old:125000,image:'assets/products/dimsum-udang-premium.svg',sold:'1,8RB'},
{id:3,name:'DIMSUM Mentai',tag:'Promo',price:95000,old:120000,image:'assets/products/dimsum-mentai.svg',sold:'1,1RB'},
{id:4,name:'DIMSUM Nori',tag:'Baru',price:92000,old:115000,image:'assets/products/dimsum-nori.svg',sold:'985'},
{id:5,name:'DIMSUM Mozarella',tag:'Promo',price:105000,old:130000,image:'assets/products/dimsum-mozarella.svg',sold:'544'},
{id:6,name:'DIMSUM Jumbo',tag:'Terlaris',price:110000,old:140000,image:'assets/products/dimsum-jumbo.svg',sold:'1,5RB'},
{id:7,name:'DIMSUM Chili Oil',tag:'Baru',price:98000,old:125000,image:'assets/products/dimsum-chili-oil.svg',sold:'680'},
{id:8,name:'DIMSUM Mix Box',tag:'Baru',price:119000,old:150000,image:'assets/products/dimsum-mix-box.svg',sold:'432'}];
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const $=id=>document.getElementById(id);
// KONFIGURASI SUPABASE: isi Publishable key dari Dashboard > Project Settings > API Keys.
const SUPABASE_URL='https://chstiboptuofhzhabxpt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='TEMPEL_PUBLISHABLE_KEY_DI_SINI';
const supabaseClient=(window.supabase && SUPABASE_PUBLISHABLE_KEY!=='TEMPEL_PUBLISHABLE_KEY_DI_SINI')
  ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY) : null;
const onlineAuthEnabled=!!supabaseClient;
function profileFromAuth(authUser){
  const m=authUser?.user_metadata||{};
  return {id:authUser?.id||'',name:m.name||'',username:m.username||((authUser?.email||'').split('@')[0]),email:authUser?.email||'',phone:m.phone||'',address:m.address||'',photo:localStorage.getItem('dinsumPhoto_'+(authUser?.id||''))||''};
}
function setSignedInUser(u){
  if(!u)return;
  localStorage.setItem('dinsumCurrentUser',u.username||u.email||'');
  localStorage.setItem('dinsumUser',JSON.stringify(u));
  // Cache profil tanpa password; autentikasi online dikelola Supabase.
  const safe={...u}; delete safe.password;
  localStorage.setItem('dinsumProfileCache',JSON.stringify(safe));
}
async function syncProfileToSupabase(u){
  if(!onlineAuthEnabled)return;
  const safe={name:u.name||'',username:u.username||'',phone:u.phone||'',address:u.address||''};
  const {error}=await supabaseClient.auth.updateUser({data:safe});
  if(error) console.warn('Profil belum tersinkron:',error.message);
}
async function restoreOnlineSession(){
  if(!onlineAuthEnabled)return;
  try{
    const {data,error}=await supabaseClient.auth.getSession();
    if(error||!data.session?.user)return;
    const u=profileFromAuth(data.session.user); setSignedInUser(u);
    $('authPage').classList.add('hidden'); $('authPage').classList.remove('guest-auth');
    $('storePage').classList.remove('hidden'); renderUserUI();
  }catch(err){console.warn('Sesi online tidak dapat dipulihkan.',err)}
}

function getAccounts(){
  let accounts=JSON.parse(localStorage.getItem('dinsumAccounts')||'[]');
  const old=JSON.parse(localStorage.getItem('dinsumUser')||'null');
  // Migrasi akun lama yang masih memakai email sebagai identitas login.
  if(!accounts.length && old){
    const base=(old.username||old.email||old.name||'dinsum').toString().split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
    old.username=base||'dinsumuser';
    accounts=[old];
    localStorage.setItem('dinsumAccounts',JSON.stringify(accounts));
  }
  // Pastikan akun lama yang belum punya username mendapat username otomatis.
  let changed=false;
  accounts=accounts.map((u,i)=>{
    if(!u.username){
      const base=(u.email||u.name||('dinsum'+(i+1))).toString().split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
      u.username=base||('dinsum'+(i+1)); changed=true;
    }
    return u;
  });
  if(changed) saveAccounts(accounts);
  return accounts;
}
function saveAccounts(accounts){localStorage.setItem('dinsumAccounts',JSON.stringify(accounts))}
function getUser(){
  const username=localStorage.getItem('dinsumCurrentUser');
  const accounts=getAccounts();
  const cached=JSON.parse(localStorage.getItem('dinsumUser')||'null');
  if(username){return accounts.find(u=>(u.username||'').toLowerCase()===username.toLowerCase()) || (cached && ((cached.username||'').toLowerCase()===username.toLowerCase() || (cached.email||'').toLowerCase()===username.toLowerCase()) ? cached : null)}
  return cached;
}
function saveUser(u){
  const accounts=getAccounts();
  const idx=accounts.findIndex(x=>x.username===u.username);
  if(idx>=0) accounts[idx]={...accounts[idx],...u}; else accounts.push(u);
  saveAccounts(accounts);
  setSignedInUser(u);
  if(u.photo && u.id) localStorage.setItem('dinsumPhoto_'+u.id,u.photo);
  if(onlineAuthEnabled) syncProfileToSupabase(u);
  renderUserUI();
}
function renderUserUI(){
  const u=getUser();
  const avatar=u?.photo?`<img src="${u.photo}" alt="Profil">`:`${(u?.name||'D').charAt(0).toUpperCase()}`;
  const top=$('topProfileAvatar'), bottom=$('bottomProfileAvatar');
  if(top) top.innerHTML=avatar;
  if(bottom) bottom.innerHTML=avatar;
}
function showStore(){$('authPage').classList.add('hidden');$('authPage').classList.remove('guest-auth');$('storePage').classList.remove('hidden');renderProducts();renderCart();renderUserUI()}
function openAuth(mode='login',action=null){authMode=mode;pendingAction=action;updateAuthUI();$('authMessage').textContent='';$('authForm').reset();$('authPage').classList.remove('hidden');$('authPage').classList.add('guest-auth');updateAuthUI();setTimeout(()=>$('authUsername').focus(),50)}
function closeAuth(){if($('authPage').classList.contains('guest-auth')){$('authPage').classList.add('hidden');$('authPage').classList.remove('guest-auth');pendingAction=null}}
function finishPendingAction(){const action=pendingAction;pendingAction=null;if(action?.type==='add')addToCartAfterLogin(action.id);else if(action?.type==='buy')buyNowAfterLogin(action.id)}
function updateAuthUI(){let reg=authMode==='register';$('authTitle').textContent=reg?'Buat Akun DIMSUM':'Masuk ke KEL 5';$('authSubtitle').textContent=reg?'Daftarkan email dan buat username untuk akun DIMSUM.':(onlineAuthEnabled?'Masukkan email dan password akun kamu.':'Masukkan username dan password untuk mode demo.');$('nameGroup').classList.toggle('hidden',!reg);$('emailGroup').classList.toggle('hidden',!reg);$('confirmGroup').classList.toggle('hidden',!reg);$('authSubmit').textContent=reg?'Daftar':'Masuk';$('switchAuth').innerHTML=reg?'Sudah punya akun? <b>Masuk</b>':'Belum punya akun? <b>Daftar</b>';const email=$('authEmail');if(email) email.required=reg;const identityLabel=$('identityLabel');if(identityLabel)identityLabel.textContent=reg?'Username':(onlineAuthEnabled?'Email':'Username');const identity=$('authUsername');if(identity){identity.type=(!reg&&onlineAuthEnabled)?'email':'text';identity.placeholder=(!reg&&onlineAuthEnabled)?'nama@email.com':'Contoh: alkey123';identity.autocomplete=(!reg&&onlineAuthEnabled)?'email':'username';}}
$('switchAuth').onclick=()=>{authMode=authMode==='login'?'register':'login';$('authMessage').textContent='';$('authForm').reset();updateAuthUI()};
$('authForm').onsubmit=async e=>{
  e.preventDefault();
  const identity=$('authUsername').value.trim(),pass=$('authPassword').value,msg=$('authMessage');
  const username=identity.toLowerCase(),accounts=getAccounts();
  const button=$('authSubmit'); button.disabled=true; const originalText=button.textContent; button.textContent='Memproses...';
  try{
    if(onlineAuthEnabled){
      if(authMode==='register'){
        const name=$('authName').value.trim(),email=$('authEmail').value.trim().toLowerCase(),confirm=$('authConfirm').value;
        if(!name){msg.textContent='Nama wajib diisi.';return}
        if(!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {msg.textContent='Username 3-20 karakter, hanya huruf, angka, dan _.';return}
        if(pass.length<6){msg.textContent='Password minimal 6 karakter.';return}
        if(pass!==confirm){msg.textContent='Konfirmasi password tidak sama.';return}
        const {data,error}=await supabaseClient.auth.signUp({email,password:pass,options:{data:{name,username,phone:'',address:'',photo:''}}});
        if(error){msg.textContent=error.message.includes('already registered')?'Email ini sudah terdaftar. Silakan masuk.':error.message;return}
        if(data.session?.user){
          const u=profileFromAuth(data.session.user);setSignedInUser(u);showStore();finishPendingAction();
        }else{
          msg.textContent='Pendaftaran berhasil. Cek email kamu untuk verifikasi, lalu masuk menggunakan email dan password.';
        }
      }else{
        const {data,error}=await supabaseClient.auth.signInWithPassword({email:identity.trim().toLowerCase(),password:pass});
        if(error){msg.textContent='Email atau password salah, atau email belum diverifikasi.';return}
        const u=profileFromAuth(data.user);setSignedInUser(u);showStore();finishPendingAction();
      }
    }else{
      // Mode demo lokal hanya aktif sampai Publishable key Supabase dipasang.
      if(authMode==='register'){
        const name=$('authName').value.trim(),email=$('authEmail').value.trim().toLowerCase(),confirm=$('authConfirm').value;
        if(!name)return msg.textContent='Nama wajib diisi.';
        if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return msg.textContent='Username 3-20 karakter, hanya huruf, angka, dan _.';
        if(accounts.some(u=>(u.username||'').toLowerCase()===username))return msg.textContent='Username sudah dipakai. Silakan pilih username lain.';
        if(pass.length<6)return msg.textContent='Password minimal 6 karakter.';
        if(pass!==confirm)return msg.textContent='Konfirmasi password tidak sama.';
        const u={name,username,email,password:pass,address:'',phone:'',photo:''};
        accounts.push(u);saveAccounts(accounts);localStorage.setItem('dinsumCurrentUser',username);localStorage.setItem('dinsumUser',JSON.stringify(u));showStore();finishPendingAction();
      }else{
        const u=accounts.find(x=>(x.username||'').toLowerCase()===username);
        if(!u)return msg.textContent='Username belum terdaftar. Silakan daftar terlebih dahulu.';
        if(pass!==u.password)return msg.textContent='Username atau password salah.';
        localStorage.setItem('dinsumCurrentUser',u.username);localStorage.setItem('dinsumUser',JSON.stringify(u));showStore();finishPendingAction();
      }
    }
  }catch(err){msg.textContent='Terjadi kendala koneksi. Coba lagi.';console.error(err)}
  finally{button.disabled=false;button.textContent=originalText}
};
async function logout(){if(onlineAuthEnabled){try{await supabaseClient.auth.signOut()}catch(e){console.warn(e)}}localStorage.removeItem('dinsumCurrentUser');localStorage.removeItem('dinsumUser');localStorage.removeItem('dinsumProfileCache');location.reload()}
function setProductTab(tab,el){productTab=tab;document.querySelectorAll('.filter-row button').forEach(x=>x.classList.remove('active'));if(el)el.classList.add('active');renderProducts();document.getElementById('produk')?.scrollIntoView({behavior:'smooth',block:'start'})}
function syncSearch(){renderProducts($('marketSearch').value.toLowerCase())}
function renderProducts(qOverride){let q=(qOverride!==undefined?qOverride:$('marketSearch').value).toLowerCase();let list=products.filter(p=>(productTab==='Semua'||p.tag===productTab)&&p.name.toLowerCase().includes(q));$('productGrid').innerHTML=list.map(p=>`<article class="product"><div class="product-img" onclick="showProductDetail(${p.id})">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div><div class="product-info"><h3 onclick="showProductDetail(${p.id})">${p.name}</h3><div class="sold">⭐ 4.9 · ${p.sold} terjual</div><div class="price">${rupiah(p.price)} <span class="old">${rupiah(p.old)}</span></div><span class="badge">-15%</span><div class="product-actions"><button class="detail-btn" onclick="showProductDetail(${p.id})">Detail</button><button class="add" onclick="addToCart(${p.id})">+ Keranjang</button></div><button class="buy-now" onclick="buyNow(${p.id})">Beli Sekarang</button></div></article>`).join('')||'<p style="padding:25px">Produk tidak ditemukan.</p>'}
function save(){
  localStorage.setItem('dinsumCart',JSON.stringify(cart));
  selectedCartIds=new Set([...selectedCartIds].filter(id=>cart.some(i=>i.id===id)));
  renderCart();
}
function getSelectedCartItems(){return cart.filter(i=>selectedCartIds.has(i.id));}
function toggleCartSelection(id){
  if(selectedCartIds.has(id)) selectedCartIds.delete(id); else selectedCartIds.add(id);
  renderCart();
}
function toggleSelectAll(checked){
  if(checked) cart.forEach(i=>selectedCartIds.add(i.id));
  else selectedCartIds.clear();
  renderCart();
}
function addToCart(id){if(!getUser()){return openAuth('login',{type:'add',id})}addToCartAfterLogin(id)}
function addToCartAfterLogin(id){let x=cart.find(i=>i.id===id);x?x.qty++:cart.push({id,qty:1});selectedCartIds.add(id);save();openCart()}
function showProductDetail(id){let p=products.find(x=>x.id===id);if(!p)return;simple(p.name,`<div class="detail-product"><div class="detail-icon">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div><div class="detail-price">${rupiah(p.price)} <span>${rupiah(p.old)}</span></div><p>⭐ 4.9 · ${p.sold} terjual</p><p>Status: ${p.tag}</p><p>Produk resmi DIMSUM dengan harga promo. Tersedia untuk checkout dan pembayaran melalui transfer bank, e-wallet, atau COD.</p><div class="detail-actions"><button onclick="addToCart(${p.id});closeSimple()">+ Keranjang</button><button onclick="buyNow(${p.id});closeSimple()">Beli Sekarang</button></div></div>`)}
function buyNow(id){if(!getUser()){return openAuth('login',{type:'buy',id})}buyNowAfterLogin(id)}
function buyNowAfterLogin(id){let x=cart.find(i=>i.id===id);if(x)x.qty=1;else cart.push({id,qty:1});selectedCartIds=new Set([id]);save();openCheckout()}
function changeQty(id,n){let x=cart.find(i=>i.id===id);if(!x)return;x.qty+=n;if(x.qty<=0){cart=cart.filter(i=>i.id!==id);selectedCartIds.delete(id)}save()}
function renderCart(){
  let total=0,count=0,selectedTotal=0,selectedCount=0;
  if(!cart.length){
    $('cartItems').innerHTML='<div style="text-align:center;color:#888;padding:60px 10px">Keranjang masih kosong.<br>Yuk pilih produk DIMSUM!</div>';
  }else{
    const allSelected=cart.length>0 && cart.every(i=>selectedCartIds.has(i.id));
    $('cartItems').innerHTML=`<div class="cart-select-all"><label><input type="checkbox" ${allSelected?'checked':''} onchange="toggleSelectAll(this.checked)"><span>Pilih Semua</span></label><small>${cart.length} produk</small></div>`+
      cart.map(i=>{
        let p=products.find(x=>x.id===i.id); if(!p)return '';
        const checked=selectedCartIds.has(i.id);
        total+=p.price*i.qty; count+=i.qty;
        if(checked){selectedTotal+=p.price*i.qty;selectedCount+=i.qty}
        return `<div class="cart-row ${checked?'cart-row-selected':''}">
          <label class="cart-check"><input type="checkbox" ${checked?'checked':''} onchange="toggleCartSelection(${p.id})"></label>
          <div class="cart-thumb">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div>
          <div class="cart-main"><h4>${p.name}</h4><small>${rupiah(p.price)}</small><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${p.id},1)">+</button></div></div>
          <b>${rupiah(p.price*i.qty)}</b>
        </div>`
      }).join('');
  }
  $('cartTotal').textContent=rupiah(selectedTotal);
  const totalEl=$('cartGrandTotal'); if(totalEl) totalEl.textContent=rupiah(selectedTotal);
  const countEl=$('cartSelectedCount'); if(countEl) countEl.textContent=selectedCount+' produk dipilih';
  $('marketCartCount').textContent=count;$('bottomCartCount').textContent=count;
}
function openCart(){document.querySelector('.topbar')?.classList.add('home-hidden');$('cart').classList.add('open');$('overlay').classList.add('show');renderCart()}function closeCart(){$('cart').classList.remove('open');$('overlay').classList.remove('show');if(!$('simpleModal')?.classList.contains('show'))document.querySelector('.topbar')?.classList.remove('home-hidden')}
function openCheckout(){
  if(!getUser()){return openAuth('login',{type:'checkout'})}
  const selected=getSelectedCartItems();
  if(!selected.length)return alert('Pilih minimal satu produk untuk checkout.');
  closeCart();
  let u=getUser();$('checkoutName').textContent=u?.name||'Pelanggan KEL 5';$('checkoutAddress').textContent=u?.address||'Alamat belum diatur';
  let total=0,count=0;
  $('checkoutProducts').innerHTML=selected.map(i=>{let p=products.find(x=>x.id===i.id);total+=p.price*i.qty;count+=i.qty;return `<div class="checkout-product"><div class="mini">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div><div class="cp-info"><b>${p.name}</b><span>${rupiah(p.price)} / produk</span><div class="checkout-qty"><button type="button" onclick="changeCheckoutQty(${p.id},-1)">−</button><strong>${i.qty}</strong><button type="button" onclick="changeCheckoutQty(${p.id},1)">+</button></div></div><strong class="cp-total">${rupiah(p.price*i.qty)}</strong></div>`}).join('');
  $('checkoutItemsText').textContent=count+' Produk';$('checkoutSubtotal').textContent=rupiah(total);$('checkoutTotal').textContent=rupiah(total+selectedShipping.cost+2000);$('checkoutOverlay').classList.add('show')
}
function changeCheckoutQty(id,n){
  let x=cart.find(i=>i.id===id); if(!x)return;
  x.qty+=n;
  if(x.qty<=0){cart=cart.filter(i=>i.id!==id);selectedCartIds.delete(id);save();closeCheckout();openCart();return;}
  save();
  openCheckout();
}
function closeCheckout(){$('checkoutOverlay').classList.remove('show')}
function openPayment(){document.querySelectorAll('#paymentOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#paymentOverlay .payment-list button i').forEach(i=>i.textContent='○');document.querySelectorAll('#paymentOverlay .payment-list button').forEach(b=>{if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+selectedPayment.name+"'")){b.classList.add('selected');let i=b.querySelector('i');if(i)i.textContent='●'}});$('paymentOverlay').classList.add('show')}
function closePayment(){$('paymentOverlay').classList.remove('show')}
function openShipping(){document.querySelectorAll('#shippingOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#shippingOverlay .payment-list button i').forEach(i=>i.textContent='○');document.querySelectorAll('#shippingOverlay .payment-list button').forEach(b=>{if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+selectedShipping.name+"'")){b.classList.add('selected');let i=b.querySelector('i');if(i)i.textContent='●'}});$('shippingOverlay').classList.add('show')}
function closeShipping(){$('shippingOverlay').classList.remove('show')}
function selectShipping(name,img,estimate,cost){selectedShipping={name,img,estimate,cost:Number(String(cost).replace(/\D/g,''))};document.querySelectorAll('#shippingOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#shippingOverlay .payment-list button i').forEach(i=>i.textContent='○');let chosen=document.querySelector(`#shippingOverlay .payment-list button[onclick*='${name}']`);if(chosen){chosen.classList.add('selected');let radio=chosen.querySelector('i');if(radio)radio.textContent='●'}$('selectedShipping').innerHTML=`<img src="${img}"><div><b>${name}</b><span>${estimate} · ${cost}</span></div><strong>✓</strong>`;let total=cart.reduce((sum,i)=>{let p=products.find(x=>x.id===i.id);return sum+(p?p.price*i.qty:0)},0);$('checkoutTotal').textContent=rupiah(total+selectedShipping.cost+2000)}
function confirmShipping(){closeShipping()}
function selectPayment(name,img){selectedPayment={name,img};document.querySelectorAll('#paymentOverlay .payment-list button').forEach(b=>b.classList.remove('selected'));document.querySelectorAll('#paymentOverlay .payment-list button i').forEach(i=>i.textContent='○');let chosen=document.querySelector(`#paymentOverlay .payment-list button[onclick*='${name}']`);if(chosen){chosen.classList.add('selected');let radio=chosen.querySelector('i');if(radio)radio.textContent='●'}$('selectedPayment').innerHTML=`<img src="${img}"><div><b>${['BRI','BCA','BNI','Mandiri'].includes(name)?'Transfer Bank':'Metode Pembayaran'}</b><span>${name}</span></div><strong>✓</strong>`}
function confirmPayment(){closePayment()}
function placeOrder(){
  if(!getUser()){return openAuth('login',{type:'checkout'})}
  const selected=getSelectedCartItems();
  if(!selected.length)return alert('Pilih minimal satu produk untuk checkout.');
  let order='DNS-'+Date.now().toString().slice(-6),orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');
  orders.unshift({id:order,date:new Date().toLocaleString('id-ID'),items:selected.map(i=>({...i})),payment:selectedPayment.name,shipping:selectedShipping.name,shippingEstimate:selectedShipping.estimate,status:'Dikemas'});
  localStorage.setItem('dinsumOrders',JSON.stringify(orders));
  const selectedIds=new Set(selected.map(i=>i.id));
  cart=cart.filter(i=>!selectedIds.has(i.id));
  selectedCartIds=new Set(cart.map(i=>i.id));
  alert('Pesanan berhasil dibuat!\n\nNo. Pesanan: '+order+'\nPembayaran: '+selectedPayment.name+'\n\nTerima kasih sudah berbelanja di KEL 5.');
  save();closeCheckout();showOrders();
}
function setBottomNav(active){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));const el=document.getElementById('nav'+active);if(el)el.classList.add('active')}
function setBottomNav(active){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));const el=document.getElementById('nav'+active);if(el)el.classList.add('active')}
function simple(title,html,type=''){
  document.querySelector('.topbar')?.classList.add('home-hidden');
  const modal=$('simpleModal');
  const card=modal.querySelector('.simple-card');
  card.className='simple-card '+(type?type+'-modal-card':'');
  $('simpleContent').innerHTML=`<div class="page-title"><button class="page-back" onclick="goHome()">‹</button><h2>${title}</h2></div>${html}`;
  modal.classList.add('show');
  document.body.classList.add('page-view-open');
  setBottomNav(type==='account'?'Account':type==='orders'?'Orders':type==='live'?'Live':'Home');
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeSimple(){ $('simpleModal').classList.remove('show'); document.body.classList.remove('page-view-open'); setBottomNav('Home'); if(!$('cart')?.classList.contains('open'))document.querySelector('.topbar')?.classList.remove('home-hidden'); }
function showLive(){
 const html=`<div class="live-page kel5-social-page">
   <div class="social-topbar">
     <button class="social-plus" onclick="openCreatorMenu()" aria-label="Buat video"><span>+</span></button>
     <div class="social-tabs"><button class="social-tab active" onclick="switchLiveTab('live',this)">Live</button><button class="social-tab" onclick="switchLiveTab('video',this)">Video</button><button class="social-tab" onclick="switchLiveTab('following',this)">Mengikuti</button></div>
     <button class="social-more" onclick="alert('Pengaturan Live & Video')">⋯</button>
   </div>
   <div class="video-shop-banner"><div><b>🛍️ KEL 5 Video</b><span>Video pendek + belanja produk</span></div><button onclick="openCreatorMenu()">＋ Buat</button></div>
   <div class="social-feed" id="socialFeed">
     <section class="social-panel" data-tab="live">
       <div class="feed-head"><div><b>Live Sekarang</b><span>Belanja sambil nonton live</span></div></div>
       <div class="vertical-grid live-vertical-grid">
         <article class="vertical-card" onclick="startRealLive()"><div class="vertical-media live-media red"><span class="live-badge">● LIVE</span><strong>DIMSUM</strong><small>1,2 rb menonton</small><div class="media-gradient"></div></div><b>Live Promo KEL 5</b><p>Diskon dan produk terlaris</p><button class="video-product-btn" onclick="event.stopPropagation();buyNow(1)">🛒 Lihat produk · Rp89.000</button></article>
         <article class="vertical-card" onclick="startRealLive()"><div class="vertical-media live-media dark"><span class="live-badge">● LIVE</span><strong>UNBOXING</strong><small>856 menonton</small><div class="media-gradient"></div></div><b>Unboxing Produk Baru</b><p>Lihat produk terbaru KEL 5</p><button class="video-product-btn" onclick="event.stopPropagation();buyNow(3)">🛒 Lihat produk · Rp59.000</button></article>
       </div>
       <div id="liveStage" class="live-stage hidden"><div class="live-stage-head"><b>🔴 KEL 5 Live</b><button class="live-close" onclick="stopRealLive()" aria-label="Tutup kamera">✕</button></div><div class="live-camera-wrap"><video id="livePreview" autoplay muted playsinline></video></div><div class="live-stage-foot"><span id="liveStatus">Live aktif</span><span>👁 1 penonton</span></div></div>
     </section>
     <section class="social-panel hidden" data-tab="video">
       <div class="feed-head"><div><b>Video Belanja</b><span>Geser ke bawah · pilih produk langsung dari video</span></div><button onclick="openCreatorMenu()">＋ Buat Video</button></div>
       <div id="uploadedVideoGrid" class="video-shop-feed">
         ${videoShopCard('assets/videos/dimsum-promo.mp4','Promo Spesial KEL 5','Promo DIMSUM hari ini',1,'@kel5official','1,2 rb')}
         ${videoShopCard('','🔥 Promo Terlaris Hari Ini','Hoodie dan outfit favorit minggu ini',2,'@kel5official','856')}
         ${videoShopCard('','✨ Produk Baru KEL 5','Lihat koleksi terbaru kami',3,'@kel5official','623')}
       </div>
     </section>
     <section class="social-panel hidden" data-tab="following">
       <div class="feed-head"><div><b>Mengikuti</b><span>Konten dari KEL 5</span></div></div>
       <div class="following-empty"><div>♡</div><h3>Belum ada akun yang diikuti</h3><p>Nanti konten yang kamu ikuti akan muncul di sini.</p></div>
     </section>
   </div>
   <input id="videoUploadInput" class="hidden" type="file" accept="video/*" onchange="handleVideoUpload(this.files[0])">
   <input id="recordCameraInput" class="hidden" type="file" accept="video/*">
   <div id="recordStage" class="record-stage hidden"><div class="record-head"><b>🎥 Rekam Video</b><button onclick="closeRecordVideo()">✕</button></div><div class="record-camera-wrap"><video id="recordPreview" autoplay muted playsinline></video><span id="recordTimer">00:00</span></div><div class="record-actions"><button id="recordButton" class="record-main" onclick="toggleRecording()">● Mulai Rekam</button><button id="recordUseButton" class="hidden" onclick="useRecordedVideo()">✓ Gunakan Video</button></div></div>
 </div>`;
 simple('Live & Video',html,'live');
}
function videoShopCard(src,title,caption,pid,user,views){
 const p=products.find(x=>x.id===pid)||products[0];
 const media=src?`<video playsinline controls preload="metadata"><source src="${src}" type="video/mp4"></video>`:`<div class="video-placeholder"><span>${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><b>${title}</b><small>Video KEL 5</small></div>`;
 return `<article class="video-shop-card">
   <div class="video-main-media">${media}<div class="video-overlay"><span class="video-user">${user}</span><span>${views} tayangan</span></div></div>
   <div class="video-side-actions"><button onclick="addToCart(${p.id})">🛒<small>Keranjang</small></button><button onclick="buyNow(${p.id})">🛍️<small>Beli</small></button><button onclick="alert('Video dibagikan')">↗<small>Bagikan</small></button></div>
   <div class="video-caption"><b>${title}</b><p>${caption}</p><div class="linked-product"><span class="linked-product-icon">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><div><b>${p.name}</b><small>Terhubung ke produk · ${rupiah(p.price)}</small></div><button onclick="buyNow(${p.id})">Beli</button></div></div>
 </article>`;
}

function switchLiveTab(tab,btn){
 document.querySelectorAll('.social-tab').forEach(b=>b.classList.remove('active')); if(btn)btn.classList.add('active');
 document.querySelectorAll('.social-panel').forEach(p=>p.classList.toggle('hidden',p.dataset.tab!==tab));
}
function openCreatorMenu(){
 const existing=document.getElementById('creatorMenu');
 if(existing){existing.classList.add('show');return;}
 const menu=document.createElement('div');
 menu.id='creatorMenu'; menu.className='creator-menu-overlay';
 menu.innerHTML=`<div class="creator-menu">
   <div class="creator-menu-head"><b>Buat Konten</b><button onclick="closeCreatorMenu()">✕</button></div>
   <button onclick="closeCreatorMenu();$('videoUploadInput')?.click()"><span class="creator-menu-icon upload">↑</span><div><b>Upload Video</b><small>Pilih video dari perangkat</small></div><strong>›</strong></button>
   <button onclick="closeCreatorMenu();startRecordVideo()"><span class="creator-menu-icon record">●</span><div><b>Rekam Video</b><small>Gunakan kamera dan mikrofon</small></div><strong>›</strong></button>
   <button onclick="closeCreatorMenu();startRealLive()"><span class="creator-menu-icon live">LIVE</span><div><b>Mulai Live</b><small>Siarkan langsung dari kamera</small></div><strong>›</strong></button>
 </div>`;
 menu.addEventListener('click',e=>{if(e.target===menu)closeCreatorMenu()});
 document.body.appendChild(menu); requestAnimationFrame(()=>menu.classList.add('show'));
}
function closeCreatorMenu(){const m=document.getElementById('creatorMenu');if(m){m.classList.remove('show');setTimeout(()=>m.remove(),180);}}
function handleVideoUpload(file){
 if(!file)return;
 const grid=$('uploadedVideoGrid'); if(!grid)return;
 window.pendingVideoUpload={file,url:URL.createObjectURL(file)};
 showVideoProductPicker('upload');
}
function showVideoProductPicker(mode){
 const old=$('videoProductPicker'); if(old)old.remove();
 const box=document.createElement('div'); box.id='videoProductPicker'; box.className='video-picker-overlay';
 box.innerHTML=`<div class="video-picker"><div class="video-picker-head"><b>🛍️ Tautkan Produk</b><button onclick="closeVideoProductPicker()">✕</button></div><p>Pilih produk yang tampil di video agar penonton bisa langsung belanja.</p><div class="video-picker-list">${products.map(p=>`<button onclick="finishVideoCreate(${p.id},'${mode}')"><span>${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</span><div><b>${p.name}</b><small>${rupiah(p.price)} · ${p.sold} terjual</small></div><strong>›</strong></button>`).join('')}</div></div>`;
 document.body.appendChild(box); requestAnimationFrame(()=>box.classList.add('show'));
}
function closeVideoProductPicker(){const x=$('videoProductPicker');if(x){x.classList.remove('show');setTimeout(()=>x.remove(),150);}window.pendingVideoUpload=null;}
function finishVideoCreate(pid,mode){
 const grid=$('uploadedVideoGrid'); if(!grid)return;
 const p=products.find(x=>x.id===pid)||products[0];
 if(mode==='upload'&&window.pendingVideoUpload){const q=window.pendingVideoUpload;grid.insertAdjacentHTML('afterbegin',videoShopCard(q.url,q.file.name,'Video saya · produk ditautkan',p.id,'@akun_kamu','Baru'));}
 else if(mode==='record'&&recordedUrl){grid.insertAdjacentHTML('afterbegin',videoShopCard(recordedUrl,'Video Rekaman KEL 5','Video saya · produk ditautkan',p.id,'@akun_kamu','Baru'));}
 closeVideoProductPicker(); closeRecordVideo(); switchLiveTab('video',document.querySelectorAll('.social-tab')[1]);
}


let liveStream=null;
async function startRealLive(){
  const stage=$('liveStage'), video=$('livePreview');
  if(!stage||!video)return;
  if(!navigator.mediaDevices?.getUserMedia){alert('Browser ini tidak mendukung akses kamera. Coba Chrome atau Edge.');return;}
  try{
    liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    video.srcObject=liveStream;stage.classList.remove('hidden');
    $('liveStatus').textContent='🔴 Live aktif dari kamera kamu';
  }catch(e){alert('Akses kamera/mikrofon ditolak atau tidak tersedia. Silakan izinkan akses kamera lalu coba lagi.');}
}
function stopRealLive(){try{if(liveStream){liveStream.getTracks().forEach(t=>t.stop());liveStream=null;}}catch(e){}const v=$('livePreview');if(v){v.pause?.();v.srcObject=null;}const s=$('liveStage');if(s)s.classList.add('hidden');}

let recordStream=null, mediaRecorder=null, recordedChunks=[], recordedUrl='', recordTimerId=null, recordSeconds=0;
async function startRecordVideo(){
  const stage=$('recordStage'), video=$('recordPreview'); if(!stage||!video)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('Browser ini belum mendukung perekaman kamera. Gunakan Chrome atau Edge versi terbaru.');return;}
  try{
    recordStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
    video.srcObject=recordStream; stage.classList.remove('hidden'); recordSeconds=0; updateRecordTimer();
  }catch(e){alert('Kamera/mikrofon tidak bisa diakses. Izinkan akses kamera dan mikrofon lalu coba lagi.');}
}
function updateRecordTimer(){const m=String(Math.floor(recordSeconds/60)).padStart(2,'0'),s=String(recordSeconds%60).padStart(2,'0');if($('recordTimer'))$('recordTimer').textContent=`${m}:${s}`;}
function toggleRecording(){
  if(mediaRecorder?.state==='recording'){mediaRecorder.stop();return;}
  if(!recordStream)return;
  recordedChunks=[]; mediaRecorder=new MediaRecorder(recordStream); mediaRecorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};
  mediaRecorder.onstop=()=>{clearInterval(recordTimerId);const blob=new Blob(recordedChunks,{type:mediaRecorder.mimeType||'video/webm'});if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=URL.createObjectURL(blob);if($('recordUseButton'))$('recordUseButton').classList.remove('hidden');if($('recordButton'))$('recordButton').textContent='● Rekam Lagi';};
  mediaRecorder.start(); recordSeconds=0; updateRecordTimer(); clearInterval(recordTimerId);recordTimerId=setInterval(()=>{recordSeconds++;updateRecordTimer()},1000); if($('recordButton'))$('recordButton').textContent='■ Berhenti';
}
function useRecordedVideo(){if(!recordedUrl)return;showVideoProductPicker('record');}
function closeRecordVideo(){try{if(mediaRecorder?.state==='recording')mediaRecorder.stop();}catch(e){}clearInterval(recordTimerId);if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null;}const v=$('recordPreview');if(v){v.pause?.();v.srcObject=null;}$('recordStage')?.classList.add('hidden');}
function orderTabs(filter){
  const tabs=[['Semua','Semua'],['Belum Bayar','Perlu dibayar'],['Dikemas','Untuk dikirim'],['Dikirim','Dikirim'],['Selesai','Selesai'],['Dibatalkan','Dibatalkan']];
  return '<div class="order-tabs">'+tabs.map(([v,l])=>'<button class="'+(v===filter?'active':'')+'" onclick="showOrders(\''+v+'\')">'+l+'</button>').join('')+'</div>';
}
function renderOrderCard(o){
  const items=o.items.map(i=>{const p=products.find(x=>x.id===i.id);return p?'<div class="order-item"><div class="order-thumb"><img class="product-photo" src="'+p.image+'" alt="'+p.name+'"></div><div><b>'+p.name+'</b><span>'+i.qty+' barang · '+rupiah(p.price*i.qty)+'</span></div></div>':''}).join('');
  const search=(o.id+' '+o.items.map(i=>{const p=products.find(x=>x.id===i.id);return p?p.name:''}).join(' ')).toLowerCase();
  const track=o.status==='Dikemas'?'<button onclick="simulateShipping(\''+o.id+'\')">Lacak Pesanan</button>':'';
  const canCancel=(o.status==='Belum Bayar'||o.status==='Dikemas');
  const cancel=canCancel?'<button class="cancel-order-btn" onclick="cancelOrder(\''+o.id+'\')">Batalkan Pesanan</button>':'';
  return '<div class="order-card" data-search="'+search+'"><div class="order-card-head"><b>DIMSUM</b><strong>'+o.status+'</strong></div><div class="order-card-body">'+items+'<div class="order-meta">No. pesanan '+o.id+'<br>Kurir '+(o.shipping||'J&T Express')+' · '+(o.shippingEstimate||'Estimasi 2–4 hari')+'</div></div><div class="order-card-actions"><button onclick="showOrderDetail(\''+o.id+'\')">Lihat Detail</button>'+track+cancel+'</div></div>';
}
function showOrders(filter='Semua'){
  let orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');
  const filtered=filter==='Semua'?orders:orders.filter(o=>o.status===filter);
  let html='<div class="orders-page"><div class="orders-search"><span>⌕</span><input id="orderSearch" placeholder="Cari pesanan Anda" oninput="filterOrderCards()"><b>☰</b></div>'+orderTabs(filter)+'<div id="orderCards">';
  if(filtered.length){html+=filtered.map(renderOrderCard).join('');}
  else{html+='<div class="order-empty"><div class="empty-icon">🎁</div><h3>Tidak ada pesanan terkait</h3><p>Lihat-lihat dan temukan produk DIMSUM yang kamu suka.</p><button onclick="closeSimple();goHome()">Belanja Sekarang</button></div><div class="suggested-title">Produk DIMSUM untukmu</div><div class="suggested-mini">'+products.slice(0,4).map(p=>'<div onclick="showProductDetail('+p.id+')"><div><img class="mini-product-photo" src="'+p.image+'" alt="'+p.name+'"></div><b>'+p.name+'</b><span>'+rupiah(p.price)+'</span></div>').join('')+'</div>';}
  html+='</div></div>';
  simple('Pesanan Saya',html,'orders');
}
function filterOrderCards(){const q=($('orderSearch')?.value||'').toLowerCase();document.querySelectorAll('#orderCards .order-card').forEach(c=>c.style.display=c.dataset.search.includes(q)?'block':'none')}
function showOrderDetail(id){let orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]'),o=orders.find(x=>x.id===id);if(!o)return;simple('Detail Pesanan',`<div class="order-detail"><div class="status-large">${o.status}</div><p><b>No. Pesanan:</b> ${o.id}</p><p><b>Waktu:</b> ${o.date}</p><p><b>Kurir:</b> ${o.shipping||'J&T Express'} · ${o.shippingEstimate||'Estimasi 2–4 hari'}</p><p><b>Pembayaran:</b> ${o.payment}</p><hr><b>Produk</b>${o.items.map(i=>{let p=products.find(x=>x.id===i.id);return p?`<div class="order-item"><div class="order-thumb">${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}">` : ""}</div><div><b>${p.name}</b><span>${i.qty} × ${rupiah(p.price)}</span></div></div>`:''}).join('')}</div>`)}
function cancelOrder(id){
  let orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');
  const o=orders.find(x=>x.id===id);
  if(!o || !['Belum Bayar','Dikemas'].includes(o.status)) return;
  const ok=confirm('Batalkan pesanan '+o.id+'?\n\nPesanan yang sudah dibatalkan tidak dapat diproses kembali.');
  if(!ok) return;
  o.status='Dibatalkan';
  o.cancelledAt=new Date().toLocaleString('id-ID');
  localStorage.setItem('dinsumOrders',JSON.stringify(orders));
  showOrders('Dibatalkan');
}

function simulateShipping(id){let orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]'),o=orders.find(x=>x.id===id);if(!o)return;o.status='Dikirim';localStorage.setItem('dinsumOrders',JSON.stringify(orders));showOrders('Dikirim')}
function accountMenu(title,desc,onclick,icon){return `<button class="account-menu" onclick="${onclick}"><span class="account-menu-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><strong>›</strong></button>`}
function profilePhoto(u){return u.photo?`<img src="${u.photo}" alt="Foto profil">`:`<span>${(u.name||'D').charAt(0).toUpperCase()}</span>`}
function orderStatusCount(status){const orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');return orders.filter(o=>o.status===status).reduce((total,o)=>total+(o.items||[]).reduce((sum,i)=>sum+Number(i.qty||1),0),0)}
function orderBadge(status){const n=orderStatusCount(status);return n>0?`<em class="order-badge">${n>99?'99+':n}</em>`:''}
function showAccount(){let u=getUser();if(!u){simple('Akun Saya',`<div class="guest-account"><div class="guest-avatar">👤</div><h3>Masuk ke akun KEL 5</h3><p>Masuk atau daftar untuk mengatur profil, melihat pesanan, alamat, dan fitur akun lainnya.</p><div class="guest-account-actions"><button onclick="closeSimple();openAuth('login')">Masuk</button><button onclick="closeSimple();openAuth('register')">Daftar</button></div><div class="account-section"><button class="account-menu" onclick="closeSimple();goHome()"><span class="account-menu-icon">🛍️</span><span><b>Lihat Produk</b><small>Jelajahi produk DIMSUM tanpa login</small></span><strong>›</strong></button></div></div>`,'account');return}simple('Akun Saya',`<div class="account-page"><div class="account-banner"><div class="account-profile"><div class="profile-photo">${profilePhoto(u)}<label for="photoUpload">📷</label><input id="photoUpload" type="file" accept="image/*" onchange="changePhoto(event)"></div><div><h3>${u.name||'Pelanggan KEL 5'}</h3><p>@${u.username||''}</p><small>${u.email||'Email belum diatur'} · ${u.phone||'Nomor HP belum diatur'}</small></div><button class="edit-profile-top" onclick="editProfile()">Edit</button></div></div><div class="account-section order-shortcuts"><div class="account-section-head"><b>Pesanan Saya</b><button onclick="showOrders()">Lihat Semua ›</button></div><div class="shortcut-row"><button onclick="showOrders('Belum Bayar')"><span class="shortcut-icon">▣</span><b>Belum Bayar</b></button><button onclick="showOrders('Dikemas')"><span class="shortcut-icon">▤${orderBadge('Dikemas')}</span><b>Dikemas</b></button><button onclick="showOrders('Dikirim')"><span class="shortcut-icon">🚚</span><b>Dikirim</b></button><button onclick="showOrders('Selesai')"><span class="shortcut-icon">☆</span><b>Selesai</b></button><button onclick="showOrders('Dibatalkan')"><span class="shortcut-icon">✕</span><b>Dibatalkan</b></button></div></div><div class="account-section">${accountMenu('Profil','Ubah nama, email, nomor HP, dan foto','editProfile()','👤')}${accountMenu('Alamat Pengiriman','Atur alamat untuk checkout','editAddress()','📍')}${accountMenu('Voucher Saya','Lihat promo untuk belanja DIMSUM','showVouchers()','🎟️')}${accountMenu('Notifikasi','Info pesanan dan aktivitas akun','showNotifications()','🔔')}${accountMenu('Password','Ganti password akun','editPassword()','🔒')}${accountMenu('Pusat Bantuan','Pertanyaan umum dan bantuan DIMSUM','showHelp()','❔')}${accountMenu('Tentang DIMSUM','Informasi toko KEL 5','showAbout()','ℹ️')}${accountMenu('Keluar','Keluar dari akun ini','logout()','↪️')}</div></div>`,'account')}
function changePhoto(event){const file=event.target.files?.[0];if(!file)return;if(file.size>2*1024*1024)return alert('Ukuran foto maksimal 2 MB.');const reader=new FileReader();reader.onload=()=>{let u=getUser()||{};u.photo=reader.result;saveUser(u);showAccount()};reader.readAsDataURL(file)}
function editProfile(){let u=getUser()||{};simple('Edit Profil',`<div class="account-form"><label>Foto Profil</label><p style="font-size:12px;color:#777">Gunakan ikon kamera di foto profil untuk mengganti foto.</p><label>Username</label><input value="${u.username||''}" disabled><label>Nama Lengkap</label><input id="profileName" value="${u.name||''}"><label>Email</label><input id="profileEmail" type="email" value="${u.email||''}"><label>Nomor HP</label><input id="profilePhone" value="${u.phone||''}" placeholder="08xxxxxxxxxx"><button onclick="saveProfile()">Simpan Perubahan</button></div>`)}
function saveProfile(){let u=getUser()||{};u.name=$('profileName').value.trim()||u.name;u.email=$('profileEmail').value.trim().toLowerCase();u.phone=$('profilePhone').value.trim();saveUser(u);showAccount()}
function editAddress(){let u=getUser()||{};simple('Alamat Pengiriman',`<div class="account-form"><label>Alamat Lengkap</label><textarea id="profileAddress" rows="5">${u.address||''}</textarea><button onclick="saveAddress()">Simpan Alamat</button></div>`)}
function saveAddress(){let u=getUser()||{};u.address=$('profileAddress').value.trim();saveUser(u);showAccount()}
function editPassword(){simple('Ganti Password',`<div class="account-form"><label>Password Lama</label><input id="oldPass" type="password"><label>Password Baru</label><input id="newPass" type="password"><label>Konfirmasi Password Baru</label><input id="newPass2" type="password"><p id="passMsg" class="form-msg"></p><button onclick="savePassword()">Simpan Password</button></div>`)}
async function savePassword(){let u=getUser()||{},old=$('oldPass').value,n=$('newPass').value,n2=$('newPass2').value,msg=$('passMsg');if(n.length<6)return msg.textContent='Password baru minimal 6 karakter.';if(n!==n2)return msg.textContent='Konfirmasi password tidak sama.';if(onlineAuthEnabled){const {error}=await supabaseClient.auth.updateUser({password:n});if(error)return msg.textContent='Gagal mengganti password: '+error.message;msg.textContent='Password berhasil diganti.';setTimeout(showAccount,700);return}if(old!==u.password)return msg.textContent='Password lama salah.';u.password=n;saveUser(u);showAccount()}
function showVouchers(){simple('Voucher Saya',`<div class="account-info-page"><div class="account-info-card voucher-demo"><div class="info-emoji">🎟️</div><div><b>Promo DIMSUM</b><p>Voucher promo akan ditampilkan di sini jika tersedia.</p><small>Contoh tampilan untuk toko KEL 5</small></div></div><div class="account-info-card"><b>Tips hemat belanja</b><p>Periksa total belanja dan pilihan pengiriman sebelum menyelesaikan checkout.</p></div></div>`)}
function showNotifications(){let orders=JSON.parse(localStorage.getItem('dinsumOrders')||'[]');let content=orders.length?orders.slice().reverse().slice(0,8).map(o=>`<div class="account-info-card"><b>Pesanan ${o.id||''}</b><p>Status pesanan: <strong>${o.status||'Diproses'}</strong></p><small>${o.createdAt||'Aktivitas pesanan'}</small></div>`).join(''):`<div class="account-info-empty"><div>🔔</div><b>Belum ada notifikasi</b><p>Info pesanan dan aktivitas akun akan muncul di sini.</p></div>`;simple('Notifikasi',`<div class="account-info-page">${content}</div>`)}
function showAbout(){simple('Tentang DIMSUM',`<div class="account-info-page"><div class="account-info-card about-info"><div class="about-logo">🥟</div><h3>DIMSUM · KEL 5</h3><p>Toko online dimsum untuk proyek e-commerce mahasiswa. Jelajahi menu, masukkan produk ke keranjang, lalu lanjutkan ke checkout.</p><small>Demo toko online untuk tugas perkuliahan.</small></div></div>`)}
function showHelp(){simple('Pusat Bantuan',`<div class="account-info-page"><div class="account-info-card"><b>Bagaimana cara memesan?</b><p>Pilih produk di Beranda, masukkan ke keranjang, lalu tekan Checkout.</p></div><div class="account-info-card"><b>Bagaimana mengubah alamat?</b><p>Buka Akun Saya → Alamat Pengiriman, ubah alamat, lalu simpan.</p></div><div class="account-info-card"><b>Bagaimana melihat status pesanan?</b><p>Buka Akun Saya → Pesanan Saya atau pilih menu Pesanan di navigasi bawah.</p></div><div class="account-info-card"><b>Catatan</b><p>Ini adalah pusat bantuan demo untuk proyek KEL 5, bukan layanan pelanggan aktif.</p></div></div>`)}
function goHome(){closeSimple();closeCart();document.querySelector('.topbar')?.classList.remove('home-hidden');setBottomNav('Home');window.scrollTo({top:0,behavior:'smooth'});}
function scrollProducts(){$('produk').scrollIntoView({behavior:'smooth'})}
updateAuthUI();showStore();renderUserUI();restoreOnlineSession();


/* V15: rotating home search placeholder */
const marketSearchHints = ['Cari di sini','Cari produk DIMSUM','Cari makanan favoritmu','Cari menu DIMSUM','Cari promo hari ini','Cari produk terlaris'];
let marketHintIndex = 0;
let marketHintTimer = null;
function rotateMarketSearchHint(){
  const input = document.getElementById('marketSearch');
  if(!input || document.activeElement === input || input.value.trim() !== '') return;
  marketHintIndex = (marketHintIndex + 1) % marketSearchHints.length;
  input.placeholder = marketSearchHints[marketHintIndex];
}
function runMarketSearch(){
  const input = document.getElementById('marketSearch');
  if(!input) return;
  input.focus();
  syncSearch();
}
function startMarketSearchHints(){
  const input = document.getElementById('marketSearch');
  if(!input) return;
  input.placeholder = marketSearchHints[0];
  if(marketHintTimer) clearInterval(marketHintTimer);
  marketHintTimer = setInterval(rotateMarketSearchHint, 2600);
}
document.addEventListener('DOMContentLoaded', startMarketSearchHints);

// V28: ESC always closes camera/recording view
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('liveStage')?.classList.contains('hidden'))stopRealLive();if(!$('recordStage')?.classList.contains('hidden'))closeRecordVideo();}});
