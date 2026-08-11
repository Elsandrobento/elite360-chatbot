# Assistente Virtual WhatsApp - KixiCrédito S.A. (Kixi IA)

Este projeto conecta o atendimento de WhatsApp da **KixiCrédito S.A.** à inteligência artificial do **Google Gemini** para prestar informações sobre produtos de microcrédito (KixiFácil, KixiNegócio, KixiAgronegócio, KixiValor), qualificar leads e agendar parcerias.

---

## 🛠️ Requisitos Prévios

1. **Node.js** (versão 18 ou superior): [Descarregar aqui](https://nodejs.org/)
2. Chave de API do **Google Gemini**: [Google AI Studio](https://aistudio.google.com/)

---

## 🚀 Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente (`.env`)
Certifique-se de definir a variável `GEMINI_API_KEY` no ficheiro `.env`.

### 3. Iniciar a aplicação
```bash
npm start
```

### 4. Ler o Código QR
- Aceda a `http://localhost:3000/qr` no navegador ou leia o Código QR no terminal.
- Abra o WhatsApp no telemóvel -> **Dispositivos associados** -> **Associar um dispositivo**.
- Aponte a câmara e digitalize o código.

---

## 🔍 Endpoints de Saúde e Estado

- `GET /`: Estado básico da aplicação
- `GET /health`: Diagnóstico detalhado de saúde e consumo de memória RAM (RSS / Heap)
- `GET /qr`: Interface Web para leitura do QR Code
