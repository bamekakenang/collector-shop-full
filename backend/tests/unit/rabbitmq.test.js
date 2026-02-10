// Unit tests for RabbitMQ service module

// Mock amqplib before requiring the module
const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue({}),
  assertQueue: jest.fn().mockResolvedValue({}),
  bindQueue: jest.fn().mockResolvedValue({}),
  publish: jest.fn().mockReturnValue(true),
  consume: jest.fn().mockResolvedValue({}),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue(mockConnection),
}));

// Now require the module under test
const rabbitmq = require('../../src/services/rabbitmq');

describe('RabbitMQ service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connect establishes connection and creates channel', async () => {
    const amqp = require('amqplib');

    const result = await rabbitmq.connect();

    expect(amqp.connect).toHaveBeenCalled();
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      'collector-shop',
      'topic',
      { durable: true }
    );
    expect(mockChannel.assertQueue).toHaveBeenCalledWith('orders', { durable: true });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith('orders', 'collector-shop', 'order.*');
    expect(result).toHaveProperty('connection');
    expect(result).toHaveProperty('channel');
  });

  test('publish sends message to exchange with correct routing key', async () => {
    const data = { orderId: '123', productId: 'p1', totalPrice: 99.99 };

    await rabbitmq.publish('order.created', data);

    expect(mockChannel.publish).toHaveBeenCalledWith(
      'collector-shop',
      'order.created',
      expect.any(Buffer),
      { persistent: true }
    );

    // Verify the buffer contains the correct JSON
    const publishCall = mockChannel.publish.mock.calls[0];
    const sentData = JSON.parse(publishCall[2].toString());
    expect(sentData).toEqual(data);
  });

  test('publish does not throw on error (graceful degradation)', async () => {
    mockChannel.publish.mockImplementationOnce(() => {
      throw new Error('Channel closed');
    });

    // Should not throw
    await expect(rabbitmq.publish('order.created', { test: true })).resolves.not.toThrow();
  });
});
