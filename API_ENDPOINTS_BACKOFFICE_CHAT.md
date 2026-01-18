# 💬 Documentação de Chat em Tempo Real - Backoffice

Documentação completa para integração do chat em tempo real no frontend do backoffice.

**Base URL WebSocket:** `ws://seu-servidor.com/chat` ou `wss://seu-servidor.com/chat` (produção)  
**Base URL REST:** `/api/backoffice`

**Headers obrigatórios (REST):**
- `Client-Type: backoffice`
- `Authorization: Bearer {token}`
- `Workspace-Id: {workspace_uuid}`

---

## 📋 Visão Geral

O sistema de chat permite comunicação em tempo real entre usuários do backoffice e influenciadores através de:

1. **WebSocket (Socket.IO)** - Para mensagens em tempo real
2. **REST API** - Para histórico de mensagens e envio alternativo

### Fluxo de Funcionamento

```
Backoffice (WebSocket) ←→ Servidor ←→ Influenciador (App Mobile)
         ↓                                    ↓
    REST API                            REST API
    (Histórico)                        (Histórico)
```

---

## 🔌 Conexão WebSocket

### 1. Instalar Dependência

```bash
npm install socket.io-client
# ou
yarn add socket.io-client
```

### 2. Conectar ao Servidor

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('https://seu-servidor.com/chat', {
  auth: {
    token: 'seu-jwt-token-aqui'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 20000,
});
```

**Configurações importantes:**
- `transports`: Permite fallback para polling se WebSocket falhar
- `reconnection`: Reconexão automática em caso de desconexão
- `reconnectionAttempts`: Número máximo de tentativas de reconexão

### 3. Autenticação

O token JWT pode ser enviado de três formas:

**Opção 1: Via `auth.token` (Recomendado)**
```typescript
const socket = io('https://seu-servidor.com/chat', {
  auth: { token: jwtToken }
});
```

**Opção 2: Via Query String**
```typescript
const socket = io(`https://seu-servidor.com/chat?token=${jwtToken}`);
```

**Opção 3: Via Header Authorization**
```typescript
const socket = io('https://seu-servidor.com/chat', {
  extraHeaders: {
    Authorization: `Bearer ${jwtToken}`
  }
});
```

### 4. Eventos de Conexão

```typescript
// Conexão estabelecida
socket.on('connect', () => {
  console.log('✅ Conectado ao servidor de chat');
  console.log('Socket ID:', socket.id);
});

// Desconexão
socket.on('disconnect', (reason: string) => {
  console.log('❌ Desconectado:', reason);
  
  if (reason === 'io server disconnect') {
    // Servidor desconectou, reconectar manualmente
    socket.connect();
  }
});

// Erro de conexão
socket.on('connect_error', (error: Error) => {
  console.error('❌ Erro de conexão:', error.message);
  
  if (error.message.includes('token')) {
    // Token inválido, renovar token
    reconnectWithNewToken();
  }
});

// Reconexão bem-sucedida
socket.on('reconnect', (attemptNumber: number) => {
  console.log(`✅ Reconectado após ${attemptNumber} tentativas`);
});

// Tentativa de reconexão
socket.on('reconnect_attempt', (attemptNumber: number) => {
  console.log(`🔄 Tentativa de reconexão ${attemptNumber}...`);
});

// Falha na reconexão
socket.on('reconnect_failed', () => {
  console.error('❌ Falha ao reconectar. Verifique sua conexão.');
});
```

---

## 🚪 Gerenciamento de Salas

### Entrar na Sala de Chat

Antes de enviar ou receber mensagens, você precisa entrar na sala específica da conversa com o influenciador.

**Importante:** Você precisa do `campaignUserId` (ID do registro `campaign_users`), não apenas do `influencerId` (user_id).

```typescript
socket.emit('join_room', {
  campaignId: '550e8400-e29b-41d4-a716-446655440000', // UUID público da campanha
  campaignUserId: 123 // ID do registro campaign_users
});
```

**Escutar confirmação:**
```typescript
socket.on('joined_room', (data: {
  roomId: string;
  campaignId: string;
  campaignUserId: number;
}) => {
  console.log('✅ Entrou na sala:', data);
  // {
  //   roomId: 'campaign:550e8400-e29b-41d4-a716-446655440000:user:123',
  //   campaignId: '550e8400-e29b-41d4-a716-446655440000',
  //   campaignUserId: 123
  // }
});
```

**Escutar erros:**
```typescript
socket.on('error', (error: { message: string }) => {
  console.error('❌ Erro:', error.message);
  
  if (error.message.includes('não autenticado')) {
    // Reconectar com novo token
  } else if (error.message.includes('não encontrada')) {
    // Campanha ou influenciador não encontrado
  } else if (error.message.includes('Acesso negado')) {
    // Sem permissão para acessar esta conversa
  }
});
```

### Sair da Sala

```typescript
socket.emit('leave_room', {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  campaignUserId: 123
});

socket.on('left_room', (data: { roomId: string }) => {
  console.log('✅ Saiu da sala:', data.roomId);
});
```

---

## 📥 Como Obter o `campaignUserId`

O `campaignUserId` é o ID interno do registro na tabela `campaign_users`. Existem duas formas de obtê-lo:

### Opção 1: Via Lista de Usuários da Campanha

```typescript
// GET /api/backoffice/campaigns/:campaignId/users
async function getCampaignUserId(
  campaignId: string,
  influencerId: number,
  token: string,
  workspaceId: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://seu-servidor.com/api/backoffice/campaigns/${campaignId}/users`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Type': 'backoffice',
          'Workspace-Id': workspaceId
        }
      }
    );

    const data = await response.json();
    
    // Encontrar o usuário pelo influencerId
    const user = data.data.find((u: any) => u.user_id === influencerId);
    
    if (user) {
      return user.id; // Este é o campaignUserId
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar campaignUserId:', error);
    return null;
  }
}
```

**Estrutura da resposta:**
```json
{
  "data": [
    {
      "id": 123,  // ← Este é o campaignUserId
      "user_id": 456,  // ← Este é o influencerId (user_id)
      "name": "Nome do Influenciador",
      "email": "influencer@example.com",
      "status": "active",
      ...
    }
  ]
}
```

### Opção 2: Via Endpoint de Mensagens (Inferir)

Se você já tem acesso às mensagens, pode inferir o `campaignUserId` a partir da estrutura da sala ou usar a REST API que aceita `influencerId` diretamente.

---

## 💬 Enviar Mensagens

### Via WebSocket (Tempo Real)

```typescript
socket.emit('send_message', {
  campaignId: '550e8400-e29b-41d4-a716-446655440000',
  campaignUserId: 123,
  message: 'Olá! Como está o progresso da campanha?',
  attachments: [] // Opcional: array de URLs de arquivos
});
```

**Confirmação de envio:**
```typescript
socket.on('message_sent', (data: { id: string }) => {
  console.log('✅ Mensagem enviada com ID:', data.id);
  // Atualizar UI com mensagem otimista
});
```

**Erro ao enviar:**
```typescript
socket.on('error', (error: { message: string }) => {
  console.error('❌ Erro ao enviar mensagem:', error.message);
  // Mostrar erro ao usuário
});
```

### Via REST API (Alternativa)

```typescript
// POST /api/backoffice/campaigns/:campaignId/influencers/:influencerId/messages
async function sendMessageViaREST(
  campaignId: string,
  influencerId: number, // Note: usa influencerId, não campaignUserId
  message: string,
  attachments: string[] = [],
  token: string,
  workspaceId: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://seu-servidor.com/api/backoffice/campaigns/${campaignId}/influencers/${influencerId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Client-Type': 'backoffice',
          'Workspace-Id': workspaceId
        },
        body: JSON.stringify({
          message,
          attachments
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}
```

**Resposta:**
```json
{
  "data": {
    "id": "uuid-da-mensagem",
    "campaign_id": "uuid-da-campanha",
    "influencer_id": "456",
    "sender_id": "123",
    "sender_name": "Nome do Backoffice",
    "sender_avatar": "https://example.com/avatar.jpg",
    "message": "Olá! Como está o progresso da campanha?",
    "attachments": [],
    "read_at": null,
    "created_at": "2026-01-18T15:00:00.000Z"
  }
}
```

---

## 📥 Receber Mensagens

### Escutar Novas Mensagens (WebSocket)

```typescript
socket.on('new_message', (message: Message) => {
  console.log('📨 Nova mensagem recebida:', message);
  
  // {
  //   id: '550e8400-e29b-41d4-a716-446655440000',
  //   campaign_id: '550e8400-e29b-41d4-a716-446655440000',
  //   campaign_user_id: 123,
  //   sender_id: '456',
  //   sender_name: 'Nome do Influenciador',
  //   sender_avatar: 'https://example.com/avatar.jpg',
  //   message: 'Olá! Está tudo certo!',
  //   attachments: [],
  //   read_at: null,
  //   created_at: '2026-01-18T15:30:00.000Z'
  // }
  
  // Adicionar mensagem à lista
  addMessageToChat(message);
  
  // Marcar como lida se necessário
  if (message.sender_id !== currentUserId) {
    markMessageAsRead(message.id);
  }
});
```

### Buscar Histórico de Mensagens (REST API)

```typescript
// GET /api/backoffice/campaigns/:campaignId/influencers/:influencerId/messages
async function loadMessageHistory(
  campaignId: string,
  influencerId: number,
  token: string,
  workspaceId: string
): Promise<Message[]> {
  try {
    const response = await fetch(
      `https://seu-servidor.com/api/backoffice/campaigns/${campaignId}/influencers/${influencerId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Type': 'backoffice',
          'Workspace-Id': workspaceId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Mensagens vêm ordenadas por created_at DESC (mais recentes primeiro)
    // Reverter para ordem cronológica se necessário
    return data.data.reverse();
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    throw error;
  }
}
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "campaign_id": "uuid",
      "influencer_id": "456",
      "sender_id": "123",
      "sender_name": "Nome do Backoffice",
      "sender_avatar": "url",
      "message": "Mensagem mais recente",
      "attachments": [],
      "read_at": "2026-01-18T15:35:00.000Z",
      "created_at": "2026-01-18T15:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "campaign_id": "uuid",
      "influencer_id": "456",
      "sender_id": "456",
      "sender_name": "Nome do Influenciador",
      "sender_avatar": null,
      "message": "Mensagem anterior",
      "attachments": [],
      "read_at": null,
      "created_at": "2026-01-18T15:25:00.000Z"
    }
  ]
}
```

---

## ✅ Marcar Mensagem como Lida

### Via WebSocket

```typescript
socket.emit('mark_as_read', {
  messageId: '550e8400-e29b-41d4-a716-446655440000'
});

socket.on('message_read', (data: { messageId: string }) => {
  console.log('✅ Mensagem marcada como lida:', data.messageId);
  // Atualizar UI
});
```

---

## 🎨 Implementação Completa (React/TypeScript)

### Hook Customizado para Chat

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  campaign_id: string;
  campaign_user_id?: number;
  influencer_id?: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  message: string;
  attachments: string[];
  read_at: string | null;
  created_at: string;
}

interface UseChatOptions {
  campaignId: string;
  influencerId: number;
  campaignUserId: number;
  token: string;
  workspaceId: string;
  apiBaseUrl: string;
}

export function useChat({
  campaignId,
  influencerId,
  campaignUserId,
  token,
  workspaceId,
  apiBaseUrl,
}: UseChatOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar histórico inicial
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/api/backoffice/campaigns/${campaignId}/influencers/${influencerId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Client-Type': 'backoffice',
            'Workspace-Id': workspaceId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages(data.data.reverse()); // Reverter para ordem cronológica
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      setError('Erro ao carregar histórico de mensagens');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, influencerId, token, workspaceId, apiBaseUrl]);

  // Conectar WebSocket
  useEffect(() => {
    if (!token || !campaignId || !campaignUserId) {
      return;
    }

    const wsUrl = apiBaseUrl.replace(/^https?:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    const newSocket = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Eventos de conexão
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao chat');
      setIsConnected(true);
      setError(null);

      // Entrar na sala
      newSocket.emit('join_room', {
        campaignId,
        campaignUserId,
      });
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('❌ Desconectado:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('❌ Erro de conexão:', err);
      setError('Erro ao conectar ao chat. Tentando reconectar...');
    });

    // Confirmar entrada na sala
    newSocket.on('joined_room', (data: any) => {
      console.log('✅ Entrou na sala:', data);
    });

    // Receber novas mensagens
    newSocket.on('new_message', (message: Message) => {
      console.log('📨 Nova mensagem:', message);
      setMessages((prev) => {
        // Evitar duplicatas
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Marcar como lida se não foi enviada por mim
      if (message.sender_id !== currentUserId) {
        newSocket.emit('mark_as_read', { messageId: message.id });
      }
    });

    // Confirmação de envio
    newSocket.on('message_sent', (data: { id: string }) => {
      console.log('✅ Mensagem enviada:', data.id);
    });

    // Erros
    newSocket.on('error', (err: { message: string }) => {
      console.error('❌ Erro:', err.message);
      setError(err.message);
    });

    setSocket(newSocket);

    // Carregar histórico
    loadHistory();

    // Cleanup
    return () => {
      newSocket.emit('leave_room', { campaignId, campaignUserId });
      newSocket.disconnect();
    };
  }, [token, campaignId, campaignUserId, loadHistory]);

  // Enviar mensagem
  const sendMessage = useCallback(
    (text: string, attachments: string[] = []) => {
      if (!socket || !isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      if (!text.trim()) {
        return;
      }

      socket.emit('send_message', {
        campaignId,
        campaignUserId,
        message: text.trim(),
        attachments,
      });
    },
    [socket, isConnected, campaignId, campaignUserId]
  );

  // Marcar como lida
  const markAsRead = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.emit('mark_as_read', { messageId });
      }
    },
    [socket, isConnected]
  );

  return {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    reloadHistory: loadHistory,
  };
}
```

### Componente de Chat

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';

interface ChatComponentProps {
  campaignId: string;
  influencerId: number;
  campaignUserId: number;
  token: string;
  workspaceId: string;
  apiBaseUrl: string;
  currentUserId: number;
}

export function ChatComponent({
  campaignId,
  influencerId,
  campaignUserId,
  token,
  workspaceId,
  apiBaseUrl,
  currentUserId,
}: ChatComponentProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isConnected, isLoading, error, sendMessage } = useChat({
    campaignId,
    influencerId,
    campaignUserId,
    token,
    workspaceId,
    apiBaseUrl,
  });

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && isConnected) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  if (isLoading) {
    return <div>Carregando mensagens...</div>;
  }

  return (
    <div className="chat-container">
      {/* Status de conexão */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      {/* Erro */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Lista de mensagens */}
      <div className="messages-list">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUserId.toString();
          
          return (
            <div
              key={message.id}
              className={`message ${isOwnMessage ? 'own' : 'other'}`}
            >
              {!isOwnMessage && (
                <img
                  src={message.sender_avatar || '/default-avatar.png'}
                  alt={message.sender_name}
                  className="avatar"
                />
              )}
              
              <div className="message-content">
                {!isOwnMessage && (
                  <div className="sender-name">{message.sender_name}</div>
                )}
                <div className="message-text">{message.message}</div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="attachments">
                    {message.attachments.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        📎 Anexo {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
                <div className="message-time">
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensagem */}
      <form onSubmit={handleSubmit} className="message-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
          disabled={!isConnected}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!isConnected || !inputMessage.trim()}
          className="send-button"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
```

---

## 📊 Estrutura de Dados

### Interface Message (TypeScript)

```typescript
interface Message {
  id: string; // UUID público da mensagem
  campaign_id: string; // UUID público da campanha
  campaign_user_id?: number; // ID do campaign_users (apenas em WebSocket)
  influencer_id?: string; // ID do influenciador (apenas em REST API)
  sender_id: string; // ID do usuário remetente
  sender_name: string; // Nome do remetente
  sender_avatar: string | null; // URL do avatar ou null
  message: string; // Texto da mensagem
  attachments: string[]; // Array de URLs de arquivos anexados
  read_at: string | null; // ISO 8601 timestamp quando foi lida, ou null
  created_at: string; // ISO 8601 timestamp de criação
}
```

### Payloads WebSocket

**join_room:**
```typescript
{
  campaignId: string; // UUID público da campanha
  campaignUserId: number; // ID do registro campaign_users
}
```

**send_message:**
```typescript
{
  campaignId: string; // UUID público da campanha
  campaignUserId: number; // ID do registro campaign_users
  message: string; // Texto da mensagem (obrigatório, não vazio)
  attachments?: string[]; // Array de URLs de arquivos (opcional)
}
```

**mark_as_read:**
```typescript
{
  messageId: string; // UUID público da mensagem
}
```

---

## 🔄 Fluxo Completo de Uso

### 1. Obter `campaignUserId`

```typescript
// Ao abrir o chat com um influenciador
async function openChat(campaignId: string, influencerId: number) {
  // 1. Buscar lista de usuários da campanha
  const usersResponse = await fetch(
    `${apiBaseUrl}/api/backoffice/campaigns/${campaignId}/users`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Type': 'backoffice',
        'Workspace-Id': workspaceId,
      },
    }
  );
  
  const usersData = await usersResponse.json();
  
  // 2. Encontrar o influenciador
  const influencer = usersData.data.find(
    (u: any) => u.user_id === influencerId
  );
  
  if (!influencer) {
    throw new Error('Influenciador não encontrado na campanha');
  }
  
  const campaignUserId = influencer.id;
  
  // 3. Inicializar chat com campaignUserId
  return campaignUserId;
}
```

### 2. Conectar e Entrar na Sala

```typescript
// Conectar
const socket = io(`${wsUrl}/chat`, {
  auth: { token }
});

// Aguardar conexão
socket.on('connect', () => {
  // Entrar na sala
  socket.emit('join_room', {
    campaignId,
    campaignUserId,
  });
});

// Confirmar entrada
socket.on('joined_room', () => {
  console.log('Pronto para enviar/receber mensagens');
});
```

### 3. Carregar Histórico e Escutar Novas Mensagens

```typescript
// Carregar histórico via REST
const history = await loadMessageHistory(campaignId, influencerId);

// Escutar novas mensagens via WebSocket
socket.on('new_message', (message) => {
  // Adicionar à lista (evitar duplicatas)
  if (!history.some(m => m.id === message.id)) {
    history.push(message);
  }
});
```

### 4. Enviar Mensagem

```typescript
socket.emit('send_message', {
  campaignId,
  campaignUserId,
  message: 'Olá!',
  attachments: [],
});
```

---

## 🎯 Endpoints REST API

### 1. Listar Mensagens

**Endpoint:** `GET /api/backoffice/campaigns/:campaignId/influencers/:influencerId/messages`

**Headers:**
```
Authorization: Bearer {token}
Client-Type: backoffice
Workspace-Id: {workspace_uuid}
```

**Path Parameters:**
- `campaignId` (string): UUID público da campanha
- `influencerId` (string): ID do usuário influenciador (user_id)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "influencer_id": "456",
      "sender_id": "123",
      "sender_name": "Nome",
      "sender_avatar": "url",
      "message": "Texto",
      "attachments": [],
      "read_at": null,
      "created_at": "2026-01-18T15:00:00.000Z"
    }
  ]
}
```

**Ordenação:** Por `created_at` DESC (mais recentes primeiro)

---

### 2. Enviar Mensagem

**Endpoint:** `POST /api/backoffice/campaigns/:campaignId/influencers/:influencerId/messages`

**Headers:**
```
Authorization: Bearer {token}
Client-Type: backoffice
Workspace-Id: {workspace_uuid}
Content-Type: application/json
```

**Path Parameters:**
- `campaignId` (string): UUID público da campanha
- `influencerId` (string): ID do usuário influenciador (user_id)

**Body:**
```json
{
  "message": "Olá! Como está o progresso?",
  "attachments": [] // Opcional
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "campaign_id": "uuid",
    "influencer_id": "456",
    "sender_id": "123",
    "sender_name": "Nome",
    "sender_avatar": "url",
    "message": "Olá! Como está o progresso?",
    "attachments": [],
    "read_at": null,
    "created_at": "2026-01-18T15:00:00.000Z"
  }
}
```

**Nota:** Mensagens enviadas via REST API também são transmitidas via WebSocket para outros clientes conectados na mesma sala.

---

## 🔍 Obter Lista de Usuários da Campanha

Para obter o `campaignUserId`, use:

**Endpoint:** `GET /api/backoffice/campaigns/:campaignId/users`

**Response:**
```json
{
  "data": [
    {
      "id": 123,  // ← campaignUserId
      "user_id": 456,  // ← influencerId (user_id)
      "name": "Nome do Influenciador",
      "email": "influencer@example.com",
      "status": "active",
      ...
    }
  ]
}
```

---

## ⚠️ Tratamento de Erros

### Erros Comuns e Soluções

**1. Token inválido ou expirado:**
```typescript
socket.on('connect_error', (error) => {
  if (error.message.includes('token') || error.message.includes('authentication')) {
    // Renovar token e reconectar
    const newToken = await refreshToken();
    socket.auth = { token: newToken };
    socket.connect();
  }
});
```

**2. Campanha não encontrada:**
- Verificar se `campaignId` está correto
- Verificar se o workspace tem acesso à campanha
- Verificar se o `Workspace-Id` está correto

**3. Acesso negado:**
- Verificar permissões do usuário no workspace
- Verificar se o `campaignUserId` corresponde à campanha correta

**4. `campaignUserId` não encontrado:**
- Usar a rota `GET /api/backoffice/campaigns/:campaignId/users` para obter o ID correto
- Verificar se o influenciador está realmente na campanha

---

## 🔒 Segurança e Boas Práticas

1. **Sempre use WSS em produção:**
   ```typescript
   const wsUrl = apiBaseUrl.replace(/^https?:\/\//, 'wss://');
   ```

2. **Nunca exponha o token JWT:**
   - Armazene em variável de ambiente ou secure storage
   - Renove tokens expirados automaticamente

3. **Valide todas as mensagens recebidas:**
   ```typescript
   socket.on('new_message', (message) => {
     // Validar estrutura
     if (!message.id || !message.message || !message.sender_id) {
       console.warn('Mensagem inválida recebida:', message);
       return;
     }
     
     // Validar se pertence à conversa atual
     if (message.campaign_id !== currentCampaignId) {
       console.warn('Mensagem de campanha diferente:', message);
       return;
     }
     
     // Processar mensagem válida
     addMessage(message);
   });
   ```

4. **Implemente rate limiting no cliente:**
   ```typescript
   let lastMessageTime = 0;
   const MESSAGE_RATE_LIMIT = 1000; // 1 segundo entre mensagens
   
   function sendMessage(text: string) {
     const now = Date.now();
     if (now - lastMessageTime < MESSAGE_RATE_LIMIT) {
       console.warn('Muitas mensagens. Aguarde um momento.');
       return;
     }
     lastMessageTime = now;
     socket.emit('send_message', { ... });
   }
   ```

5. **Trate desconexões graciosamente:**
   ```typescript
   socket.on('disconnect', (reason) => {
     if (reason === 'io server disconnect') {
       // Servidor desconectou, reconectar manualmente
       socket.connect();
     }
     // Outros motivos: reconexão automática já está configurada
   });
   ```

6. **Limpe recursos ao desmontar componente:**
   ```typescript
   useEffect(() => {
     // Setup...
     
     return () => {
       socket.emit('leave_room', { campaignId, campaignUserId });
       socket.disconnect();
     };
   }, []);
   ```

---

## 📱 Indicadores de Status

### Status de Conexão

```typescript
const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

socket.on('connect', () => {
  setConnectionStatus('connected');
});

socket.on('disconnect', () => {
  setConnectionStatus('disconnected');
});

socket.on('connect_error', () => {
  setConnectionStatus('disconnected');
});
```

### Indicadores Visuais

```tsx
<div className="connection-indicator">
  {connectionStatus === 'connected' && (
    <span className="status-badge green">🟢 Conectado</span>
  )}
  {connectionStatus === 'connecting' && (
    <span className="status-badge yellow">🟡 Conectando...</span>
  )}
  {connectionStatus === 'disconnected' && (
    <span className="status-badge red">🔴 Desconectado</span>
  )}
</div>
```

### Indicador de Digitação (Opcional)

```typescript
// Enviar evento de digitação
const handleTyping = debounce(() => {
  socket.emit('typing', { campaignId, campaignUserId });
}, 500);

// Escutar digitação de outros
socket.on('user_typing', (data) => {
  // Mostrar "Fulano está digitando..."
});
```

---

## 🧪 Testando a Integração

### Teste Manual com Console do Navegador

```javascript
// 1. Conectar
const socket = io('https://seu-servidor.com/chat', {
  auth: { token: 'seu-token' }
});

// 2. Verificar conexão
socket.on('connect', () => {
  console.log('✅ Conectado');
  
  // 3. Entrar na sala
  socket.emit('join_room', {
    campaignId: 'uuid-da-campanha',
    campaignUserId: 123
  });
});

// 4. Escutar confirmação
socket.on('joined_room', (data) => {
  console.log('✅ Entrou na sala:', data);
  
  // 5. Enviar mensagem de teste
  socket.emit('send_message', {
    campaignId: 'uuid-da-campanha',
    campaignUserId: 123,
    message: 'Teste de mensagem'
  });
});

// 6. Escutar mensagens
socket.on('new_message', (msg) => {
  console.log('📨 Nova mensagem:', msg);
});

// 7. Verificar confirmação
socket.on('message_sent', (data) => {
  console.log('✅ Mensagem enviada:', data);
});
```

---

## 📚 Referências e Recursos

- **Socket.IO Client:** https://socket.io/docs/v4/client-api/
- **Socket.IO React Hook:** https://github.com/iamgyz/use-socket.io-client
- **WebSocket MDN:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

## ❓ FAQ

**P: Qual a diferença entre `influencerId` e `campaignUserId`?**  
R: 
- `influencerId` (ou `user_id`): É o ID do usuário influenciador na tabela `users`. Usado na REST API.
- `campaignUserId`: É o ID do registro na tabela `campaign_users` que relaciona o influenciador à campanha. Usado no WebSocket.

**P: Posso usar apenas REST API sem WebSocket?**  
R: Sim, mas você não receberá mensagens em tempo real. Você precisaria fazer polling periódico para verificar novas mensagens.

**P: As mensagens são salvas automaticamente?**  
R: Sim, todas as mensagens enviadas via WebSocket são automaticamente salvas no banco de dados na tabela `campaign_messages`.

**P: Como saber se uma mensagem foi lida?**  
R: O campo `read_at` na mensagem indica quando foi lida. Se for `null`, ainda não foi lida.

**P: Posso enviar anexos?**  
R: Sim, use o campo `attachments` com um array de URLs de arquivos. Os arquivos devem ser enviados previamente via API de upload.

**P: Como gerenciar múltiplas conversas simultaneamente?**  
R: Você pode entrar em múltiplas salas ao mesmo tempo. Cada sala é identificada por `campaign:{campaignId}:user:{campaignUserId}`.

**P: O que acontece se eu perder a conexão?**  
R: O Socket.IO tentará reconectar automaticamente. Mensagens enviadas durante a desconexão podem ser perdidas, então considere usar REST API como fallback.

---

**Data de Criação:** Janeiro 2026  
**Última Atualização:** Janeiro 2026  
**Versão da API:** Verificar versão atual no changelog
