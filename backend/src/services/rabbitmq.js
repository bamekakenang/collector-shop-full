const amqp = require('amqplib');

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE = 'collector-shop';
const QUEUE_ORDERS = 'orders';

/**
 * Initialise la connexion RabbitMQ et crée le canal
 */
async function connect() {
  if (connection && channel) {
    return { connection, channel };
  }

  try {
    console.log('🐰 Connexion à RabbitMQ:', RABBITMQ_URL.replace(/\/\/.*@/, '//***:***@'));
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Déclarer l'exchange topic
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Déclarer la queue des commandes
    await channel.assertQueue(QUEUE_ORDERS, { durable: true });
    await channel.bindQueue(QUEUE_ORDERS, EXCHANGE, 'order.*');

    console.log('✅ RabbitMQ connecté et configuré');

    // Gestion des erreurs de connexion
    connection.on('error', (err) => {
      console.error('❌ Erreur connexion RabbitMQ:', err);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.log('⚠️  Connexion RabbitMQ fermée');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (error) {
    console.error('❌ Impossible de se connecter à RabbitMQ:', error.message);
    connection = null;
    channel = null;
    throw error;
  }
}

/**
 * Publie un événement dans RabbitMQ
 * @param {string} routingKey - La clé de routage (ex: 'order.created', 'order.completed')
 * @param {object} data - Les données à publier
 */
async function publish(routingKey, data) {
  try {
    const { channel } = await connect();
    const message = JSON.stringify(data);
    
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(message),
      { persistent: true }
    );

    console.log(`📤 Événement publié: ${routingKey}`, data);
  } catch (error) {
    console.error(`❌ Erreur lors de la publication (${routingKey}):`, error.message);
    // Ne pas throw pour éviter de bloquer le flux principal
  }
}

/**
 * Consomme les événements de commandes
 * @param {function} handler - Fonction callback appelée pour chaque message
 */
async function consumeOrders(handler) {
  try {
    const { channel } = await connect();

    console.log(`🎧 En écoute sur la queue: ${QUEUE_ORDERS}`);

    await channel.consume(
      QUEUE_ORDERS,
      async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log('📥 Message reçu:', content);

            await handler(content);

            // Acknowledge le message
            channel.ack(msg);
          } catch (error) {
            console.error('❌ Erreur traitement message:', error);
            // Rejette le message et le remet en queue
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error('❌ Erreur lors de la consommation:', error.message);
  }
}

/**
 * Ferme proprement la connexion RabbitMQ
 */
async function close() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('🔌 Connexion RabbitMQ fermée proprement');
  } catch (error) {
    console.error('❌ Erreur fermeture RabbitMQ:', error.message);
  }
}

module.exports = {
  connect,
  publish,
  consumeOrders,
  close,
};
