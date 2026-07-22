import dotenv from 'dotenv';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import http from 'http';


// Carregar variáveis de ambiente
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_AQUI') {
  console.error('❌ ERRO: Por favor, configure a sua chave GEMINI_API_KEY no ficheiro .env');
  process.exit(1);
}

// Inicializar API do Gemini
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

// Carregar variáveis do chatbot a partir do .env (compatível com ASCII para a nuvem)
const VARS = {
  nomeEmpresa: process.env.NOME_EMPRESA || 'Elite 360',
  servicos: process.env.SERVICOS || process.env.SERVIÇOS || 'Chatbots inteligentes para WhatsApp Business',
  horario: process.env.HORARIO || process.env.HORÁRIO || 'Segunda a Sexta, horário comercial',
  contacto: process.env.CONTACTO || '+244 930 252 488',
  localizacao: process.env.LOCALIZACAO || process.env.LOCALIZAÇÃO || 'Luanda, Angola'
};

// Construir o Prompt Mestre dinâmico com as variáveis substituídas
const SYSTEM_INSTRUCTION = `
TU ÉS O ASSISTENTE VIRTUAL COMERCIAL DA ${VARS.nomeEmpresa.toUpperCase()}.
A tua especialidade é apresentar e vender as nossas soluções líderes de Automação de Processos e Inteligência Artificial, qualificando leads interessados.

O teu objetivo principal é:
1. Apresentar os benefícios das nossas soluções inteligentes (Chatbots, Agente de Chat Interno, Agente de Voz e Agente de IA de Qualidade) para o negócio do cliente.
2. Tirar dúvidas sobre preços, pacotes, métricas e funcionamento de forma imediata, transparente e consultiva.
3. Qualificar o lead obtendo: Nome, Nome da Empresa, Área de atuação, Número de colaboradores e Principal problema no atendimento ou processo atual.
4. Conduzir o cliente para o agendamento de uma demonstração gratuita ou para a compra de um pacote.

INFORMAÇÕES DA EMPRESA (ELITE 360):
- Nome da Empresa: ${VARS.nomeEmpresa}
- Quem somos: Somos líderes de mercado em Angola, com mais de 6 anos de experiência em Inteligência Artificial. Combinamos tecnologia de ponta (LLMs, GPT, NLP, pesquisa vetorial avançada) e plataformas low-code para criar soluções escaláveis.
- Escritório Físico / Localização: Talatona, Luanda, Edifício Prometeus, Angola.
- Contacto do Escritório / Geral: +244 928 872 248 / geral@elitee360.com (ou o configurado: ${VARS.contacto})
- Horário de funcionamento: ${VARS.horario}

MÉTRICAS DE SUCESSO GERAIS DA ELITE 360:
- Retorno sobre o Investimento (ROI) médio de ~800%.
- Taxa de automatização de até 80% nos processos.
- Incremento de 67% na captação de leads.
- Nível de satisfação do cliente de 4.5/5.

AS NOSSAS SOLUÇÕES CORPORATIVAS / SERVIÇOS DO PDF:
1. AGENTE DE CHAT INTERNO COM IA:
   - Um assistente virtual disponível 24/7 que conhece todas as políticas, processos e ferramentas da empresa, respondendo em segundos.
   - Reduz até 40% no volume de pedidos a Recursos Humanos (RH), IT e suporte interno, libertando as equipas.
   - Acelera o onboarding de novos colaboradores em até 60%.
   - Alcança uma taxa de 80% de resolução na primeira interação (FCR), sem necessidade de abrir tickets ou esperar dias.
2. AGENTE DE VOZ INTERNO COM IA:
   - Permite falar de forma natural em várias línguas, com respostas por voz em tempo real 24/7.
   - Ideal para turnos, operações globais ou colaboradores em campo.
   - Reduz o tempo de resposta sem comprometer a qualidade do suporte interno (RH, IT, formação, compliance).
3. AGENTE DE IA DE QUALIDADE INTERNO:
   - Configura automações para monitorizar conformidade, qualidade e segurança em todas as interações operacionais.
   - Aumenta a cobertura de auditorias de 3% para 100% em todas as comunicações operacionais, work permits e reports HSE (Segurança, Saúde e Ambiente) verificados, sem falhas nem amostragem.
   - Reduz significativamente custos de auditoria interna e compliance, eliminando revisões manuais.
   - Identifica desvios de procedimento, near-misses (quase-acidentes) recorrentes e oportunidades de otimização antes de virarem incidentes.
4. PLATAFORMA DE AUTOMATIZAÇÃO DE PROCESSOS INTERNOS E ANÁLISE DE DADOS:
   - Integrações robustas para fluxo contínuo de informação e análise inteligente de dados corporativos.

CASOS DE SUCESSO DA ELITE 360:
- GENERALI TRANQUILIDADE (desde 2019):
  - Implementação de Chat Virtual Assistants no Contact Center da Generali Portugal para gerir grandes volumes de contacto.
  - Resultados: 80% de automatização nas interações do Contact Center e 20% de redução no volume de chamadas telefónicas.
- BANCO BAI (Banco Angolano de Investimentos) (desde 2020):
  - Desenvolvimento do assistente "LUENA" (Locutor Único de Envio de Notificações Automáticas).
  - Funcionalidades: Resposta a FAQ, informações de produtos/serviços bancários, apoio em abertura de conta, registo no BAI Direto, transferência para agentes humanos (Live Chat).
  - Resultados: 85% dos clientes atendidos automaticamente, atendimento 24/7 em 3 canais integrados.

TOM DE COMUNICAÇÃO:
- Profissional, simpático, simples e muito dinâmico.
- Consultivo e útil (foca-se no que o cliente precisa saber).
- Focado em vendas, mas com diálogo natural e flexível (nunca forces perguntas de qualificação se o cliente pediu uma informação específica).
- Responde em Português de Portugal (e com termos angolanos apropriados se for o caso de Angola).

REGRAS DE OURO E PRIORIDADE DE ATENDIMENTO:
1. RESPONDE DIRETO AO QUE É PERGUNTADO: Se o cliente perguntar por preços, pacotes, métricas ou um serviço específico do PDF (ex: Agente de IA de Qualidade), deves fornecer IMEDIATAMENTE os detalhes desse serviço. NUNCA exijas que o cliente responda a perguntas de qualificação antes de lhe dares a informação que ele pediu.
2. FAZ PERGUNTAS DE FORMA GRADUAL: Só faz perguntas de qualificação se o fluxo da conversa permitir de forma natural. Faz sempre UMA pergunta de cada vez.
3. PAGAMENTOS E COMPROVATIVOS: Se o cliente decidir adquirir um dos pacotes de WhatsApp ou serviços, explica que o pagamento é feito por MCX Express para o número 947715166 e que ele deve enviar o comprovativo nesta conversa.

PACOTES DE VENDA WHATSAPP E PREÇOS:
* Pacote Bronze (Básico): Fluxo de atendimento simples para FAQs e triagem inicial de clientes. Preço: 25.000 Kz/mês.
* Pacote Prata (Intermédio - Mais Popular): Chatbot qualificador avançado com inteligência artificial para interagir e qualificar leads. Preço: 50.000 Kz/mês.
* Pacote Ouro (Avançado/Premium): Solução completa com IA integrada, agendamentos em tempo real, integração CRM e suporte prioritário. Preço: 95.000 Kz/mês.
Nota: Para soluções corporativas customizadas (como Agentes Internos de Chat/Voz/Qualidade do PDF), qualifica o cliente e propõe o agendamento de uma demonstração gratuita ou contacto direto com o consultor.

FLUXO DA CONVERSA:

1. SAUDAÇÃO INICIAL (Apenas na primeira mensagem):
Deves saudar o cliente exatamente com este formato:
"Olá 👋 Seja bem-vindo à ${VARS.nomeEmpresa}.

Nós ajudamos empresas a otimizar processos e a automatizar o atendimento com Inteligência Artificial de ponta.

Como posso ajudar hoje?

1️⃣ Saber mais sobre Soluções de IA (Agentes de Chat, Voz e Qualidade)
2️⃣ Ver pacotes de Chatbots de WhatsApp e Preços
3️⃣ Casos de Sucesso e Métricas da Elite 360
4️⃣ Quero automatizar a minha empresa / Agendar Demonstração
5️⃣ Falar com um Consultor / Contactos"

2. SE O CLIENTE SELECIONAR OU PERGUNTAR POR UM PACOTE ESPECÍFICO (Ex: Pacote Ouro):
Apresenta detalhadamente o pacote pedido. Exemplo para o Pacote Ouro:
"O nosso *Pacote Ouro (Premium)* é a nossa solução mais completa e robusta! 🌟
Inclui:
- Chatbot com Inteligência Artificial Avançada.
- Agendamento de reuniões/consultas em tempo real.
- Integração completa com CRM e sistemas da sua empresa.
- Suporte prioritário.
Valor: *95.000 Kz/mês*.

Gostaria de agendar uma demonstração gratuita do Pacote Ouro ou prefere avançar já para a ativação?"

3. SE O CLIENTE QUISER AVANÇAR PARA COMPRA:
"Excelente escolha! Para avançar com a ativação do pacote, o pagamento deve ser efetuado por *MCX Express* para o número: *947715166*.
Após realizar a transferência, por favor envie o comprovativo (print ou documento) diretamente nesta conversa para darmos início à configuração."

4. SE O CLIENTE QUISER UMA DEMONSTRAÇÃO OU AUTOMATIZAR A EMPRESA (Qualificação):
Tenta obter os seguintes dados, um de cada vez:
- Nome
- Nome da Empresa
- Área de atuação
- Número de colaboradores
- Principal problema que pretendem resolver ou serviço em que têm interesse (ex: Chatbot, Agente de Voz, Auditoria de Qualidade, etc.)
Exemplo: "Excelente! Para agendarmos a demonstração ideal para o seu negócio, qual é o seu nome e o nome da sua empresa?"

5. EXTRAÇÃO DE LEADS (MUITO IMPORTANTE - FORMATO TÉCNICO):
Sempre que conseguires recolher as informações necessárias e agendares (ou estiveres quase a agendar) a demonstração, deves incluir no FINAL da tua resposta uma linha especial contendo a tag de dados. Esta tag serve para que o sistema salve o lead automaticamente. O formato deve ser exatamente este (tudo numa linha):
###LEAD_DATA###{"nome": "Nome do Lead", "empresa": "Nome da Empresa", "area": "Área de atuação", "colaboradores": "Nº de Colab", "problema": "Problema relatado", "demonstracao": "Data/Hora sugerida se houver"}###`;

// Configuração da duração máxima da sessão inativa (30 minutos)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Limite máximo de mensagens no histórico para evitar sobrecarga e timeouts
const MAX_HISTORY_MESSAGES = 20;

// Contacto do gerente/comercial para encaminhamento de leads e comprovativos (+244 947715166)
const MANAGER_NUMBER = '244947715166@c.us';

// Memória de sessões de chat em memória
const sessions = new Map();

// Caminho do ficheiro leads.json
const LEADS_FILE = path.join(process.cwd(), 'leads.json');

// Função auxiliar para tentar novamente em caso de falha temporária com a API do Gemini
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`⚠️ Erro na API do Gemini. Tentativas restantes: ${retries}. Tentando novamente em ${delay}ms... Erro: ${error.message || error}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Função para salvar lead no JSON e notificar o gerente
function salvarLead(leadData) {
  try {
    let leads = [];
    if (fs.existsSync(LEADS_FILE)) {
      const content = fs.readFileSync(LEADS_FILE, 'utf-8');
      if (content.trim()) {
        leads = JSON.parse(content);
      }
    }

    // Evitar duplicados recentes
    const jaExiste = leads.some(l =>
      l.empresa.toLowerCase() === leadData.empresa.toLowerCase() &&
      l.nome.toLowerCase() === leadData.nome.toLowerCase()
    );

    if (!jaExiste) {
      leadData.dataRegisto = new Date().toISOString();
      leads.push(leadData);
      fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
      console.log(`\n🚨 [LEAD CAPTURADO] Lead da empresa "${leadData.empresa}" guardado com sucesso no ficheiro leads.json!`);

      // Enviar notificação com os dados completos para o gerente (+244 947715166)
      const managerMsg = `🚨 *NOVO LEAD QUALIFICADO CAPTURADO!* 🚨\n\n` +
        `👤 *Nome:* ${leadData.nome}\n` +
        `🏢 *Empresa:* ${leadData.empresa}\n` +
        `💼 *Área de Atuação:* ${leadData.area || 'Não informada'}\n` +
        `👥 *Colaboradores:* ${leadData.colaboradores || 'Não informados'}\n` +
        `❌ *Problema Principal:* ${leadData.problema || 'Não informado'}\n` +
        `📅 *Sugestão de Demo:* ${leadData.demonstracao || 'Não agendada'}\n` +
        `📱 *Contacto:* wa.me/${leadData.telefone || ''}`;

      client.sendMessage(MANAGER_NUMBER, managerMsg)
        .then(() => console.log(`✉️ Notificação de lead enviada para o gerente.`))
        .catch(err => console.error(`❌ Erro ao notificar o gerente:`, err));
    }
  } catch (error) {
    console.error('❌ Erro ao salvar o lead no ficheiro:', error);
  }
}

// Estado e Servidor Web HTTP para a nuvem
let latestQrUrl = null;
let botStatus = '⏳ A inicializar...';

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/ping' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="refresh" content="10">
      <title>Elite 360 Chatbot - Status</title>

      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 40px 20px; }
        .card { background: #1e293b; max-width: 480px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; font-size: 24px; margin-bottom: 8px; }
        .status { font-weight: bold; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 15px 0; }
        .online { background: #059669; color: #fff; }
        .waiting { background: #d97706; color: #fff; }
        img { margin-top: 15px; border-radius: 12px; border: 4px solid #38bdf8; }
        p { color: #94a3b8; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🤖 Elite 360 Chatbot</h1>
        <p>Serviço Comercial WhatsApp</p>
        <div class="status ${botStatus.includes('ONLINE') ? 'online' : 'waiting'}">${botStatus}</div>
        ${latestQrUrl && !botStatus.includes('ONLINE') ? `
          <p>Digitalize o código QR com o seu WhatsApp:</p>
          <img src="${latestQrUrl}" width="260" height="260" alt="QR Code WhatsApp" />
        ` : ''}
        ${botStatus.includes('ONLINE') ? '<p>✅ O chatbot está ativo e a responder a mensagens 24h!</p>' : ''}
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor Web de Status a rodar na porta ${PORT}`);
});

// Inicializar o cliente do WhatsApp
const sessionPath = process.env.SESSION_PATH || './';
console.log(`🔄 A inicializar o cliente do WhatsApp (Caminho da sessão: ${sessionPath})...`);
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: sessionPath }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018942288-alpha.html',
  },
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  botStatus = '📱 A aguardar leitura do QR Code...';
  latestQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log('\n📱 [LEITURA DE QR CODE] Digitalize o código QR abaixo com o seu WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log(`\n🔗 Link alternativo no navegador: ${latestQrUrl}\n`);
});

client.on('ready', () => {
  botStatus = '🚀 ONLINE';
  latestQrUrl = null;
  console.log('\n🚀 [CHATBOT ONLINE] Elite 360 Chatbot ligado com sucesso e pronto para responder!');
});


client.on('message', async (msg) => {
  // Ignorar mensagens de grupos, broadcast ou mensagens enviadas pelo próprio bot/número
  if (msg.fromMe || msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') return;

  // Ignorar mensagens acumuladas antigas (com mais de 2 minutos) para não responder a todas de uma vez quando o bot liga
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds - msg.timestamp > 120) {
    console.log(`⏳ Mensagem antiga ignorada de [${msg.from}]: (mais de 2 minutos atrás)`);
    return;
  }

  let chat = null;
  try {
    chat = await msg.getChat();
  } catch (err) {
    console.warn(`⚠️ Não foi possível obter o chat para ${msg.from}:`, err.message || err);
  }

  let contact = null;
  try {
    contact = await msg.getContact();
  } catch (err) {
    console.warn(`⚠️ Não foi possível obter o contacto para ${msg.from}:`, err.message || err);
  }

  const userId = msg.from;
  const userMessage = msg.body;

  // Se a mensagem for um sticker, nós ignoramos para não processar como comprovativo
  if (msg.hasMedia && msg.type === 'sticker') {
    console.log(`🚫 Sticker ignorado de [${userId}]. Não será tratado como comprovativo.`);
    return;
  }

  // Se a mensagem contiver média (apenas imagens ou documentos serão aceites como comprovativo)
  if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
    console.log(`📸 Mídia recebida de [${userId}] (Tipo: ${msg.type}). A tratar como comprovativo...`);
    try { await chat?.sendStateTyping(); } catch (e) {}
    try {
      // Tentar obter dados da conversa ativa para dar contexto ao gerente
      const sessionData = sessions.get(userId);
      const clientName = (sessionData && sessionData.clientName)
        ? sessionData.clientName
        : (contact?.pushname || contact?.name || 'Cliente');
      
      const notifyMsg = `📄 *NOVO COMPROVATIVO DE PAGAMENTO RECEBIDO!* 📄\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📱 *Contacto:* wa.me/${contact?.id?.user || userId.split('@')[0]}\n\n` +
        `O comprovativo enviado segue em anexo abaixo:`;

      await client.sendMessage(MANAGER_NUMBER, notifyMsg);
      // Encaminhar o arquivo de comprovativo recebido para o gerente
      await msg.forward(MANAGER_NUMBER);
      console.log(`➡️ Comprovativo encaminhado com sucesso para o gerente.`);

      // Confirmar a receção com o cliente
      await client.sendMessage(userId, `Muito obrigado pelo envio do comprovativo! 📈\n\nA nossa equipa administrativa já recebeu o recibo e vai iniciar a configuração do seu chatbot. Entraremos em contacto consigo muito em breve para os próximos passos.`);
    } catch (err) {
      console.error('❌ Erro ao processar ou encaminhar comprovativo de média:', err);
      await client.sendMessage(userId, 'Recebemos o seu arquivo, mas ocorreu um pequeno problema ao encaminhá-lo para a nossa equipa administrativa. Por favor, envie novamente ou contacte diretamente o suporte comercial no número +244 947715166.');
    } finally {
      try { await chat?.clearState(); } catch (e) {}
    }
    return; // Não processar comprovativos como texto no Gemini
  }

  console.log(`\n📥 Mensagem recebida de [${userId}]: "${userMessage}"`);

  // Mostrar indicador de "escrevendo..."
  try { await chat?.sendStateTyping(); } catch (e) {}

  try {
    const now = Date.now();
    let sessionData = sessions.get(userId);

    // Se a sessão não existir ou tiver expirado por inatividade, inicia uma nova
    if (!sessionData || (now - sessionData.lastActive > SESSION_TIMEOUT)) {
      sessionData = {
        history: [],
        lastActive: now
      };
      sessions.set(userId, sessionData);
      console.log(`\n🧹 Sessão ${!sessionData ? 'criada' : 'reiniciada por inatividade'} para o utilizador: ${userId}`);
    }

    // Atualizar o timestamp de atividade
    sessionData.lastActive = now;

    // Prunar o histórico se exceder o limite (mantendo a consistência de pares user/model)
    if (sessionData.history.length > MAX_HISTORY_MESSAGES) {
      const extra = sessionData.history.length - MAX_HISTORY_MESSAGES;
      const toRemove = extra % 2 === 0 ? extra : extra + 1;
      sessionData.history = sessionData.history.slice(toRemove);
      console.log(`✂️ Histórico prunado para ${userId}. Mensagens restantes: ${sessionData.history.length}`);
    }

    // Obter modelo e criar sessão de chat dinâmica (com fallback automático se necessário)
    let chatSession;
    try {
      const model = ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        systemInstruction: SYSTEM_INSTRUCTION
      });
      chatSession = model.startChat({ history: sessionData.history });
    } catch (e) {
      console.warn('⚠️ Falha ao carregar modelo primário, a usar gemini-2.5-flash...');
      const fallbackModel = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION
      });
      chatSession = fallbackModel.startChat({ history: sessionData.history });
    }

    // Enviar mensagem do utilizador para o Gemini com retentativas automáticas
    const result = await retryWithBackoff(async () => {
      try {
        return await chatSession.sendMessage(userMessage);
      } catch (err) {
        console.warn(`⚠️ Tentando com modelo alternativo (gemini-2.5-flash)...`);
        const fallbackModel = ai.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: SYSTEM_INSTRUCTION
        });
        const fbSession = fallbackModel.startChat({ history: sessionData.history });
        return await fbSession.sendMessage(userMessage);
      }
    }, 3, 1000);

    let botResponse = result.response.text();

    // Guardar o histórico atualizado em caso de sucesso (evita corrupção)
    sessionData.history = await chatSession.getHistory();

    // Detetar e extrair a tag ###LEAD_DATA### se presente
    const leadRegex = /###LEAD_DATA###(.*?)###/;
    const match = botResponse.match(leadRegex);

    if (match) {
      const jsonStr = match[1].trim();
      try {
        const leadData = JSON.parse(jsonStr);
        leadData.telefone = contact?.id?.user || userId.split('@')[0]; // Adicionar contacto telefónico real
        
        // Guardar o nome do cliente qualificado na sessão ativa para uso posterior
        if (leadData.nome) {
          sessionData.clientName = leadData.nome;
        }

        salvarLead(leadData);
      } catch (e) {
        console.error('❌ Erro ao decodificar JSON do lead:', e);
      }
      // Limpar a tag técnica da resposta final que vai para o cliente
      botResponse = botResponse.replace(leadRegex, '').trim();
    }

    // Responder ao utilizador no WhatsApp
    await client.sendMessage(userId, botResponse);
    console.log(`📤 Resposta enviada: "${botResponse.split('\n')[0]}..."`);

  } catch (error) {
    console.error('❌ Erro ao processar mensagem com o Gemini:', error);
    // Guia o cliente com opções amigáveis em vez de mensagem de erro técnica e fria
    await client.sendMessage(userId, 'De momento não consegui processar a sua questão. Se tiver alguma dúvida específica ou necessitar de suporte imediato, pode entrar em contacto direto com o nosso consultor comercial no número +244 947715166 ou escolher uma destas opções:\n\n1️⃣ Saber mais sobre Soluções de IA (Agentes de Chat, Voz e Qualidade)\n2️⃣ Ver pacotes de Chatbots de WhatsApp e Preços\n3️⃣ Casos de Sucesso e Métricas da Elite 360\n4️⃣ Quero automatizar a minha empresa / Agendar Demonstração\n5️⃣ Falar com um Consultor / Contactos');
  } finally {
    try { await chat?.clearState(); } catch (e) {}
  }
});

// Inicializar o cliente
client.initialize();

// Tratar desconexão do WhatsApp
client.on('disconnected', (reason) => {
  console.error('❌ [CHATBOT DESCONECTADO] O WhatsApp desconectou:', reason);
  process.exit(1); // Sai para que o start.bat o reinicie automaticamente
});

// Tratar erros globais para evitar que o processo vá abaixo inesperadamente
process.on('uncaughtException', (error) => {
  console.error('🔥 [ERRO CRÍTICO CRASH] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [REJEIÇÃO NÃO TRATADA] Unhandled Rejection at:', promise, 'reason:', reason);
});

