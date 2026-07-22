# Chatbot de WhatsApp Comercial - Elite 360

Este projeto conecta o atendimento de WhatsApp da **Elite 360** à inteligência artificial do **Google Gemini** para automatizar a venda de chatbots, qualificação de leads e marcação de demonstrações de forma 100% dinâmica.

---

## 🛠️ Requisitos Prévios

Antes de começar, certifique-se de que tem instalado no seu computador:
1. **Node.js** (versão 18 ou superior): [Descarregar aqui](https://nodejs.org/)
2. Uma chave de API do **Google Gemini** (Grátis):
   - Aceda ao [Google AI Studio](https://aistudio.google.com/)
   - Inicie sessão com a sua conta Google
   - Clique em **"Get API key"** e copie a sua chave.

---

## 🚀 Como Configurar e Executar

Siga estes passos simples para colocar o chatbot a funcionar no seu WhatsApp:

### Passo 1: Instalar as Dependências
Abra o seu terminal/linha de comandos na pasta deste projeto e execute:
```bash
npm install
```

### Passo 2: Configurar a Chave da API
1. Abra o ficheiro chamado `.env` no editor de texto.
2. Substitua `SUA_CHAVE_API_AQUI` pela chave que copiou do Google AI Studio.
3. Se desejar, ajuste as outras variáveis no ficheiro `.env` para personalizar as respostas do seu bot.

### Passo 3: Iniciar o Chatbot
No terminal, execute o seguinte comando:
```bash
npm start
```

### Passo 4: Ler o Código QR
1. Quando o terminal exibir um **Código QR**, abra o WhatsApp no seu telemóvel.
2. Aceda às definições e selecione **"Dispositivos associados"** -> **"Associar um dispositivo"**.
3. Aponte a câmara do telemóvel para o terminal e leia o código QR.

---

## 💡 Como Funciona a Qualificação de Leads?

* O bot guiará o utilizador de forma inteligente pelas perguntas do fluxo comercial (Nome, Empresa, Setor, Colaboradores e Dores).
* Assim que a conversa for concluída e uma demonstração for proposta ou agendada, os dados do lead serão extraídos de forma invisível da conversa e gravados automaticamente no ficheiro local chamado `leads.json`.

---

## 📁 Variáveis Customizáveis (`.env`)

Pode alterar as seguintes variáveis no ficheiro `.env` a qualquer momento para atualizar as informações que o bot usa nas conversas:
* `NOME_EMPRESA`: O nome comercial da sua empresa.
* `SERVIÇOS`: Descrição dos serviços e funcionalidades dos chatbots.
* `HORÁRIO`: Horário de atendimento comercial.
* `CONTACTO`: Telefone ou email para onde encaminhar leads quando necessário.
* `LOCALIZAÇÃO`: Área geográfica de atuação.
