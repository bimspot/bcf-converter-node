const amqp = require('amqplib/callback_api')

/**
* The BroadcastListener is responsible for registering the observer to the s
* pecified broadcast message queue and to receive and process the incoming
* messages.
*/
class BroadcastListener {
  /**
  * The `Listener` subscribes to the queue specified during initialisation.
  * When a message is received, it is passes the conversion task to the
  * inejcted `Worker`.
  *
  * @param {String} host The host of the message queue installation.
  * @param {String} queue The queue for the incoming messages.
  * @param {Worker} worker The worker to be used with this listener when task
  * is received.
  */
  constructor(host, queue, worker) {
    this.queue = queue
    this.worker = worker
    this.host = host
  }

  /**
  * The method handles the subscription to a broadcast queue on the
  * specified channel. It also has a _very simple_ retry policy for initial
  * connection errors.
  *
  * When message is received the conversion task is passed to the injected
  * `Worker` instance.
  *
  * @memberof Listener
  */
  subscribe() {
    const self = this
    console.log(`Connecting to queue ${this.queue}`)

    amqp.connect(`amqp://${self.host}`, (error, connection) => {
      if (error) {
        console.warn(error)
        setTimeout(function() {
          self.subscribe()
        }, 1000)
        return
      }

      connection.createChannel((error, channel) => {
        if (error) {
          console.error(error)
          return
        }

        channel.assertExchange(this.queue, 'fanout', {durable: false})

        channel.assertQueue('', {exclusive: true}, (error, q) => {
          console.log(' [*] Waiting for messages in %s.', q.queue)
          channel.bindQueue(q.queue, this.queue, '')
          channel.consume(q.queue, (message) => {
            const json = JSON.parse(message.content.toString())
            self.worker.performWork(json)
          }, {noAck: true})
        })
      })
    })
  }
};

module.exports = BroadcastListener
