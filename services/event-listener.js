/**
 * Event Listener Service
 * 
 * Escucha eventos del contrato MerchManager y automáticamente:
 * 1. Detecta nuevos eventos creados (EventCreated)
 * 2. Genera códigos de claim automáticamente
 * 3. Almacena en PostgreSQL
 */

const { ethers } = require('ethers');
const db = require('../database/db');

// ============ Configuration ============

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const MERCH_MANAGER_ADDRESS = process.env.MERCH_MANAGER_ADDRESS;
const CODES_PER_EVENT = parseInt(process.env.CODES_PER_EVENT) || 100;

// ABI mínimo necesario
const MERCH_MANAGER_ABI = [
  'event EventCreated(bytes32 indexed eventId, address indexed creator, string name, string description, string imageURI, uint256 maxAttendees, uint256 timestamp)',
  'event EventUpdated(bytes32 indexed eventId, string name, string description, string imageURI)',
  'event EventStatusChanged(bytes32 indexed eventId, bool isActive)',
  'function getEvent(bytes32 eventId) external view returns (string name, string description, string imageURI, address creator, bool isActive, uint256 createdAt, uint256 totalAttendees, uint256 maxAttendees)'
];

// ============ Helper Functions ============

/**
 * Generar código único de claim
 */
function generateClaimCode(eventName, index) {
  // Crear código: EVENTPREFIX-RANDOM-INDEX
  const prefix = eventName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10) || 'EVENT';
  
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const indexStr = index.toString().padStart(4, '0');
  
  return `${prefix}-${random}-${indexStr}`;
}

/**
 * Generar metadata URI para token
 */
function generateTokenURI(eventId, tokenId) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/token-metadata/${tokenId}`;
}

/**
 * Generar códigos para un evento
 */
async function generateCodesForEvent(eventId, eventName, eventDescription, imageURI, count = CODES_PER_EVENT) {
  console.log(`\n🎫 Generando ${count} códigos para evento: ${eventName}`);
  console.log(`   EventId: ${eventId}`);
  
  const codes = [];
  const batchSize = 50;
  
  for (let i = 0; i < count; i++) {
    const code = generateClaimCode(eventName, i);
    const tokenURI = generateTokenURI(eventId, i);
    
    codes.push({
      code,
      event_id: eventId,
      token_uri: tokenURI,
      metadata: {
        eventName,
        eventDescription,
        imageURI,
        index: i
      }
    });
    
    // Insert en batches para mejor performance
    if (codes.length >= batchSize || i === count - 1) {
      try {
        await db.insertClaimsBatch(codes);
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${codes.length} códigos insertados`);
        codes.length = 0; // Clear array
      } catch (error) {
        console.error(`   ❌ Error insertando batch:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${count} códigos generados exitosamente\n`);
}

// ============ Event Listener Class ============

class EventListenerService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.isListening = false;
  }
  
  /**
   * Inicializar el servicio
   */
  async initialize() {
    if (!MERCH_MANAGER_ADDRESS) {
      throw new Error('MERCH_MANAGER_ADDRESS not configured');
    }
    
    console.log('\n🎧 Inicializando Event Listener Service...');
    console.log(`   Contract: ${MERCH_MANAGER_ADDRESS}`);
    console.log(`   Network: Base Sepolia`);
    console.log(`   Codes per event: ${CODES_PER_EVENT}`);
    
    // Conectar a RPC
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Verificar conexión
    try {
      const network = await this.provider.getNetwork();
      console.log(`   ✅ Conectado a chain ID: ${network.chainId}`);
      
      if (network.chainId !== 84532n) {
        console.warn('   ⚠️  Advertencia: No estás en Base Sepolia (84532)');
      }
    } catch (error) {
      console.error('   ❌ Error conectando a RPC:', error.message);
      throw error;
    }
    
    // Conectar al contrato
    this.contract = new ethers.Contract(
      MERCH_MANAGER_ADDRESS,
      MERCH_MANAGER_ABI,
      this.provider
    );
    
    console.log('✅ Event Listener inicializado\n');
  }
  
  /**
   * Empezar a escuchar eventos
   */
  async startListening() {
    if (this.isListening) {
      console.log('⚠️  Ya está escuchando eventos');
      return;
    }
    
    console.log('👂 Escuchando eventos del contrato...\n');
    this.isListening = true;
    
    // Escuchar evento: EventCreated
    this.contract.on('EventCreated', async (
      eventId,
      creator,
      name,
      description,
      imageURI,
      maxAttendees,
      timestamp,
      event
    ) => {
      try {
        console.log('\n🎉 ═══════════════════════════════════════');
        console.log('   NUEVO EVENTO DETECTADO!');
        console.log('   ═══════════════════════════════════════');
        console.log(`   Event ID: ${eventId}`);
        console.log(`   Creator: ${creator}`);
        console.log(`   Name: ${name}`);
        console.log(`   Description: ${description}`);
        console.log(`   Image: ${imageURI}`);
        console.log(`   Max Attendees: ${maxAttendees.toString()}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Tx Hash: ${event.transactionHash}`);
        
        // Generar códigos automáticamente
        await generateCodesForEvent(
          eventId,
          name,
          description,
          imageURI,
          CODES_PER_EVENT
        );
        
        console.log('✅ Evento procesado exitosamente');
        console.log('═══════════════════════════════════════\n');
        
      } catch (error) {
        console.error('❌ Error procesando evento:', error);
      }
    });
    
    // Escuchar evento: EventUpdated
    this.contract.on('EventUpdated', (eventId, name, description, imageURI, event) => {
      console.log('\n📝 EVENTO ACTUALIZADO');
      console.log(`   Event ID: ${eventId}`);
      console.log(`   Name: ${name}`);
      console.log(`   Description: ${description}`);
      console.log(`   Image: ${imageURI}`);
      console.log(`   Block: ${event.blockNumber}\n`);
    });
    
    // Escuchar evento: EventStatusChanged
    this.contract.on('EventStatusChanged', (eventId, isActive, event) => {
      console.log('\n🔄 ESTADO DE EVENTO CAMBIADO');
      console.log(`   Event ID: ${eventId}`);
      console.log(`   Status: ${isActive ? 'Activo ✅' : 'Inactivo ❌'}`);
      console.log(`   Block: ${event.blockNumber}\n`);
    });
    
    console.log('✅ Listener activo - esperando eventos...\n');
  }
  
  /**
   * Detener el listener
   */
  stopListening() {
    if (!this.isListening) {
      return;
    }
    
    console.log('🛑 Deteniendo Event Listener...');
    
    this.contract.removeAllListeners('EventCreated');
    this.contract.removeAllListeners('EventUpdated');
    this.contract.removeAllListeners('EventStatusChanged');
    
    this.isListening = false;
    console.log('✅ Event Listener detenido\n');
  }
  
  /**
   * Procesar eventos históricos (desde un bloque específico)
   */
  async processHistoricalEvents(fromBlock = 'earliest') {
    console.log(`\n📜 Procesando eventos históricos desde bloque: ${fromBlock}...`);
    
    try {
      const filter = this.contract.filters.EventCreated();
      const events = await this.contract.queryFilter(filter, fromBlock);
      
      console.log(`   Encontrados ${events.length} eventos\n`);
      
      if (events.length === 0) {
        console.log('   No hay eventos históricos para procesar\n');
        return;
      }
      
      for (const event of events) {
        const [eventId, creator, name, description, imageURI, maxAttendees, timestamp] = event.args;
        
        console.log(`📋 Procesando: ${name}`);
        console.log(`   Event ID: ${eventId}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Creator: ${creator}`);
        
        // Verificar si ya tiene códigos
        const existingCodes = await db.getClaimsByEventId(eventId);
        
        if (existingCodes.length > 0) {
          console.log(`   ⏭️  Ya tiene ${existingCodes.length} códigos generados - skipping\n`);
          continue;
        }
        
        // Generar códigos
        await generateCodesForEvent(eventId, name, description, imageURI, CODES_PER_EVENT);
      }
      
      console.log('✅ Eventos históricos procesados\n');
      
    } catch (error) {
      console.error('❌ Error procesando eventos históricos:', error);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return {
        status: 'healthy',
        isListening: this.isListening,
        blockNumber,
        contract: MERCH_MANAGER_ADDRESS,
        network: 'Base Sepolia',
        chainId: 84532
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isListening: this.isListening
      };
    }
  }
}

// ============ Singleton Instance ============

let listenerInstance = null;

function getListenerService() {
  if (!listenerInstance) {
    listenerInstance = new EventListenerService();
  }
  return listenerInstance;
}

// ============ Export ============

module.exports = {
  EventListenerService,
  getListenerService,
  generateCodesForEvent // Para testing
};