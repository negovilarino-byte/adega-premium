import { useMemo, useState } from "react";

const categories = ["Todas", "Cervejas", "Whisky", "Vodka", "Energéticos"];
const products = [
  {id:1,name:"Cerveja Lager",category:"Cervejas",detail:"Long neck • 330 ml",price:6.9,tag:"Mais pedido",emoji:"🍺"},
  {id:2,name:"Whisky Premium",category:"Whisky",detail:"Garrafa • 1 L",price:129.9,tag:"Oferta",emoji:"🥃"},
  {id:3,name:"Vodka Clássica",category:"Vodka",detail:"Garrafa • 1 L",price:59.9,tag:"",emoji:"🍸"},
  {id:4,name:"Energético",category:"Energéticos",detail:"Lata • 473 ml",price:9.9,tag:"",emoji:"⚡"},
  {id:5,name:"Cerveja Puro Malte",category:"Cervejas",detail:"Lata • 350 ml",price:4.99,tag:"",emoji:"🍻"},
  {id:6,name:"Vodka Especial",category:"Vodka",detail:"Garrafa • 750 ml",price:79.9,tag:"Novidade",emoji:"🍸"}
];
const money = value => value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const WHATSAPP_NUMBER = "554999084921";

export default function App(){
  const [category,setCategory] = useState("Todas");
  const [cart,setCart] = useState([]);
  const [cartOpen,setCartOpen] = useState(false);
  const [fulfillment,setFulfillment] = useState("Entrega");
  const [ageOk,setAgeOk] = useState(()=>sessionStorage.getItem("adega18")==="yes");
  const [notice,setNotice] = useState("");
  const visible = useMemo(()=>category==="Todas"?products:products.filter(p=>p.category===category),[category]);
  const count = cart.reduce((n,item)=>n+item.qty,0);
  const total = cart.reduce((n,item)=>n+item.qty*item.price,0);
  function add(product){
    setCart(old=>old.some(i=>i.id===product.id)?old.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i):[...old,{...product,qty:1}]);
    setNotice(product.name+" adicionado ao carrinho");
    setTimeout(()=>setNotice(""),2200);
  }
  function changeQty(id,delta){setCart(old=>old.map(i=>i.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0));}
  function checkout(){
    if(!cart.length)return;
    const lines=cart.map(i=>`• ${i.qty}x ${i.name} — ${money(i.qty*i.price)}`).join("\n");
    const message=`Olá! Quero fazer um pedido na Adega Império Sul.\n\n${lines}\n\nTotal estimado: ${money(total)}\nModalidade: ${fulfillment}\nPagamento desejado: PIX.\n\nConfirmar disponibilidade, taxa de entrega e chave PIX, por favor.`;
    window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
  }
  if(!ageOk)return <main className="age-screen"><div className="age-card"><div className="brand-mark">IS</div><p className="eyebrow">ADEGA IMPÉRIO SUL</p><h1>Uma experiência<br/><span>à sua altura.</span></h1><p>Este site comercializa bebidas alcoólicas. Você tem 18 anos ou mais?</p><button className="primary full" onClick={()=>{sessionStorage.setItem("adega18","yes");setAgeOk(true)}}>SIM, TENHO 18 ANOS OU MAIS</button><button className="text-button" onClick={()=>window.location.href="https://www.gov.br"}>Não tenho 18 anos</button><small>Beba com responsabilidade. Proibida a venda para menores de 18 anos.</small></div></main>;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark small">IS</span><span>ADEGA <b>IMPÉRIO SUL</b></span></a><button className="cart-button" onClick={()=>setCartOpen(true)}>Sacola <span>{count}</span></button></header>
    <main>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">SEU BRINDE COMEÇA AQUI</p><h1>Qualidade que<br/><span>faz a diferença.</span></h1><p>Bebidas selecionadas, ofertas especiais e praticidade para o seu momento.</p><a className="primary" href="#catalogo">EXPLORAR PRODUTOS <span>↗</span></a></div><div className="mascot" aria-label="Espaço reservado para o mascote oficial bulldog"><span>🐶</span><small>MASCOTE OFICIAL<br/>BULLDOG</small></div><div className="hero-stamp">SELEÇÃO<br/><b>IMPÉRIO SUL</b></div></section>
      <section className="benefits"><div>✦ <span>Seleção especial</span></div><div>⌁ <span>Entrega ou retirada</span></div><div>◈ <span>Pedido fácil pelo WhatsApp</span></div></section>
      <section className="section" id="catalogo"><div className="section-heading"><div><p className="eyebrow">ESCOLHA O SEU</p><h2>Nossas categorias</h2></div><span className="muted">Produtos demonstrativos</span></div>
        <div className="category-list">{categories.map(c=><button key={c} className={category===c?"category active":"category"} onClick={()=>setCategory(c)}>{c}</button>)}</div>
        <div className="product-grid">{visible.map(p=><article className="product-card" key={p.id}><div className="product-art"><span>{p.emoji}</span>{p.tag&&<b>{p.tag}</b>}</div><div className="product-info"><small>{p.category}</small><h3>{p.name}</h3><p>{p.detail}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button aria-label={"Adicionar "+p.name} onClick={()=>add(p)}>+</button></div></div></article>)}</div>
      </section>
      <section className="offer"><div><p className="eyebrow">VANTAGENS ESPECIAIS</p><h2>Ofertas para<br/>bons momentos.</h2><p>Consulte as promoções disponíveis e monte seu pedido.</p></div><div className="offer-art">★<span>OFERTAS</span></div></section>
      <section className="order-strip"><div><p className="eyebrow">DO SEU JEITO</p><h2>Receba ou retire.</h2><p>Escolha a modalidade no carrinho e confirme os detalhes pelo WhatsApp.</p></div><button className="primary" onClick={()=>setCartOpen(true)}>VER MINHA SACOLA</button></section>
    </main>
    <footer><a className="brand" href="#"><span className="brand-mark small">IS</span><span>ADEGA <b>IMPÉRIO SUL</b></span></a><p>Venda proibida para menores de 18 anos. Beba com responsabilidade.</p><a className="text-button" href={"https://wa.me/"+WHATSAPP_NUMBER} target="_blank" rel="noreferrer">Fale com a Adega pelo WhatsApp ↗</a><small>© {new Date().getFullYear()} Adega Império Sul</small></footer>
    {notice&&<div className="toast">{notice}</div>}
    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="cart-panel" onClick={e=>e.stopPropagation()}><div className="cart-head"><div><p className="eyebrow">SEU PEDIDO</p><h2>Sacola ({count})</h2></div><button className="close" onClick={()=>setCartOpen(false)}>×</button></div>
      {!cart.length?<div className="empty">Sua sacola está vazia.<br/>Adicione produtos para começar.</div>:<><div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><span className="mini-emoji">{i.emoji}</span><div className="cart-item-info"><b>{i.name}</b><small>{money(i.price)} cada</small><div className="qty"><button onClick={()=>changeQty(i.id,-1)}>−</button><span>{i.qty}</span><button onClick={()=>changeQty(i.id,1)}>+</button></div></div><strong>{money(i.qty*i.price)}</strong></div>)}</div>
      <div className="fulfillment"><b>Como deseja receber?</b><div className="choice"><button className={fulfillment==="Entrega"?"selected":""} onClick={()=>setFulfillment("Entrega")}>Entrega</button><button className={fulfillment==="Retirada"?"selected":""} onClick={()=>setFulfillment("Retirada")}>Retirada</button></div></div><div className="total"><span>Total estimado</span><b>{money(total)}</b></div><button className="primary full" onClick={checkout}>CONTINUAR PELO WHATSAPP ↗</button><small className="checkout-note">PIX será confirmado diretamente com a loja. Valores, estoque e entrega sujeitos à confirmação.</small></>}
    </aside></div>}
  </div>;
}
