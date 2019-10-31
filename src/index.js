// The worker for performing the work.
const Converter = require('./workers/converter')
const converter = new Converter()

// The listener for incoming messages.
const Listener = require('./messageQueue/listener')
const listener = new Listener(
  process.env.RABBIT_MQ_URI,
  process.env.RABBIT_MQ_QUEUE_BCF_CONVERTER,
  converter)
listener.subscribe()
