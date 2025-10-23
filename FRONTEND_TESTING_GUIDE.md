# 🧪 GUÍA DE TESTING - FRONTEND TEAM

## 📋 ENDPOINTS DISPONIBLES PARA TESTING

### **1. Generar Códigos para Testing**

#### **Opción A: Vía API (Recomendado)**

```bash
# Generar 300 códigos para testing del frontend
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "count": 300,
    "prefix": "FRONTEND"
  }'
```

**Response esperado:**
```json
{
  "success": true,
  "requested": 300,
  "created": 300,
  "failed": 0,
  "sample_codes": [
    {"code": "FRONTEND-A1B2C3-0000", "event": "Web3 Summit 2025"},
    {"code": "FRONTEND-X9Y8Z7-0001", "event": "NFT NYC 2025"},
    ...
  ]
}
```

#### **Opción B: Generar códigos específicos por evento**

```bash
# 100 códigos para Base Bootcamp
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "count": 100,
    "prefix": "BASECAMP",
    "eventName": "Base Bootcamp Final Project"
  }'
```

---

### **2. Verificar Códigos Disponibles**

```bash
# Ver estadísticas de códigos
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: your_api_key_here"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 310,
    "used": 5,
    "available": 305,
    "reserved": 0,
    "percentage_used": "1.61"
  }
}
```

---

### **3. Listar Todos los Códigos**

```bash
# Obtener lista completa de códigos
curl https://merch-backend-ot7l.onrender.com/api/admin/list-claims \
  -H "X-API-KEY: your_api_key_here" \
  | jq '.'
```

**Filtrar solo códigos disponibles:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/list-claims \
  -H "X-API-KEY: your_api_key_here" \
  | jq '.claims[] | select(.used == false) | .code'
```

---

### **4. Probar un Código Específico**

```bash
# Verificar y obtener signature
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "code": "FRONTEND-A1B2C3-0000",
    "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
  }'
```

**Success Response:**
```json
{
  "eventId": "0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363",
  "tokenURI": "ipfs://bafkreiczcdvbn2oaxa53v64moqiaz7bjux73c6rkhpg3uy5ixla7r6hjbe",
  "signature": "0x6cd0aafa7a0725ed3d2a4c22268f5da8e6b9318734327a93680c5a4e048e32d0...",
  "is_valid": true
}
```

---

## 🔄 WORKFLOW COMPLETO PARA FRONTEND

### **Step 1: Generar códigos (una sola vez)**

```bash
# Generar 300 códigos
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{"count": 300, "prefix": "FRONTEND"}' \
  > generated_codes.json
```

### **Step 2: Extraer códigos**

```bash
# Extraer solo los códigos a un archivo
cat generated_codes.json | jq -r '.sample_codes[].code' > codes.txt

# Ver primeros 10 códigos
head -10 codes.txt
```

### **Step 3: Usar en el frontend**

```javascript
// frontend/lib/testCodes.js
export const testCodes = [
  'FRONTEND-A1B2C3-0000',
  'FRONTEND-X9Y8Z7-0001',
  'FRONTEND-P5Q4R3-0002',
  // ... 297 más
];

// Usar en tu componente
const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
```

### **Step 4: Integrar en tu app**

```javascript
// Ejemplo de integración
import { api } from '@/lib/api';

async function testClaim() {
  const testCode = 'FRONTEND-A1B2C3-0000';
  const walletAddress = '0x742D35cC6634c0532925a3B844BC9E7595F0beBB';
  
  try {
    // 1. Verificar código y obtener signature
    const result = await api.verifyCode(testCode, walletAddress);
    
    console.log('✅ Signature obtenida:', result.signature);
    console.log('📦 Token URI:', result.tokenURI);
    console.log('🎫 Event ID:', result.eventId);
    
    // 2. Usar con contract (Wagmi)
    const tx = await writeContract({
      address: MERCH_MANAGER_ADDRESS,
      abi: merchManagerABI,
      functionName: 'mintSBTWithAttestation',
      args: [
        walletAddress,
        result.tokenURI,
        result.eventId,
        result.signature
      ]
    });
    
    console.log('✅ Transaction sent:', tx.hash);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}
```

---

## 📊 MONITOREO DURANTE TESTING

### **Ver cuántos códigos quedan:**

```bash
# Quick stats
curl -s https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: your_api_key_here" \
  | jq '.stats'
```

Output:
```json
{
  "total": 310,
  "used": 25,
  "available": 285,
  "reserved": 0,
  "percentage_used": "8.06"
}
```

### **Alerta cuando quedan pocos códigos:**

```bash
#!/bin/bash
# check_codes.sh

AVAILABLE=$(curl -s https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: your-key" | jq '.stats.available')

if [ $AVAILABLE -lt 50 ]; then
  echo "⚠️  ALERTA: Solo quedan $AVAILABLE códigos disponibles"
  echo "💡 Generar más códigos con:"
  echo "   curl -X POST ... generate-bulk-claims"
else
  echo "✅ Códigos disponibles: $AVAILABLE"
fi
```

---

## 🧪 TESTING SCENARIOS

### **Scenario 1: Happy Path**

```bash
# 1. Generar código
RESPONSE=$(curl -s -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-key" \
  -d '{"count": 1, "prefix": "TEST"}')

# 2. Extraer código
CODE=$(echo $RESPONSE | jq -r '.sample_codes[0].code')
echo "Generated code: $CODE"

# 3. Verificar código
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-key" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"0x742D35cC6634c0532925a3B844BC9E7595F0beBB\"}"
```

### **Scenario 2: Error - Código ya usado**

```bash
# Intentar usar el mismo código dos veces
CODE="TEST-A1B2C3-0001"

# Primera vez - Success
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-key" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"0x742D35cC6634c0532925a3B844BC9E7595F0beBB\"}"

# Segunda vez - Error 400
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-key" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"0x742D35cC6634c0532925a3B844BC9E7595F0beBB\"}"
```

Expected error:
```json
{
  "error": "Claim code already used",
  "is_valid": false,
  "usedBy": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB",
  "usedAt": "2025-10-23T10:30:45.000Z"
}
```

### **Scenario 3: Error - Código no existe**

```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-key" \
  -d '{"code": "NOEXISTE-123456", "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"}'
```

Expected error:
```json
{
  "error": "Claim code not found",
  "is_valid": false
}
```

---

## 💡 TIPS PARA EL FRONTEND TEAM

### **1. Generar códigos por lotes según necesidad:**

```bash
# Development: 50 códigos
curl ... -d '{"count": 50, "prefix": "DEV"}'

# Staging: 100 códigos
curl ... -d '{"count": 100, "prefix": "STAGING"}'

# Production Testing: 300 códigos
curl ... -d '{"count": 300, "prefix": "PROD-TEST"}'
```

### **2. Usar prefijos descriptivos:**

```bash
"prefix": "FRONTEND"   # Para testing del frontend
"prefix": "QA"         # Para QA team
"prefix": "DEMO"       # Para demos
"prefix": "STAGING"    # Para staging environment
"prefix": "LOADTEST"   # Para load testing
```

### **3. Monitorear stats regularmente:**

```javascript
// frontend/hooks/useClaimStats.js
import { useQuery } from '@tanstack/react-query';

export function useClaimStats() {
  return useQuery({
    queryKey: ['claimStats'],
    queryFn: async () => {
      const response = await fetch(
        'https://merch-backend-ot7l.onrender.com/api/admin/stats',
        { headers: { 'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY } }
      );
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

// Usar en componente
const { data: stats } = useClaimStats();
console.log(`Códigos disponibles: ${stats?.stats.available}`);
```

### **4. Resetear códigos en development:**

```sql
-- Solo para development, conectar a DB y ejecutar:
-- CUIDADO: Esto resetea TODOS los códigos

UPDATE claims 
SET used = false, used_by = NULL, used_at = NULL 
WHERE code LIKE 'DEV-%';

-- O resetear uno específico:
UPDATE claims 
SET used = false, used_by = NULL, used_at = NULL 
WHERE code = 'DEV-A1B2C3-0001';
```

---

## 🚀 QUICK START CHECKLIST

- [ ] Generar 300 códigos: `curl ... generate-bulk-claims`
- [ ] Guardar códigos: `> codes.json`
- [ ] Verificar stats: `curl ... /stats`
- [ ] Probar 1 código: `curl ... /verify-code`
- [ ] Integrar en frontend
- [ ] Monitorear códigos disponibles
- [ ] Generar más cuando sea necesario

---

## 📞 SUPPORT

Si tienes problemas:

1. **Ver logs del backend:** https://dashboard.render.com → merch-backend → Logs
2. **Health check:** `curl https://merch-backend-ot7l.onrender.com/health`
3. **Stats:** `curl .../api/admin/stats -H "X-API-KEY: ..."`

---

**Happy Testing! 🎉**
