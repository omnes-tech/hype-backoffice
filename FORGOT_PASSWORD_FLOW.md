# Fluxo de Redefinição de Senha - Documentação Frontend

Esta documentação descreve como implementar o fluxo de redefinição de senha no frontend.

## Visão Geral

O fluxo de redefinição de senha funciona em duas etapas:

1. **Solicitar código**: Usuário informa o email e recebe um código de 6 dígitos por email
2. **Redefinir senha**: Usuário informa o código recebido e a nova senha

## Endpoints

### Base URL
```
/api/backoffice/auth
```

### Headers Obrigatórios
```
Client-Type: backoffice
Content-Type: application/json
```

## 1. Solicitar Código de Redefinição

### Endpoint
```
POST /api/backoffice/auth/forgot-password
```

### Request Body
```json
{
  "email": "usuario@example.com"
}
```

### Validação
- `email`: Obrigatório, deve ser um email válido

### Response (200 OK)
```json
{
  "data": {
    "message": "Se o e-mail estiver cadastrado, você receberá um código para redefinir sua senha."
  }
}
```

**Importante**: A resposta sempre será a mesma, independente do email existir ou não. Isso previne enumeração de emails.

### Exemplo de Requisição

```typescript
async function requestPasswordReset(email: string) {
  const response = await fetch('http://localhost:3000/api/backoffice/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Client-Type': 'backoffice',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  return data;
}
```

### Tratamento de Erros

- **400 Bad Request**: Dados inválidos (email inválido)
- **500 Internal Server Error**: Erro interno do servidor

## 2. Redefinir Senha com Código

### Endpoint
```
POST /api/backoffice/auth/reset-password
```

### Request Body
```json
{
  "code": "123456",
  "password": "novaSenha123"
}
```

### Validação
- `code`: Obrigatório, deve ter exatamente 6 dígitos numéricos
- `password`: Obrigatório, mínimo 8 caracteres, máximo 255 caracteres

### Response (200 OK)
```json
{
  "data": {
    "message": "Senha redefinida com sucesso"
  }
}
```

### Response (400 Bad Request)
```json
{
  "message": "Código inválido ou expirado"
}
```

ou

```json
{
  "message": "Dados inválidos",
  "errors": {
    "code": ["Código deve ter exatamente 6 dígitos"],
    "password": ["Senha deve ter no mínimo 8 caracteres"]
  }
}
```

### Exemplo de Requisição

```typescript
async function resetPassword(code: string, password: string) {
  const response = await fetch('http://localhost:3000/api/backoffice/auth/reset-password', {
    method: 'POST',
    headers: {
      'Client-Type': 'backoffice',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao redefinir senha');
  }

  const data = await response.json();
  return data;
}
```

## Fluxo Completo no Frontend

### 1. Tela de "Esqueci minha senha"

```typescript
// Componente React exemplo
function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/backoffice/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Client-Type': 'backoffice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Se o e-mail estiver cadastrado, você receberá um código para redefinir sua senha.');
        // Redirecionar para tela de inserção de código
        navigate('/reset-password', { state: { email } });
      } else {
        setMessage(data.message || 'Erro ao solicitar redefinição de senha');
      }
    } catch (error) {
      setMessage('Erro ao solicitar redefinição de senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Digite seu email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar código'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### 2. Tela de Inserção de Código e Nova Senha

```typescript
function ResetPasswordForm() {
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação local
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('O código deve ter exatamente 6 dígitos');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/backoffice/auth/reset-password', {
        method: 'POST',
        headers: {
          'Client-Type': 'backoffice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Erro ao redefinir senha');
      }
    } catch (error) {
      setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <h2>Senha redefinida com sucesso!</h2>
        <p>Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input type="email" value={email} disabled />
      </div>

      <div>
        <label>Código de verificação (6 dígitos)</label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            // Apenas números, máximo 6 dígitos
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(value);
          }}
          placeholder="000000"
          maxLength={6}
          required
        />
        <small>Digite o código de 6 dígitos enviado para seu email</small>
      </div>

      <div>
        <label>Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
        />
      </div>

      <div>
        <label>Confirmar senha</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Digite a senha novamente"
          minLength={8}
          required
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir senha'}
      </button>

      <p>
        Não recebeu o código?{' '}
        <button
          type="button"
          onClick={() => navigate('/forgot-password')}
        >
          Solicitar novo código
        </button>
      </p>
    </form>
  );
}
```

## Regras de Negócio

### Código de Redefinição
- **Formato**: 6 dígitos numéricos (ex: `123456`)
- **Validade**: 1 hora após a geração
- **Uso**: Pode ser usado apenas uma vez
- **Expiração**: Após 1 hora ou após uso, o código não é mais válido

### Senha
- **Mínimo**: 8 caracteres
- **Máximo**: 255 caracteres
- **Validação**: Aplicada no backend

### Segurança
- A resposta de `forgot-password` sempre retorna sucesso (mesmo se o email não existir)
- Isso previne enumeração de emails cadastrados
- Códigos expiram automaticamente após 1 hora
- Códigos são marcados como usados após o reset

## Tratamento de Erros Comuns

### Código Inválido ou Expirado
```typescript
if (error.message === 'Código inválido ou expirado') {
  // Mostrar mensagem e permitir solicitar novo código
  showError('Código inválido ou expirado. Solicite um novo código.');
}
```

### Email Não Encontrado
```typescript
// Não é possível detectar isso diretamente, pois a API sempre retorna sucesso
// Mas você pode mostrar uma mensagem genérica após o envio
showMessage('Se o e-mail estiver cadastrado, você receberá um código.');
```

### Validação de Formulário
```typescript
// Validar código antes de enviar
const validateCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

// Validar senha antes de enviar
const validatePassword = (password: string): boolean => {
  return password.length >= 8 && password.length <= 255;
};
```

## UX Recomendações

### 1. Feedback Visual
- Mostrar loading durante requisições
- Mensagens de sucesso/erro claras
- Validação em tempo real do código (6 dígitos)

### 2. Input de Código
- Campo numérico apenas
- Máximo 6 caracteres
- Auto-focus no campo
- Formatação visual (ex: espaços entre dígitos)

### 3. Fluxo de Navegação
```
Login → Esqueci minha senha → Inserir código → Nova senha → Login
```

### 4. Mensagens ao Usuário
- **Após solicitar código**: "Verifique seu email. O código expira em 1 hora."
- **Código inválido**: "Código inválido ou expirado. Solicite um novo código."
- **Senha redefinida**: "Senha redefinida com sucesso! Redirecionando para o login..."

## Exemplo Completo com Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Client-Type': 'backoffice',
    'Content-Type': 'application/json',
  },
});

// Solicitar código
export async function requestPasswordReset(email: string) {
  try {
    const response = await api.post('/backoffice/auth/forgot-password', {
      email,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Erro ao solicitar código');
    }
    throw error;
  }
}

// Redefinir senha
export async function resetPassword(code: string, password: string) {
  try {
    const response = await api.post('/backoffice/auth/reset-password', {
      code,
      password,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Erro ao redefinir senha');
    }
    throw error;
  }
}
```

## Testes

### Casos de Teste

1. **Solicitar código com email válido**
   - Deve retornar sucesso
   - Deve enviar email com código

2. **Solicitar código com email inválido**
   - Deve retornar sucesso (mesma mensagem)
   - Não deve enviar email

3. **Redefinir senha com código válido**
   - Deve atualizar a senha
   - Deve retornar sucesso

4. **Redefinir senha com código inválido**
   - Deve retornar erro 400
   - Mensagem: "Código inválido ou expirado"

5. **Redefinir senha com código expirado**
   - Deve retornar erro 400
   - Mensagem: "Código inválido ou expirado"

6. **Redefinir senha com senha muito curta**
   - Deve retornar erro 400
   - Mensagem de validação

## Notas Importantes

1. **Sempre use HTTPS em produção** para proteger os dados
2. **Não armazene códigos no frontend** (localStorage, sessionStorage)
3. **Implemente rate limiting no frontend** para evitar spam
4. **Valide dados antes de enviar** para melhor UX
5. **Mostre mensagens claras** ao usuário sobre o status da operação

