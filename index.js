import dotenv from 'dotenv';
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
//  BASE DE CONHECIMENTO - KIXICRÉDITO (extraída dos PDFs)
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
Montante Mínimo: Kz 5.000,00 (Cinco mil Kwanzas)
Montante Máximo: Kz 500.000,00 (Quinhentos mil Kwanzas)
Prazo máximo: 12 meses
Periodicidade de pagamento: Mensal
Regime de prestações: Constantes
Taxa de Juro Nominal Anual (TAN): 55,2%
Taxa mensal: 4,6% a.m.
Garantias exigidas: Solidária, avalista e penhor
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Não renovação automática para reempréstimo
Condições de utilização: Depósito em conta bancária do cliente
Validade da FTI: 90 dias

---

PRODUTO 2: KixiNegócio
Tipo: Crédito Empresarial - Empreendedorismo
Público-alvo: Empreendedores e pequenos negócios
Montante Mínimo: Kz 500.001,00 (Quinhentos e um mil Kwanzas)
Montante Máximo: Kz 2.500.000,00 (Dois Milhões e quinhentos mil Kwanzas)
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal
Regime de prestações: Constantes
Taxa de Juro Nominal Anual (TAN): 55,2%
Taxa mensal: 4,6% a.m.
Garantias exigidas: Avalista, hipoteca, penhor e caução
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Sem elegibilidade para novo empréstimo
Condições de utilização: Depósito em conta bancária do cliente
Validade da FTI: 90 dias

---

PRODUTO 3: KixiAgronegócio
Tipo: Crédito para Agricultura e Pecuária
Público-alvo: Nano, micro e pequenos agricultores
Montante Mínimo: Kz 50.000,00 (Cinquenta mil Kwanzas)
Montante Máximo: Kz 2.500.000,00 (Dois Milhões e quinhentos mil Kwanzas)
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal ou Quadrimestral
Regime de prestações: Constantes
Taxa de Juro Nominal Anual (TAN): 55,2%
Taxa mensal: 4,6% a.m.
Garantias exigidas: Avalista, hipoteca, penhor e caução
Reembolso antecipado: 4% do capital (aviso prévio mínimo de 15 dias)
Encargos adicionais: Comissão de processamento (6,5%) + Imprevistos (2%)
Taxa de juro de mora: 5% sobre o valor da prestação em mora
Falta de pagamento: Sem elegibilidade para novo empréstimo
Condições de utilização: Depósito em conta bancária do cliente
Periodicidade especial: Opção de pagamento quadrimestral para ciclos agrícolas
Validade da FTI: 90 dias

---

PRODUTO 4: KixiValor
Tipo: Adiantamento de Salário - Crédito a Médio Longo Prazo
Público-alvo: Trabalhadores assalariados (colaboradores de empresas parceiras)
Montante Mínimo: Kz 75.000,00 (Setenta e cinco mil Kwanzas)
Montante Máximo: Kz 2.500.000,00 (Dois Milhões e quinhentos mil Kwanzas)
Prazo máximo: 18 meses
Periodicidade de pagamento: Mensal
Regime de prestações: Constantes (Capital + Juros)
Taxa de Juro Nominal Anual (TAN): 61,2%
Garantias: Não aplicável (garantia implícita pelo vínculo laboral)
Reembolso antecipado: 3% do valor em dívida
Taxa de juro de mora: 50% sobre a prestação mensal convencionada
Multa diária por incumprimento: 1% sobre o valor vencido
Consequências de incumprimento: Comunicação à Central de Informação e Risco de Crédito do BNA
Condições de utilização: Depósito em conta bancária do cliente
Validade da FTI: 90 dias

---

PARCERIAS KIXICRÉDITO:
Destinatários: Entidades empregadoras que queiram oferecer crédito aos seus colaboradores
Requisitos para parceria:
- Protocolo celebrado com a entidade empregadora
- Documento de identificação válido dos colaboradores
- Extracto bancário

Processo de Adesão:
1º Passo: Celebração do protocolo de parceria entre a entidade empregadora e a KixiCrédito
2º Passo: O colaborador apresenta o pedido de crédito junto da KixiCrédito
3º Passo: Entrega da documentação necessária para análise do pedido
4º Passo: Análise e decisão sobre o pedido de crédito
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
const MAX_HISTORY_MESSAGES = 20;
const MANAGER_NUMBER = process.env.MANAGER_NUMBER || '244930968888@c.us';
const LEADS_FILE = path.join(process.cwd(), 'kixi_leads.json');
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
//  CLIENTE WHATSAPP
// ============================================================
console.log('🔄 A inicializar a Kixi IA...');
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'kixi-ia' }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
  console.log('\n📱 [QR CODE] Digitalize com o WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log(`\n🔗 Link alternativo:\nhttps://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n`);
});

client.on('ready', () => {
  console.log('\n🚀 [KIXI IA ONLINE] Assistente virtual da KixiCrédito pronta!');
  console.log('💚 KixiCrédito S.A. | +244 930 968 888 | atendimento@kixicredito.ao');
});

// ============================================================
//  PROCESSAMENTO DE MENSAGENS
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

  try {
    const now = Date.now();
    let sessionData = sessions.get(userId);

    if (!sessionData || (now - sessionData.lastActive > SESSION_TIMEOUT)) {
      sessionData = { history: [], lastActive: now, clientName: null };
      sessions.set(userId, sessionData);
    }
    sessionData.lastActive = now;

    if (sessionData.history.length > MAX_HISTORY_MESSAGES) {
      const extra = sessionData.history.length - MAX_HISTORY_MESSAGES;
      const toRemove = extra % 2 === 0 ? extra : extra + 1;
      sessionData.history = sessionData.history.slice(toRemove);
    }

    const model = ai.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const chatSession = model.startChat({ history: sessionData.history });

    const result = await retryWithBackoff(async () => {
      return await chatSession.sendMessage(userMessage);
    }, 3, 1000);

    let botResponse = result.response.text();
    sessionData.history = await chatSession.getHistory();

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

// Tratar desconexão do WhatsApp
client.on('disconnected', (reason) => {
  console.error('❌ [CHATBOT DESCONECTADO] O WhatsApp desconectou:', reason);
  process.exit(1);
});

// Tratar erros globais
process.on('uncaughtException', (error) => {
  console.error('🔥 [ERRO CRÍTICO CRASH] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [REJEIÇÃO NÃO TRATADA] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Inicializar cliente
client.initialize();
