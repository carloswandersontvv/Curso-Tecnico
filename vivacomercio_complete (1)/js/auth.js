// Autenticação e helpers

// Observador de estado
auth.onAuthStateChanged(user => {
  if(user){
    console.log('Logado:', user.email);
  } else {
    console.log('Nenhum usuário autenticado');
  }
});

// Login
const btnLogin = document.getElementById('btnLogin');
if(btnLogin) btnLogin.addEventListener('click', async ()=>{
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  try{
    await auth.signInWithEmailAndPassword(email, senha);
    window.location.href = 'anuncios.html';
  }catch(err){ alert(err.message); }
});

// Cadastro
const btnCadastro = document.getElementById('btnCadastro');
if(btnCadastro) btnCadastro.addEventListener('click', async ()=>{
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('emailCadastro').value;
  const senha = document.getElementById('senhaCadastro').value;
  const cidade = document.getElementById('cidadeCadastro').value || '';
  try{
    const cred = await auth.createUserWithEmailAndPassword(email, senha);
    await db.collection('users').doc(cred.user.uid).set({
      name: nome,
      email,
      city: cidade,
      avatarUrl: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.location.href = 'anuncios.html';
  }catch(err){ alert(err.message); }
});

// Logout helper
function logout(){
  auth.signOut().then(()=> window.location.href = 'index.html');
}
