/* ========================
   ASTROQUIZ — script.js
   Completo e atualizado:
   - powerups
   - starfield
   - perguntas com feedback ACERTO/ERRO
   - HUD e persistência de recorde
   ======================== */

/* ======================== CONFIGURAÇÃO DO CANVAS ======================== */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', ()=> {
  resizeCanvas();
  initStars();
  ship.x = canvas.width/2 - ship.w/2;
  ship.y = canvas.height * 0.78;
});

/* ======================== ELEMENTOS DO HUD ======================== */
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const shootBtnMobile = document.getElementById('mobileShoot');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const remainingEl = document.getElementById('remaining');
const multEl = document.getElementById('mult');
const powerNameEl = document.getElementById('powerName');
const highscoreEl = document.getElementById('highscore');

/* POPUPS */
const questionBox = document.getElementById('question-container');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');
const gameOverBox = document.getElementById('gameover-container');
const finalScore = document.getElementById('final-score');
const retryBtn = document.getElementById('retryBtn');
const winBox = document.getElementById('win-container');
const winScore = document.getElementById('win-score');
const winRetryBtn = document.getElementById('win-retry-btn');

/* FEEDBACK MESSAGE (elemento existente no seu HTML) */
const feedbackEl = document.getElementById('feedbackMessage');

/* CONTROLES DE MOVIMENTO */
const moveLeft = document.getElementById('moveLeft');
const moveRight = document.getElementById('moveRight');
let leftPressed=false, rightPressed=false;

/* ======================== TECLADO ======================== */
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressed = true;
  if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressed = true;
  if (e.code === 'Space') shoot();
});

document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressed = false;
  if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressed = false;
});
/* === MOUSE: atirar ao clicar === */
document.addEventListener('mousedown', () => {
  shoot();
});

document.addEventListener('keyup', e=>{
  if(e.code==='ArrowLeft') leftPressed=false;
  if(e.code==='ArrowRight') rightPressed=false;
});

/* ======================== TOUCH ======================== */
if(moveLeft){
  moveLeft.addEventListener('touchstart', e=>{ e.preventDefault(); leftPressed=true; });
  moveLeft.addEventListener('touchend', e=>{ e.preventDefault(); leftPressed=false; });
}
if(moveRight){
  moveRight.addEventListener('touchstart', e=>{ e.preventDefault(); rightPressed=true; });
  moveRight.addEventListener('touchend', e=>{ e.preventDefault(); rightPressed=false; });
}
if(shootBtnMobile){
  shootBtnMobile.addEventListener('touchstart', e=>{ e.preventDefault(); shoot(); });
}

/* ======================== VARIÁVEIS DO JOGO ======================== */
let running=false, paused=false, frame=0;
let score=0, lives=3, level=1, multiplier=1;
let destroyed=0, asteroidsToQuestion=6;

let bullets=[], asteroids=[], particles=[], powerups=[];
let questionOpen=false;

/* POWER CONSTANTS */
const POWER = { SHIELD:'SHIELD', POWER:'POWER', SPEED:'SPEED', DOUBLE:'DOUBLE' };
const POWER_TYPES = { SHIELD:'Escudo', POWER:'Potência', SPEED:'Velocidade', DOUBLE:'Dobro de Pontos' };
let activePower = null;
let powerTimer = 0;
const POWER_DURATION = 600; // frames (~10s at 60fps)

/* HIGHSCORE */
let highscore = parseInt(localStorage.getItem('astroquiz-record')||'0');
if(highscoreEl) highscoreEl.textContent = 'Recorde: ' + highscore;

/* ======================== NAVE ======================== */
const ship = {
  x: window.innerWidth/2 - 36,
  y: window.innerHeight*0.78,
  w:72, h:88,
  baseSpeed:10,
  speed:10,
  shield:false,
  shieldHP:0
};

/* ======================== PERGUNTAS ======================== */
let questions = [
  { q:'Quanto é 9 × 7?', a:['56','63','72','57'], c:1 },
  { q:'Planeta mais próximo do Sol?', a:['Terra','Vênus','Mercúrio','Marte'], c:2 },
  { q:'Sinônimo de FELIZ:', a:['Triste','Bravo','Contente','Sério'], c:2 },
  { q:'Maior planeta?', a:['Terra','Saturno','Júpiter','Netuno'], c:2 },
  { q:'Oceano mais profundo?', a:['Índico','Ártico','Pacífico','Atlântico'], c:2 },
  { q:'Qual linguagem de programação é usada principalmente para desenvolvimento web?', a:['Python','JavaScript','C++','Java'], c:1 }
];

let unusedQuestions=[...questions];

/* ======================== HUD ======================== */
function updateHUD(){
  if(scoreEl) scoreEl.textContent='Pontuação: '+score;
  if(livesEl) livesEl.textContent='Vidas: '+lives;
  if(remainingEl) remainingEl.textContent='Para pergunta: '+Math.max(0, asteroidsToQuestion-destroyed);
  if(levelEl) levelEl.textContent='Nível: '+level;
  if(multEl) multEl.textContent = multiplier;
  if(powerNameEl) powerNameEl.textContent = activePower ? POWER_TYPES[activePower] : '—';
  if(highscoreEl) highscoreEl.textContent = 'Recorde: ' + highscore;
}

/* ======================== TIROS ======================== */
let lastShot=0;
function shoot(){
  if(!running||paused) return;
  if(frame-lastShot<8) return;
  lastShot=frame;
  const isPowerShot = activePower === POWER.POWER;
  const bw = isPowerShot ? 14 : 8;
  const bh = isPowerShot ? 34 : 20;
  const dmg = isPowerShot ? 2 : 1;

  bullets.push({
    x: ship.x + ship.w/2 - bw/2,
    y: ship.y -12,
    w: bw, h: bh,
    vy:-14,
    dmg
  });
}

/* ======================== ASTERÓIDES ======================== */
function spawnAsteroid(){
  const size = 36 + Math.random()*80;
  asteroids.push({
    x: Math.random()*(canvas.width-size),
    y: -size,
    size,
    speed: 1.6 + Math.random()*(1 + level*0.35),
    angle: Math.random()*Math.PI*2,
    rot: (Math.random()-0.5)*0.02,
    hue: 30 + Math.random()*40,
    hp: 1
  });
}

/* ======================== FEEDBACK: ACERTO / ERRO ======================== */
function mostrarFeedback(tipo) {
    if(!feedbackEl) return;
    if (tipo === "acerto") {
        feedbackEl.textContent = "✔ ACERTOU!";
        feedbackEl.className = "acerto"; // utiliza suas classes css
    } else {
        feedbackEl.textContent = "✖ ERROU!";
        feedbackEl.className = "erro";
    }
    feedbackEl.style.display = "block";
    // animação extra: fade out via classe ou timeout
    clearTimeout(feedbackEl._hideTimeout);
    feedbackEl._hideTimeout = setTimeout(()=> {
      feedbackEl.style.display = "none";
      feedbackEl.className = "";
    }, 1000);
}

/* ======================== EXPLOSÃO ======================== */
function explode(x,y,amount=18){
  for(let i=0;i<amount;i++){
    particles.push({
      x,y,
      vx:(Math.random()-0.5)*8,
      vy:(Math.random()-0.5)*8,
      life:24+Math.random()*24,
      size:2+Math.random()*6,
      color:`hsl(${Math.random()*50+20},90%,50%)`
    });
  }
}

/* ======================== POWER-UP DROP ======================== */
function dropPower(x,y){
  if(Math.random() < 0.22){
    const types = [POWER.SHIELD, POWER.POWER, POWER.SPEED, POWER.DOUBLE];
    const t = types[Math.floor(Math.random()*types.length)];
    powerups.push({ x, y, type:t, vy:3 });
  }
}

/* ======================== POWERUPS: DRAW / UPDATE / ACTIVATE ======================== */
function drawPowerups(){
  powerups.forEach(p=>{
    ctx.save();
    ctx.translate(p.x, p.y);

    // icon container
    ctx.beginPath();
    ctx.fillStyle='rgba(255,255,255,0.95)';
    ctx.arc(0,0,14,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle='#000';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='14px sans-serif';

    if(p.type === POWER.SHIELD) ctx.fillText('🛡️',0,0);
    else if(p.type === POWER.POWER) ctx.fillText('🔥',0,0);
    else if(p.type === POWER.SPEED) ctx.fillText('⚡',0,0);
    else if(p.type === POWER.DOUBLE) ctx.fillText('✨',0,0);

    ctx.restore();
  });
}

function updatePowerups(){
  for(let i = powerups.length-1; i>=0; i--){
    const p = powerups[i];
    p.y += p.vy;
    // collect check: simple AABB
    if(p.x > ship.x - 6 && p.x < ship.x + ship.w + 6 && p.y > ship.y - 6 && p.y < ship.y + ship.h + 6){
      activatePower(p.type);
      powerups.splice(i,1);
      continue;
    }
    // remove if offscreen
    if(p.y > canvas.height + 40) powerups.splice(i,1);
  }
}

function activatePower(type){
  activePower = type;
  powerTimer = POWER_DURATION;

  if(type === POWER.SHIELD){
    ship.shield = true;
    ship.shieldHP = 3; // você pediu 3 HP para o escudo
    // mostrar feedback sutil
  } else if(type === POWER.SPEED){
    ship.speed = ship.baseSpeed * 1.6;
  } else if(type === POWER.DOUBLE){
    multiplier = 2;
  } else if(type === POWER.POWER){
    // bullet behavior handled at shoot()
  }
  updateHUD();
}

function updatePowerTimer(){
  if(!activePower) return;
  powerTimer--;
  if(powerTimer <= 0){
    if(activePower === POWER.SHIELD){
      ship.shield=false;
      ship.shieldHP=0;
    }
    if(activePower === POWER.SPEED){
      ship.speed = ship.baseSpeed;
    }
    if(activePower === POWER.DOUBLE){
      multiplier = 1;
    }
    activePower = null;
    powerTimer = 0;
    updateHUD();
  }
}

/* ======================== PERGUNTAS ======================== */
function showQuestion(){
  if(questionOpen) return;
  paused=true;
  questionOpen=true;

  if(unusedQuestions.length===0) return winGame();

  const q = unusedQuestions.splice(Math.floor(Math.random()*unusedQuestions.length),1)[0];

  if(questionText) questionText.textContent = q.q;
  if(answerButtons) answerButtons.innerHTML = '';

  q.a.forEach((ans,idx)=>{
    const btn = document.createElement('button');
    btn.textContent = ans;
    btn.onclick = ()=>{
      // fechar popup
      if(questionBox) questionBox.classList.add('hidden');
      paused=false;
      questionOpen=false;

      // ---- AQUI: mostrar feedback de acerto / erro ----
      if(idx !== q.c){
        mostrarFeedback("erro");           // <-- CHAMADA DO FEEDBACK (ERRO)
        lives--;
        score = Math.max(0, score-8);
        updateHUD();
        if(lives <= 0) gameOver();
      } else {
        mostrarFeedback("acerto");         // <-- CHAMADA DO FEEDBACK (ACERTO)
        score += 15 * multiplier;
        updateHUD();
      }

      if(unusedQuestions.length===0) winGame();
    };

    answerButtons.appendChild(btn);
  });

  if(questionBox) questionBox.classList.remove('hidden');
}

/* ======================== GAME OVER / WIN ======================== */
function gameOver(){
  paused=true;
  running=false;

  if(finalScore) finalScore.textContent = 'Pontuação final: ' + score;
  if(gameOverBox) gameOverBox.classList.remove('hidden');
  if(startBtn) startBtn.style.display='inline-block';

  if(score > highscore){
    localStorage.setItem('astroquiz-record', score);
    highscore = score;
  }
  updateHUD();
}

function winGame(){
  paused=true;
  running=false;
  if(winScore) winScore.textContent = '🎉 Você venceu! Pontuação: ' + score;
  if(winBox) winBox.classList.remove('hidden');
  if(startBtn) startBtn.style.display='inline-block';

  if(score > highscore){
    localStorage.setItem('astroquiz-record', score);
    highscore = score;
  }
  updateHUD();
}

/* ======================== RESET ======================== */
function resetGame(){
  score=0;
  lives=3;
  level=1;
  destroyed=0;
  multiplier=1;

  bullets=[];
  asteroids=[];
  particles=[];
  powerups=[];
  unusedQuestions=[...questions];

  activePower=null;
  powerTimer=0;
  ship.speed = ship.baseSpeed;
  ship.shield = false;
  ship.shieldHP = 0;

  ship.x = canvas.width/2 - ship.w/2;
  ship.y = canvas.height*0.78;

  // Fecha telas visuais
  if(gameOverBox) gameOverBox.classList.add('hidden');
  if(winBox) winBox.classList.add('hidden');
  if(questionBox) questionBox.classList.add('hidden');

  questionOpen=false;
  paused=false;

  // Não ativamos running aqui; o botão faz isso
  running = false;

  asteroidsToQuestion = 6;

  updateHUD();
}

/* ======================== STARFIELD ======================== */
let starField = [];
function initStars(){
  starField = [];
  const count = Math.round((canvas.width * canvas.height) / 9000);
  for(let i=0;i<count;i++){
    starField.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      s: 0.5 + Math.random()*1.5,
      hue: Math.random()*60 + 180
    });
  }
}
initStars();

function drawStarfield(){
  ctx.fillStyle = '#00000066';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  starField.forEach((s,idx)=>{
    const yy = (s.y + frame * s.s * 0.2) % canvas.height;

    ctx.beginPath();
    ctx.fillStyle = `rgba(220,240,255,${0.4 + Math.sin((frame+idx)*0.01)*0.3})`;
    ctx.arc(s.x, yy, s.s, 0, Math.PI*2);
    ctx.fill();
  });
}

/* ======================== DRAW: SHIP / ASTEROIDS / BULLETS / PARTICLES ======================== */
function drawShip(){
  ctx.save();
  ctx.translate(ship.x + ship.w/2, ship.y + ship.h/2);
  const stage = Math.min(4, level-1);
  const bodyGrad = ctx.createLinearGradient(-20, -40, 20, 60);
  bodyGrad.addColorStop(0, ['#8ff7ff','#7be3ff','#6bcfff','#55b9ff','#3da2ff'][stage]);
  bodyGrad.addColorStop(1, ['#3bc7ff','#39b0ff','#379aff','#3585ff','#336fff'][stage]);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.quadraticCurveTo(28, 0, 14, 42);
  ctx.lineTo(-14, 42);
  ctx.quadraticCurveTo(-28, 0, 0, -40);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-32, 10, 14, 22);
  ctx.fillRect(18, 10, 14, 22);
  if(stage >= 2){ ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(-26,-10,52,10);}  
  if(stage >= 3){ ctx.fillStyle='rgba(255,200,80,0.12)'; ctx.fillRect(-10,-20,20,8);}  
  if(stage >= 4){ ctx.fillStyle='rgba(255,120,40,0.25)'; ctx.fillRect(-36,16,12,26); ctx.fillRect(24,16,12,26);}  
  const cockpitGrad = ctx.createRadialGradient(0,-10,4,0,-10,18);
  cockpitGrad.addColorStop(0,'#fff'); cockpitGrad.addColorStop(1,'#004c6f');
  ctx.fillStyle=cockpitGrad;
  ctx.beginPath(); ctx.ellipse(0,-10,14,18,0,0,Math.PI*2); ctx.fill();
  const flameSize = 18 + stage*4 + Math.sin(frame*0.3)*6;
  const flameGrad = ctx.createRadialGradient(0,50,4,0,60,flameSize);
  flameGrad.addColorStop(0,'rgba(255,255,160,1)'); flameGrad.addColorStop(0.5,'rgba(255,140,40,0.9)'); flameGrad.addColorStop(1,'rgba(255,80,20,0)');
  ctx.fillStyle=flameGrad;
  ctx.beginPath(); ctx.moveTo(0,42); ctx.quadraticCurveTo(12,60,0,80); ctx.quadraticCurveTo(-12,60,0,42); ctx.fill();
  if(ship.shield){ ctx.strokeStyle='rgba(120,220,255,0.9)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,48,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
}

function drawAsteroids(){
  asteroids.forEach(a=>{
    const cx = a.x + a.size/2;
    const cy = a.y + a.size/2;
    const radius = a.size/2;

    ctx.save();
    ctx.translate(cx, cy);
    // rotacao removida: ctx.rotate(a.angle);

    // ---------- Base cinza com gradiente ----------
    const grad = ctx.createRadialGradient(-radius*0.1, -radius*0.1, radius*0.1, 0, 0, radius);
    grad.addColorStop(0, `hsl(0, 0%, 85%)`);   // luz
    grad.addColorStop(0.5, `hsl(0, 0%, 55%)`); // meio
    grad.addColorStop(1, `hsl(0, 0%, 30%)`);   // sombra
    ctx.fillStyle = grad;

    ctx.beginPath();
    // forma irregular para estilo cartoon
    for(let i=0;i<8;i++){
      const ang = (Math.PI*2/8)*i;
      const rad = radius*(0.7 + Math.random()*0.3);
      const x = Math.cos(ang)*rad;
      const y = Math.sin(ang)*rad;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fill();

    // ---------- Detalhes brilhantes sutis ----------
    for(let i=0;i<4;i++){
      const angle = Math.random()*Math.PI*2;
      const dist = Math.random()*radius*0.6;
      const size = radius*0.05 + Math.random()*radius*0.05;
      ctx.beginPath();
      ctx.arc(Math.cos(angle)*dist, Math.sin(angle)*dist, size, 0, Math.PI*2);
      ctx.fillStyle = `hsla(0,0%,100%,0.15)`; // brilho branco sutil
      ctx.fill();
    }

    ctx.restore();
  });
}


function drawBullets(){
  bullets.forEach(b=>{
    ctx.save();
    ctx.translate(b.x + b.w/2, b.y + b.h/2);
    ctx.rotate(Math.sin(frame*0.4)*0.1);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h );
    ctx.restore();
  });
}

function drawParticles(){
  particles.forEach(p=>{
    ctx.fillStyle=p.color || '#fff';
    ctx.globalAlpha = Math.max(0.05, p.life/40);
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha=1;
  });
}

/* ----- GAME LOOP ----- */
function loop(){
  frame++;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawStarfield();

  // update power timer
  updatePowerTimer();

  if(running && !paused){

    if(leftPressed) ship.x -= ship.speed;
    if(rightPressed) ship.x += ship.speed;
    ship.x = Math.max(0, Math.min(canvas.width - ship.w, ship.x));

    // bullets motion
    bullets.forEach(b=> b.y += b.vy );
    bullets = bullets.filter(b=> b.y > -50 );

    // spawn asteroids
    if(frame % Math.max(48 - level*3, 12) === 0){
      spawnAsteroid();
    }

    // asteroids motion
    asteroids.forEach(a=>{
      a.y += a.speed;
      a.angle += a.rot;
    });
    asteroids = asteroids.filter(a=> a.y < canvas.height + 120 );

    // collisions: bullets <-> asteroids
    for(let i = asteroids.length-1; i>=0; i--){
      let a = asteroids[i];

      let destroyedByBullet = false;
      for(let j = bullets.length-1; j>=0; j--){
        let b = bullets[j];

        const dx = (b.x + b.w/2) - (a.x + a.size/2);
        const dy = (b.y + b.h/2) - (a.y + a.size/2);
        const dist2 = dx*dx + dy*dy;
        const r = Math.max(a.size/2, b.w);

        if(dist2 < r*r){
          // bullet hits asteroid
          bullets.splice(j,1);
          // explode and drop
          const ax = a.x + a.size/2;
          const ay = a.y + a.size/2;
          asteroids.splice(i,1);
          explode(ax, ay, 26);

          // increment counters & score
          destroyed++;
          score += 5 * multiplier;
          updateHUD();

          // chance to drop a powerup
          dropPower(ax, ay);

          if(destroyed >= asteroidsToQuestion){
            destroyed = 0;
            asteroidsToQuestion += 4;
            showQuestion();
          }

          destroyedByBullet = true;
          break;
        }
      }
      if(destroyedByBullet) continue;
      if(i >= asteroids.length) continue;
      let a2 = asteroids[i];

      // asteroid <-> ship collision
      const sx = ship.x + ship.w/2;
      const sy = ship.y + ship.h/2;
      const ax = a2.x + a2.size/2;
      const ay = a2.y + a2.size/2;

      const distShip = Math.hypot(sx - ax, sy - ay);
      const shipRadius = ship.w * 0.45;

      if(distShip < a2.size/2 + shipRadius){
        asteroids.splice(i,1);
        explode(ax, ay, 30);
        // if shield active absorb
        if(ship.shield && ship.shieldHP > 0){
          ship.shieldHP--;
          if(ship.shieldHP <= 0){
            ship.shield=false;
            activePower=null; // shield ended
          }
        } else {
          lives--;

        }

        updateHUD();
        if(lives <= 0){
          gameOver(); // chama gameOver, mas não para o loop
        }
        continue;
      }

    }

    // particles update
    particles.forEach(p=>{ p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p=> p.life > 0 );

    // powerups update & collect
    updatePowerups();

    // level progression
    if(score >= level * 150){
      level++;
      explode(ship.x + ship.w/2, ship.y + ship.h/2, 30);
      lives = Math.min(5, lives + 1);
      updateHUD();
    }

  }

  // drawing
  drawAsteroids();
  drawShip();
  drawBullets();
  drawParticles();
  drawPowerups();

  requestAnimationFrame(loop);
}

/* ----- BUTTONS ----- */
if(startBtn) startBtn.onclick = ()=>{
  resetGame();
  startBtn.style.display='none';
  running=true;
  paused=false;
};

if(pauseBtn) pauseBtn.onclick = ()=>{
  paused = !paused;
  pauseBtn.textContent = paused ? '▶' : '⏸';
};

if(retryBtn) retryBtn.onclick = ()=>{
  // clicar em jogar novamente após Game Over
  resetGame();
  if(startBtn) startBtn.style.display = 'none';
  running = true;
  paused = false;
};

if(winRetryBtn) winRetryBtn.onclick = ()=>{
  resetGame();
  if(startBtn) startBtn.style.display = 'none';
  running = true;
  paused = false;
};

/* ----- Start ----- */
loop();
updateHUD();
