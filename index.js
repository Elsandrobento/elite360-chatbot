import dotenv from 'dotenv';
import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import path from 'path';
import { execSync } from 'child_process';

// Módulos do Sistema KIXI IA + KIXI COPILOT
import { normalizePhone, formatPhoneForDisplay } from './src/auth/phoneNormalizer.js';
import { isInternalStaff, ROLES, USER_STATUS, getRoleDisplayName } from './src/auth/rbac.js';
import { store } from './src/database/store.js';
import { seedInitialUsers } from './src/database/seed.js';
import { handleCopilotMessage } from './src/copilot/copilotHandler.js';
import { handleClientMessage, getActiveClientSessionsCount } from './src/client/clientHandler.js';
import { logger, maskPhone } from './src/logger/logger.js';

// Carregar variáveis de ambiente
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_AQUI') {
  console.error('❌ ERRO: Por favor, configure a sua chave GEMINI_API_KEY no ficheiro .env');
  process.exit(1);
}

// Inicializar utilizadores autorizados na base de dados
seedInitialUsers();

// ============================================================
//  MONITOR FORENSE DE PROCESSOS (VPS LINUX)
// ============================================================
function logProcessTreeMemory(label) {
  const m = process.memoryUsage();
  const nodeRssMb = (m.rss / 1024 / 1024).toFixed(1);
  const nodeHeapMb = (m.heapUsed / 1024 / 1024).toFixed(1);

  if (process.platform === 'linux') {
    try {
      const output = execSync('ps -eo pid,ppid,rss,cmd --sort=-rss', { encoding: 'utf8' });
      const lines = output.trim().split('\n').slice(1);
      let chromiumRssTotalKb = 0;
      let chromiumCount = 0;
      const processDetails = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) continue;
        const pid = parts[0];
        const ppid = parts[1];
        const rssKb = parseInt(parts[2], 10) || 0;
        const cmd = parts.slice(3).join(' ');

        if (cmd.includes('node')) {
          processDetails.push(`  PID: ${pid.padEnd(6)} | PPID: ${ppid.padEnd(6)} | RSS: ${(rssKb / 1024).toFixed(1).padStart(6)} MB | Node.js (main)`);
        } else if (cmd.includes('chrome') || cmd.includes('chromium')) {
          const rssMb = rssKb / 1024;
          chromiumRssTotalKb += rssMb;
          chromiumCount++;
          let type = 'Chromium Helper';
          if (cmd.includes('--type=renderer')) type = 'Chromium Renderer';
          else if (cmd.includes('--type=gpu-process')) type = 'Chromium GPU';
          else if (cmd.includes('--type=utility')) type = 'Chromium Utility';
          else type = 'Chromium Browser (Main)';

          processDetails.push(`  PID: ${pid.padEnd(6)} | PPID: ${ppid.padEnd(6)} | RSS: ${rssMb.toFixed(1).padStart(6)} MB | ${type}`);
        }
      }

      const chromTotalMb = (chromiumRssTotalKb / 1024).toFixed(1);
      const treeTotalMb = (parseFloat(nodeRssMb) + parseFloat(chromTotalMb)).toFixed(1);

      console.log(`\n==================================================`);
      console.log(`[PROCESS_TREE] ${label} | TOTAL TREE RSS: ${treeTotalMb} MB (Limit: 512 MB)`);
      console.log(`Node RSS: ${nodeRssMb} MB (Heap: ${nodeHeapMb} MB) | Chromium RSS: ${chromTotalMb} MB (${chromiumCount} procs)`);
      console.log(`--------------------------------------------------`);
      processDetails.slice(0, 8).forEach(d => console.log(d));
      console.log(`==================================================\n`);
      return;
    } catch (e) {
      // Fallback
    }
  }

  console.log(`[PROCESS_MEMORY] ${label} | NODE RSS=${nodeRssMb}MB | HEAP=${nodeHeapMb}MB`);
}

function logMemory(label) {
  logProcessTreeMemory(label);
}

// Monitor periódico da árvore de processos (a cada 30 segundos)
setInterval(() => {
  logProcessTreeMemory('PERIODIC_MONITOR');
}, 30000).unref();

// ============================================================
//  ESTADO DA APLICAÇÃO
// ============================================================
let whatsappStatus = 'initializing';
let qrCodeUrl = null;
let lastError = null;

const processedMessageIds = new Set();
setInterval(() => processedMessageIds.clear(), 60 * 60 * 1000).unref();

const MANAGER_NUMBER = process.env.MANAGER_NUMBER || '244930968888@c.us';
const SESSION_PATH = process.env.SESSION_PATH || './';

// ============================================================
//  CONFIGURAÇÃO DO PUPPETEER — HEADLESS LINUX (VPS HOSTINGER)
// ============================================================
const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-default-browser-check',
  '--no-zygote',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--mute-audio',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter',
  '--disk-cache-size=33554432',
  '--media-cache-size=1'
];

const puppeteerConfig = {
  headless: true,
  args: puppeteerArgs
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  console.log(`[PUPPETEER] executablePath: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

// ============================================================
//  CLIENTE WHATSAPP — INSTÂNCIA ÚNICA PERSISTENTE
// ============================================================
console.log('[WA] CLIENT CREATED');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'kixi-ia', dataPath: SESSION_PATH }),
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0,
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
  puppeteer: puppeteerConfig
});

client.on('qr', (qr) => {
  whatsappStatus = 'qr_ready';
  qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log('\n[WA] QR CODE GERADO');
  qrcode.generate(qr, { small: true });
  console.log(`[WA] QR Link: ${qrCodeUrl}\n`);
  logProcessTreeMemory('QR GENERATED');
});

client.on('authenticated', async () => {
  whatsappStatus = 'authenticated';
  qrCodeUrl = null;
  console.log('\n[WA] QR CODE LIDO E AUTENTICADO COM SUCESSO');
  logProcessTreeMemory('AUTHENTICATED');
  try {
    const state = await client.getState();
    console.log(`[WA] STATE APÓS AUTH: ${state}`);
  } catch (err) {
    console.warn(`[WA] Erro ao obter estado após auth: ${err.message || err}`);
  }
});

client.on('loading_screen', (percent, message) => {
  whatsappStatus = 'loading';
  console.log(`[WA] SINCRONIZAÇÃO: ${percent}% - ${message}`);
});

client.on('change_state', (state) => {
  console.log(`[WA] ESTADO ALTERADO: ${state}`);
});

client.on('auth_failure', (msg) => {
  whatsappStatus = 'auth_failure';
  lastError = `Auth failure: ${msg}`;
  console.error('❌ [WA] FALHA NA AUTENTICAÇÃO:', msg);
});

client.on('ready', async () => {
  whatsappStatus = 'ready';
  qrCodeUrl = null;
  console.log('\n🚀 [WA] READY! KixiCrédito Kixi IA + Copilot ONLINE.');
  console.log('💚 KixiCrédito S.A. | Atendimento e Copilot Ativos');
  logProcessTreeMemory('READY');

  try {
    const state = await client.getState();
    const info = client.info;
    const maskedUser = info?.wid?.user ? maskPhone(info.wid.user) : 'N/A';
    console.log(`[WA] ESTADO OPERACIONAL: ${state} | WID: ${maskedUser}`);
  } catch (err) {
    console.warn(`[WA] Aviso ao ler info: ${err.message || err}`);
  }
});

client.on('disconnected', (reason) => {
  whatsappStatus = 'disconnected';
  lastError = `Disconnected: ${reason}`;
  console.error('❌ [WA] DESCONECTADO:', reason);
});

// ============================================================
//  PROCESSAMENTO PRINCIPAL DE MENSAGENS (ROTEAMENTO INTELIGENTE)
// ============================================================
client.on('message', async (msg) => {
  let msgId = typeof msg.id === 'string' ? msg.id : (msg.id?._serialized || msg.id?.id || String(Date.now()));

  if (processedMessageIds.has(msgId)) return;
  processedMessageIds.add(msgId);

  if (msg.fromMe) return;

  const isGroup = msg.from.endsWith('@g.us');
  const isBroadcast = msg.from === 'status@broadcast';
  if (isGroup || isBroadcast) return;

  // Filtrar mensagens com mais de 5 minutos
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds - msg.timestamp > 300) return;

  // Filtrar stickers
  if (msg.hasMedia && msg.type === 'sticker') return;

  // Filtrar mensagens vazias
  if (!msg.body && !msg.hasMedia) return;

  const rawSender = msg.from;
  let contact = null;
  try { contact = await msg.getContact(); } catch (e) {}

  let chat = null;
  try { chat = await msg.getChat(); } catch (e) {}

  // Resolução multi-candidatos do telefone (suporta @c.us, @lid, contact.number, etc.)
  const candidatePhones = [
    rawSender,
    contact?.number,
    contact?.id?.user,
    contact?.id?._serialized,
    msg.author,
    msg.id?.remote,
    msg.id?.participant,
    msg._data?.from,
    msg._data?.author,
    msg._data?.id?.remote,
    msg._data?.id?.participant,
    msg._data?.sender
  ].filter(Boolean);

  let registeredUser = null;
  let normalizedPhone = normalizePhone(rawSender);

  for (const candidate of candidatePhones) {
    const norm = normalizePhone(candidate);
    if (norm) {
      const u = store.getUserByPhone(norm);
      if (u) {
        registeredUser = u;
        normalizedPhone = norm;
        break;
      }
      if (!normalizedPhone || normalizedPhone.length !== 12) {
        normalizedPhone = norm;
      }
    }
  }

  // Se não encontrar na base, a role é estritamente CLIENTE
  const isStaff = isInternalStaff(registeredUser);
  const role = registeredUser ? registeredUser.role : ROLES.CLIENT;
  const roleDisplay = getRoleDisplayName(role);

  // ============================================================
  //  LOGS ESTRUTURADOS DE AUDITORIA E DEBUG (SEGURO - SEM MENSAGENS PRIVADAS)
  // ============================================================
  console.log(`\n[INCOMING]`);
  console.log(`from=${rawSender}`);
  console.log(`\n[AUTH]`);
  console.log(`rawFrom=${rawSender}`);
  console.log(`normalized=${normalizedPhone}`);
  console.log(`role=${roleDisplay}`);
  console.log(`user=${registeredUser?.name || 'Cliente Externo'}`);
  console.log(`agency=${registeredUser?.agency || 'Geral'}`);
  console.log(`authorized=${isStaff}`);
  console.log(`\n[ROUTER]`);
  console.log(`mode=${role}`);
  console.log(`\n[AI]`);
  console.log(`knowledge_source=official_documents`);
  console.log(`fallback=${isStaff ? 'internal_controlled_error' : 'external_customer_support'}\n`);

  const cleanBody = (msg.body || '').trim().toLowerCase();

  // Consulta de perfil ativo
  if (cleanBody === '#perfil' || cleanBody === '#status' || cleanBody === '#quem_sou') {
    if (isStaff) {
      await client.sendMessage(rawSender,
        `👤 *PERFIL AUTORIZADO — KIXI COPILOT*\n\n` +
        `• *Nome:* ${registeredUser.name}\n` +
        `• *Telefone:* ${formatPhoneForDisplay(registeredUser.phone)}\n` +
        `• *Função:* ${registeredUser.role} (${roleDisplay})\n` +
        `• *Agência:* ${registeredUser.agency}\n` +
        `• *Estado:* ${registeredUser.status}`
      );
    } else {
      await client.sendMessage(rawSender,
        `👤 *PERFIL — ATENDIMENTO AO CLIENTE*\n\n` +
        `• *Telefone:* ${formatPhoneForDisplay(normalizedPhone)}\n` +
        `• *Tipo de Acesso:* CLIENTE (Atendimento Público)`
      );
    }
    return;
  }

  try {
    let replyText = null;

    if (isStaff) {
      // ==========================================
      //  FLUXO KIXI COPILOT (AGENT / MANAGER / ADMIN)
      // ==========================================
      console.log(`👨‍💼 [COPILOT] A processar pedido interno de ${registeredUser.name} (${registeredUser.role} - ${registeredUser.agency})`);
      try { await chat?.sendStateTyping(); } catch (e) {}

      replyText = await handleCopilotMessage(registeredUser, msg.body, msg.hasMedia);

      logger.logInteraction({
        phone: normalizedPhone,
        role: registeredUser.role,
        agency: registeredUser.agency,
        message: msg.body || '[Mídia]',
        responseSnippet: replyText,
        mode: 'COPILOT'
      });

    } else {
      // ==========================================
      //  FLUXO KIXI IA (CLIENTE)
      // ==========================================
      // Tratamento de fotos/documentos enviados por clientes para análise de crédito
      if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
        console.log(`📸 [CLIENTE] Documento recebido de cliente [${maskPhone(normalizedPhone)}]`);
        try {
          const clientName = contact?.pushname || contact?.name || 'Cliente';
          const notifyMsg =
            `📄 *DOCUMENTO RECEBIDO - KIXI IA*\n\n` +
            `👤 *Cliente:* ${clientName}\n` +
            `📱 *Contacto:* wa.me/${normalizedPhone}\n\nDocumento em anexo:`;

          await client.sendMessage(MANAGER_NUMBER, notifyMsg);
          await msg.forward(MANAGER_NUMBER);

          replyText = `Recebemos o seu documento! 📋\n\nA nossa equipa irá analisar e entrará em contacto brevemente.\n\n📞 Apoio imediato: *+244 930 968 888*`;
        } catch (err) {
          console.error('❌ Erro ao encaminhar documento do cliente:', err);
          replyText = 'Recebemos o ficheiro, mas houve um problema ao encaminhá-lo. Por favor contacte-nos pelo *+244 930 968 888*.';
        }
      } else {
        console.log(`👤 [CLIENTE] A processar mensagem de cliente [${maskPhone(normalizedPhone)}]`);
        try { await chat?.sendStateTyping(); } catch (e) {}

        replyText = await handleClientMessage(normalizedPhone, msg.body, contact || {});

        logger.logInteraction({
          phone: normalizedPhone,
          role: ROLES.CLIENT,
          agency: 'Geral',
          message: msg.body,
          responseSnippet: replyText,
          mode: 'CLIENT'
        });
      }
    }

    if (replyText) {
      // Simulação de digitação humana
      const typingMs = Math.min(Math.max(replyText.length * 12, 600), 3000);
      await new Promise(r => setTimeout(r, typingMs));
      try { await chat?.clearState(); } catch (e) {}

      await client.sendMessage(rawSender, replyText);
      console.log(`📤 [WHATSAPP] Resposta enviada com sucesso para [${maskPhone(normalizedPhone)}] (${roleDisplay})`);
    }

    if (global.gc) { try { global.gc(); } catch (e) {} }

  } catch (error) {
    console.error('❌ [ROUTER] Erro ao processar mensagem:', error.message || error);
    try {
      if (isStaff) {
        await client.sendMessage(rawSender,
          '⚠️ Ocorreu um erro temporário no processamento interno do Copilot. Por favor tente novamente.'
        );
      } else {
        await client.sendMessage(rawSender,
          'De momento não foi possível processar o seu pedido. Por favor tente novamente mais tarde ou contacte:\n\n' +
          '📞 *+244 930 968 888*\n' +
          '📧 *atendimento@kixicredito.ao*\n' +
          '🌐 *www.kixicredito.ao*'
        );
      }
    } catch (sendErr) {}
  } finally {
    try { await chat?.clearState(); } catch (e) {}
  }
});

// ============================================================
//  SERVIDOR EXPRESS HTTP & HEALTH CHECK
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function renderQrPage(req, res) {
  if (req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))) {
    return res.json({
      status: 'online',
      service: 'KixiCrédito Kixi IA + Copilot WhatsApp Bot',
      whatsapp: whatsappStatus,
      timestamp: new Date().toISOString()
    });
  }

  res.send(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>KixiCrédito S.A. — Kixi IA + Copilot WhatsApp</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; background: #0b141a; color: #e9edef;
    }
    .card {
      background: #111b21; border: 1px solid #222d34; padding: 2.5rem 2rem;
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      text-align: center; max-width: 460px; width: 90%;
    }
    .brand { color: #00a884; font-size: 1.6rem; font-weight: 700; margin-bottom: 0.3rem; }
    .subtitle { color: #8696a0; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.4; }
    .qr-container {
      background: #ffffff; padding: 16px; border-radius: 16px;
      display: inline-block; margin: 1rem 0; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    img { max-width: 260px; width: 100%; height: auto; display: block; }
    .status-badge {
      display: inline-block; padding: 8px 18px; border-radius: 20px;
      font-size: 0.88rem; font-weight: 600; background: #202c33; color: #00a884; margin-top: 1rem;
    }
    .success-box {
      background: #00a8841a; border: 1px solid #00a884; color: #00a884;
      padding: 1.8rem 1.5rem; border-radius: 14px; margin-top: 1rem;
    }
    .success-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .spinner {
      border: 3px solid #222d34; border-top: 3px solid #00a884; border-radius: 50%;
      width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 2rem auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">💚 KixiCrédito S.A.</div>
    <div class="subtitle">Kixi IA + Internal Copilot — WhatsApp</div>
    
    <div id="loading-section" style="display: ${qrCodeUrl ? 'none' : (whatsappStatus === 'ready' ? 'none' : 'block')};">
      <div class="spinner"></div>
      <p style="color:#8696a0; font-size:0.9rem;" id="loading-msg">
        ${whatsappStatus === 'authenticated' || whatsappStatus === 'loading'
          ? '⏳ Autenticado! A concluir sincronização...'
          : 'A inicializar o cliente do WhatsApp... Por favor, aguarde.'}
      </p>
    </div>

    <div id="qr-section" style="display: ${qrCodeUrl && whatsappStatus === 'qr_ready' ? 'block' : 'none'};">
      <p style="color:#d1d7db; font-size:0.9rem; margin-bottom:0.5rem;">
        1. Abra o WhatsApp no telemóvel<br>
        2. Toque em <b>Dispositivos associados</b> &gt; <b>Associar dispositivo</b><br>
        3. Aponte a câmara para o código abaixo:
      </p>
      <div class="qr-container">
        <img id="qr-img" src="${qrCodeUrl || ''}" alt="WhatsApp QR Code" />
      </div>
      <br>
      <div class="status-badge" id="status-text">A aguardar leitura do QR Code...</div>
    </div>

    <div id="success-section" style="display: ${whatsappStatus === 'ready' ? 'block' : 'none'};" class="success-box">
      <div class="success-icon">🚀</div>
      <h3 style="margin:0 0 0.5rem 0; color:#00a884; font-size:1.3rem;">Kixi IA + Copilot Online!</h3>
      <p style="margin:0; font-size:0.92rem; color:#d1d7db;">Atendimento automático a clientes e assistente interno de colaboradores prontos.</p>
    </div>
  </div>

  <script>
    let currentQr = "${qrCodeUrl || ''}";
    
    async function checkStatus() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        
        const loadingSec = document.getElementById('loading-section');
        const qrSec = document.getElementById('qr-section');
        const successSec = document.getElementById('success-section');
        const qrImg = document.getElementById('qr-img');
        const loadingMsg = document.getElementById('loading-msg');

        if (data.whatsapp === 'ready') {
          loadingSec.style.display = 'none';
          qrSec.style.display = 'none';
          successSec.style.display = 'block';
        } else if (data.whatsapp === 'authenticated' || data.whatsapp === 'loading') {
          qrSec.style.display = 'none';
          successSec.style.display = 'none';
          loadingSec.style.display = 'block';
          loadingMsg.innerText = '⏳ Autenticado! A concluir sincronização (Status: ' + data.whatsapp + ')...';
        } else if (data.qrCodeAvailable && data.qrCodeUrl && data.whatsapp === 'qr_ready') {
          loadingSec.style.display = 'none';
          successSec.style.display = 'none';
          qrSec.style.display = 'block';
          if (data.qrCodeUrl !== currentQr) {
            currentQr = data.qrCodeUrl;
            qrImg.src = data.qrCodeUrl;
          }
        }
      } catch (e) {}
    }
    
    setInterval(checkStatus, 2500);
  </script>
</body>
</html>`);
}

app.get('/', renderQrPage);
app.get('/qr', renderQrPage);

app.get('/health', (req, res) => {
  const m = process.memoryUsage();
  const isError = whatsappStatus === 'error';
  res.status(isError ? 500 : 200).json({
    status: isError ? 'error' : 'ok',
    service: 'Kixi IA + Copilot WhatsApp',
    whatsapp: whatsappStatus,
    ai: GEMINI_API_KEY ? 'configured' : 'missing_key',
    database: 'connected',
    registeredUsersCount: store.listUsers().length,
    registeredUsers: store.listUsers().map(u => ({
      name: u.name,
      phone: maskPhone(u.phone),
      role: u.role,
      agency: u.agency,
      status: u.status
    })),
    activeClientSessions: getActiveClientSessionsCount(),
    qrCodeAvailable: !!qrCodeUrl,
    qrCodeUrl: qrCodeUrl || null,
    lastError: lastError || null,
    memory: {
      rss_mb: (m.rss / 1024 / 1024).toFixed(1),
      heapUsed_mb: (m.heapUsed / 1024 / 1024).toFixed(1),
      heapTotal_mb: (m.heapTotal / 1024 / 1024).toFixed(1)
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    total: store.listUsers().length,
    users: store.listUsers()
  });
});

app.post('/api/users/register', express.json(), (req, res) => {
  try {
    const { name, phone, role, agency } = req.body || {};
    if (!name || !phone || !role) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: name, phone, role' });
    }
    const user = store.addUserOrUpdate({
      name,
      phone,
      role: role.toUpperCase(),
      agency: agency || 'Geral',
      status: USER_STATUS.ACTIVE
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tratamento de erros globais
process.on('uncaughtException', (error) => {
  console.error('🔥 [ERRO CRÍTICO] Uncaught Exception:', error);
  logMemory('On uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [REJEIÇÃO NÃO TRATADA] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Inicialização do WhatsApp Client
let isInitializing = false;
async function initWhatsAppClient() {
  if (isInitializing) return;
  isInitializing = true;

  console.log('[WHATSAPP] A inicializar cliente...');
  logProcessTreeMemory('BEFORE_CLIENT_INIT');
  try {
    await client.initialize();
    logProcessTreeMemory('AFTER_CLIENT_INIT');
  } catch (error) {
    isInitializing = false;
    whatsappStatus = 'error';
    lastError = error.message || String(error);
    console.error('❌ [WHATSAPP] Erro na inicialização:', error);
  }
}

// Arranque do Servidor
logMemory('Startup');
app.listen(PORT, () => {
  console.log(`[SERVER] HTTP Server ativo na porta ${PORT}`);
  console.log(`[SERVER] Health Check: http://localhost:${PORT}/health`);
  console.log(`[SERVER] QR Code Web: http://localhost:${PORT}/qr`);
  logMemory('After HTTP server started');

  initWhatsAppClient();
});
