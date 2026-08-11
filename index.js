import dotenv from 'dotenv';
import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Carregar variáveis de ambiente
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_AQUI') {
  console.error('❌ ERRO: Por favor, configure a sua chave GEMINI_API_KEY no ficheiro .env');
  process.exit(1);
}

// Inicializar API do Gemini
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);


//  MONITOR FORENSE DE PROCESSOS (Tabela PID | PPID | RSS | TYPE)
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
      let maxChromiumProcessKb = 0;
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
          if (rssMb > maxChromiumProcessKb) maxChromiumProcessKb = rssMb;

          let type = 'Chromium Helper';
          if (cmd.includes('--type=renderer')) type = 'Chromium Renderer';
          else if (cmd.includes('--type=gpu-process')) type = 'Chromium GPU';
          else if (cmd.includes('--type=utility')) type = 'Chromium Utility';
          else if (cmd.includes('--type=zygote')) type = 'Chromium Zygote';
          else type = 'Chromium Browser (Main)';

          processDetails.push(`  PID: ${pid.padEnd(6)} | PPID: ${ppid.padEnd(6)} | RSS: ${rssMb.toFixed(1).padStart(6)} MB | ${type}`);
        }
      }

      const chromTotalMb = (chromiumRssTotalKb / 1024).toFixed(1);
      const treeTotalMb = (parseFloat(nodeRssMb) + parseFloat(chromTotalMb)).toFixed(1);

      console.log(`\n==================================================`);
      console.log(`[PROCESS_TREE_DETAIL] ${label} | TOTAL TREE RSS: ${treeTotalMb} MB (Limit: 512 MB)`);
      console.log(`Node RSS: ${nodeRssMb} MB (Heap: ${nodeHeapMb} MB) | Chromium RSS: ${chromTotalMb} MB (${chromiumCount} procs)`);
      console.log(`--------------------------------------------------`);
      processDetails.slice(0, 12).forEach(d => console.log(d));
      console.log(`==================================================\n`);
      return;
    } catch (e) {
      // Se ps falhar, cai para o formato padrao
    }
  }

  console.log(
    `[PROCESS_MEMORY] ${label} | NODE RSS=${nodeRssMb}MB | HEAP=${nodeHeapMb}MB` +
    ` EXT=${(m.external / 1024 / 1024).toFixed(1)}MB`
  );
}

function logMemory(label) {
  logProcessTreeMemory(label);
}

// ============================================================
//  MONITOR PERIÓDICO DE ÁRVORE DE PROCESSOS (a cada 15 segundos)
// ============================================================
setInterval(() => {
  logProcessTreeMemory('PERIODIC_MONITOR');
}, 15000).unref();

// ============================================================
//  ESTADO DA APLICAÇÃO
// ============================================================
let whatsappStatus = 'initializing';
let qrCodeUrl = null;
let lastError = null;

// ============================================================
//  BASE DE CONHECIMENTO - KIXICRÉDITO
//  Carregada UMA única vez em memória estática (string constante)
// ============================================================
const KNOWLEDGE_BASE = `
INSTITUIÇÃO: KixiCrédito S.A.
Endereço: Largo Teixeira de Pascoaes, Vila Alice, Luanda, Angola
Linha de Atendimento: +244 930 968 888
E-mail: atendimento@kixicredito.ao
Website: www.kixicredito.ao
Redes Sociais: Facebook, LinkedIn e Instagram (@kixicredito_oficial)

QUEM SOMOS:
A KixiCrédito é uma instituição financeira não bancária dedicada à promoção da inclusão financeira e ao desenvolvimento do empreendedorismo em Angola. Fundada em 1996 com um projeto de microcrédito pela Development Workshop Angola (DWA). Em 2008 tornou-se a primeira sociedade de microcrédito licenciada pelo Banco Nacional de Angola (BNA). Com mais de 20 anos de experiência, apoia milhares de empreendedores, famílias e pequenos negócios com soluções financeiras responsáveis. Presente em diversas províncias de Angola.
Slogan: "Há mais de 20 anos a KixiCrédito anda com quem levanta cedo e faz acontecer."

---

PRODUTO 1: KixiFácil
Tipo: Crédito Empresarial - Nano e Micro Empresarial
Público-alvo: Nano e micro empresários
Montante Mínimo: Kz 5.000,00
Montante Máximo: Kz 500.000,00
Prazo máximo: 12 meses
Periodicidade de pagamento: Mensal
Taxa de Juro Nominal Anual (TAN): 55,2% | Taxa mensal: 4,6% a.m.
Garantias exigidas: Solidária, avalista e penhor
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Não renovação automática para reempréstimo
Validade da FTI: 90 dias

---

PRODUTO 2: KixiNegócio
Tipo: Crédito Empresarial - Empreendedorismo
Público-alvo: Empreendedores e pequenos negócios
Montante Mínimo: Kz 500.001,00
Montante Máximo: Kz 2.500.000,00
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal
Taxa de Juro Nominal Anual (TAN): 55,2% | Taxa mensal: 4,6% a.m.
Garantias exigidas: Avalista, hipoteca, penhor e caução
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Sem elegibilidade para novo empréstimo
Validade da FTI: 90 dias

---

PRODUTO 3: KixiAgronegócio
Tipo: Crédito para Agricultura e Pecuária
Público-alvo: Nano, micro e pequenos agricultores
Montante Mínimo: Kz 50.000,00
Montante Máximo: Kz 2.500.000,00
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal ou Quadrimestral
Taxa de Juro Nominal Anual (TAN): 55,2% | Taxa mensal: 4,6% a.m.
Garantias exigidas: Avalista, hipoteca, penhor e caução
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Sem elegibilidade para novo empréstimo
Periodicidade especial: Opção de pagamento quadrimestral para ciclos agrícolas
Validade da FTI: 90 dias

---

PRODUTO 4: KixiValor
Tipo: Adiantamento de Salário - Crédito a Médio Longo Prazo
Público-alvo: Trabalhadores assalariados (colaboradores de empresas parceiras)
Montante Mínimo: Kz 75.000,00
Montante Máximo: Kz 2.500.000,00
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal
Taxa de Juro Nominal Anual (TAN): 61,2%
Garantias: Não aplicável (garantia implícita pelo vínculo laboral)
Reembolso antecipado: 3% do valor em dívida
Taxa de juro de mora: 50% sobre a prestação mensal convencionada
Multa diária por incumprimento: 1% sobre o valor vencido
Consequências de incumprimento: Comunicação à Central de Informação e Risco de Crédito do BNA
Validade da FTI: 90 dias

---

PARCERIAS KIXICRÉDITO:
Destinatários: Entidades empregadoras que queiram oferecer crédito aos seus colaboradores
Requisitos: Protocolo celebrado com a entidade empregadora; Documento de identificação válido; Extracto bancário

Processo de Adesão:
1º Passo: Celebração do protocolo de parceria
2º Passo: O colaborador apresenta o pedido de crédito
3º Passo: Entrega da documentação necessária
4º Passo: Análise e decisão sobre o pedido
5º Passo: Assinatura do contrato
6º Passo: Desembolso do montante aprovado

Para se tornar parceiro: +244 930 968 888 ou atendimento@kixicredito.ao

---

INFORMAÇÕES GERAIS:
- Direito de revogação: A qualquer momento, sem custos, antes da concessão do financiamento
- Rejeição do pedido: O cliente é informado de imediato após a rejeição
- Cópia do contrato: Entregue após celebração (gratuita)
- Todos os produtos válidos por 90 dias a partir da data da FTI
`;

// ============================================================
//  PROMPT MESTRE DA KIXI IA
//  Construído UMA vez em memória (string constante, não recriada por pedido)
// ============================================================
const SYSTEM_INSTRUCTION = `
TU ÉS A KIXI IA, a assistente virtual oficial da KixiCrédito S.A., a maior e mais antiga instituição de microcrédito de Angola.

A tua missão é:
1. Informar e esclarecer dúvidas sobre os produtos de crédito da KixiCrédito de forma clara, simples e acessível.
2. Ajudar o cliente a identificar qual o produto mais adequado ao seu perfil e necessidade.
3. Explicar os processos de pedido de crédito e de parcerias.
4. Encaminhar para as agências ou contactos humanos quando necessário.
5. Qualificar leads e capturar dados de potenciais clientes interessados.

TOM E COMUNICAÇÃO:
- Simpático, profissional, acessível e humano.
- Fala em Português de Angola (correto e formal, mas próximo do cliente).
- Explica os produtos com linguagem simples, evitando jargão financeiro excessivo.
- Nunca inventas informação. Se não souberes, encaminhas para: +244 930 968 888.
- Responde de forma direta ao que é perguntado. NUNCA obrigues o cliente a responder perguntas antes de lhe dar a informação que pediu.

REGRAS DE OURO:
1. RESPONDE DIRETO: Se o cliente perguntar por um produto específico, dás imediatamente os detalhes desse produto.
2. LINGUAGEM SIMPLES: Explica percentagens e valores de forma que qualquer pessoa entenda.
3. UMA PERGUNTA DE CADA VEZ: Quando qualificares o cliente, faz apenas uma pergunta de cada vez.
4. NUNCA GARANTAS APROVAÇÃO: Os pedidos estão sujeitos a análise de crédito.
5. SEMPRE DISPONÍVEL: Lembra o cliente que pode ligar para +244 930 968 888.

BASE DE CONHECIMENTO DOS PRODUTOS:
${KNOWLEDGE_BASE}

FLUXO DA CONVERSA:

1. SAUDAÇÃO INICIAL (apenas na primeira mensagem):
"Olá! 👋 Bem-vindo à *KixiCrédito*!

Há mais de 20 anos ao lado de quem levanta cedo para fazer acontecer. 💪

Sou a *Kixi IA*, a sua assistente virtual. Como posso ajudar hoje?

1️⃣ Saber mais sobre os nossos produtos de crédito
2️⃣ Quero pedir um crédito
3️⃣ Parcerias empresariais (KixiValor para colaboradores)
4️⃣ Falar com um agente humano
5️⃣ Localizar a agência mais próxima"

2. QUANDO O CLIENTE PERGUNTAR POR UM PRODUTO:
Apresenta imediatamente os detalhes completos. Exemplo para KixiFácil:

"O *KixiFácil* é o nosso produto ideal para nano e micro empresários! 🏪

💰 *Montante disponível:* Kz 5.000 a Kz 500.000
📅 *Prazo:* Até 12 meses
📊 *Taxa de juro:* 4,6% ao mês (TAN 55,2% anual)
🔒 *Garantias:* Avalista, caução ou penhor
📋 *Encargos:* Comissão de processamento (6,5%) + imprevistos (2%)

Gostaria de iniciar o pedido ou tem alguma dúvida sobre este produto?"

3. QUANDO O CLIENTE QUISER PEDIR CRÉDITO (qualificação):
Obtém os seguintes dados, um de cada vez:
- Nome completo
- Tipo de atividade (comerciante, agricultor, assalariado, empreendedor...)
- Montante que pretende
- Prazo desejado
- Tem avalista? (se aplicável ao produto)

Após recolher os dados, sugere o produto mais adequado e informa os próximos passos.

4. QUANDO O CLIENTE MENCIONAR PARCERIAS:
Explica o programa KixiValor para entidades empregadoras e o processo em 6 passos.

5. QUANDO O CLIENTE QUISER FALAR COM UM AGENTE:
"Pode contactar a nossa equipa diretamente:
📞 *Linha de Atendimento:* +244 930 968 888
📧 *E-mail:* atendimento@kixicredito.ao
📍 *Endereço:* Largo Teixeira de Pascoaes, Vila Alice, Luanda
🌐 *Website:* www.kixicredito.ao"

6. EXTRAÇÃO DE LEADS (FORMATO TÉCNICO):
Quando um cliente demonstrar interesse em pedir crédito e recolheres dados suficientes, inclui no FINAL da resposta:
###LEAD_DATA###{"nome": "Nome do Lead", "atividade": "Tipo de atividade", "produto_interesse": "Produto de interesse", "montante": "Montante pretendido", "telefone": ""}###
`;

// ============================================================
//  CONFIGURAÇÕES DO SISTEMA
// ============================================================
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
// Mantém últimas 10 mensagens de histórico (5 turnos user+bot)
const MAX_HISTORY_MESSAGES = 10;
// Máximo de sessões ativas simultâneas
const MAX_ACTIVE_SESSIONS = 200;
const MANAGER_NUMBER = process.env.MANAGER_NUMBER || '244930968888@c.us';
const LEADS_FILE = path.join(process.cwd(), 'kixi_leads.json');
const SESSION_PATH = process.env.SESSION_PATH || './';
const sessions = new Map();

// ============================================================
//  HELPER: Converter histórico Gemini pesado em pares de texto leve
//  O chatSession.getHistory() devolve objetos grandes com candidates,
//  safety ratings, metadados, etc. Guardamos apenas role + texto.
// ============================================================
function compressHistory(rawHistory) {
  return rawHistory.map(entry => ({
    role: entry.role,
    parts: [{ text: (entry.parts || []).map(p => p.text || '').join('') }]
  }));
}

// ============================================================
//  LIMPEZA PERIÓDICA DE SESSÕES EXPIRADAS
//  Sem isto, sessions cresce indefinidamente em memória
//  pois entradas antigas nunca são removidas.
// ============================================================
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [userId, sessionData] of sessions.entries()) {
    if (now - sessionData.lastActive > SESSION_TIMEOUT) {
      sessions.delete(userId);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[SESSION_GC] Removed ${removed} expired session(s). Active sessions: ${sessions.size}`);
  }
}, 5 * 60 * 1000).unref(); // Executa a cada 5 minutos

// ============================================================
//  FUNÇÕES AUXILIARES
// ============================================================
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`⚠️ Erro na API. Tentativas restantes: ${retries}. A tentar em ${delay}ms... Erro: ${error.message || error}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

function salvarLead(leadData) {
  try {
    let leads = [];
    if (fs.existsSync(LEADS_FILE)) {
      const content = fs.readFileSync(LEADS_FILE, 'utf-8');
      if (content.trim()) leads = JSON.parse(content);
    }
    const jaExiste = leads.some(l =>
      l.telefone === leadData.telefone &&
      l.nome?.toLowerCase() === leadData.nome?.toLowerCase()
    );
    if (!jaExiste) {
      leadData.dataRegisto = new Date().toISOString();
      leads.push(leadData);
      fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
      console.log(`\n🚨 [LEAD CAPTURADO] "${leadData.nome}" guardado em kixi_leads.json!`);
      const managerMsg =
        `🚨 *NOVO LEAD KIXI IA* 🚨\n\n` +
        `👤 *Nome:* ${leadData.nome || 'N/D'}\n` +
        `💼 *Atividade:* ${leadData.atividade || 'N/D'}\n` +
        `💰 *Produto Interesse:* ${leadData.produto_interesse || 'N/D'}\n` +
        `📊 *Montante Pretendido:* ${leadData.montante || 'N/D'}\n` +
        `📱 *Contacto:* wa.me/${leadData.telefone || ''}`;
      client.sendMessage(MANAGER_NUMBER, managerMsg)
        .then(() => console.log(`✉️ Notificação enviada ao gestor.`))
        .catch(err => console.error(`❌ Erro ao notificar gestor:`, err));
    }
  } catch (error) {
    console.error('❌ Erro ao salvar lead:', error);
  }
}

// ============================================================
//  CONFIGURAÇÃO DO PUPPETEER — HEADLESS LINUX (VPS)
//  Flags essenciais para correr em servidor Linux sem interface gráfica.
//  NÃO aplicamos limites de RAM artificiais pois a VPS tem memória suficiente.
// ============================================================
const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',         // Usa /tmp em vez de /dev/shm (compatível com VPS)
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-default-browser-check',
  '--no-zygote',
  '--disable-gpu',                   // Sem GPU no servidor headless
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
  '--disk-cache-size=33554432',      // Cache 32 MB (razoável para VPS)
  '--media-cache-size=1'
];

const puppeteerConfig = {
  headless: true,
  args: puppeteerArgs
};

// Caminho personalizado do Chromium (quando definido via variável de ambiente)
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  console.log(`[PUPPETEER] executablePath: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

// ============================================================
//  CLIENTE WHATSAPP — ÚNICA INSTÂNCIA (nunca recriada)
// ============================================================
console.log('[WA] CLIENT CREATED');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'kixi-ia', dataPath: SESSION_PATH }),
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0,
  // webVersionCache: usa versão estável 2.2412.54 para evitar o bug de sincronização
  // de histórico suspensa que ocorria com a versão alpha
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
  puppeteer: puppeteerConfig
});

client.on('qr', (qr) => {
  whatsappStatus = 'qr_ready';
  qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log('\n[WA] QR GENERATED');
  qrcode.generate(qr, { small: true });
  console.log(`[WA] QR Link: ${qrCodeUrl}\n`);
  logProcessTreeMemory('QR GENERATED');
});

client.on('authenticated', async () => {
  whatsappStatus = 'authenticated';
  qrCodeUrl = null;
  console.log('\n[WA] QR SCANNED & AUTHENTICATED');
  logProcessTreeMemory('AUTHENTICATED');
  try {
    const state = await client.getState();
    console.log(`[WA] STATE AFTER AUTHENTICATION: ${state}`);
  } catch (err) {
    console.warn(`[WA] Could not fetch state after auth: ${err.message || err}`);
  }
});

client.on('loading_screen', (percent, message) => {
  whatsappStatus = 'loading';
  console.log(`[WA] LOADING: ${percent}% - ${message}`);
  logProcessTreeMemory(`LOADING_${percent}%`);
});

client.on('change_state', (state) => {
  console.log(`[WA] STATE CHANGED: ${state}`);
});

client.on('auth_failure', (msg) => {
  whatsappStatus = 'auth_failure';
  lastError = `Auth failure: ${msg}`;
  console.error('❌ [WA] AUTH FAILURE:', msg);
  logProcessTreeMemory('AUTH_FAILURE');
});

client.on('ready', async () => {
  whatsappStatus = 'ready';
  qrCodeUrl = null;
  console.log('\n🚀 [WA] READY! KixiCrédito Kixi IA online.');
  console.log('💚 KixiCrédito S.A. | +244 930 968 888 | atendimento@kixicredito.ao');
  logProcessTreeMemory('READY');

  // Diagnóstico de erro de página Puppeteer
  try {
    if (client.pupBrowser) {
      client.pupBrowser.on('disconnected', () => {
        console.error('❌ [PUPPETEER] BROWSER DISCONNECTED — O processo Chromium foi desconectado ou encerrado.');
        logProcessTreeMemory('BROWSER_DISCONNECTED');
      });
    }
    if (client.pupPage) {
      client.pupPage.on('error', (err) => console.error('❌ [PUPPETEER PAGE ERROR]:', err.message || err));
      client.pupPage.on('pageerror', (err) => console.error('❌ [PUPPETEER PAGE UNCAUGHT EXCEPTION]:', err.message || err));
    }
  } catch (diagErr) {}

  try {
    const state = await client.getState();
    const info = client.info;
    const maskedUser = info?.wid?.user ? (info.wid.user.substring(0, 4) + '***' + info.wid.user.slice(-2)) : 'N/A';
    console.log(`[WA] OPERATIONAL STATE: ${state}`);
    console.log(`[WA] CLIENT INFO: Pushname="${info?.pushname || 'N/A'}", WID=${maskedUser}, Platform=${info?.platform || 'N/A'}`);
  } catch (err) {
    console.warn(`[WA] Could not fetch operational state info: ${err.message || err}`);
  }
});

client.on('disconnected', (reason) => {
  whatsappStatus = 'disconnected';
  lastError = `Disconnected: ${reason}`;
  console.error('❌ [WA] DISCONNECTED:', reason);
  logMemory('[MEMORY] DISCONNECTED');
  console.warn('⚠️ [WA] Serviço HTTP mantém-se ativo. Reiniciar o serviço no Render para reconectar.');
});

// MONITOR DE ESTADO DO WHATSAPP (a cada 20 segundos)
setInterval(async () => {
  if (whatsappStatus === 'authenticated' || whatsappStatus === 'ready' || whatsappStatus === 'loading') {
    try {
      const state = await client.getState();
      console.log(`[WA] PERIODIC CHECK | Status: ${whatsappStatus} | State: ${state} | Pushname: ${client.info?.pushname || 'N/A'}`);
    } catch (e) {
      console.log(`[WA] PERIODIC CHECK | Status: ${whatsappStatus} | Error getting state: ${e.message}`);
    }
  }
}, 20000).unref();

// ============================================================
//  PROCESSAMENTO DE MENSAGENS DO WHATSAPP
// ============================================================
client.on('message_create', async (msg) => {
  // Ignorar mensagens enviadas pelo próprio bot
  if (msg.fromMe) {
    return;
  }

  console.log(`\n📥 [WHATSAPP] Message event received`);
  console.log(`[WHATSAPP] From: ${msg.from}`);
  console.log(`[WHATSAPP] Message type: ${msg.type}`);
  console.log(`[WHATSAPP] Body: "${msg.body || ''}"`);

  const isGroup = msg.from.endsWith('@g.us');
  const isBroadcast = msg.from === 'status@broadcast';
  console.log(`[WHATSAPP] Is group: ${isGroup}`);
  console.log(`[WHATSAPP] Is broadcast: ${isBroadcast}`);

  if (isGroup) {
    console.log(`[WHATSAPP] Message ignored: Group message (${msg.from})`);
    return;
  }

  if (isBroadcast) {
    console.log(`[WHATSAPP] Message ignored: Status broadcast`);
    return;
  }

  // Filtrar mensagens muito antigas (> 5 minutos / 300 segundos para tolerar dessincronia de relógio)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const messageAge = nowInSeconds - msg.timestamp;
  if (messageAge > 300) {
    console.log(`[WHATSAPP] Message ignored: Old message (${messageAge}s old)`);
    return;
  }

  // Filtrar stickers
  if (msg.hasMedia && msg.type === 'sticker') {
    console.log(`[WHATSAPP] Message ignored: Sticker`);
    return;
  }

  // Ignorar mensagens sem corpo nem mídia
  if (!msg.body && !msg.hasMedia) {
    console.log(`[WHATSAPP] Message ignored: Empty body`);
    return;
  }

  console.log(`[WHATSAPP] Passed message filters`);

  const userId = msg.from;
  let chat = null;
  try {
    chat = await msg.getChat();
  } catch (err) {
    console.warn(`[WHATSAPP] Warning: Could not get chat object for [${userId}]:`, err.message || err);
  }

  let contact = null;
  try {
    contact = await msg.getContact();
  } catch (err) {
    console.warn(`[WHATSAPP] Warning: Could not get contact object for [${userId}]:`, err.message || err);
  }

  // Processar documentos e imagens como comprovativos
  if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
    console.log(`📸 [WHATSAPP] Document/image received from [${userId}]`);
    try { await chat?.sendStateTyping(); } catch (e) {}
    try {
      const sessionData = sessions.get(userId);
      const clientName = (sessionData && sessionData.clientName)
        ? sessionData.clientName
        : (contact?.pushname || contact?.name || 'Cliente');
      const notifyMsg =
        `📄 *DOCUMENTO RECEBIDO - KIXI IA*\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📱 *Contacto:* wa.me/${contact?.id?.user || userId.split('@')[0]}\n\nDocumento em anexo:`;

      console.log(`[WHATSAPP] Forwarding document to manager...`);
      await client.sendMessage(MANAGER_NUMBER, notifyMsg);
      await msg.forward(MANAGER_NUMBER);
      
      console.log(`[WHATSAPP] Sending confirmation to client...`);
      await client.sendMessage(userId,
        `Recebemos o seu documento! 📋\n\nA nossa equipa irá analisar e entrará em contacto brevemente.\n\n📞 Apoio imediato: *+244 930 968 888*`
      );
      console.log(`[WHATSAPP] Document processed successfully`);
    } catch (err) {
      console.error('❌ [WHATSAPP] Erro ao processar documento:', err.message || err);
      await client.sendMessage(userId, 'Recebemos o ficheiro, mas houve um problema ao encaminhá-lo. Contacte-nos pelo *+244 930 968 888*.');
    } finally {
      try { await chat?.clearState(); } catch (e) {}
    }
    return;
  }

  const userMessage = msg.body;
  console.log(`[AI] Starting KixiCredito processing`);
  try { await chat?.sendStateTyping(); } catch (e) {}

  try {
    const now = Date.now();
    let sessionData = sessions.get(userId);

    if (!sessionData || (now - sessionData.lastActive > SESSION_TIMEOUT)) {
      sessionData = { history: [], lastActive: now, clientName: null };
      sessions.set(userId, sessionData);
    }
    sessionData.lastActive = now;

    // Cap de sessões ativas: se Map tiver demasiadas entradas, remove as mais antigas
    if (sessions.size > MAX_ACTIVE_SESSIONS) {
      let oldest = null;
      let oldestTime = Infinity;
      for (const [uid, sd] of sessions.entries()) {
        if (sd.lastActive < oldestTime) { oldestTime = sd.lastActive; oldest = uid; }
      }
      if (oldest && oldest !== userId) {
        sessions.delete(oldest);
        console.log(`[SESSION_GC] Cap reached (${MAX_ACTIVE_SESSIONS}). Evicted oldest session.`);
      }
    }

    // Prune do histórico — mantém apenas as últimas MAX_HISTORY_MESSAGES mensagens
    if (sessionData.history.length > MAX_HISTORY_MESSAGES) {
      const extra = sessionData.history.length - MAX_HISTORY_MESSAGES;
      const toRemove = extra % 2 === 0 ? extra : extra + 1;
      sessionData.history = sessionData.history.slice(toRemove);
      console.log(`✂️ [AI] History pruned: ${sessionData.history.length} msgs remaining for [${userId}]`);
    }

    // Tentar modelos válidos do Gemini (gemini-1.5-flash primeiro, depois gemini-2.0-flash)
    const primaryModelName = 'gemini-1.5-flash';
    const fallbackModelName = 'gemini-2.0-flash';

    // Log do tamanho do prompt para diagnóstico de memória
    const historyChars = JSON.stringify(sessionData.history).length;
    console.log(`[AI] System prompt chars: ${SYSTEM_INSTRUCTION.length}`);
    console.log(`[AI] History chars: ${historyChars} (${sessionData.history.length} msgs)`);
    console.log(`[AI] User message chars: ${userMessage.length}`);
    console.log(`[AI] Total approx chars: ${SYSTEM_INSTRUCTION.length + historyChars + userMessage.length}`);
    console.log(`[AI] Calling Gemini (Model: ${primaryModelName})`);
    
    let botResponse = null;
    try {
      const model = ai.getGenerativeModel({
        model: primaryModelName,
        systemInstruction: SYSTEM_INSTRUCTION
      });
      const chatSession = model.startChat({ history: sessionData.history });

      const result = await retryWithBackoff(async () => {
        return await chatSession.sendMessage(userMessage);
      }, 2, 1000);

      botResponse = result.response.text();
      // CRÍTICO: Comprimir histórico para texto leve antes de guardar em memória.
      // chatSession.getHistory() devolve objetos pesados do SDK Gemini com
      // candidates, safety ratings e metadados — não guardamos esses dados.
      const rawHistory = await chatSession.getHistory();
      sessionData.history = compressHistory(rawHistory).slice(-MAX_HISTORY_MESSAGES);
      console.log(`[AI] Gemini response received from ${primaryModelName} (Length: ${botResponse.length} chars)`);
    } catch (primaryErr) {
      console.warn(`⚠️ [AI] Primary model ${primaryModelName} failed: ${primaryErr.message || primaryErr}. Trying fallback ${fallbackModelName}...`);
      
      const fallbackModel = ai.getGenerativeModel({
        model: fallbackModelName,
        systemInstruction: SYSTEM_INSTRUCTION
      });
      const fallbackSession = fallbackModel.startChat({ history: sessionData.history });

      const result = await retryWithBackoff(async () => {
        return await fallbackSession.sendMessage(userMessage);
      }, 2, 1000);

      botResponse = result.response.text();
      // CRÍTICO: Comprimir histórico para texto leve antes de guardar em memória.
      const rawFallbackHistory = await fallbackSession.getHistory();
      sessionData.history = compressHistory(rawFallbackHistory).slice(-MAX_HISTORY_MESSAGES);
      console.log(`[AI] Gemini response received from fallback ${fallbackModelName} (Length: ${botResponse.length} chars)`);
    }

    // Detetar e processar lead
    const leadRegex = /###LEAD_DATA###(.*?)###/;
    const match = botResponse.match(leadRegex);
    if (match) {
      try {
        const leadData = JSON.parse(match[1].trim());
        leadData.telefone = contact?.id?.user || userId.split('@')[0];
        if (leadData.nome && !sessionData.clientName) {
          sessionData.clientName = leadData.nome;
        }
        salvarLead(leadData);
      } catch (e) {
        console.error('❌ Erro ao decodificar lead:', e);
      }
      botResponse = botResponse.replace(leadRegex, '').trim();
    }

    console.log(`[WHATSAPP] Attempting reply to [${userId}]...`);
    
    // Usar client.sendMessage para garantir envio mesmo se chat for nulo
    await client.sendMessage(userId, botResponse);
    console.log(`[WHATSAPP] Response sent successfully to [${userId}]`);
    console.log(`📤 [WHATSAPP] Response snippet: "${botResponse.split('\n')[0].substring(0, 80)}..."`);
    logMemory('After message sent');
    // Sugestão de GC ao Node.js após cada resposta (reduz heap retido)
    if (global.gc) { try { global.gc(); } catch (e) {} }

  } catch (error) {
    console.error('❌ [AI] Error processing message with Gemini:', error.message || error);
    try {
      console.log(`[WHATSAPP] Sending fallback error message to [${userId}]...`);
      await client.sendMessage(userId,
        'De momento não consigo processar o seu pedido. Por favor, contacte-nos:\n\n' +
        '📞 *+244 930 968 888*\n' +
        '📧 *atendimento@kixicredito.ao*\n' +
        '🌐 *www.kixicredito.ao*'
      );
      console.log(`[WHATSAPP] Fallback error message sent successfully`);
    } catch (sendErr) {
      console.error('❌ [WHATSAPP] Failed to send fallback error message:', sendErr.message || sendErr);
    }
  } finally {
    try { await chat?.clearState(); } catch (e) {}
  }
});

// ============================================================
//  SERVIDOR EXPRESS HTTP
//  Inicia IMEDIATAMENTE — Render deteta o serviço como ativo
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function renderQrPage(req, res) {
  // Se o cliente solicitar explicitamente JSON via header ou parâmetro
  if (req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))) {
    const m = process.memoryUsage();
    return res.json({
      status: 'online',
      service: 'KixiCredito Kixi IA WhatsApp Bot',
      whatsapp: whatsappStatus,
      timestamp: new Date().toISOString()
    });
  }

  res.send(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>KixiCrédito S.A. — Kixi IA WhatsApp</title>
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
      text-align: center; max-width: 440px; width: 90%;
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
    <div class="subtitle">Assistente Virtual Kixi IA — Ligação WhatsApp</div>
    
    <div id="loading-section" style="display: ${qrCodeUrl ? 'none' : (whatsappStatus === 'ready' ? 'none' : 'block')};">
      <div class="spinner"></div>
      <p style="color:#8696a0; font-size:0.9rem;" id="loading-msg">
        ${whatsappStatus === 'authenticated' || whatsappStatus === 'loading'
          ? '⏳ Autenticado! A concluir sincronização e a aguardar sinal READY...'
          : 'A inicializar o cliente do WhatsApp... Por favor, aguarde.'}
      </p>
    </div>

    <div id="qr-section" style="display: ${qrCodeUrl && whatsappStatus === 'qr_ready' ? 'block' : 'none'};">
      <p style="color:#d1d7db; font-size:0.9rem; margin-bottom:0.5rem;">
        1. Abra o WhatsApp no telemóvel<br>
        2. Toque em <b>Mais opções</b> ou <b>Definições</b><br>
        3. Selecione <b>Dispositivos associados</b> &gt; <b>Associar um dispositivo</b><br>
        4. Aponte a câmara para o código abaixo:
      </p>
      <div class="qr-container">
        <img id="qr-img" src="${qrCodeUrl || ''}" alt="WhatsApp QR Code" />
      </div>
      <br>
      <div class="status-badge" id="status-text">A aguardar leitura do QR Code...</div>
    </div>

    <div id="success-section" style="display: ${whatsappStatus === 'ready' ? 'block' : 'none'};" class="success-box">
      <div class="success-icon">🚀</div>
      <h3 style="margin:0 0 0.5rem 0; color:#00a884; font-size:1.3rem;">Kixi IA Conetada com Sucesso!</h3>
      <p style="margin:0; font-size:0.92rem; color:#d1d7db;">O WhatsApp da KixiCrédito S.A. está online, READY e pronto para atender os clientes.</p>
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
          loadingMsg.innerText = '⏳ Autenticado! A concluir sincronização e a aguardar sinal READY (Status: ' + data.whatsapp + ')...';
        } else if (data.qrCodeAvailable && data.qrCodeUrl && data.whatsapp === 'qr_ready') {
          loadingSec.style.display = 'none';
          successSec.style.display = 'none';
          qrSec.style.display = 'block';
          
          if (data.qrCodeUrl !== currentQr) {
            currentQr = data.qrCodeUrl;
            qrImg.src = data.qrCodeUrl;
          }
        } else {
          successSec.style.display = 'none';
          qrSec.style.display = 'none';
          loadingSec.style.display = 'block';
          loadingMsg.innerText = 'Status: ' + data.whatsapp + '... Aguarde por favor.';
        }
      } catch (e) {
        console.error('Erro ao verificar status:', e);
      }
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
    server: 'online',
    whatsapp: whatsappStatus,
    qrCodeAvailable: !!qrCodeUrl,
    qrCodeUrl: qrCodeUrl || null,
    lastError: lastError || null,
    memory: {
      rss_mb: (m.rss / 1024 / 1024).toFixed(1),
      heapUsed_mb: (m.heapUsed / 1024 / 1024).toFixed(1),
      heapTotal_mb: (m.heapTotal / 1024 / 1024).toFixed(1)
    },
    activeSessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================================
//  TRATAMENTO DE ERROS GLOBAIS
// ============================================================
process.on('uncaughtException', (error) => {
  console.error('🔥 [ERRO CRÍTICO] Uncaught Exception:', error);
  logMemory('On uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [REJEIÇÃO NÃO TRATADA] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================
//  INICIALIZAÇÃO ASSÍNCRONA DO CLIENTE WHATSAPP
//  Protegida por flag contra dupla inicialização acidental
// ============================================================
let isInitializing = false;

async function initWhatsAppClient() {
  if (isInitializing) {
    console.warn('⚠️ [WA] Initialization skipped: WhatsApp client is already initializing!');
    return;
  }
  isInitializing = true;

  console.log('[WHATSAPP] Starting client initialization...');
  console.log('[PUPPETEER] Starting browser...');
  logProcessTreeMemory('BEFORE_CLIENT_INIT');
  try {
    await client.initialize();
    logProcessTreeMemory('AFTER_CLIENT_INIT');
  } catch (error) {
    isInitializing = false;
    whatsappStatus = 'error';
    lastError = error.message || String(error);
    console.error('❌ [WHATSAPP] Erro na inicialização:', error);
    logProcessTreeMemory('INIT_ERROR');
  }
}

// ============================================================
//  ARRANQUE: HTTP SERVER PRIMEIRO, DEPOIS WHATSAPP
// ============================================================
logMemory('Startup');
console.log('[SERVER] Starting HTTP server...');
app.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
  console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
  console.log(`[SERVER] QR Code: http://localhost:${PORT}/qr`);
  logMemory('After HTTP server started');

  // WhatsApp inicia assincronamente DEPOIS do servidor HTTP estar ativo
  initWhatsAppClient();
});
