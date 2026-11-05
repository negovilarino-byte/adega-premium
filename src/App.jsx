import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase.js";

const categories = ["Todas", "Cervejas", "Whisky", "Vodka", "Energéticos"];
const demoProducts = [
  {id:1,name:"Cerveja Lager",category:"Cervejas",detail:"Long neck • 330 ml",price:6.9,tag:"Mais pedido",emoji:"🍺"},
  {id:2,name:"Whisky Premium",category:"Whisky",detail:"Garrafa • 1 L",price:129.9,tag:"Oferta",emoji:"🥃"},
  {id:3,name:"Vodka Clássica",category:"Vodka",detail:"Garrafa • 1 L",price:59.9,tag:"",emoji:"🍸"},
  {id:4,name:"Energético",category:"Energéticos",detail:"Lata • 473 ml",price:9.9,tag:"",emoji:"⚡"},
  {id:5,name:"Cerveja Puro Malte",category:"Cervejas",detail:"Lata • 350 ml",price:4.99,tag:"",emoji:"🍻"},
  {id:6,name:"Vodka Especial",category:"Vodka",detail:"Garrafa • 750 ml",price:79.9,tag:"Novidade",emoji:"🍸"}
];
const money = value => value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const WHATSAPP_NUMBER = "5549999084921";

function StoreApp(){
  const [category,setCategory] = useState("Todas");
  const [products,setProducts] = useState(supabase ? [] : (import.meta.env.DEV ? demoProducts : []));
  const [liveCatalog,setLiveCatalog] = useState(Boolean(supabase));
  const [catalogLoading,setCatalogLoading] = useState(Boolean(supabase));
  useEffect(()=>{
    if(!supabase)return;
    let active=true;
    supabase.from("products").select("id,name,description,volume,price,image_url,stock,categories(name)").eq("active",true).order("name").then(({data,error})=>{
      if(!active)return;
      setCatalogLoading(false);
      if(error){setProducts([]);setNotice("Não foi possível carregar o catálogo. Tente novamente mais tarde.");return;}
      const loaded=(data||[]).map(p=>({id:p.id,name:p.name,category:p.categories?.name||"Outros",detail:[p.description,p.volume].filter(Boolean).join(" • "),price:Number(p.price),tag:"",emoji:"🍾",image:p.image_url,stock:p.stock}));
      setProducts(loaded);setLiveCatalog(true);
    });
    return ()=>{active=false};
  },[]);
  const [cart,setCart] = useState([]);
  const [cartOpen,setCartOpen] = useState(false);
  const [fulfillment,setFulfillment] = useState("Entrega");
  const [ageOk,setAgeOk] = useState(()=>sessionStorage.getItem("adega18")==="yes");
  const [notice,setNotice] = useState("");
  const [customerName,setCustomerName] = useState("");
  const [customerPhone,setCustomerPhone] = useState("");
  const [deliveryAddress,setDeliveryAddress] = useState("");
  const visible = useMemo(()=>category==="Todas"?products:products.filter(p=>p.category===category),[category]);
  const count = cart.reduce((n,item)=>n+item.qty,0);
  const total = cart.reduce((n,item)=>n+item.qty*item.price,0);
  function add(product){
    setCart(old=>old.some(i=>i.id===product.id)?old.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i):[...old,{...product,qty:1}]);
    setNotice(product.name+" adicionado ao carrinho");
    setTimeout(()=>setNotice(""),2200);
  }
  function changeQty(id,delta){setCart(old=>old.map(i=>i.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0));}
  async function checkout(){
    if(!cart.length)return;
    if(customerName.trim().length<2 || customerPhone.replace(/\D/g,"").length<10){setNotice("Informe nome e telefone com DDD.");return;}
    if(fulfillment==="Entrega" && deliveryAddress.trim().length<8){setNotice("Informe o endereço completo para entrega.");return;}
    let orderId=null;
    if(liveCatalog && supabase){
      const {data,error}=await supabase.rpc("create_guest_order",{
        p_customer_name:customerName.trim(),
        p_customer_phone:customerPhone,
        p_delivery_method:fulfillment==="Entrega"?"delivery":"pickup",
        p_delivery_address:fulfillment==="Entrega"?deliveryAddress.trim():null,
        p_items:cart.map(item=>({product_id:item.id,quantity:item.qty})),
        p_payment_method:"PIX"
      });
      if(error){setNotice("Não foi possível registrar o pedido: "+error.message);return;}
      orderId=data;
    }
    const lines=cart.map(i=>`• ${i.qty}x ${i.name} — ${money(i.qty*i.price)}`).join("\n");
    const message=`Olá! Quero confirmar meu pedido na Adega Império Sul.\n\nPedido: ${orderId||"A confirmar"}\nCliente: ${customerName.trim()}\nTelefone: ${customerPhone}\n${lines}\n\nTotal estimado: ${money(total)}\nModalidade: ${fulfillment}\n${fulfillment==="Entrega"?"Endereço: "+deliveryAddress:""}\nPagamento desejado: PIX.\n\nPor favor, confirme disponibilidade, entrega e pagamento.`;
    window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
    if(orderId){setCart([]);setCartOpen(false);setNotice("Pedido registrado no Supabase. Confira o WhatsApp.");}
  }
  if(!ageOk)return <main className="age-screen"><div className="age-card"><div className="brand-mark">IS</div><p className="eyebrow">ADEGA IMPÉRIO SUL</p><h1>Uma experiência<br/><span>à sua altura.</span></h1><p>Este site comercializa bebidas alcoólicas. Você tem 18 anos ou mais?</p><button className="primary full" onClick={()=>{sessionStorage.setItem("adega18","yes");setAgeOk(true)}}>SIM, TENHO 18 ANOS OU MAIS</button><button className="text-button" onClick={()=>window.location.href="https://www.gov.br"}>Não tenho 18 anos</button><small>Beba com responsabilidade. Proibida a venda para menores de 18 anos.</small></div></main>;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark small">IS</span><span>ADEGA <b>IMPÉRIO SUL</b></span></a><button className="cart-button" onClick={()=>setCartOpen(true)}>Sacola <span>{count}</span></button></header>
    <main>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">SEU BRINDE COMEÇA AQUI</p><h1>Qualidade que<br/><span>faz a diferença.</span></h1><p>Bebidas selecionadas, ofertas especiais e praticidade para o seu momento.</p><a className="primary" href="#catalogo">EXPLORAR PRODUTOS <span>↗</span></a></div><div className="mascot" aria-label="Espaço reservado para o mascote oficial bulldog"><span>🐶</span><small>MASCOTE OFICIAL<br/>BULLDOG</small></div><div className="hero-stamp">SELEÇÃO<br/><b>IMPÉRIO SUL</b></div></section>
      <section className="benefits"><div>✦ <span>Seleção especial</span></div><div>⌁ <span>Entrega ou retirada</span></div><div>◈ <span>Pedido fácil pelo WhatsApp</span></div></section>
      <section className="section" id="catalogo"><div className="section-heading"><div><p className="eyebrow">ESCOLHA O SEU</p><h2>Nossas categorias</h2></div><span className="muted">{catalogLoading?"Carregando catálogo":liveCatalog?"Catálogo conectado":import.meta.env.DEV?"Modo de demonstração":"Catálogo indisponível"}</span></div>
        <div className="category-list">{categories.map(c=><button key={c} className={category===c?"category active":"category"} onClick={()=>setCategory(c)}>{c}</button>)}</div>
        <div className="product-grid">{catalogLoading?<div className="empty">Carregando produtos...</div>:visible.length===0?<div className="empty">{liveCatalog?"Nenhum produto cadastrado no momento. Volte em breve.":"O catálogo ainda não está conectado."}</div>:visible.map(p=><article className="product-card" key={p.id}><div className="product-art">{p.image?<img src={p.image} alt={p.name}/>:<span>{p.emoji}</span>}{p.tag&&<b>{p.tag}</b>}</div><div className="product-info"><small>{p.category}</small><h3>{p.name}</h3><p>{p.detail}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button aria-label={"Adicionar "+p.name} onClick={()=>add(p)} disabled={liveCatalog && p.stock<=0}>{liveCatalog && p.stock<=0?"Esgotado":"+"}</button></div></div></article>)}</div>
      </section>
      <section className="offer"><div><p className="eyebrow">VANTAGENS ESPECIAIS</p><h2>Ofertas para<br/>bons momentos.</h2><p>Consulte as promoções disponíveis e monte seu pedido.</p></div><div className="offer-art">★<span>OFERTAS</span></div></section>
      <section className="order-strip"><div><p className="eyebrow">DO SEU JEITO</p><h2>Receba ou retire.</h2><p>Escolha a modalidade no carrinho e confirme os detalhes pelo WhatsApp.</p></div><button className="primary" onClick={()=>setCartOpen(true)}>VER MINHA SACOLA</button></section>
    </main>
    <footer><a className="brand" href="#"><span className="brand-mark small">IS</span><span>ADEGA <b>IMPÉRIO SUL</b></span></a><p>Venda proibida para menores de 18 anos. Beba com responsabilidade.</p><a className="text-button" href={"https://wa.me/"+WHATSAPP_NUMBER} target="_blank" rel="noreferrer">Fale com a Adega pelo WhatsApp ↗</a><small>© {new Date().getFullYear()} Adega Império Sul</small></footer>
    {notice&&<div className="toast">{notice}</div>}
    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="cart-panel" onClick={e=>e.stopPropagation()}><div className="cart-head"><div><p className="eyebrow">SEU PEDIDO</p><h2>Sacola ({count})</h2></div><button className="close" onClick={()=>setCartOpen(false)}>×</button></div>
      {!cart.length?<div className="empty">Sua sacola está vazia.<br/>Adicione produtos para começar.</div>:<><div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><span className="mini-emoji">{i.emoji}</span><div className="cart-item-info"><b>{i.name}</b><small>{money(i.price)} cada</small><div className="qty"><button onClick={()=>changeQty(i.id,-1)}>−</button><span>{i.qty}</span><button onClick={()=>changeQty(i.id,1)}>+</button></div></div><strong>{money(i.qty*i.price)}</strong></div>)}</div>
      <div className="fulfillment"><b>Como deseja receber?</b><div className="choice"><button className={fulfillment==="Entrega"?"selected":""} onClick={()=>setFulfillment("Entrega")}>Entrega</button><button className={fulfillment==="Retirada"?"selected":""} onClick={()=>setFulfillment("Retirada")}>Retirada</button></div></div><div className="checkout-fields"><label>Seu nome<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nome completo" autoComplete="name" /></label><label>Telefone com DDD<input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="(49) 99999-9999" inputMode="tel" autoComplete="tel" /></label>{fulfillment==="Entrega"&&<label>Endereço de entrega<textarea value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Rua, número, bairro e cidade" /></label>}</div><div className="total"><span>Total estimado</span><b>{money(total)}</b></div><button className="primary full" onClick={checkout}>{liveCatalog?"REGISTRAR PEDIDO E CONTINUAR ↗":"CONTINUAR PELO WHATSAPP ↗"}</button><small className="checkout-note">PIX será confirmado diretamente com a loja. Valores, estoque e entrega sujeitos à confirmação.</small></>}
    </aside></div>}
  </div>;
}


function AdminPanel(){
  const [session,setSession]=useState(null);
  const [checking,setChecking]=useState(true);
  const [isAdmin,setIsAdmin]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState("products");
  const [products,setProducts]=useState([]);
  const [categories,setCategories]=useState([]);
  const [orders,setOrders]=useState([]);
  const [editingId,setEditingId]=useState(null);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [volume,setVolume]=useState("");
  const [price,setPrice]=useState("");
  const [stock,setStock]=useState("0");
  const [categoryId,setCategoryId]=useState("");
  const [imageFile,setImageFile]=useState(null);
  const [newCategory,setNewCategory]=useState("");

  async function verifyUser(currentSession){
    setSession(currentSession||null);
    if(!currentSession?.user){setIsAdmin(false);setChecking(false);return;}
    const {data,error}=await supabase.from("profiles").select("role").eq("id",currentSession.user.id).maybeSingle();
    setIsAdmin(!error && data?.role==="admin");
    setChecking(false);
  }
  useEffect(()=>{
    if(!supabase){setChecking(false);return;}
    supabase.auth.getSession().then(({data})=>verifyUser(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,currentSession)=>{verifyUser(currentSession);});
    return ()=>subscription.unsubscribe();
  },[]);
  async function loadData(){
    if(!supabase||!isAdmin)return;
    const [p,c,o]=await Promise.all([
      supabase.from("products").select("id,name,description,volume,price,stock,image_url,active,category_id,categories(name)").order("created_at",{ascending:false}),
      supabase.from("categories").select("id,name,active").order("name"),
      supabase.from("orders").select("id,customer_name,customer_phone,status,subtotal,delivery_method,created_at").order("created_at",{ascending:false}).limit(50)
    ]);
    if(p.error||c.error||o.error){setNotice(p.error?.message||c.error?.message||o.error?.message||"Erro ao carregar painel.");return;}
    setProducts(p.data||[]);setCategories(c.data||[]);setOrders(o.data||[]);
  }
  useEffect(()=>{loadData();},[isAdmin]);
  async function signIn(e){
    e.preventDefault();if(!supabase)return;setBusy(true);setNotice("");
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)setNotice(error.message);else await verifyUser(data.session);
    setBusy(false);
  }
  async function signUp(e){
    e.preventDefault();if(!supabase)return;setBusy(true);setNotice("");
    const {error}=await supabase.auth.signUp({email:email.trim(),password});
    setNotice(error?error.message:"Conta criada. Confirme o e-mail, se solicitado, e depois entre. O acesso administrativo precisa ser autorizado.");
    setBusy(false);
  }
  async function signOut(){await supabase.auth.signOut();setSession(null);setIsAdmin(false);}
  function clearForm(){
    setEditingId(null);setName("");setDescription("");setVolume("");setPrice("");setStock("0");setCategoryId("");setImageFile(null);
  }
  function editProduct(p){
    setEditingId(p.id);setName(p.name);setDescription(p.description||"");setVolume(p.volume||"");
    setPrice(String(p.price));setStock(String(p.stock));setCategoryId(p.category_id||"");setImageFile(null);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function saveProduct(e){
    e.preventDefault();if(!isAdmin)return;
    if(!name.trim()||!Number.isFinite(Number(price))||Number(price)<0||!Number.isInteger(Number(stock))||Number(stock)<0){setNotice("Confira nome, preço e estoque.");return;}
    setBusy(true);setNotice("");
    let imageUrl=editingId?products.find(p=>p.id===editingId)?.image_url||null:null;
    if(imageFile){
      const ext=(imageFile.name.split(".").pop()||"jpg").toLowerCase();
      const path=(window.crypto?.randomUUID?.()||String(Date.now()))+"."+ext;
      const {error:uploadError}=await supabase.storage.from("product-images").upload(path,imageFile,{contentType:imageFile.type,upsert:false});
      if(uploadError){setNotice("Falha ao enviar imagem: "+uploadError.message);setBusy(false);return;}
      imageUrl=supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const payload={name:name.trim(),description:description.trim()||null,volume:volume.trim()||null,price:Number(price),stock:Number(stock),category_id:categoryId||null,image_url:imageUrl,updated_at:new Date().toISOString()};
    const result=editingId?await supabase.from("products").update(payload).eq("id",editingId):await supabase.from("products").insert(payload);
    if(result.error)setNotice("Erro ao salvar: "+result.error.message);
    else{setNotice(editingId?"Produto atualizado.":"Produto cadastrado.");clearForm();await loadData();}
    setBusy(false);
  }
  async function toggleProduct(p){
    const {error}=await supabase.from("products").update({active:!p.active}).eq("id",p.id);
    setNotice(error?error.message:(p.active?"Produto desativado.":"Produto ativado."));if(!error)loadData();
  }
  async function addCategory(e){
    e.preventDefault();if(!newCategory.trim())return;
    const {error}=await supabase.from("categories").insert({name:newCategory.trim(),active:true});
    setNotice(error?error.message:"Categoria criada.");if(!error){setNewCategory("");loadData();}
  }
  async function updateOrder(id,status){
    const {error}=await supabase.from("orders").update({status,updated_at:new Date().toISOString()}).eq("id",id);
    setNotice(error?error.message:"Status do pedido atualizado.");if(!error)loadData();
  }
  if(!supabase)return <main className="admin-screen"><section className="admin-card"><h1>Administração</h1><p>Conexão com o Supabase não configurada.</p></section></main>;
  if(checking)return <main className="admin-screen"><section className="admin-card">Verificando acesso...</section></main>;
  if(!session)return <main className="admin-screen"><form className="admin-card" onSubmit={signIn}>
    <a className="admin-back" href={import.meta.env.BASE_URL}>← Voltar à loja</a><div className="brand-mark">IS</div><p className="eyebrow">ADEGA IMPÉRIO SUL</p><h1>Painel administrativo</h1>
    <p className="admin-muted">Entre com sua conta para gerenciar o catálogo e os pedidos.</p>
    <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label>
    <label>Senha<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>
    <button className="primary full" disabled={busy}>{busy?"Aguarde...":"ENTRAR"}</button>
    <button type="button" className="admin-secondary" disabled={busy} onClick={signUp}>CRIAR CONTA</button>
    {notice&&<p className="admin-notice">{notice}</p>}
  </form></main>;
  if(!isAdmin)return <main className="admin-screen"><section className="admin-card">
    <a className="admin-back" href={import.meta.env.BASE_URL}>← Voltar à loja</a><div className="brand-mark">IS</div><h1>Acesso ainda não autorizado</h1>
    <p className="admin-muted">A conta {session.user.email} está autenticada, mas ainda não possui a função de administrador. Por segurança, somente o responsável pelo projeto pode conceder essa permissão.</p>
    {notice&&<p className="admin-notice">{notice}</p>}<button className="admin-secondary" onClick={signOut}>SAIR</button>
  </section></main>;
  return <main className="admin-layout">
    <header className="admin-header"><a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark small">IS</span><span>ADEGA <b>IMPÉRIO SUL</b></span></a><div><span>{session.user.email}</span><button className="admin-secondary" onClick={signOut}>Sair</button></div></header>
    <section className="admin-content"><div className="admin-title"><div><p className="eyebrow">GESTÃO DA LOJA</p><h1>Painel administrativo</h1></div><button className="admin-secondary" onClick={loadData}>Atualizar</button></div>
    <nav className="admin-tabs"><button className={tab==="products"?"active":""} onClick={()=>setTab("products")}>Produtos ({products.length})</button><button className={tab==="categories"?"active":""} onClick={()=>setTab("categories")}>Categorias ({categories.length})</button><button className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}>Pedidos ({orders.length})</button></nav>
    {notice&&<p className="admin-notice">{notice}</p>}
    {tab==="products"&&<><form className="admin-form" onSubmit={saveProduct}><h2>{editingId?"Editar produto":"Cadastrar produto"}</h2>
      <label>Nome do produto<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Cerveja Puro Malte"/></label>
      <label>Descrição<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalhes do produto"/></label>
      <div className="admin-fields"><label>Volume<input value={volume} onChange={e=>setVolume(e.target.value)} placeholder="350 ml"/></label><label>Preço (R$)<input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Estoque<input required type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)}/></label></div>
      <label>Categoria<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Sem categoria</option>{categories.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Foto do produto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImageFile(e.target.files?.[0]||null)}/><small>JPG, PNG ou WEBP. Máximo de 5 MB.</small></label>
      <div className="admin-actions"><button className="primary" disabled={busy}>{busy?"Salvando...":editingId?"SALVAR ALTERAÇÕES":"CADASTRAR PRODUTO"}</button>{editingId&&<button type="button" className="admin-secondary" onClick={clearForm}>Cancelar</button>}</div>
    </form><div className="admin-list"><h2>Produtos cadastrados</h2>{products.map(p=><article className="admin-product" key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<span>🍾</span>}<div><b>{p.name}</b><small>{p.categories?.name||"Sem categoria"} · {money(Number(p.price))} · Estoque: {p.stock}</small><small>{p.active?"Ativo":"Inativo"}</small></div><button className="admin-secondary" onClick={()=>editProduct(p)}>Editar</button><button className="admin-secondary" onClick={()=>toggleProduct(p)}>{p.active?"Desativar":"Ativar"}</button></article>)}</div></>}
    {tab==="categories"&&<div className="admin-form"><h2>Categorias</h2><form onSubmit={addCategory} className="admin-inline"><input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Nova categoria" required/><button className="primary">Adicionar</button></form>{categories.map(x=><div className="admin-category" key={x.id}><span>{x.name}</span><button className="admin-secondary" onClick={async()=>{const {error}=await supabase.from("categories").update({active:!x.active}).eq("id",x.id);setNotice(error?.message||"Categoria atualizada.");if(!error)loadData();}}>{x.active?"Desativar":"Ativar"}</button></div>)}</div>}
    {tab==="orders"&&<div className="admin-list"><h2>Pedidos recentes</h2>{orders.length===0?<p className="admin-muted">Nenhum pedido registrado.</p>:orders.map(o=><article className="admin-order" key={o.id}><div><b>Pedido {o.id.slice(0,8)}</b><small>{o.customer_name} · {o.customer_phone}</small><small>{new Date(o.created_at).toLocaleString("pt-BR")} · {money(Number(o.subtotal))}</small></div><select value={o.status} onChange={e=>updateOrder(o.id,e.target.value)}><option value="pending">Pendente</option><option value="confirmed">Confirmado</option><option value="preparing">Preparando</option><option value="out_for_delivery">Saiu para entrega</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></article>)}</div>}
    </section>
  </main>;
}

export default function App(){
  const path=window.location.pathname;
  const isAdmin=path.endsWith("/admin")||path.endsWith("/admin/");
  return isAdmin?<AdminPanel/>:<StoreApp/>;
}
