// =======================================
// ANÚNCIOS DE DEMONSTRAÇÃO
// =======================================

const DEMO_ADS = [
  {
    title: "Bicicleta Aro 26",
    description: "Bicicleta usada, em ótimo estado. Freios novos.",
    price: "350",
    type: "venda",
    city: "São Paulo",
    images: ["https://bigodebikes.com.br/wp-content/uploads/2022/05/67504710_1SZ.jpg"]
  },
  {
    title: "Livros para doação",
    description: "Vários livros em ótimo estado. Somente retirar.",
    price: null,
    type: "doacao",
    city: "Rio de Janeiro",
    images: ["https://tse1.mm.bing.net/th/id/OIP.QYl0RxhoMtSiDxFIekhpigHaHz?rs=1&pid=ImgDetMain&o=7&rm=3"]
  },
  {
    title: "Teclado Gamer RGB",
    description: "Procuro trocar por headset. Estado de novo.",
    price: null,
    type: "troca",
    city: "Curitiba",
    images: ["https://m.media-amazon.com/images/I/61UHr0jGI0L._AC_SY300_SX300_QL70_ML2_.jpg"]
  },
  {
    title: "Impressora HP Ink Tank",
    description: "Pouco uso, tanque cheio.",
    price: "450",
    type: "venda",
    city: "Belo Horizonte",
    images: ["https://tse1.mm.bing.net/th/id/OIP.flC6MQAnHsM6bCXliZ6PEQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3"]
  }
];



// =======================================
// PUBLICAR ANÚNCIO
// =======================================

const btnPublicar = document.getElementById('btnPublicar');

if (btnPublicar)
  btnPublicar.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const preco = document.getElementById('preco').value;
    const tipo = document.getElementById('tipo').value;
    const categoria = document.getElementById('categoria').value;
    const cidade = document.getElementById('cidade').value;
    const file = document.getElementById('foto').files[0];

    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para publicar');
      return;
    }

    try {
      let url = '';

      if (file) {
        const ref = storage.ref('ads/' + user.uid + '/' + Date.now() + '_' + file.name);
        const snap = await ref.put(file);
        url = await snap.ref.getDownloadURL();
      }

      await db.collection('ads').add({
        title: titulo,
        description: descricao,
        price: preco || null,
        type: tipo,
        category: categoria,
        city: cidade,
        images: url ? [url] : [],
        ownerId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'ativo'
      });

      alert('Anúncio publicado!');
      window.location.href = 'anuncios.html';

    } catch (err) {
      alert(err.message);
    }
  });


// =======================================
// LISTAR ANÚNCIOS
// =======================================

const lista = document.getElementById('lista');

if (lista) {

  const render = (docs) => {
    let html = '';

    docs.forEach(a => {
      const img = a.images?.[0] ?? 'https://via.placeholder.com/150';

      html += `
        <div class="lista-item">
          <img src="${img}" alt="">
          <div>
            <h3>${a.title}</h3>
            <p>${a.city} • ${a.price ? "R$ " + a.price : a.type}</p>
            <p>${a.description.substring(0, 120)}</p>
          </div>
        </div>
      `;
    });

    lista.innerHTML = html;
  };


  // Buscar anúncios reais
  db.collection('ads')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snap => {

      if (snap.empty) {
        console.log("Sem anúncios no Firestore → exibindo demonstração.");
        render(DEMO_ADS);
      } else {
        render(snap.docs.map(d => d.data()));
      }
    });



  // FILTRO DE BUSCA + TIPO
  const search = document.getElementById('search');
  const filterType = document.getElementById('filterType');

  if (search || filterType) {

    let loadedDocs = [];

    db.collection('ads')
      .orderBy('createdAt', 'desc')
      .get()
      .then(snap => {
        loadedDocs = snap.empty
          ? DEMO_ADS
          : snap.docs.map(d => d.data());

        render(loadedDocs);
      });

    const applyFilter = () => {
      const q = search.value.toLowerCase();
      const t = filterType.value;

      const filtered = loadedDocs.filter(a => {
        const text = a.title.toLowerCase().includes(q);
        const type = t ? a.type === t : true;
        return text && type;
      });

      render(filtered);
    };

    search.addEventListener('input', applyFilter);
    filterType.addEventListener('change', applyFilter);
  }
}


// =======================================
// PÁGINA INDIVIDUAL DO ANÚNCIO
// =======================================

const conteudo = document.getElementById('conteudo');
const btnChat = document.getElementById('btnChat');

if (conteudo) {

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (id) {

    db.collection('ads').doc(id).get().then(doc => {

      if (!doc.exists) {
        conteudo.innerHTML = "<p>Anúncio não encontrado</p>";
      } else {

        const a = doc.data();
        const img = a.images?.[0] ?? "https://via.placeholder.com/300";

        conteudo.innerHTML = `
          <img src="${img}" style="max-width:100%;border-radius:8px"/>
          <h2>${a.title}</h2>
          <p><strong>Cidade:</strong> ${a.city} • <strong>Tipo:</strong> ${a.type}</p>
          <p><strong>Preço:</strong> ${a.price ? "R$ " + a.price : "—"}</p>
          <p>${a.description}</p>
        `;

        if (btnChat) {
          btnChat.addEventListener('click', async () => {

            if (!auth.currentUser)
              return window.location.href = "login.html";

            const currentId = auth.currentUser.uid;
            const ownerId = a.ownerId;

            const q = db.collection('chats')
              .where('participants', 'array-contains', currentId);

            const snap = await q.get();
            let existing = null;

            snap.forEach(s => {
              if (s.data().participants.includes(ownerId))
                existing = s.id;
            });

            if (existing)
              return window.location.href = "chat.html?chatId=" + existing;

            const chatRef = await db.collection('chats').add({
              participants: [currentId, ownerId],
              lastMessage: "",
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.location.href = "chat.html?chatId=" + chatRef.id;
          });
        }
      }
    });
  }
}
