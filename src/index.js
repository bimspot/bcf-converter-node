// The worker for performing the work.
const Converter = require('./workers/converter')
const converter = new Converter()

converter.performWork()

// The listener for incoming messages.
const Listener = require('./messageQueue/listener')
const listener = new Listener(
  process.env.RABBIT_MQ_HOST,
  process.env.RABBIT_MQ_CHANNEL_MODEL_CONVERTER,
  converter)
listener.subscribe()
