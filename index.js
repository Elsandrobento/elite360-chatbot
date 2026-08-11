import dotenv from 'dotenv';
import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_AQUI') {
  console.error('❌ ERRO: Por favor, configure a sua chave GEMINI_API_KEY no ficheiro .env');
  process.exit(1);
}

// Inicializar API do Gemini
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

// ============================================================
//  UTILITÁRIO DE MEMÓRIA — diagnóstico em produção
// ============================================================
function logMemory(label) {
  const m = process.memoryUsage();
  console.log(
    `[MEMORY] ${label} | RSS: ${(m.rss / 1024 / 1024).toFixed(1)} MB` +
    ` | Heap Used: ${(m.heapUsed / 1024 / 1024).toFixed(1)} MB` +
    ` | Heap Total: ${(m.heapTotal / 1024 / 1024).toFixed(1)} MB`
  );
}

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
const SESSION_TIMEOUT = 30 * 60 * 1000;
// REDUZIDO de 20 para 10 — menos contexto em memória por utilizador ativo
const MAX_HISTORY_MESSAGES = 10;
const MANAGER_NUMBER = process.env.MANAGER_NUMBER || '244930968888@c.us';
const LEADS_FILE = path.join(process.cwd(), 'kixi_leads.json');
const SESSION_PATH = process.env.SESSION_PATH || './';
const sessions = new Map();

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
//  CONFIGURAÇÃO DO PUPPETEER — OTIMIZADO PARA RENDER FREE (512 MB)
//
//  CRÍTICO: --js-flags=--max-old-space-size=256
//  Limita o heap V8 do processo Chromium a 256 MB.
//  SEM ESTA FLAG o V8 pode crescer além dos 512 MB do Render → OOM crash.
//
//  webVersionCache: { type: 'remote' }
//  Carrega o WhatsApp Web a partir de uma URL remota fixa.
//  SEM ESTA CONFIG o whatsapp-web.js guarda a interface Web localmente
//  em cache → mais RAM consumida.
// ============================================================
const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-site-isolation-trials',  // Reduz processos isolados por site
  '--mute-audio',                      // Remove engine de áudio (economiza RAM)
  '--safebrowsing-disable-auto-update', // Remove serviço de background
  '--js-flags=--max-old-space-size=256' // CRÍTICO: limita heap V8 a 256 MB
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
//  CLIENTE WHATSAPP — ÚNICA INSTÂNCIA (nunca recriada em loops/handlers)
// ============================================================
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'kixi-ia', dataPath: SESSION_PATH }),
  // webVersionCache: carrega WhatsApp Web remotamente → menos RAM que cache local
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018942288-alpha.html',
  },
  puppeteer: puppeteerConfig
});

client.on('qr', (qr) => {
  whatsappStatus = 'qr_ready';
  qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log('\n📱 [WHATSAPP] Authentication required — QR code gerado');
  qrcode.generate(qr, { small: true });
  console.log(`\n🔗 Link QR Code:\n${qrCodeUrl}\n`);
  logMemory('After QR generated');
});

client.on('authenticated', () => {
  whatsappStatus = 'authenticated';
  console.log('[WHATSAPP] Client authenticated successfully');
  logMemory('After authenticated');
});

client.on('auth_failure', (msg) => {
  whatsappStatus = 'auth_failure';
  lastError = `Auth failure: ${msg}`;
  console.error('❌ [WHATSAPP] Authentication failure:', msg);
});

client.on('ready', () => {
  whatsappStatus = 'ready';
  qrCodeUrl = null;
  console.log('\n🚀 [WHATSAPP] Client ready! KixiCrédito Kixi IA online.');
  console.log('💚 KixiCrédito S.A. | +244 930 968 888 | atendimento@kixicredito.ao');
  logMemory('After WhatsApp ready');
});

client.on('disconnected', (reason) => {
  whatsappStatus = 'disconnected';
  lastError = `Disconnected: ${reason}`;
  // Regista mas NÃO reinicia automaticamente — evitar loops de reconexão
  // que criam múltiplos processos Chromium e causam OOM
  console.error('❌ [WHATSAPP] Disconnected:', reason);
  console.warn('⚠️ [WHATSAPP] Serviço HTTP mantém-se ativo. Reiniciar o serviço no Render para reconectar.');
});

// ============================================================
//  PROCESSAMENTO DE MENSAGENS DO WHATSAPP
// ============================================================
client.on('message', async (msg) => {
  if (msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') return;

  // Ignorar mensagens antigas (mais de 2 minutos)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds - msg.timestamp > 120) {
    console.log(`⏳ Mensagem antiga ignorada de [${msg.from}]`);
    return;
  }

  // Ignorar stickers
  if (msg.hasMedia && msg.type === 'sticker') {
    console.log(`🚫 Sticker ignorado de [${msg.from}]`);
    return;
  }

  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const userId = msg.from;

  // Processar documentos e imagens como comprovativos
  if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
    console.log(`📸 Documento/imagem recebido de [${userId}]`);
    chat.sendStateTyping();
    try {
      const sessionData = sessions.get(userId);
      const clientName = (sessionData && sessionData.clientName)
        ? sessionData.clientName
        : (contact.pushname || contact.name || 'Cliente');
      const notifyMsg =
        `📄 *DOCUMENTO RECEBIDO - KIXI IA*\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📱 *Contacto:* wa.me/${contact.id.user}\n\nDocumento em anexo:`;
      await client.sendMessage(MANAGER_NUMBER, notifyMsg);
      await msg.forward(MANAGER_NUMBER);
      await chat.sendMessage(
        `Recebemos o seu documento! 📋\n\nA nossa equipa irá analisar e entrará em contacto brevemente.\n\n📞 Apoio imediato: *+244 930 968 888*`
      );
    } catch (err) {
      console.error('❌ Erro ao processar documento:', err);
      await chat.sendMessage('Recebemos o ficheiro, mas houve um problema ao encaminhá-lo. Contacte-nos pelo *+244 930 968 888*.');
    } finally {
      chat.clearState();
    }
    return;
  }

  const userMessage = msg.body;
  console.log(`\n📥 Mensagem de [${userId}]: "${userMessage}"`);
  chat.sendStateTyping();

  logMemory('Before AI request');

  try {
    const now = Date.now();
    let sessionData = sessions.get(userId);

    if (!sessionData || (now - sessionData.lastActive > SESSION_TIMEOUT)) {
      sessionData = { history: [], lastActive: now, clientName: null };
      sessions.set(userId, sessionData);
    }
    sessionData.lastActive = now;

    // Prune do histórico — mantém apenas as últimas MAX_HISTORY_MESSAGES mensagens
    if (sessionData.history.length > MAX_HISTORY_MESSAGES) {
      const extra = sessionData.history.length - MAX_HISTORY_MESSAGES;
      const toRemove = extra % 2 === 0 ? extra : extra + 1;
      sessionData.history = sessionData.history.slice(toRemove);
      console.log(`✂️ Histórico prunado: ${sessionData.history.length} msgs restantes para [${userId}]`);
    }

    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const chatSession = model.startChat({ history: sessionData.history });

    const result = await retryWithBackoff(async () => {
      return await chatSession.sendMessage(userMessage);
    }, 3, 1000);

    let botResponse = result.response.text();
    sessionData.history = await chatSession.getHistory();

    logMemory('After AI request');

    // Detetar e processar lead
    const leadRegex = /###LEAD_DATA###(.*?)###/;
    const match = botResponse.match(leadRegex);
    if (match) {
      try {
        const leadData = JSON.parse(match[1].trim());
        leadData.telefone = contact.id.user;
        if (leadData.nome && !sessionData.clientName) {
          sessionData.clientName = leadData.nome;
        }
        salvarLead(leadData);
      } catch (e) {
        console.error('❌ Erro ao decodificar lead:', e);
      }
      botResponse = botResponse.replace(leadRegex, '').trim();
    }

    await chat.sendMessage(botResponse);
    console.log(`📤 Resposta: "${botResponse.split('\n')[0].substring(0, 80)}..."`);
    logMemory('After message sent');

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    await chat.sendMessage(
      'De momento não consigo processar o seu pedido. Por favor, contacte-nos:\n\n' +
      '📞 *+244 930 968 888*\n' +
      '📧 *atendimento@kixicredito.ao*\n' +
      '🌐 *www.kixicredito.ao*'
    );
  } finally {
    chat.clearState();
  }
});

// ============================================================
//  SERVIDOR EXPRESS HTTP
//  Inicia IMEDIATAMENTE — Render deteta o serviço como ativo
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  const m = process.memoryUsage();
  res.json({
    status: 'online',
    service: 'KixiCredito Kixi IA WhatsApp Bot',
    whatsapp: whatsappStatus,
    timestamp: new Date().toISOString()
  });
});

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

app.get('/qr', (req, res) => {
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
    
    <div id="loading-section" style="display: ${qrCodeUrl ? 'none' : 'block'};">
      <div class="spinner"></div>
      <p style="color:#8696a0; font-size:0.9rem;" id="loading-msg">A inicializar o cliente do WhatsApp... Por favor, aguarde.</p>
    </div>

    <div id="qr-section" style="display: ${qrCodeUrl && (whatsappStatus === 'qr_ready' || whatsappStatus === 'initializing') ? 'block' : 'none'};">
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

    <div id="success-section" style="display: ${whatsappStatus === 'ready' || whatsappStatus === 'authenticated' ? 'block' : 'none'};" class="success-box">
      <div class="success-icon">🚀</div>
      <h3 style="margin:0 0 0.5rem 0; color:#00a884; font-size:1.3rem;">Kixi IA Conetada com Sucesso!</h3>
      <p style="margin:0; font-size:0.92rem; color:#d1d7db;">O WhatsApp da KixiCrédito S.A. está online e pronto para atender os clientes.</p>
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

        if (data.whatsapp === 'ready' || data.whatsapp === 'authenticated') {
          loadingSec.style.display = 'none';
          qrSec.style.display = 'none';
          successSec.style.display = 'block';
        } else if (data.qrCodeAvailable && data.qrCodeUrl) {
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
          document.getElementById('loading-msg').innerText = 'Status: ' + data.whatsapp + '... Aguarde por favor.';
        }
      } catch (e) {
        console.error('Erro ao verificar status:', e);
      }
    }
    
    setInterval(checkStatus, 2500);
  </script>
</body>
</html>`);
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
// ============================================================
async function initWhatsAppClient() {
  console.log('[WHATSAPP] Starting client initialization...');
  console.log('[PUPPETEER] Starting browser...');
  logMemory('Before WhatsApp initialization');
  try {
    await client.initialize();
    logMemory('After WhatsApp initialization');
  } catch (error) {
    whatsappStatus = 'error';
    lastError = error.message || String(error);
    console.error('❌ [WHATSAPP] Erro na inicialização:', error);
    logMemory('On initialization error');
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
